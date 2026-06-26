import type { Metadata } from 'next';
import HomeView from '../components/HomeView';
import { OG_DEFAULTS } from '../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Depuratore Acqua Firenze | Acquadirete',
  description:
    'Depuratori a osmosi inversa a Firenze, Prato e Pistoia. Installazione e assistenza dal 2005, oltre 120 recensioni a 5 stelle su Google. Sopralluogo gratuito.',
  alternates: { canonical: '/' },
  openGraph: { ...OG_DEFAULTS, url: '/' },
};

export default function HomePage() {
  return <HomeView />;
}
