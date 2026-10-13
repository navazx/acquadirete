#!/usr/bin/env node
// ============================================================================
//  GRAFICA DELLA SCHEDA GOOGLE — lo stampo dei post del profilo dell'attivita'
//
//  Sorella di grafica-curiosita.mjs: stesso sfondo, stesso carattere, stessi
//  colori, stesse icone. Cambia la forma: 4:3 (1672x1254) invece del quadrato,
//  perche' e' il formato che Google consiglia per i post della scheda, e
//  un'immagine quadrata li' perde l'etichetta in cima e il logo in fondo.
//
//  Nasce il 12 ott 2026: il promemoria diceva a Matteo "che foto metterci" e la
//  foto doveva poi trovarla lui. Adesso l'immagine gli arriva pronta.
//
//  Lo sfondo quadrato si allarga da se': si apre nel cielo, subito prima della
//  cucina, e ci si mette una fascia di cielo in piu'. Titolo e riquadro hanno
//  cosi' quasi il doppio dello spazio, e la cucina resta com'e'.
//
//  Uso:
//    node scripts/grafica-scheda.mjs agenti/promemoria/google-business-grafica.json
//      scrive agenti/promemoria/immagini/idea-<n>.jpg, una per ogni idea
//      dell'elenco, e toglie quelle del mese prima.
//    node scripts/grafica-scheda.mjs prova.json uscita.jpg
//      solo un'immagine, da un file che contiene direttamente una grafica.
//
//  Il file:
//    { "immagini": [
//        { "idea": 1,
//          "etichetta": "ATTENZIONE",
//          "titolo": "Depuratore gratis col\nbonus della Regione?\n*Quel bonus non esiste*",
//          "intro": "Una o due frasi, facoltativa.",
//          "punti": [ { "icona": "scudo", "titolo": "…", "testo": "…" }, … tre … ] } ] }
//  Fra asterischi la parte in azzurro. Il titolo va in maiuscolo da se'; gli a
//  capo si decidono con \n (tre righe al massimo, una ventina di caratteri l'una),
//  e anche nei testi dei punti un \n mette l'a capo dove sta meglio.
//  Etichetta: senza, resta CURIOSITA' con la lampadina; "ATTENZIONE" prende il
//  triangolo; qualsiasi altra (corta: "IN ZONA", "NOVITA'") resta senza disegno.
//  Icone: le stesse delle curiosita' (ICONE in grafica-curiosita.mjs).
//
//  Se i testi non ci stanno si ferma e dice cosa accorciare.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { blocco, span, escape, svgIcona, ICONE, CERCHIO, BASE, NOTTE, AZZURRO, TESTO } from './grafica-curiosita.mjs';

const CARTELLA = 'agenti/promemoria/immagini';

const H = 1254;
const TAGLIO = 600;          // dove si apre lo sfondo: cielo pulito, prima della cucina
const AGG = 418;             // 1254 + 418 = 1672, cioe' 4:3
const W = H + AGG;
const SX = 62;               // margine sinistro, come nelle curiosita'
const LARGO = 930;           // larghezza di titolo e intro
const CIMA = 150;            // sotto l'etichetta
const FONDO = 1062;          // fine del riquadro, sopra lo schizzo
const RIQ = { x: 45, w: 965 };

const lim = (v) => Math.max(0, Math.min(1, v));
const liscio = (v) => { const t = lim(v); return t * t * (3 - 2 * t); };

