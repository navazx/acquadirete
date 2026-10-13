#!/usr/bin/env node
// ============================================================================
//  LE SCRITTE DEL SITO SULLE RECENSIONI — i due passi senza IA
//
//  Il controllo giornaliero (agente-recensioni.mjs) si accorge di due cose che
//  rendono vecchie le scritte del sito: il totale arriva alla decina dopo ("130+"
//  deve diventare "140+"), o la media scende e le frasi "a 5 stelle" vanno
//  rilette. Fino al 13 ott 2026 scriveva a Matteo "chiedilo a Claude dal PC".
//  Ora lascia il lavoro in /tmp/recensioni-lavori.json, e:
//
//    node scripts/recensioni-testi.mjs avvia
//        (in recensioni.yml, DOPO che media e totale sono stati spinti su main)
//        fa partire recensioni-testi.yml, dove l'agente prepara la proposta.
//
//    node scripts/recensioni-testi.mjs manda
//        (in recensioni-testi.yml, dopo l'agente) se la proposta e' partita non
//        fa niente: a Matteo arriva quella. Se no gli manda l'esito scritto
//        dall'agente. Se non c'e' nemmeno l'esito, chiama il Meccanico.
// ============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { avvia, chiamaMeccanico } from './lib/meccanico.mjs';

const LAVORI = process.env.RECENSIONI_LAVORI || '/tmp/recensioni-lavori.json';
const ESITO = '/tmp/recensioni-esito.txt';
const RAMO = '/tmp/recensioni-ramo.txt';
const CHI = 'AGENTE RECENSIONI';

const prova = process.env.PROVA === 'true';
const leggi = (f) => (existsSync(f) ? readFileSync(f, 'utf8').trim() : '');

async function faiPartire() {
  const testo = leggi(LAVORI);
  if (!testo) { console.log('Nessuna scritta del sito da aggiornare.'); return; }
  const lavori = JSON.parse(testo);
  if (!Array.isArray(lavori) || !lavori.length) { console.log('Nessuna scritta del sito da aggiornare.'); return; }

  const errore = await avvia('recensioni-testi.yml', { lavori: JSON.stringify(lavori), prova: 'false' });
  if (!errore) { console.log(`Avviato l'aggiornamento delle scritte (${lavori.map((l) => l.lavoro).join(', ')}).`); return; }

  // A Matteo e' gia' stato scritto che la modifica arriva: se non parte, non
  // deve restare ad aspettarla.
  console.log(`L'aggiornamento delle scritte non e' partito: ${errore}`);
  const meccanico = await chiamaMeccanico('Agente Recensioni', [{
    tipo: 'non-partito', nome: 'Recensioni - aggiorna le scritte del sito', workflow: 'recensioni-testi.yml',
    testo: `Il controllo delle recensioni doveva far partire l'aggiornamento delle scritte del sito (${lavori.map((l) => l.lavoro).join(', ')}) ma l'avvio è stato rifiutato: ${errore}.`,
    lavori,
  }]);
  const { messaggio } = await import('./lib/telegram.mjs');
  await messaggio(
    'Non sono riuscito a far partire la modifica alle scritte del sito che ti avevo annunciato. ' +
    (meccanico ? 'Ci riprovo al prossimo controllo.' : 'L\'ho passato al Meccanico: ti scrive lui.'),
    { chi: CHI },
  );
  process.exitCode = 1;
}

async function manda() {
  const ramo = leggi(RAMO);
  if (ramo) { console.log(`Proposta spinta su ${ramo}: a Matteo arriva quella.`); return; }

  const esito = leggi(ESITO);
  if (esito) {
    if (prova) { console.log(`(prova: niente Telegram)\n\n🤖 ${CHI}\n\n${esito}`); return; }
    const { messaggio } = await import('./lib/telegram.mjs');
    for (let i = 0; i < esito.length; i += 3900) await messaggio(esito.slice(i, i + 3900), { chi: CHI });
    console.log(`Esito mandato a Matteo (${esito.length} caratteri).`);
    return;
  }

  // Ne' proposta ne' esito: l'agente si e' fermato a meta'.
  console.log('L\'agente non ha lasciato ne\' una proposta ne\' un esito.');
  if (prova) return;
  const errore = await chiamaMeccanico('Agente Recensioni', [{
    tipo: 'fallito', nome: 'Recensioni - aggiorna le scritte del sito', workflow: 'recensioni-testi.yml',
    giro: Number(process.env.GITHUB_RUN_ID) || undefined,
    testo: `L'agente che aggiorna le scritte del sito sulle recensioni si è fermato senza preparare la proposta e senza dire perché. Il lavoro era: ${leggi(LAVORI).slice(0, 600)}`,
  }]);
  const { messaggio } = await import('./lib/telegram.mjs');
  await messaggio(
    'Non sono riuscito a preparare la modifica alle scritte del sito che ti avevo annunciato. ' +
    (errore ? 'Il Direttore lo segnala al controllo di domani mattina.' : 'L\'ho passato al Meccanico: guarda lui perché e ti scrive.'),
    { chi: CHI },
  );
  process.exitCode = 1;
}

const passo = process.argv[2];
(passo === 'avvia' ? faiPartire() : passo === 'manda' ? manda() : Promise.reject(new Error('Uso: node scripts/recensioni-testi.mjs avvia|manda')))
  .catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
