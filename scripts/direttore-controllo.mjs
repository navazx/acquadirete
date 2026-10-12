#!/usr/bin/env node
// ============================================================================
//  IL CONTROLLO DEL DIRETTORE — ogni mattina guarda se gli agenti hanno lavorato
//
//  Fino al 12 ott 2026 nessuno controllava gli agenti: il controllo SEO partiva
//  con nove ore di ritardo, le note arrivavano sulla bacheca il giorno dopo, tre
//  scelte aspettavano Matteo da una settimana e non stavano scritte da nessuna
//  parte. Se ne accorgeva lui, per caso. Un sistema che deve girare da solo ha
//  bisogno di qualcuno che guardi se gira: e' il lavoro di tutti i giorni del
//  Direttore (quello del 1° del mese, le priorita', resta in direttore.yml).
//
//  Cosa guarda, senza intelligenza artificiale: sono conti, non opinioni.
//   1. Gli agenti su GitHub (tabella AGENTI in netlify/functions/_shared/orari.mjs):
//      sono partiti all'appuntamento? in orario? sono falliti?
//   2. Le routine su claude.ai (tabella ROUTINE): da qui non si vedono, quindi si
//      guardano le tracce che lasciano nel repo e sulla bacheca.
//   3. La bacheca: chi doveva lasciare una nota l'ha lasciata? Il postino consegna?
//   4. La sveglia ha fatto partire questo controllo, o e' partito di riserva?
//   5. Cosa aspetta una risposta di Matteo, e da quanti giorni.
//
//  Quando parla:
//   - su Telegram SOLO se qualcosa non ha funzionato, o se una cosa aspetta
//     Matteo da 2, 5, 7, 14… giorni. Se e' tutto a posto tace.
//   - sulla bacheca: una nota quando qualcosa non va, e ogni lunedi' il riepilogo
//     della settimana, anche se e' tutto regolare.
//
//  Prova in locale (stampa tutto, non manda niente):
//    node scripts/direttore-controllo.mjs --prova
// ============================================================================

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { AGENTI, ROUTINE } from '../netlify/functions/_shared/orari.mjs';
import { ultimoAppuntamento } from '../netlify/functions/_shared/sveglia.mjs';
import { lasciaNota } from './lib/bacheca.mjs';
import { decise } from './agente-seo.mjs';

const REPO = process.env.GITHUB_REPOSITORY || 'navazx/acquadirete';
const MINUTO = 60000, ORA = 60 * MINUTO, GIORNO = 24 * ORA;
const INDIETRO = 35 * 24 * 60;        // quanto indietro si cerca l'ultimo appuntamento (minuti)
const DA_DIRE = 48 * ORA;             // un guasto si dice per due giorni, poi basta
const TEMPO_PER_PARTIRE = 90 * MINUTO;
const TEMPO_PER_LA_NOTA = 6 * ORA;    // le note delle routine arrivano col postino, ogni 3 ore
const RITARDO = 60 * MINUTO;

const prova = process.argv.includes('--prova');

const quandoIt = (d) => d.toLocaleString('it-IT', { timeZone: 'Europe/Rome', weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const giornoIt = (d) => d.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit' });
const ore = (ms) => (ms >= 2 * ORA ? `${Math.round(ms / ORA)} ore` : `${Math.round(ms / MINUTO)} minuti`);
const leggi = (f, vuoto) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : vuoto);

async function github(percorso) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO}${percorso}`, {
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} su ${percorso.split('?')[0]}`);
  return res.json();
}

const iso = (d) => d.toISOString().replace(/\.\d+Z$/, 'Z');
const giri = (workflow, dal) =>
  github(`/actions/workflows/${workflow}/runs?per_page=20&created=${encodeURIComponent(`>=${iso(dal)}`)}`);

// --- La bacheca -------------------------------------------------------------

const ETICHETTE = { 'seo': 'seo', 'social': 'social', 'direttore': 'direttore', 'contenuti': 'contenuti', 'recensioni': 'recensioni', 'scheda google': 'scheda', 'lead e clienti': 'lead', 'ads': 'ads', 'matteo': 'matteo' };

