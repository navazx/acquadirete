import type { Metadata } from 'next';
import HomeView from '../components/HomeView';
import { OG_DEFAULTS } from '../lib/siteConfig';

export const metadata: Metadata = {
  // Firenze, Prato e Pistoia insieme: la home è la pagina di tutta la zona.
  // Con "Depuratore Acqua Firenze" da sola si contendeva quella ricerca con
  // /depuratore-acqua-firenze/ (14 set 2026). Ogni città ha la sua pagina.
  title: 'Depuratori Acqua a Firenze, Prato e Pistoia | Acquadirete',
  description:
    'Depuratori a osmosi inversa a Firenze, Prato e Pistoia. Installazione e assistenza dal 2005, oltre 130 recensioni a 5 stelle su Google. Sopralluogo gratuito.',
  alternates: { canonical: '/' },
  openGraph: { ...OG_DEFAULTS, url: '/' },
};

export default function HomePage() {
  return <HomeView />;
}
