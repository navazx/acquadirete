import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratore Acqua a Prato | Sopralluogo Gratuito | Acquadirete',
  description:
    'Depuratore acqua a osmosi inversa a Prato e provincia. Installazione, manutenzione e assistenza locale dal 2005. Sopralluogo gratuito e senza impegno.',
  alternates: { canonical: '/depuratore-acqua-prato' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-prato' },
};

export default function Page() {
  return <ServicePageView serviceId="prato" />;
}
