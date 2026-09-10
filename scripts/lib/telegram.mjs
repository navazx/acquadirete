// ============================================================================
//  Telegram per gli agenti social: mandare, mandare con foto, leggere risposte.
//
//  Volutamente separato da lib/gsc.mjs, che ha gia' il suo invio e funziona:
//  toccarlo per aggiungere una foto vorrebbe dire rimettere le mani su report
//  SEO e alert keyword, che non c'entrano niente.
//
//  Segreti: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID.
// ============================================================================

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
  chiama('sendMessage', { chat_id: CHAT(), text, disable_web_page_preview: true });

/** La foto si passa come indirizzo pubblico: Telegram se la scarica da solo. */
export const foto = (urlFoto, caption) =>
  chiama('sendPhoto', { chat_id: CHAT(), photo: urlFoto, caption });

/**
 * Messaggi arrivati dopo `offset`. Torna anche il nuovo offset da salvare, cosi'
 * la volta dopo non si rilegge un ordine gia' eseguito (e non si pubblica due volte).
 */
export async function risposte(offset = 0) {
  const upd = await chiama('getUpdates', { offset: offset ? offset + 1 : undefined, timeout: 0 });
  const miei = upd.filter((u) => String(u.message?.chat?.id) === String(CHAT()) && u.message?.text);
  return {
    testi: miei.map((u) => u.message.text.trim()),
    ultimo: upd.length ? Math.max(...upd.map((u) => u.update_id)) : offset,
  };
}

/**
 * Segna come letti i messaggi fino a `ultimo`. Telegram li cancella davvero
 * dalla sua coda: e' questa la garanzia che un PUBBLICA non venga eseguito due
 * volte, non il file di stato nel repo (che un commit fallito potrebbe non
 * aggiornare). Va chiamata PRIMA di pubblicare.
 */
export const conferma = (ultimo) => chiama('getUpdates', { offset: ultimo + 1, timeout: 0 });
