import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratori per Uffici e Ristoranti a Firenze | Acquadirete',
  description:
    'Erogatori e depuratori d\'acqua per uffici, bar e ristoranti a Firenze, Prato e Pistoia. Acqua microfiltrata liscia o frizzante dalla rete, senza boccioni.',
  alternates: { canonical: '/depuratore-acqua-uffici-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-uffici-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="business" />;
}
