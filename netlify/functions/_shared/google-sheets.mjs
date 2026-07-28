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

// ---------------------------------------------------------------------------
//  Anti-doppioni
//  Capita spesso che la stessa persona compili il modulo due volte (o una volta
//  sul sito e una da Facebook). In quel caso non aggiungiamo una riga nuova:
//  arricchiamo quella già presente, così il gestionale resta pulito.
// ---------------------------------------------------------------------------

// Colonne della scheda Lead-Contatti (0-based), nell'ordine di HEADERS.
const COL = { DATA: 0, NOME: 1, CONTATTO: 2, PROVENIENZA: 3, INTERESSE: 4, STATO: 5, NOTE: 6 };

// Oltre questo periodo una nuova richiesta è un'occasione nuova, non un
// doppione: merita una riga sua.
const GIORNI_DOPPIONE = 30;

// Ultime 9 cifre: "+39 348 412 7825", "348 4127825" e "00393484127825"
// sono lo stesso numero.
const chiaveTelefono = (s) => {
  const cifre = String(s ?? '').replace(/\D/g, '');
  return cifre.length >= 9 ? cifre.slice(-9) : '';
};

const chiaveEmail = (s) => {
  const m = String(s ?? '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : '';
};

// "25/07/2026, 18:54:39" (o senza orario) -> Date; null se non riconosciuta.
const dataDaFoglio = (s) => {
  const m = String(s ?? '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)) : null;
};

// Come appendRow, ma se negli ultimi GIORNI_DOPPIONE c'è già un contatto con
// lo stesso telefono (o la stessa email) aggiorna quella riga invece di
// crearne una nuova. Restituisce { doppione: bool, riga: numero di riga }.
export async function appendOrMergeRow(tab, headers, row, { telefono = '', email = '' } = {}) {
  const sheetId = process.env.LEADS_SHEET_ID;
  if (!sheetId) throw new Error('LEADS_SHEET_ID mancante');
  const token = await getAccessToken();

  let anchor = await findHeaderRow(token, sheetId, tab, headers[0]);
  if (anchor === null) {
    await createTab(token, sheetId, tab, headers);
    anchor = 1;
  }

  const esistente = await cercaDoppione(token, sheetId, tab, anchor, telefono, email);
  if (esistente) {
    await unisciNellaRiga(token, sheetId, tab, esistente, row);
    return { doppione: true, riga: esistente.riga };
  }

  const res = await appendValues(token, sheetId, `'${tab}'!A${anchor}`, [row]);
  if (!res.ok) throw new Error(`Append fallito (${res.status}): ${await res.text()}`);
  return { doppione: false };
}

// Cerca dal basso (il più recente vince) una riga con stesso telefono/email
// entro la finestra dei doppioni.
async function cercaDoppione(token, sheetId, tab, anchor, telefono, email) {
  const tel = chiaveTelefono(telefono);
  const mail = chiaveEmail(email);
  if (!tel && !mail) return null;

  const range = encodeURIComponent(`'${tab}'!A${anchor}:G1000`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) return null; // in dubbio si scrive una riga nuova: meglio un doppione che un lead perso
  const righe = (await res.json()).values ?? [];
  const limite = Date.now() - GIORNI_DOPPIONE * 24 * 60 * 60 * 1000;

  for (let i = righe.length - 1; i >= 1; i--) { // i=0 è la riga di intestazione
    const r = righe[i];
    if (!r?.some((c) => c)) continue;
    const contatto = r[COL.CONTATTO] || '';
    const stessoTel = tel && chiaveTelefono(contatto) === tel;
    const stessaMail = mail && chiaveEmail(contatto) === mail;
    if (!stessoTel && !stessaMail) continue;
    // Data non riconosciuta = non rischiamo di accorpare: lasciamo passare.
    const quando = dataDaFoglio(r[COL.DATA]);
    if (!quando || quando.getTime() < limite) continue;
    return { riga: anchor + i, valori: r };
  }
  return null;
}

// Completa i campi vuoti della riga esistente e annota il nuovo contatto.
// Non tocca MAI Data e Stato: lo stato lo gestisce l'utente a mano.
async function unisciNellaRiga(token, sheetId, tab, esistente, row) {
  const { riga, valori } = esistente;
  const cella = (i) => (valori[i] || '').trim();
  const aggiornamenti = [];
  const metti = (col, valore) =>
    aggiornamenti.push({ range: `'${tab}'!${String.fromCharCode(65 + col)}${riga}`, values: [[valore]] });

  // Contatto: aggiunge solo telefoni/email davvero nuovi. Il confronto è sulle
  // chiavi, così "000 111 2233" e "+39 000 1112233" contano come lo stesso.
  const pezziEsistenti = cella(COL.CONTATTO).split('·').map((p) => p.trim()).filter(Boolean);
  const chiaviNote = new Set(pezziEsistenti.map((p) => chiaveEmail(p) || chiaveTelefono(p)).filter(Boolean));
  const pezziMancanti = [];
  for (const p of String(row[COL.CONTATTO] || '').split('·').map((x) => x.trim())) {
    const k = chiaveEmail(p) || chiaveTelefono(p);
    if (!p || !k || chiaviNote.has(k)) continue;
    chiaviNote.add(k);
    pezziMancanti.push(p);
  }
  if (pezziMancanti.length) metti(COL.CONTATTO, [...pezziEsistenti, ...pezziMancanti].join(' · '));

  // Interesse: solo se prima era vuoto.
  if (!cella(COL.INTERESSE) && row[COL.INTERESSE]) metti(COL.INTERESSE, row[COL.INTERESSE]);

  // Note: traccia del secondo invio (data e provenienza) più le sole
  // informazioni nuove, senza ripetere quelle già scritte.
  const quando = String(row[COL.DATA] || '').split(',')[0].trim();
  const giaScritto = cella(COL.NOTE).toLowerCase();
  const pezziNota = String(row[COL.NOTE] || '')
    .split('—')
    .map((p) => p.trim())
    .filter((p) => p && !giaScritto.includes(p.toLowerCase()));
  const noteNuove = [cella(COL.NOTE), `Ha ricontattato il ${quando} (${row[COL.PROVENIENZA]})`, ...pezziNota]
    .filter(Boolean)
    .join(' — ');
  metti(COL.NOTE, noteNuove.slice(0, 2000));

  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ valueInputOption: 'RAW', data: aggiornamenti }),
    }
  );
  if (!res.ok) throw new Error(`Aggiornamento riga ${riga} fallito (${res.status}): ${await res.text()}`);
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

// I nomi arrivano dai moduli come li digita la gente ("costanza danielli"):
// sul gestionale vanno TUTTI MAIUSCOLI (scelta dell'utente, come in Clienti).
export const nomeProprio = (s) =>
  String(s ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
