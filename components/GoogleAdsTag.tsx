'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getConsent, CONSENT_CHANGE_EVENT } from '../lib/cookieConsent';
import { GOOGLE_ADS } from '../lib/siteConfig';
import { trackGoogleAdsConversion } from '../lib/googleAds';

// Inietta il tag Google (gtag.js) per Google Ads solo dopo il consenso
// dell'utente, con lo stesso schema di MetaPixel.tsx: i cookie di marketing
// non possono partire prima. In più registra come conversioni i clic sui
// link "chiama" (tel:) e WhatsApp (wa.me) presenti ovunque nel sito.
function injectGtag() {
  if (typeof window === 'undefined' || window.gtag) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS.id}`;
  document.head.appendChild(s);

  window.gtag('js', new Date());
  // allow_enhanced_conversions: abilita l'invio dei dati (criptati) di email
  // e telefono dal modulo, vedi setGoogleAdsUserData in lib/googleAds.ts.
  window.gtag('config', GOOGLE_ADS.id, { allow_enhanced_conversions: true });
}

export default function GoogleAdsTag() {
  const pathname = usePathname();
  const enabled = useRef(false);
  const isFirstPath = useRef(true);

  useEffect(() => {
    if (getConsent() === 'accepted') {
      enabled.current = true;
      injectGtag();
    }

    const onConsentChange = (e: Event) => {
      const detail = (e as CustomEvent<'accepted' | 'rejected'>).detail;
      if (detail === 'accepted') {
        enabled.current = true;
        injectGtag();
      } else {
        enabled.current = false;
      }
    };
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsentChange);
  }, []);

  // Conversioni sui clic verso telefono e WhatsApp: un solo listener globale
  // copre tutti i link del sito (Header, Footer, pagine, modali) senza dover
  // toccare ogni componente. trackGoogleAdsConversion non fa nulla senza
  // consenso o senza label configurata.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (href.startsWith('tel:')) {
        trackGoogleAdsConversion('phone');
      } else if (href.includes('wa.me/') || href.includes('api.whatsapp.com')) {
        trackGoogleAdsConversion('whatsapp');
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  // Pageview per la navigazione client-side (per remarketing/attribuzione):
  // il primo lo manda già gtag('config') all'inizializzazione.
  useEffect(() => {
    if (isFirstPath.current) {
      isFirstPath.current = false;
      return;
    }
    if (enabled.current && window.gtag) {
      window.gtag('event', 'page_view', { send_to: GOOGLE_ADS.id });
    }
  }, [pathname]);

  return null;
}
