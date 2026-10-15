// Service worker dell'app Gestione (dal 15 ott 2026). Serve solo a farla
// funzionare anche senza campo: prima l'app chiusa e senza rete non si apriva
// proprio, e la mappa diceva «serve internet».
//   - L'app (pagina, app.js, app.css): sempre prima la rete, così il telefono
//     prende subito ogni versione nuova; la copia salvata solo se la rete
//     manca o non risponde entro 6 secondi (campo che va e viene).
//   - La libreria della mappa (Leaflet da cdnjs, indirizzo con la versione,
//     non cambia mai): dalla copia salvata appena c'è.
//   - Le cartine di OpenStreetMap: come l'app, prima la rete (che passa dalla
//     memoria normale del browser, quindi non si chiede a OpenStreetMap più
//     di prima). Si tengono le ultime 800 viste (~30 MB): senza rete si vede
//     la mappa delle zone già guardate. Mai scaricate in anticipo: le regole
//     di OpenStreetMap lo vietano.
// Non tocca /api/ (i dati li tiene l'app nel telefono) né OpenStreetMap per
// la ricerca degli indirizzi.
const CASSETTO = 'gestione';
const CARTINE = 'gestione-cartine';
const MAX_CARTINE = 800;
const PAGINA = '/gestione/';
const LIBRERIA = /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/leaflet\//;
const TESSERA = /^https:\/\/tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/;

// app.js?v=21 e app.js?v=22 sono lo stesso file: si tiene solo l'ultimo.
async function metti(nome, chiave, risposta) {
  const cassetto = await caches.open(nome);
  await cassetto.put(chiave, risposta);
  const u = new URL(typeof chiave === 'string' ? chiave : chiave.url, location.origin);
  if (!u.search) return;
  for (const vecchia of await cassetto.keys()) {
    const v = new URL(vecchia.url);
    if (v.pathname === u.pathname && v.search !== u.search) await cassetto.delete(vecchia);
  }
}

let cartineMesse = 0;
async function tagliaCartine() {
  const cassetto = await caches.open(CARTINE);
  const chiavi = await cassetto.keys();
  for (const k of chiavi.slice(0, Math.max(0, chiavi.length - MAX_CARTINE))) await cassetto.delete(k);
}

// Prima la rete; la copia salvata se la rete manca o non risponde in tempo.
function primaRete(e, nome, chiave, attesa) {
  const rete = fetch(e.request).catch(() => null);
  // Ogni risposta buona aggiorna la copia (clonata subito, prima che la
  // pagina ne legga il contenuto).
  e.waitUntil(rete.then((r) => {
    if (!r || !r.ok) return null;
    const copia = r.clone();
    return metti(nome, chiave, copia).then(() => {
      if (nome === CARTINE && ++cartineMesse % 100 === 0) return tagliaCartine();
      return null;
    });
  }).catch(() => {}));
  return (async () => {
    const salvata = await caches.match(chiave, { cacheName: nome });
    if (!salvata) return (await rete) || Response.error();
    const tardi = new Promise((ok) => setTimeout(() => ok(null), attesa));
    return (await Promise.race([rete, tardi])) || salvata;
  })();
}

// Prima la copia salvata (file che a quell'indirizzo non cambiano mai).
async function primaSalvata(e, nome) {
  const salvata = await caches.match(e.request, { cacheName: nome });
  if (salvata) return salvata;
  const r = await fetch(e.request);
  if (r.ok) { const copia = r.clone(); e.waitUntil(metti(nome, e.request, copia).catch(() => {})); }
  return r;
}

// All'installazione si mettono da parte la pagina e i suoi file: così l'app
// si apre senza campo anche se dopo il primo giro non è mai stata riaperta.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    try {
      const pagina = await fetch(PAGINA, { cache: 'no-store' });
      if (!pagina.ok) return;
      const html = await pagina.clone().text();
      await metti(CASSETTO, PAGINA, pagina);
      for (const f of html.match(/\/gestione\/(?:app\.(?:js|css)\?v=\d+|manifest\.webmanifest)/g) || []) {
        const r = await fetch(f, { cache: 'no-store' }).catch(() => null);
        if (r && r.ok) await metti(CASSETTO, f, r);
      }
    } catch { /* si riempie alla prossima apertura */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (LIBRERIA.test(url)) { e.respondWith(primaSalvata(e, CASSETTO)); return; }
  if (TESSERA.test(url)) { e.respondWith(primaRete(e, CARTINE, e.request, 4000)); return; }
  const u = new URL(url);
  if (u.origin !== location.origin || !u.pathname.startsWith(PAGINA) || u.pathname.endsWith('/sw.js')) return;
  // La pagina sotto un nome solo: il codice dopo il # (icona sulla Home) qui non arriva.
  e.respondWith(primaRete(e, CASSETTO, e.request.mode === 'navigate' ? PAGINA : e.request, 6000));
});
