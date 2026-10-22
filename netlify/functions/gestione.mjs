// Endpoint /api/gestione: il "motore" dell'app del telefono di babbo
// (public/gestione/). Legge e scrive il Gestionale_Clienti; la logica sta in
// _shared/gestionale.mjs.
//
// Accesso: ogni richiesta porta la chiave dell'app nell'header X-Chiave, che
// deve essere una di quelle nella variabile GESTIONE_CHIAVE su Netlify
// (non-secret e scope "all", come le altre: vedi CLAUDE.md). Una chiave per
// persona, nel formato "babbo:chiave1,matteo:chiave2,segretaria:chiave3": il
// nome finisce nello storico interventi. Cosa può fare ognuno (giro,
// cancellare interventi, togliere clienti) sta nella scheda "Accessi" del
// foglio, che cambia solo Matteo dalle Impostazioni dell'app. La chiave si mette sul telefono una volta sola, col
// link di attivazione. Se un telefono si perde: si toglie o si cambia la sua
// chiave su Netlify, si rifà il deploy, e quella non apre più niente (le
// altre continuano a funzionare).
//
// Qui dietro c'è tutta l'anagrafica clienti (nomi, telefoni, indirizzi):
// niente scorciatoie sull'accesso.
import { timingSafeEqual, createHash } from 'node:crypto';
import {
  leggiTutto, segnaFatta, annullaFatta, rimandaManutenzione, impostaAvviso, spostaCliente, importaPersi,
  nuovoCliente, modificaCliente,
  nuovoLead, cambiaStatoLead, notaLead, salvaPosizioni, cambiaPagamento, assegnaManutenzione, salvaTappa, togliTappa,
  salvaArticolo, muoviMagazzino, annullaMagazzino, importaMagazzino, vistePerCategoria, creaFoglioGoogle,
  cancellaIntervento, annullaCancellazione, cancellaLavoro, annullaCancellaLavoro, leggiAccessi, accessiDiBase, salvaAccessi, PERMESSI, TITOLARE,
  cambiaMateriali, segnaRiparazione, annullaRiparazione, aggiornaMagazzino,
} from './_shared/gestionale.mjs';

// Tentativi sbagliati per IP in un'ora. In memoria dell'istanza (come in
// lead.mjs): non è una contabilità esatta, serve a rendere inutile provare
// chiavi a raffica. La chiave comunque è lunga (100 bit): indovinarla non è
// un'opzione anche senza questo limite.
const MAX_SBAGLIATI = 10;
const FINESTRA_MS = 60 * 60 * 1000;
const sbagliati = new Map();

function bloccato(ip) {
  const v = sbagliati.get(ip);
  return v && Date.now() - v.primo < FINESTRA_MS && v.n >= MAX_SBAGLIATI;
}
function segnaSbagliato(ip) {
  const ora = Date.now();
  for (const [k, v] of sbagliati) if (ora - v.primo > FINESTRA_MS) sbagliati.delete(k);
  const v = sbagliati.get(ip);
  if (!v || ora - v.primo > FINESTRA_MS) sbagliati.set(ip, { primo: ora, n: 1 });
  else v.n += 1;
}

// Di chi è la chiave ricevuta ("babbo", "matteo"), o null se non è valida.
// Confronto a tempo costante sugli hash, così anche lunghezze diverse; le
// chiavi più corte di 16 caratteri non valgono mai.
function chiDellaChiave(data) {
  if (!data) return null;
  const h = (s) => createHash('sha256').update(String(s).trim().toLowerCase()).digest();
  const ricevuta = h(data);
  let chi = null;
  for (const voce of String(process.env.GESTIONE_CHIAVE || '').split(',')) {
    const [nome, chiave] = voce.includes(':') ? voce.split(':') : ['app', voce];
    if (!chiave || chiave.trim().length < 16) continue;
    if (timingSafeEqual(ricevuta, h(chiave)) && !chi) chi = nome.trim() || 'app';
  }
  return chi;
}

// Le persone che usano l'app (i nomi delle chiavi). «app» è la chiave senza
// nome. Chi ha un giro del giorno e cosa può fare ognuno sta negli Accessi
// del foglio (dal 21 ott 2026: leggiAccessi).
const persone = () =>[...new Set(String(process.env.GESTIONE_CHIAVE || '').split(',')
  .map((v) => (v.includes(':') ? v.split(':')[0].trim().toLowerCase() : '')).filter((n) => n && n !== 'app'))];

const risposta = (corpo, status = 200) =>
  Response.json(corpo, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });

const AZIONI = {
  fatta: segnaFatta,
  annulla: annullaFatta,
  riparazione: segnaRiparazione, // un guasto riparato senza la manutenzione (21 ott 2026)
  annullaRiparazione,
  rimanda: rimandaManutenzione,
  avviso: impostaAvviso,
  sposta: spostaCliente,
  importaPersi,
  nuovo: nuovoCliente,
  modifica: modificaCliente,
  nuovoLead,
  stato: cambiaStatoLead,
  nota: notaLead,
  posizioni: salvaPosizioni,
  pagamento: cambiaPagamento,
  assegna: assegnaManutenzione, // il giro del 19 ott, per i telefoni con l'app vecchia
  tappa: salvaTappa,
  togliTappa,
  articolo: salvaArticolo,
  magazzino: muoviMagazzino,
  annullaMagazzino,
  materiali: cambiaMateriali, // i materiali di un intervento fatto, segnati o corretti dopo
  importaMagazzino, // una volta sola, dal vecchio Magazzino.xlsx (solo Matteo)
  vistaMagazzino: vistePerCategoria, // filtri per categoria nel foglio (solo Matteo)
  aggiornaMagazzino, // In consegna, Da montare, Totale e colori delle categorie (21 ott 2026, solo Matteo)
  cancellaIntervento,
  annullaCancellazione,
  cancellaLavoro, // un lavoro fatto, dal Giro del giorno
  annullaCancellaLavoro,
  accessi: salvaAccessi, // le impostazioni (solo Matteo)
};

