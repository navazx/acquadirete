import type { Metadata } from 'next';
import ReviewList from '../../components/ReviewList';
import OpenModalButton from '../../components/OpenModalButton';
import { REVIEWS, REVIEW_RATING, REVIEW_TOTAL } from '../../lib/reviews';
import { CONTACT, SITE_URL, OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Recensioni Acquadirete | 120+ a 5 Stelle su Google',
  description:
    'Leggi oltre 120 recensioni a 5 stelle su Google dei clienti Acquadirete a Firenze, Prato e Pistoia. Depuratori d\'acqua, installazione e assistenza.',
  alternates: { canonical: '/recensioni' },
  openGraph: { ...OG_DEFAULTS, url: '/recensioni' },
};

// Le recensioni Google riportano solo "Mese Anno" (o solo l'anno): convertiamo
// in una data approssimata (giorno 1) per il campo datePublished dello schema.
const MESI: Record<string, string> = {
  gennaio: '01', febbraio: '02', marzo: '03', aprile: '04', maggio: '05', giugno: '06',
  luglio: '07', agosto: '08', settembre: '09', ottobre: '10', novembre: '11', dicembre: '12',
};
function toIsoDate(date: string): string {
  const [first, second] = date.toLowerCase().split(' ');
  if (second && MESI[first]) return `${second}-${MESI[first]}-01`;
  if (/^\d{4}$/.test(first)) return `${first}-01-01`;
  return '2024-01-01';
}

const reviewSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: CONTACT.companyName,
  url: SITE_URL,
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: REVIEW_RATING,
    reviewCount: REVIEW_TOTAL,
    bestRating: 5,
  },
  review: REVIEWS.map((r) => ({
    '@type': 'Review',
    author: { '@type': 'Person', name: r.author },
    datePublished: toIsoDate(r.date),
    reviewBody: r.text,
    reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
  })),
};

export default function RecensioniPage() {
  return (
    <div id="recensioni-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewSchema) }} />
      <div className="text-center max-w-3xl mx-auto space-y-5 block">
        <span className="inline-block bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-blue-500/20">
          Feedback Clienti
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
          Oltre 120 Recensioni Google a 5 Stelle
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Siamo orgogliosi della fiducia che le famiglie e le attività commerciali di Firenze ci riservano da anni. Leggi le testimonianze certificate o invia la tua recensione sul servizio ricevuto.
        </p>
      </div>

      <ReviewList />

      {/* Micro CTA to contact */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-4">
        <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase tracking-wider text-xs">Anche tu desideri un'acqua così pura dal tuo rubinetto?</h2>
        <p className="text-xs text-slate-500">I nostri consulenti e tecnici eseguono sopralluoghi continui in tutta Firenze.</p>
        <OpenModalButton className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-lg cursor-pointer">
          Contattaci per una Chiamata Informativa
        </OpenModalButton>
      </div>
    </div>
  );
}
