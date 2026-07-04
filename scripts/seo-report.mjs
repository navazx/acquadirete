// ============================================================================
//  Report SEO da Google Search Console -> Telegram.
//  Pensato per girare su GitHub Actions (mensile), ma eseguibile anche in locale.
//
//  Legge clic, impressioni, CTR, posizione media, query e pagine top degli
//  ultimi 28 giorni e li confronta con i 28 precedenti.
//
//  Zero dipendenze npm: solo moduli nativi di Node (crypto, fetch).
//  Autenticazione headless via service account.
//
//  Segreti letti dalle variabili d'ambiente (GitHub Secrets):
//    GSC_KEY_JSON       -> contenuto del file JSON del service account
//    TELEGRAM_BOT_TOKEN -> token del bot Telegram
//    TELEGRAM_CHAT_ID   -> chat id di destinazione
//  Facoltative:
//    GSC_SITE_URL       -> default https://www.acquadirete.it/
//    GSC_KEY_FILE       -> percorso a un file chiave locale (solo per test in locale)
// ============================================================================

import { readFileSync } from 'node:fs';
import { createSign } from 'node:crypto';

const SITE_URL = process.env.GSC_SITE_URL || 'https://www.acquadirete.it/';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_READY = Boolean(TG_TOKEN && CHAT_ID);

function loadKey() {
  if (process.env.GSC_KEY_JSON) return JSON.parse(process.env.GSC_KEY_JSON);
  if (process.env.GSC_KEY_FILE) return JSON.parse(readFileSync(process.env.GSC_KEY_FILE, 'utf8'));
  throw new Error('Chiave mancante: imposta il secret GSC_KEY_JSON (o GSC_KEY_FILE per il test locale).');
}
const key = loadKey();

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getAccessToken() {
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
  const jwt = `${unsigned}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`Autenticazione fallita (${res.status}): ${await res.text()}`);
  return (await res.json()).access_token;
}

const ymd = (d) => d.toISOString().slice(0, 10);

async function query(token, body) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Query Search Console fallita (${res.status}): ${await res.text()}`);
  return res.json();
}

async function sendTelegram(text) {
  const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Invio Telegram fallito (${res.status}): ${await res.text()}`);
}

function pct(cur, prev) {
  if (!prev) return cur ? '+++%' : '0%';
  const d = ((cur - prev) / prev) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`;
}

// Ultimi 28 giorni terminanti 3 giorni fa (dati GSC ormai definitivi),
// confrontati con i 28 giorni precedenti.
const end = new Date(); end.setDate(end.getDate() - 3);
const start = new Date(end); start.setDate(start.getDate() - 27);
const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
const prevStart = new Date(prevEnd); prevStart.setDate(prevStart.getDate() - 27);

async function main() {
  const token = await getAccessToken();

  const [cur, prev, topQ, topP] = await Promise.all([
    query(token, { startDate: ymd(start), endDate: ymd(end) }),
    query(token, { startDate: ymd(prevStart), endDate: ymd(prevEnd) }),
    query(token, { startDate: ymd(start), endDate: ymd(end), dimensions: ['query'], rowLimit: 30 }),
    query(token, { startDate: ymd(start), endDate: ymd(end), dimensions: ['page'], rowLimit: 6 }),
  ]);

  const c = cur.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const p = prev.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const qRows = topQ.rows || [];
  const byClicks = qRows.filter((r) => r.clicks > 0).slice(0, 6);
  const byImpr = [...qRows].sort((a, b) => b.impressions - a.impressions).slice(0, 6);

  let msg = '';
  msg += '📊 REPORT SEO — Google Search Console\n';
  msg += '🌐 acquadirete.it · ultimi 28 giorni\n';
  msg += `📅 ${ymd(start)} → ${ymd(end)}\n`;
  msg += '━━━━━━━━━━━━━━\n';
  msg += `👆 Clic: ${c.clicks}  (${pct(c.clicks, p.clicks)} vs 28gg prec.)\n`;
  msg += `👁️ Impressioni: ${c.impressions}  (${pct(c.impressions, p.impressions)})\n`;
  msg += `🎯 CTR medio: ${(c.ctr * 100).toFixed(1)}%\n`;
  msg += `📍 Posizione media: ${c.position.toFixed(1)}\n`;
  msg += '━━━━━━━━━━━━━━\n';
  msg += '🔎 Query che portano clic:\n';
  byClicks.forEach((r) => {
    msg += `• ${r.keys[0]} — ${r.clicks} clic, pos ${r.position.toFixed(0)}\n`;
  });
  if (!byClicks.length) msg += '• (nessuna query con clic nel periodo)\n';
  msg += '━━━━━━━━━━━━━━\n';
  msg += '👀 Più visibilità (impressioni):\n';
  byImpr.forEach((r) => {
    msg += `• ${r.keys[0]} — ${r.impressions} viste, pos ${r.position.toFixed(0)}\n`;
  });
  if (!byImpr.length) msg += '• (nessun dato)\n';
  msg += '━━━━━━━━━━━━━━\n';
  msg += '📄 Pagine top (per clic):\n';
  (topP.rows || []).forEach((r) => {
    const u = r.keys[0].replace('https://www.acquadirete.it', '') || '/';
    msg += `• ${u} — ${r.clicks} clic\n`;
  });
  if (!(topP.rows || []).length) msg += '• (nessun dato)\n';

  if (TG_READY) {
    await sendTelegram(msg);
    console.log('✅ Report inviato su Telegram.\n');
  } else {
    console.log('ℹ️  Telegram non configurato (manca token/chat id): mostro solo a schermo.\n');
  }
  console.log(msg);
}

main().catch((err) => {
  console.error('❌ ERRORE:', err.message);
  process.exit(1);
});
