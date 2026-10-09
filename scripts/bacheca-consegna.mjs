#!/usr/bin/env node
// ============================================================================
//  CONSEGNA DELLE NOTE — ultimo passo dei workflow degli agenti su GitHub
//
//  Prende le note lasciate in /tmp/bacheca (da lib/bacheca.mjs, o scritte a
//  mano da un agente Claude come file .json con agente, testo, per) e le mette
//  su main in agenti/bacheca/in-arrivo/. Il postino (routine cloud, ogni
//  mattina) le porta poi sulla bacheca su claude.ai.
//
//  Lavora in un worktree separato preso da origin/main: l'agente può aver
//  lasciato la cartella di lavoro su un ramo di proposta, e le note non devono
//  finire dentro la proposta.
//
//  Una nota sbagliata si scarta con un avviso: la consegna non deve mai far
//  fallire il lavoro dell'agente.
// ============================================================================

import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { CARTELLA, normalizza, idNota } from './lib/bacheca.mjs';

const DESTINAZIONE = 'agenti/bacheca/in-arrivo';
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

function leggiNote() {
  let file;
  try { file = readdirSync(CARTELLA).filter((f) => f.endsWith('.json')).sort(); } catch { return []; }
  const note = [];
  for (const f of file) {
    try {
      const nota = normalizza(JSON.parse(readFileSync(join(CARTELLA, f), 'utf8')));
      note.push({ file: f, nota });
    } catch (e) {
      console.log(`Nota scartata (${f}): ${e.message}`);
    }
  }
  return note;
}

function main() {
  const note = leggiNote();
  if (!note.length) {
    console.log('Nessuna nota da consegnare alla bacheca.');
    return;
  }

  git(['fetch', '--quiet', 'origin', 'main']);
  const dir = mkdtempSync(join(tmpdir(), 'bacheca-'));
  git(['worktree', 'add', '--detach', dir, 'origin/main']);
  try {
    mkdirSync(join(dir, DESTINAZIONE), { recursive: true });
    const usati = new Set();
    for (const { nota } of note) {
      let id = idNota(nota.quando, nota.agente);
      for (let n = 2; usati.has(id); n += 1) id = `${idNota(nota.quando, nota.agente)}-${n}`;
      usati.add(id);
      writeFileSync(join(dir, DESTINAZIONE, `${id}.json`), `${JSON.stringify(nota, null, 2)}\n`);
    }
    git(['add', DESTINAZIONE], dir);
    const agenti = [...new Set(note.map((n) => n.nota.agente))].join(', ');
    git(['-c', 'user.name=agente-bacheca', '-c', 'user.email=noreply@acquadirete.it', 'commit', '--quiet', '-m',
      `Bacheca: ${note.length} ${note.length === 1 ? 'nota' : 'note'} da ${agenti} [skip netlify]`], dir);

    // Qualcun altro può aver spinto su main nel frattempo: si riprova dopo il rebase.
    for (let tentativo = 1; ; tentativo += 1) {
      try {
        git(['push', '--quiet', 'origin', 'HEAD:main'], dir);
        break;
      } catch (e) {
        if (tentativo >= 3) throw e;
        git(['pull', '--quiet', '--rebase', 'origin', 'main'], dir);
      }
    }
    for (const { file } of note) rmSync(join(CARTELLA, file), { force: true });
    console.log(`${note.length === 1 ? 'Consegnata 1 nota' : `Consegnate ${note.length} note`} alla bacheca (${agenti}).`);
  } finally {
    try { git(['worktree', 'remove', '--force', dir]); } catch { rmSync(dir, { recursive: true, force: true }); }
  }
}

try {
  main();
} catch (e) {
  // Le note restano in /tmp e si perdono col runner: lo si dice, ma il lavoro
  // dell'agente è già fatto e non va segnato come fallito.
  console.log(`Consegna alla bacheca non riuscita: ${e.message}`);
}
