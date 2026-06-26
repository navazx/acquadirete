'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Phone, Check, ShieldCheck, ChevronRight } from 'lucide-react';
import ContactForm from './ContactForm';
import ReviewList from './ReviewList';
import { useModal } from './ModalProvider';
import { SERVICES_INFO } from '../lib/data';
import { CONTACT, telHref, SITE_URL } from '../lib/siteConfig';
import { ROUTES, PAGE_BREADCRUMB } from '../lib/routes';
import { BLOG_POSTS } from '../lib/blogPosts';
import { ServicePageId } from '../lib/types';

// Servizi correlati mostrati in fondo alle FAQ: rinforzano il collegamento
// interno tra pagine con contenuto affine (es. carboni attivi <-> osmosi).
const RELATED_SERVICES: Record<ServicePageId, ServicePageId[]> = {
  carboni: ['osmosi', 'depuratore'],
  osmosi: ['carboni', 'depuratore'],
  depuratore: ['prato', 'pistoia'],
  prato: ['pistoia', 'depuratore'],
  pistoia: ['depuratore', 'prato'],
  business: ['frizzante', 'assistenza'],
  frizzante: ['business', 'depuratore'],
  assistenza: ['depuratore', 'carboni'],
};

// Articoli del blog più pertinenti per pagina (max 2, scelti a mano per
// rilevanza — non tutti i match di relatedServices, per non affollare).
const BLOG_LINKS: Partial<Record<ServicePageId, string[]>> = {
  depuratore: ['depuratore-acqua-gratis-contratti', 'noleggio-vs-acquisto-depuratore'],
  prato: ['depuratore-acqua-gratis-contratti', 'noleggio-vs-acquisto-depuratore'],
  pistoia: ['depuratore-acqua-gratis-contratti', 'noleggio-vs-acquisto-depuratore'],
  osmosi: ['carboni-attivi-vs-osmosi-inversa', 'osmosi-inversa-fa-male'],
  carboni: ['carboni-attivi-vs-osmosi-inversa', 'osmosi-inversa-fa-male'],
  assistenza: ['installatore-depuratore-scomparso-cosa-fare', 'depuratore-acqua-gratis-contratti'],
  business: ['noleggio-vs-acquisto-depuratore', 'quanto-costa-depuratore-osmosi-inversa'],
};

