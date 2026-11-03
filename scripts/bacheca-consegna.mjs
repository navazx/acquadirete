#!/usr/bin/env node
// ============================================================================
//  CONSEGNA DELLE NOTE — ultimo passo degli agenti, su GitHub e su claude.ai
//
//  Prende le note lasciate in /tmp/bacheca (da lib/bacheca.mjs, o scritte a
//  mano da un agente Claude come file .json con agente, testo, per) e le scrive
//  nella scheda "Bacheca" del Gestionale, rifacendo la copia agenti/bacheca.md.
//  Si vedono subito nel Cruscotto dell'app.
//
//  Lavora in un worktree separato preso da origin/main: l'agente può aver
//  lasciato la cartella di lavoro su un ramo di proposta, e le note non devono
//  finire dentro la proposta.
//
//  Senza la chiave del foglio (le routine su claude.ai non ce l'hanno) le note
//  vanno su main in agenti/bacheca/in-arrivo/: quel push fa partire il postino
//  (bacheca-postino.yml), che le porta nella scheda in un paio di minuti.
//
//  Una nota sbagliata si scarta con un avviso: la consegna non deve mai far
//  fallire il lavoro dell'agente.
// ============================================================================

import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { CARTELLA, normalizza, idNota } from './lib/bacheca.mjs';
import { passaggio } from './lib/bacheca-postino.mjs';

function leggiNote() {
  let file;
  try { file = readdirSync(CARTELLA).filter((f) => f.endsWith('.json')).sort(); } catch { return []; }
  const note = [];
  const usati = new Set();
  for (const f of file) {
    try {
      const nota = normalizza(JSON.parse(readFileSync(join(CARTELLA, f), 'utf8')));
      // Due note nello stesso millesimo: lo stesso id non ci può stare due volte.
      let id = idNota(nota.quando, nota.agente);
      for (let n = 2; usati.has(id); n += 1) id = `${idNota(nota.quando, nota.agente)}-${n}`;
      usati.add(id);
      note.push({ file: f, nota: { ...nota, id } });
    } catch (e) {
      console.log(`Nota scartata (${f}): ${e.message}`);
    }
  }
  return note;
}

const note = leggiNote();
if (!note.length) {
  console.log('Nessuna nota da consegnare alla bacheca.');
} else {
  try {
    const { ferme, perche } = await passaggio({ nuove: note.map((n) => n.nota) });
    for (const { file } of note) rmSync(join(CARTELLA, file), { force: true });
    const agenti = [...new Set(note.map((n) => n.nota.agente))].join(', ');
    console.log(ferme
      ? `${note.length === 1 ? '1 nota' : `${note.length} note`} di ${agenti} su main, in arrivo: le porta il postino. (${perche})`
      : `${note.length === 1 ? 'Consegnata 1 nota' : `Consegnate ${note.length} note`} alla bacheca (${agenti}).`);
  } catch (e) {
    // Le note restano in /tmp e si perdono col runner: lo si dice, ma il lavoro
    // dell'agente è già fatto e non va segnato come fallito.
    console.log(`Consegna alla bacheca non riuscita: ${e.message}`);
    // Una nota persa non ferma il lavoro dell'agente, ma il giro deve risultare
    // fallito: se no nessuno se ne accorge, e il Direttore non lo può segnalare.
    process.exitCode = 1;
  }
}
