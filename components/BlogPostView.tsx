'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Clock, ChevronRight } from 'lucide-react';
import ContactForm from './ContactForm';
import ReviewList from './ReviewList';
import { SITE_URL } from '../lib/siteConfig';
import { ROUTES, PAGE_BREADCRUMB } from '../lib/routes';
import { BLOG_POSTS } from '../lib/blogPosts';
import { BlogPost } from '../lib/types';

export default function BlogPostView({ post }: { post: BlogPost }) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { '@type': 'Organization', name: 'Acquadirete' },
    publisher: {
      '@type': 'Organization',
      name: 'Acquadirete',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/favicon-512.png` },
    },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  const faqSchema = post.faqs && post.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: `${SITE_URL}/blog/${post.slug}` },
    ],
  };

  const publishedDate = new Date(post.publishedAt).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div id="blog-post-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <Link href={ROUTES.home} title="Torna alla home" className="hover:text-blue-600 cursor-pointer">Home</Link>
        <ChevronRight size={10} className="text-slate-400" />
        <Link href="/blog" title="Torna al blog" className="hover:text-blue-600 cursor-pointer">Blog</Link>
        <ChevronRight size={10} className="text-slate-400" />
        <span className="text-blue-600 truncate max-w-[220px]">{post.title}</span>
      </div>

      {/* Article header */}
      <div className="max-w-3xl mx-auto w-full space-y-5 text-center">
        <span className="bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-blue-500/20 inline-block">
          Guide Acquadirete
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
          {post.title}
        </h1>
        <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 font-semibold">
          <span>{publishedDate}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock size={12} /> {post.readingMinutes} min di lettura</span>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto w-full space-y-10">
        {post.sections.map((section, idx) => (
          <div key={idx} className="space-y-3">
            {section.heading && (
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{section.heading}</h2>
            )}
            {section.paragraphs.map((para, pIdx) => (
              <p key={pIdx} className="text-sm text-slate-600 leading-relaxed">{para}</p>
            ))}
          </div>
        ))}
      </div>

      {/* FAQ specifiche dell'articolo */}
      {post.faqs && post.faqs.length > 0 && (
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Domande frequenti</h2>
          </div>
          <div className="space-y-3">
            {post.faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-4 shadow-sm cursor-pointer transition-all"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
              >
                <div className="flex justify-between items-center font-bold text-xs uppercase tracking-wider text-slate-800">
                  <span>{faq.q}</span>
                  <span className="text-blue-600 text-base">{activeFaq === index ? '−' : '+'}</span>
                </div>
                {activeFaq === index && (
                  <p className="text-xs text-slate-500 leading-relaxed mt-3.5 pt-3.5 border-t border-slate-150 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Altri articoli correlati */}
      {post.relatedPosts && post.relatedPosts.length > 0 && (
        <div className="max-w-3xl mx-auto w-full flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Leggi anche:</span>
          {post.relatedPosts.map((relatedSlug) => {
            const relatedPost = BLOG_POSTS.find((p) => p.slug === relatedSlug);
            if (!relatedPost) return null;
            return (
              <Link
                key={relatedSlug}
                href={`/blog/${relatedSlug}`}
                title={relatedPost.title}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 cursor-pointer"
              >
                {relatedPost.title}
              </Link>
            );
          })}
        </div>
      )}

      {/* Servizi correlati: link interni contestuali */}
      <div className="max-w-3xl mx-auto w-full flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ti potrebbe interessare anche:</span>
        {post.relatedServices.map((relatedId) => (
          <Link
            key={relatedId}
            href={ROUTES[relatedId]}
            title={PAGE_BREADCRUMB[relatedId]}
            className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 cursor-pointer"
          >
            {PAGE_BREADCRUMB[relatedId]}
          </Link>
        ))}
      </div>

      {/* Reviews widget */}
      <section className="border-t border-slate-200 pt-16">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cosa ne pensa chi lo ha installato?</h3>
            <p className="text-xs text-slate-500">Recensioni verificate degli utenti di Firenze, Prato e Pistoia.</p>
          </div>
          <Link
            href={ROUTES.recensioni}
            title="Vedi tutte le recensioni certificate"
            className="text-xs text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1.5"
          >
            <span>Vedi tutte le recensioni certificate</span>
            <ChevronRight size={12} />
          </Link>
        </div>
        <ReviewList />
      </section>

      {/* CTA finale */}
      <section className="bg-slate-950 text-white rounded-xl p-6 md:p-10 border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest block px-3 py-1.5 rounded-lg border border-blue-500/20 w-fit">
            Contatto Rapido
          </span>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Non sai ancora cosa ti serve? Te lo diciamo noi</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Veniamo da te in provincia di Firenze, Prato e Pistoia, analizziamo la tua acqua e ti consigliamo la soluzione giusta — anche quando è la più semplice.
          </p>
          <div className="space-y-2 text-xs font-semibold text-slate-200">
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> Sopralluogo gratuito e senza impegno</p>
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> 10 anni di garanzia sugli impianti (esclusi i consumabili)</p>
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> Ti lasciamo il tempo di pensare: preventivo valido 3 mesi</p>
          </div>
        </div>
        <div className="lg:col-span-5 text-slate-800">
          <ContactForm initialService="test_acqua" />
        </div>
      </section>
    </div>
  );
}
