import { Review } from '../lib/types';

/**
 * Scheda recensione per i caroselli (home, pagine servizio, blog): larghezza
 * fissa perché sta dentro CardCarousel, testo tagliato a 6 righe così le
 * schede restano tutte alte uguali.
 */
export default function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="w-[80vw] max-w-[330px] sm:w-[330px] bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4">
      <div className="text-amber-400 text-sm font-bold tracking-widest" aria-label={`${review.rating} stelle su 5`}>
        ★★★★★
      </div>
      {/* flex-1 sul contenitore e line-clamp sul testo: se stanno sullo stesso
          elemento, la scheda stirata all'altezza della più lunga fa ricomparire
          le righe dopo i puntini. */}
      <div className="flex-1">
        <blockquote className="text-sm text-slate-700 leading-relaxed line-clamp-6">
          &laquo;{review.text}&raquo;
        </blockquote>
      </div>
      <figcaption className="text-xs text-slate-500 border-t border-slate-150 pt-3">
        <span className="block font-bold text-slate-900">{review.author}</span>
        {review.date} · recensione Google verificata
      </figcaption>
    </figure>
  );
}
