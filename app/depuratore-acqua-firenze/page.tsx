import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Installazione Depuratore Acqua a Firenze | Acquadirete',
  description:
    'Depuratore acqua a osmosi inversa a casa tua a Firenze. Acqua buona dal rubinetto, installazione e assistenza dal 2005. Sopralluogo gratuito e senza impegno.',
  alternates: { canonical: '/depuratore-acqua-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="depuratore" />;
}
