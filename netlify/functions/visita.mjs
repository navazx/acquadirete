// ============================================================================
//  /api/visita — il contatore delle visite del sito (dal 16 ott 2026)
//
//  Riceve dalle pagine (lib/statistiche.ts) un evento alla volta: pagina vista,
//  modulo iniziato o inviato, clic su Chiama o WhatsApp, con la provenienza.
//  Lo accoda nella scheda "Visite-oggi" del Gestionale; ogni notte
//  statistiche-giorno.mjs somma le righe in "Visite-sito" e svuota questa.
//
//  Nessun dato della persona: niente IP, niente identificativi, niente cookie.
//  Solo pagina, evento, provenienza e ora.
//
//  Risponde sempre 204 e non fallisce mai in modo visibile: un contatore rotto
//  non deve dare noia a chi sta guardando il sito. Gli errori si leggono nei
//  log della funzione su Netlify.
// ============================================================================

import { appendRow } from './_shared/google-sheets.mjs';
import { SCHEDA_EVENTI, INTESTAZIONI_EVENTI } from './_shared/visite.mjs';

const EVENTI = new Set(['visita', 'modulo-iniziato', 'modulo-inviato', 'chiama', 'whatsapp']);
const FONTI = new Set(['annuncio', 'google', 'altri-motori', 'social', 'ia', 'altri-siti', 'diretto']);

// Solo le pagine del sito, scritte come indirizzi: niente testo libero, così
// nessuno può riempire il Gestionale di scritte mandando richieste a mano.
const PAGINA = /^\/[a-z0-9\-/]{0,120}$/;

// Robot e anteprime: non sono persone.
const ROBOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|pagespeed|facebookexternalhit|whatsapp\//i;

// Le richieste devono venire dal sito (il browser mette Origin da solo).
const ORIGINI = /^https:\/\/(www\.)?acquadirete\.it$|^https:\/\/[a-z0-9-]+--acquadirete\.netlify\.app$|^https:\/\/acquadirete\.netlify\.app$/;

const vuota = () => new Response(null, { status: 204 });

export default async (req) => {
  if (req.method !== 'POST') return vuota();
  const origine = req.headers.get('origin') || '';
  if (origine && !ORIGINI.test(origine)) return vuota();
  if (ROBOT.test(req.headers.get('user-agent') || '')) return vuota();

  let dati;
  try {
    dati = JSON.parse(await req.text());
  } catch {
    return vuota();
  }
  const pagina = String(dati?.p ?? '').toLowerCase();
  const evento = String(dati?.e ?? '');
  const fonte = String(dati?.f ?? '');
  if (!PAGINA.test(pagina) || !EVENTI.has(evento) || !FONTI.has(fonte)) return vuota();
  // L'app Gestione non è il sito: non si conta.
  if (pagina.startsWith('/gestione')) return vuota();

  try {
    await appendRow(SCHEDA_EVENTI, INTESTAZIONI_EVENTI, [
      new Date().toISOString(),
      pagina,
      evento,
      fonte,
      dati?.i === true ? 'sì' : '',
    ]);
  } catch (e) {
    console.error('Contatore visite: riga non scritta.', e?.causa || '', e?.message || e);
  }
  return vuota();
};

export const config = { path: '/api/visita' };
