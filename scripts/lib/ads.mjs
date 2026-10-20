// ============================================================================
//  Google Ads API, per gli agenti.
//
//  Niente developer token e niente account amministratore: dal 2026 l'accesso
//  e' legato al progetto Google Cloud delle credenziali (acquadirete-seo, livello
//  Explorer: 2.880 operazioni al giorno sugli account veri). Si entra con un
//  service account aggiunto a Google Ads come utente: seo-report-bot (chiave nel
//  secret GSC_KEY_JSON, quello degli agenti su GitHub) e cruscotto-readonly
//  (chiave sul PC, per le prove: resta "Solo lettura").
//
//  LEGGERE: query() e struttura().
//
//  SCRIVERE: solo muta(), e solo le operazioni costruite da lib/ads-azioni.mjs
//  (escludere una ricerca, mettere in pausa una parola chiave o un annuncio, e
//  il loro contrario). Qui dentro non c'e' nessuna strada per toccare budget,
//  offerte o campagne: muta() rifiuta tutto quello che non e' in PERMESSE. Le
//  modifiche partono solo dopo l'APPROVA ADS di Matteo su Telegram
//  (scripts/risposte.mjs). Finche' il service account ha ruolo "Solo lettura"
//  Google rifiuta comunque ogni scrittura.
//
//  L'unica altra scrittura sta in lib/ads-conversioni.mjs (dal 16 ott 2026):
//  rimandare a Google i contatti diventati clienti. Non tocca soldi ne' annunci.
// ============================================================================

import { getAccessToken } from './gsc.mjs';

export const CLIENTE = process.env.GOOGLE_ADS_CUSTOMER_ID || '1999168790';
// Google spegne ogni versione dell'API circa un anno dopo l'uscita: la v22 dal
// 18 ott 2026 rispondeva "Version v22 is deprecated" e la revisione Ads e'
// saltata. La v26 (uscita il 14 ott 2026) vale fino a novembre 2027; elenco in
// developers.google.com/google-ads/api/docs/sunset-dates. Unico punto da
// cambiare: la usa anche lib/ads-conversioni.mjs.
export const VERSIONE = process.env.GOOGLE_ADS_API_VERSION || 'v26';

let token;

async function chiama(metodo, corpo) {
  token ??= await getAccessToken('https://www.googleapis.com/auth/adwords');
  const res = await fetch(`https://googleads.googleapis.com/${VERSIONE}/customers/${CLIENTE}/${metodo}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'login-customer-id': CLIENTE,
    },
    body: JSON.stringify(corpo),
  });
  return { res, dati: await res.json() };
}

/** Una query GAQL; restituisce tutte le righe, pagina dopo pagina. */
export async function query(gaql) {
  const righe = [];
  let pageToken;
  do {
    const { res, dati } = await chiama('googleAds:search', { query: gaql, ...(pageToken ? { pageToken } : {}) });
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

/**
 * Com'e' fatto l'account adesso, senza numeri: campagne, gruppi, parole chiave,
 * esclusioni e annunci, ognuno col suo indirizzo (resource name). Serve a
 * controllare una modifica prima di proporla e di nuovo prima di applicarla.
 * "attiva" vuol dire accesa davvero: lei, il suo gruppo e la sua campagna.
 */
export async function struttura() {
  const accesa = (...stati) => stati.every((s) => s === 'ENABLED');
  const campagne = (await query(
    `SELECT campaign.resource_name, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'`,
  )).map((x) => ({ id: x.campaign.resourceName, nome: x.campaign.name, stato: x.campaign.status }));
  const gruppi = (await query(
    `SELECT ad_group.resource_name, ad_group.name, ad_group.status, campaign.resource_name, campaign.status
     FROM ad_group WHERE ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
  )).map((x) => ({ id: x.adGroup.resourceName, nome: x.adGroup.name, stato: x.adGroup.status, campagna: x.campaign.resourceName }));
  const criteri = await query(
    `SELECT ad_group_criterion.resource_name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
            ad_group_criterion.status, ad_group_criterion.negative, ad_group.resource_name, ad_group.status,
            campaign.resource_name, campaign.status
     FROM ad_group_criterion
     WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status != 'REMOVED'
       AND ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
  );
  const parole = criteri.filter((x) => !x.adGroupCriterion.negative).map((x) => ({
    id: x.adGroupCriterion.resourceName, testo: x.adGroupCriterion.keyword.text, corrispondenza: x.adGroupCriterion.keyword.matchType,
    stato: x.adGroupCriterion.status, gruppo: x.adGroup.resourceName, campagna: x.campaign.resourceName,
    attiva: accesa(x.adGroupCriterion.status, x.adGroup.status, x.campaign.status),
  }));
  const escluse = criteri.filter((x) => x.adGroupCriterion.negative).map((x) => ({
    id: x.adGroupCriterion.resourceName, testo: x.adGroupCriterion.keyword.text, corrispondenza: x.adGroupCriterion.keyword.matchType,
    dove: x.adGroup.resourceName,
  }));
  for (const x of await query(
    `SELECT campaign_criterion.resource_name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type, campaign.resource_name
     FROM campaign_criterion
     WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD' AND campaign.status != 'REMOVED'`,
  )) {
    escluse.push({
      id: x.campaignCriterion.resourceName, testo: x.campaignCriterion.keyword.text,
      corrispondenza: x.campaignCriterion.keyword.matchType, dove: x.campaign.resourceName,
    });
  }
  const annunci = (await query(
    `SELECT ad_group_ad.resource_name, ad_group_ad.status, ad_group.resource_name, ad_group.status, campaign.status
     FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED' AND ad_group.status != 'REMOVED' AND campaign.status != 'REMOVED'`,
  )).map((x) => ({
    id: x.adGroupAd.resourceName, stato: x.adGroupAd.status, gruppo: x.adGroup.resourceName,
    attivo: accesa(x.adGroupAd.status, x.adGroup.status, x.campaign.status),
  }));
  return { campagne, gruppi, parole, escluse, annunci };
}

