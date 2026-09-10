#!/usr/bin/env node
// ============================================================================
//  META — controlla il token e ricava quello della pagina
//
//  Serve per non dover incollare un token di 200 caratteri dentro un comando:
//  lo si mette in un file, e questo script fa il resto e spiega cosa manca.
//
//  Uso:
//    1. incolla il token dell'utente di sistema in  acquadirete/token-meta.txt
//    2. da acquadirete/sito:  node scripts/meta-token.mjs
//
//  Non stampa mai un token per intero e scrive quello della pagina in un file
//  a parte. La cartella acquadirete/ non e' un repo git: i file restano sul PC.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGINA = '1164447766749757';           // pagina Facebook Acquadirete
const API = 'https://graph.facebook.com/v21.0';

const SERVONO = [
  ['leads_retrieval', 'ricevere i lead dai moduli'],
  ['pages_show_list', 'vedere la pagina'],
  ['pages_read_engagement', 'leggere la pagina'],
  ['pages_manage_metadata', 'restare iscritti al webhook dei lead'],
  ['pages_manage_ads', 'leggere i moduli lead'],
  ['pages_manage_posts', 'PUBBLICARE su Facebook'],
  ['instagram_basic', 'vedere il profilo Instagram'],
  ['instagram_content_publish', 'PUBBLICARE su Instagram'],
];

// Il percorso di default parte da dove sta lo script, non da dove viene
// lanciato: cosi' il comando funziona anche da un'altra cartella.
const CARTELLA_SCRIPT = dirname(fileURLToPath(import.meta.url));
const percorso = process.argv[2]
  ? resolve(process.argv[2])
  : resolve(CARTELLA_SCRIPT, '../../token-meta.txt');
const spia = (t) => `${t.slice(0, 6)}…${t.slice(-4)} (${t.length} caratteri)`;

function leggiToken() {
  if (!existsSync(percorso)) {
    console.log(`Non trovo il file:\n  ${percorso}\n`);
    console.log('Crealo con Blocco note, incollaci dentro il token che ti ha dato Meta e salvalo.');
    return null;
  }
  const grezzo = readFileSync(percorso, 'utf8');
  const token = grezzo.replace(/\s+/g, '');   // via spazi, a capo e righe vuote
  if (!token) {
    console.log('Il file c\'e\' ma e\' vuoto: incollaci il token e risalva.');
    return null;
  }
  if (!token.startsWith('EAA')) {
    console.log(`Attenzione: il token comincia per "${token.slice(0, 3)}" invece che per "EAA".`);
    console.log('Forse hai copiato la cosa sbagliata. Provo lo stesso.\n');
  }
  return token;
}

async function graph(path, params) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url);
  const dati = await res.json();
  return { ok: res.ok && !dati.error, dati };
}

async function main() {
  const token = leggiToken();
  if (!token) { process.exitCode = 1; return; }
  console.log(`Token letto: ${spia(token)}\n`);

  // --- 1. che permessi ha davvero ------------------------------------------
  const debug = await graph('/debug_token', { input_token: token, access_token: token });
  if (debug.ok && debug.dati.data) {
    const d = debug.dati.data;
    const hanno = new Set(d.scopes || []);
    const mancanti = SERVONO.filter(([s]) => !hanno.has(s));

    console.log(d.expires_at === 0 ? 'Scadenza: mai. Giusto cosi\'.' : `Scadenza: ${new Date(d.expires_at * 1000).toLocaleString('it-IT')}. Doveva essere "mai".`);

    if (mancanti.length) {
      console.log(`\nMANCANO ${mancanti.length} PERMESSI:`);
      for (const [s, a_che_serve] of mancanti) console.log(`  - ${s}  (serve per: ${a_che_serve})`);
      console.log('\nTorna su Business Settings, rigenera il token spuntando anche questi,');
      console.log('risalva il file e rilancia questo comando.');
      { process.exitCode = 1; return; }
    }
    console.log('Permessi: ci sono tutti e otto.');
  } else {
    console.log('Non sono riuscito a leggere i permessi del token.');
    console.log(`Meta dice: ${debug.dati.error?.message || 'errore sconosciuto'}`);
    console.log('\nSe dice "Invalid OAuth access token", il token e\' sbagliato o scaduto: rigeneralo.');
    { process.exitCode = 1; return; }
  }

  // --- 2. la pagina e Instagram --------------------------------------------
  const pagina = await graph(`/${PAGINA}`, {
    fields: 'name,access_token,instagram_business_account{id,username}',
    access_token: token,
  });
  if (!pagina.ok) {
    console.log(`\nNon riesco a leggere la pagina. Meta dice: ${pagina.dati.error?.message}`);
    console.log('Di solito vuol dire che la pagina non e\' assegnata all\'utente di sistema.');
    { process.exitCode = 1; return; }
  }

  console.log(`\nPagina: ${pagina.dati.name}`);

  const ig = pagina.dati.instagram_business_account;
  if (ig) {
    console.log(`Instagram: @${ig.username || '?'} — id ${ig.id}`);
  } else {
    console.log('Instagram: NON COLLEGATO.');
    console.log('  Facebook pubblichera\' lo stesso, Instagram no.');
    console.log('  Si collega da business.facebook.com/settings/instagram-accounts');
  }

  const tokenPagina = pagina.dati.access_token;
  if (!tokenPagina) {
    console.log('\nLa pagina non mi ha dato un token. Controlla che l\'utente di sistema abbia accesso completo alla pagina.');
    { process.exitCode = 1; return; }
  }

  const uscita = resolve(dirname(percorso), 'token-pagina.txt');
  writeFileSync(uscita, tokenPagina);

  console.log(`\n${'-'.repeat(64)}`);
  console.log('FATTO. Il token della pagina e\' qui:');
  console.log(`  ${uscita}`);
  console.log('\nAprilo, copia tutto il contenuto e incollalo su Netlify come');
  console.log('  META_PUBLISH_TOKEN   (scope: all, NON secret)');
  console.log('  https://app.netlify.com/projects/acquadirete/configuration/env');
  if (ig) console.log(`\nPoi dimmi l'id Instagram: ${ig.id}`);
}

main().catch((e) => {
  console.log(`Qualcosa e' andato storto: ${e.message}`);
  process.exitCode = 1;
});
