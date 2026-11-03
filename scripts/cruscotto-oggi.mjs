#!/usr/bin/env node
// ============================================================================
//  IL CRUSCOTTO DI OGNI MATTINA (dal 28 ott 2026)
//
//  Matteo vuole il cruscotto aggiornato ogni giorno. Dal 3 nov 2026 sta nell'app
//  Gestione, che prende i numeri dalla scheda Cruscotto-Oggi del Gestionale. Qui
//  li si prepara:
//    - i contatti di Lead-Contatti, senza nomi (data, provenienza, stato): la
//      pagina è una panoramica dell'andamento e di cosa fare, non un elenco di
//      clienti (Matteo, 28 ott);
//    - la spesa di Google Ads e Meta da quando sono partite le campagne;
//    - Search Console: 28 giorni contro i 28 prima, 90 giorni, settimane,
//      pagine e ricerche;
//    - recensioni, clienti nel Gestionale, articoli, prossimi controlli delle prove;
//    - il tetto del costo per cliente (secret VALORE_CLIENTE).
//
//  Dentro ci sono cifre in euro e numeri dell'azienda, e il repo è pubblico: non
//  vanno né nel repo né nei log. Li vede solo chi ha il permesso «cruscotto» nell'app.
//
//    node scripts/cruscotto-oggi.mjs --prova   scrive in /tmp/cruscotto/oggi.json e basta
// ============================================================================

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { getAccessToken, query as gsc } from './lib/gsc.mjs';
import { leggi, dataItaliana, SHEET_ID } from './lib/gestionale.mjs';
import { query as queryAds, euro } from './lib/ads.mjs';
import { valoreCliente } from './lib/visite.mjs';
import { creaFoglioGoogle, scriviNumeri } from '../netlify/functions/_shared/gestionale.mjs';

const prova = process.argv.includes('--prova');

// Da quando contano le spese: la campagna Meta è partita il 28 giugno, Google
// Ads l'8 luglio 2026 (vedi scripts/cruscotto.mjs).
const META_DAL = '2026-06-28';
const GOOGLE_DAL = '2026-07-08';

const ymdLocale = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const giorni = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const uno = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------
//  I contatti
// ---------------------------------------------------------------------------

export function fonte(provenienza) {
  if (/meta|facebook|instagram/i.test(provenienza)) return 'Meta';
  if (/annuncio google/i.test(provenienza)) return 'Annuncio';
  if (/sito/i.test(provenienza)) return 'Sito';
  return 'Altro';
}

async function contatti(token) {
  const righe = await leggi(token, 'Lead-Contatti!A4:H1000');
  const [testa, ...dati] = righe;
  const col = (nome) => testa.indexOf(nome);
  const c = { data: col('Data'), nome: col('Nome'), prov: col('Provenienza'), stato: col('Stato'), dataStato: col('Data stato') };
  return dati
    .map((r) => {
      const quando = dataItaliana(r[c.data]);
      // una riga senza nome è vuota o a metà: non è un contatto
      if (!quando || !(r[c.nome] || '').trim()) return null;
      const statoDal = dataItaliana(r[c.dataStato] || '');
      return {
        d: ymdLocale(quando),
        src: fonte(r[c.prov] || ''),
        stato: (r[c.stato] || '').trim() || 'Nuovo',
        ...(statoDal ? { dal: ymdLocale(statoDal) } : {}),
      };
    })
    .filter(Boolean);
}

async function clientiNelGestionale(token) {
  const righe = await leggi(token, 'Clienti-Impianti!A1:A3000');
  return righe.filter((r) => /^C\d+$/.test(String(r[0] || '').trim())).length;
}

// ---------------------------------------------------------------------------
//  La spesa (sola lettura; Meta con due chiamate al giorno, poche di proposito:
//  l'antifrode di Meta a luglio 2026 aveva bloccato l'account dopo una raffica)
// ---------------------------------------------------------------------------