// ---------------------------------------------------------------------------
//  Scrivere. Le uniche forme di operazione che possono partire da qui.
// ---------------------------------------------------------------------------

const soloChiavi = (o, chiavi) => o && typeof o === 'object' && Object.keys(o).every((k) => chiavi.includes(k));
const parolaEsclusa = (c, dove) =>
  soloChiavi(c, [dove, 'negative', 'keyword']) && typeof c[dove] === 'string' && c.negative === true &&
  soloChiavi(c.keyword, ['text', 'matchType']) && ['PHRASE', 'EXACT'].includes(c.keyword.matchType);
const cambioDiStato = (o) =>
  soloChiavi(o, ['update', 'updateMask']) && o.updateMask === 'status' &&
  soloChiavi(o.update, ['resourceName', 'status']) && ['PAUSED', 'ENABLED'].includes(o.update.status);
const toglie = (o) => soloChiavi(o, ['remove']) && typeof o.remove === 'string';

const PERMESSE = {
  // escludere una ricerca per tutta la campagna, o toglierne una messa dall'agente
  campaignCriterionOperation: (o) => (soloChiavi(o, ['create']) && parolaEsclusa(o.create, 'campaign')) || toglie(o),
  // escludere una ricerca in un gruppo, toglierla, o accendere/spegnere una parola chiave
  adGroupCriterionOperation: (o) => (soloChiavi(o, ['create']) && parolaEsclusa(o.create, 'adGroup')) || toglie(o) || cambioDiStato(o),
  // accendere/spegnere un annuncio
  adGroupAdOperation: (o) => cambioDiStato(o),
};

export function permessa(op) {
  const tipi = Object.keys(op || {});
  return tipi.length === 1 && Boolean(PERMESSE[tipi[0]]) && PERMESSE[tipi[0]](op[tipi[0]]);
}

/** Un errore di Google Ads, con il perche' e a quale operazione si riferisce. */
export class ErroreAds extends Error {
  constructor(messaggio, { senzaPermesso = false, indice = null, codice = null } = {}) {
    super(messaggio);
    this.senzaPermesso = senzaPermesso;   // l'utente del service account e' "Solo lettura"
    this.indice = indice;                 // quale operazione dell'elenco (da 0), se Google lo dice
    this.codice = codice;
  }
}

/**
 * Applica le operazioni, tutte o nessuna. Con { prova: true } Google le controlla
 * e basta (validateOnly): non cambia niente. Restituisce gli indirizzi di quello
 * che ha creato o toccato, nell'ordine delle operazioni.
 */
export async function muta(operazioni, { prova = false } = {}) {
  if (!operazioni.length) return [];
  const fuori = operazioni.findIndex((op) => !permessa(op));
  if (fuori >= 0) throw new ErroreAds(`Operazione ${fuori + 1} non permessa: da qui si escludono ricerche e si mettono in pausa parole e annunci, nient'altro.`, { indice: fuori });

  const { res, dati } = await chiama('googleAds:mutate', { mutateOperations: operazioni, validateOnly: prova });
  if (!res.ok) {
    const primo = (dati.error?.details || []).flatMap((d) => d.errors || [])[0];
    const codice = primo?.errorCode ? Object.entries(primo.errorCode).map(([k, v]) => `${k}.${v}`)[0] : dati.error?.status || `HTTP ${res.status}`;
    const indice = primo?.location?.fieldPathElements?.find((f) => f.fieldName === 'mutate_operations')?.index;
    const senzaPermesso = res.status === 403 || /authorizationError|PERMISSION_DENIED/.test(String(codice));
    throw new ErroreAds(primo?.message || dati.error?.message || `HTTP ${res.status}`, {
      senzaPermesso, codice, indice: indice === undefined ? null : Number(indice),
    });
  }
  return (dati.mutateOperationResponses || []).map((r) => Object.values(r)[0]?.resourceName || null);
}