/** Le note recenti: quelle gia' sulla bacheca (la copia nel repo) e quelle ancora in arrivo. */
export function leggiNote(adesso, { copia = 'agenti/bacheca.md', inArrivo = 'agenti/bacheca/in-arrivo' } = {}) {
  const note = [];
  if (existsSync(copia)) {
    for (const riga of readFileSync(copia, 'utf8').split('\n')) {
      const m = riga.match(/^- \*\*(\d\d)\/(\d\d), (\d\d):(\d\d) · ([^*]+)\*\*/);
      if (!m) continue;
      const agente = ETICHETTE[m[5].trim().toLowerCase()];
      if (!agente) continue;
      // L'ora e' quella italiana: un'ora o due avanti. Si tiene larga, basta il giorno.
      let quando = new Date(Date.UTC(adesso.getUTCFullYear(), Number(m[2]) - 1, Number(m[1]), Number(m[3]) - 2, Number(m[4])));
      if (quando - adesso > 2 * GIORNO) quando = new Date(Date.UTC(adesso.getUTCFullYear() - 1, Number(m[2]) - 1, Number(m[1]), Number(m[3]) - 2, Number(m[4])));
      note.push({ agente, quando, consegnata: true });
    }
  }
  if (existsSync(inArrivo)) {
    for (const f of readdirSync(inArrivo).filter((n) => n.endsWith('.json'))) {
      try {
        const n = JSON.parse(readFileSync(`${inArrivo}/${f}`, 'utf8'));
        note.push({ agente: String(n.agente).toLowerCase(), quando: new Date(n.quando), consegnata: false });
      } catch { /* una nota rotta non ferma il controllo */ }
    }
  }
  return note;
}

const haLasciatoNota = (note, agente, dal) => note.some((n) => n.agente === agente && n.quando >= dal - ORA);

// --- I controlli ------------------------------------------------------------

/**
 * Torna { problemi, attese, regolari }:
 *   problemi  cose che non hanno funzionato (righe di testo)
 *   attese    cose che aspettano Matteo: { testo, giorni } (giorni null = senza data)
 *   regolari  quello che ha girato bene, per la prova e per il riepilogo
 */
