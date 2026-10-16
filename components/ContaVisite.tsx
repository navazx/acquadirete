'use client';

import { useEffect } from 'react';
import { segna } from '../lib/statistiche';

// Conta la pagina vista e i clic su Chiama e WhatsApp (lib/statistiche.ts).
// Sta in app/template.tsx, che si rimonta a ogni cambio pagina: così ogni
// pagina vista conta una volta, anche navigando dentro il sito.
export default function ContaVisite() {
  useEffect(() => {
    segna('visita');
    // Un solo ascoltatore per tutti i link della pagina, come in GoogleAdsTag.
    const alClic = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest?.('a[href]');
      const href = link?.getAttribute('href') ?? '';
      if (href.startsWith('tel:')) segna('chiama');
      else if (href.includes('wa.me/') || href.includes('api.whatsapp.com')) segna('whatsapp');
    };
    document.addEventListener('click', alClic, true);
    return () => document.removeEventListener('click', alClic, true);
  }, []);
  return null;
}
