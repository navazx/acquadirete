#!/usr/bin/env node
// ============================================================================
//  CONTROLLO SEO DEL MESE — manda il rapporto (dal 17 ott 2026)
//
//  Dopo l'agente (.claude/skills/controllo-seo-mese):
//    1. mette su main il rapporto, agenti/seo/mese.md (lo leggono il Direttore,
//       l'agente Contenuti e l'agente SEO del lunedì);
//    2. manda a Matteo il messaggio scritto dall'agente.
//  Se l'agente non ce l'ha fatta, a Matteo arriva lo stesso il necessario coi
//  soli dati (pagine da far indicizzare, velocità), il guasto va al Meccanico e
//  la nota sulla bacheca la lascia questo script: il 27 non resta mai muto.
//
//    node scripts/seo-mese-manda.mjs --prova   stampa e basta
// ============================================================================

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { messaggio, firma } from './lib/telegram.mjs';
import { suMain } from './lib/spingi.mjs';
import { lasciaNota } from './lib/bacheca.mjs';

const prova = process.argv.includes('--prova');
const CARTELLA = process.env.SEO_MESE_DIR || '/tmp/seo-mese';
const DATI = 'agenti/seo/mese.json';
firma('AGENTE SEO (controllo del mese)');

const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

/** Il messaggio coi soli dati, se l'agente non ha scritto il suo. */
export function messaggioDiBase(d) {
  const r = d.riassunto;
  const righe = [`Controllo del mese: ${r.indicizzate} pagine indicizzate su ${r.pagine}.`];
  const daIndicizzare = d.pagine.filter((p) => p.indicizzazione?.esito && p.indicizzazione.esito !== 'PASS');
  if (daIndicizzare.length) {
    righe.push('', 'Google non le ha nell\'indice. Apri il link e premi "Richiedi indicizzazione":');
    for (const p of daIndicizzare) righe.push(`${p.pagina} (${p.indicizzazione.stato})`, p.indicizzazione.link || '');
  }
  if (/non misurata/.test(d.velocita)) righe.push('', 'La velocità sul telefono non è misurata: va acceso PageSpeed nel progetto Google Cloud acquadirete-seo.');
  else if (r.lente.length) righe.push('', `Lente sul telefono: ${r.lente.map((x) => x.pagina).join(', ')}.`);
  else righe.push('', `Velocità sul telefono: a posto (punteggio medio ${r.velocitaMedia}).`);
  return righe.filter((x, i, a) => x || a[i - 1]).join('\n');
}

async function main() {
  const rapporto = leggi(join(CARTELLA, 'mese.md'));
  const testo = leggi(join(CARTELLA, 'telegram.txt'));
  const dati = existsSync(DATI) ? JSON.parse(readFileSync(DATI, 'utf8')) : null;
  const agenteRiuscito = Boolean(rapporto && testo);

  let finale = agenteRiuscito ? testo : (dati ? messaggioDiBase(dati) : 'Controllo del mese: i dati non sono stati raccolti.');
  if (!agenteRiuscito) {
    let coda = 'Lo segnala il Direttore al controllo di domani mattina.';
    if (!prova) {
      const { chiamaMeccanico } = await import('./lib/meccanico.mjs');
      const errore = await chiamaMeccanico('Agente SEO', [{ tipo: 'fallito', nome: 'Controllo SEO del mese', workflow: 'seo-mese.yml', giro: Number(process.env.GITHUB_RUN_ID) || undefined, testo: 'L\'analisi del mese non ha scritto il rapporto o il messaggio.' }]);
      if (!errore) coda = 'L\'ho passato al Meccanico: guarda lui perché.';
    }
    finale += `\n\nOggi l'analisi approfondita non è riuscita: questi sono solo i dati. ${coda}`;
  }

  if (prova) {
    console.log(`--- messaggio (${finale.length} caratteri) ---\n${finale}\n--- rapporto: ${rapporto ? `${rapporto.length} caratteri` : 'assente'} ---`);
    return;
  }

  if (rapporto) {
    // Lo stato delle schede fuori dal sito lo tiene l'agente: cosa ha chiesto a
    // Matteo e quando, così il mese dopo non glielo richiede.
    const schede = leggi(join(CARTELLA, 'schede-fuori.md'));
    suMain('SEO: rapporto del controllo del mese [skip netlify]', (dir) => {
      writeFileSync(join(dir, 'agenti/seo/mese.md'), `${rapporto}\n`);
      if (schede) writeFileSync(join(dir, 'agenti/seo/schede-fuori.md'), `${schede}\n`);
      return ['agenti/seo/mese.md', ...(schede ? ['agenti/seo/schede-fuori.md'] : [])];
    }, { autore: 'agente-seo' });
    console.log('Rapporto messo su main.');
  }

  // Una proposta pronta e non partita è un guasto, non un lavoro per Matteo.
  const nonPartita = leggi(join(CARTELLA, 'proposta-non-partita.txt'));
  if (nonPartita) {
    const { chiamaMeccanico } = await import('./lib/meccanico.mjs');
    const errore = await chiamaMeccanico('Agente SEO', [{ tipo: 'fallito', nome: 'Controllo SEO del mese', workflow: 'seo-mese.yml', giro: Number(process.env.GITHUB_RUN_ID) || undefined, testo: `La proposta del mese era pronta ma non è partita: ${nonPartita}. Le correzioni sono nel rapporto (agenti/seo/mese.md), sezione "Per l'agente SEO del lunedì".` }]);
    finale += errore
      ? "\n\nLa proposta era pronta ma non è partita, e non sono riuscito a chiamare il Meccanico: la rifà l'agente SEO lunedì."
      : "\n\nLa proposta era pronta ma non è partita: l'ho passato al Meccanico, e intanto la rifà l'agente SEO lunedì.";
  }

  for (let i = 0; i < finale.length; i += 3800) await messaggio(finale.slice(i, i + 3800));
  console.log('Messaggio mandato.');

  // La nota la scrive l'agente; se non c'è (agente fallito) la lascio io.
  const note = join(process.env.BACHECA_DIR || '/tmp/bacheca', 'seo-1.json');
  if (!existsSync(note)) {
    mkdirSync(process.env.BACHECA_DIR || '/tmp/bacheca', { recursive: true });
    const r = dati?.riassunto;
    lasciaNota('seo', `Controllo SEO del mese: l'analisi non è riuscita, a Matteo sono andati solo i dati${r ? ` (${r.indicizzate} pagine indicizzate su ${r.pagine})` : ''}.`, ['direttore', 'meccanico']);
  }
}

main().catch((e) => {
  console.error(`Rapporto del mese non mandato: ${e.message}`);
  process.exit(1);
});
