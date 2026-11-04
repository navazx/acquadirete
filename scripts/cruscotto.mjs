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
import { sheetsToken, leggi, scrivi, creaSchedaSeManca, dataItaliana, leggiGrafici, cambiaGrafico } from './lib/gestionale.mjs';
import { lasciaNota } from './lib/bacheca.mjs';

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
  'Clienti da Meta (tot.)', 'Clienti da annuncio dal 27/9 (tot.)',
  'Note',
];

// Il costo per cliente di Google Ads conta solo i clienti arrivati da un annuncio,
// non quelli gratis dalla ricerca (Matteo, 4 nov 2026). Si distinguono dal 27 set
// 2026, quando il modulo ha cominciato a scriverlo nelle Note, e dal 21 ott c'e'
// anche la Provenienza "Annuncio Google". E' un MASSIMO: chi clicca l'annuncio e
// telefona senza dirlo non si vede. Stesso conto del cruscotto nell'app.
const TRACCIATO_DAL = new Date(2026, 8, 27);
const PRIMO_LUNEDI_TRACCIATO = new Date(2026, 8, 28);
const daAnnuncio = (l) => l.provenienza.startsWith('Annuncio Google') || /annuncio google/i.test(l.note);
const clientiDaAnnuncio = (clienti, fine) => clienti
  .filter((l) => daAnnuncio(l) && l.data && l.data >= TRACCIATO_DAL && l.data <= fine).length;
const fineDelGiorno = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

/**
 * Tiene in pari la scheda col conto qui sopra: colonna Q, costo per cliente
 * Google (colonna W), riquadro in alto e titolo del grafico. Rifatta non cambia
 * niente. Non deve mai fermare la riga della settimana.
 */
async function allineaCostoGoogle(token, clienti, intestazione) {
  const titoli = intestazione + 1; // numero di riga, da 1
  const T = titoli + 1;
  const settimane = await leggi(token, `${SCHEDA}!A${T}:C${T + 343}`);
  const primo = settimane.findIndex((r) => (dataItaliana(r[1]) || 0) >= PRIMO_LUNEDI_TRACCIATO);
  if (primo < 0) return;
  const R = T + primo;
  await scrivi(token, `${SCHEDA}!Q${T}:Q${T + settimane.length - 1}`, settimane.map((r, i) => {
    const fine = dataItaliana(r[2]);
    return [i < primo || !fine ? '' : clientiDaAnnuncio(clienti, fineDelGiorno(fine))];
  }));
  const col = (c) => `${c}${T}:${c}400`;
  const ultima = (c) => `INDEX(${col(c)};COUNTA(${col('A')}))`;
  const cumulata = `SUMIF(ROW(${col('N')});"<="&ROW(${col('N')});${col('N')})`;
  const prima = primo ? `-SUM(N${T}:N${R - 1})` : '';
  await scrivi(token, `${SCHEDA}!Q${titoli}`, [['Clienti da annuncio dal 27/9 (totale)']]);
  await scrivi(token, `${SCHEDA}!W${titoli}`, [['Costo per cliente Google (al massimo, dal 27/9)']]);
  await scrivi(token, `${SCHEDA}!W${T}`, [[`=ARRAYFORMULA(IF(${col('A')}="";"";IF(ROW(${col('A')})<${R};"";IFERROR((${cumulata}${prima})/${col('Q')};""))))`]], 'USER_ENTERED');
  await scrivi(token, `${SCHEDA}!O4:O6`, [
    ['Costo per cliente Google Ads'],
    [`=IFERROR(${ultima('W')};"")`],
    [`="al massimo, dal 27 settembre · Meta "&IFERROR(FIXED(${ultima('V')};0);"–")&" €"`],
  ], 'USER_ENTERED');
  const scheda = (await leggiGrafici(token)).find((s) => s.properties.title === SCHEDA);
  const grafico = (scheda?.charts || []).find((c) => /un minimo/.test(c.spec?.title || ''));
  if (grafico) {
    await cambiaGrafico(token, grafico.chartId, { ...grafico.spec, title: 'Costo per cliente (€) — Google dal 27 settembre, al massimo' });
  }
  console.log(`Costo per cliente Google allineato, dalla riga ${R}.`);
}

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
    .map((r) => ({ data: dataItaliana(r[0]), provenienza: (r[3] || '').trim(), stato: (r[5] || '').trim(), nome: (r[1] || '').trim(), note: r[6] || '' }))
    .filter((l) => l.nome);

  const dellaSettimana = lead.filter((l) => l.data && l.data >= lunedi && l.data <= domenica);
  const conta = (test) => dellaSettimana.filter(test).length;

  const gsc = await datiGsc();
  const [google, meta] = await Promise.all([spesaGoogle(lunedi, domenica), spesaMeta(lunedi, domenica)]);

  const clienti = lead.filter((l) => l.stato === 'Cliente');
  const daMeta = (l) => l.provenienza.startsWith('Meta') || l.provenienza === 'Instagram' || l.provenienza === 'Facebook';
  // Chi chiama o scrive su WhatsApp dopo un annuncio è passato dal sito: conta
  // con "Sito web" (Provenienza "Annuncio Google (WhatsApp/telefono)", dal 21 ott 2026).
  const dalSito = (l) => l.provenienza === 'Sito web' || l.provenienza.startsWith('Annuncio Google');

  const riga = [
    settimanaIso(lunedi),
    it(lunedi),
    it(domenica),
    conta(dalSito),
    conta(daMeta),
    conta((l) => !dalSito(l) && !daMeta(l)),
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
    clientiDaAnnuncio(clienti, fineDelGiorno(domenica)),
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
  try {
    await allineaCostoGoogle(token, clienti, intestazione);
  } catch (e) {
    console.log(`Costo per cliente Google non allineato: ${e.message}`);
  }
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

  // La nota per la bacheca: senza numeri (i contatti e la spesa restano sul
  // Gestionale, il repo e' pubblico), ma dice agli altri agenti da dove arriva
  // il lavoro. Non deve mai far fallire la riga appena scritta.
  try {
    const [sito, social, altri] = [riga[3], riga[4], riga[5]];
    const nuovi = sito + social + altri;
    const prima = new Date(lunedi); prima.setDate(prima.getDate() - 7);
    const scorsa = lead.filter((l) => l.data && l.data >= prima && l.data < lunedi).length;
    const andamento = nuovi > scorsa ? 'più della settimana prima' : nuovi < scorsa ? 'meno della settimana prima' : 'come la settimana prima';
    const fonte = !nuovi ? '' : sito > social && sito > altri ? ' La maggior parte dal sito.' : social > sito && social > altri ? ' La maggior parte da Meta e dai social.' : ' Divisi fra sito, social e passaparola.';
    lasciaNota('lead', `Cruscotto della settimana ${it(lunedi)}-${it(domenica)} scritto sul Gestionale. Contatti nuovi: ${nuovi ? andamento : 'nessuno'}.${fonte}`, ['direttore', 'social', 'contenuti']);
  } catch (e) {
    console.log(`Nota per la bacheca non lasciata: ${e.message}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
