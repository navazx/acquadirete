// Server di prova in locale per l'app /gestione/ (quella del telefono di
// babbo). `next dev` non fa girare le funzioni Netlify, quindi qui c'è un
// server minimo che serve public/ e risponde a /api/gestione con la stessa
// funzione che va in produzione.
//
//   node scripts/gestione-locale.mjs          → FINTO (predefinito): legge il
//        Gestionale vero una volta, con la chiave di SOLA LETTURA, e poi
//        scrive su una copia in memoria. Si possono provare tutti i pulsanti
//        senza toccare il foglio vero. GET /__finto?tab=… mostra la copia.
//   node scripts/gestione-locale.mjs --vero   → legge il foglio vero a ogni
//        richiesta; le scritture falliscono (la chiave è di sola lettura).
//
// Apri http://localhost:3005/gestione/#chiave=provalocale-0000-0000
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const QUI = fileURLToPath(new URL('..', import.meta.url));
const PUBBLICA = join(QUI, 'public');
const PORTA = 3005;
const VERO = process.argv.includes('--vero');

process.env.GSC_KEY_JSON = readFileSync(join(QUI, '..', 'seo-report', 'gsc-key-readonly.json'), 'utf8');
process.env.LEADS_SHEET_ID = '1jmR0DXP_25ZTniBgemRj0hEmXxcrCdxj89y4DxciHBk';
process.env.GESTIONE_CHIAVE = 'prova:provalocale-0000-0000';

const { creaGestore } = await import('../netlify/functions/gestione.mjs');
const { creaFoglioGoogle, piuMesi, dataDaSeriale, serialeDa, TAB_CLIENTI, TAB_LEAD } =
  await import('../netlify/functions/_shared/gestionale.mjs');

// ---------------------------------------------------------------------------
//  Foglio finto in memoria
// ---------------------------------------------------------------------------
const numeroColonna = (l) => [...l].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);

