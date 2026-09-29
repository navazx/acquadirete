// Endpoint /api/gestione: il "motore" dell'app del telefono di babbo
// (public/gestione/). Legge e scrive il Gestionale_Clienti; la logica sta in
// _shared/gestionale.mjs.
//
// Accesso: ogni richiesta porta la chiave dell'app nell'header X-Chiave, che
// deve essere una di quelle nella variabile GESTIONE_CHIAVE su Netlify
// (non-secret e scope "all", come le altre: vedi CLAUDE.md). Una chiave per
// persona, nel formato "babbo:chiave1,matteo:chiave2": il nome finisce nello
// storico interventi. La chiave si mette sul telefono una volta sola, col
// link di attivazione. Se un telefono si perde: si toglie o si cambia la sua
// chiave su Netlify, si rifà il deploy, e quella non apre più niente (le
// altre continuano a funzionare).
//
// Qui dietro c'è tutta l'anagrafica clienti (nomi, telefoni, indirizzi):
// niente scorciatoie sull'accesso.
import { timingSafeEqual, createHash } from 'node:crypto';
import {
  leggiTutto, segnaFatta, annullaFatta, nuovoCliente, modificaCliente, cambiaStatoLead, notaLead, creaFoglioGoogle,
} from './_shared/gestionale.mjs';

// Tentativi sbagliati per IP in un'ora. In memoria dell'istanza (come in
// lead.mjs): non è una contabilità esatta, serve a rendere inutile provare
// chiavi a raffica. La chiave comunque è lunga (100 bit): indovinarla non è
// un'opzione anche senza questo limite.
const MAX_SBAGLIATI = 10;
const FINESTRA_MS = 60 * 60 * 1000;
const sbagliati = new Map();

function bloccato(ip) {
  const v = sbagliati.get(ip);
  return v && Date.now() - v.primo < FINESTRA_MS && v.n >= MAX_SBAGLIATI;
}
function segnaSbagliato(ip) {
  const ora = Date.now();
  for (const [k, v] of sbagliati) if (ora - v.primo > FINESTRA_MS) sbagliati.delete(k);
  const v = sbagliati.get(ip);
  if (!v || ora - v.primo > FINESTRA_MS) sbagliati.set(ip, { primo: ora, n: 1 });
  else v.n += 1;
}

// Di chi è la chiave ricevuta ("babbo", "matteo"), o null se non è valida.
// Confronto a tempo costante sugli hash, così anche lunghezze diverse; le
// chiavi più corte di 16 caratteri non valgono mai.
function chiDellaChiave(data) {
  if (!data) return null;
  const h = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest();
  const ricevuta = h(data);
  let chi = null;
  for (const voce of String(process.env.GESTIONE_CHIAVE || '').split(',')) {
    const [nome, chiave] = voce.includes(':') ? voce.split(':') : ['app', voce];
    if (!chiave || chiave.trim().length < 16) continue;
    if (timingSafeEqual(ricevuta, h(chiave)) && !chi) chi = nome.trim() || 'app';
  }
  return chi;
}

const risposta = (corpo, status = 200) =>
  Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

const AZIONI = {
  fatta: segnaFatta,
  annulla: annullaFatta,
  nuovo: nuovoCliente,
  modifica: modificaCliente,
  stato: cambiaStatoLead,
  nota: notaLead,
};

// creaFoglio è un parametro solo per il server di prova in locale
// (scripts/gestione-locale.mjs), che scrive su una copia in memoria.
export const creaGestore = (creaFoglio) => async (req) => {
  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sconosciuto';

  if (bloccato(ip)) return risposta({ ok: false, errore: 'Troppi tentativi. Riprova tra un\'ora.' }, 429);
  const chi = chiDellaChiave(req.headers.get('x-chiave'));
  if (!chi) {
    segnaSbagliato(ip);
    return risposta({ ok: false, errore: 'Chiave non valida', chiave: false }, 401);
  }

  const sheetId = process.env.GESTIONE_SHEET_ID || process.env.LEADS_SHEET_ID;
  if (!sheetId) return risposta({ ok: false, errore: 'Foglio non configurato. Chiedi a Matteo.' }, 500);
  const foglio = creaFoglio(sheetId);

  try {
    if (req.method === 'GET') return risposta({ ok: true, ...(await leggiTutto(foglio)) });
    if (req.method !== 'POST') return risposta({ ok: false, errore: 'Metodo non ammesso' }, 405);

    let body;
    try { body = await req.json(); } catch { return risposta({ ok: false, errore: 'Richiesta non valida' }, 400); }
    const azione = AZIONI[body?.azione];
    if (!azione) return risposta({ ok: false, errore: 'Azione sconosciuta' }, 400);
    return risposta(await azione(foglio, body.dati ?? {}, { chi }));
  } catch (err) {
    if (err.perUtente) return risposta({ ok: false, errore: err.message }, err.status || 400);
    console.error('Gestione:', err);
    return risposta({ ok: false, errore: 'Il foglio non risponde. Riprova tra poco.', causa: err?.causa }, 502);
  }
};

export default creaGestore(creaFoglioGoogle);

export const config = { path: '/api/gestione' };
