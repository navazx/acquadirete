#!/usr/bin/env node
// ============================================================================
//  IL MECCANICO, ultimo passo — fa quello che ha deciso e lo dice a Matteo
//
//  Il Meccanico (l'agente con l'IA) non tocca GitHub con le sue mani: scrive in
//  /tmp/meccanico-azioni.json cosa vuole far ripartire, e questo script lo fa,
//  ma solo se e' una cosa dell'elenco qui sotto:
//    { "azione": "rilancia", "giro": 123 }           rilancia un giro fallito
//    { "azione": "avvia", "workflow": "x.yml" }      fa partire un agente della
//                                                    tabella degli orari
//  Poi manda a Matteo /tmp/meccanico-esito.txt, firmato MECCANICO.
//
//  Se il Meccanico non ha scritto niente (l'IA non ha girato), a Matteo arriva
//  comunque l'elenco dei guasti e cosa succede adesso: mai silenzio.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { AGENTI } from '../netlify/functions/_shared/orari.mjs';
import { github, avvia } from './lib/meccanico.mjs';
import { lasciaNota } from './lib/bacheca.mjs';

const PROBLEMI = '/tmp/meccanico-problemi.json';
const ESITO = '/tmp/meccanico-esito.txt';
const AZIONI = '/tmp/meccanico-azioni.json';
const MAX_AZIONI = 4;

const prova = process.env.PROVA === 'true';
const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

/** Esegue le azioni chieste, solo quelle permesse. Torna le righe da dire a Matteo. */
export async function esegui(azioni, { fai = !prova } = {}) {
  const righe = [];
  for (const a of azioni.slice(0, MAX_AZIONI)) {
    if (a.azione === 'rilancia' && Number.isInteger(a.giro)) {
      if (!fai) { righe.push(`(prova) rilancerei il giro ${a.giro}`); continue; }
      const res = await github(`/actions/runs/${a.giro}/rerun-failed-jobs`, { method: 'POST' });
      righe.push(res.status === 201 ? `Ho rilanciato il giro fallito (${a.perche || a.giro}).` : `Non sono riuscito a rilanciare il giro ${a.giro}: GitHub ha risposto ${res.status}.`);
    } else if (a.azione === 'avvia') {
      const agente = AGENTI.find((x) => x.workflow === a.workflow);
      if (!agente) { righe.push(`Non ho avviato "${a.workflow}": non è un agente della tabella degli orari.`); continue; }
      if (!fai) { righe.push(`(prova) farei partire ${agente.nome}`); continue; }
      const errore = await avvia(agente.workflow, agente.inputs);
      righe.push(errore ? `Non sono riuscito a far partire ${agente.nome}: ${errore}.` : `Ho fatto partire ${agente.nome}.`);
    } else {
      righe.push(`Azione non permessa, saltata: ${JSON.stringify(a).slice(0, 120)}`);
    }
  }
  if (azioni.length > MAX_AZIONI) righe.push(`Altre ${azioni.length - MAX_AZIONI} azioni saltate: ne faccio al massimo ${MAX_AZIONI} per volta.`);
  return righe;
}

async function main() {
  let azioni = [];
  try { azioni = JSON.parse(leggi(AZIONI) || '[]'); } catch { console.log('Il file delle azioni non si legge: nessuna azione.'); }
  const fatte = Array.isArray(azioni) && azioni.length ? await esegui(azioni) : [];

  let testo = leggi(ESITO);
  let riuscito = Boolean(testo);
  if (!testo) {
    let guasti = [];
    try { guasti = JSON.parse(leggi(PROBLEMI)).problemi || []; } catch { /* niente elenco */ }
    testo = [
      'Non sono riuscito a guardare i guasti di oggi: mi sono fermato prima di finire.',
      guasti.length ? `Erano questi:\n${guasti.map((g) => `• ${g.testo}`).join('\n')}` : '',
      'Il Direttore me li ripassa al controllo di domani mattina. Se mi fermo anche domani, vuol dire che il guasto è mio: a quel punto serve aprire Claude dal PC e dirgli «guarda perché il Meccanico non parte».',
    ].filter(Boolean).join('\n\n');
  }
  if (fatte.length) testo += `\n\n${fatte.join('\n')}`;

  if (prova) {
    console.log(`(prova: niente Telegram)\n\n🤖 MECCANICO\n\n${testo}`);
    return;
  }
  const { messaggio } = await import('./lib/telegram.mjs');
  for (let i = 0; i < testo.length; i += 3900) await messaggio(testo.slice(i, i + 3900));
  console.log(`Esito mandato a Matteo (${testo.length} caratteri, ${fatte.length} azioni).`);

  if (!riuscito) {
    try { lasciaNota('meccanico', 'Chiamato per dei guasti, ma mi sono fermato prima di finire. Il Direttore me li ripassa domani.', ['direttore', 'matteo']); } catch (e) { console.log(`Nota non lasciata: ${e.message}`); }
    process.exitCode = 1;   // il giro risulta fallito: il Direttore lo vede
  }
}

if (process.argv[1] && process.argv[1].endsWith('meccanico-manda.mjs')) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
