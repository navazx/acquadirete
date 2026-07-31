'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getConsent, setConsent } from '../lib/cookieConsent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisible(getConsent() === null);
  }, []);

  // Il banner è "fixed" in basso: senza questo spazio riservato, copre
  // (e blocca i tap su) qualunque elemento interattivo che si trovi nella
  // stessa zona dello schermo, es. il pulsante di invio dei form su mobile.
  //
  // Il padding sul body basta per i contenuti nel flusso della pagina, ma NON
  // per i livelli "fixed" (la modale del sopralluogo): per quelli esponiamo
  // l'altezza del banner come variabile CSS --cookie-banner-h, che chi sta
  // sopra usa per riservarsi lo spazio da solo.
  useEffect(() => {
    const clear = () => {
      document.body.style.paddingBottom = '';
      document.documentElement.style.removeProperty('--cookie-banner-h');
    };
    if (!visible) {
      clear();
      return;
    }
    const updatePadding = () => {
      if (bannerRef.current) {
        const altezza = `${bannerRef.current.offsetHeight}px`;
        document.body.style.paddingBottom = altezza;
        document.documentElement.style.setProperty('--cookie-banner-h', altezza);
      }
    };
    updatePadding();
    // L'altezza cambia col wrap del testo (rotazione, font caricati, zoom).
    const observer = new ResizeObserver(updatePadding);
    if (bannerRef.current) observer.observe(bannerRef.current);
    window.addEventListener('resize', updatePadding);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updatePadding);
      clear();
    };
  }, [visible]);

  if (!visible) return null;

  const choose = (status: 'accepted' | 'rejected') => {
    setConsent(status);
    setVisible(false);
  };

  return (
    // Su mobile il banner mangiava il 20% dello schermo (161px): testo lungo,
    // molte righe. L'informativa completa (Meta Pixel, Google Ads, finalità)
    // sta nella Cookie Policy, qui basta il minimo + il link.
    <div
      ref={bannerRef}
      className="fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 px-4 pt-3 shadow-[0_-4px_20px_rgba(15,108,189,0.12)]"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-2.5 sm:gap-6">
        <p className="text-[11px] sm:text-xs text-slate-600 leading-snug flex-1 text-center sm:text-left">
          Usiamo cookie tecnici e, con il tuo consenso, cookie di marketing per misurare le nostre inserzioni.{' '}
          <Link href="/cookie-policy" title="Leggi la Cookie Policy" className="text-blue-600 font-semibold hover:underline">Cookie Policy</Link>
        </p>
        <div className="flex gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => choose('rejected')}
            className="flex-1 sm:flex-none text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-blue-50 cursor-pointer transition-colors"
          >
            Rifiuta
          </button>
          <button
            onClick={() => choose('accepted')}
            className="flex-1 sm:flex-none text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
