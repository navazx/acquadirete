import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import ModalProvider from '../components/ModalProvider';
import Header from '../components/Header';
import Footer from '../components/Footer';
// import FloatingWhatsApp from '../components/FloatingWhatsApp'; // disattivato su richiesta, componente non rimosso
import CookieConsent from '../components/CookieConsent';
import MetaPixel from '../components/MetaPixel';
import { CONTACT, SITE_URL, OG_DEFAULTS } from '../lib/siteConfig';
import { REVIEW_RATING, REVIEW_TOTAL } from '../lib/reviews';

// Font self-hosted da Next (next/font): nessuna richiesta bloccante verso
// Google Fonts, niente @import in CSS. Pesi identici a quelli usati prima.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Depuratore Acqua Firenze | Acquadirete',
  description:
    'Depuratori a osmosi inversa a Firenze, Prato e Pistoia. Installazione e assistenza dal 2005, oltre 130 recensioni a 5 stelle su Google. Sopralluogo gratuito.',
  alternates: { canonical: '/' },
  // Niente title/description qui: così ogni pagina usa i propri (Next fa il
  // fallback da title/description → og e twitter), evitando anteprime social
  // tutte uguali. og-image.png è un'immagine 1200x630 dedicata (non il logo).
  // Da solo come fallback: ogni pagina imposta il proprio openGraph completo
  // (Next non fa il merge dei campi, vedi OG_DEFAULTS in siteConfig.ts).
  openGraph: { ...OG_DEFAULTS, url: '/' },
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
};

// Dati strutturati LocalBusiness: aiutano Google a capire chi siamo e dove operiamo.
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: CONTACT.companyName,
  image: `${SITE_URL}/logo.png`,
  // Logo quadrato (512x512): Google lo preferisce al logo.png originale
  // (1015x647, non quadrato) per Knowledge Panel, Ads e rich result.
  logo: `${SITE_URL}/favicon-512.png`,
  url: SITE_URL,
  telephone: CONTACT.phoneHref,
  email: CONTACT.email,
  vatID: CONTACT.vat,
  address: {
    '@type': 'PostalAddress',
    streetAddress: CONTACT.addressLine,
    addressLocality: 'Montespertoli',
    addressRegion: 'FI',
    postalCode: '50025',
    addressCountry: 'IT',
  },
  areaServed: ['Firenze', 'Prato', 'Pistoia', 'Provincia di Firenze', 'Provincia di Prato', 'Provincia di Pistoia'],
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: REVIEW_RATING,
    reviewCount: REVIEW_TOTAL,
    bestRating: 5,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-800">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <MetaPixel />
        <ModalProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          {/* <FloatingWhatsApp /> */}
        </ModalProvider>
        <CookieConsent />
      </body>
    </html>
  );
}
