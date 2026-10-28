#!/usr/bin/env node
// ============================================================================
//  Apre i numeri del cruscotto per il postino (dal 28 ott 2026)
//
//  scripts/cruscotto-oggi.mjs mette su main agenti/cruscotto/oggi.enc, chiuso
//  con una chiave nuova ogni giorno, e sveglia il postino con quella chiave nel
//  messaggio. Il postino esegue:
//    node scripts/cruscotto-apri.mjs <chiave> /tmp/cruscotto/oggi.json
//  e manda il file nel database della pagina (documento cruscotto/oggi).
//  Non stampa i numeri: solo quanti contatti e di quando sono.
// ============================================================================

import { createDecipheriv } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const [chiave, uscita = '/tmp/cruscotto/oggi.json'] = process.argv.slice(2);
if (!/^[0-9a-f]{64}$/i.test(chiave || '')) {
  console.error('Serve la chiave: 64 caratteri esadecimali, quella del messaggio che ha svegliato il postino.');
  process.exit(1);
}

try {
  const tutto = Buffer.from(readFileSync('agenti/cruscotto/oggi.enc', 'utf8').trim(), 'base64');
  const d = createDecipheriv('aes-256-gcm', Buffer.from(chiave, 'hex'), tutto.subarray(0, 12));
  d.setAuthTag(tutto.subarray(12, 28));
  const dati = JSON.parse(Buffer.concat([d.update(tutto.subarray(28)), d.final()]).toString('utf8'));
  mkdirSync(dirname(uscita), { recursive: true });
  writeFileSync(uscita, JSON.stringify(dati));
  console.log(`Aperto: ${dati.lead.length} contatti, numeri del ${dati.aggiornato.slice(0, 10)}. File pronto: ${uscita}`);
} catch (e) {
  // Chiave di un altro giorno (il file su main è già più nuovo) o file rovinato.
  console.error(`Non si apre: ${e.message}. Se il file su main è di un giorno dopo, la chiave è vecchia: non fare niente.`);
  process.exit(1);
}
