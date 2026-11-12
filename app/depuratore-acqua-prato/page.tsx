import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';
import { REVIEW_RATING_TESTO } from '../../lib/reviews';

export const metadata: Metadata = {
  title: `Depuratore Acqua Prato | 130+ Recensioni, Media ${REVIEW_RATING_TESTO}`,
  description:
    "Depuratori a osmosi inversa a Prato e provincia, installati e assistiti dal 2005. 10 anni di garanzia (esclusi i consumabili), oltre 130 recensioni. Analisi dell'acqua gratuita.",
  alternates: { canonical: '/depuratore-acqua-prato' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-prato' },
};

export default function Page() {
  return <ServicePageView serviceId="prato" />;
}
