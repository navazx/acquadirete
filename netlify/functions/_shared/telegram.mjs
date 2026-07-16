// Helper condiviso: notifica su Telegram via @claudesisisibot.
// Best-effort per design: se il token manca o l'invio fallisce, logga e basta —
// la scrittura del lead sul foglio non deve MAI fallire per colpa dell'avviso.
// Env: TELEGRAM_BOT_TOKEN (obbligatoria per inviare), TELEGRAM_CHAT_ID
// (facoltativa, default la chat dell'utente).

export async function notifyTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || '6369351410';
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) console.error('Invio Telegram fallito:', res.status, await res.text());
  } catch (err) {
    console.error('Invio Telegram fallito:', err);
  }
}
