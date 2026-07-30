import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Osmosi Inversa Firenze | Installazione e 10 Anni di Garanzia',
  description:
    'Impianti a osmosi inversa a Firenze installati da noi dal 2005: acqua leggera dal rubinetto, 10 anni di garanzia, 130+ recensioni. Sopralluogo gratuito.',
  alternates: { canonical: '/osmosi-inversa-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/osmosi-inversa-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="osmosi" />;
}
