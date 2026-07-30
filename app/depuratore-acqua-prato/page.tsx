import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratore Acqua Prato | 130+ Recensioni a 5 Stelle',
  description:
    'Depuratori a osmosi inversa a Prato e provincia, installati e assistiti dal 2005. 10 anni di garanzia, oltre 130 recensioni. Sopralluogo gratuito.',
  alternates: { canonical: '/depuratore-acqua-prato' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-prato' },
};

export default function Page() {
  return <ServicePageView serviceId="prato" />;
}