export async function controlla(adesso = new Date()) {
  const problemi = [], attese = [], regolari = [], vecchi = [];
  const note = leggiNote(adesso);

  // 1. Gli agenti su GitHub.
  for (const a of AGENTI.filter((x) => !x.controllore)) {
    const quando = ultimoAppuntamento(a.cron, adesso, INDIETRO);
    if (!quando) { vecchi.push(`${a.nome}: nessun appuntamento negli ultimi 35 giorni.`); continue; }
    const eta = adesso - quando;
    if (eta < TEMPO_PER_PARTIRE) { regolari.push(`${a.nome}: appuntamento ${quandoIt(quando)}, è presto per controllare.`); continue; }
    const recente = eta <= DA_DIRE;
    const dove = recente ? problemi : vecchi;

    const { workflow_runs: elenco = [] } = await giri(a.workflow, quando);
    if (!elenco.length) {
      dove.push(`${a.nome}: NON È PARTITO. Doveva partire ${quandoIt(quando)}.`);
      continue;
    }
    const primo = elenco[elenco.length - 1], ultimo = elenco[0];
    const ritardo = new Date(primo.created_at) - quando;
    if (ultimo.conclusion === 'failure' || ultimo.conclusion === 'timed_out') {
      dove.push(`${a.nome}: È FALLITO (giro di ${quandoIt(new Date(ultimo.created_at))}).`);
    } else if (ritardo > RITARDO) {
      dove.push(`${a.nome}: è partito con ${ore(ritardo)} di ritardo (doveva partire ${quandoIt(quando)}).`);
    } else {
      regolari.push(`${a.nome}: partito in orario ${quandoIt(quando)}.`);
    }
    if (a.nota && eta >= TEMPO_PER_LA_NOTA && !haLasciatoNota(note, a.nota, quando)) {
      dove.push(`${a.nome}: ha girato ma NON HA LASCIATO LA NOTA sulla bacheca.`);
    }
  }

  // 2. Le routine su claude.ai, dalle tracce che lasciano.
  const proposte = leggi('agenti/proposte.json', []);
  for (const r of ROUTINE) {
    const quando = ultimoAppuntamento(r.cron, adesso, INDIETRO);
    if (!quando) { vecchi.push(`${r.nome}: nessun appuntamento negli ultimi 35 giorni.`); continue; }
    const eta = adesso - quando;
    if (eta < 2 * ORA) { regolari.push(`${r.nome}: appuntamento ${quandoIt(quando)}, è presto per controllare.`); continue; }
    const dove = eta <= DA_DIRE ? problemi : vecchi;

    const nota = haLasciatoNota(note, r.nota, quando);
    let traccia = nota;
    if (!traccia && r.percorso) {
      const commit = await github(`/commits?path=${encodeURIComponent(r.percorso)}&since=${iso(quando)}&per_page=1`);
      traccia = commit.length > 0;
    }
    if (!traccia && r.proposta) traccia = proposte.some((p) => p.tipo === r.proposta && new Date(p.creata) >= quando);

    if (!traccia) dove.push(`${r.nome}: NON RISULTA PARTITO. Doveva partire ${quandoIt(quando)} e non ha lasciato tracce.`);
    else if (!nota && eta >= TEMPO_PER_LA_NOTA) dove.push(`${r.nome}: ha lavorato (${quandoIt(quando)}) ma NON HA LASCIATO LA NOTA sulla bacheca.`);
    else regolari.push(`${r.nome}: ha lavorato ${quandoIt(quando)}.`);
  }

  // 3. Il postino: una nota non deve restare in arrivo piu' di qualche ora.
  const ferme = note.filter((n) => !n.consegnata && adesso - n.quando > 4 * ORA);
  if (ferme.length) {
    const piuVecchia = Math.min(...ferme.map((n) => n.quando.getTime()));
    problemi.push(`Postino della bacheca: ${ferme.length === 1 ? 'una nota è ferma' : `${ferme.length} note sono ferme`} da ${ore(adesso - piuVecchia)}, non le sta consegnando.`);
  } else regolari.push('Postino della bacheca: nessuna nota ferma.');

  // 4. La sveglia: questo controllo lo fa partire lei. Se e' partito col giro di
  //    riserva di GitHub, la sveglia e' ferma.
  if (process.env.GITHUB_EVENT_NAME === 'schedule') {
    problemi.push('Sveglia degli agenti: oggi NON mi ha fatto partire, sono partito col giro di riserva di GitHub. Se la sveglia è ferma, gli agenti non partono in orario.');
  }

  // 5. Cosa aspetta Matteo.
  for (const p of proposte) {
    if (p.stato === 'in attesa') {
      attese.push({ giorni: Math.floor((adesso - new Date(p.creata)) / GIORNO), testo: `Proposta ${p.tipo} «${p.titolo}»: rispondi APPROVA, CORREGGI o RIFIUTA.` });
    }
    const ultima = (p.correzioni || []).at(-1);
    if (p.stato === 'da correggere' && ultima && adesso - new Date(ultima.chiesta) > 2 * ORA) {
      problemi.push(`Correzione di «${p.titolo}»: l'hai chiesta ${quandoIt(new Date(ultima.chiesta))} e non è tornata.`);
    }
  }
  const bozza = leggi('agenti/social-bozza.json', null);
  if (bozza && bozza.inviato && !bozza.pubblicato && !bozza.scartato) {
    attese.push({ giorni: Math.floor((adesso - new Date(bozza.inviato)) / GIORNO), testo: `Post social (${bozza.tema}): rispondi PUBBLICA, CORREGGI, RIMANDA o SCARTA.` });
  }
  const segnali = leggi('agenti/seo/posizioni.json', {}).segnali || [];
  const fatte = decise(existsSync('agenti/seo/posizioni-lavorate.md') ? readFileSync('agenti/seo/posizioni-lavorate.md', 'utf8') : '', adesso);
  const scelte = segnali.filter((s) => s.tipo === 'concorrenza' && !fatte.has(s.ricerca.toLowerCase()));
  // Le scelte le propone l'agente SEO in coda al controllo del lunedi'. Se dopo il
  // suo giro ci sono ancora pagine in concorrenza e nessuna proposta in attesa, non
  // ha fatto il suo lavoro.
  const seo = AGENTI.find((a) => a.workflow === 'agente-seo.yml');
  const giroSeo = seo && ultimoAppuntamento(seo.cron, adesso, INDIETRO);
  const proposta = proposte.some((p) => p.tipo === 'SEO' && (p.stato === 'in attesa' || p.stato === 'da correggere'));
  if (scelte.length && !proposta && giroSeo && adesso - giroSeo > 3 * ORA && adesso - giroSeo <= DA_DIRE) {
    problemi.push(`Agente SEO: ci sono ${scelte.length === 1 ? 'una ricerca' : `${scelte.length} ricerche`} con più pagine in concorrenza (${scelte.map((s) => `"${s.ricerca}"`).join(', ')}) ma NON HA MANDATO LA PROPOSTA.`);
  }

  return { problemi, attese, regolari, vecchi };
}

