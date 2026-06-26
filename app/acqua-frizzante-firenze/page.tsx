import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Acqua Frizzante e Refrigerata a Firenze | Acquadirete',
  description:
    'Acqua liscia, fredda e frizzante dal rubinetto a Firenze, Prato e Pistoia, per casa e attività. Niente più bottiglie da comprare. Sopralluogo gratuito.',
  alternates: { canonical: '/acqua-frizzante-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/acqua-frizzante-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="frizzante" />;
}
