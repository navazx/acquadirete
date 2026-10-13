#!/usr/bin/env node
// ============================================================================
//  REVISIONE ADS — l'ultimo passo: mandarla a Matteo
//
//  Gira in agente-ads.yml dopo l'analisi (.claude/skills/revisione-ads). Manda
//  /tmp/ads-revisione.txt, e se c'e' allega /tmp/ads-dettaglio.txt. Se l'analisi
//  non ha scritto niente (e' fallita, o ha fatto tardi) manda la revisione di
//  base preparata da agente-ads.mjs, dicendolo: il 18 non resta mai muto.
//
//  Sistema anche la nota per la bacheca: quella dell'analisi se c'e', se no
//  quella di base.
//
//  Nel log solo le lunghezze: dentro i testi c'e' la spesa, e il log e' pubblico.
// ============================================================================

import { readFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { messaggio, documento } from './lib/telegram.mjs';

const REVISIONE = '/tmp/ads-revisione.txt';
const DETTAGLIO = '/tmp/ads-dettaglio.txt';
const BASE = '/tmp/ads-base.txt';
const NOTA_BASE = '/tmp/ads-nota-base.json';
const BACHECA = process.env.BACHECA_DIR || '/tmp/bacheca';
const LIMITE = 3900;   // Telegram taglia a 4096, e in cima c'e' la riga con chi parla

const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

/** Un testo lungo si spezza a capoverso, mai a meta' frase. */
export function aPezzi(testo, limite = LIMITE) {
  const pezzi = [];
  let corrente = '';
  for (const blocco of testo.split(/\n{2,}/)) {
    if (corrente && corrente.length + blocco.length + 2 > limite) { pezzi.push(corrente); corrente = ''; }
    if (blocco.length > limite) {
      for (let i = 0; i < blocco.length; i += limite) pezzi.push(blocco.slice(i, i + limite));
      continue;
    }
    corrente = corrente ? `${corrente}\n\n${blocco}` : blocco;
  }
  if (corrente) pezzi.push(corrente);
  return pezzi;
}

/** Un giro andato male non si rimanda a Matteo: lo guarda il Meccanico. */
async function alMeccanico(testo) {
  const { chiamaMeccanico } = await import('./lib/meccanico.mjs');
  const errore = await chiamaMeccanico('Agente Ads', [{ tipo: 'fallito', nome: 'Revisione Ads', workflow: 'agente-ads.yml', giro: Number(process.env.GITHUB_RUN_ID) || undefined, testo }]);
  return errore
    ? 'Lo segnala il Direttore al controllo di domani mattina.'
    : 'L\'ho passato al Meccanico: guarda lui perché e, se si può, la fa ripartire.';
}

async function main() {
  const revisione = leggi(REVISIONE);
  const base = leggi(BASE);

  if (revisione) {
    for (const pezzo of aPezzi(revisione)) await messaggio(pezzo);
    if (leggi(DETTAGLIO)) await documento(DETTAGLIO, 'Revisione della pubblicità: il dettaglio');
    console.log(`Revisione approfondita mandata (${revisione.length} caratteri${leggi(DETTAGLIO) ? ', col dettaglio allegato' : ''}).`);
  } else if (base) {
    const coda = await alMeccanico('La revisione della pubblicità è uscita solo coi conti di base: l\'analisi approfondita (il passo con l\'IA) non ha scritto niente.');
    for (const pezzo of aPezzi(`${base}\n\nNota: oggi l'analisi approfondita non è riuscita, questa è la revisione di base coi soli conti. ${coda}`)) await messaggio(pezzo);
    console.log(`L'analisi non ha scritto niente: mandata la revisione di base (${base.length} caratteri).`);
    process.exitCode = 1;   // il giro risulta fallito, cosi' il Direttore lo segnala
  } else {
    await messaggio(`La revisione della pubblicità di questo mese non è riuscita: non ho né l'analisi né i conti di base. ${await alMeccanico('La revisione della pubblicità non è riuscita: mancano sia l\'analisi sia i conti di base.')}`);
    console.log('Niente da mandare: né analisi né base.');
    process.exitCode = 1;
  }

  // La nota per la bacheca: se l'analisi non l'ha lasciata, vale quella di base.
  const lasciata = existsSync(BACHECA) && readdirSync(BACHECA).some((f) => f.endsWith('.json'));
  if (!lasciata && existsSync(NOTA_BASE)) {
    mkdirSync(BACHECA, { recursive: true });
    copyFileSync(NOTA_BASE, `${BACHECA}/ads-1.json`);
    console.log('Nota per la bacheca: quella di base.');
  }
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
