import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Radice del progetto: evita che Next scelga un lockfile esterno alla cartella.
  outputFileTracingRoot: path.join(__dirname),
  // Static Site Generation: ogni pagina viene esportata come file HTML statico
  // in /out, con un URL reale indicizzabile da Google.
  output: 'export',
  // Necessario con l'export statico: niente ottimizzazione server delle immagini.
  images: {
    unoptimized: true,
  },
  // Genera /pagina/index.html (URL con slash finale): più robusto su hosting statici.
  trailingSlash: true,
};

export default nextConfig;
