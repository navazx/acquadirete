// Endpoint /api/lead: riceve i dati del modulo contatti del sito, li scrive
// sulla scheda "Lead-Contatti" del gestionale clienti su Google Sheets
// (LEADS_SHEET_ID) e manda l'avviso Telegram. È l'unica destinazione del
// modulo: l'invio email via Web3Forms è stato rimosso il 2026-07-16.
//
// Le colonne e i valori di Provenienza/Stato rispecchiano i menu a tendina
// già presenti nella scheda del foglio: non cambiarli qui senza aggiornare
// anche il foglio (e viceversa).
import { appendOrMergeRow, nowInItaly, nomeProprio } from './_shared/google-sheets.mjs';
import { notifyTelegram } from './_shared/telegram.mjs';

const TAB = 'Lead-Contatti';
const HEADERS = ['Data', 'Nome', 'Telefono / Email', 'Provenienza', 'Interesse', 'Stato', 'Note'];

const clip = (v, max) => (v == null ? '' : String(v).slice(0, max));

// ---------------------------------------------------------------------------
//  Difese anti-abuso (aggiunte il 2026-09-04 dopo l'audit di sicurezza).
//  Prima l'endpoint accettava qualsiasi POST da chiunque: con un ciclo banale
//  si riempiva la scheda Lead-Contatti di righe finte e il telefono di
//  notifiche. Le tre difese qui sotto sono dossi, non muri: fermano i bot
//  generici e gli scherzi, non un attacco mirato. Il criterio, ovunque, è
//  "meglio un po' di spam che un lead vero perso".
// ---------------------------------------------------------------------------

// Da dove accettiamo il modulo. Se l'Origin c'è e non è uno di questi, è
// traffico che non viene dal nostro sito. Se manca del tutto lasciamo
// passare: alcune estensioni per la privacy lo tolgono, e un lead vero
// perso costa più di uno spam accettato.
const ORIGINI_AMMESSE = new Set([
  'https://www.acquadirete.it',
  'https://acquadirete.it',
]);

// Quante richieste accettiamo dallo stesso IP in un'ora. Chi compila due
// volte per errore passa; chi ne manda cento no.
const MAX_PER_IP = 5;
const FINESTRA_MS = 60 * 60 * 1000;

// Contatore in memoria dell'istanza. Non è condiviso tra le istanze della
// funzione né sopravvive a un riavvio, quindi il limite vero è più morbido
// di 5: va bene così, serve a spezzare il ritmo di un ciclo automatico, non
// a tenere una contabilità esatta.
const visite = new Map();

function troppeRichieste(ip) {
  if (!ip) return false;
  const ora = Date.now();
  // Pulizia: senza, la mappa cresce all'infinito sulle istanze longeve.
  for (const [k, v] of visite) if (ora - v.primo > FINESTRA_MS) visite.delete(k);

  const v = visite.get(ip);
  if (!v || ora - v.primo > FINESTRA_MS) {
    visite.set(ip, { primo: ora, n: 1 });
    return false;
  }
  v.n += 1;
  return v.n > MAX_PER_IP;
}

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const origin = req.headers.get('origin');
  if (origin && !ORIGINI_AMMESSE.has(origin)) {
    return Response.json({ ok: false, error: 'Origine non ammessa' }, { status: 403 });
  }

  const ip =
    req.headers.get('x-nf-client-connection-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  if (troppeRichieste(ip)) {
    console.warn('Troppe richieste da', ip);
    return Response.json({ ok: false, error: 'Troppe richieste, riprova più tardi' }, { status: 429 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON non valido' }, { status: 400 });
  }

  const { nome, telefono, email, zona, servizio, messaggio, pagina, website } = body ?? {};

  // Campo trappola: nel form è nascosto e nessuna persona lo vede, quindi se
  // arriva pieno è un bot che compila tutto quello che trova. Rispondiamo
  // "ok" per non fargli capire di essere stato scoperto, e buttiamo via.
  if (website) {
    console.warn('Campo trappola compilato: richiesta scartata');
    return Response.json({ ok: true });
  }

  if (!nome || !telefono) {
    return Response.json({ ok: false, error: 'nome e telefono obbligatori' }, { status: 400 });
  }

  const contatto = [clip(telefono, 50), clip(email, 200)].filter(Boolean).join(' · ');
  const note = [
    zona ? `Zona: ${clip(zona, 100)}` : '',
    clip(messaggio, 1000),
    pagina ? `(dalla pagina ${clip(pagina, 200)})` : '',
  ].filter(Boolean).join(' — ');

  try {
    // Se la stessa persona ha già scritto di recente, la sua riga viene
    // completata invece di crearne una seconda.
    const esito = await appendOrMergeRow(
      TAB,
      HEADERS,
      [
        nowInItaly(),
        nomeProprio(clip(nome, 200)),
        contatto,
        'Sito web',
        clip(servizio, 100),
        'Da richiamare',
        note,
      ],
      { telefono, email }
    );
    const righe = [
      esito.doppione ? '🔁 Ha riscritto dal SITO (già in lista)' : '🔔 Nuovo contatto dal SITO',
      `👤 ${nomeProprio(clip(nome, 200))}`,
      `📞 ${contatto}`,
      zona ? `📍 ${clip(zona, 100)}` : '',
      servizio ? `🚰 ${clip(servizio, 100)}` : '',
      messaggio ? `📝 ${clip(messaggio, 500)}` : '',
    ].filter(Boolean);
    const chiusura = esito.doppione
      ? `Aggiornata la sua riga sul foglio (riga ${esito.riga}), niente doppioni ✅`
      : 'Già segnato sul foglio Lead-Contatti ✅';
    await notifyTelegram(`${righe.join('\n')}\n\n${chiusura}`);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Scrittura lead su Google Sheet fallita:', err);
    // `causa` è una categoria grossolana (variabile-assente, json-non-valido,
    // json-incompleto, google-rifiuta): non rivela nulla di sfruttabile ma
    // permette di capire un guasto di configurazione dall'esterno, senza
    // dover leggere i log delle funzioni. Il messaggio per la persona resta
    // quello generico gestito dal form.
    return Response.json({ ok: false, causa: err?.causa ?? 'sconosciuta' }, { status: 500 });
  }
};

export const config = { path: '/api/lead' };
