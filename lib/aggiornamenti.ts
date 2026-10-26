import type { PageId } from './types';

// Il giorno in cui è cambiato davvero quello che dice ogni pagina: la mappa del
// sito (app/sitemap.ts) lo passa a Google, che ripassa prima dalle pagine
// cambiate. Per gli articoli c'è updatedAt in lib/blogPosts.ts.
//
// Non si scrive a mano: lo aggiorna scripts/lib/date-aggiornamento.mjs quando una
// proposta approvata va su main (o dal PC: node scripts/lib/date-aggiornamento.mjs).
// Una pagina nuova va aggiunta qui col giorno in cui esce.
export const PAGINE_AGGIORNATE: Record<PageId, string> = {
  home: '2026-10-14',
  depuratore: '2026-10-14',
  prato: '2026-10-14',
  pistoia: '2026-10-14',
  osmosi: '2026-10-14',
  business: '2026-10-14',
  assistenza: '2026-10-14',
  carboni: '2026-10-14',
  frizzante: '2026-10-14',
  recensioni: '2026-10-14',
  contatti: '2026-09-16',
  prezzi: '2026-10-14',
  chiSiamo: '2026-10-19',
};
