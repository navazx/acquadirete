import type { MetadataRoute } from 'next';
import { SITE_URL } from '../lib/siteConfig';
import { ROUTES } from '../lib/routes';
import { BLOG_POSTS } from '../lib/blogPosts';

export const dynamic = 'force-static';

// Il sito usa trailingSlash: true (next.config.ts): l'URL canonico di ogni
// pagina ha sempre lo slash finale, altrimenti Netlify risponde con un 301.
function withTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = Object.values(ROUTES).map((path) => ({
    url: withTrailingSlash(`${SITE_URL}${path}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }));

  const blogIndex: MetadataRoute.Sitemap[number] = {
    url: withTrailingSlash(`${SITE_URL}/blog`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  };

  const blogPosts: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: withTrailingSlash(`${SITE_URL}/blog/${post.slug}`),
    lastModified: new Date(post.publishedAt),
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  return [...pages, blogIndex, ...blogPosts];
}
