import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratori Acqua per Uffici e Bar a Firenze | Senza Boccioni',
  description:
    'Erogatori d\'acqua microfiltrata per uffici, bar e ristoranti a Firenze, Prato e Pistoia. Niente più boccioni. 10 anni di garanzia, sopralluogo gratuito.',
  alternates: { canonical: '/depuratore-acqua-uffici-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/depuratore-acqua-uffici-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="business" />;
}
