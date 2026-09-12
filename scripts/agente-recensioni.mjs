#!/usr/bin/env node
// ============================================================================
//  AGENTE RECENSIONI (il sensore) — si accorge delle recensioni nuove
//
//  Gira su GitHub Actions una volta al giorno (vedi .github/workflows/
//  recensioni.yml), perche' qui ci sono i segreti: la chiave di Google e il
//  token del bot Telegram.
//
//  Cosa fa:
//    1. chiede a Google le recensioni dell'attivita' (Places API New)
//    2. le confronta con quelle che aveva gia' visto (agenti/recensioni/stato.json)
//    3. le nuove le mette in coda in agenti/recensioni/da-rispondere.json
//    4. avvisa subito su Telegram SOLO quando serve (vedi sotto)
//
//  Le risposte da incollare NON le scrive lui: le scrive l'agente nel cloud,
//  che legge la coda e prepara una bozza per ognuna. Qui si misura, non si
//  scrive.
//
//  Quando avvisa subito, e perche':
//    - recensione da 3 stelle o meno: una risposta tardiva costa, Matteo deve
//      saperlo oggi e non quando arriva la bozza
//    - il totale e' cambiato ma Google non ci fa vedere la recensione.
//      **OGGI E' SEMPRE COSI'**: la scheda di Acquadirete non ha un indirizzo
//      pubblico (e' un'attivita' che va dal cliente), e per quelle Google non
//      restituisce affatto il campo "reviews" — verificato il 12 set 2026: alla
//      richiesta con FieldMask "…,reviews" risponde con id, displayName, rating,
//      userRatingCount, googleMapsUri e basta. Il totale invece e' giusto (135).
//      Quindi oggi questo agente sa DIRE che e' arrivata una recensione, non
//      leggerla. Per il testo (e per rispondere da qui) serve la Google Business
//      Profile API, che e' gratis ma va chiesta e approvata da Google.
//    - il totale e' sceso: una recensione e' stata cancellata o nascosta
//  Per le altre sta zitto: il messaggio arriva dopo, con la risposta pronta.
//  Due messaggi per la stessa recensione sarebbero rumore.
//
//  IDENTITA' DI UNA RECENSIONE: Google da' a ognuna un nome stabile
//  (places/.../reviews/...). Quando manca si ripiega su un'impronta fatta con
//  autore + inizio del testo. Il campo "id" di lib/google-reviews.json (g1, g2)
//  NON va bene: e' solo la posizione nell'elenco, e cambia da sola.
//
//  ATTENZIONE, TRAPPOLA: le cinque recensioni che Google restituisce sono le
//  "piu' rilevanti", e ruotano. Una recensione di due anni fa puo' comparire
//  domani e sembrare nuova. Per questo va in coda solo quella scritta di
//  recente (vedi GIORNI_RECENTE): le altre vengono solo prese in nota, in
//  silenzio. Senza questo controllo Matteo si troverebbe a rispondere a
//  recensioni vecchie di mesi come se fossero arrivate stamattina.
//
//  Variabili d'ambiente:
//    GOOGLE_PLACES_API_KEY  (obbligatoria) — la stessa che usa il sito
//    GOOGLE_PLACE_ID        (opzionale)    — se manca, si cerca per nome
//    TELEGRAM_BOT_TOKEN     (obbligatoria solo se c'e' da avvisare)
//    RECENSIONI_FINTE       (per le prove) — file JSON al posto della chiamata
//                                            a Google, per provare la logica
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RADICE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CARTELLA = path.join(RADICE, 'agenti', 'recensioni');
const STATO = path.join(CARTELLA, 'stato.json');
const CODA = path.join(CARTELLA, 'da-rispondere.json');

// Ricerche da provare in fila per trovare l'attivita' su Google, dalla piu'
// precisa alla piu' larga. La prima versione passava anche l'indirizzo
// ("Via 1° Maggio 6") e Google non trovava niente: il grado e il civico
// stringono troppo. Meglio nome + paese.
const RICERCHE = [
  process.env.GOOGLE_PLACE_QUERY,
  'Acquadirete di Stefano Piconese Montespertoli',
  'Acquadirete Montespertoli',
  'Acquadirete depuratori acqua Montespertoli',
].filter(Boolean);
// La pagina dove Matteo risponde davvero alle recensioni, e la scheda pubblica
// dove si leggono (stesso CID che usa il sito in lib/siteConfig.ts).
const LINK_RECENSIONI = 'https://business.google.com/reviews';
const LINK_SCHEDA = 'https://www.google.com/maps?cid=10356560254821251978';
// Oltre questi giorni una recensione non e' "nuova": e' solo comparsa fra le
// cinque che Google ci mostra a rotazione.
const GIORNI_RECENTE = 60;

