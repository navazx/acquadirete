// ============================================================================
//  Google Ads API in sola lettura, per gli agenti.
//
//  Niente developer token e niente account amministratore: dal 2026 l'accesso
//  e' legato al progetto Google Cloud delle credenziali (acquadirete-seo, livello
//  Explorer: 2.880 operazioni al giorno sugli account veri). Si entra con un
//  service account aggiunto a Google Ads come utente "Solo lettura":
//  seo-report-bot (chiave nel secret GSC_KEY_JSON) e cruscotto-readonly (chiave
//  sul PC, per le prove). Con "Solo lettura" nemmeno per sbaglio si possono
//  toccare budget, offerte o annunci: lo impedisce Google, non questo codice.
// ============================================================================

import { getAccessToken } from './gsc.mjs';

export const CLIENTE = process.env.GOOGLE_ADS_CUSTOMER_ID || '1999168790';
const VERSIONE = process.env.GOOGLE_ADS_API_VERSION || 'v22';

let token;

/** Una query GAQL; restituisce tutte le righe, pagina dopo pagina. */
export async function query(gaql) {
  token ??= await getAccessToken('https://www.googleapis.com/auth/adwords');
  const righe = [];
  let pageToken;
  do {
    const res = await fetch(`https://googleads.googleapis.com/${VERSIONE}/customers/${CLIENTE}/googleAds:search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'login-customer-id': CLIENTE,
      },
      body: JSON.stringify({ query: gaql, ...(pageToken ? { pageToken } : {}) }),
    });
    const dati = await res.json();
    if (!res.ok) {
      const dettaglio = dati.error?.details?.[0]?.errors?.[0]?.message || dati.error?.message || JSON.stringify(dati);
      throw new Error(`Google Ads ha rifiutato la richiesta (HTTP ${res.status}): ${dettaglio}`);
    }
    righe.push(...(dati.results ?? []));
    pageToken = dati.nextPageToken;
  } while (pageToken);
  return righe;
}

export const euro = (micros) => Math.round(Number(micros || 0) / 10_000) / 100;
