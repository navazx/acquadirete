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
  useEffect(() => {
    if (!visible) {
      document.body.style.paddingBottom = '';
      return;
    }
    const updatePadding = () => {
      if (bannerRef.current) {
        document.body.style.paddingBottom = `${bannerRef.current.offsetHeight}px`;
      }
    };
    updatePadding();
    window.addEventListener('resize', updatePadding);
    return () => {
      window.removeEventListener('resize', updatePadding);
      document.body.style.paddingBottom = '';
    };
  }, [visible]);

  if (!visible) return null;

  const choose = (status: 'accepted' | 'rejected') => {
    setConsent(status);
    setVisible(false);
  };

  return (
    <div ref={bannerRef} className="fixed bottom-0 inset-x-0 z-[60] bg-slate-950 border-t border-slate-800 px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
        <p className="text-xs text-slate-300 leading-relaxed flex-1">
          Usiamo cookie tecnici necessari al funzionamento del sito e, solo con il tuo consenso, cookie di marketing (Meta Pixel e Google Ads) per misurare l'efficacia delle nostre inserzioni su Facebook, Instagram e Google. Leggi la{' '}
          <Link href="/cookie-policy" title="Leggi la Cookie Policy" className="text-blue-400 hover:underline">Cookie Policy</Link>.
        </p>
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={() => choose('rejected')}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-900 cursor-pointer transition-colors"
          >
            Rifiuta
          </button>
          <button
            onClick={() => choose('accepted')}
            className="text-xs font-bold uppercase tracking-widest px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer transition-colors"
          >
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
