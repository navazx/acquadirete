#!/usr/bin/env node
// ============================================================================
//  Le date di aggiornamento: dicono a Google quale pagina è cambiata (26 ott 2026)
//
//  "Richiedi indicizzazione" esiste solo in Search Console, a mano: un agente non
//  può premerlo. Quello che può fare è dirlo nella mappa del sito
//  (app/sitemap.ts), che per ogni pagina scrive il giorno in cui è cambiata:
//  Google ripassa prima da quelle cambiate. Funziona solo se la data è vera.
//  Prima la mappa sbagliava nei due sensi: gli articoli avevano sempre il giorno
//  di uscita (corretti dall'agente SEO, per Google erano fermi a luglio) e le
//  pagine il giorno della pubblicazione del sito (cambiate tutte a ogni deploy,
//  e Google smette di crederci).
//
//  Qui si confronta il sito com'era (un commit) con com'è adesso, e chi è
//  cambiato prende la data di oggi:
//    - gli articoli: updatedAt dentro lib/blogPosts.ts;
//    - le pagine: lib/aggiornamenti.ts. Una pagina è cambiata se cambia il suo
//      app/<indirizzo>/page.tsx o la sua voce in lib/data.ts (la home: anche
//      components/HomeView.tsx). I pezzi comuni (menu, piede, impaginazione)
//      non contano: non cambiano quello che la pagina dice.
//
//  Lo chiama scripts/risposte.mjs quando unisce a main una proposta approvata:
//  così la data è quella in cui la modifica va online. Dal PC, dopo aver
//  cambiato a mano un articolo o una pagina:
//    node scripts/lib/date-aggiornamento.mjs            (confronta con origin/main)
//    node scripts/lib/date-aggiornamento.mjs --da <commit>
// ============================================================================

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const BLOG = 'lib/blogPosts.ts';
const DATI = 'lib/data.ts';
const ROTTE = 'lib/routes.ts';
export const DATE = 'lib/aggiornamenti.ts';

// Una voce comincia dalla sua prima riga: lo slug di un articolo, la chiave di
// una pagina dei servizi in SERVICES_INFO. Un articolo (i filtri) è scritto
// alla JSON, con le chiavi fra virgolette: valgono tutti e due i modi.
const ARTICOLO = /^ {4}"?slug"?: ['"]([^'"]+)['"]/gm;
const SERVIZIO = /^ {2}(\w+): \{$/gm;

export const oggiRoma = (quando = new Date()) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Rome' }).format(quando);

const lf = (t) => t.replace(/\r\n/g, '\n');

export function alCommit(ref) {
  return (file) => {
    try {
      return lf(execFileSync('git', ['show', `${ref}:${file}`], { encoding: 'utf8', maxBuffer: 64e6, stdio: ['ignore', 'pipe', 'ignore'] }));
    } catch { return ''; }
  };
}

export function suDisco(file) {
  try { return lf(readFileSync(file, 'utf8')); } catch { return ''; }
}

// Dove comincia e finisce ogni voce: fino alla voce dopo, o alla chiusura
// dell'elenco per l'ultima.
function voci(testo, inizio) {
  const trovate = [...testo.matchAll(inizio)];
  return trovate.map((m, i) => {
    let a = trovate[i + 1]?.index ?? testo.length;
    const chiusura = testo.slice(m.index, a).search(/\n(\];|\};)/);
    if (chiusura >= 0) a = m.index + chiusura;
    return { chiave: m[1], da: m.index, a };
  });
}

// La riga della data non conta: altrimenti metterla farebbe cambiare la voce.
const senzaData = (s) => s.split('\n').filter((r) => !/^\s*"?updatedAt"?:/.test(r)).join('\n');

function cambiate(prima, dopo, inizio) {
  const vecchie = Object.fromEntries(voci(prima, inizio).map((v) => [v.chiave, senzaData(prima.slice(v.da, v.a))]));
  return voci(dopo, inizio)
    .filter((v) => v.chiave in vecchie && vecchie[v.chiave] !== senzaData(dopo.slice(v.da, v.a)))
    .map((v) => v.chiave);
}