const leggi = (f, sedefault) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : sedefault);
const scrivi = (f, dati) => {
  mkdirSync(path.dirname(f), { recursive: true });
  writeFileSync(f, `${JSON.stringify(dati, null, 2)}\n`);
};

/** Impronta di riserva, quando Google non da' il nome della recensione. */
const impronta = (r) =>
  `impronta:${(r.autore || '').toLowerCase().replace(/\s+/g, '-')}:${(r.testo || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)}`;

/** Chiede a Google media, totale e le (massimo 5) recensioni che vuole darci. */
async function chiediAGoogle() {
  if (process.env.RECENSIONI_FINTE) {
    return JSON.parse(readFileSync(process.env.RECENSIONI_FINTE, 'utf8'));
  }
  const chiave = process.env.GOOGLE_PLACES_API_KEY;
  if (!chiave) throw new Error('Manca GOOGLE_PLACES_API_KEY fra i secret del repo.');

  let placeId = process.env.GOOGLE_PLACE_ID;
  for (const query of placeId ? [] : RICERCHE) {
    const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': chiave,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      // includePureServiceAreaBusinesses: Acquadirete su Maps non ha un
      // indirizzo pubblico (e' un'attivita' che va dal cliente). Senza questo
      // parametro Google non la restituisce affatto nelle ricerche via API,
      // e infatti le prime prove tornavano zero risultati.
      body: JSON.stringify({ textQuery: query, languageCode: 'it', includePureServiceAreaBusinesses: true }),
    });
    if (!res.ok) throw new Error(`Google (ricerca attivita'): HTTP ${res.status} — ${await res.text()}`);
    const trovati = (await res.json()).places ?? [];
    console.log(`Ricerca "${query}": ${trovati.length ? trovati.map((p) => `${p.displayName?.text} — ${p.formattedAddress} [${p.id}]`).join(' | ') : 'niente'}`);
    if (trovati[0]?.id) {
      placeId = trovati[0].id;
      // Da mettere in GOOGLE_PLACE_ID nel workflow: cosi' si salta la ricerca,
      // che costa una chiamata in piu' e puo' cambiare risultato nel tempo.
      console.log(`Place ID da fissare nel workflow: ${placeId}`);
      break;
    }
  }
  if (!placeId) throw new Error(`Google non trova l'attivita'. Provate: ${RICERCHE.join(' / ')}`);

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=it`,
    { headers: { 'X-Goog-Api-Key': chiave, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,reviews,googleMapsUri' } },
  );
  if (!res.ok) throw new Error(`Google (dettagli): HTTP ${res.status} — ${await res.text()}`);
  const dati = await res.json();
  console.log(`Google ha risposto con: ${Object.keys(dati).join(', ') || '(niente)'} — recensioni nel corpo: ${(dati.reviews ?? []).length}`);
  return dati;
}

/** Dalla risposta di Google alle recensioni come le scriviamo noi. */
const normalizza = (dati) =>
  (dati.reviews ?? []).map((r) => {
    const voce = {
      autore: r.authorAttribution?.displayName || 'Cliente Google',
      stelle: typeof r.rating === 'number' ? r.rating : 5,
      quando: r.publishTime || '',
      quandoInParole: r.relativePublishTimeDescription || '',
      testo: (r.text?.text || r.originalText?.text || '').trim(),
    };
    return { id: r.name || impronta(voce), ...voce };
  });

function riga(r) {
  const stelle = '★'.repeat(Math.round(r.stelle)) + '☆'.repeat(Math.max(0, 5 - Math.round(r.stelle)));
  const quando = r.quandoInParole || (r.quando ? r.quando.slice(0, 10) : '');
  return `${stelle} ${r.stelle}/5 — ${r.autore}${quando ? ` (${quando})` : ''}\n«${r.testo}»`;
}

async function main() {
  const dati = await chiediAGoogle();
  const recensioni = normalizza(dati);
  const totale = typeof dati.userRatingCount === 'number' ? dati.userRatingCount : recensioni.length;
  const media = typeof dati.rating === 'number' ? dati.rating : null;

  const stato = leggi(STATO, null);
  const viste = new Set(stato?.viste ?? []);
  const nuove = recensioni.filter((r) => !viste.has(r.id));

  // Primo giro: si prende nota di tutto senza mettere niente in coda. Altrimenti
  // Matteo si troverebbe cinque bozze di risposta per recensioni vecchie di mesi.
  if (!stato) {
    scrivi(STATO, {
      aggiornato: new Date().toISOString(),
      totale,
      media,
      viste: recensioni.map((r) => r.id),
    });
    console.log(`Primo giro: prese in carico ${recensioni.length} recensioni gia' esistenti (totale ${totale}). Niente in coda, niente messaggi.`);
    return;
  }

  const differenza = totale - (stato.totale ?? totale);
  const limite = Date.now() - GIORNI_RECENTE * 24 * 60 * 60 * 1000;
  // Recente = scritta davvero adesso. Senza data non si indovina: si considera
  // vecchia, perche' sbagliare per prudenza costa meno.
  const recenti = nuove.filter((r) => r.quando && Date.parse(r.quando) >= limite);
  const vecchie = nuove.filter((r) => !recenti.includes(r));
  if (vecchie.length) {
    console.log(`${vecchie.length} recensioni mai viste ma vecchie: prese in nota senza fare niente (Google ruota le cinque che mostra).`);
  }

  // Le recenti vanno in coda: da li' l'agente nel cloud prende cosa scrivere.
  if (recenti.length) {
    const coda = leggi(CODA, []);
    const giaInCoda = new Set(coda.map((r) => r.id));
    const aggiunte = recenti
      .filter((r) => !giaInCoda.has(r.id))
      .map((r) => ({ ...r, trovata: new Date().toISOString() }));
    if (aggiunte.length) scrivi(CODA, [...coda, ...aggiunte]);
    console.log(`Recensioni recenti nuove: ${recenti.length}, messe in coda: ${aggiunte.length}.`);
  } else {
    console.log(`Nessuna recensione nuova fra quelle che Google mostra (totale ${totale}).`);
  }

  // Se il totale e' salito piu' di quante recensioni nuove riusciamo a leggere,
  // il resto e' dietro il muro delle cinque.
  const nascoste = Math.max(0, differenza - recenti.length);

  const brutte = recenti.filter((r) => r.stelle <= 3);
  const avvisi = [];
  if (brutte.length) {
    avvisi.push(
      `${brutte.length === 1 ? 'Recensione' : 'Recensioni'} da sistemare su Google:\n\n${brutte.map(riga).join('\n\n')}\n\n` +
      "Ti arriva a breve una bozza di risposta. Rispondere presto, e con calma, conta piu' della recensione stessa: " +
      'la leggono quelli che devono ancora chiamarti.',
    );
  }
  if (nascoste > 0) {
    const una = nascoste === 1;
    // Due motivi diversi per cui non si legge il testo, e a Matteo va detto
    // quello vero: se Google non manda NESSUNA recensione e' perche' la scheda
    // di Acquadirete non ha un indirizzo pubblico (vedi LEGGIMI); se ne manda
    // qualcuna ma meno del salto, e' il tetto delle cinque.
    const perche = recensioni.length
      ? "Google me ne fa vedere solo cinque per volta, e questa non c'e'."
      : 'Il testo Google non me lo da\': la tua scheda non ha un indirizzo pubblico, e per quelle le recensioni via programma non le passa.';
    avvisi.push(
      `Su Google ${una ? "e' arrivata una recensione nuova" : `sono arrivate ${nascoste} recensioni nuove`} ` +
      `(da ${stato.totale} a ${totale}).\n${perche}\n\n` +
      `${una ? 'Leggila' : 'Leggile'} qui: ${LINK_SCHEDA}\n` +
      `Per rispondere: ${LINK_RECENSIONI}`,
    );
  }
  if (differenza < 0) {
    avvisi.push(
      `Le recensioni su Google sono passate da ${stato.totale} a ${totale}: ` +
      `${-differenza === 1 ? "una e' stata tolta o nascosta" : `${-differenza} sono state tolte o nascoste`}. ` +
      "Non e' una cosa che puoi risolvere tu, ma e' giusto che tu lo sappia.",
    );
  }

  if (avvisi.length && process.env.PROVA === 'true') {
    // Come in promemoria.mjs: si vede cosa partirebbe senza mandarlo.
    console.log(avvisi.map((t) => `--- messaggio ---\n${t}`).join('\n'));
  } else if (avvisi.length) {
    const { messaggio } = await import('./lib/telegram.mjs');
    for (const testo of avvisi) await messaggio(testo);
  }

  scrivi(STATO, {
    aggiornato: new Date().toISOString(),
    totale,
    media,
    viste: [...viste, ...nuove.map((r) => r.id)],
  });
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
