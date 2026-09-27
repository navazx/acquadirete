// ============================================================================
//  Telegram per gli agenti: mandare testi, foto e file, leggere le risposte.
//
//  Volutamente separato da lib/gsc.mjs, che ha gia' il suo invio e funziona:
//  toccarlo vorrebbe dire rimettere le mani su report SEO e alert keyword.
//
//  Segreti: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// ============================================================================

import { readFileSync } from 'node:fs';

const TOKEN = () => {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error('Manca TELEGRAM_BOT_TOKEN fra i secret del repo.');
  return t;
};
export const CHAT = () => process.env.TELEGRAM_CHAT_ID || '6369351410';

async function chiama(metodo, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const dati = await res.json();
  if (!dati.ok) throw new Error(`Telegram ha rifiutato ${metodo}: ${dati.description}`);
  return dati.result;
}

export const messaggio = (text) =>
  chiama('sendMessage', { chat_id: CHAT(), text: String(text).slice(0, 4096), disable_web_page_preview: true });

/** La foto si passa come indirizzo pubblico: Telegram se la scarica da solo. */
export const foto = (urlFoto, caption) =>
  chiama('sendPhoto', { chat_id: CHAT(), photo: urlFoto, caption });

/**
 * Una foto caricata dal repo invece che dal sito. Serve per le immagini appena
 * create (le curiosita'): quando parte la bozza il deploy di Netlify puo' non
 * essere ancora finito, e l'indirizzo pubblico darebbe 404.
 */
export async function fotoDaFile(percorso, caption) {
  const form = new FormData();
  form.append('chat_id', CHAT());
  if (caption) form.append('caption', String(caption).slice(0, 1024));
  form.append('photo', new Blob([readFileSync(percorso)], { type: 'image/jpeg' }), percorso.split('/').pop());
  const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/sendPhoto`, { method: 'POST', body: form });
  const dati = await res.json();
  if (!dati.ok) throw new Error(`Telegram ha rifiutato sendPhoto: ${dati.description}`);
  return dati.result;
}

/** Un file del repo, da aprire sul telefono (le anteprime degli articoli). */
export async function documento(percorso, caption) {
  const form = new FormData();
  form.append('chat_id', CHAT());
  if (caption) form.append('caption', String(caption).slice(0, 1024));
  form.append('document', new Blob([readFileSync(percorso)], { type: 'text/markdown' }), percorso.split('/').pop());
  const res = await fetch(`https://api.telegram.org/bot${TOKEN()}/sendDocument`, { method: 'POST', body: form });
  const dati = await res.json();
  if (!dati.ok) throw new Error(`Telegram ha rifiutato sendDocument: ${dati.description}`);
  return dati.result;
}

/**
 * Messaggi arrivati dopo `offset`. Torna anche il nuovo offset da salvare, cosi'
 * la volta dopo non si rilegge un ordine gia' eseguito.
 */
export async function risposte(offset = 0) {
  const upd = await chiama('getUpdates', { offset: offset ? offset + 1 : undefined, timeout: 0 });
  const miei = upd.filter((u) => String(u.message?.chat?.id) === String(CHAT()));
  // Le foto arrivano in due modi: come foto (Telegram le comprime, e di ogni foto
  // manda piu' misure: l'ultima e' la piu' grande) o come file, che resta intero
  // e puo' essere anche un HEIC dell'iPhone.
  // Il testo scritto insieme alla foto (la didascalia) viaggia con lei.
  const foto = [];
  for (const { message: m } of miei) {
    const base = { messaggio: m.message_id, data: m.date, nota: m.caption?.trim() || undefined };
    if (m.photo?.length) foto.push({ ...base, fileId: m.photo[m.photo.length - 1].file_id });
    else if (/^image\//.test(m.document?.mime_type || '')) {
      foto.push({ ...base, fileId: m.document.file_id, nome: m.document.file_name });
    }
  }
  const conTesto = miei.filter((u) => u.message.text);
  return {
    testi: conTesto.map((u) => u.message.text.trim()),
    // Gli stessi testi con l'ora d'arrivo: servono per attaccare a una foto il
    // messaggio mandato subito dopo, invece che come didascalia.
    messaggi: conTesto.map((u) => ({ testo: u.message.text.trim(), data: u.message.date })),
    foto,
    ultimo: upd.length ? Math.max(...upd.map((u) => u.update_id)) : offset,
  };
}

/** Scarica un file mandato al bot. Il limite di Telegram per i bot e' 20 MB. */
export async function scaricaFile(fileId) {
  const { file_path: percorso } = await chiama('getFile', { file_id: fileId });
  const res = await fetch(`https://api.telegram.org/file/bot${TOKEN()}/${percorso}`);
  if (!res.ok) throw new Error(`Telegram non mi da' il file: HTTP ${res.status}`);
  return { dati: Buffer.from(await res.arrayBuffer()), percorso };
}

/**
 * Segna come letti i messaggi fino a `ultimo`. Telegram li cancella davvero
 * dalla sua coda: e' questa la garanzia che un ordine non venga eseguito due
 * volte, non il file di stato nel repo. Va chiamata PRIMA di agire.
 */
export const conferma = (ultimo) => chiama('getUpdates', { offset: ultimo + 1, timeout: 0 });
