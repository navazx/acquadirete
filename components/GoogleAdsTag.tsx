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
  // ATTENZIONE: gtag.js processa SOLO oggetti `arguments` nel dataLayer e
  // ignora silenziosamente gli array normali (push(args) con rest parameter
  // NON funziona: script caricato ma nessun invio a Google). Va usato
  // `arguments` come nello snippet ufficiale.
  window.gtag = function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };

  // Consent Mode v2: per gli utenti UE Google esige un segnale di consenso
  // esplicito, altrimenti gtag mette in coda gli eventi senza mai inviarli
  // (verificato: conversioni nel dataLayer ma zero richieste di rete).
  // Qui "granted" è corretto perché questa funzione viene eseguita SOLO dopo
  // che l'utente ha cliccato "Accetta" sul banner. Va dichiarato prima di
  // gtag('js')/config.
  window.gtag('consent', 'default', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });

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
