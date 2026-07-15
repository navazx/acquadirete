// Helper condiviso: accoda righe a un Google Sheet tramite il service account
// (la stessa chiave del report SEO: seo-report-bot@acquadirete-seo, letta dalla
// variabile d'ambiente GSC_KEY_JSON impostata su Netlify).
// Zero dipendenze npm: firma JWT RS256 a mano, come in scripts/seo-report.mjs.
//
// Il foglio di destinazione è indicato da LEADS_SHEET_ID (l'ID nella URL del
// foglio) e deve essere condiviso col service account come Editor.
import { createSign } from 'node:crypto';

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

// Cache del token tra invocazioni "calde" della stessa istanza della funzione.
let tokenCache = { token: null, exp: 0 };

export async function getAccessToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp) return tokenCache.token;
  const key = JSON.parse(process.env.GSC_KEY_JSON || '{}');
  if (!key.client_email) throw new Error('GSC_KEY_JSON mancante o non valida');

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
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
  if (!res.ok) throw new Error(`Autenticazione Google fallita (${res.status}): ${await res.text()}`);
  const { access_token } = await res.json();
  tokenCache = { token: access_token, exp: Date.now() + 50 * 60 * 1000 };
  return access_token;
}

// Accoda `row` alla scheda `tab` del foglio, sotto la tabella che inizia alla
// riga di intestazione. Se la scheda non esiste ancora, la crea con la riga di
// intestazione `headers`.
export async function appendRow(tab, headers, row) {
  const sheetId = process.env.LEADS_SHEET_ID;
  if (!sheetId) throw new Error('LEADS_SHEET_ID mancante');
  const token = await getAccessToken();

  // La scheda può avere righe di titolo/descrizione sopra la tabella (è il
  // caso di "Lead-Contatti" nel gestionale): l'append va ancorato alla riga
  // di intestazione, altrimenti l'API considera "tabella" le righe di titolo
  // e inserisce il lead SOPRA le intestazioni, al primo buco vuoto.
  let anchor = await findHeaderRow(token, sheetId, tab, headers[0]);
  if (anchor === null) {
    await createTab(token, sheetId, tab, headers);
    anchor = 1;
  }
  const res = await appendValues(token, sheetId, `'${tab}'!A${anchor}`, [row]);
  if (!res.ok) throw new Error(`Append fallito (${res.status}): ${await res.text()}`);
}

// Numero (1-based) della riga di intestazione, cercando la prima cella della
// colonna A uguale a `headerCell`. Restituisce null se la scheda non esiste;
// 1 se l'intestazione non si trova (scheda già usata in modo diverso).
async function findHeaderRow(token, sheetId, tab, headerCell) {
  const range = encodeURIComponent(`'${tab}'!A1:A100`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 400 && /unable to parse range/i.test(text)) return null; // scheda inesistente
    throw new Error(`Lettura scheda "${tab}" fallita (${res.status}): ${text}`);
  }
  const col = (await res.json()).values ?? [];
  const idx = col.findIndex((r) => (r[0] || '').trim().toLowerCase() === headerCell.toLowerCase());
  return idx >= 0 ? idx + 1 : 1;
}

function appendValues(token, sheetId, range, values) {
  // valueInputOption=RAW: tutto salvato letteralmente (niente "333..." che
  // diventa numero perdendo spazi o zeri iniziali).
  // Il nome scheda nel range va tra apici: contiene trattini ("Lead-Contatti").
  return fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values }),
    }
  );
}

async function createTab(token, sheetId, tab, headers) {
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
  });
  if (!res.ok) {
    const text = await res.text();
    // Se due lead arrivano insieme la scheda può già esistere: non è un errore.
    if (!/already exists/i.test(text)) {
      throw new Error(`Creazione scheda "${tab}" fallita (${res.status}): ${text}`);
    }
    return;
  }
  const header = await appendValues(token, sheetId, `'${tab}'!A1`, [headers]);
  if (!header.ok) throw new Error(`Scrittura intestazione fallita (${header.status}): ${await header.text()}`);
}

export const nowInItaly = () =>
  new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
