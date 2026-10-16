// ============================================================================
//  I CLIENTI VERI, RIMANDATI A GOOGLE ADS (conversioni offline, dal 16 ott 2026)
//
//  Fino a ottobre 2026 Google Ads vedeva solo moduli e clic su Chiama/WhatsApp,
//  e solo di chi accetta i cookie: in tre mesi e mezzo otto in tutto. Non sapeva
//  quali clic diventano clienti, quindi non poteva imparare a cercarne altri.
//
//  Dal 16 ott 2026 il modulo del sito salva nella colonna "Clic annuncio Google"
//  di Lead-Contatti il codice del clic (gclid, o gbraid/wbraid dagli iPhone) e la
//  scelta sui cookie. Quando quel contatto diventa "Cliente", qui lo si rimanda a
//  Google Ads come conversione dell'azione AZIONE ("Cliente (dal Gestionale)"),
//  col valore di un cliente (il margine minimo, dal secret VALORE_CLIENTE).
//
//  Cosa parte verso Google: SOLO il codice del clic, il giorno in cui è
//  diventato cliente e il valore. Niente nomi, telefoni o email. E solo per chi
//  sul sito ha accettato i cookie ("cookie accettati"): agli altri Google non
//  riceve niente, come dice la privacy policy.
//
//  L'azione nasce "secondaria": si vede nei rapporti di Google Ads ma non guida
//  le offerte. Farla contare per le offerte (e cambiare la strategia) è una
//  decisione di Matteo (agenti/AUTONOMIA.md).
//
//  Da qui si possono fare due cose sole, con la forma scritta qui dentro e
//  nient'altro: creare quell'azione di conversione, e caricare conversioni su di
//  lei. Le usa scripts/conversioni-ads.mjs.
// ============================================================================

import { getAccessToken } from './gsc.mjs';
import { CLIENTE } from './ads.mjs';

const VERSIONE = process.env.GOOGLE_ADS_API_VERSION || 'v22';
export const AZIONE = 'Cliente (dal Gestionale)';
export const GIORNI_VALIDO = 90; // oltre, Google non accetta più il clic

let token;

async function post(percorso, corpo) {
  token ??= await getAccessToken('https://www.googleapis.com/auth/adwords');
  const res = await fetch(`https://googleads.googleapis.com/${VERSIONE}/customers/${CLIENTE}${percorso}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'login-customer-id': CLIENTE },
    body: JSON.stringify(corpo),
  });
  const dati = await res.json();
  if (!res.ok) {
    const primo = (dati.error?.details || []).flatMap((d) => d.errors || [])[0];
    const codice = primo?.errorCode ? Object.entries(primo.errorCode).map(([k, v]) => `${k}.${v}`)[0] : dati.error?.status || `HTTP ${res.status}`;
    throw new Error(`Google Ads ha rifiutato (${codice}): ${primo?.message || dati.error?.message || res.status}`);
  }
  return dati;
}

/** L'indirizzo dell'azione "Cliente (dal Gestionale)", o null se non c'è ancora. */
export async function trovaAzione() {
  const dati = await post('/googleAds:search', {
    query: `SELECT conversion_action.resource_name, conversion_action.status FROM conversion_action
            WHERE conversion_action.name = '${AZIONE}' AND conversion_action.status != 'REMOVED'`,
  });
  return dati.results?.[0]?.conversionAction?.resourceName ?? null;
}

/**
 * Crea l'azione di conversione, secondaria, "una per clic", valida 90 giorni.
 * Con { prova: true } Google la controlla e basta.
 */
export async function creaAzione(valore, { prova = false } = {}) {
  const dati = await post('/conversionActions:mutate', {
    operations: [{
      create: {
        name: AZIONE,
        type: 'UPLOAD_CLICKS',
        category: 'CONVERTED_LEAD',
        status: 'ENABLED',
        primaryForGoal: false,
        countingType: 'ONE_PER_CLICK',
        clickThroughLookbackWindowDays: GIORNI_VALIDO,
        valueSettings: { defaultValue: valore, defaultCurrencyCode: 'EUR', alwaysUseDefaultValue: false },
      },
    }],
    validateOnly: prova,
  });
  return dati.results?.[0]?.resourceName ?? null;
}

/** "gclid=… · cookie accettati" → { campo: 'gclid', codice, consenso: true } */
export function leggiClic(testo) {
  const m = String(testo || '').match(/\b(gclid|gbraid|wbraid)=([\w-]{10,200})/);
  if (!m) return null;
  return { campo: m[1], codice: m[2], consenso: /cookie accettati/i.test(testo) };
}

/** Una Date → "aaaa-mm-gg hh:mm:ss+00:00", il formato che vuole Google. */
export const quandoPerGoogle = (d) => `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 19)}+00:00`;

/**
 * Carica le conversioni. Ognuna: { campo, codice, quando (Date), valore }.
 * Torna, nello stesso ordine, 'caricata' | 'c\'era già' | il codice dell'errore.
 */
export async function carica(azione, conversioni, { prova = false } = {}) {
  if (!conversioni.length) return [];
  const dati = await post(':uploadClickConversions', {
    conversions: conversioni.map((c) => ({
      [c.campo]: c.codice,
      conversionAction: azione,
      conversionDateTime: quandoPerGoogle(c.quando),
      conversionValue: c.valore,
      currencyCode: 'EUR',
      consent: { adUserData: 'GRANTED' },
    })),
    partialFailure: true,
    validateOnly: prova,
  });
  const esiti = conversioni.map(() => 'caricata');
  const errori = (dati.partialFailureError?.details || []).flatMap((d) => d.errors || []);
  for (const e of errori) {
    const i = e.location?.fieldPathElements?.find((f) => f.fieldName === 'conversions')?.index;
    const codice = e.errorCode ? Object.values(e.errorCode)[0] : 'ERRORE';
    if (i === undefined || i === null) continue;
    esiti[Number(i)] = /ALREADY_EXISTS|DUPLICATE/.test(codice) ? 'c\'era già' : codice;
  }
  if (errori.length && esiti.every((x) => x === 'caricata')) {
    // un errore senza indicazione di quale: meglio dirlo che fingere che sia andata
    return conversioni.map(() => String(Object.values(errori[0].errorCode || {})[0] || 'ERRORE'));
  }
  return esiti;
}
