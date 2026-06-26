'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getConsent, CONSENT_CHANGE_EVENT } from '../lib/cookieConsent';
import { META_PIXEL_ID } from '../lib/siteConfig';

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

// Inietta lo script ufficiale di Meta Pixel solo dopo il consenso dell'utente
// (vedi CookieConsent.tsx): i cookie di marketing non possono partire prima.
function injectPixel() {
  if (typeof window === 'undefined' || window.fbq) return;
  const n: Window['fbq'] = function (...args: unknown[]) {
    const self = n as { callMethod?: (...a: unknown[]) => void; queue?: unknown[] };
    if (self.callMethod) self.callMethod(...args);
    else self.queue?.push(args);
  };
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  (n as { push?: unknown }).push = n;
  (n as { loaded?: boolean }).loaded = true;
  (n as { version?: string }).version = '2.0';
  (n as { queue?: unknown[] }).queue = [];

  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s.parentNode?.insertBefore(t, s);

  window.fbq('init', META_PIXEL_ID);
  window.fbq('track', 'PageView');
}

export default function MetaPixel() {
  const pathname = usePathname();
  const enabled = useRef(false);
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (getConsent() === 'accepted') {
      enabled.current = true;
      injectPixel();
    }

    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<'accepted' | 'rejected'>).detail;
      if (detail === 'accepted') {
        enabled.current = true;
        injectPixel();
      } else {
        enabled.current = false;
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
  }, []);

  useEffect(() => {
    if (isFirstPath.current) {
      // Il primo PageView lo manda già injectPixel() all'inizializzazione.
      isFirstPath.current = false;
      return;
    }
    if (enabled.current && window.fbq) {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}