/** Lo sfondo delle curiosita' portato da quadrato a 4:3. */
async function sfondoLargo() {
  const { data, info } = await sharp(BASE).raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => { const i = (y * info.width + x) * info.channels; return [data[i], data[i + 1], data[i + 2]]; };
  // Il cielo, riga per riga, preso dalle ultime colonne prima del taglio. Sotto i
  // 1100 li' c'e' la coda dello schizzo d'acqua: si continua col colore di sopra.
  const cielo = (y) => {
    const s = [0, 0, 0];
    for (let x = 594; x < 600; x++) px(x, Math.min(y, 1098)).forEach((v, k) => { s[k] += v / 6; });
    return s;
  };
  const fondo = Buffer.alloc(W * H * 3);
  for (let y = 0; y < H; y++) {
    const c = cielo(y);
    for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; fondo[i] = c[0]; fondo[i + 1] = c[1]; fondo[i + 2] = c[2]; }
  }
  // L'onda blu in fondo comincia a x=514 e sale dritta: questo e' il suo bordo,
  // misurato. Tutta l'onda va con la parte destra; lo schizzo resta a sinistra.
  const bordo = (x) => 1205 - 0.576 * (x - 600);

  // Sinistra: colonne 0-599, che sfumano nel cielo fra 540 e 600, senza l'onda.
  const sx = Buffer.alloc(TAGLIO * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < TAGLIO; x++) {
    const [r, g, b] = px(x, y);
    const a = (x < 540 ? 1 : 1 - liscio((x - 540) / 60)) * lim((bordo(x) - 5 - y) / 3);
    const i = (y * TAGLIO + x) * 4;
    sx[i] = r; sx[i + 1] = g; sx[i + 2] = b; sx[i + 3] = Math.round(a * 255);
  }
  // Destra: colonne 500-1253. Fino alla 608 passa solo l'onda blu; da li' la
  // cucina entra sfumando in una ventina di pixel.
  const DA = 500;
  const largoDx = H - DA;
  const dx = Buffer.alloc(largoDx * H * 4);
  for (let y = 0; y < H; y++) for (let lx = 0; lx < largoDx; lx++) {
    const x = DA + lx;
    const [r, g, b] = px(x, y);
    const a = Math.max(liscio((x - 608) / 22), lim(y - (bordo(x) - (x < 600 ? 0.5 : 2))));
    const i = (y * largoDx + lx) * 4;
    dx[i] = r; dx[i + 1] = g; dx[i + 2] = b; dx[i + 3] = Math.round(a * 255);
  }
  return sharp(fondo, { raw: { width: W, height: H, channels: 3 } })
    .composite([
      { input: sx, raw: { width: TAGLIO, height: H, channels: 4 }, left: 0, top: 0 },
      { input: dx, raw: { width: largoDx, height: H, channels: 4 }, left: DA + AGG, top: 0 },
    ])
    .png().toBuffer();
}

/** Il titolo: maiuscolo, azzurro fra asterischi, il piu' grande che sta in larghezza. */
async function titoloCheCiSta(titolo, pxMassimo) {
  const righe = String(titolo).trim().toUpperCase().split('\n');
  if (righe.length > 3) throw new Error('Il titolo ha più di tre righe: accorcialo.');
  for (let px = pxMassimo; px >= 46; px -= 1) {
    const markup = String(titolo).trim().toUpperCase().split('*')
      .map((p, i) => span(escape(p), { px, peso: 800, colore: i % 2 ? AZZURRO : NOTTE, riga: 1.04 }))
      .join('');
    // Con gli a capo decisi a mano non deve spezzare da solo; senza, va a capo lui.
    const b = await blocco(markup, righe.length > 1 ? 3000 : LARGO);
    if (b.w <= LARGO && b.h <= px * 1.3 * 3) return b;
  }
  throw new Error('Il titolo non ci sta: tre righe al massimo, una ventina di caratteri l\'una.');
}

