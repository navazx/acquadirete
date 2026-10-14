import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';
import { REVIEW_RATING_TESTO } from '../../lib/reviews';

export const metadata: Metadata = {
  title: `Depuratore Acqua Firenze | 130+ Recensioni, Media ${REVIEW_RATING_TESTO}`,
  description:
    `Depuratori a osmosi inversa a Firenze dal 2005. Oltre 130 recensioni Google (media ${REVIEW_RATING_TESTO}), 10 anni di garanzia esclusi i consumabili, sopralluogo gratuito.`,
  alternates: { canonical: '/depuratore-acqua-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="depuratore" />;
}
