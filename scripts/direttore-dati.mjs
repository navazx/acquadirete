#!/usr/bin/env node
// ============================================================================
//  DIRETTORE — passo 1: raccoglie i numeri del mese
//
//  Il Direttore (skill .claude/skills/direttore, workflow direttore.yml) gira il
//  1° del mese e sceglie le 3 priorita' del mese che comincia. Questo script gli
//  prepara i fatti in un file solo, cosi' lui ragiona invece di andarli a cercare:
//
//    - la tabella settimanale della scheda Cruscotto (contatti, clienti, Google,
//      spesa e costo per cliente, scritta ogni lunedi' da cruscotto.mjs)
//    - i contatti del mese per provenienza, stato e zona
//    - Search Console: mese contro mese prima, e le ricerche che si sono mosse
//    - i segnali delle posizioni, le proposte decise, articoli e post usciti,
//      le recensioni, e gli ordini del mese prima
//
//  Il file NON va mai nel repo, che e' pubblico: dentro c'e' la spesa. Si scrive
//  in /tmp (o dove dice il primo argomento) e si butta a fine giro. Per lo
//  stesso motivo qui non si stampa nessuna cifra in euro.
//
//  Prova in locale:
//    GSC_KEY_FILE="../seo-report/gsc-key-readonly.json" node scripts/direttore-dati.mjs /percorso/dati.json [AAAA-MM]
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { getAccessToken, query, ymd } from './lib/gsc.mjs';
import { sheetsToken, leggi, leggiLead } from './lib/gestionale.mjs';

process.env.TZ = 'Europe/Rome';

const uscita = process.argv[2] || '/tmp/direttore-dati.json';
// Il mese da giudicare: quello appena finito, salvo indicazione.
const [anno, mese] = (() => {
  if (process.argv[3]) return process.argv[3].split('-').map(Number);
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
  return [d.getFullYear(), d.getMonth() + 1];
})();
const inizio = new Date(anno, mese - 1, 1);
const fine = new Date(anno, mese, 0);
const inizioPrima = new Date(anno, mese - 2, 1);
const finePrima = new Date(anno, mese - 1, 0);
const etichetta = `${anno}-${String(mese).padStart(2, '0')}`;
const nelMese = (d, a = inizio, b = fine) => d && d >= a && d <= new Date(b.getFullYear(), b.getMonth(), b.getDate(), 23, 59, 59);
const leggiJson = (f, vuoto) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : vuoto);
const git = (...a) => { try { return execFileSync('git', a, { encoding: 'utf8' }); } catch { return ''; } };

