// ============================================================================
//  Funzioni condivise per gli agenti che leggono e scrivono il Gestionale_Clienti
//  su Google Sheets (agente-lead.mjs, cruscotto.mjs).
//
//  Zero dipendenze npm. L'autenticazione riusa il service account degli script
//  SEO (scripts/lib/gsc.mjs): la stessa chiave GSC_KEY_JSON ha Editor sul foglio.
//
//  Segreti dalle variabili d'ambiente:
//    GSC_KEY_JSON   -> chiave del service account (o GSC_KEY_FILE in locale)
//    LEADS_SHEET_ID -> id del foglio, default sotto
// ============================================================================

import { getAccessToken } from './gsc.mjs';

const SCOPE_RW = 'https://www.googleapis.com/auth/spreadsheets';
const API = 'https://sheets.googleapis.com/v4/spreadsheets';

export const SHEET_ID =
  process.env.LEADS_SHEET_ID || '1jmR0DXP_25ZTniBgemRj0hEmXxcrCdxj89y4DxciHBk';

/** Access token con lo scope Sheets in scrittura. */
export const sheetsToken = () => getAccessToken(SCOPE_RW);

async function call(token, path, init = {}) {
  const res = await fetch(`${API}/${SHEET_ID}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Sheets ${res.status} su ${path}: ${await res.text()}`);
  return res.json();
}

/** Titoli delle schede presenti nel foglio. */
export async function listaSchede(token) {
  const meta = await call(token, '?fields=sheets.properties.title');
  return meta.sheets.map((s) => s.properties.title);
}

/** Valori di un intervallo, come matrice di righe (righe corte NON riempite). */
export async function leggi(token, range) {
  const data = await call(token, `/values/${encodeURIComponent(range)}`);
  return data.values || [];
}

/**
 * Aggiunge righe in fondo a una scheda.
 * RAW di default: cosi' niente stringa viene reinterpretata come data o numero
 * dal foglio. Vedi la lezione sul fuso orario del Gestionale.
 */
export async function aggiungi(token, range, righe, inputOption = 'RAW') {
  return call(
    token,
    `/values/${encodeURIComponent(range)}:append?valueInputOption=${inputOption}&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values: righe }) },
  );
}

/** Crea la scheda con la riga di intestazione se non c'e'. Torna true se l'ha creata. */
export async function creaSchedaSeManca(token, titolo, intestazioni) {
  if ((await listaSchede(token)).includes(titolo)) return false;
  await call(token, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({
      requests: [
        { addSheet: { properties: { title: titolo, gridProperties: { frozenRowCount: 1 } } } },
      ],
    }),
  });
  await aggiungi(token, `${titolo}!A1`, [intestazioni]);
  return true;
}

/**
 * Data italiana del Gestionale -> oggetto Date.
 * In Lead-Contatti convivono due formati: "10/09/2026, 14:56:13" (scritto dalle
 * funzioni Netlify) e "05/09/2026" (scritto a mano). Torna null se non e' una data.
 */
export function dataItaliana(testo) {
  const m = String(testo || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, g, mese, anno, ore = 0, min = 0, sec = 0] = m;
  const d = new Date(+anno, +mese - 1, +g, +ore, +min, +sec);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Giorni interi trascorsi da una data a ora. */
export const giorniDa = (d) => Math.floor((Date.now() - d.getTime()) / 86400000);

/** Ore intere trascorse da una data a ora. */
export const oreDa = (d) => Math.floor((Date.now() - d.getTime()) / 3600000);

/**
 * Legge Lead-Contatti e torna i lead come oggetti.
 * Le intestazioni stanno a riga 4 (righe 1-3 = titolo, descrizione, vuota),
 * quindi i dati partono dalla 5: `riga` e' il numero di riga vero nel foglio.
 */
export async function leggiLead(token) {
  const righe = await leggi(token, 'Lead-Contatti!A4:H1000');
  return righe
    .slice(1)
    .map((r, i) => ({
      riga: i + 5,
      data: dataItaliana(r[0]),
      dataTesto: r[0] || '',
      nome: (r[1] || '').trim(),
      contatto: (r[2] || '').trim(),
      provenienza: (r[3] || '').trim(),
      interesse: (r[4] || '').trim(),
      stato: (r[5] || '').trim(),
      note: (r[6] || '').trim(),
    }))
    .filter((l) => l.nome || l.contatto);
}
