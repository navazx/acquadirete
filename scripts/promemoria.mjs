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
//
//  --foto <cartella>: dopo il testo manda le immagini idea-<n>.jpg di quella
//  cartella (fatte con scripts/grafica-scheda.mjs), ma solo quelle arrivate con
//  l'ultimo commit: se un mese l'agente non le rifa', a Matteo non tornano
//  quelle del mese prima sotto un testo che parla d'altro. Il checkout deve
//  avere almeno due commit (fetch-depth: 2).
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const file = process.argv[2];
const prova = process.argv.includes('--prova') || process.env.PROVA === 'true';
const opzione = (nome) => {
  const i = process.argv.indexOf(nome);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const link = opzione('--link');
const linkTesto = opzione('--link-testo') || 'Apri qui:';
const cartellaFoto = opzione('--foto');

/** Le immagini delle idee toccate dall'ultimo commit, in ordine. */
function fotoNuove() {
  if (!cartellaFoto) return [];
  try {
    return execSync(`git diff --name-only HEAD~1 HEAD -- "${cartellaFoto}"`, { encoding: 'utf8' })
      .split('\n')
      .map((f) => f.trim())
      .filter((f) => /\/idea-\d+\.jpg$/.test(f) && existsSync(f))
      .sort();
  } catch {
    return [];
  }
}

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
  const immagini = fotoNuove();
  if (prova) {
    console.log(`(prova: niente Telegram, ${testo.length} caratteri)\n\n${testo}`);
    if (cartellaFoto) console.log(`\nImmagini che partirebbero: ${immagini.join(', ') || 'nessuna'}`);
    return;
  }
  const { messaggio, fotoDaFile, firmato } = await import('./lib/telegram.mjs');
  await messaggio(testo);
  console.log(`Promemoria inviato: ${file}`);
  for (const f of immagini) {
    const n = f.match(/idea-(\d+)\.jpg$/)[1];
    await fotoDaFile(f, firmato(`Immagine pronta per l'idea ${n}: salvala e mettila nel post.`));
    console.log(`Immagine inviata: ${f}`);
  }
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
