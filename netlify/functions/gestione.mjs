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
// Qui dietro c'è tutta l'anagrafica clienti (nomi, telefoni, indirizzi) e,
// dal 26 ott 2026, le foto delle loro case: niente scorciatoie sull'accesso.
import { timingSafeEqual, createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';
import {
  leggiTutto, segnaFatta, annullaFatta, rimandaManutenzione, impostaAvviso, spostaCliente, importaPersi,
  nuovoCliente, modificaCliente,
  nuovoLead, cambiaStatoLead, notaLead, salvaPosizioni, cambiaPagamento, assegnaManutenzione, salvaTappa, togliTappa,
  salvaArticolo, muoviMagazzino, annullaMagazzino, importaMagazzino, vistePerCategoria, creaFoglioGoogle,
  cancellaIntervento, annullaCancellazione, cancellaLavoro, annullaCancellaLavoro, leggiAccessi, accessiDiBase, salvaAccessi, PERMESSI, TITOLARE,
  cambiaMateriali, segnaRiparazione, annullaRiparazione, aggiornaMagazzino,
  perPersona, riferimentiFuori, registra, conAccessiDiBase,
  salvaFoto, togliFoto, rimettiFoto, leggiImmagine, fotoDaId, salvaPosizioneContatto, rinominaContatti,
} from './_shared/gestionale.mjs';

// L'archivio delle foto dei clienti (26 ott 2026): Netlify Blobs, in Europa
// (la regione va ripetuta a ogni apertura, se no si legge un archivio vuoto
// negli Stati Uniti). Ci arriva solo questa funzione, dopo il controllo
// della chiave: le foto delle case dei clienti non hanno un indirizzo pubblico.
const archivioNetlify = () => getStore({ name: 'foto-clienti', region: 'eu-central-1', consistency: 'strong' });

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
  foto: salvaFoto, // una foto nuova del cliente o del contatto, o la sua descrizione (26-27 ott 2026)
  togliFoto,
  rimettiFoto,
  posizioneContatto: salvaPosizioneContatto, // «Sono qui» dalla scheda del contatto, al sopralluogo (27 ott 2026)
  rinominaContatti, // una volta sola: i contatti vecchi col cognome davanti (29 ott 2026, solo Matteo)
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

// creaFoglio e apriArchivio sono parametri solo per il server di prova in
// locale (scripts/gestione-locale.mjs), che scrive su una copia in memoria.
export const creaGestore = (creaFoglio, apriArchivio = archivioNetlify) => async (req) => {
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
  // Chi ha un giro e non è stato spento.
  const giranti = (acc) => acc.filter((a) => a.giro && a.attivo).map((a) => a.persona);
  // GET ?foto=<id>[&mini=1]: l'immagine di una foto, non tutto il foglio.
  const url = new URL(req.url);
  const fotoChiesta = req.method === 'GET' ? url.searchParams.get('foto') : null;
  // La lettura completa parte subito (in parallelo agli Accessi), ma conta
  // solo se gli Accessi dicono che si può.
  const tuttoP = req.method === 'GET' && !fotoChiesta ? leggiTutto(foglio) : null;
  if (tuttoP) tuttoP.catch(() => {});
  try {
    // Gli Accessi a ogni richiesta (22 ott 2026): chi Matteo ha spento non
    // entra più, neanche a leggere. Se la scheda non si legge, le persone di
    // base (Matteo, Stefano, la segretaria) hanno i loro accessi di base; un
    // dipendente no: per lui non si tira a indovinare.
    let acc;
    try {
      acc = await leggiAccessi(foglio, tutti);
    } catch (err) {
      console.error('Accessi non letti:', err);
      if (!conAccessiDiBase(chi)) return risposta({ ok: false, errore: 'Non riesco a controllare il tuo accesso. Riprova tra poco.' }, 503);
      acc = accessiDiBase(tutti);
    }
    const mio = acc.find((a) => a.persona === chi) || accessiDiBase([chi])[0];
    if (!mio.attivo) return risposta({ ok: false, sospeso: true, errore: 'Il tuo accesso all\'app è stato sospeso. Chiedi a Matteo.' }, 403);
    const permessi = Object.fromEntries(PERMESSI.map((p) => [p.id, !!mio[p.id]]));

    // Una foto: solo a chi può vedere quel cliente o quel contatto. Il
    // telefono la tiene in una sua memoria (che svuota se l'accesso viene
    // spento), il browser no. Chi vede solo i suoi clienti: di chi è la foto
    // lo dice la scheda Foto (una foto del contatto diventato cliente è di
    // tutti e due), e basta che uno dei due sia suo.
    if (fotoChiesta) {
      const img = await leggiImmagine(apriArchivio(), fotoChiesta, url.searchParams.get('mini') === '1');
      if (!img) return risposta({ ok: false, errore: 'Foto non trovata.' }, 404);
      if (!mio.tuttiClienti) {
        const di = await fotoDaId(foglio, fotoChiesta);
        const suo = async (rif) => !!(rif.codice || rif.contatto) && !(await riferimentiFuori(foglio, 'foto', rif, chi)).length;
        if (!di || !((await suo({ codice: di.codice })) || (await suo({ contatto: di.contatto })))) {
          return risposta({ ok: false, errore: 'Questo cliente non è fra i tuoi. Chiedi a Matteo.' }, 403);
        }
      }
      return new Response(img.dati, {
        headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex', 'X-Content-Type-Options': 'nosniff' },
      });
    }

    // io: chi sta usando l'app; persone: chi ha un giro (fra chi si dividono
    // le manutenzioni); nomi: come si chiama ognuno («babbo» → «Stefano»);
    // permessi: cosa può fare io. Il titolare riceve anche tutti gli accessi,
    // per le impostazioni. Chi non vede tutti i clienti o i costi riceve solo
    // la sua parte (perPersona).
    if (req.method === 'GET') {
      const tutto = await tuttoP;
      const titolare = chi === TITOLARE;
      return risposta({
        ok: true, ...perPersona(tutto, mio), io: chi, persone: giranti(acc),
        nomi: Object.fromEntries(acc.map((a) => [a.persona, a.nome])),
        permessi,
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
    const serve = PERMESSO_PER[body.azione] && PERMESSO_PER[body.azione](dati);
    if (serve && !mio[serve]) return risposta({ ok: false, errore: 'Non hai il permesso per farlo. Chiedi a Matteo.' }, 403);
    // Chi vede solo i suoi clienti lavora solo su quelli (anche con un codice inventato).
    if (!mio.tuttiClienti && (await riferimentiFuori(foglio, body.azione, dati, chi)).length) {
      return risposta({ ok: false, errore: 'Questo cliente non è fra i tuoi. Chiedi a Matteo.' }, 403);
    }
    // Chi non vede i costi non li manda e non li riceve.
    const senzaCosti = !mio.costi && body.azione === 'articolo';
    if (senzaCosti) delete dati.costo;
    const ctx = {
      chi, tutti, permessi, persone: CON_ACCESSI.has(body.azione) ? giranti(acc) : tutti,
      archivio: body.azione === 'foto' ? apriArchivio() : null,
    };
    const r = await azione(foglio, dati, ctx);
    if (senzaCosti && r) {
      if (r.articolo) delete r.articolo.costo;
      if (r.annulla) delete r.annulla.costo;
    }
    // Il Registro: chi ha fatto cosa (non le posizioni, che salvano i telefoni da soli).
    if (r && r.ok !== false && body.azione !== 'posizioni') {
      await registra(foglio, { chi, nome: mio.nome, azione: body.azione, dati, r }).catch((err) => console.error('Registro non scritto:', err));
    }
    return risposta(r);
  } catch (err) {
    if (err.perUtente) return risposta({ ok: false, errore: err.message }, err.status || 400);
    console.error('Gestione:', err);
    return risposta({ ok: false, errore: 'Il foglio non risponde. Riprova tra poco.', causa: err?.causa }, 502);
  }
};

export default creaGestore(creaFoglioGoogle);

export const config = { path: '/api/gestione' };
