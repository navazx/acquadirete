#!/usr/bin/env node
// ============================================================================
//  PROMEMORIA — manda su Telegram il testo di un file del repo
//
//  Per i promemoria che non hanno bisogno di pensare: il testo sta in
//  agenti/promemoria/ e si corregge con un commit, senza toccare nessuna
//  routine. E nessun token scritto in giro: sta nei secret di GitHub.
//
//  Uso:    node scripts/promemoria.mjs agenti/promemoria/google-business.md
//  Prova:  node scripts/promemoria.mjs agenti/promemoria/google-business.md --prova
//
//  --link <indirizzo> [--link-testo "..."]: aggiunge in fondo un link fisso.
//  Sta qui e non nel testo scritto dalla routine perche' non deve dipendere da
//  quello che l'agente si ricorda di mettere.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';

const file = process.argv[2];
const prova = process.argv.includes('--prova') || process.env.PROVA === 'true';
const opzione = (nome) => {
  const i = process.argv.indexOf(nome);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const link = opzione('--link');
const linkTesto = opzione('--link-testo') || 'Apri qui:';

async function main() {
  if (!file || !existsSync(file)) {
    console.log(`Non trovo il file del promemoria: ${file || '(nessuno indicato)'}`);
    process.exitCode = 1;
    return;
  }
  let testo = readFileSync(file, 'utf8').trim();
  if (!testo) {
    console.log(`Il file ${file} è vuoto: non mando niente.`);
    process.exitCode = 1;
    return;
  }
  if (link) {
    const coda = `\n\n${linkTesto}\n${link}`;
    // Telegram taglia a 4096 caratteri: si accorcia il testo, mai il link.
    testo = testo.slice(0, 4096 - coda.length) + coda;
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
