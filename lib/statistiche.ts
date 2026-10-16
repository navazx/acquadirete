// Il contatore delle visite fatto in casa (dal 16 ott 2026).
//
// Fino a qui del sito si vedevano solo i contatti arrivati: non quante persone
// aprivano ogni pagina, né quante cominciavano il modulo e poi lasciavano
// perdere. Senza, gli agenti non possono capire quale pagina convince e quale
// no. Questo conta, pagina per pagina: le visualizzazioni, gli ingressi (la
// prima pagina vista) con la loro provenienza, i moduli iniziati e inviati, i
// clic su Chiama e WhatsApp.
//
// Niente cookie, niente localStorage, nessun identificativo della persona e
// nessun indirizzo IP salvato: si mandano solo la pagina, il tipo di evento e
// la provenienza. Per questo non serve il consenso del banner, e conta tutti,
// anche chi rifiuta i cookie (che Google Ads non vede). Il rovescio: non
// distingue una persona che torna da una nuova.
//
// Gli eventi vanno a /api/visita (netlify/functions/visita.mjs), che li mette
// nella scheda "Visite-oggi" del Gestionale; ogni notte
// netlify/functions/statistiche-giorno.mjs li somma in "Visite-sito".

import { vieneDaAnnuncioGoogle } from './provenienza';

export type Evento = 'visita' | 'modulo-iniziato' | 'modulo-inviato' | 'chiama' | 'whatsapp';

// Da dove è arrivata la persona, letto una volta sola al primo caricamento
// (come in provenienza.ts): le navigazioni interne non cambiano la provenienza.
function provenienza(): string {
  if (typeof window === 'undefined') return '';
  if (vieneDaAnnuncioGoogle()) return 'annuncio';
  const utm = new URLSearchParams(window.location.search).get('utm_source')?.toLowerCase() ?? '';
  if (/facebook|instagram|^fb$|^ig$|meta/.test(utm)) return 'social';
  let host = '';
  try {
    host = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
  } catch {
    host = '';
  }
  if (!host || host.endsWith('acquadirete.it') || host.endsWith('netlify.app')) return 'diretto';
  if (/(^|\.)google\./.test(host)) return 'google';
  if (/bing\.|duckduckgo\.|yahoo\.|ecosia\.|qwant\./.test(host)) return 'altri-motori';
  if (/facebook\.|instagram\.|fb\.|l\.messenger|whatsapp\./.test(host)) return 'social';
  if (/chatgpt\.|openai\.|perplexity\.|claude\.ai|gemini\.google|copilot\./.test(host)) return 'ia';
  return 'altri-siti';
}

const fonte = provenienza();
let primaVisita = true;

export function segna(evento: Evento): void {
  if (typeof window === 'undefined') return;
  // In locale (next dev) non c'è la funzione Netlify: non si manda niente.
  if (process.env.NODE_ENV === 'development') return;
  const ingresso = evento === 'visita' && primaVisita;
  if (evento === 'visita') primaVisita = false;
  const dati = JSON.stringify({ p: window.location.pathname, e: evento, f: fonte, i: ingresso });
  try {
    // sendBeacon parte anche se la persona sta chiudendo la pagina o sta
    // aprendo WhatsApp, e non rallenta niente.
    const blob = new Blob([dati], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/visita', blob)) return;
  } catch {
    // si prova sotto
  }
  fetch('/api/visita', { method: 'POST', body: dati, keepalive: true, headers: { 'Content-Type': 'application/json' } }).catch(() => {});
}
