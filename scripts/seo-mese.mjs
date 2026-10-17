#!/usr/bin/env node
// ============================================================================
//  CONTROLLO SEO DEL MESE — i dati (dal 17 ott 2026)
//
//  Il controllo del lunedì (agente-seo.mjs) guarda se le pagine funzionano:
//  rotte, titoli, description, immagini. Questo, una volta al mese, raccoglie
//  quello che serve per decidere DOVE lavorare perché il sito porti clienti:
//
//    indicizzazione  ogni pagina della sitemap passata all'ispezione di Search
//                    Console: indicizzata o no, quando l'ha vista Google, quale
//                    canonical ha scelto, quali risultati arricchiti vede
//    velocità        PageSpeed sul telefono (punteggio, LCP, CLS, TBT), se
//                    l'API è accesa nel progetto Google Cloud acquadirete-seo
//    dati strutturati  i tipi JSON-LD scritti in ogni pagina
//    collegamenti    chi porta a ogni pagina e con quali parole, quanti clic
//                    servono dalla home, quali articoli portano ai servizi
//                    (i link del menu e del piè di pagina, che stanno ovunque,
//                    sono contati a parte: non dicono niente)
//    ricerche        90 giorni di Search Console, ricerca per ricerca e pagina
//                    per pagina (senza marchio e numeri di telefono)
//    contatti        quanti contatti e clienti sono nati da ogni pagina negli
//                    ultimi 90 giorni (Gestionale), e le visite contate dal sito
//
//  Scrive agenti/seo/mese.json (il repository è pubblico: dentro ci sono solo
//  conteggi, niente nomi, telefoni o euro) e tiene in "meseScorso" i numeri
//  principali del giro prima, per il confronto. Poi l'agente del mese
//  (.claude/skills/controllo-seo-mese) li studia e scrive il rapporto.
//
//  Prova in locale (stampa i conteggi, scrive in /tmp):
//    GSC_KEY_FILE=".../gsc-key-readonly.json" node scripts/seo-mese.mjs --prova
// ============================================================================

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { decodifica, scarica, inParallelo } from './agente-seo.mjs';
import { getAccessToken, query, ymd } from './lib/gsc.mjs';
import { leggiLead } from './lib/gestionale.mjs';
import { contattiPerPagina, visitePerPagina } from './lib/visite.mjs';

const SITO = 'https://www.acquadirete.it';
const PROPRIETA = `${SITO}/`;
const prova = process.argv.includes('--prova');
const FILE = prova ? (process.env.SEO_MESE_FILE || 'seo-mese-prova.json') : 'agenti/seo/mese.json';
const PRECEDENTE = 'agenti/seo/mese.json';

const percorso = (url) => { try { return new URL(url, SITO).pathname; } catch { return url; } };
const tonda = (n, c = 1) => Math.round(n * 10 ** c) / 10 ** c;
const marchio = (q) => /\d{6,}/.test(q.replace(/[\s.\-/]/g, '')) || /acqua\s*di\s*rete|acquadirete/i.test(q);
const testoPiano = (html) => decodifica(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------------
//  Le pagine, come le legge Google
// ---------------------------------------------------------------------------

function tipiJsonLd(html) {
  const tipi = [];
  const errori = [];
  const raccogli = (nodo) => {
    if (Array.isArray(nodo)) return nodo.forEach(raccogli);
    if (!nodo || typeof nodo !== 'object') return;
    if (nodo['@type']) tipi.push(...[].concat(nodo['@type']));
    for (const v of Object.values(nodo)) if (v && typeof v === 'object') raccogli(v);
  };
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { raccogli(JSON.parse(m[1])); } catch (e) { errori.push(e.message.slice(0, 80)); }
  }
  return { tipi: [...new Set(tipi)], errori };
}

function leggiPagina(url, html) {
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  const collegamenti = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = (m[1].match(/\shref="([^"]+)"/i) || [])[1];
    if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    let u;
    try { u = new URL(decodifica(href), url); } catch { continue; }
    if (!/(^|\.)acquadirete\.it$/.test(u.host)) continue;
    const testo = testoPiano(m[2]) || decodifica((m[1].match(/\saria-label="([^"]*)"/i) || [])[1] || '');
    collegamenti.push({ a: u.pathname, testo: testo.slice(0, 80) });
  }
  // Parole del contenuto vero: senza intestazione e piè di pagina del sito.
  const corpo = html.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<nav[\s\S]*?<\/nav>/gi, ' ');
  return {
    titolo: decodifica((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]),
    h1: h1 ? testoPiano(h1) : null,
    parole: testoPiano(corpo).split(' ').filter(Boolean).length,
    datiStrutturati: tipiJsonLd(html),
    collegamenti,
  };
}

