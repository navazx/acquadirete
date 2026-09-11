#!/usr/bin/env node
// ============================================================================
//  PROPOSTA — la presenta a Matteo appena un agente la spinge su un ramo
//
//  Parte da GitHub Actions a ogni push su un ramo proposta/... (vedi
//  .github/workflows/proposta-annuncia.yml), dopo aver provato a costruire il
//  sito con quelle modifiche.
//
//  Se il sito non si costruisce, la proposta non viene nemmeno presentata:
//  approvarla romperebbe il sito, quindi a Matteo arriva solo l'errore.
//  Se si costruisce:
//    1. la registra fra le proposte in attesa (agenti/proposte.json su main)
//    2. manda su Telegram titolo, note dell'agente e, per gli articoli, il
//       testo completo come file da leggere sul telefono.
//
//  Nomi dei rami:  proposta/articolo-<slug>   proposta/seo-<data>
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { messaggio, documento } from './lib/telegram.mjs';

const SITO = 'https://www.acquadirete.it';
const REPO = 'https://github.com/navazx/acquadirete';
const CARTELLA_MAIN = '/tmp/main-per-le-proposte';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const gitMain = (...args) => git('-C', CARTELLA_MAIN, ...args);

const ramo = process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD');
const tipo = ramo.startsWith('proposta/articolo-') ? 'ARTICOLO' : ramo.startsWith('proposta/seo-') ? 'SEO' : null;

/** Mette la proposta fra quelle in attesa, su main, senza toccare il ramo. */
function registra(voce) {
  git('fetch', 'origin', 'main');
  git('worktree', 'add', '--force', '--detach', CARTELLA_MAIN, 'origin/main');
  const file = `${CARTELLA_MAIN}/agenti/proposte.json`;
  const elenco = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
  const i = elenco.findIndex((p) => p.ramo === voce.ramo);
  // Se l'agente ha rispinto lo stesso ramo, si aggiorna la voce invece di duplicarla.
  if (i >= 0) elenco[i] = { ...elenco[i], ...voce, creata: elenco[i].creata, stato: 'in attesa' };
  else elenco.push(voce);
  writeFileSync(file, `${JSON.stringify(elenco, null, 2)}\n`);

  gitMain('add', 'agenti/proposte.json');
  // [skip netlify]: e' un file di servizio, il sito non va ripubblicato.
  gitMain('commit', '-m', `Proposta in attesa: ${voce.titolo} [skip netlify]`);
  try {
    gitMain('push', 'origin', 'HEAD:main');
  } catch {
    // Qualcun altro ha scritto su main nel frattempo: ci si rimette in coda e si riprova.
    gitMain('fetch', 'origin', 'main');
    gitMain('rebase', 'origin/main');
    gitMain('push', 'origin', 'HEAD:main');
  }
}

async function main() {
  if (!tipo) {
    console.log(`Il ramo ${ramo} non e' una proposta che conosco: non lo presento.`);
    return;
  }

  git('fetch', 'origin', 'main');
  const oggetto = git('log', '-1', '--format=%s');
  const note = git('log', '-1', '--format=%b').slice(0, 2500);
  const titolo = oggetto.replace(/^(articolo|seo)\s*:\s*/i, '');
  const cambiati = git('diff', '--name-only', 'origin/main...HEAD').split('\n').filter(Boolean);

  if (process.env.BUILD_ESITO !== 'success') {
    const log = existsSync('/tmp/build.log')
      ? readFileSync('/tmp/build.log', 'utf8').trim().split('\n').slice(-12).join('\n')
      : '(log non disponibile)';
    await messaggio(
      `La proposta «${titolo}» non passa la prova: con queste modifiche il sito non si costruisce, ` +
      'quindi non te la propongo.\n\n' +
      `Ultime righe dell'errore:\n${log}\n\n` +
      'Il ramo resta lì: chiedi a Claude dal PC di guardarlo.',
    );
    process.exitCode = 1;
    return;
  }

  const anteprima = cambiati.find((f) => f.startsWith('agenti/anteprime/') && f.endsWith('.md'));
  const slug = anteprima ? anteprima.split('/').pop().replace(/\.md$/, '') : null;
  const url = tipo === 'ARTICOLO' && slug ? `${SITO}/blog/${slug}/` : null;

  registra({ ramo, tipo, titolo, creata: new Date().toISOString(), stato: 'in attesa', sha: git('rev-parse', 'HEAD'), url });

  const testo = [
    tipo === 'ARTICOLO' ? `Articolo proposto: «${titolo}»` : `Correzioni SEO proposte: ${titolo}`,
    '',
    note || '(nessuna nota dall\'agente)',
    '',
    anteprima
      ? 'Il testo completo è nel file qui sotto.'
      : `Le modifiche, file per file: ${REPO}/compare/main...${ramo}`,
    '',
    `APPROVA ${tipo} — va online`,
    `RIFIUTA ${tipo} e il motivo — non va online, e il motivo resta come lezione`,
  ].join('\n');

  await messaggio(testo);
  if (anteprima) await documento(anteprima, `Anteprima: ${titolo}`);
  console.log(`Proposta presentata: ${ramo}`);
}

main().catch((e) => {
  console.log(`Errore: ${e.stderr || e.message}`);
  process.exitCode = 1;
});
