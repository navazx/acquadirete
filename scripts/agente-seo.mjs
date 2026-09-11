#!/usr/bin/env node
// ============================================================================
//  AGENTE SEO TECNICO — il controllo del sito, ogni lunedi' su GitHub Actions
//
//  Legge la sitemap e passa ogni pagina come la vedrebbe Google:
//
//    rotto          pagina della sitemap che non risponde 200, link interno che
//                   da' 404/500, redirect delle vecchie pagine ASP.NET che non
//                   porta piu' dove deve, pagina con noindex, JSON-LD illeggibile,
//                   robots.txt o sitemap irraggiungibili
//    da sistemare   titolo oltre 60 caratteri o assente, description oltre 160 o
//                   assente, titoli e description doppi, piu' o meno di un H1,
//                   canonical assente o diverso dall'indirizzo, immagini senza
//                   alt o pesanti, link interni che passano da un redirect,
//                   pagine a cui nessun'altra pagina porta
//
//  Su Telegram manda i problemi NUOVI, e ripete solo i rotti ancora aperti:
//  i "da sistemare" gia' segnalati non vengono ripetuti ogni settimana, sennò
//  si smette di leggere. Se non c'e' niente di nuovo e niente di rotto, tace.
//
//  Lo stato resta in agenti/seo/controllo.json: e' da li' che l'agente che
//  prepara le correzioni sa cosa sistemare.
//
//  Guarda solo pagine pubbliche: non ha bisogno di nessuna chiave.
//
//  Prova (stampa il messaggio, non manda niente e non scrive lo stato):
//    node scripts/agente-seo.mjs --prova
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SITO = (process.env.SITO_URL || 'https://www.acquadirete.it').replace(/\/+$/, '');
const HOST_NOSTRI = new Set([new URL(SITO).host, 'acquadirete.it', 'www.acquadirete.it']);
const STATO = 'agenti/seo/controllo.json';

const MAX_TITOLO = 60;
const MAX_DESCRIPTION = 160;
const IMMAGINE_PESANTE = 400 * 1024;

// Le vecchie pagine del sito ASP.NET ancora indicizzate: devono portare qui.
// Erano i controlli della routine "guardiano-404-redirect".
const REDIRECT_ATTESI = [
  ['/paginaseo/3.vendita-depuratori-acqua-prato.aspx', '/depuratore-acqua-prato/'],
  ['/paginaseo/15.depuratori-a-osmosi-inversa-a-scandicci', '/osmosi-inversa-firenze/'],
  ['/default.aspx', '/'],
  ['/scheda/23.modelli-a-colonna-da-terra-per-ufficio', '/depuratore-acqua-uffici-firenze/'],
  ['/Foto/Pagine/26/Marmaris/', '/'],
];

const prova = process.argv.includes('--prova');
const percorso = (url) => { try { return new URL(url).pathname; } catch { return url; } };
const kb = (b) => `${Math.round(b / 1024)} KB`;

function decodifica(s = '') {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

async function scarica(url, metodo = 'GET') {
  try {
    const res = await fetch(url, {
      method: metodo,
      redirect: 'manual',
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'acquadirete-controllo-seo' },
    });
    return {
      stato: res.status,
      dove: res.headers.get('location'),
      peso: Number(res.headers.get('content-length') || 0),
      testo: metodo === 'GET' ? await res.text() : '',
    };
  } catch (e) {
    return { stato: 0, errore: e.message, testo: '' };
  }
}

async function inParallelo(elementi, quanti, fn) {
  const risultati = new Array(elementi.length);
  let prossimo = 0;
  const lavoratori = Array.from({ length: Math.min(quanti, elementi.length) }, async () => {
    while (prossimo < elementi.length) {
      const i = prossimo++;
      risultati[i] = await fn(elementi[i], i);
    }
  });
  await Promise.all(lavoratori);
  return risultati;
}

