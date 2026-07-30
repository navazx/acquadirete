import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratore Acqua Casa Firenze | 130+ Recensioni a 5 Stelle',
  description:
    'Installiamo depuratori a osmosi inversa nelle case di Firenze dal 2005. 10 anni di garanzia, oltre 130 recensioni a 5 stelle. Sopralluogo gratuito.',
  alternates: { canonical: '/depuratore-acqua-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="depuratore" />;
}