// Un promemoria ogni tanto, non tutti i giorni: al 2° e al 5° giorno, poi ogni settimana.
const daRicordare = (a) => a.giorni !== null && (a.giorni === 2 || a.giorni === 5 || (a.giorni >= 7 && a.giorni % 7 === 0));
const daQuanto = (a) => (a.giorni === null ? '' : a.giorni === 0 ? ' (da oggi)' : a.giorni === 1 ? ' (da ieri)' : ` (da ${a.giorni} giorni)`);

export function componi({ problemi, attese }, adesso, soloPromemoria = false) {
  const blocchi = [`Controllo degli agenti del ${giornoIt(adesso)}`];
  if (problemi.length) blocchi.push(`NON HA FUNZIONATO (${problemi.length})\n${problemi.map((p) => `• ${p}`).join('\n')}\n→ Chiedi a Claude dal PC di guardarci.`);
  const lista = soloPromemoria ? attese.filter(daRicordare) : attese;
  if (lista.length) blocchi.push(`ASPETTANO TE (${lista.length})\n${lista.map((a) => `• ${a.testo}${daQuanto(a)}`).join('\n')}`);
  if (!problemi.length) blocchi.push('Tutti gli agenti hanno girato regolari.');
  return blocchi.join('\n\n');
}

async function main() {
  const adesso = new Date();

  // Il giro di riserva di GitHub arriva ore dopo: se oggi il controllo e' gia'
  // stato fatto (lo ha avviato la sveglia), non si ripete e non si manda niente.
  if (!prova && process.env.GITHUB_EVENT_NAME === 'schedule') {
    const oggi = new Date(Date.UTC(adesso.getUTCFullYear(), adesso.getUTCMonth(), adesso.getUTCDate()));
    const { workflow_runs: fatti = [] } = await giri('direttore-controllo.yml', oggi);
    if (fatti.some((g) => g.event === 'workflow_dispatch' && g.conclusion === 'success')) {
      console.log('Il controllo di oggi è già stato fatto: il giro di riserva non serve.');
      return;
    }
  }

  const esito = await controlla(adesso);
  const { problemi, attese, regolari, vecchi } = esito;
  console.log(`${problemi.length} problemi, ${attese.length} cose che aspettano Matteo, ${regolari.length} voci regolari.`);

  if (prova) {
    console.log(`\n(prova: niente Telegram, niente bacheca)\n\n${componi(esito, adesso)}`);
    console.log(`\nREGOLARI\n${regolari.map((r) => `• ${r}`).join('\n')}`);
    if (vecchi.length) console.log(`\nVECCHI (oltre due giorni fa: non si dicono più, ma sono successi)\n${vecchi.map((r) => `• ${r}`).join('\n')}`);
    return;
  }

  const lunedi = adesso.getUTCDay() === 1;
  if (problemi.length || lunedi) {
    const testo = problemi.length
      ? `Controllo degli agenti: ${problemi.length === 1 ? 'una cosa non ha funzionato' : `${problemi.length} cose non hanno funzionato`}. ${problemi.join(' ')}`
      : `Controllo degli agenti, riepilogo della settimana: tutti hanno girato regolari.${attese.length ? ` Aspettano Matteo: ${attese.map((a) => a.testo).join(' ')}` : ' Niente in attesa di Matteo.'}`;
    try { lasciaNota('direttore', testo, problemi.length ? ['tutti'] : ['matteo']); } catch (e) { console.log(`Nota per la bacheca non lasciata: ${e.message}`); }
  }

  if (problemi.length || attese.some(daRicordare)) {
    const { messaggio } = await import('./lib/telegram.mjs');
    await messaggio(componi(esito, adesso, !problemi.length));
    console.log('Messaggio inviato.');
  } else {
    console.log('Niente da dire: nessun messaggio.');
  }
}

const lanciatoDaTerminale = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (lanciatoDaTerminale) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
