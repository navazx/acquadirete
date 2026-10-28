#!/usr/bin/env node
// ============================================================================
//  IL CRUSCOTTO DI OGNI MATTINA (dal 28 ott 2026)
//
//  Matteo: "l'artefatto cruscotto si deve aggiornare ogni giorno". La pagina
//  (https://claude.ai/artifact/WTSEAc6prF69SVXs3TcFzL, scheda Numeri) prende i
//  numeri dal suo database, documento cruscotto/oggi. Qui li si prepara:
//    - i contatti di Lead-Contatti (nome, provenienza, zona, stato);
//    - la spesa di Google Ads e Meta da quando sono partite le campagne;
//    - Search Console: 28 giorni contro i 28 prima, 90 giorni, settimane,
//      pagine e ricerche;
//    - recensioni, clienti nel Gestionale, articoli, prossimi controlli delle prove.
//
//  Dentro ci sono nomi di clienti e cifre in euro, e il repo è pubblico: i dati
//  vanno su main CHIUSI A CHIAVE (agenti/cruscotto/oggi.enc, AES-256-GCM, una
//  chiave nuova ogni giorno). La chiave non va nel repo né nei log: la porta il
//  messaggio con cui si sveglia il postino, l'unico che scrive sulla pagina.
//  Il postino apre il file (scripts/cruscotto-apri.mjs) e lo copia nel database.
//
//    node scripts/cruscotto-oggi.mjs --prova   scrive in /tmp/cruscotto/oggi.json e basta
// ============================================================================

import { randomBytes, createCipheriv } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAccessToken, query as gsc } from './lib/gsc.mjs';
import { leggi, dataItaliana } from './lib/gestionale.mjs';
import { query as queryAds, euro } from './lib/ads.mjs';
import { suMain } from './lib/spingi.mjs';

const prova = process.argv.includes('--prova');
export const FILE = 'agenti/cruscotto/oggi.enc';
const POSTINO = 'https://api.anthropic.com/v1/claude_code/routines/trig_01JXe1QeXJgbC5EWsbDkgDtS/fire';

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

/** Una riga corta per la tabella: zona, depuratore in casa, interesse, da dove. */
export function riassunto(interesse, note) {
  const pezzi = [];
  // "Zona: Z2 — Scandicci, Sesto… — altra domanda: risposta": il nome della zona
  // è il pezzo dopo il codice, se non è già un'altra domanda (con i due punti).
  const parti = note.split(/\s+—\s+/);
  const i = parti.findIndex((p) => /^Zona:\s*Z\w+/.test(p));
  if (i >= 0) {
    const codice = parti[i].match(/:\s*(Z\w+)/)[1];
    const nome = parti[i + 1] && !parti[i + 1].includes(':') ? ` ${parti[i + 1].trim()}` : '';
    pezzi.push(codice === 'ZX' ? 'fuori zona' : `${codice}${nome}`);
  }
  const citta = note.match(/Città:\s*([^—]+)/);
  if (citta) pezzi.push(citta[1].trim().replace(/\s*\d{5}$/, ''));
  // I moduli Meta di luglio chiedevano la provincia e la casa.
  const provincia = note.match(/in_che_provincia_abiti\?:\s*([^—(]+)/i);
  if (provincia && i < 0) pezzi.push(provincia[1].trim().replace(/^./, (c) => c.toUpperCase()));
  const casa = note.match(/propriet[àa]_o_in_affitto\?:\s*(\w+)/i);
  if (casa) pezzi.push(/affitto/i.test(casa[1]) ? 'in affitto' : 'casa di proprietà');
  const dep = note.match(/possiedi_gi[aà]_un_depuratore[^:]*:\s*(s[iì]|no)/i);
  if (dep) pezzi.push(/^s/i.test(dep[1]) ? 'ha già un depuratore' : 'non ha un depuratore');
  if (interesse && !/^[-—]$/.test(interesse)) pezzi.push(interesse);
  if (/annuncio google/i.test(note)) pezzi.push('da un annuncio Google');
  // Una nota scritta a mano (senza le domande dei moduli): la prima frase, senza numeri lunghi.
  if (!pezzi.length && note && !/\?:/.test(note)) {
    const libera = note.replace(/\(scritto dall'app[^)]*\)/gi, '').replace(/\d{6,}/g, '').replace(/^[\s—-]+|[\s—-]+$/g, '').trim();
    if (libera) pezzi.push(libera);
  }
  if (/scritto dall'app/i.test(note)) pezzi.push("scritto nell'app");
  const testo = pezzi.join(' · ');
  return testo.length > 120 ? `${testo.slice(0, 117)}…` : testo || '—';
}

async function contatti(token) {
  const righe = await leggi(token, 'Lead-Contatti!A4:H1000');
  const [testa, ...dati] = righe;
  const col = (nome) => testa.indexOf(nome);
  const c = { data: col('Data'), nome: col('Nome'), prov: col('Provenienza'), int: col('Interesse'), stato: col('Stato'), note: col('Note'), dataStato: col('Data stato') };
  return dati
    .map((r) => {
      const quando = dataItaliana(r[c.data]);
      const nome = (r[c.nome] || '').trim();
      if (!quando || !nome) return null;
      const statoDal = dataItaliana(r[c.dataStato] || '');
      return {
        d: ymdLocale(quando),
        nome,
        src: fonte(r[c.prov] || ''),
        int: riassunto((r[c.int] || '').trim(), (r[c.note] || '').trim()),
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

export function chiudi(dati) {
  const chiave = randomBytes(32);
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chiave, iv);
  const corpo = Buffer.concat([c.update(JSON.stringify(dati), 'utf8'), c.final()]);
  return { chiave: chiave.toString('hex'), file: `${Buffer.concat([iv, c.getAuthTag(), corpo]).toString('base64')}\n` };
}

async function svegliaPostino(chiave) {
  const token = process.env.POSTINO_TOKEN;
  if (!token) throw new Error('manca POSTINO_TOKEN');
  const res = await fetch(POSTINO, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'anthropic-beta': 'experimental-cc-routine-2026-04-01',
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: `CRUSCOTTO-CHIAVE ${chiave}` }),
  });
  if (!res.ok) throw new Error(`il postino non è partito (HTTP ${res.status})`);
}

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
  };
  console.log(`Contatti ${lead.length} · clienti nel Gestionale ${clienti ?? '?'} · spesa letta: Google ${google == null ? 'no' : 'sì'}, Meta ${meta == null ? 'no' : 'sì'} · Search Console al ${seo.al}`);

  if (prova) {
    mkdirSync('/tmp/cruscotto', { recursive: true });
    writeFileSync('/tmp/cruscotto/oggi.json', JSON.stringify(dati, null, 1));
    console.log('Prova: dati in /tmp/cruscotto/oggi.json, niente su main e niente postino.');
    return;
  }

  const { chiave, file } = chiudi(dati);
  suMain('Cruscotto: i numeri di oggi, chiusi a chiave [skip netlify]', (dir) => {
    mkdirSync(join(dir, 'agenti/cruscotto'), { recursive: true });
    writeFileSync(join(dir, FILE), file);
    return [FILE];
  }, { autore: 'agente-cruscotto' });
  await svegliaPostino(chiave);
  console.log('Numeri su main, chiusi a chiave; il postino li porta sulla pagina.');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('cruscotto-oggi.mjs')) {
  main().catch((e) => {
    console.error(`Cruscotto di oggi non preparato: ${e.message}`);
    process.exit(1);
  });
}
