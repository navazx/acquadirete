#!/usr/bin/env node
// ============================================================================
//  CRUSCOTTO  —  gira ogni lunedi' mattina su GitHub Actions
//
//  Scrive una riga a settimana nella scheda "Cruscotto" del Gestionale: e' la
//  memoria condivisa del sistema di agenti. Senza uno storico dei numeri
//  nessun agente puo' dire "il mese scorso era meglio", e quindi nessuno puo'
//  correggere la rotta: e' il livello 0 su cui poggia tutto il resto.
//
//  La scheda la crea da se' al primo giro, con le intestazioni.
//
//  Tutti i valori si scrivono RAW, comprese le date, che restano testo.
//  Volutamente: il Gestionale ha gia' fatto sbagliare un giorno a 58 celle per
//  via del fuso orario, e qui una data e' solo un'etichetta da leggere.
//
//  Prova in locale (calcola e stampa, senza scrivere):
//    GSC_KEY_FILE="../seo-report/gsc-key-readonly.json" node scripts/cruscotto.mjs --prova
// ============================================================================

import { readFileSync } from 'node:fs';
import { getAccessToken, query, SITE_URL, ymd } from './lib/gsc.mjs';
import { sheetsToken, leggi, aggiungi, creaSchedaSeManca, dataItaliana } from './lib/gestionale.mjs';

const SCHEDA = 'Cruscotto';
const INTESTAZIONI = [
  'Settimana', 'Dal', 'Al',
  'Lead sito', 'Lead Meta', 'Lead altro',
  'Lead totali', 'Clienti totali',
  'Clic 28gg', 'Impressioni 28gg', 'Pos. media 28gg', 'GSC al',
  'Articoli blog', 'Note',
];

const prova = process.argv.includes('--prova');
const it = (d) => d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Numero di settimana ISO 8601 e anno di riferimento. */
function settimanaIso(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const capodanno = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - capodanno) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(n).padStart(2, '0')}`;
}

/** Lunedi' 00:00 e domenica 23:59 della settimana appena conclusa. */
function settimanaScorsa() {
  const oggi = new Date();
  const domenica = new Date(oggi);
  domenica.setDate(oggi.getDate() - ((oggi.getDay() + 6) % 7) - 1);
  domenica.setHours(23, 59, 59, 999);
  const lunedi = new Date(domenica);
  lunedi.setDate(domenica.getDate() - 6);
  lunedi.setHours(0, 0, 0, 0);
  return { lunedi, domenica };
}

async function datiGsc() {
  // Finestra di 28 giorni che finisce 3 giorni fa: gli ultimi giorni di Search
  // Console sono ancora parziali e falserebbero il confronto fra settimane.
  const fine = new Date(); fine.setDate(fine.getDate() - 3);
  const inizio = new Date(fine); inizio.setDate(fine.getDate() - 27);
  const token = await getAccessToken();
  const r = await query(token, { startDate: ymd(inizio), endDate: ymd(fine), dimensions: [], rowLimit: 1 });
  const riga = (r.rows || [])[0];
  return {
    clic: riga ? riga.clicks : 0,
    impressioni: riga ? riga.impressions : 0,
    posizione: riga ? riga.position.toFixed(1) : '',
    al: it(fine),
    sito: SITE_URL,
  };
}

function contaArticoli() {
  try {
    return (readFileSync('lib/blogPosts.ts', 'utf8').match(/^\s{4}"?slug"?\s*:/gm) || []).length;
  } catch {
    return '';
  }
}

async function main() {
  const { lunedi, domenica } = settimanaScorsa();
  const token = await sheetsToken();

  const righeLead = await leggi(token, 'Lead-Contatti!A4:H1000');
  const lead = righeLead.slice(1)
    .map((r) => ({ data: dataItaliana(r[0]), provenienza: (r[3] || '').trim(), stato: (r[5] || '').trim(), nome: (r[1] || '').trim() }))
    .filter((l) => l.nome);

  const dellaSettimana = lead.filter((l) => l.data && l.data >= lunedi && l.data <= domenica);
  const conta = (test) => dellaSettimana.filter(test).length;

  const gsc = await datiGsc();

  const riga = [
    settimanaIso(lunedi),
    it(lunedi),
    it(domenica),
    conta((l) => l.provenienza === 'Sito web'),
    conta((l) => l.provenienza.startsWith('Meta') || l.provenienza === 'Instagram' || l.provenienza === 'Facebook'),
    conta((l) => !['Sito web', 'Instagram', 'Facebook'].includes(l.provenienza) && !l.provenienza.startsWith('Meta')),
    lead.length,
    lead.filter((l) => l.stato === 'Cliente').length,
    gsc.clic,
    gsc.impressioni,
    gsc.posizione,
    gsc.al,
    contaArticoli(),
    '',
  ];

  if (prova) {
    console.log('(prova: non scrivo sul foglio)\n');
    INTESTAZIONI.forEach((h, i) => console.log(`${h.padEnd(18)} ${riga[i]}`));
    return;
  }

  const creata = await creaSchedaSeManca(token, SCHEDA, INTESTAZIONI);
  if (creata) console.log(`Scheda "${SCHEDA}" creata.`);

  // Una riga per settimana: se il lunedi' il giro parte due volte, non raddoppia.
  const gia = (await leggi(token, `${SCHEDA}!A2:A500`)).map((r) => r[0]);
  if (gia.includes(riga[0])) {
    console.log(`La settimana ${riga[0]} c'e' gia': non scrivo niente.`);
    return;
  }

  await aggiungi(token, `${SCHEDA}!A1`, [riga]);
  console.log(`Scritta la riga ${riga[0]}: ${riga[6]} lead totali, ${riga[7]} clienti, ${riga[8]} clic.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
