export type ConsentStatus = 'accepted' | 'rejected';

const KEY = 'acquadirete_cookie_consent';
export const CONSENT_CHANGE_EVENT = 'cookie-consent-changed';

export function getConsent(): ConsentStatus | null {
  if (typeof window === 'undefined') return null;
  const v = localStorage.getItem(KEY);
  return v === 'accepted' || v === 'rejected' ? v : null;
}

export function setConsent(status: ConsentStatus) {
  localStorage.setItem(KEY, status);
  window.dispatchEvent(new CustomEvent(CONSENT_CHANGE_EVENT, { detail: status }));
}

// Usata dal link "Gestione cookie" nel footer per far riapparire il banner.
export function resetConsent() {
  localStorage.removeItem(KEY);
  window.location.reload();
}