export async function disegnaScheda(g) {
  if (!g?.titolo || !Array.isArray(g.punti) || g.punti.length !== 3) {
    throw new Error('Alla grafica servono un titolo e esattamente tre punti.');
  }
  const sconosciute = g.punti.map((p) => p.icona).filter((i) => i && !ICONE[i] && !String(i).startsWith('testo:'));
  if (sconosciute.length) throw new Error(`Icone che non esistono: ${sconosciute.join(', ')}. Ci sono: ${Object.keys(ICONE).join(', ')}, oppure testo:…`);
  const etichettaTesto = String(g.etichetta || '').trim().toUpperCase();
  if (etichettaTesto.length > 14) throw new Error('L\'etichetta è troppo lunga: 14 caratteri al massimo.');

  const sfondo = await sfondoLargo();
  const largoPunto = RIQ.w - 167 - 34;

  // Si prova dal carattere piu' grande al piu' piccolo finche' tutto ci sta.
  for (let passo = 0; passo <= 8; passo++) {
    const titolo = await titoloCheCiSta(g.titolo, 70 - passo * 2);
    let y = CIMA + titolo.h;
    let intro = null;
    if (g.intro) {
      intro = await blocco(span(escape(g.intro), { px: 28 - passo * 0.6, peso: 500, colore: TESTO, riga: 1.12 }), LARGO);
      y += 20 + intro.h;
    }
    const cimaRiq = y + 30;
    const altRiga = (FONDO - cimaRiq) / 3;

    const righe = [];
    let entra = altRiga >= CERCHIO * 2 + 24;
    for (const p of g.punti) {
      const markup =
        span(escape(p.titolo), { px: 31 - passo * 0.7, peso: 700, colore: AZZURRO }) + '\n' +
        span(escape(p.testo), { px: 26.5 - passo * 0.6, peso: 500, colore: TESTO });
      const b = await blocco(markup, largoPunto);
      if (b.h > altRiga - 22) entra = false;
      righe.push(b);
    }
    if (!entra) continue;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <defs><filter id="ombra" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#2a5a8a" flood-opacity="0.12"/></filter></defs>`;
    const sotto = [];    // sotto il disegno
    const sopra = [];    // sopra: le scritte

    // L'etichetta. Senza, resta quella dello sfondo: CURIOSITA' con la lampadina.
    if (etichettaTesto && etichettaTesto !== 'CURIOSITÀ') {
      const scritta = await blocco(span(escape(etichettaTesto), { px: 33, peso: 800, colore: '#ffffff' }), 600);
      // Mai piu' stretta di quella dello sfondo, che deve coprire.
      const pillola = { x: 46, y: 41, w: Math.max(scritta.w + 66, 276), h: 70 };
      svg += `<rect x="${pillola.x}" y="${pillola.y}" width="${pillola.w}" height="${pillola.h}" rx="${pillola.h / 2}" fill="${NOTTE}"/>`;
      if (etichettaTesto === 'ATTENZIONE') {
        svg += `<g transform="translate(${pillola.x + pillola.w + 24} 30) scale(0.88)" fill="none" stroke="${NOTTE}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M50 12 L90 82 H10 Z"/><path d="M50 38 V58"/><path d="M50 70 V70.5"/></g>`;
      }
      // La lampadina si copre con un pezzo di cielo preso li' accanto.
      sotto.push({ input: await sharp(BASE).extract({ left: 440, top: 6, width: 130, height: 130 }).toBuffer(), left: 318, top: 6 });
      sopra.push({ input: scritta.data, left: Math.round(pillola.x + (pillola.w - scritta.w) / 2), top: Math.round(pillola.y + (pillola.h - scritta.h) / 2) });
    }

    svg += `<rect x="${RIQ.x}" y="${cimaRiq}" width="${RIQ.w}" height="${FONDO - cimaRiq}" rx="24" fill="#ffffff" fill-opacity="0.9" filter="url(#ombra)"/>`;
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

    sopra.push({ input: titolo.data, left: SX, top: CIMA });
    if (intro) sopra.push({ input: intro.data, left: SX, top: CIMA + titolo.h + 20 });
    righe.forEach((b, i) => {
      sopra.push({ input: b.data, left: RIQ.x + 167, top: Math.round(cimaRiq + altRiga * i + (altRiga - b.h) / 2) });
    });
    for (const s of scritteNeiCerchi) {
      const b = await blocco(span(escape(s.testo), { px: 26, peso: 800, colore: '#ffffff' }), CERCHIO * 2 - 16, 'centre');
      sopra.push({ input: b.data, left: Math.round(RIQ.x + 82 - b.w / 2), top: Math.round(s.cy - b.h / 2) });
    }

    return sharp(sfondo)
      .composite([...sotto, { input: Buffer.from(svg), left: 0, top: 0 }, ...sopra])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer();
  }
  throw new Error(
    "I testi non ci stanno nemmeno col carattere più piccolo: accorcia il titolo, togli o accorcia l'intro, " +
    'e tieni ogni punto su un titoletto corto e una o due frasi.',
  );
}

async function main() {
  const [entrata, uscita] = process.argv.slice(2);
  if (!entrata) {
    console.log('Uso: node scripts/grafica-scheda.mjs agenti/promemoria/google-business-grafica.json   (oppure: grafica.json uscita.jpg)');
    process.exitCode = 1;
    return;
  }
  const dati = JSON.parse(readFileSync(entrata, 'utf8'));
  if (!Array.isArray(dati.immagini)) {
    writeFileSync(uscita || 'scheda.jpg', await disegnaScheda(dati));
    console.log(`Scritta ${uscita || 'scheda.jpg'}`);
    return;
  }
  // Prima si disegnano tutte: se una non riesce, quelle del mese prima restano.
  const fatte = [];
  for (const g of dati.immagini) {
    if (!Number.isInteger(g.idea) || g.idea < 1) throw new Error('Ogni immagine dice di quale idea è: "idea": 1, 2 o 3.');
    fatte.push({ nome: `idea-${g.idea}.jpg`, jpg: await disegnaScheda(g) });
  }
  mkdirSync(CARTELLA, { recursive: true });
  for (const f of readdirSync(CARTELLA)) if (/^idea-\d+\.jpg$/.test(f)) unlinkSync(`${CARTELLA}/${f}`);
  for (const f of fatte) writeFileSync(`${CARTELLA}/${f.nome}`, f.jpg);
  console.log(`Scritte in ${CARTELLA}: ${fatte.map((f) => f.nome).join(', ') || 'nessuna'}.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
