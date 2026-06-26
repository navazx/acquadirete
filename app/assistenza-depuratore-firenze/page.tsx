import type { Metadata } from 'next';
import ServicePageView from '../../components/ServicePageView';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Assistenza e Manutenzione Depuratori a Firenze | Acquadirete',
  description:
    'Assistenza, sostituzione filtri e manutenzione depuratori a osmosi inversa a Firenze, Prato e Pistoia, anche multimarca. Interventi in pochi giorni.',
  alternates: { canonical: '/assistenza-depuratore-firenze' },
  openGraph: { ...OG_DEFAULTS, url: '/assistenza-depuratore-firenze' },
};

export default function Page() {
  return <ServicePageView serviceId="assistenza" />;
}
