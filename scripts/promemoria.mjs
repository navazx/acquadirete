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
// --controllo <file>: un secondo messaggio, mandato solo se l'ultimo commit l'ha
// toccato. Lo usa la scheda Google per il controllo ogni tre mesi (dal 20 ott 2026),
// che non sta nello stesso messaggio perché Telegram taglia a 4096 caratteri.
const fileControllo = opzione('--controllo');

/** Il file è stato toccato dall'ultimo commit? */
function cambiato(f) {
  try {
    return execSync(`git diff --name-only HEAD~1 HEAD -- "${f}"`, { encoding: 'utf8' }).trim() !== '';
  } catch {
    return false;
  }
}

/** Le immagini delle idee toccate dall'ultimo commit, in ordine. */
function fotoNuove() {
  if (!cartellaFoto) return [];
  try {
    return execSync(`git diff --name-only HEAD~1 HEAD -- "${cartellaFoto}"`, { encoding: 'utf8' })
      .split('\n')
      .map((f) => f.trim())
      // idea-<n>.jpg: le grafiche dei post; foto-scheda-<n>.jpg: foto vere di
      // impianti da caricare fra le foto della scheda (dal 20 ott 2026).
      .filter((f) => /\/(idea|foto-scheda)-\d+\.jpg$/.test(f) && existsSync(f))
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
    if (fileControllo) console.log(`Controllo della scheda: ${existsSync(fileControllo) && cambiato(fileControllo) ? 'partirebbe' : 'no, non è cambiato'}`);
    return;
  }
  const { messaggio, fotoDaFile, firmato } = await import('./lib/telegram.mjs');
  await messaggio(testo);
  console.log(`Promemoria inviato: ${file}`);
  for (const f of immagini) {
    const [, tipo, n] = f.match(/(idea|foto-scheda)-(\d+)\.jpg$/);
    const didascalia = tipo === 'idea'
      ? `Immagine pronta per l'idea ${n}: salvala e mettila nel post.`
      : `Foto vera ${n} da aggiungere alle foto della scheda (Foto → Aggiungi foto), non a un post.`;
    await fotoDaFile(f, firmato(didascalia));
    console.log(`Immagine inviata: ${f}`);
  }
  if (fileControllo && existsSync(fileControllo) && cambiato(fileControllo)) {
    const controllo = readFileSync(fileControllo, 'utf8').trim();
    for (let i = 0; i < controllo.length; i += 4000) await messaggio(controllo.slice(i, i + 4000));
    console.log(`Controllo della scheda inviato: ${fileControllo}`);
  }
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
