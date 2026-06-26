export interface Review {
  id: string;
  author: string;
  role?: string;
  rating: number;
  date: string;
  text: string;
  /** Zona/quartiere. Le recensioni Google non la forniscono: opzionale. */
  location?: string;
  /** Categoria usata per i filtri (solo dati interni di esempio). */
  category?: 'domestico' | 'business' | 'assistenza';
  /** Provenienza del dato: 'google' per le recensioni reali via API. */
  source?: 'google' | 'manual';
}

export type PageId = 'home' | 'prato' | 'pistoia' | 'depuratore' | 'osmosi' | 'carboni' | 'frizzante' | 'business' | 'assistenza' | 'recensioni' | 'contatti';

export type ServicePageId = 'prato' | 'pistoia' | 'depuratore' | 'osmosi' | 'carboni' | 'frizzante' | 'business' | 'assistenza';

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ServiceInfo {
  title: string;
  subtitle: string;
  heroImage: string;
  /** Paragrafi della sezione "Il problema" / introduzione. */
  problem: string[];
  /** Titolo della lista vantaggi (varia per pagina). */
  benefitsTitle: string;
  benefits: string[];
  /** Domande frequenti specifiche della pagina (opzionale). */
  faqs?: ServiceFaq[];
  /** Nota aggiuntiva mostrata sotto i vantaggi (opzionale). */
  note?: { title: string; body: string };
  /** Testo del pulsante CTA principale. */
  ctaLabel: string;
  /**
   * Blocco di testo locale, unico per ogni pagina e con menzione esplicita
   * della città/zona: serve alla SEO locale ed evita contenuti duplicati.
   */
  localSeo: { heading: string; body: string[] };
}

export interface SavingResult {
  bottlesSaved: number;
  moneySaved: number;
  plasticKgSaved: number;
  co2Saved: number;
}

export interface BlogSection {
  /** Omesso per il primo paragrafo introduttivo, senza titolo H2. */
  heading?: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  /** Titolo mostrato come H1 nell'articolo. */
  title: string;
  /** <title> SEO, può essere più corto del titolo H1. */
  metaTitle: string;
  metaDescription: string;
  /** Riassunto breve mostrato nella card dell'indice blog. */
  excerpt: string;
  /** Data ISO, es. '2026-06-21'. */
  publishedAt: string;
  readingMinutes: number;
  sections: BlogSection[];
  faqs?: ServiceFaq[];
  /** Pagine servizio correlate, per i link "Ti potrebbe interessare anche". */
  relatedServices: ServicePageId[];
  /** Slug di altri articoli del blog correlati (opzionale). */
  relatedPosts?: string[];
}
