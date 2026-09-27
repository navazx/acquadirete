#!/usr/bin/env node
// ============================================================================
//  GRAFICA DELLE CURIOSITA' — lo stampo dei post "Lo sapevi che…"
//
//  Matteo, fra giugno e agosto 2026, pubblicava un post su due con un'immagine
//  sempre uguale: etichetta CURIOSITA' con la lampadina, titolo grande in blu
//  notte con la parola chiave in azzurro, tre righe con un'icona tonda, e a
//  destra la cucina col depuratore. Questo script rifa' quell'immagine con testi
//  nuovi, cosi' lo stile resta lo stesso anche quando il post lo scrive l'agente.
//
//  Lo sfondo (scripts/grafica/base-curiosita.jpg) e' la sua curiosita' sul cloro
//  con titolo, testo e riquadro cancellati: etichetta, foto, schizzo, logo e onda
//  in fondo sono quelli originali. Il carattere e' il Montserrat (Google Fonts,
//  licenza OFL in scripts/grafica/font/).
//
//  Uso:
//    node scripts/grafica-curiosita.mjs agenti/social-bozza.json
//      legge il campo "grafica" della bozza, scrive l'immagine in
//      public/assets/social/curiosita-AAAA-MM-GG.jpg e mette quel percorso nel
//      campo "foto" della bozza.
//    node scripts/grafica-curiosita.mjs prova.json uscita.jpg
//      solo l'immagine, da un file che contiene direttamente la grafica.
//
//  La grafica:
//    {
//      "titolo": "Lo sapevi che *il cloro* è fondamentale per la sicurezza dell'acqua?",
//      "intro":  "Una o due frasi, facoltativa.",
//      "punti": [ { "icona": "scudo", "titolo": "Perché a volte si sente?", "testo": "…" }, … tre … ]
//    }
//  Fra asterischi la parte in azzurro. Il titolo va in maiuscolo da se'.
//  Icone: vedi ICONE qui sotto, oppure "testo:Ca Mg" per scrivere dentro il cerchio.
//
//  Se i testi non ci stanno nemmeno col carattere piu' piccolo, si ferma con un
//  errore che dice cosa accorciare: meglio un errore che un'immagine tagliata.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const QUI = dirname(fileURLToPath(import.meta.url));
const BASE = join(QUI, 'grafica', 'base-curiosita.jpg');
const FONT = join(QUI, 'grafica', 'font', 'Montserrat-variabile.ttf');

// Colori presi dalle immagini originali.
const NOTTE = '#062a60';     // titolo, cerchi delle icone
const AZZURRO = '#2574d9';   // parola chiave, titoletti
const TESTO = '#1c2434';     // testo corrente

// Misure dell'originale (1254x1254).
const LATO = 1254;
const SX = 62;               // margine sinistro del titolo
const LARGO = 540;           // larghezza della colonna di sinistra
const LARGO_TITOLO = 530;    // il titolo va a capo prima, come nell'originale
const CIMA = 150;            // sotto l'etichetta CURIOSITA'
const FONDO = 1062;          // fine del riquadro, sopra lo schizzo
const RIQ = { x: 45, w: 552 };
const CERCHIO = 58;          // raggio

