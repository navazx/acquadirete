#!/usr/bin/env node
// ============================================================================
//  IL MECCANICO, primo passo — raccoglie le prove prima che lui cominci
//
//  Legge i guasti che gli hanno passato (/tmp/meccanico-problemi.json) e mette
//  in /tmp/meccanico/ quello che serve per capirli, preso da GitHub:
//    giri-<workflow>.json     gli ultimi giri di ogni workflow nominato
//    log-<giro>-<passo>.txt   la coda del log dei passi falliti
//    giri-recenti.json        tutti i giri degli ultimi 3 giorni, con chi li ha
//                             avviati: "schedule" = l'orologio di GitHub,
//                             "workflow_dispatch" = la sveglia o un altro agente
//
//  Sono conti e copie, niente intelligenza artificiale: il Meccanico parte dalle
//  prove, non da quello che immagina.
// ============================================================================

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { github } from './lib/meccanico.mjs';

const ENTRATA = process.env.MECCANICO_PROBLEMI || '/tmp/meccanico-problemi.json';
const USCITA = process.env.MECCANICO_PROVE || '/tmp/meccanico';
const CODA_DEL_LOG = 300;   // righe

const giro = (g) => ({
  giro: g.id, workflow: g.path?.split('/').pop(), nome: g.name, avviato_da: g.event,
  creato: g.created_at, finito: g.updated_at, stato: g.status, esito: g.conclusion, tentativo: g.run_attempt,
});

async function json(percorso) {
  const res = await github(percorso);
  if (!res.ok) throw new Error(`GitHub ${res.status} su ${percorso.split('?')[0]}`);
  return res.json();
}

async function logFalliti(id) {
  const { jobs = [] } = await json(`/actions/runs/${id}/jobs?per_page=50`);
  const scritti = [];
  for (const j of jobs.filter((x) => x.conclusion === 'failure' || x.conclusion === 'timed_out' || x.conclusion === 'cancelled')) {
    const passi = (j.steps || []).filter((s) => s.conclusion === 'failure').map((s) => s.name);
    const res = await github(`/actions/jobs/${j.id}/logs`);
    if (!res.ok) { scritti.push(`${j.name}: log non leggibile (HTTP ${res.status})`); continue; }
    const righe = (await res.text()).split('\n');
    const file = `${USCITA}/log-${id}-${j.name.replace(/[^\w-]+/g, '_')}.txt`;
    writeFileSync(file, [
      `Giro ${id}, lavoro "${j.name}", esito ${j.conclusion}. Passi falliti: ${passi.join(', ') || '(nessuno segnato)'}.`,
      `Ultime ${Math.min(CODA_DEL_LOG, righe.length)} righe di ${righe.length}:`,
      '',
      ...righe.slice(-CODA_DEL_LOG),
    ].join('\n'));
    scritti.push(file);
  }
  return scritti;
}

async function main() {
  mkdirSync(USCITA, { recursive: true });
  const { problemi = [] } = JSON.parse(readFileSync(ENTRATA, 'utf8'));
  const indice = [];

  for (const w of [...new Set(problemi.map((p) => p.workflow).filter(Boolean))]) {
    try {
      const { workflow_runs: elenco = [] } = await json(`/actions/workflows/${w}/runs?per_page=10`);
      writeFileSync(`${USCITA}/giri-${w.replace(/\.yml$/, '')}.json`, `${JSON.stringify(elenco.map(giro), null, 2)}\n`);
      indice.push(`giri-${w.replace(/\.yml$/, '')}.json: gli ultimi ${elenco.length} giri di ${w}`);
    } catch (e) { indice.push(`${w}: ${e.message}`); }
  }

  for (const id of [...new Set(problemi.map((p) => p.giro).filter(Boolean))]) {
    try {
      const file = await logFalliti(id);
      indice.push(file.length ? `giro ${id}: ${file.join(', ')}` : `giro ${id}: nessun passo fallito`);
    } catch (e) { indice.push(`giro ${id}: ${e.message}`); }
  }

  try {
    const dal = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
    const { workflow_runs: elenco = [] } = await json(`/actions/runs?per_page=100&created=${encodeURIComponent(`>=${dal}`)}`);
    writeFileSync(`${USCITA}/giri-recenti.json`, `${JSON.stringify(elenco.map(giro), null, 2)}\n`);
    indice.push(`giri-recenti.json: ${elenco.length} giri degli ultimi 3 giorni, di tutti i workflow`);
  } catch (e) { indice.push(`giri recenti: ${e.message}`); }

  writeFileSync(`${USCITA}/INDICE.txt`, `${indice.join('\n')}\n`);
  console.log(`Prove raccolte per ${problemi.length} ${problemi.length === 1 ? 'guasto' : 'guasti'}:\n${indice.map((r) => `  ${r}`).join('\n')}`);
}

main().catch((e) => {
  // Senza prove il Meccanico lavora lo stesso, con quello che trova da se'.
  console.log(`Raccolta delle prove non riuscita: ${e.message}`);
});