export default function ServicePageView({ serviceId }: { serviceId: ServicePageId }) {
  const { openModal } = useModal();
  const [activeServiceFaq, setActiveServiceFaq] = useState<number | null>(null);
  const serviceInfo = SERVICES_INFO[serviceId];

  // Dati strutturati: FAQ (rich result) + breadcrumb della pagina.
  const faqSchema = serviceInfo.faqs && serviceInfo.faqs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: serviceInfo.faqs.map((f) => ({
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
      { '@type': 'ListItem', position: 2, name: PAGE_BREADCRUMB[serviceId], item: `${SITE_URL}${ROUTES[serviceId]}` },
    ],
  };

  return (
    <div id="service-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      {/* Custom Breadcrumb */}
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <Link href={ROUTES.home} title="Torna alla home" className="hover:text-blue-600 cursor-pointer">Home</Link>
        <ChevronRight size={10} className="text-slate-400" />
        <span className="text-blue-600">{PAGE_BREADCRUMB[serviceId]}</span>
      </div>

      {/* Service Header Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-5">
          <span className="inline-block bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-blue-500/20">
            Servizi Acquadirete · Firenze, Prato e Pistoia
          </span>
          <h1 className="text-3xl md:text-4xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight pt-1">
            {serviceInfo.title}
          </h1>
          <p className="text-base font-semibold text-slate-800 leading-relaxed">
            {serviceInfo.subtitle}
          </p>
          <div className="space-y-3">
            {serviceInfo.problem.map((para, idx) => (
              <p key={idx} className="text-xs text-slate-500 leading-relaxed">
                {para}
              </p>
            ))}
          </div>
        </div>
        <div className="lg:col-span-5 relative">
          <div className="overflow-hidden rounded-xl aspect-video lg:aspect-square bg-slate-100 border border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={serviceInfo.heroImage}
              alt={serviceInfo.title}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="object-cover w-full h-full hover:scale-105 duration-500 transition-all cursor-crosshair"
              referrerPolicy="no-referrer"
            />
          </div>
          {/* Floating badge for trust */}
          <div className="absolute -bottom-4 -left-4 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2.5 max-w-xs">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <div className="text-[10px]">
              <p className="font-bold text-slate-900 uppercase tracking-wider leading-none">Dal 2005 sul territorio</p>
              <p className="text-slate-500 mt-1 leading-tight">Centinaia di impianti tra Firenze, Prato e Pistoia.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Specific features list */}
      <div className="bg-slate-50 p-6 md:p-10 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wide">{serviceInfo.benefitsTitle}</h2>
          <div className="space-y-3 pt-1">
            {serviceInfo.benefits.map((benefit, idx) => (
              <div key={idx} className="flex gap-2 text-xs text-slate-700 leading-relaxed font-semibold">
                <Check size={14} className="text-blue-600 shrink-0 mt-0.5" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>
          {serviceInfo.note && (
            <div className="mt-4 bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5">{serviceInfo.note.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{serviceInfo.note.body}</p>
            </div>
          )}
        </div>

        {/* Inline micro contact box customized for the specific page */}
        <div className="flex flex-col justify-between bg-white p-6 rounded-lg border border-slate-200">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[11px]">Pronto per iniziare?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Richiedi ora un sopralluogo gratuito: veniamo da te, valutiamo la tua acqua e ti diciamo come stanno le cose. Decidi tu, senza nessuna pressione.
            </p>
            <a
              href={telHref()}
              title="Chiamaci al telefono"
              className="bg-slate-50 p-3.5 rounded-lg flex items-center gap-2.5 border border-slate-150 hover:border-blue-300 transition-colors"
            >
              <Phone size={14} className="text-blue-500" />
              <span className="text-xs text-slate-700">Parla direttamente con noi: <strong className="font-bold">{CONTACT.phoneDisplay}</strong></span>
            </a>
          </div>
          <button
            onClick={openModal}
            className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-[10px] uppercase tracking-widest rounded-lg cursor-pointer"
          >
            {serviceInfo.ctaLabel}
          </button>
        </div>
      </div>

      {/* Blocco SEO locale (testo unico con menzione della città) */}
      <div className="max-w-3xl mx-auto w-full space-y-4">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{serviceInfo.localSeo.heading}</h2>
        {serviceInfo.localSeo.body.map((para, idx) => (
          <p key={idx} className="text-sm text-slate-500 leading-relaxed">
            {para}
          </p>
        ))}
      </div>

      {/* FAQ specifiche della pagina */}
      {serviceInfo.faqs && serviceInfo.faqs.length > 0 && (
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Le domande che ci fanno più spesso</h2>
          </div>
          <div className="space-y-3">
            {serviceInfo.faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-lg border border-slate-200 hover:border-slate-300 p-4 shadow-sm cursor-pointer transition-all"
                onClick={() => setActiveServiceFaq(activeServiceFaq === index ? null : index)}
              >
                <div className="flex justify-between items-center font-bold text-xs uppercase tracking-wider text-slate-800">
                  <span>{faq.q}</span>
                  <span className="text-blue-600 text-base">{activeServiceFaq === index ? '−' : '+'}</span>
                </div>
                {activeServiceFaq === index && (
                  <p className="text-xs text-slate-500 leading-relaxed mt-3.5 pt-3.5 border-t border-slate-150 animate-in fade-in duration-200">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Servizi correlati: link interni contestuali */}
      <div className="max-w-3xl mx-auto w-full flex flex-wrap items-center gap-2.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Ti potrebbe interessare anche:</span>
        {RELATED_SERVICES[serviceId].map((relatedId) => (
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

      {/* Articoli del blog correlati */}
      {BLOG_LINKS[serviceId] && BLOG_LINKS[serviceId]!.length > 0 && (
        <div className="max-w-3xl mx-auto w-full flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Approfondisci sul blog:</span>
          {BLOG_LINKS[serviceId]!.map((slug) => {
            const post = BLOG_POSTS.find((p) => p.slug === slug);
            if (!post) return null;
            return (
              <Link
                key={slug}
                href={`/blog/${slug}`}
                title={post.title}
                className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 cursor-pointer"
              >
                {post.title}
              </Link>
            );
          })}
        </div>
      )}

      {/* Reviews widget directly visible on every service page */}
      <section className="border-t border-slate-200 pt-16">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Cosa ne pensa chi lo ha installato a Firenze?</h3>
            <p className="text-xs text-slate-500">Recensioni verificate degli utenti del territorio fiorentino.</p>
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

      {/* Brief custom form at the bottom of the page */}
      <section className="bg-slate-950 text-white rounded-xl p-6 md:p-10 border border-slate-800 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7 space-y-6">
          <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest block px-3 py-1.5 rounded-lg border border-blue-500/20 w-fit">
            Contatto Rapido
          </span>
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">Un'acqua pulita comincia da qui</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Siamo attivi in provincia di Firenze, Prato e Pistoia: Montespertoli, Empolese, Scandicci, Sesto Fiorentino, Bagno a Ripoli, Lastra a Signa e dintorni. Compila il modulo a fianco, veniamo da te a valutare la tua acqua.
          </p>
          <div className="space-y-2 text-xs font-semibold text-slate-200">
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> Sopralluogo gratuito e senza impegno</p>
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> 10 anni di garanzia sugli impianti (esclusi i consumabili)</p>
            <p className="flex items-center gap-2.5"><Check size={14} className="text-blue-400 shrink-0" /> Ti lasciamo il tempo di pensare: preventivo valido 3 mesi</p>
          </div>
        </div>
        <div className="lg:col-span-5 text-slate-800">
          <ContactForm initialService={serviceId === 'prato' ? 'depuratore' : serviceId} />
        </div>
      </section>

    </div>
  );
}
