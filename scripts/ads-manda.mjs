#!/usr/bin/env node
// ============================================================================
//  REVISIONE ADS — l'ultimo passo: mandarla a Matteo
//
//  Gira in agente-ads.yml dopo l'analisi (.claude/skills/revisione-ads). Manda
//  /tmp/ads-revisione.txt, e se c'e' allega /tmp/ads-dettaglio.txt. Se l'analisi
//  non ha scritto niente (e' fallita, o ha fatto tardi) manda la revisione di
//  base preparata da agente-ads.mjs, dicendolo: il 18 non resta mai muto.
//
//  Poi LA PROPOSTA (dal 13 ott 2026): se l'analisi ha lasciato in
//  /tmp/ads-azioni.json delle modifiche da applicare a Google Ads, qui si
//  controllano una per una (lib/ads-azioni.mjs: i limiti stanno li'), si chiede a
//  Google se le accetterebbe (senza applicarle), si mette la proposta su main
//  (agenti/ads/proposte.json, con l'elenco cifrato) e la si manda a Matteo. Le
//  applica scripts/risposte.mjs, e solo quando lui risponde APPROVA ADS.
//
//  Sistema anche la nota per la bacheca: quella dell'analisi se c'e', se no
//  quella di base.
//
//  Nel log solo lunghezze e conteggi: dentro i testi c'e' la spesa, e il log e'
//  pubblico.
// ============================================================================

import { readFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { messaggio, documento } from './lib/telegram.mjs';
import { lasciaNota } from './lib/bacheca.mjs';
import { muta } from './lib/ads.mjs';
import { controlla, operazioni, riga, numeriDi, LIMITI } from './lib/ads-azioni.mjs';
import { leggi as leggiProposte, salva as salvaProposte, nuova, FILE } from './lib/ads-proposte.mjs';
import { suMain } from './lib/spingi.mjs';

const TMP = process.env.ADS_TMP || '/tmp';
const REVISIONE = `${TMP}/ads-revisione.txt`;
const DETTAGLIO = `${TMP}/ads-dettaglio.txt`;
const BASE = `${TMP}/ads-base.txt`;
const NOTA_BASE = `${TMP}/ads-nota-base.json`;
const DATI = `${TMP}/ads-dati.json`;
const AZIONI = `${TMP}/ads-azioni.json`;
const BACHECA = process.env.BACHECA_DIR || '/tmp/bacheca';
const LIMITE = 3900;   // Telegram taglia a 4096, e in cima c'e' la riga con chi parla
// --prova: non manda e non spinge niente. Dice quanto sono lunghi i testi e come
// andrebbero i controlli sulle modifiche (Google compreso, che le guarda senza
// applicarle). Nel log niente ricerche e niente cifre.
const PROVA = process.argv.includes('--prova');

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

/** Il messaggio con la proposta. `scartate` sono quelle fermate dai controlli. */
export function componiProposta(buone, scartate, { senzaPermesso = false } = {}) {
  const n = buone.length;
  const blocchi = [
    `PROPOSTA: ${n === 1 ? 'una modifica' : `${n} modifiche`} a Google Ads, già ${n === 1 ? 'pronta' : 'pronte'}\n` +
    `Se approvi ${n === 1 ? 'la applico' : 'le applico'} io, subito. Budget, offerte e campagne non li tocco.`,
    ...buone.map((a, i) => [`${i + 1}. ${riga(a)}`, a.perche && `Perché: ${a.perche}`, numeriDi(a)].filter(Boolean).join('\n')),
  ];
  if (scartate.length) {
    blocchi.push(`Ne avevo pensate altre ${scartate.length}, fermate dai miei controlli:\n${scartate.map((s) => `• ${descrivi(s.azione)} — ${s.motivo}`).join('\n')}`);
  }
  blocchi.push(
    'Rispondi:\n' +
    `APPROVA ADS — ${n === 1 ? 'la applico' : 'le applico tutte'}\n` +
    (n > 1 ? 'APPROVA ADS 1 3 — solo quelle coi numeri che scrivi\n' : '') +
    'RIFIUTA ADS e il motivo — non tocco niente\n' +
    `Dopo averle applicate, ANNULLA ADS rimette tutto com'era. La proposta vale ${LIMITI.giorniValida} giorni.`,
  );
  if (senzaPermesso) {
    blocchi.push('ATTENZIONE: oggi non potrei applicarle, su Google Ads il mio accesso è ancora di sola lettura. Se scrivi APPROVA ADS ti dico come darmi il permesso.');
  }
  return blocchi.join('\n\n');
}

// Una modifica scartata puo' essere scritta male: si descrive con quello che c'e'.
function descrivi(a) {
  if (!a || typeof a !== 'object') return 'una voce scritta male';
  if (a.doveNome) return riga(a);
  const cosa = { escludi: 'escludere', 'pausa-parola': 'mettere in pausa la parola', 'pausa-annuncio': 'mettere in pausa un annuncio' }[a.tipo] || String(a.tipo || 'modifica sconosciuta');
  return `${cosa}${a.testo ? ` «${String(a.testo).slice(0, 60)}»` : ''}`;
}

/** Le modifiche da applicare: controllate, messe su main e mandate a Matteo. */
async function proposta() {
  let grezze;
  try {
    const letto = JSON.parse(leggi(AZIONI) || 'null');
    grezze = Array.isArray(letto) ? letto : letto?.azioni;
  } catch {
    console.log('Il file delle modifiche non si legge: nessuna proposta.');
    return;
  }
  if (!Array.isArray(grezze) || !grezze.length) {
    console.log('L\'analisi non ha proposto modifiche da applicare.');
    return;
  }
  const g = JSON.parse(readFileSync(DATI, 'utf8')).google;
  if (!g.struttura || g.struttura.errore) {
    console.log('Manca la struttura dell\'account: le modifiche non si possono controllare, nessuna proposta.');
    return;
  }
  const { buone: passate, scartate } = controlla(grezze.slice(0, 60), g.struttura, {
    termini: g.terminiPerGruppo?.errore ? undefined : g.terminiPerGruppo,
    parole: g.paroleChiave?.errore ? undefined : g.paroleChiave,
    annunci: g.annunci?.errore ? undefined : g.annunci,
    clicTotali: g.totali?.ora?.clic,
  });

  // Google le guarda una per una senza applicarle: una che rifiuterebbe non va proposta.
  const buone = [];
  let senzaPermesso = false;
  for (const a of passate) {
    try {
      await muta(operazioni([a]), { prova: true });
      buone.push(a);
    } catch (e) {
      if (e.senzaPermesso) { senzaPermesso = true; buone.push(a); }
      else scartate.push({ azione: a, motivo: `Google non la accetta: ${e.message}` });
    }
  }
  console.log(`Modifiche da applicare: ${grezze.length} proposte dall'analisi, ${buone.length} buone, ${scartate.length} scartate dai controlli${senzaPermesso ? ' (accesso a Google Ads ancora di sola lettura)' : ''}.`);
  if (PROVA) {
    const conta = (elenco, chiave) => Object.entries(elenco.reduce((s, x) => ({ ...s, [chiave(x)]: (s[chiave(x)] || 0) + 1 }), {})).map(([k, n]) => `${n} × ${k}`).join('; ');
    if (buone.length) console.log(`  buone: ${conta(buone, (a) => a.tipo)}`);
    // I motivi senza quello che sta fra virgolette: li' ci sono parole chiave e ricerche.
    if (scartate.length) console.log(`  scartate: ${conta(scartate, (s) => s.motivo.replace(/\s*\(?«[^»]*»\)?/g, '').replace(/^Google non la accetta: .*/, 'Google non la accetta'))}`);
    if (buone.length) console.log(`  il messaggio della proposta sarebbe di ${componiProposta(buone, scartate.slice(0, 10), { senzaPermesso }).length} caratteri.`);
    return;
  }

  if (!buone.length) {
    await messaggio(`Avevo preparato ${grezze.length === 1 ? 'una modifica' : `${grezze.length} modifiche`} da applicare a Google Ads, ma i miei controlli ${grezze.length === 1 ? 'l\'hanno fermata' : 'le hanno fermate tutte'}:\n${scartate.slice(0, 15).map((s) => `• ${descrivi(s.azione)} — ${s.motivo}`).join('\n')}\n\nQuesto mese non ti propongo niente da approvare.`);
    return;
  }

  // Prima sta su main, poi si manda: se no un APPROVA ADS non troverebbe niente.
  suMain(`Agente Ads: proposta di ${buone.length} modifiche a Google Ads, in attesa di Matteo [skip netlify]`, (dir) => {
    const elenco = leggiProposte(dir);
    nuova(elenco, buone);
    salvaProposte(elenco, dir);
    return [FILE];
  }, { autore: 'agente-ads' });

  for (const pezzo of aPezzi(componiProposta(buone, scartate.slice(0, 10), { senzaPermesso }))) await messaggio(pezzo);
  lasciaNota('ads', `Per MATTEO: ho preparato ${buone.length === 1 ? 'una modifica' : `${buone.length} modifiche`} a Google Ads già ${buone.length === 1 ? 'pronta' : 'pronte'} (ricerche da escludere, parole da mettere in pausa). Su Telegram rispondi APPROVA ADS e ${buone.length === 1 ? 'la applico' : 'le applico'} io, oppure RIFIUTA ADS e il motivo.`, ['matteo', 'direttore']);
  console.log('Proposta messa su main e mandata a Matteo.');
}

async function main() {
  const revisione = leggi(REVISIONE);
  const base = leggi(BASE);

  if (PROVA) {
    for (const [nome, f] of [['revisione', REVISIONE], ['dettaglio', DETTAGLIO], ['modifiche da applicare', AZIONI], ['revisione di base', BASE]]) {
      console.log(`${nome}: ${leggi(f) ? `${leggi(f).length} caratteri` : 'non c\'è'}`);
    }
    await proposta();
    return;
  }

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

  // La proposta viene dopo, e non deve far perdere la revisione: se si rompe la
  // revisione e' gia' partita, e il giro risulta fallito.
  if (revisione) {
    try {
      await proposta();
    } catch (e) {
      console.log(`Proposta non riuscita: ${e.message}`);
      await messaggio(`Avevo preparato delle modifiche da applicare a Google Ads, ma non sono riuscito a mettertele in attesa. La revisione qui sopra resta valida. ${await alMeccanico('La revisione della pubblicità è partita, ma la proposta delle modifiche da applicare a Google Ads (scripts/ads-manda.mjs, la parte dopo la revisione) non è riuscita: guarda il log del passo "Manda la revisione a Matteo".')}`);
      process.exitCode = 1;
    }
  }
}

const lanciatoDaTerminale = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (lanciatoDaTerminale) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
