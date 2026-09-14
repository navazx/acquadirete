#!/usr/bin/env node
// ============================================================================
//  CRUSCOTTO  —  gira ogni lunedi' mattina su GitHub Actions
//
//  Scrive una riga a settimana nella scheda "Cruscotto" del Gestionale: e' la
//  memoria condivisa del sistema di agenti. Senza uno storico dei numeri
//  nessun agente puo' dire "il mese scorso era meglio", e quindi nessuno puo'
//  correggere la rotta: e' il livello 0 su cui poggia tutto il resto.
//
//  Dal 14 set 2026 la scheda e' anche la pagina da guardare: in alto numeri
//  chiave e grafici, sotto la tabella (intestazione "Settimana" in colonna A,
//  intorno alla riga 41). I grafici leggono la tabella, quindi la riga nuova va
//  SCRITTA nella prima riga libera sotto l'intestazione, non accodata con
//  append (che inserirebbe righe e sposterebbe tutto). L'intestazione si cerca
//  per nome: se la pagina cambia altezza, lo script la ritrova.
//  Se la scheda non esiste la crea semplice, con le intestazioni in riga 1.
//
//  Tutti i valori si scrivono RAW, comprese le date, che restano testo.
//  Volutamente: il Gestionale ha gia' fatto sbagliare un giorno a 58 celle per
//  via del fuso orario, e qui una data e' solo un'etichetta da leggere.
//
//  Prova in locale (calcola e stampa, senza scrivere):
//    GSC_KEY_FILE="../seo-report/gsc-key-readonly.json" node scripts/cruscotto.mjs --prova
// ============================================================================

import { readFileSync } from 'node:fs';
import { getAccessToken, query, SITE_URL, ymd } from './lib/gsc.mjs';
import { query as queryAds, euro } from './lib/ads.mjs';
import { sheetsToken, leggi, scrivi, creaSchedaSeManca, dataItaliana } from './lib/gestionale.mjs';

const SCHEDA = 'Cruscotto';
// Colonne A-R, in quest'ordine: le formule della scheda (colonne S-W) le
// leggono per posizione. Se ne aggiungi una, va in fondo e va rifatta la scheda.
const INTESTAZIONI = [
  'Settimana', 'Dal', 'Al',
  'Lead sito', 'Lead Meta', 'Lead altro',
  'Lead totali', 'Clienti totali',
  'Clic 28gg', 'Impressioni 28gg', 'Pos. media 28gg', 'GSC al',
  'Articoli blog',
  'Spesa Google (sett.)', 'Spesa Meta (sett.)',
  'Clienti da Meta (tot.)', "Clienti dal sito dall'8/7 (tot.)",
  'Note',
];

// La campagna Google Ads e' partita l'8 luglio 2026: i clienti "Sito web"
// arrivati prima non li ha portati la pubblicita', e non entrano nel costo.
// Anche dopo, "Sito web" comprende chi arriva dalla ricerca gratuita: il costo
// per cliente Google che ne esce e' un MINIMO, non il valore esatto.
const INIZIO_GOOGLE_ADS = new Date(2026, 6, 8);

const ymdLocale = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Spesa Google Ads della settimana, in euro. Stringa vuota se la lettura fallisce. */
async function spesaGoogle(lunedi, domenica) {
  try {
    const righe = await queryAds(
      `SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${ymdLocale(lunedi)}' AND '${ymdLocale(domenica)}'`,
    );
    return euro(righe.reduce((s, r) => s + Number(r.metrics?.costMicros || 0), 0));
  } catch (e) {
    console.log(`Spesa Google non letta: ${e.message}`);
    return '';
  }
}

/**
 * Spesa Meta Ads della settimana, in euro. Token META_ADS_TOKEN, lo stesso
 * dell'agente Ads (sola lettura). Due chiamate a settimana: poche di proposito,
 * l'antifrode di Meta a luglio 2026 aveva bloccato l'account dopo una raffica.
 */
async function spesaMeta(lunedi, domenica) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) {
    console.log('Spesa Meta non letta: manca META_ADS_TOKEN.');
    return '';
  }
  const graph = async (percorso, parametri) => {
    const url = new URL(`https://graph.facebook.com/v21.0/${percorso}`);
    for (const [k, v] of Object.entries(parametri)) url.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
    url.searchParams.set('access_token', token);
    const dati = await (await fetch(url)).json();
    if (dati.error) throw new Error(dati.error.message);
    return dati;
  };
  try {
    const account = (await graph('me/adaccounts', { fields: 'account_id' })).data?.[0];
    if (!account) throw new Error('il token non vede nessun account pubblicitario');
    const r = (await graph(`act_${account.account_id}/insights`, {
      fields: 'spend',
      time_range: { since: ymdLocale(lunedi), until: ymdLocale(domenica) },
    })).data?.[0];
    return Math.round(Number(r?.spend || 0) * 100) / 100;
  } catch (e) {
    console.log(`Spesa Meta non letta: ${e.message}`);
    return '';
  }
}

const prova = process.argv.includes('--prova');
const it = (d) => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Numero di settimana ISO 8601 e anno di riferimento. */
function settimanaIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const capodanno = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - capodanno) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

