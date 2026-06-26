import { Review } from './types';
import googleData from './google-reviews.json';

// Recensioni reali di Google, salvate in lib/google-reviews.json
// (inserite manualmente oppure scaricate al build da scripts/fetch-google-reviews.mjs).
const liveReviews = (googleData.reviews ?? []) as unknown as Review[];

/** true quando ci sono recensioni reali da mostrare. */
export const REVIEWS_ARE_LIVE: boolean = liveReviews.length > 0;

/** Elenco recensioni da mostrare. */
export const REVIEWS: Review[] = liveReviews;

/** Valutazione media reale (es. 5.0 / 4.9). */
export const REVIEW_RATING: number =
  typeof googleData.rating === 'number' && googleData.rating > 0 ? googleData.rating : 5;

/** Numero totale di recensioni Google. */
export const REVIEW_TOTAL: number =
  typeof googleData.total === 'number' && googleData.total > 0 ? googleData.total : 120;
