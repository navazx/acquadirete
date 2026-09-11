#!/usr/bin/env node
// ============================================================================
//  PROMEMORIA — manda su Telegram il testo di un file del repo
//
//  Per i promemoria che non hanno bisogno di pensare: il testo sta in
//  agenti/promemoria/ e si corregge con un commit, senza toccare nessuna
//  routine. E nessun token scritto in giro: sta nei secret di GitHub.
//
//  Uso:    node scripts/promemoria.mjs agenti/promemoria/ads.md
//  Prova:  node scripts/promemoria.mjs agenti/promemoria/ads.md --prova
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
const prova = process.argv.includes('--prova') || process.env.PROVA === 'true';

async function main() {
  if (!file || !existsSync(file)) {
    console.log(`Non trovo il file del promemoria: ${file || '(nessuno indicato)'}`);
    process.exitCode = 1;
    return;
  }
  const testo = readFileSync(file, 'utf8').trim();
  if (!testo) {
    console.log(`Il file ${file} è vuoto: non mando niente.`);
    process.exitCode = 1;
    return;
  }
  if (prova) {
    console.log(`(prova: niente Telegram, ${testo.length} caratteri)\n\n${testo}`);
    return;
  }
  const { messaggio } = await import('./lib/telegram.mjs');
  await messaggio(testo);
  console.log(`Promemoria inviato: ${file}`);
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