/** Lunedi' 00:00 e domenica 23:59 della settimana appena conclusa. */
function settimanaScorsa() {
  const oggi = new Date();
  const domenica = new Date(oggi);
  domenica.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) - 1);
  domenica.setHours(23, 59, 59, 999);
  const lunedi = new Date(domenica);
  lunedi.setDate(domenica.getDate() - 6);
  lunedi.setHours(0, 0, 0, 0);
  return { lunedi, domenica };
}

async function datiGsc() {
  // Finestra di 28 giorni che finisce 3 giorni fa: gli ultimi giorni di Search
  // Console sono ancora parziali e falserebbero il confronto fra settimane.
  const fine = new Date(); fine.setDate(fine.getDate() - 3);
  const inizio = new Date(fine); inizio.setDate(fine.getDate() - 27);
  const token = await getAccessToken();
  const r = await query(token, { startDate: ymd(inizio), endDate: ymd(fine), dimensions: [], rowLimit: 1 });
  const riga = (r.rows || [])[0];
  return {
    clic: riga ? riga.clicks : 0,
    impressioni: riga ? riga.impressions : 0,
    // numero, non testo: i grafici della scheda lo devono poter disegnare
    posizione: riga ? Math.round(riga.position * 10) / 10 : '',
    al: it(fine),
    sito: SITE_URL,
  };
}

function contaArticoli() {
  try {
    return (readFileSync('lib/blogPosts.ts', 'utf8').match(/^\s{4}"?slug"?\s*:/gm) || []).length;
  } catch {
    return '';
  }
}

async function main() {
  const { lunedi, domenica } = settimanaScorsa();
  const token = await sheetsToken();

  const righeLead = await leggi(token, 'Lead-Contatti!A4:H1000');
  const lead = righeLead.slice(1)
    .map((r) => ({ data: dataItaliana(r[0]), provenienza: (r[3] || '').trim(), stato: (r[5] || '').trim(), nome: (r[1] || '').trim() }))
    .filter((l) => l.nome);

  const dellaSettimana = lead.filter((l) => l.data && l.data >= lunedi && l.data <= domenica);
  const conta = (test) => dellaSettimana.filter(test).length;

  const gsc = await datiGsc();
  const [google, meta] = await Promise.all([spesaGoogle(lunedi, domenica), spesaMeta(lunedi, domenica)]);

  const clienti = lead.filter((l) => l.stato === 'Cliente');
  const daMeta = (l) => l.provenienza.startsWith('Meta') || l.provenienza === 'Instagram' || l.provenienza === 'Facebook';

  const riga = [
    settimanaIso(lunedi),
    it(lunedi),
    it(domenica),
    conta((l) => l.provenienza === 'Sito web'),
    conta((l) => l.provenienza.startsWith('Meta') || l.provenienza === 'Instagram' || l.provenienza === 'Facebook'),
    conta((l) => !['Sito web', 'Instagram', 'Facebook'].includes(l.provenienza) && !l.provenienza.startsWith('Meta')),
    lead.length,
    lead.filter((l) => l.stato === 'Cliente').length,
    gsc.clic,
    gsc.impressioni,
    gsc.posizione,
    gsc.al,
    contaArticoli(),
    google,
    meta,
    clienti.filter(daMeta).length,
    // chi non ha data sul foglio si conta: e' successo una volta (Vannucci), ed era un cliente vero
    clienti.filter((l) => l.provenienza === 'Sito web' && (!l.data || l.data >= INIZIO_GOOGLE_ADS)).length,
    '',
  ];

  if (prova) {
    console.log('(prova: non scrivo sul foglio)\n');
    INTESTAZIONI.forEach((h, i) => console.log(`${h.padEnd(18)} ${riga[i]}`));
    return;
  }

  const creata = await creaSchedaSeManca(token, SCHEDA, INTESTAZIONI);
  if (creata) console.log(`Scheda "${SCHEDA}" creata.`);

  const colonnaA = (await leggi(token, `${SCHEDA}!A1:A1000`)).map((r) => String(r[0] ?? '').trim());
  const intestazione = colonnaA.indexOf('Settimana');
  if (intestazione === -1) throw new Error(`Nella scheda "${SCHEDA}" non trovo la cella "Settimana" in colonna A.`);
  const settimane = colonnaA.slice(intestazione + 1);

  // Una riga per settimana: se il lunedi' il giro parte due volte, non raddoppia.
  if (settimane.includes(riga[0])) {
    console.log(`La settimana ${riga[0]} c'e' gia': non scrivo niente.`);
    return;
  }

  let ultima = settimane.length;
  while (ultima > 0 && !settimane[ultima - 1]) ultima--;
  const numeroRiga = intestazione + 1 + ultima + 1; // 1-based, prima riga libera
  await scrivi(token, `${SCHEDA}!A${numeroRiga}:R${numeroRiga}`, [riga]);
  // Niente spesa nel log: il repository e' pubblico, e i log di Actions pure.
  console.log(`Scritta la riga ${riga[0]} (riga ${numeroRiga} del foglio).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
