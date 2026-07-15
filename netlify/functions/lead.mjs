// Endpoint /api/lead: riceve i dati del modulo contatti del sito e li accoda
// alla scheda "Sito" del foglio Google dei lead (LEADS_SHEET_ID).
// Il client lo chiama fire-and-forget: un errore qui non blocca l'invio del
// form, che viaggia comunque via Web3Forms (email a info@).
import { appendRow, nowInItaly } from './_shared/google-sheets.mjs';

const HEADERS = ['Data', 'Nome', 'Telefono', 'Email', 'Zona', 'Impianto di interesse', 'Note', 'Pagina'];

const clip = (v, max) => (v == null ? '' : String(v).slice(0, max));

export default async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'JSON non valido' }, { status: 400 });
  }

  const { nome, telefono, email, zona, servizio, messaggio, pagina } = body ?? {};
  if (!nome || !telefono) {
    return Response.json({ ok: false, error: 'nome e telefono obbligatori' }, { status: 400 });
  }

  try {
    await appendRow('Sito', HEADERS, [
      nowInItaly(),
      clip(nome, 200),
      clip(telefono, 50),
      clip(email, 200),
      clip(zona, 100),
      clip(servizio, 100),
      clip(messaggio, 1000),
      clip(pagina, 200),
    ]);
    return Response.json({ ok: true });
  } catch (err) {
    console.error('Scrittura lead su Google Sheet fallita:', err);
    return Response.json({ ok: false }, { status: 500 });
  }
};

export const config = { path: '/api/lead' };