/** Link interno normalizzato, o null se esterno / non una pagina. */
function interno(href, pagina) {
  if (!href || /^(mailto:|tel:|javascript:|#)/i.test(href)) return null;
  let u;
  try { u = new URL(href, pagina); } catch { return null; }
  if (!HOST_NOSTRI.has(u.host)) return null;
  u.hash = '';
  return `${SITO}${u.pathname}${u.search}`;
}

function analizza(url, html) {
  const titolo = decodifica((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map((m) => m[0]);
  const attr = (tag, nome) => decodifica((tag.match(new RegExp(`\\s${nome}="([^"]*)"`, 'i')) || [])[1]);
  const description = meta.filter((t) => /\sname="description"/i.test(t)).map((t) => attr(t, 'content'))[0];
  const noindex = meta.some((t) => /\sname="robots"/i.test(t) && /noindex/i.test(attr(t, 'content')));
  const canonical = [...html.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]).filter((t) => /\srel="canonical"/i.test(t)).map((t) => attr(t, 'href'))[0];
  const h1 = (html.match(/<h1[\s>]/gi) || []).length;

  const jsonld = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => {
    try { JSON.parse(m[1]); return true; } catch { return false; }
  });

  const immagini = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const senzaAlt = immagini.filter((t) => !/\salt=/i.test(t)).length;
  const srcImmagini = immagini.map((t) => interno(attr(t, 'src'), url)).filter(Boolean);

  const link = [...html.matchAll(/<a\b[^>]*\shref="([^"]+)"/gi)].map((m) => interno(decodifica(m[1]), url)).filter(Boolean);

  return { titolo, description, noindex, canonical, h1, jsonld, senzaAlt, srcImmagini, link };
}

export async function controllaSito() {
  const problemi = [];
  const aggiungi = (gravita, chiave, pagina, testo) => problemi.push({ gravita, chiave, pagina: percorso(pagina), testo });

  // --- robots e sitemap -----------------------------------------------------
  const robots = await scarica(`${SITO}/robots.txt`);
  if (robots.stato !== 200) aggiungi('rotto', 'robots', '/robots.txt', `robots.txt risponde ${robots.stato || robots.errore}`);
  else if (!/sitemap:/i.test(robots.testo)) aggiungi('da sistemare', 'robots-sitemap', '/robots.txt', 'robots.txt non indica la sitemap');

  const sitemap = await scarica(`${SITO}/sitemap.xml`);
  if (sitemap.stato !== 200) {
    aggiungi('rotto', 'sitemap', '/sitemap.xml', `la sitemap risponde ${sitemap.stato || sitemap.errore}: senza, non si può controllare altro`);
    return { problemi, pagine: 0, link: 0 };
  }
  const pagine = [...sitemap.testo.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);

  // --- le pagine --------------------------------------------------------------
  const letture = await inParallelo(pagine, 6, async (url) => ({ url, r: await scarica(url) }));
  const analisi = [];
  for (const { url, r } of letture) {
    if (r.stato !== 200) {
      const dove = r.dove ? ` verso ${percorso(new URL(r.dove, url).href)}` : '';
      aggiungi('rotto', `pagina-${r.stato}`, url, `pagina della sitemap che risponde ${r.stato || r.errore}${dove}`);
      continue;
    }
    const a = analizza(url, r.testo);
    analisi.push({ url, ...a });

    if (a.noindex) aggiungi('rotto', 'noindex', url, 'ha "noindex": Google non la mette nei risultati, eppure sta nella sitemap');
    if (a.jsonld.some((ok) => !ok)) aggiungi('rotto', 'jsonld-rotto', url, 'dati strutturati (JSON-LD) illeggibili');
    if (!a.jsonld.length) aggiungi('da sistemare', 'jsonld-assente', url, 'nessun dato strutturato (JSON-LD)');

    if (!a.titolo) aggiungi('da sistemare', 'titolo-assente', url, 'manca il titolo');
    else if (a.titolo.length > MAX_TITOLO) aggiungi('da sistemare', 'titolo-lungo', url, `titolo di ${a.titolo.length} caratteri, oltre ${MAX_TITOLO}: "${a.titolo}"`);

    if (!a.description) aggiungi('da sistemare', 'description-assente', url, 'manca la meta description');
    else if (a.description.length > MAX_DESCRIPTION) aggiungi('da sistemare', 'description-lunga', url, `description di ${a.description.length} caratteri, oltre ${MAX_DESCRIPTION}`);

    if (a.h1 !== 1) aggiungi('da sistemare', 'h1', url, a.h1 ? `${a.h1} titoli H1, ne va uno` : 'nessun titolo H1');

    if (!a.canonical) aggiungi('da sistemare', 'canonical-assente', url, 'manca il canonical');
    else if (interno(a.canonical, url) !== interno(url, url)) aggiungi('da sistemare', 'canonical-diverso', url, `il canonical punta a ${a.canonical} invece che a sé stessa`);

    if (a.senzaAlt) aggiungi('da sistemare', 'alt', url, `${a.senzaAlt} immagini senza testo alternativo`);
  }

  // --- titoli e description doppi -------------------------------------------
  for (const campo of ['titolo', 'description']) {
    const gruppi = new Map();
    for (const a of analisi) if (a[campo]) gruppi.set(a[campo], [...(gruppi.get(a[campo]) || []), percorso(a.url)]);
    for (const [valore, dove] of gruppi) {
      if (dove.length > 1) {
        aggiungi('da sistemare', `${campo}-doppio`, dove[0], `${campo === 'titolo' ? 'stesso titolo' : 'stessa description'} su ${dove.length} pagine: ${dove.join(', ')}${campo === 'titolo' ? ` ("${valore}")` : ''}`);
      }
    }
  }

  // --- link interni -------------------------------------------------------------
  const daDove = new Map();
  for (const a of analisi) for (const l of new Set(a.link)) daDove.set(l, [...(daDove.get(l) || []), percorso(a.url)]);
  const destinazioni = [...daDove.keys()];
  const esiti = await inParallelo(destinazioni, 8, async (l) => {
    let r = await scarica(l, 'HEAD');
    if (r.stato === 405) r = await scarica(l);
    return { l, r };
  });
  for (const { l, r } of esiti) {
    const linkata = daDove.get(l);
    const dove = `linkata da ${linkata.slice(0, 3).join(', ')}${linkata.length > 3 ? ` e altre ${linkata.length - 3}` : ''}`;
    if (r.stato === 0 || r.stato >= 400) {
      aggiungi('rotto', `link-${r.stato}`, l, `link interno che risponde ${r.stato || r.errore} (${dove})`);
    } else if (r.stato >= 300) {
      const verso = r.dove ? percorso(new URL(r.dove, l).href) : '?';
      aggiungi('da sistemare', 'link-redirect', l, `link interno che passa da un redirect verso ${verso}: meglio linkare direttamente quello (${dove})`);
    }
  }

  // --- pagine orfane ------------------------------------------------------------
  const home = `${SITO}/`;
  for (const a of analisi) {
    if (a.url === home) continue;
    const entranti = (daDove.get(interno(a.url, a.url)) || []).filter((p) => p !== percorso(a.url));
    if (!entranti.length) aggiungi('da sistemare', 'orfana', a.url, 'nessun\'altra pagina del sito porta qui: Google la trova solo dalla sitemap');
  }

  // --- immagini pesanti -------------------------------------------------------
  const immagini = [...new Set(analisi.flatMap((a) => a.srcImmagini))];
  const pesi = await inParallelo(immagini, 8, async (src) => ({ src, r: await scarica(src, 'HEAD') }));
  for (const { src, r } of pesi) {
    if (r.stato === 200 && r.peso > IMMAGINE_PESANTE) {
      aggiungi('da sistemare', 'immagine-pesante', src, `immagine di ${kb(r.peso)}: rallenta la pagina, soprattutto da telefono`);
    }
  }

  // --- redirect delle vecchie pagine -------------------------------------------
  for (const [da, a] of REDIRECT_ATTESI) {
    const r = await scarica(`${SITO}${da}`);
    const verso = r.dove ? percorso(new URL(r.dove, SITO).href) : null;
    if (r.stato !== 301 || verso !== a) {
      aggiungi('rotto', 'redirect-vecchio', da, `la vecchia pagina dovrebbe portare con un 301 a ${a}, invece risponde ${r.stato || r.errore}${verso ? ` verso ${verso}` : ''}`);
    }
  }

  return { problemi, pagine: pagine.length, link: destinazioni.length, immagini: immagini.length };
}

function componiMessaggio({ problemi, pagine, link }, precedenti) {
  const chiave = (p) => `${p.chiave}|${p.pagina}`;
  const giaVisti = new Set(precedenti.map(chiave));
  const nuovi = problemi.filter((p) => !giaVisti.has(chiave(p)));
  const rottiVecchi = problemi.filter((p) => giaVisti.has(chiave(p)) && p.gravita === 'rotto');
  const apertiVecchi = problemi.filter((p) => giaVisti.has(chiave(p)) && p.gravita !== 'rotto');
  const risolti = precedenti.filter((p) => !problemi.some((q) => chiave(q) === chiave(p)));

  if (!nuovi.length && !rottiVecchi.length) return { testo: null, nuovi, risolti };

  const elenco = (lista, max = 12) =>
    lista.slice(0, max).map((p) => `• ${p.pagina} — ${p.testo}`).join('\n') +
    (lista.length > max ? `\n…e altri ${lista.length - max}.` : '');

  const blocchi = [`Controllo SEO del sito — ${new Date().toLocaleDateString('it-IT')}`, `${pagine} pagine e ${link} link interni controllati.`];
  const nuoviRotti = nuovi.filter((p) => p.gravita === 'rotto');
  const nuoviDaSistemare = nuovi.filter((p) => p.gravita !== 'rotto');
  if (nuoviRotti.length) blocchi.push(`ROTTO, DA SISTEMARE SUBITO (${nuoviRotti.length})\n${elenco(nuoviRotti)}`);
  if (rottiVecchi.length) blocchi.push(`ANCORA ROTTO DALLA SETTIMANA SCORSA (${rottiVecchi.length})\n${elenco(rottiVecchi)}`);
  if (nuoviDaSistemare.length) blocchi.push(`NUOVI, DA SISTEMARE (${nuoviDaSistemare.length})\n${elenco(nuoviDaSistemare)}`);
  const coda = [];
  if (risolti.length) coda.push(`${risolti.length} problemi della volta scorsa sono risolti.`);
  if (apertiVecchi.length) coda.push(`Restano aperti ${apertiVecchi.length} punti "da sistemare" già segnalati.`);
  if (coda.length) blocchi.push(coda.join(' '));

  return { testo: blocchi.join('\n\n'), nuovi, risolti };
}

async function main() {
  const precedente = existsSync(STATO) ? JSON.parse(readFileSync(STATO, 'utf8')) : { problemi: [] };
  const esito = await controllaSito();
  const { testo, nuovi, risolti } = componiMessaggio(esito, precedente.problemi || []);

  const primaVolta = new Map((precedente.problemi || []).map((p) => [`${p.chiave}|${p.pagina}`, p.primaVolta]));
  const oggi = new Date().toISOString().slice(0, 10);
  const stato = {
    controllato: new Date().toISOString(),
    pagine: esito.pagine,
    linkInterni: esito.link,
    problemi: esito.problemi.map((p) => ({ ...p, primaVolta: primaVolta.get(`${p.chiave}|${p.pagina}`) || oggi })),
  };

  if (prova) {
    console.log(`(prova: niente Telegram, niente stato)\n${esito.pagine} pagine, ${esito.link} link, ${esito.immagini} immagini, ${esito.problemi.length} problemi, ${nuovi.length} nuovi, ${risolti.length} risolti.\n`);
    console.log(testo || 'Niente di nuovo e niente di rotto: il messaggio non partirebbe.');
    return;
  }

  mkdirSync('agenti/seo', { recursive: true });
  writeFileSync(STATO, `${JSON.stringify(stato, null, 2)}\n`);

  if (testo) {
    const { messaggio } = await import('./lib/telegram.mjs');
    await messaggio(testo);
    console.log(`Messaggio inviato: ${nuovi.length} nuovi.`);
  } else {
    console.log('Niente di nuovo e niente di rotto: nessun messaggio.');
  }
}

const lanciatoDaTerminale = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (lanciatoDaTerminale) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
