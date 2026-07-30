import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratore a Carboni Attivi Firenze | Senza Scarto d\'Acqua',
  description:
    'Microfiltrazione a carboni attivi a Firenze, Prato e Pistoia: elimina cloro e cattivi sapori mantenendo i minerali. 130+ recensioni, sopralluogo gratuito.',
  alternates: { canonical: '/depuratore-carboni-attivi-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-carboni-attivi-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="carboni" />;
}
