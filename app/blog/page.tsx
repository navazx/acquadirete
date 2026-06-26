import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Clock } from 'lucide-react';
import { BLOG_POSTS } from '../../lib/blogPosts';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Blog | Guide su Depuratori e Trattamento Acqua | Acquadirete',
  description:
    'Guide pratiche su depuratori, osmosi inversa e trattamento dell\'acqua a Firenze, Prato e Pistoia, scritte da chi installa impianti dal 2005.',
  alternates: { canonical: '/blog' },
  openGraph: { ...OG_DEFAULTS, url: '/blog' },
};

export default function BlogIndexPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12">
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <span className="inline-block bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-blue-500/20">
          Guide Acquadirete
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
          Guide sul trattamento dell'acqua
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Risposte chiare alle domande che ci fanno più spesso, scritte da chi installa depuratori a Firenze, Prato e Pistoia dal 2005.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
        {BLOG_POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            title={post.title}
            className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all flex flex-col justify-between cursor-pointer"
          >
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{post.title}</h2>
              <p className="text-xs text-slate-500 leading-relaxed">{post.excerpt}</p>
            </div>
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                <Clock size={12} /> {post.readingMinutes} min
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
                Leggi <ChevronRight size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
