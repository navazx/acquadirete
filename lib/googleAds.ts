import { GOOGLE_ADS } from './siteConfig';

// Tipi globali per gtag.js (caricato da components/GoogleAdsTag.tsx solo
// dopo il consenso ai cookie di marketing).
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type ConversionKind = keyof typeof GOOGLE_ADS.labels;

// Normalizza un numero di telefono italiano in formato E.164 (+39...),
// come richiesto dalle conversioni avanzate di Google.
function toE164(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits;
  if (digits.startsWith('00')) return `+${digits.slice(2)}`;
  if (digits.startsWith('39') && digits.length > 10) return `+${digits}`;
  return `+39${digits}`;
}

// Invia a Google Ads i dati (email/telefono) per le conversioni avanzate:
// gtag li cripta (hash SHA-256) prima di trasmetterli. Va chiamata PRIMA di
// trackGoogleAdsConversion. Non fa nulla se gtag non è attivo (nessun consenso).
export function setGoogleAdsUserData(data: { email?: string; phone?: string }) {
  if (!window.gtag) return;
  const userData: Record<string, string> = {};
  if (data.email) userData.email = data.email.trim().toLowerCase();
  if (data.phone) userData.phone_number = toE164(data.phone);
  if (Object.keys(userData).length > 0) {
    window.gtag('set', 'user_data', userData);
  }
}

// Registra una conversione Google Ads (modulo, chiamata o WhatsApp).
// Non fa nulla se: l'utente non ha dato il consenso (gtag assente) oppure la
// label dell'azione non è ancora configurata in siteConfig.ts.
export function trackGoogleAdsConversion(kind: ConversionKind) {
  const label = GOOGLE_ADS.labels[kind];
  if (!window.gtag || !label) return;
  window.gtag('event', 'conversion', {
    send_to: `${GOOGLE_ADS.id}/${label}`,
  });
}
