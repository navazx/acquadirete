// Webhook Lead Ads di Meta: Facebook/Instagram chiamano questo endpoint quando
// qualcuno compila un modulo delle inserzioni. Recuperiamo i dati completi del
// lead via Graph API e li accodiamo alla scheda "Lead-Contatti" del gestionale
// clienti su Google Sheets (con Provenienza "Meta / Facebook").
//
// Configurazione lato Meta (developers.facebook.com → app → Webhooks → Page,
// campo "leadgen"):
//   URL di callback : https://www.acquadirete.it/api/meta-leads
//   Verify token    : valore della env META_VERIFY_TOKEN
//
// Variabili d'ambiente (su Netlify):
//   META_VERIFY_TOKEN  obbligatoria — stringa a scelta, deve combaciare con
//                      quella inserita nella configurazione del webhook.
//   META_PAGE_TOKEN    obbligatoria — Page Access Token (long-lived) con il
//                      permesso leads_retrieval, serve per leggere i dati.
//   META_APP_SECRET    facoltativa — se presente, verifichiamo la firma
//                      X-Hub-Signature-256 di ogni chiamata.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appendRow } from './_shared/google-sheets.mjs';
import { notifyTelegram } from './_shared/telegram.mjs';

const TAB = 'Lead-Contatti';
const HEADERS = ['Data', 'Nome', 'Telefono / Email', 'Provenienza', 'Interesse', 'Stato', 'Note'];
const GRAPH = 'https://graph.facebook.com/v23.0';

export default async (req) => {
  // Verifica iniziale della sottoscrizione: Meta fa una GET con hub.challenge
  // e si aspetta di riaverlo indietro se il verify token combacia.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get('x-hub-signature-256'))) {
    return new Response('Bad signature', { status: 401 });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  const leads = [];
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === 'leadgen' && change.value?.leadgen_id) leads.push(change.value);
    }
  }

  for (const lead of leads) {
    try {
      await saveLead(lead);
    } catch (err) {
      console.error('Lead Meta non salvato:', lead.leadgen_id, err);
    }
  }

  // Rispondere sempre 200: se Meta riceve troppi errori disattiva il webhook.
  return Response.json({ ok: true });
};

function verifySignature(raw, header) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return true; // verifica attiva solo se il secret è configurato
  if (!header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const got = header.slice('sha256='.length);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(got, 'hex'));
  } catch {
    return false;
  }
}

async function saveLead({ leadgen_id, ad_id, form_id }) {
  const token = process.env.META_PAGE_TOKEN;
  if (!token) throw new Error('META_PAGE_TOKEN mancante');

  const res = await fetch(
    `${GRAPH}/${leadgen_id}?fields=created_time,field_data&access_token=${encodeURIComponent(token)}`
  );
  if (!res.ok) throw new Error(`Graph API ${res.status}: ${await res.text()}`);
  const lead = await res.json();

  // field_data è una lista {name, values}: estraiamo i campi standard e
  // mettiamo gli eventuali extra (domande personalizzate) in una colonna JSON.
  const fields = {};
  for (const f of lead.field_data ?? []) fields[f.name] = (f.values ?? []).join(', ');
  const take = (...names) => {
    for (const n of names) {
      if (fields[n]) {
        const v = fields[n];
        delete fields[n];
        return v;
      }
    }
    return '';
  };
  // I moduli reali della pagina usano nomi diversi per lo stesso campo
  // ("phone" nel modulo di luglio, "phone_number" in quello di giugno).
  const nome = take('full_name', 'nome_e_cognome', 'nome');
  const telefono = take('phone_number', 'phone', 'telefono', 'numero_di_telefono');
  const email = take('email', 'indirizzo_email');
  const data = new Date(lead.created_time || Date.now())
    .toLocaleString('it-IT', { timeZone: 'Europe/Rome' });

  // Eventuali domande personalizzate del modulo finiscono nelle Note,
  // insieme agli id di modulo/inserzione per risalire alla campagna.
  const extra = Object.entries(fields).map(([k, v]) => `${k}: ${v}`).join(' — ');
  const note = [extra, form_id ? `(form ${form_id}${ad_id ? `, ad ${ad_id}` : ''})` : '']
    .filter(Boolean).join(' ');

  // Colonne e valori dei menu a tendina della scheda "Lead-Contatti":
  // tenerli allineati col foglio (vedi lead.mjs).
  await appendRow(TAB, HEADERS, [
    data,
    nome,
    [telefono, email].filter(Boolean).join(' · '),
    'Meta / Facebook',
    '',
    'Da richiamare',
    note,
  ]);

  const righe = [
    '🔔 Nuovo contatto da FACEBOOK/INSTAGRAM',
    nome ? `👤 ${nome}` : '',
    (telefono || email) ? `📞 ${[telefono, email].filter(Boolean).join(' · ')}` : '',
    extra ? `📝 ${extra.slice(0, 500)}` : '',
  ].filter(Boolean);
  await notifyTelegram(righe.join('\n') + '\n\nGià segnato sul foglio Lead-Contatti ✅');
}

export const config = { path: '/api/meta-leads' };
