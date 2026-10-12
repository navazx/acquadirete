// Funzione programmata: la sveglia degli agenti che girano su GitHub.
//
// GitHub i giri programmati li fa partire quando gli pare: il 12 ott 2026 il
// controllo SEO del lunedi', fissato per le 07:05 UTC, e' partito alle 16:40, e
// il suo messaggio e' arrivato a Matteo la sera invece della mattina. Un avvio a
// mano (workflow_dispatch) invece GitHub lo esegue in pochi secondi. Quindi
// l'orologio lo tiene questa funzione: ogni 15 minuti guarda quali agenti
// avevano un appuntamento e, se da allora non sono partiti, li fa partire lei.
// E' la stessa idea di sveglia-risposte.mjs.
//
// - Un giro saltato si recupera: guarda indietro di 12 ore, non solo adesso.
// - Niente doppioni: se il workflow e' gia' partito dopo l'appuntamento (dalla
//   sveglia, da GitHub o a mano) non lo rifa' partire.
// - Se GitHub rifiuta, avvisa Matteo su Telegram una volta sola per appuntamento.
//
// Gli orari stanno QUI. I workflow che mandano messaggi o preparano proposte
// (controllo SEO, Direttore, report SEO, revisione Ads) non hanno piu' il loro
// "schedule": con due orologi, quello in ritardo di GitHub li avrebbe fatti
// girare una seconda volta. Quelli che si possono rilanciare senza danni
// (recensioni, cruscotto, bozza social) lo tengono come rete di sicurezza.
// La Sentinella del sito resta solo su GitHub, apposta: sorveglia Netlify, e non
// puo' dipendere da Netlify per partire.
//
// Variabili su Netlify (ci sono gia', le usa sveglia-risposte.mjs):
//   GITHUB_DISPATCH_TOKEN — token a grana fine, solo "Actions" su questo repo
//   TELEGRAM_BOT_TOKEN    — per l'avviso se qualcosa non parte

import { sveglia } from './_shared/sveglia.mjs';
import { notifyTelegram } from './_shared/telegram.mjs';

const REPO = 'navazx/acquadirete';

// Orari in UTC, come nei cron di GitHub. D'estate in Italia sono due ore dopo,
// d'inverno una.
//
// ATTENZIONE a "prova": recensioni e revisione Ads, avviati a mano, partono in
// prova (stampano e non mandano). Qui va detto esplicitamente che e' un giro vero.
const AGENTI = [
  { nome: 'Recensioni', workflow: 'recensioni.yml', cron: '50 6 * * *', inputs: { prova: 'false' } },
  { nome: 'Cruscotto settimanale', workflow: 'cruscotto.yml', cron: '40 6 * * 1' },
  { nome: 'Controllo SEO del lunedì', workflow: 'agente-seo.yml', cron: '5 7 * * 1' },
  { nome: 'Bozza del post social', workflow: 'social-bozza.yml', cron: '30 7 * * 6' },
  { nome: 'Direttore', workflow: 'direttore.yml', cron: '0 6 1 * *' },
  { nome: 'Report SEO del mese', workflow: 'seo-report.yml', cron: '10 7 1 * *' },
  { nome: 'Revisione Ads', workflow: 'agente-ads.yml', cron: '0 7 18 * *', inputs: { prova: 'false' } },
];

export default async () => {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    console.log('Sveglia ferma: manca GITHUB_DISPATCH_TOKEN fra le variabili di Netlify.');
    return;
  }

  const github = async (percorso, opzioni = {}) => {
    const res = await fetch(`https://api.github.com/repos/${REPO}${percorso}`, {
      ...opzioni,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    const testo = await res.text();
    let dati = null;
    try { dati = testo ? JSON.parse(testo) : null; } catch { /* non era JSON */ }
    return { status: res.status, dati };
  };

  const esiti = await sveglia(AGENTI, new Date(), github);
  if (!esiti.length) {
    console.log('Nessun agente aveva un appuntamento nelle ultime 12 ore.');
    return;
  }
  for (const e of esiti) {
    console.log(`${e.nome}: ${e.esito}${e.dettaglio ? ` — ${e.dettaglio}` : ''} (appuntamento ${e.quando.toISOString()}, ${e.ritardo} min fa)`);
  }

  // L'avviso parte solo al primo tentativo andato male (appuntamento da meno di
  // un giro): la funzione riprova da sola ogni 15 minuti per 12 ore, e un
  // messaggio a ogni tentativo sarebbero quarantotto messaggi.
  const rotti = esiti.filter((e) => e.esito === 'errore' && e.ritardo < 15);
  if (rotti.length) {
    await notifyTelegram(
      'La sveglia degli agenti non è riuscita a far partire:\n' +
      rotti.map((e) => `• ${e.nome}: ${e.dettaglio}`).join('\n') +
      '\n\nRiprovo da sola ogni 15 minuti per 12 ore. Se domani non è arrivato niente, chiedi a Claude dal PC: di solito è il token GitHub su Netlify che è scaduto.',
    );
  }
};

export const config = {
  schedule: '*/15 * * * *',
};