async function spesaGoogle(fine) {
  try {
    const righe = await queryAds(`SELECT metrics.cost_micros FROM customer WHERE segments.date BETWEEN '${GOOGLE_DAL}' AND '${ymdLocale(fine)}'`);
    return euro(righe.reduce((s, r) => s + Number(r.metrics?.costMicros || 0), 0));
  } catch (e) {
    console.log(`Spesa Google non letta: ${e.message}`);
    return null;
  }
}

async function spesaMeta(fine) {
  const token = process.env.META_ADS_TOKEN;
  if (!token) { console.log('Spesa Meta non letta: manca META_ADS_TOKEN.'); return null; }
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
    const r = (await graph(`act_${account.account_id}/insights`, { fields: 'spend', time_range: { since: META_DAL, until: ymdLocale(fine) } })).data?.[0];
    return Math.round(Number(r?.spend || 0) * 100) / 100;
  } catch (e) {
    console.log(`Spesa Meta non letta: ${e.message}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Search Console
// ---------------------------------------------------------------------------

const totali = (r) => {
  const x = (r.rows || [])[0];
  return x ? { clic: x.clicks, impr: x.impressions, pos: uno(x.position), ctr: uno(x.ctr * 100) } : { clic: 0, impr: 0, pos: null, ctr: null };
};

// Gli articoli si chiamano col loro titolo, come li conosce Matteo.
function titoliArticoli() {
  const testo = readFileSync('lib/blogPosts.ts', 'utf8');
  const titoli = {};
  for (const m of testo.matchAll(/"?slug"?:\s*['"]([^'"]+)['"],\s*\n\s*"?title"?:\s*(['"])((?:\\.|(?!\2).)*)\2/g)) {
    titoli[m[1]] = m[3].replace(/\\(.)/g, '$1');
  }
  return titoli;
}

const nomePagina = (url, titoli) => {
  const p = new URL(url).pathname.replace(/\/$/, '');
  if (!p) return 'Home';
  if (p.startsWith('/blog/')) {
    const t = titoli[p.slice(6)] || p.slice(6).replace(/-/g, ' ');
    return `blog · ${t.length > 52 ? `${t.slice(0, 50)}…` : t}`;
  }
  return p;
};

async function searchConsole() {
  const token = await getAccessToken();
  // Gli ultimi giorni di Search Console sono ancora parziali: si chiude 3 giorni fa.
  const fine = giorni(new Date(), -3);
  const finestra = (a, n) => ({ startDate: ymdLocale(giorni(a, -(n - 1))), endDate: ymdLocale(a) });
  const ultimi28 = finestra(fine, 28);
  const prima28 = finestra(giorni(fine, -28), 28);
  const ultimi90 = finestra(fine, 91);

  const [d28, p28, d90, perGiorno, pagine, ricerche] = await Promise.all([
    gsc(token, { ...ultimi28, dimensions: [], rowLimit: 1 }),
    gsc(token, { ...prima28, dimensions: [], rowLimit: 1 }),
    gsc(token, { ...ultimi90, dimensions: [], rowLimit: 1 }),
    gsc(token, { ...ultimi90, dimensions: ['date'], rowLimit: 200 }),
    gsc(token, { ...ultimi90, dimensions: ['page'], rowLimit: 1000 }),
    gsc(token, { ...ultimi90, dimensions: ['query'], rowLimit: 5000 }),
  ]);

  // 13 settimane intere, da lunedì; quella in corso si segna come parziale.
  const settimane = new Map();
  for (const r of perGiorno.rows || []) {
    const g = new Date(`${r.keys[0]}T12:00:00`);
    const lun = giorni(g, -((g.getDay() + 6) % 7));
    const k = ymdLocale(lun);
    const s = settimane.get(k) || { dal: k, clic: 0, impr: 0, giorni: 0 };
    s.clic += r.clicks; s.impr += r.impressions; s.giorni += 1;
    settimane.set(k, s);
  }

  const tot90 = totali(d90);
  const titoli = titoliArticoli();
  const righeQuery = ricerche.rows || [];
  const imprQuery = righeQuery.reduce((s, r) => s + r.impressions, 0);
  return {
    al: ultimi28.endDate,
    d28: { ...totali(d28), da: ultimi28.startDate, a: ultimi28.endDate },
    p28: totali(p28),
    d90: { ...tot90, da: ultimi90.startDate, a: ultimi90.endDate },
    settimane: [...settimane.values()].sort((a, b) => a.dal.localeCompare(b.dal)).slice(-13),
    pagine: (pagine.rows || [])
      .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
      .slice(0, 8)
      .map((r) => ({ p: nomePagina(r.keys[0], titoli), clic: r.clicks, impr: r.impressions, ctr: uno(r.ctr * 100), pos: uno(r.position) })),
    query: righeQuery
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 8)
      .map((r) => ({ q: r.keys[0], impr: r.impressions, clic: r.clicks, pos: uno(r.position) })),
    // Quanta parte delle impressioni coprono le ricerche che Google mostra
    // (le rare le nasconde): serve a dire quanto pesano le 8 righe.
    quotaQuery: tot90.impr ? Math.round((imprQuery / tot90.impr) * 100) : null,
  };
}

// ---------------------------------------------------------------------------
//  Il resto: recensioni, articoli, prove in arrivo
// ---------------------------------------------------------------------------

function recensioni() {
  try {
    const j = JSON.parse(readFileSync('lib/google-reviews.json', 'utf8'));
    return { media: j.rating, totale: j.total };
  } catch { return null; }
}

const articoli = () => (readFileSync('lib/blogPosts.ts', 'utf8').match(/^\s{4}"?slug"?\s*:/gm) || []).length;

/** Le prove ancora da giudicare, dalla più vicina: "## data · TIPO · titolo". */
export function prossimeProve(testo) {
  return testo.split(/^## /m).slice(1).map((blocco) => {
    const [titolo] = blocco.split('\n');
    const [, tipo = '', cosa = ''] = titolo.split(' · ');
    const quando = blocco.match(/Si controlla dal:\s*(\d{4}-\d{2}-\d{2})/)?.[1];
    const esito = blocco.match(/Esito:\s*(.*)/)?.[1] || '';
    return quando && /da vedere/i.test(esito) ? { quando, tipo: tipo.trim(), cosa: cosa.replace(/[«»]/g, '').trim() } : null;
  }).filter(Boolean).sort((a, b) => a.quando.localeCompare(b.quando)).slice(0, 6);
}

// ---------------------------------------------------------------------------

async function main() {
  const adesso = new Date();
  const ieri = giorni(adesso, -1);
  const token = await getAccessToken('https://www.googleapis.com/auth/spreadsheets.readonly');
  const [lead, clienti, google, meta, seo] = await Promise.all([
    contatti(token),
    clientiNelGestionale(token).catch(() => null),
    spesaGoogle(ieri),
    spesaMeta(ieri),
    searchConsole(),
  ]);

  const dati = {
    aggiornato: adesso.toISOString(),
    lead,
    spesa: { google, meta, googleDal: GOOGLE_DAL, metaDal: META_DAL, al: ymdLocale(ieri) },
    seo,
    sito: { recensioni: recensioni(), clienti, articoli: articoli() },
    prove: prossimeProve(readFileSync('agenti/prove.md', 'utf8')),
    tetto: Number(valoreCliente()?.tettoCostoPerCliente) || null,
  };
  console.log(`Contatti ${lead.length} · clienti nel Gestionale ${clienti ?? '?'} · spesa letta: Google ${google == null ? 'no' : 'sì'}, Meta ${meta == null ? 'no' : 'sì'} · Search Console al ${seo.al}`);

  if (prova) {
    mkdirSync('/tmp/cruscotto', { recursive: true });
    writeFileSync('/tmp/cruscotto/oggi.json', JSON.stringify(dati, null, 1));
    console.log('Prova: dati in /tmp/cruscotto/oggi.json, niente nel Gestionale.');
    return;
  }

  await scriviNumeri(creaFoglioGoogle(SHEET_ID), dati);
  console.log('Numeri scritti nel Gestionale, scheda Cruscotto-Oggi.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cruscotto-oggi.mjs')) {
  main().catch((e) => {
    console.error(`Cruscotto di oggi non preparato: ${e.message}`);
    process.exit(1);
  });
}