// Icone disegnate in un quadrato 100x100, tratto bianco.
const ICONE = {
  goccia: '<path d="M50 12 C50 12 22 46 22 64 a28 28 0 0 0 56 0 C78 46 50 12 50 12 Z"/><path d="M36 66 a14 14 0 0 0 14 14"/>',
  scudo: '<path d="M50 10 L82 22 V48 C82 70 68 84 50 92 C32 84 18 70 18 48 V22 Z"/><path d="M35 50 L46 61 L66 40"/>',
  rubinetto: '<path d="M18 40 H56 a14 14 0 0 1 14 14 V62"/><path d="M18 30 V50"/><path d="M40 40 V26 M30 26 H50"/><path d="M70 72 c0 0 -6 8 -6 12 a6 6 0 0 0 12 0 c0 -4 -6 -12 -6 -12 Z"/>',
  bicchiere: '<path d="M26 16 H74 L66 88 H34 Z"/><path d="M30 42 H70"/><circle cx="44" cy="58" r="3"/><circle cx="56" cy="68" r="3"/><circle cx="50" cy="78" r="2.5"/>',
  foglia: '<path d="M22 80 C22 40 46 18 84 16 C84 54 62 80 22 80 Z"/><path d="M22 80 L62 40"/>',
  casa: '<path d="M14 50 L50 18 L86 50"/><path d="M24 42 V84 H76 V42"/><path d="M42 84 V62 H58 V84"/>',
  famiglia: '<circle cx="34" cy="28" r="9"/><circle cx="66" cy="28" r="9"/><path d="M18 84 V58 a16 16 0 0 1 32 0 V84"/><path d="M50 84 V58 a16 16 0 0 1 32 0 V84"/>',
  bottiglia: '<path d="M42 10 H58 V24 C58 30 70 32 70 44 V88 H30 V44 C30 32 42 30 42 24 Z"/><path d="M30 56 H70"/>',
  filtro: '<path d="M14 18 H86 L58 52 V82 L42 90 V52 Z"/>',
  onde: '<path d="M26 20 c-10 12 10 20 0 32 s10 20 0 32"/><path d="M50 20 c-10 12 10 20 0 32 s10 20 0 32"/><path d="M74 20 c-10 12 10 20 0 32 s10 20 0 32"/>',
  lampadina: '<path d="M36 64 C24 56 20 44 22 36 a28 28 0 0 1 56 0 C80 44 76 56 64 64 V74 H36 Z"/><path d="M40 84 H60 M44 92 H56"/>',
  euro: '<circle cx="50" cy="50" r="36"/><path d="M64 34 a20 20 0 1 0 0 32"/><path d="M28 44 H56 M28 56 H54"/>',
  check: '<circle cx="50" cy="50" r="36"/><path d="M34 50 L46 62 L68 38"/>',
  cuore: '<path d="M50 84 C20 62 14 46 14 36 a18 18 0 0 1 36 -6 a18 18 0 0 1 36 6 C86 46 80 62 50 84 Z"/>',
  bolle: '<circle cx="36" cy="66" r="14"/><circle cx="62" cy="40" r="10"/><circle cx="66" cy="72" r="7"/><circle cx="40" cy="28" r="6"/>',
  freddo: '<path d="M50 12 V88 M17 31 L83 69 M17 69 L83 31"/><path d="M42 18 L50 26 L58 18 M42 82 L50 74 L58 82"/>',
  attrezzi: '<path d="M62 14 a18 18 0 0 0 -16 26 L16 70 a8 8 0 0 0 14 14 L60 54 a18 18 0 0 0 26 -16 L74 48 L60 44 L56 30 Z"/>',
  calendario: '<rect x="16" y="22" width="68" height="62" rx="6"/><path d="M16 40 H84 M34 12 V30 M66 12 V30"/><path d="M32 56 H40 M46 56 H54 M60 56 H68 M32 70 H40 M46 70 H54"/>',
};

