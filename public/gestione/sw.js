// Service worker dell'app Gestione (dal 15 ott 2026). Serve solo a farla
// aprire anche senza campo: prima l'app chiusa e senza rete non si apriva
// proprio. Sempre prima la rete, così il telefono prende subito ogni versione
// nuova; la copia salvata solo se la rete manca o non risponde entro 6
// secondi (campo che va e viene). Non tocca /api/ (i dati li tiene l'app nel
// telefono) né la mappa (Leaflet e cartine: senza rete la mappa lo dice).
const CASSETTO = 'gestione';
const ATTESA = 6000;
const PAGINA = '/gestione/';

// app.js?v=21 e app.js?v=22 sono lo stesso file: si tiene solo l'ultimo.
async function metti(cassetto, chiave, risposta) {
  await cassetto.put(chiave, risposta);
  const u = new URL(typeof chiave === 'string' ? chiave : chiave.url, location.origin);
  if (!u.search) return;
  for (const vecchia of await cassetto.keys()) {
    const v = new URL(vecchia.url);
    if (v.pathname === u.pathname && v.search !== u.search) await cassetto.delete(vecchia);
  }
}

// All'installazione si mettono da parte la pagina e i suoi file: così l'app
// si apre senza campo anche se dopo il primo giro non è mai stata riaperta.
self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    try {
      const cassetto = await caches.open(CASSETTO);
      const pagina = await fetch(PAGINA, { cache: 'no-store' });
      if (!pagina.ok) return;
      const html = await pagina.clone().text();
      await cassetto.put(PAGINA, pagina);
      for (const f of html.match(/\/gestione\/(?:app\.(?:js|css)\?v=\d+|manifest\.webmanifest)/g) || []) {
        const r = await fetch(f, { cache: 'no-store' }).catch(() => null);
        if (r && r.ok) await metti(cassetto, f, r);
      }
    } catch { /* si riempie alla prossima apertura */ }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(PAGINA) || u.pathname.endsWith('/sw.js')) return;
  // La pagina sotto un nome solo: il codice dopo il # (icona sulla Home) qui non arriva.
  const chiave = e.request.mode === 'navigate' ? PAGINA : e.request;
  const rete = fetch(e.request).catch(() => null);
  // Ogni risposta buona aggiorna la copia (clonata subito, prima che la
  // pagina ne legga il contenuto).
  e.waitUntil(rete.then((r) => {
    if (!r || !r.ok) return null;
    const copia = r.clone();
    return caches.open(CASSETTO).then((c) => metti(c, chiave, copia));
  }).catch(() => {}));
  e.respondWith((async () => {
    const salvata = await caches.match(chiave, { cacheName: CASSETTO });
    if (!salvata) return (await rete) || Response.error();
    const tardi = new Promise((ok) => setTimeout(() => ok(null), ATTESA));
    return (await Promise.race([rete, tardi])) || salvata;
  })());
});
