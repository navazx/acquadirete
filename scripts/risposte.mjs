#!/usr/bin/env node
// ============================================================================
//  RISPOSTE SU TELEGRAM — l'unico che legge quello che Matteo scrive al bot
//
//  Gira ogni mezz'ora nelle ore di veglia. E' uno solo di proposito: Telegram
//  consegna ogni messaggio a chi lo legge per primo, quindi due lettori si
//  ruberebbero gli ordini a vicenda.
//
//  Ordini riconosciuti:
//    post social   PUBBLICA [1|2|3] · RIMANDA (o SALTA) · SCARTA
//    proposte      APPROVA [ARTICOLO|SEO] · RIFIUTA [ARTICOLO|SEO] [motivo]
//
//  Una proposta e' un ramo proposta/... preparato da un agente: un articolo, delle
//  correzioni SEO. APPROVA lo unisce a main e Netlify lo mette online. RIFIUTA
//  cancella il ramo; il motivo, se c'e', finisce fra le lezioni che l'agente dei
//  contenuti rilegge prima del prossimo articolo.
//
//  Qualsiasi altra cosa non fa nulla: nel dubbio si sta fermi.
//  Se non c'e' niente in sospeso non legge nemmeno Telegram.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { messaggio, risposte, conferma } from './lib/telegram.mjs';
import { pubblicaFacebook, pubblicaInstagram } from './lib/meta.mjs';

const BOZZA = 'agenti/social-bozza.json';
const STATO = 'agenti/telegram-stato.json';
const PROPOSTE = 'agenti/proposte.json';
const LEZIONI = 'agenti/contenuti/lezioni.md';
const SITO = 'https://www.acquadirete.it';

const AIUTO =
  'Non ho capito, e non ho fatto niente.\n' +
  'Gli ordini che riconosco sono questi:\n\n' +
  'Per il post: PUBBLICA (oppure PUBBLICA 2, PUBBLICA 3) · RIMANDA · SCARTA\n' +
  'Per le proposte: APPROVA ARTICOLO · RIFIUTA ARTICOLO e il motivo';

const leggiJson = (f, vuoto) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : vuoto);
const salva = (f, o) => writeFileSync(f, `${JSON.stringify(o, null, 2)}\n`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const oggi = () => new Date().toISOString();

/** Traduce un messaggio in un ordine. Null se non lo e'. */
export function ordine(testo) {
  const pulito = String(testo).replace(/\s+/g, ' ').trim();
  const t = pulito.toUpperCase();

  if (t === 'SCARTA') return { argomento: 'social', azione: 'scarta' };
  if (t === 'RIMANDA' || t === 'SALTA') return { argomento: 'social', azione: 'rimanda' };
  const p = t.match(/^PUBBLICA(?: ([123]))?$/);
  if (p) return { argomento: 'social', azione: 'pubblica', variante: Number(p[1] || 1) };

  const a = pulito.match(/^(approva|rifiuta)(?: (articolo|seo))?(?: (.+))?$/i);
  if (a) {
    const azione = a[1].toLowerCase();
    const tipo = a[2] ? a[2].toUpperCase() : null;
    const motivo = (a[3] || '').trim();
    // "approva domani" o "approva l'articolo" non sono ordini: meglio chiedere
    // che approvare per sbaglio.
    if (azione === 'approva' && motivo) return null;
    return { argomento: 'proposta', azione, tipo, motivo };
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Post social
// ---------------------------------------------------------------------------

async function eseguiSocial(o) {
  const bozza = existsSync(BOZZA) ? leggiJson(BOZZA) : null;
  if (!bozza || bozza.pubblicato || bozza.scartato) {
    await messaggio('Non c\'è nessun post in attesa: non ho fatto niente.');
    return;
  }

  if (o.azione === 'scarta') {
    salva(BOZZA, { ...bozza, scartato: oggi() });
    await messaggio('Bozza scartata, non ho pubblicato niente. Sabato te ne preparo una nuova.');
    return;
  }

  // RIMANDA non butta niente: toglie il segno di "gia' mandata", e per questo
  // sabato la stessa bozza torna identica.
  if (o.azione === 'rimanda') {
    const rimandi = (bozza.rimandi || 0) + 1;
    const { inviato, ...resto } = bozza;
    salva(BOZZA, { ...resto, rimandata: oggi(), rimandi });
    await messaggio(
      'Niente post questa settimana. Le idee restano: te le ripropongo sabato.' +
      (rimandi >= 3 ? '\n\nSiamo a tre rimandi: se non ti convincono, SCARTA e ne preparo di nuove.' : ''),
    );
    return;
  }

  const variante = bozza.varianti[o.variante - 1];
  if (!variante) {
    await messaggio(`Non ho la variante ${o.variante}: ce ne sono ${bozza.varianti.length}.`);
    return;
  }

  const didascalia = [variante.testo, '', (variante.hashtag || []).join(' ')].join('\n').trim();
  const urlFoto = bozza.foto ? `${SITO}/${bozza.foto.replace(/^\/+/, '')}` : null;
  const esiti = {};
  const errori = [];

  try {
    esiti.facebook = await pubblicaFacebook(didascalia, urlFoto);
  } catch (e) {
    errori.push(`Facebook: ${e.message}`);
  }
  // Instagram non pubblica senza immagine: non e' un errore, e' un limite suo.
  if (urlFoto) {
    try {
      esiti.instagram = await pubblicaInstagram(didascalia, urlFoto);
    } catch (e) {
      errori.push(`Instagram: ${e.message}`);
    }
  } else {
    esiti.instagram = { saltato: 'nessuna foto: Instagram le pretende' };
  }

  salva(BOZZA, {
    ...bozza,
    pubblicato: oggi(),
    variantePubblicata: o.variante,
    esiti,
    errori: errori.length ? errori : undefined,
  });

  const righe = [`Pubblicata la variante ${o.variante}.`, ''];
  if (esiti.facebook) righe.push(`Facebook: ${esiti.facebook.url}`);
  if (esiti.instagram?.id) righe.push('Instagram: pubblicato');
  if (esiti.instagram?.saltato) righe.push(`Instagram: saltato (${esiti.instagram.saltato})`);
  if (errori.length) righe.push('', 'Non è andato tutto liscio:', ...errori.map((e) => `• ${e}`));
  await messaggio(righe.join('\n'));
}

// ---------------------------------------------------------------------------
//  Proposte (rami proposta/...)
// ---------------------------------------------------------------------------

function aggiorna(ramo, campi) {
  const elenco = leggiJson(PROPOSTE, []);
  const i = elenco.findIndex((p) => p.ramo === ramo);
  if (i >= 0) elenco[i] = { ...elenco[i], ...campi };
  salva(PROPOSTE, elenco);
}

async function approva(p) {
  try {
    git('pull', '--ff-only', 'origin', 'main');
    git('fetch', 'origin', p.ramo);
    git('merge', '--no-ff', 'FETCH_HEAD', '-m', `Approvato da Matteo: ${p.titolo}`);
  } catch (e) {
    try { git('merge', '--abort'); } catch { /* niente da annullare */ }
    console.log(e.stderr || e.message);
    aggiorna(p.ramo, { problema: `non si unisce a main (${oggi()})` });
    await messaggio(
      `Non riesco a mettere online «${p.titolo}»: nel frattempo il sito è cambiato negli stessi punti.\n` +
      'Resta in attesa. Chiedi a Claude dal PC di sistemarla.',
    );
    return;
  }

  // Prima si pubblica, poi si dice che e' pubblicato.
  git('push', 'origin', 'HEAD:main');
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'approvata', decisa: oggi() });

  await messaggio(
    `Approvato: «${p.titolo}» va online fra un paio di minuti.` + (p.url ? `\n${p.url}` : ''),
  );
}

async function rifiuta(p, motivo) {
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'rifiutata', decisa: oggi(), motivo: motivo || undefined });

  if (motivo && p.tipo === 'ARTICOLO') {
    appendFileSync(LEZIONI, `\n- ${oggi().slice(0, 10)} — «${p.titolo}» rifiutato: ${motivo}\n`);
  }

  await messaggio(
    `Rifiutato: «${p.titolo}» non va online.` +
    (motivo
      ? '\nIl motivo l\'ho segnato: l\'agente lo rilegge prima di scrivere il prossimo.'
      : '\nLa prossima volta scrivi anche il perché (RIFIUTA ARTICOLO e il motivo): l\'agente lo terrà a mente.'),
  );
}