// L'apostrofo dritto diventa quello tipografico, come nelle immagini di Matteo.
const escape = (s) => String(s).replace(/'/g, '’').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Un blocco di testo Pango: torna immagine e misure. */
async function blocco(markup, larghezza, allinea = 'left') {
  const { data, info } = await sharp({
    text: { text: markup, font: 'Montserrat', fontfile: FONT, width: larghezza, dpi: 72, rgba: true, align: allinea, wrap: 'word' },
  }).png().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

const span = (testo, { px, peso, colore, riga }) =>
  `<span size="${Math.round(px * 1024)}" weight="${peso}" foreground="${colore}"${riga ? ` line_height="${riga}"` : ''}>${testo}</span>`;

function markupTitolo(titolo, px) {
  // *parola* -> azzurro. Il resto blu notte. Tutto maiuscolo, come nell'originale.
  // "Lo sapevi che" sta sempre su una riga sua; altri a capo si forzano con \n.
  let t = String(titolo).trim().toUpperCase();
  if (!t.includes('\n')) t = t.replace(/^(LO SAPEVI CHE)\s+/, '$1\n');
  const pezzi = t.split('*');
  return pezzi
    .map((p, i) => span(escape(p), { px, peso: 800, colore: i % 2 ? AZZURRO : NOTTE, riga: 1.0 }))
    .join('');
}

function svgIcona(nome, cx, cy) {
  const cerchio = `<circle cx="${cx}" cy="${cy}" r="${CERCHIO}" fill="${NOTTE}"/>`;
  if (String(nome).startsWith('testo:')) return { svg: cerchio, testo: nome.slice(6) };
  const disegno = ICONE[nome] || ICONE.goccia;
  const lato = 66;
  return {
    svg: `${cerchio}<g transform="translate(${cx - lato / 2} ${cy - lato / 2}) scale(${lato / 100})" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${disegno}</g>`,
  };
}

export async function disegna(g) {
  if (!g?.titolo || !Array.isArray(g.punti) || g.punti.length !== 3) {
    throw new Error('Alla grafica servono un titolo e esattamente tre punti.');
  }
  const sconosciute = g.punti.map((p) => p.icona).filter((i) => i && !ICONE[i] && !String(i).startsWith('testo:'));
  if (sconosciute.length) throw new Error(`Icone che non esistono: ${sconosciute.join(', ')}. Ci sono: ${Object.keys(ICONE).join(', ')}, oppure testo:…`);

  // Si prova dal carattere piu' grande al piu' piccolo finche' tutto ci sta.
  for (let passo = 0; passo <= 9; passo++) {
    const pxTitolo = 56 - passo * 2.2;
    const pxIntro = 24 - passo * 0.6;
    const pxSotto = 22.5 - passo * 0.5;
    const pxCorpo = 21.5 - passo * 0.5;

    const titolo = await blocco(markupTitolo(g.titolo, pxTitolo), LARGO_TITOLO);
    let y = CIMA + titolo.h + 14;
    let intro = null;
    if (g.intro) {
      intro = await blocco(span(escape(g.intro), { px: pxIntro, peso: 500, colore: TESTO }), LARGO - 10);
      y += intro.h + 6;
    }
    const cimaRiq = y + 18;
    const altRiga = (FONDO - cimaRiq) / 3;

    const righe = [];
    let entra = altRiga >= CERCHIO * 2 + 24;
    for (const p of g.punti) {
      const markup =
        span(escape(p.titolo), { px: pxSotto, peso: 700, colore: AZZURRO }) + '\n' +
        span(escape(p.testo), { px: pxCorpo, peso: 500, colore: TESTO });
      const b = await blocco(markup, 372);
      if (b.h > altRiga - 22) entra = false;
      righe.push(b);
    }
    if (!entra) continue;

    // Il riquadro bianco con un'ombra leggera, e i divisori fra le righe.
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LATO}" height="${LATO}">
      <defs><filter id="ombra" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#2a5a8a" flood-opacity="0.12"/></filter></defs>
      <rect x="${RIQ.x}" y="${cimaRiq}" width="${RIQ.w}" height="${FONDO - cimaRiq}" rx="24" fill="#ffffff" fill-opacity="0.9" filter="url(#ombra)"/>`;
    for (let i = 1; i < 3; i++) {
      const yy = Math.round(cimaRiq + altRiga * i);
      svg += `<line x1="${RIQ.x + 30}" y1="${yy}" x2="${RIQ.x + RIQ.w - 30}" y2="${yy}" stroke="#e1e8ef" stroke-width="2"/>`;
    }
    const scritteNeiCerchi = [];
    g.punti.forEach((p, i) => {
      const cy = Math.round(cimaRiq + altRiga * i + altRiga / 2);
      const icona = svgIcona(p.icona, RIQ.x + 82, cy);
      svg += icona.svg;
      if (icona.testo) scritteNeiCerchi.push({ testo: icona.testo, cy });
    });
    svg += '</svg>';

    const livelli = [
      { input: Buffer.from(svg), left: 0, top: 0 },
      { input: titolo.data, left: SX, top: CIMA },
    ];
    if (intro) livelli.push({ input: intro.data, left: SX, top: CIMA + titolo.h + 14 });
    righe.forEach((b, i) => {
      livelli.push({ input: b.data, left: RIQ.x + 167, top: Math.round(cimaRiq + altRiga * i + (altRiga - b.h) / 2) });
    });
    for (const s of scritteNeiCerchi) {
      const b = await blocco(span(escape(s.testo), { px: 26, peso: 800, colore: '#ffffff' }), CERCHIO * 2 - 16, 'centre');
      livelli.push({ input: b.data, left: Math.round(RIQ.x + 82 - b.w / 2), top: Math.round(s.cy - b.h / 2) });
    }

    return sharp(BASE).composite(livelli).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
  }
  throw new Error(
    'I testi non ci stanno nemmeno col carattere più piccolo: accorcia il titolo (5 righe al massimo), ' +
    "togli o accorcia l'intro, e tieni ogni punto su un titoletto corto e una o due frasi.",
  );
}

async function main() {
  const [entrata, uscita] = process.argv.slice(2);
  if (!entrata) {
    console.log('Uso: node scripts/grafica-curiosita.mjs agenti/social-bozza.json   (oppure: grafica.json uscita.jpg)');
    process.exitCode = 1;
    return;
  }
  const dati = JSON.parse(readFileSync(entrata, 'utf8'));
  const eBozza = Boolean(dati.grafica);
  const jpg = await disegna(eBozza ? dati.grafica : dati);

  if (!eBozza) {
    writeFileSync(uscita || 'curiosita.jpg', jpg);
    console.log(`Scritta ${uscita || 'curiosita.jpg'}`);
    return;
  }
  const giorno = new Date().toISOString().slice(0, 10);
  let nome = `curiosita-${giorno}.jpg`;
  for (let n = 2; existsSync(`public/assets/social/${nome}`); n++) nome = `curiosita-${giorno}-${n}.jpg`;
  writeFileSync(`public/assets/social/${nome}`, jpg);
  dati.foto = `assets/social/${nome}`;
  writeFileSync(entrata, `${JSON.stringify(dati, null, 2)}\n`);
  console.log(`Scritta public/assets/social/${nome}, e messa nella bozza come foto.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
