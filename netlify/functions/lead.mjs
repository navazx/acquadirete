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
    return Response.json({ ok: false }, { status: 500 });
  }
};

export const config = { path: '/api/lead' };