async function eseguiProposta(o, aperte) {
  const candidate = o.tipo ? aperte.filter((p) => p.tipo === o.tipo) : aperte;
  const verbo = o.azione.toUpperCase();

  if (!candidate.length) {
    await messaggio(`Non c'è nessuna proposta${o.tipo ? ` ${o.tipo.toLowerCase()}` : ''} in attesa: non ho fatto niente.`);
    return;
  }
  if (candidate.length > 1) {
    await messaggio(`Ci sono ${candidate.length} proposte in attesa: scrivi ${verbo} ARTICOLO oppure ${verbo} SEO.`);
    return;
  }
  if (o.azione === 'approva') await approva(candidate[0]);
  else await rifiuta(candidate[0], o.motivo);
}

// ---------------------------------------------------------------------------

async function main() {
  const bozza = existsSync(BOZZA) ? leggiJson(BOZZA) : null;
  const socialInAttesa = Boolean(bozza && !bozza.pubblicato && !bozza.scartato);
  const aperte = leggiJson(PROPOSTE, []).filter((p) => p.stato === 'in attesa');
  if (!socialInAttesa && !aperte.length) return;

  const { ultimoUpdate = 0 } = leggiJson(STATO, {});
  const { testi, ultimo } = await risposte(ultimoUpdate);
  if (!testi.length) return;

  // Si consuma SEMPRE quello che si e' letto, e PRIMA di agire: se qualcosa si
  // rompe a meta', l'ordine e' comunque sparito dalla coda di Telegram. Meglio un
  // ordine perso che un post doppio.
  await conferma(ultimo);
  salva(STATO, { ultimoUpdate: ultimo });

  // Vale l'ultimo ordine per ciascun argomento: un PUBBLICA dopo un RIMANDA vince.
  const ordini = new Map();
  let tentativiAVuoto = false;
  for (const testo of testi) {
    const o = ordine(testo);
    if (!o) {
      if (/^\s*(pubblica|scarta|rimanda|salta|approva|rifiuta)/i.test(testo)) tentativiAVuoto = true;
      continue;
    }
    // Un APPROVA senza tipo, con una sola proposta aperta, e' per quella.
    if (o.argomento === 'proposta' && !o.tipo && aperte.length === 1) o.tipo = aperte[0].tipo;
    ordini.set(o.argomento === 'social' ? 'social' : `proposta:${o.tipo || '?'}`, o);
  }

  if (!ordini.size) {
    if (tentativiAVuoto) await messaggio(AIUTO);
    return;
  }

  for (const o of ordini.values()) {
    if (o.argomento === 'social') await eseguiSocial(o);
    else await eseguiProposta(o, aperte);
  }
}

const lanciatoDaTerminale = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (lanciatoDaTerminale) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
