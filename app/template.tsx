'use client';

import { usePathname } from 'next/navigation';

// Transizione di entrata delle pagine, in CSS puro (classe .page-enter in
// app/globals.css).
//
// Prima era un motion.div di Framer Motion che partiva da opacity: 0. Essendo
// un'animazione JavaScript, il contenuto veniva servito nell'HTML gia
// invisibile (style="opacity:0") e restava tale finche il bundle non era
// scaricato e idratato: su mobile questo spostava in avanti l'LCP di oltre un
// secondo (Search Console segnalava 2,7 s sugli articoli, soglia 2,5 s).
// In CSS l'animazione parte col primo rendering, senza aspettare nessuno script.
//
// La key sul percorso serve a rimontare il div a ogni cambio pagina: senza,
// React riusa lo stesso nodo e l'animazione non si ripete navigando nel sito.
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
