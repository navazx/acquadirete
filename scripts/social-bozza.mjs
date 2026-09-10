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

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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
  if (b.scartato) {
    console.log('Bozza scartata: non rimando niente.');
    return;
  }
  if (b.inviato) {
    console.log("Bozza gia' mandata: aspetto la risposta.");
    return;
  }

  // Una bozza rimandata torna identica la settimana dopo: le idee non si buttano,
  // si rimettono in fila. RIMANDA cancella `inviato`, ed e' cosi' che si ripresenta.
  const rimandi = b.rimandi || 0;

  // Senza foto si va avanti lo stesso: Facebook accetta un post di solo testo,
  // Instagram no. Meglio mezzo post che nessun post.
  const urlFoto = b.foto ? `${SITO}/${b.foto.replace(/^\/+/, '')}` : null;

  const testo = [
    rimandi
      ? `Post social — tema: ${b.tema} (rimandato ${rimandi === 1 ? 'una volta' : `${rimandi} volte`})`
      : `Post social — tema: ${b.tema}`,
    urlFoto ? '' : 'SENZA FOTO: va solo su Facebook, Instagram le pretende.\nSe ne metti una in sito/public/assets/social/ ci va anche Instagram.',
    '',
    ...b.varianti.flatMap((v, i) => [
      `${numeri[i]} ${v.testo}`,
      v.hashtag?.length ? v.hashtag.join(' ') : '',
      '',
    ]),
    'Rispondi:',
    'PUBBLICA 1 (oppure 2, 3) — va su Facebook e Instagram',
    'RIMANDA — salti la settimana, le idee te le ripropongo sabato prossimo',
    'SCARTA — non se ne fa nulla e la prossima e\' nuova',
    '',
    rimandi >= 3
      ? 'Te l\'ho gia\' riproposta tre volte: se non ti convince, SCARTA e sabato te ne preparo una diversa.'
      : 'Se non rispondi non pubblico niente.',
  ].filter((r) => r !== undefined).join('\n');

  if (prova) {
    console.log(`foto: ${urlFoto || '(nessuna)'}\n`);
    console.log(testo);
    return;
  }

  if (urlFoto) await foto(urlFoto, `Post social — tema: ${b.tema}`);
  await messaggio(testo);

  // Segnare l'invio evita che il giro schedulato del sabato la rimandi una
  // seconda volta quando e' gia' partita col push.
  writeFileSync(BOZZA, `${JSON.stringify({ ...b, inviato: new Date().toISOString() }, null, 2)}\n`);
  console.log(`Bozza mandata: ${b.varianti.length} varianti, foto ${b.foto || '(nessuna)'}${rimandi ? `, rimandata ${rimandi} volte` : ''}`);
}

main().catch((e) => {
  console.log(`Non sono riuscito a mandare la bozza: ${e.message}`);
  process.exitCode = 1;
});
