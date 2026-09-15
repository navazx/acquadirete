import { ReactNode } from 'react';

/**
 * Fascia azzurra a tutta larghezza per la testata delle pagine interne: è lo
 * stesso sfondo dell'hero della home. Senza, le pagine erano chiaro su chiaro.
 * Il contenuto va da solo dentro il contenitore max-w-7xl.
 */
export default function PageBand({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className="relative bg-gradient-to-br from-blue-200 via-blue-100 to-slate-50 overflow-hidden px-4 sm:px-6 lg:px-8 pt-10 md:pt-12 pb-14 md:pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.8),transparent_65%)] pointer-events-none"></div>
      <div className={`relative max-w-7xl mx-auto ${className}`}>{children}</div>
    </section>
  );
}
