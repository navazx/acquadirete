#!/usr/bin/env node
// ============================================================================
//  GRAFICA DELLE RECENSIONI — lo stampo dei post con la frase di un cliente
//
//  Sorella di grafica-curiosita.mjs: stesso sfondo (scripts/grafica/
//  base-curiosita.jpg), stesso carattere, stessi colori, cosi' i post di
//  Acquadirete si riconoscono a colpo d'occhio. Al posto di "CURIOSITA'" c'e'
//  l'etichetta RECENSIONE con le cinque stelle, e a sinistra la frase del cliente
//  fra virgolette, chi l'ha scritta e la media su Google.
//
//  Nasce il 12 ott 2026: l'agente aveva messo sotto una recensione la foto di un
//  impianto qualsiasi, che con la frase non c'entrava niente (e Matteo l'ha
//  scartata). Sotto una recensione va questa grafica, non una foto.
//
//  Uso:
//    node scripts/grafica-recensione.mjs agenti/social-bozza.json
//      legge il campo "grafica" della bozza, scrive l'immagine in
//      public/assets/social/recensione-AAAA-MM-GG.jpg e mette quel percorso nel
//      campo "foto" della bozza.
//    node scripts/grafica-recensione.mjs prova.json uscita.jpg
//      solo l'immagine, da un file che contiene direttamente la grafica.
//
//  La grafica:
//    { "frase": "L'unica cosa di cui mi pento è di non averlo acquistato prima.",
//      "autore": "Simone Biagiotti" }
//  La frase e' un pezzo VERO di una recensione di lib/google-reviews.json, copiato
//  com'e' (si puo' tagliare, non riscrivere): lo script controlla che ci sia, e
//  se non c'e' si ferma. Del cognome resta solo l'iniziale. Media e numero di
//  recensioni li legge da lib/google-reviews.json, che l'agente recensioni tiene
//  allineato a Google.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { blocco, span, escape, BASE, NOTTE, AZZURRO, TESTO } from './grafica-curiosita.mjs';

const QUI = dirname(fileURLToPath(import.meta.url));
const RECENSIONI = join(QUI, '..', 'lib', 'google-reviews.json');

const ORO = '#f5b301';
const LATO = 1254;
const SX = 62;               // margine sinistro, come nelle curiosita'
const LARGO = 520;           // larghezza della frase
const CIMA = 262;            // sotto le virgolette grandi
const RIQ = { x: 45, w: 552, y: 902, h: 160 };
const FRASE_MAX = 230;       // caratteri: oltre, sul telefono non si legge piu'

// Una stella a cinque punte dentro un quadrato 100x100.
const STELLA = 'M50 5 L61.8 36.2 L95 38.2 L69 59.4 L77.6 91.6 L50 73.6 L22.4 91.6 L31 59.4 L5 38.2 L38.2 36.2 Z';
const stelle = (x, y, lato, passo) =>
  [0, 1, 2, 3, 4]
    .map((i) => `<path transform="translate(${x + i * passo} ${y}) scale(${lato / 100})" d="${STELLA}" fill="${ORO}"/>`)
    .join('');

// Per il confronto con la recensione vera: via maiuscole, accenti, punteggiatura.
const piatto = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Simone Biagiotti" -> "Simone B."; un nome solo resta com'e'. */
const firma = (autore) => {
  const p = String(autore || '').trim().split(/\s+/).filter(Boolean);
  if (!p.length) return '';
  return p.length === 1 ? p[0] : `${p[0]} ${p[p.length - 1][0].toUpperCase()}.`;
};

