#!/usr/bin/env node
// ============================================================================
//  AGENTE SOCIAL — passo 1: manda la bozza da approvare
//
//  Gira quando la bozza compare nel repo (agenti/social-bozza.json).
//  Manda su Telegram la foto e le tre varianti di didascalia, poi aspetta.
//  Non pubblica niente: pubblicare e' compito di social-approva.mjs, dopo un
//  PUBBLICA esplicito di Matteo.
//
//  Prova in locale (stampa invece di mandare):
//    node scripts/social-bozza.mjs --prova
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { messaggio, foto } from './lib/telegram.mjs';

const BOZZA = 'agenti/social-bozza.json';
const SITO = 'https://www.acquadirete.it';
const prova = process.argv.includes('--prova');

const numeri = ['1️⃣', '2️⃣', '3️⃣'];

async function main() {
  if (!existsSync(BOZZA)) {
    console.log('Nessuna bozza da mandare.');
    return;
  }
  const b = JSON.parse(readFileSync(BOZZA, 'utf8'));

  if (b.pubblicato) {
    console.log(`Bozza gia' pubblicata il ${b.pubblicato}: non rimando niente.`);
    return;
  }
  if (b.inviato) {
    console.log('Bozza gia' + "'" + ' mandata: aspetto la risposta.');
    return;
  }

  // Senza foto si va avanti lo stesso: Facebook accetta un post di solo testo,
  // Instagram no. Meglio mezzo post che nessun post.
  const urlFoto = b.foto ? `${SITO}/${b.foto.replace(/^\/+/, '')}` : null;

  const testo = [
    `Post social — tema: ${b.tema}`,
    urlFoto ? '' : 'SENZA FOTO: va solo su Facebook, Instagram le pretende.\nSe ne metti una in sito/public/assets/social/ ci va anche Instagram.',
    '',
    ...b.varianti.flatMap((v, i) => [
      `${numeri[i]} ${v.testo}`,
      v.hashtag?.length ? v.hashtag.join(' ') : '',
      '',
    ]),
    'Rispondi:',
    `PUBBLICA 1 (oppure 2, 3) — va su Facebook e Instagram`,
    'SCARTA — non se ne fa nulla',
    '',
    'Se non rispondi non pubblico niente.',
  ].filter((r) => r !== undefined).join('\n');

  if (prova) {
    console.log(`foto: ${urlFoto || '(nessuna)'}\n`);
    console.log(testo);
    return;
  }

  if (urlFoto) await foto(urlFoto, `Post social — tema: ${b.tema}`);
  await messaggio(testo);
  console.log(`Bozza mandata: ${b.varianti.length} varianti, foto ${b.foto || '(nessuna)'}`);
}

main().catch((e) => {
  console.log(`Non sono riuscito a mandare la bozza: ${e.message}`);
  process.exitCode = 1;
});
