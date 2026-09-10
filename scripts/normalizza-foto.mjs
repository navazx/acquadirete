#!/usr/bin/env node
// ============================================================================
//  NORMALIZZA LE FOTO SOCIAL
//
//  Matteo butta le foto in public/assets/social/ come gli escono dal telefono.
//  Questo script le mette in riga per Instagram, che e' schizzinoso e rifiuta
//  senza spiegare: vuole JPEG, proporzioni fra 4:5 e 1.91:1, sotto gli 8 MB.
//
//  Cosa fa a ogni foto che non e' gia' a posto:
//    - la gira dritta secondo l'orientamento della fotocamera (EXIF)
//    - la converte in JPEG (funziona anche l'HEIC dell'iPhone)
//    - se e' troppo alta o troppo panoramica, taglia dal centro fino alla
//      proporzione buona piu' vicina: si perde il minimo indispensabile
//    - la rimpicciolisce a 1440px di lato lungo
//    - toglie i dati EXIF, dove fra le altre cose c'e' il luogo dello scatto
//
//  Chi e' gia' a posto non viene toccato: cosi' si puo' rilanciare a vuoto.
//
//  Prova senza modificare niente:  node scripts/normalizza-foto.mjs --prova
// ============================================================================

import { readdirSync, statSync, renameSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import sharp from 'sharp';

const CARTELLA = 'public/assets/social';
const LATO_MAX = 1440;
const PESO_MAX = 8 * 1024 * 1024;
const RAPPORTO_MIN = 4 / 5;      // 0.80 - il piu' verticale che Instagram accetta
const RAPPORTO_MAX = 1.91;       // il piu' panoramico
const LEGGIBILI = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tif', '.tiff', '.gif', '.avif'];

const prova = process.argv.includes('--prova');
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;

/** Il ritaglio centrale che porta l'immagine dentro le proporzioni ammesse. */
function ritaglio(larghezza, altezza) {
  const r = larghezza / altezza;
  if (r >= RAPPORTO_MIN && r <= RAPPORTO_MAX) return null;
  if (r < RAPPORTO_MIN) {
    const nuovaAltezza = Math.round(larghezza / RAPPORTO_MIN);
    return { left: 0, top: Math.round((altezza - nuovaAltezza) / 2), width: larghezza, height: nuovaAltezza };
  }
  const nuovaLarghezza = Math.round(altezza * RAPPORTO_MAX);
  return { left: Math.round((larghezza - nuovaLarghezza) / 2), top: 0, width: nuovaLarghezza, height: altezza };
}

async function main() {
  let file;
  try {
    file = readdirSync(CARTELLA).filter((f) => LEGGIBILI.includes(extname(f).toLowerCase()));
  } catch {
    console.log(`La cartella ${CARTELLA} non c'e'.`);
    return;
  }
  if (!file.length) {
    console.log('Nessuna foto da controllare.');
    return;
  }

  let sistemate = 0;
  for (const nome of file.sort()) {
    const percorso = join(CARTELLA, nome);
    const peso = statSync(percorso).size;

    let meta;
    try {
      meta = await sharp(percorso).metadata();
    } catch (e) {
      console.log(`✗ ${nome} — non riesco ad aprirla: ${e.message}`);
      continue;
    }

    // Con l'orientamento EXIF 5-8 la foto e' coricata: larghezza e altezza
    // vanno lette al contrario, altrimenti il ritaglio esce sbagliato.
    const coricata = (meta.orientation || 1) >= 5;
    const larghezza = coricata ? meta.height : meta.width;
    const altezza = coricata ? meta.width : meta.height;
    const rapporto = larghezza / altezza;

    const taglio = ritaglio(larghezza, altezza);
    const eJpeg = meta.format === 'jpeg' && ['.jpg', '.jpeg'].includes(extname(nome).toLowerCase());
    const motivi = [
      !eJpeg && `formato ${meta.format}`,
      taglio && `proporzioni ${rapporto.toFixed(2)} fuori da 0.80-1.91`,
      Math.max(larghezza, altezza) > LATO_MAX && `${larghezza}x${altezza} troppo grande`,
      peso > PESO_MAX && `${mb(peso)} oltre il limite`,
      (meta.orientation || 1) !== 1 && 'da raddrizzare',
    ].filter(Boolean);

    if (!motivi.length) {
      console.log(`· ${nome} — gia' a posto (${larghezza}x${altezza}, ${mb(peso)})`);
      continue;
    }

    console.log(`→ ${nome} — ${motivi.join('; ')}`);
    if (prova) { sistemate += 1; continue; }

    const destinazione = join(CARTELLA, `${basename(nome, extname(nome))}.jpg`);
    const temporaneo = `${destinazione}.tmp`;

    let img = sharp(percorso).rotate();               // rotate() senza gradi = raddrizza da EXIF
    if (taglio) img = img.extract(taglio);
    await img
      .resize({ width: LATO_MAX, height: LATO_MAX, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(temporaneo);

    if (percorso !== destinazione) unlinkSync(percorso);
    renameSync(temporaneo, destinazione);

    const dopo = await sharp(destinazione).metadata();
    console.log(`  ✓ ${basename(destinazione)} — ${dopo.width}x${dopo.height}, ${mb(statSync(destinazione).size)}`);
    sistemate += 1;
  }

  console.log(sistemate ? `\n${sistemate} foto ${prova ? 'da sistemare' : 'sistemate'}.` : '\nEra tutto gia' + "'" + ' a posto.');
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