/** "16/09/2026" o "16/09/2026, 10:22:00" -> Date (ora di Roma). */
function data(testo) {
  const m = String(testo || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
}
const zona = (note) => (String(note || '').match(/Zona:\s*(Z\d|ZX)/) || [])[1] || 'non indicata';
const conta = (elenco, chiave) => elenco.reduce((o, x) => { const k = chiave(x) || '(vuoto)'; o[k] = (o[k] || 0) + 1; return o; }, {});

async function main() {
  const token = await sheetsToken();

  // --- Cruscotto: la tabella settimanale, riga per riga -----------------------
  const griglia = await leggi(token, 'Cruscotto!A1:W400');
  const iTesta = griglia.findIndex((r) => (r[0] || '').trim() === 'Settimana');
  const testa = iTesta >= 0 ? griglia[iTesta].map((c) => String(c).trim()) : [];
  const settimane = iTesta >= 0
    ? griglia.slice(iTesta + 1).filter((r) => /^\d{4}-W\d{2}$/.test((r[0] || '').trim()))
      .map((r) => Object.fromEntries(testa.map((h, i) => [h || `col${i}`, r[i] ?? ''])))
    : [];

  // --- Contatti ---------------------------------------------------------------
  const tutti = await leggiLead(token);
  const lead = tutti.map((l) => ({ ...l, arrivo: data(l.dataTesto || l.data), zona: zona(l.note) }));
  const delMese = lead.filter((l) => nelMese(l.arrivo));
  const delMesePrima = lead.filter((l) => nelMese(l.arrivo, inizioPrima, finePrima));
  const contatti = {
    mese: delMese.length,
    mesePrima: delMesePrima.length,
    perProvenienza: conta(delMese, (l) => l.provenienza),
    perProvenienzaMesePrima: conta(delMesePrima, (l) => l.provenienza),
    perZona: conta(delMese, (l) => l.zona),
    statoOggiDiQuelliDelMese: conta(delMese, (l) => l.stato || 'Da richiamare'),
    // Tutto lo storico, per il tasso di chiusura per canale.
    storicoPerProvenienzaEStato: Object.fromEntries(
      Object.entries(conta(lead, (l) => l.provenienza)).map(([p]) => [p, conta(lead.filter((l) => l.provenienza === p), (l) => l.stato || 'Da richiamare')]),
    ),
    fermiOggi: {
      daRichiamare: lead.filter((l) => (l.stato || 'Da richiamare') === 'Da richiamare').length,
      preventivoInviato: lead.filter((l) => l.stato === 'Preventivo inviato').length,
    },
  };

  // --- Search Console: mese contro mese prima ---------------------------------
  const gsc = await getAccessToken();
  const totale = async (a, b) => ((await query(gsc, { startDate: ymd(a), endDate: ymd(b), dimensions: [], rowLimit: 1 })).rows || [])[0] || {};
  const perQuery = async (a, b) => (await query(gsc, { startDate: ymd(a), endDate: ymd(b), dimensions: ['query'], rowLimit: 1000 })).rows || [];
  const [tM, tP, qM, qP] = await Promise.all([totale(inizio, fine), totale(inizioPrima, finePrima), perQuery(inizio, fine), perQuery(inizioPrima, finePrima)]);
  const marchio = /acquadirete|acqua di rete|piconese/i;
  const prima = new Map(qP.map((r) => [r.keys[0], r]));
  const ricerche = qM
    // Fuori marchio e numeri di telefono, come fanno le posizioni del lunedi'.
    .filter((r) => !marchio.test(r.keys[0]) && !/^\+?[\d\s]{7,}$/.test(r.keys[0]) && r.impressions >= 10)
    .map((r) => {
      const p = prima.get(r.keys[0]);
      return { ricerca: r.keys[0], viste: r.impressions, clic: r.clicks, posizione: +r.position.toFixed(1), vistePrima: p?.impressions || 0, posizionePrima: p ? +p.position.toFixed(1) : null };
    })
    .sort((a, b) => b.viste - a.viste)
    .slice(0, 30);
  const google = {
    mese: { clic: tM.clicks || 0, viste: tM.impressions || 0, posizione: tM.position ? +tM.position.toFixed(1) : null },
    mesePrima: { clic: tP.clicks || 0, viste: tP.impressions || 0, posizione: tP.position ? +tP.position.toFixed(1) : null },
    clicMarchio: qM.filter((r) => marchio.test(r.keys[0])).reduce((s, r) => s + r.clicks, 0),
    ricerchePrincipali: ricerche,
  };

  // --- Cosa e' uscito e cosa si e' deciso -------------------------------------
  const blog = readFileSync('lib/blogPosts.ts', 'utf8');
  const articoli = [...blog.matchAll(/title:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?publishedAt:\s*'(\d{4}-\d{2}-\d{2})'/g)]
    .map((m) => ({ titolo: m[1].replace(/\\'/g, "'"), data: m[2] }))
    .filter((a) => a.data.startsWith(etichetta));
  const proposte = leggiJson('agenti/proposte.json', []).filter((p) => nelMese(new Date(p.creata)) || nelMese(new Date(p.decisa || 0)))
    .map(({ tipo, titolo, stato, motivo, correzioni }) => ({ tipo, titolo, stato, motivo, correzioni: correzioni?.map((c) => c.note) }));
  const storiaSocial = git('log', `--since=${ymd(inizio)}`, `--until=${ymd(fine)} 23:59`, '-p', '--', 'agenti/social-bozza.json');
  const social = {
    pubblicati: (storiaSocial.match(/^\+\s+"pubblicato":/gm) || []).length,
    scartati: (storiaSocial.match(/^\+\s+"scartato":/gm) || []).length,
    rimandati: (storiaSocial.match(/^\+\s+"rimandata":/gm) || []).length,
  };
  const recensioni = leggiJson('agenti/recensioni/stato.json', {});
  const posizioni = leggiJson('agenti/seo/posizioni.json', {});

  const dati = {
    mese: etichetta,
    preparato: new Date().toISOString(),
    avvertenze: [
      'Circa 15 contatti al mese sono pochi: una differenza di 3-4 contatti fra due mesi e\' rumore, non un segnale.',
      'I clienti "Sito web" comprendono anche chi arriva dalla ricerca gratuita: il costo per cliente di Google Ads che ne esce e\' un minimo.',
      'Le colonne di spesa e di costo per cliente sono riservate: non vanno scritte nel repo, che e\' pubblico.',
    ],
    settimane,
    contatti,
    google,
    posizioni: { periodo: posizioni.periodo, segnali: posizioni.segnali || [] },
    articoli,
    proposte,
    social,
    recensioni: { totale: recensioni.totale, media: recensioni.media },
    ordiniPrecedenti: existsSync('agenti/ordini.md') ? readFileSync('agenti/ordini.md', 'utf8') : null,
  };
  writeFileSync(uscita, `${JSON.stringify(dati, null, 2)}\n`);
  console.log(`Dati del ${etichetta} pronti: ${settimane.length} settimane, ${contatti.mese} contatti (prima ${contatti.mesePrima}), ${articoli.length} articoli, ${social.pubblicati} post, ${proposte.length} proposte.`);
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