export async function disegnaRecensione(g) {
  const dati = JSON.parse(readFileSync(RECENSIONI, 'utf8'));
  const frase = String(g?.frase || '').trim().replace(/^[«"“]+|[»"”]+$/g, '').trim();
  if (!frase) throw new Error('Alla grafica serve la frase della recensione.');
  if (frase.length > FRASE_MAX) {
    throw new Error(`La frase è lunga ${frase.length} caratteri: il massimo è ${FRASE_MAX}. Prendi un pezzo più corto della recensione.`);
  }
  // Le parole di un cliente non si inventano e non si aggiustano. Chi taglia in
  // mezzo mette i puntini: ogni pezzo fra i puntini deve stare nella recensione.
  const vera = dati.reviews.find((r) =>
    frase.split(/\s*(?:\.\.\.|…|\[…\])\s*/).filter(Boolean).every((pezzo) => piatto(r.text).includes(piatto(pezzo))));
  if (!vera) {
    throw new Error('Questa frase non è in nessuna recensione di lib/google-reviews.json: va copiata com\'è, senza cambiare le parole.');
  }
  const autore = firma(g.autore || vera.author);
  const media = String(dati.rating).replace('.', ',');

  // Si prova dal carattere piu' grande al piu' piccolo finche' la frase ci sta.
  const spazio = RIQ.y - 36 - CIMA;
  for (let px = 50; px >= 28; px -= 2) {
    const testo = await blocco(span(escape(frase), { px, peso: 700, colore: NOTTE, riga: 1.16 }), LARGO);
    const chi = await blocco(
      span(escape(autore), { px: 27, peso: 800, colore: AZZURRO }) + '\n' +
      span('recensione su Google', { px: 21, peso: 500, colore: TESTO }),
      LARGO,
    );
    const alto = testo.h + 34 + 4 + 18 + chi.h;
    if (alto > spazio) continue;
    const y = Math.round(CIMA + (spazio - alto) / 2.6);   // un po' piu' su del centro

    const etichetta = await blocco(span('RECENSIONE', { px: 33, peso: 800, colore: '#ffffff' }), 400);
    const numero = await blocco(span(media, { px: 78, peso: 800, colore: NOTTE }), 200);
    const quante = await blocco(
      span(`su ${dati.total} recensioni`, { px: 23, peso: 700, colore: TESTO }) + '\n' +
      span('dei nostri clienti su Google', { px: 20, peso: 500, colore: TESTO }),
      340,
    );
    const virgolette = await blocco(span('“', { px: 230, peso: 800, colore: AZZURRO }), 300);

    const pillola = { x: 47, y: 42, w: etichetta.w + 64, h: 68 };
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LATO}" height="${LATO}">
      <defs><filter id="ombra" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#2a5a8a" flood-opacity="0.12"/></filter></defs>
      <rect x="${pillola.x}" y="${pillola.y}" width="${pillola.w}" height="${pillola.h}" rx="${pillola.h / 2}" fill="${NOTTE}"/>
      ${stelle(pillola.x + pillola.w + 22, pillola.y + 15, 38, 44)}
      <rect x="${SX}" y="${y + testo.h + 34}" width="70" height="4" rx="2" fill="${AZZURRO}"/>
      <rect x="${RIQ.x}" y="${RIQ.y}" width="${RIQ.w}" height="${RIQ.h}" rx="24" fill="#ffffff" fill-opacity="0.9" filter="url(#ombra)"/>
      ${stelle(RIQ.x + 222, RIQ.y + 30, 34, 40)}
    </svg>`;

    // La lampadina delle curiosita' si copre con un pezzo di cielo preso li' accanto.
    const cielo = await sharp(BASE).extract({ left: 440, top: 6, width: 112, height: 130 }).toBuffer();

    return sharp(BASE)
      .composite([
        { input: cielo, left: 322, top: 6 },
        { input: Buffer.from(svg), left: 0, top: 0 },
        { input: etichetta.data, left: pillola.x + 32, top: Math.round(pillola.y + (pillola.h - etichetta.h) / 2) },
        { input: virgolette.data, left: SX - 8, top: 136 },
        { input: testo.data, left: SX, top: y },
        { input: chi.data, left: SX, top: y + testo.h + 34 + 4 + 18 },
        { input: numero.data, left: RIQ.x + 40, top: Math.round(RIQ.y + (RIQ.h - numero.h) / 2) },
        { input: quante.data, left: RIQ.x + 222, top: RIQ.y + 76 },
      ])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  }
  throw new Error('La frase non ci sta nemmeno col carattere più piccolo: prendine un pezzo più corto.');
}

async function main() {
  const [entrata, uscita] = process.argv.slice(2);
  if (!entrata) {
    console.log('Uso: node scripts/grafica-recensione.mjs agenti/social-bozza.json   (oppure: grafica.json uscita.jpg)');
    process.exitCode = 1;
    return;
  }
  const dati = JSON.parse(readFileSync(entrata, 'utf8'));
  const eBozza = Boolean(dati.grafica);
  const jpg = await disegnaRecensione(eBozza ? dati.grafica : dati);

  if (!eBozza) {
    writeFileSync(uscita || 'recensione.jpg', jpg);
    console.log(`Scritta ${uscita || 'recensione.jpg'}`);
    return;
  }
  const giorno = new Date().toISOString().slice(0, 10);
  let nome = `recensione-${giorno}.jpg`;
  for (let n = 2; existsSync(`public/assets/social/${nome}`); n++) nome = `recensione-${giorno}-${n}.jpg`;
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
