// ============================================================================
//  CONTATTI E DATI AZIENDALI — Acquadirete
//  Modifica SOLO questo file per aggiornare i contatti in tutto il sito.
//  I valori tra [ ... ] sono SEGNAPOSTO da completare prima di pubblicare.
// ============================================================================

export const CONTACT = {
  // Ragione sociale
  companyName: 'Acquadirete di Stefano Piconese',

  // --- Telefono ---
  // phoneDisplay: come appare scritto sul sito
  // phoneHref: numero per il link "chiama" in formato internazionale, senza spazi
  phoneDisplay: '335 816 8825',
  phoneHref: '+393358168825',

  // --- WhatsApp ---
  // whatsappDisplay: testo mostrato
  // whatsappNumber: numero internazionale senza "+" né spazi
  whatsappDisplay: '335 816 8825',
  whatsappNumber: '393358168825',

  // --- Email ---
  email: 'info@acquadirete.it',

  // --- Indirizzo ---
  addressLine: 'Via 1° Maggio, 6',
  addressCity: '50025 Montespertoli (FI)',

  // --- Dati legali ---
  vat: '06864300485',

  // --- Orari ---
  hours: [
    'Lunedì - Venerdì: 09:00 - 19:00',
  ],
};

// URL canonico del sito (usato per metadata, sitemap, dati strutturati).
// www è il dominio primario su Netlify: acquadirete.it (senza www) fa redirect a questo.
export const SITE_URL = 'https://www.acquadirete.it';

// Valori OG condivisi: Next.js NON fa il merge di openGraph tra layout e
// pagina (la pagina sovrascrive l'intero oggetto, non solo i campi che
// imposta). Ogni pagina deve quindi fare ...OG_DEFAULTS oltre a url/title/
// description, altrimenti perde l'immagine OG impostata qui.
export const OG_DEFAULTS = {
  type: 'website' as const,
  locale: 'it_IT',
  siteName: 'Acquadirete',
  images: [{ url: '/og-image.png', width: 1200, height: 630 }],
};

// Scheda Google Maps dell'attività (link canonico via CID): apre il profilo
// "Acquadirete di Stefano Piconese" dove si possono leggere tutte le recensioni.
export const GOOGLE_PROFILE_URL = 'https://www.google.com/maps?cid=10356560254821251978';

// Apre direttamente il modulo "Scrivi una recensione" di Google per l'attività
// (verificato: apre il dialogo a stelle per Acquadirete di Stefano Piconese).
export const GOOGLE_WRITE_REVIEW_URL =
  'https://www.google.com/maps/place//data=!4m3!3m2!1s0x132a514f93e1eaa3:0x8fb9e4ae2b8cbb8a!12e1';

// --- Social ---
export const SOCIAL = {
  instagram: 'https://www.instagram.com/acquadirete.it/',
  facebook: 'https://www.facebook.com/people/Acquadirete/61591005742951/',
};

// Meta Pixel (Facebook/Instagram Ads): si attiva solo se l'utente accetta i
// cookie di marketing dal banner (vedi components/CookieConsent.tsx).
export const META_PIXEL_ID = '996066733219370';

// Google Ads (tag di conversione): come il Meta Pixel, si attiva solo dopo il
// consenso ai cookie di marketing (vedi components/GoogleAdsTag.tsx).
// Le "labels" identificano le singole azioni di conversione create in Google
// Ads (Obiettivi → Conversioni → azione → "Configura il tag" → snippet evento:
// la label è la parte DOPO la barra in send_to: 'AW-XXXX/QUESTA_PARTE').
// Finché una label è vuota, quella conversione non viene inviata.
export const GOOGLE_ADS = {
  id: 'AW-18232888892',
  labels: {
    form: '', // invio del modulo di contatto
    phone: '', // clic su un link "chiama" (tel:)
    whatsapp: '', // clic su un link WhatsApp (wa.me)
  },
};

// ============================================================================
//  INVIO DEL MODULO DI CONTATTO
//  Il modulo invia le richieste via Web3Forms (gratuito, nessun server da gestire).
//  COME ATTIVARLO:
//   1. Vai su https://web3forms.com
//   2. Inserisci l'email info@acquadirete.it e ricevi una "Access Key" gratuita
//   3. Incolla la chiave qui sotto tra le virgolette
//  Finché la chiave è vuota, il modulo funziona in modalità demo (non invia email).
// ============================================================================
export const FORM = {
  web3formsAccessKey: '7de0398b-f97c-4631-bfbe-3dfbbd17a455',
};

// Restituisce l'href per il pulsante "chiama". Se il numero non è impostato,
// punta a "#" per evitare link rotti.
export function telHref(): string {
  return CONTACT.phoneHref ? `tel:${CONTACT.phoneHref}` : '#';
}

// Restituisce l'href per WhatsApp con un eventuale messaggio precompilato.
// Se il numero non è impostato, punta a "#".
export function whatsappHref(message?: string): string {
  if (!CONTACT.whatsappNumber) return '#';
  const base = `https://wa.me/${CONTACT.whatsappNumber}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

// Restituisce l'href per l'email. Se non impostata, punta a "#".
export function mailtoHref(): string {
  return CONTACT.email && !CONTACT.email.startsWith('[') ? `mailto:${CONTACT.email}` : '#';
}