/** Chi porta a chi, con quali parole, e a quanti clic dalla home. */
function grafo(pagine) {
  const tutte = pagine.length;
  // Un collegamento che compare in quasi tutte le pagine è del menu o del piè di pagina.
  const quante = new Map();
  for (const p of pagine) for (const a of new Set(p.collegamenti.map((c) => c.a))) quante.set(a, (quante.get(a) || 0) + 1);
  const delMenu = new Set([...quante].filter(([, n]) => n >= Math.max(3, tutte * 0.8)).map(([a]) => a));

  const entranti = new Map();
  for (const p of pagine) {
    for (const c of p.collegamenti) {
      if (c.a === p.pagina) continue;
      if (!entranti.has(c.a)) entranti.set(c.a, { daMenu: false, nelTesto: new Map() });
      const e = entranti.get(c.a);
      if (delMenu.has(c.a)) { e.daMenu = true; continue; }
      const voce = e.nelTesto.get(p.pagina) || new Set();
      if (c.testo) voce.add(c.testo);
      e.nelTesto.set(p.pagina, voce);
    }
  }

  // Clic dalla home, seguendo tutti i collegamenti.
  const profondita = new Map([['/', 0]]);
  const coda = ['/'];
  const perPagina = new Map(pagine.map((p) => [p.pagina, p]));
  while (coda.length) {
    const da = coda.shift();
    for (const c of perPagina.get(da)?.collegamenti || []) {
      if (!profondita.has(c.a)) { profondita.set(c.a, profondita.get(da) + 1); coda.push(c.a); }
    }
  }

  return { delMenu: [...delMenu].sort(), entranti, profondita };
}

// ---------------------------------------------------------------------------
//  Google: ispezione, velocità, ricerche
// ---------------------------------------------------------------------------

async function ispeziona(token, url) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: PROPRIETA, languageCode: 'it-IT' }),
  });
  const dati = await res.json();
  if (!res.ok) return { errore: dati.error?.message?.slice(0, 160) || `HTTP ${res.status}` };
  const r = dati.inspectionResult || {};
  const i = r.indexStatusResult || {};
  return {
    esito: i.verdict,                       // PASS = indicizzata
    stato: i.coverageState,                 // in italiano, come in Search Console
    ultimaVisita: i.lastCrawlTime?.slice(0, 10) || null,
    canonicalGoogle: i.googleCanonical ? percorso(i.googleCanonical) : null,
    canonicalNostro: i.userCanonical ? percorso(i.userCanonical) : null,
    robots: i.robotsTxtState,
    lettura: i.pageFetchState,
    trovataDa: (i.referringUrls || []).map(percorso).slice(0, 5),
    risultatiArricchiti: (r.richResultsResult?.detectedItems || []).map((d) => ({
      tipo: d.richResultType,
      problemi: (d.items || []).flatMap((x) => (x.issues || []).map((q) => `${q.severity}: ${q.issueMessage}`)).slice(0, 5),
    })),
    link: r.inspectionResultLink || null,   // apre la pagina in Search Console, col tasto "Richiedi indicizzazione"
  };
}

