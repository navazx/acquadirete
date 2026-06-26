import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Osmosi Inversa a Firenze: Come Funziona | Acquadirete',
  description:
    'Depuratori a osmosi inversa a Firenze: come funziona e perché conviene, spiegato da chi li installa dal 2005. Acqua leggera e sicura. Sopralluogo gratuito.',
  alternates: { canonical: '/osmosi-inversa-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/osmosi-inversa-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="osmosi" />;
}
