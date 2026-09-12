#!/usr/bin/env node
// ============================================================================
//  RECENSIONI — manda a Matteo le risposte pronte da incollare
//
//  Parte da GitHub Actions appena l'agente nel cloud scrive una bozza in
//  agenti/recensioni/bozze/ (vedi .github/workflows/recensioni-bozza.yml).
//
//  Non guarda cosa e' cambiato nel push: guarda cosa non ha ancora mandato, e
//  lo segna in agenti/recensioni/mandate.json. Cosi' funziona anche se la
//  routine spinge due bozze insieme, o se il workflow viene rilanciato a mano.
//
//  Segreti: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (nei secret del repo).
//  Prova:   PROVA=true node scripts/recensioni-bozza.mjs
// ============================================================================

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const BOZZE = path.join(RADICE, 'agenti', 'recensioni', 'bozze');
const MANDATE = path.join(RADICE, 'agenti', 'recensioni', 'mandate.json');
const prova = process.env.PROVA === 'true';

async function main() {
  if (!existsSync(BOZZE)) {
    console.log('Nessuna cartella delle bozze: non c\'e\' niente da mandare.');
    return;
  }
  const tutte = readdirSync(BOZZE).filter((f) => f.endsWith('.md')).sort();
  const mandate = existsSync(MANDATE) ? JSON.parse(readFileSync(MANDATE, 'utf8')) : [];
  const daMandare = tutte.filter((f) => !mandate.includes(f));

  if (!tutte.length) {
    console.log('Nessuna bozza di risposta: non c\'e\' niente da mandare.');
    return;
  }
  if (!daMandare.length) {
    console.log(
      tutte.length === 1
        ? "L'unica bozza e' gia' stata mandata."
        : `Tutte le ${tutte.length} bozze sono gia' state mandate.`,
    );
    return;
  }

  const { messaggio } = prova ? { messaggio: null } : await import('./lib/telegram.mjs');

  for (const file of daMandare) {
    const testo = readFileSync(path.join(BOZZE, file), 'utf8').trim();
    if (!testo) {
      console.log(`${file} e' vuoto: lo salto senza segnarlo.`);
      continue;
    }
    // La risposta si incolla, quindi deve arrivare come testo normale e
    // leggibile: niente file da scaricare come per gli articoli.
    if (prova) console.log(`--- ${file} ---\n${testo}\n`);
    else await messaggio(testo);
    mandate.push(file);
    console.log(`Bozza mandata: ${file}`);
  }

  if (!prova) {
    mkdirSync(path.dirname(MANDATE), { recursive: true });
    writeFileSync(MANDATE, `${JSON.stringify(mandate, null, 2)}\n`);
  }
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