let velocitaSpenta = null;
async function velocita(token, url) {
  if (velocitaSpenta) return null;
  const indirizzo = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&locale=it`;
  for (let tentativo = 0; tentativo < 2; tentativo += 1) {
    const res = await fetch(indirizzo, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(120000) }).catch((e) => ({ ok: false, status: 0, json: async () => ({ error: { message: e.message } }) }));
    const dati = await res.json();
    if (res.status === 403) { velocitaSpenta = dati.error?.message?.slice(0, 200) || 'API spenta'; return null; }
    if (!res.ok) continue;
    const a = dati.lighthouseResult?.audits || {};
    const campo = dati.loadingExperience?.metrics;
    return {
      punteggio: Math.round((dati.lighthouseResult?.categories?.performance?.score ?? 0) * 100),
      lcp: a['largest-contentful-paint']?.numericValue ? tonda(a['largest-contentful-paint'].numericValue / 1000) : null,
      cls: a['cumulative-layout-shift']?.numericValue != null ? tonda(a['cumulative-layout-shift'].numericValue, 3) : null,
      tbt: a['total-blocking-time']?.numericValue != null ? Math.round(a['total-blocking-time'].numericValue) : null,
      // Dati veri delle persone (Chrome, ultimi 28 giorni). Con poche visite Google
      // non li ha per la singola pagina e dà quelli di tutto il sito: "di" lo dice.
      persone: campo ? {
        di: dati.loadingExperience.id === url ? 'questa pagina' : 'tutto il sito',
        ...Object.fromEntries(Object.entries(campo).map(([k, v]) => [k, v.category])),
      } : null,
      daMigliorare: Object.values(a)
        .filter((x) => x.details?.type === 'opportunity' && (x.details.overallSavingsMs || 0) >= 300)
        .sort((x, y) => y.details.overallSavingsMs - x.details.overallSavingsMs)
        .slice(0, 3)
        .map((x) => `${x.title} (circa ${tonda(x.details.overallSavingsMs / 1000)} s)`),
    };
  }
  return { errore: 'PageSpeed non ha risposto' };
}

async function ricerche90(token) {
  const fine = new Date(); fine.setDate(fine.getDate() - 3);
  const inizio = new Date(fine); inizio.setDate(inizio.getDate() - 89);
  const periodo = { da: ymd(inizio), a: ymd(fine) };
  const [perPagina, pagine] = await Promise.all([
    query(token, { startDate: periodo.da, endDate: periodo.a, dimensions: ['query', 'page'], rowLimit: 25000 }),
    query(token, { startDate: periodo.da, endDate: periodo.a, dimensions: ['page'], rowLimit: 1000 }),
  ]);
  const mappa = new Map();
  for (const r of perPagina.rows || []) {
    const [q, url] = r.keys;
    if (marchio(q)) continue;
    const voce = mappa.get(q) || { ricerca: q, viste: 0, clic: 0, pagine: [] };
    voce.viste += r.impressions;
    voce.clic += r.clicks;
    voce.pagine.push({ pagina: percorso(url), viste: r.impressions, clic: r.clicks, posizione: tonda(r.position) });
    mappa.set(q, voce);
  }
  const elenco = [...mappa.values()].filter((v) => v.viste >= 3).sort((x, y) => y.viste - x.viste).slice(0, 400);
  for (const v of elenco) v.pagine.sort((x, y) => y.viste - x.viste);
  const perOgniPagina = Object.fromEntries((pagine.rows || []).map((r) => [percorso(r.keys[0]), { viste: r.impressions, clic: r.clicks, posizione: tonda(r.position) }]));
  return { periodo, ricerche: elenco, pagine: perOgniPagina };
}

// ---------------------------------------------------------------------------

async function main() {
  const meseScorso = existsSync(PRECEDENTE) ? (() => { try { return JSON.parse(readFileSync(PRECEDENTE, 'utf8')); } catch { return null; } })() : null;

  const sitemap = await scarica(`${SITO}/sitemap.xml`);
  if (sitemap.stato !== 200) throw new Error(`la sitemap risponde ${sitemap.stato || sitemap.errore}`);
  const indirizzi = [...sitemap.testo.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

  const lette = await inParallelo(indirizzi, 4, async (url) => {
    const r = await scarica(url);
    return { url, pagina: percorso(url), stato: r.stato, ...(r.stato === 200 ? leggiPagina(url, r.testo) : { collegamenti: [] }) };
  });
  const { delMenu, entranti, profondita } = grafo(lette);

  const tokenGsc = await getAccessToken('https://www.googleapis.com/auth/webmasters.readonly');
  const ispezioni = await inParallelo(lette, 3, (p) => ispeziona(tokenGsc, p.url));
  const tokenVelocita = await getAccessToken('openid');
  const velocitaPagine = await inParallelo(lette, 3, (p) => velocita(tokenVelocita, p.url));
  const google = await ricerche90(tokenGsc);

  // Contatti dal Gestionale (ultimi 90 giorni) e visite contate dal sito.
  let contatti = {}; let visite = { assente: 'non lette' };
  try {
    const tokenFoglio = await getAccessToken('https://www.googleapis.com/auth/spreadsheets.readonly');
    const a = new Date(); const da = new Date(a.getTime() - 90 * 864e5);
    contatti = contattiPerPagina(await leggiLead(tokenFoglio), da, a);
    visite = await visitePerPagina(tokenFoglio, ymd(da), ymd(a));
  } catch (e) {
    visite = { assente: `Gestionale non leggibile: ${e.message.slice(0, 120)}` };
  }
  const visitePagina = new Map((visite.pagine || []).map((v) => [v.pagina, v]));

  const pagine = lette.map((p, i) => {
    const e = entranti.get(p.pagina);
    const nelTesto = e ? [...e.nelTesto].map(([da, testi]) => ({ da, parole: [...testi].slice(0, 3) })) : [];
    const v = visitePagina.get(p.pagina);
    return {
      pagina: p.pagina,
      risponde: p.stato,
      titolo: p.titolo,
      h1: p.h1,
      parole: p.parole,
      datiStrutturati: p.datiStrutturati,
      indicizzazione: ispezioni[i],
      velocita: velocitaPagine[i],
      collegamenti: {
        clicDallaHome: profondita.get(p.pagina) ?? null,
        dalMenu: Boolean(e?.daMenu),
        nelTesto,
        escono: [...new Set(p.collegamenti.map((c) => c.a).filter((a) => !delMenu.includes(a) && a !== p.pagina))],
      },
      google: google.pagine[p.pagina] || { viste: 0, clic: 0 },
      contatti90: contatti[p.pagina] || { contatti: 0, daAnnuncio: 0, clienti: 0 },
      visite: v ? { viste: v.Visualizzazioni, ingressi: v.Ingressi, daGoogle: v['Da Google'], moduliIniziati: v['Moduli iniziati'], moduliInviati: v['Moduli inviati'], chiama: v.Chiama, whatsapp: v.WhatsApp } : null,
    };
  });

  // I contatti nati da pagine fuori dalla sitemap (la pagina degli annunci, le vecchie).
  const fuoriSitemap = Object.fromEntries(Object.entries(contatti).filter(([p]) => !pagine.some((x) => x.pagina === p)));

  const riassunto = {
    pagine: pagine.length,
    indicizzate: pagine.filter((p) => p.indicizzazione?.esito === 'PASS').length,
    nonIndicizzate: pagine.filter((p) => p.indicizzazione?.esito && p.indicizzazione.esito !== 'PASS').map((p) => p.pagina),
    canonicalScelteDaGoogleDiverse: pagine.filter((p) => p.indicizzazione?.canonicalGoogle && p.indicizzazione.canonicalGoogle !== p.pagina).map((p) => p.pagina),
    velocitaMedia: (() => { const v = pagine.map((p) => p.velocita?.punteggio).filter((x) => x != null); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null; })(),
    // Lente davvero: per le persone vere, se Google ha il dato; se no il laboratorio
    // (un telefono lento simulato, più severo: oltre 4 secondi).
    lente: pagine.filter((p) => {
      const vere = p.velocita?.persone?.LARGEST_CONTENTFUL_PAINT_MS;
      return vere ? vere === 'SLOW' : p.velocita?.lcp > 4;
    }).map((p) => ({ pagina: p.pagina, lcp: p.velocita.lcp, persone: p.velocita.persone?.LARGEST_CONTENTFUL_PAINT_MS ?? null })),
    senzaCollegamentiNelTesto: pagine.filter((p) => p.pagina !== '/' && !p.collegamenti.nelTesto.length).map((p) => p.pagina),
  };

  const uscita = {
    letto: new Date().toISOString(),
    come_si_legge: 'Una voce per ogni pagina della sitemap. indicizzazione = ispezione di Search Console (esito PASS = indicizzata, link = apre la pagina in Search Console). velocita = PageSpeed sul telefono: punteggio, lcp (secondi), cls e tbt (millisecondi) sono del laboratorio, un telefono lento simulato e più severo del vero; persone = come va per le persone vere (FAST, AVERAGE, SLOW), della pagina o di tutto il sito (campo "di"). Conta prima persone. collegamenti.nelTesto = le pagine che portano qui dal testo (non dal menu), con le parole del collegamento. google = 90 giorni di Search Console. contatti90 = contatti nati da quella pagina negli ultimi 90 giorni (Gestionale). visite = contatore del sito, partito il 16 ott 2026.',
    velocita: velocitaSpenta ? `non misurata: ${velocitaSpenta}` : 'misurata',
    riassunto,
    meseScorso: meseScorso?.riassunto ? { letto: meseScorso.letto, ...meseScorso.riassunto, perPagina: Object.fromEntries((meseScorso.pagine || []).map((p) => [p.pagina, { indicizzata: p.indicizzazione?.esito === 'PASS', velocita: p.velocita?.punteggio ?? null, lcp: p.velocita?.lcp ?? null, viste: p.google?.viste ?? 0, clic: p.google?.clic ?? 0 }])) } : null,
    collegamentiDelMenu: delMenu,
    pagine,
    contattiFuoriSitemap: fuoriSitemap,
    visite: visite.assente ? { assente: visite.assente } : { contatoreAttivoDal: visite.contatoreAttivoDal, periodo: visite.periodo, avvertenza: visite.avvertenza },
    ricerche: { periodo: google.periodo, avvertenza: 'Senza le ricerche del marchio e dei numeri di telefono. Solo quelle con almeno 3 viste, le prime 400.', elenco: google.ricerche },
  };
  writeFileSync(FILE, `${JSON.stringify(uscita, null, 1)}\n`);

  console.log(`Pagine: ${riassunto.pagine} · indicizzate: ${riassunto.indicizzate} · non indicizzate: ${riassunto.nonIndicizzate.length}`);
  console.log(`Velocità: ${uscita.velocita}${riassunto.velocitaMedia != null ? ` · punteggio medio ${riassunto.velocitaMedia}` : ''}`);
  console.log(`Ricerche (90 giorni): ${google.ricerche.length} · contatti per pagina: ${Object.keys(contatti).length} pagine`);
  console.log(`Scritto ${FILE}`);
}

main().catch((e) => {
  console.error(`Controllo SEO del mese non riuscito: ${e.message}`);
  process.exit(1);
});