function leggiRange(range) {
  const m = range.match(/^'?(.+?)'?!([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) throw new Error('Range non capito: ' + range);
  return {
    tab: m[1],
    c1: numeroColonna(m[2]), r1: +m[3],
    c2: numeroColonna(m[4] || m[2]), r2: +(m[5] || m[3]),
  };
}

async function creaFoglioFinto() {
  const vero = creaFoglioGoogle(process.env.LEADS_SHEET_ID);
  const schede = {
    [TAB_CLIENTI]: await vero.leggi(`'${TAB_CLIENTI}'!A1:Z1500`, 'FORMULA'),
    // I lead si leggono sempre formattati: basta il testo.
    [TAB_LEAD]: await vero.leggi(`'${TAB_LEAD}'!A1:Z2000`, 'FORMATTED_VALUE'),
  };
  console.log(`Copia in memoria: ${schede[TAB_CLIENTI].length} righe clienti, ${schede[TAB_LEAD].length} righe lead`);

  const cella = (tab, r, c) => ((schede[tab] || [])[r - 1] || [])[c - 1];
  const metti = (tab, r, c, v) => {
    const g = (schede[tab] ||= []);
    while (g.length < r) g.push([]);
    const riga = g[r - 1];
    while (riga.length < c) riga.push('');
    riga[c - 1] = v;
  };
  // Solo la formula che usano le automazioni: EDATE su installazione e frequenza.
  const calcola = (tab, v) => {
    if (typeof v !== 'string' || !v.startsWith('=')) return v;
    const m = v.match(/EDATE\(\$([A-Z]+)(\d+);\$([A-Z]+)(\d+)\)/);
    if (!m) return '#FORMULA?';
    const inst = cella(tab, +m[2], numeroColonna(m[1]));
    const freq = cella(tab, +m[4], numeroColonna(m[3]));
    if (inst === '' || inst == null || freq === '' || freq == null) return '';
    const d = piuMesi(dataDaSeriale(+inst), +freq);
    return serialeDa(d.a, d.m, d.g);
  };

  const finto = {
    schede,
    async leggi(range, render) {
      const { tab, r1, c1, r2, c2 } = leggiRange(range);
      const fuori = [];
      for (let r = r1; r <= Math.min(r2, (schede[tab] || []).length); r++) {
        const riga = [];
        for (let c = c1; c <= c2; c++) {
          const v = cella(tab, r, c);
          riga.push(v == null ? '' : render === 'FORMULA' ? v : calcola(tab, v));
        }
        while (riga.length && riga[riga.length - 1] === '') riga.pop();
        fuori.push(riga);
      }
      while (fuori.length && !fuori[fuori.length - 1].length) fuori.pop();
      return fuori;
    },
    async scrivi(data, opzione) {
      for (const { range, values } of data) {
        const { tab, r1, c1 } = leggiRange(range);
        console.log(`  scrivo ${opzione.padEnd(12)} ${range} = ${JSON.stringify(values[0][0])}`);
        metti(tab, r1, c1, values[0][0]);
      }
    },
    async svuota(range) {
      const { tab, r1, c1, r2, c2 } = leggiRange(range);
      console.log(`  svuoto ${range}`);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) metti(tab, r, c, '');
    },
    async copiaFormato(tab, da, a) { console.log(`  formato riga ${da} → ${a} (${tab})`); },
    async copiaCella(tab, r1, c1, r2, c2) { console.log(`  formato cella ${r1},${c1} → ${r2},${c2} (${tab})`); },
    // In produzione è appendOrMergeRow (anti-doppioni del sito); qui accoda e basta.
    async accodaLead(riga) {
      const g = schede[TAB_LEAD];
      g.push(riga.map(String));
      console.log(`  accodo lead riga ${g.length} = ${JSON.stringify(riga)}`);
      return { doppione: false, riga: g.length };
    },
    async accoda(tab, intestazioni, riga) {
      const g = (schede[tab] ||= [intestazioni]);
      g.push(riga);
      const range = `'${tab}'!A${g.length}:${String.fromCharCode(64 + riga.length)}${g.length}`;
      console.log(`  accodo ${range} = ${JSON.stringify(riga)}`);
      return range;
    },
  };
  return finto;
}

const finto = VERO ? null : await creaFoglioFinto();
const gestore = creaGestore(VERO ? creaFoglioGoogle : () => finto);

// ---------------------------------------------------------------------------
//  Server
// ---------------------------------------------------------------------------
const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORTA}`);
  try {
    if (url.pathname === '/api/gestione') {
      const pezzi = [];
      for await (const p of req) pezzi.push(p);
      const risposta = await gestore(new Request(url, {
        method: req.method,
        headers: req.headers,
        body: req.method === 'GET' ? undefined : Buffer.concat(pezzi),
      }));
      console.log(`${req.method} /api/gestione → ${risposta.status}`);
      res.writeHead(risposta.status, Object.fromEntries(risposta.headers));
      res.end(Buffer.from(await risposta.arrayBuffer()));
      return;
    }
    if (url.pathname === '/__finto' && finto) {
      const tab = url.searchParams.get('tab') || TAB_CLIENTI;
      const g = finto.schede[tab] || [];
      const cerca = (url.searchParams.get('cerca') || '').toUpperCase();
      const righe = g.map((r, i) => [i + 1, ...r]).filter((r) => !cerca || r.join(' ').toUpperCase().includes(cerca));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(cerca ? righe : righe.slice(-5), null, 1));
      return;
    }
    let percorso = normalize(join(PUBBLICA, decodeURIComponent(url.pathname)));
    if (!percorso.startsWith(PUBBLICA)) { res.writeHead(403); res.end(); return; }
    if (existsSync(percorso) && statSync(percorso).isDirectory()) percorso = join(percorso, 'index.html');
    if (!existsSync(percorso)) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': TIPI[extname(percorso)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(readFileSync(percorso));
  } catch (err) {
    console.error(err);
    res.writeHead(500); res.end(String(err));
  }
}).listen(PORTA, () => {
  console.log(`${VERO ? 'VERO (sola lettura)' : 'FINTO (scritture in memoria)'} → http://localhost:${PORTA}/gestione/#chiave=provalocale-0000-0000`);
});
