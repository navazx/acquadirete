import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/siteConfig';
import { ROUTES } from '../lib/routes';
import { BLOG_POSTS } from '../lib/blogPosts';
import { PAGINE_AGGIORNATE } from '../lib/aggiornamenti';
import type { PageId } from '../lib/types';

export const dynamic = 'force-static';

// Il sito usa trailingSlash: true (next.config.ts): l'URL canonico di ogni
// pagina ha sempre lo slash finale, altrimenti Netlify risponde con un 301.
function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

// lastModified è il giorno in cui la pagina è cambiata davvero: Google ripassa
// prima da quelle cambiate, ed è l'unico modo che hanno gli agenti per dirglielo
// ("Richiedi indicizzazione" è solo a mano). Fino al 26 ott 2026 le pagine
// avevano il giorno del deploy (tutte "cambiate" ogni volta: Google smette di
// crederci) e gli articoli quello di uscita anche dopo una correzione.
// Le date le tiene scripts/lib/date-aggiornamento.mjs.
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = (Object.entries(ROUTES) as [PageId, string][]).map(([id, path]) => ({
    url: withTrailingSlash(`${SITE_URL}${path}`),
    lastModified: new Date(PAGINE_AGGIORNATE[id]),
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }));

  // L'indice del blog cambia quando cambia un articolo (titolo, riassunto) o ne esce uno.
  const ultimoArticolo = BLOG_POSTS.map((post) => post.updatedAt ?? post.publishedAt).sort().reverse()[0];
  const blogIndex: MetadataRoute.Sitemap[number] = {
    url: withTrailingSlash(`${SITE_URL}/blog`),
    lastModified: new Date(ultimoArticolo),
    changeFrequency: 'weekly',
    priority: 0.7,
  };

  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: withTrailingSlash(`${SITE_URL}/blog/${post.slug}`),
    lastModified: new Date(post.updatedAt ?? post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...pages, blogIndex, ...blogPosts];
}