// Le azioni che chiedono un permesso degli Accessi. Le altre le può fare
// chiunque abbia una chiave.
const PERMESSO_PER = {
  cancellaIntervento: () => 'cancellaInterventi',
  annullaCancellazione: () => 'cancellaInterventi',
  cancellaLavoro: () => 'cancellaInterventi',
  annullaCancellaLavoro: () => 'cancellaInterventi',
  sposta: (d) => (d.verso === 'persi' ? 'togliClienti' : null),
  // I materiali usati in un lavoro no: quelli li segna chiunque (22 ott 2026).
  magazzino: (d) => (d.causale === 'lavoro' ? null : 'modificaMagazzino'),
  articolo: () => 'modificaMagazzino',
};
// Quelle per cui servono gli Accessi: i permessi, chi ha un giro (le tappe),
// e l'annulla di un movimento (lo decide annullaMagazzino: dipende da cos'era).
const CON_ACCESSI = new Set([...Object.keys(PERMESSO_PER), 'tappa', 'assegna', 'accessi', 'annullaMagazzino']);

// creaFoglio è un parametro solo per il server di prova in locale
// (scripts/gestione-locale.mjs), che scrive su una copia in memoria.
export const creaGestore = (creaFoglio) => async (req) => {
  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'sconosciuto';

  if (bloccato(ip)) return risposta({ ok: false, errore: 'Troppi tentativi. Riprova tra un\'ora.' }, 429);
  const chi = chiDellaChiave(req.headers.get('x-chiave'));
  if (!chi) {
    segnaSbagliato(ip);
    return risposta({ ok: false, errore: 'Chiave non valida', chiave: false }, 401);
  }

  const sheetId = process.env.GESTIONE_SHEET_ID || process.env.LEADS_SHEET_ID;
  if (!sheetId) return risposta({ ok: false, errore: 'Foglio non configurato. Chiedi a Matteo.' }, 500);
  const foglio = creaFoglio(sheetId);

  const tutti = persone();
  const giranti = (acc) => acc.filter((a) => a.giro).map((a) => a.persona);
  try {
    // io: chi sta usando l'app; persone: chi ha un giro (fra chi si dividono
    // le manutenzioni); nomi: come si chiama ognuno («babbo» → «Stefano»);
    // permessi: cosa può fare io. Il titolare riceve anche tutti gli accessi,
    // per le impostazioni.
    if (req.method === 'GET') {
      const [tutto, acc] = await Promise.all([
        leggiTutto(foglio),
        leggiAccessi(foglio, tutti).catch((err) => { console.error('Accessi non letti:', err); return accessiDiBase(tutti); }),
      ]);
      const mio = acc.find((a) => a.persona === chi) || accessiDiBase([chi])[0];
      const titolare = chi === TITOLARE;
      return risposta({
        ok: true, ...tutto, io: chi, persone: giranti(acc),
        nomi: Object.fromEntries(acc.map((a) => [a.persona, a.nome])),
        permessi: Object.fromEntries(PERMESSI.map((p) => [p.id, !!mio[p.id]])),
        titolare,
        ...(titolare ? { accessi: acc, elencoPermessi: PERMESSI } : {}),
      });
    }
    if (req.method !== 'POST') return risposta({ ok: false, errore: 'Metodo non ammesso' }, 405);

    let body;
    try { body = await req.json(); } catch { return risposta({ ok: false, errore: 'Richiesta non valida' }, 400); }
    const azione = AZIONI[body?.azione];
    if (!azione) return risposta({ ok: false, errore: 'Azione sconosciuta' }, 400);
    const dati = body.dati ?? {};
    let ctx = { chi, persone: tutti, tutti };
    if (CON_ACCESSI.has(body.azione)) {
      // Qui gli Accessi si devono leggere: se il foglio non risponde, niente.
      const acc = await leggiAccessi(foglio, tutti);
      const serve = PERMESSO_PER[body.azione] && PERMESSO_PER[body.azione](dati);
      const mio = acc.find((a) => a.persona === chi) || accessiDiBase([chi])[0];
      if (serve && !mio[serve]) return risposta({ ok: false, errore: 'Non hai il permesso per farlo. Chiedi a Matteo.' }, 403);
      ctx = { ...ctx, persone: giranti(acc), permessi: Object.fromEntries(PERMESSI.map((p) => [p.id, !!mio[p.id]])) };
    }
    return risposta(await azione(foglio, dati, ctx));
  } catch (err) {
    if (err.perUtente) return risposta({ ok: false, errore: err.message }, err.status || 400);
    console.error('Gestione:', err);
    return risposta({ ok: false, errore: 'Il foglio non risponde. Riprova tra poco.', causa: err?.causa }, 502);
  }
};

export default creaGestore(creaFoglioGoogle);

export const config = { path: '/api/gestione' };
