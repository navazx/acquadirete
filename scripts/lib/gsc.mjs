// ============================================================================
//  Funzioni condivise per gli script che leggono Google Search Console
//  e mandano avvisi su Telegram (seo-report.mjs, keyword-alert.mjs).
//
//  Zero dipendenze npm: solo moduli nativi di Node (crypto, fetch).
//
//  Segreti letti dalle variabili d'ambiente (GitHub Secrets):
//    GSC_KEY_JSON       -> contenuto del file JSON del service account
//    TELEGRAM_BOT_TOKEN -> token del bot Telegram
//    TELEGRAM_CHAT_ID   -> chat id di destinazione
//  Facoltative:
//    GSC_SITE_URL       -> default https://www.acquadirete.it/
//    GSC_KEY_FILE       -> percorso a un file chiave locale (solo test in locale)
// ============================================================================

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

export const SITE_URL = process.env.GSC_SITE_URL || 'https://www.acquadirete.it/';

const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

/** true quando ci sono sia token che chat id: senza, gli script stampano a schermo. */
export const TELEGRAM_READY = Boolean(TG_TOKEN && CHAT_ID);

function loadKey() {
  if (process.env.GSC_KEY_JSON) return JSON.parse(process.env.GSC_KEY_JSON);
  if (process.env.GSC_KEY_FILE) return JSON.parse(readFileSync(process.env.GSC_KEY_FILE, 'utf8'));
  throw new Error('Chiave mancante: imposta il secret GSC_KEY_JSON (o GSC_KEY_FILE per il test locale).');
}

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

/** Access token OAuth2 tramite service account (JWT firmato RS256, niente login interattivo). */
export async function getAccessToken() {
  const key = loadKey();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const unsigned = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claim))}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign(key.private_key).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`,
    }),
  });
  if (!res.ok) throw new Error(`Autenticazione fallita (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

/** Interroga searchAnalytics per il sito configurato. */
export async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Query Search Console fallita (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Invio Telegram fallito (${res.status}): ${await res.text()}`);
}

/** Data in formato YYYY-MM-DD (richiesto dall'API). */
export const ymd = (d) => d.toISOString().slice(0, 10);

/** Variazione percentuale leggibile fra due valori. */
export function pct(cur, prev) {
  if (!prev) return cur ? '+++%' : '0%';
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`;
}

/**
 * Finestra di 28 giorni che termina 3 giorni fa (i dati GSC piu' recenti sono
 * ancora parziali), piu' i 28 giorni precedenti per il confronto.
 */
export function windows() {
  const end = new Date(); end.setDate(end.getDate() - 3);
  const start = new Date(end); start.setDate(start.getDate() - 27);
  const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 27);
  return { start, end, prevStart, prevEnd };
}