export function indirizzi(rotte) {
  const blocco = rotte.slice(rotte.indexOf('ROUTES'), rotte.indexOf('};', rotte.indexOf('ROUTES')));
  return Object.fromEntries([...blocco.matchAll(/^\s+(\w+): '(\/[^']*)'/gm)].map((m) => [m[1], m[2]]));
}

const fileDellaPagina = (id, indirizzo) =>
  [indirizzo === '/' ? 'app/page.tsx' : `app${indirizzo}/page.tsx`, ...(id === 'home' ? ['components/HomeView.tsx'] : [])];

// Chi è cambiato fra due versioni del sito: un articolo nuovo o una pagina nuova
// non c'erano prima, e non contano (per loro vale il giorno di uscita).
export function trovaCambiate(prima, dopo) {
  const articoli = cambiate(prima(BLOG), dopo(BLOG), ARTICOLO);
  const servizi = cambiate(prima(DATI), dopo(DATI), SERVIZIO);
  const pagine = Object.entries(indirizzi(dopo(ROTTE)))
    .filter(([id, indirizzo]) => servizi.includes(id) || fileDellaPagina(id, indirizzo).some((f) => {
      const vecchio = prima(f);
      return vecchio !== '' && vecchio !== dopo(f);
    }))
    .map(([id]) => id);
  return { articoli, pagine };
}

export function datoArticolo(testo, slug, data) {
  const v = voci(testo, ARTICOLO).find((x) => x.chiave === slug);
  let blocco = testo.slice(v.da, v.a);
  const uscita = blocco.match(/^\s*"?publishedAt"?: ['"]([^'"]*)['"]/m)?.[1] ?? '';
  if (data <= uscita) return testo;
  blocco = /^\s*"?updatedAt"?:/m.test(blocco)
    ? blocco.replace(/^(\s*"?updatedAt"?: )(['"])[^'"]*['"]/m, (_, chiave, q) => `${chiave}${q}${data}${q}`)
    : blocco.replace(/^(\s*)("?)publishedAt"?: (['"])[^'"]*['"],\n/m,
      (riga, spazi, k, q) => `${riga}${spazi}${k}updatedAt${k}: ${q}${data}${q},\n`);
  return testo.slice(0, v.da) + blocco + testo.slice(v.a);
}

const datoPagina = (testo, id, data) => testo.replace(new RegExp(`^(\\s+${id}: )'[^']*'`, 'm'), `$1'${data}'`);

// Riscrive il file tenendo i suoi a capo (in Windows il checkout li fa \r\n).
function riscrivi(file, cambia) {
  const originale = readFileSync(file, 'utf8');
  const nuovo = cambia(lf(originale));
  if (nuovo === lf(originale)) return false;
  writeFileSync(file, originale.includes('\r\n') ? nuovo.replace(/\n/g, '\r\n') : nuovo);
  return true;
}

// Mette la data di oggi a chi è cambiato rispetto a `da`. Ritorna chi ha segnato.
export function segnaDate(da = 'origin/main', { data = oggiRoma() } = {}) {
  const { articoli, pagine } = trovaCambiate(alCommit(da), suDisco);
  if (articoli.length) riscrivi(BLOG, (t) => articoli.reduce((x, slug) => datoArticolo(x, slug, data), t));
  if (pagine.length) riscrivi(DATE, (t) => pagine.reduce((x, id) => datoPagina(x, id, data), t));
  return { articoli, pagine };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const i = process.argv.indexOf('--da');
  const { articoli, pagine } = segnaDate(i > 0 ? process.argv[i + 1] : 'origin/main');
  console.log(articoli.length + pagine.length
    ? `Data di oggi messa a: ${[...articoli.map((s) => `articolo ${s}`), ...pagine.map((p) => `pagina ${p}`)].join(', ')}`
    : 'Nessun articolo e nessuna pagina cambiati: niente da segnare.');
}
