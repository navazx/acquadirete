'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Check,
  ShieldCheck,
  Droplets,
  ThumbsUp,
  ChevronRight,
  Sparkles,
  Clock,
  MapPin,
  Award,
} from 'lucide-react';
import WaterCalc from './WaterCalc';
import { useModal } from './ModalProvider';
import { ROUTES } from '../lib/routes';
import { GOOGLE_PROFILE_URL, CONTACT } from '../lib/siteConfig';
import { REVIEWS } from '../lib/reviews';
import { Review } from '../lib/types';

// Le tre recensioni mostrate in home, scelte perché raccontano tre cose
// diverse: il venditore che non insiste, l'assistenza negli anni, la
// rapidità. Il testo NON si copia qui: si prende per id da
// lib/google-reviews.json, così resta una fonte sola.
const HOME_REVIEW_IDS = ['g7', 'g3', 'g2'];

export default function HomeView() {
  const { openModal } = useModal();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const homeReviews = HOME_REVIEW_IDS
    .map((id) => REVIEWS.find((r) => r.id === id))
    .filter((r): r is Review => Boolean(r));

  const faqs = [
    {
      q: "L'acqua a osmosi è troppo povera di minerali?",
      a: "I nostri impianti regolano il contenuto di sali minerali in base alle tue esigenze. Non è acqua \"morta\": è acqua leggera e sicura, come una buona oligominerale, ma senza microplastiche e senza bottiglie da portare a casa."
    },
    {
      q: "Spreca acqua?",
      a: "Gli impianti di oggi non sono quelli di vent'anni fa: lo scarto è ridotto al minimo."
    },
    {
      q: "E se si rompe?",
      a: "Interveniamo in pochi giorni e, se serve, ti lasciamo una macchina sostitutiva. Zero pensieri."
    }
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div id="home-view" className="space-y-20 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-200 via-blue-100 to-slate-50 text-slate-900 overflow-hidden py-16 md:py-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.8),transparent_65%)] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto space-y-6 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Depuratore acqua a Firenze:<br />
            <span className="text-blue-600">
              acqua buona dal rubinetto, per sempre.
            </span>
          </h1>

          <p className="text-base text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            Depuratori d'acqua installati e seguiti da chi conosce ogni famiglia che serve: acqua buona dal rubinetto, sempre disponibile. Dal <strong className="text-slate-900 font-bold">2005</strong>, centinaia di impianti in provincia di Firenze, Prato e Pistoia.
          </p>

          {/* Google certified stars badge */}
          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center pt-2">
            <a
              href={GOOGLE_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              title="Leggi le recensioni su Google"
              className="flex items-center gap-2.5 bg-white px-5 py-3.5 rounded-xl border border-slate-200 shadow-md hover:border-blue-400 transition-colors cursor-pointer"
            >
              <span className="text-amber-400 text-lg font-bold leading-none">★★★★★</span>
              <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">130+ Recensioni Google 5.0</span>
            </a>
            <div className="text-xs text-slate-600 text-center leading-relaxed">
              <strong className="text-slate-900 block font-bold uppercase tracking-wider text-[10px]">Assistenza locale, persone vere</strong>
              Interventi in pochi giorni e macchina sostitutiva in caso di guasto.
            </div>
          </div>

          {/* Fast CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <button
              onClick={openModal}
              className="bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold tracking-widest uppercase px-8 py-4 rounded-lg shadow-md transition-all duration-300 cursor-pointer text-xs"
            >
              Richiedi un Sopralluogo Gratuito
            </button>
          </div>
        </div>
      </section>

      {/* Chi siamo: la foto vera al posto della fascia di numeri.
          I quattro dati che c'erano (sopralluogo gratis, 10 anni di garanzia,
          dal 2005, 130+ recensioni) non sono persi: sono dentro al testo. */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 items-stretch">
          <div className="lg:col-span-5 bg-slate-100">
            {/* Su mobile la foto è ritagliata in alto (aspect-[4/3] + object-top):
                si tiene la parte con le facce e si taglia il pavimento in basso,
                che occupava schermo senza dire niente. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/hero-assistenza-team.webp"
              alt="Stefano e Matteo di Acquadirete nella loro officina"
              width={900}
              height={900}
              loading="eager"
              decoding="async"
              className="object-cover object-top w-full h-full aspect-[4/3] sm:aspect-square lg:aspect-auto lg:min-h-[380px]"
            />
          </div>
          <div className="lg:col-span-7 p-6 md:p-10 space-y-5">
            <span className="inline-block bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-md border border-blue-100">
              Chi viene a casa tua
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Siamo Stefano e Matteo.
            </h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                Acquadirete è un&apos;officina e due persone: <strong className="text-slate-900 font-semibold">Stefano</strong>, che ha iniziato nel 2005, e <strong className="text-slate-900 font-semibold">Matteo</strong>, suo figlio. Non abbiamo agenti, non abbiamo un call center: a casa tua veniamo noi due, e quando chiami rispondiamo noi due.
              </p>
              <p>
                Veniamo a vedere la tua acqua e a farti il preventivo <strong className="text-slate-900 font-semibold">gratis</strong>, sugli impianti diamo <strong className="text-slate-900 font-semibold">10 anni di garanzia</strong>, e su Google trovi{' '}
                <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noreferrer" title="Leggi le recensioni su Google" className="text-blue-600 font-semibold hover:underline cursor-pointer">
                  oltre 130 recensioni a 5 stelle
                </a>{' '}
                lasciate dalle famiglie e dalle attività che seguiamo tra Firenze, Prato e Pistoia.
              </p>
            </div>
            <button
              onClick={openModal}
              className="bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold tracking-widest uppercase px-6 py-3.5 rounded-lg shadow-sm transition-colors cursor-pointer text-xs"
            >
              Fissa il sopralluogo gratuito
            </button>
          </div>
        </div>
      </section>

      {/* Local Social Proof & Highlights */}
      <section className="bg-blue-50 text-slate-900 py-16 px-4 sm:px-6 lg:px-8 rounded-xl max-w-7xl mx-auto border border-slate-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#0f6cbd_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto space-y-10 relative z-10">
          <div className="text-center space-y-5">
            <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-md border border-blue-200">
              Perché Fidarsi di Noi
            </span>
            <h2 className="text-3xl md:text-3xl font-bold tracking-tight">
              Comprare un depuratore oggi è un campo minato.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Telefonate insistenti, &laquo;depuratori gratis&raquo; che gratis non sono, contratti firmati in salotto con la pressione del venditore. Noi siamo in due, <strong className="text-slate-900 font-semibold">Stefano e Matteo</strong>, e lavoriamo all&apos;opposto: veniamo a casa tua, proviamo l&apos;acqua del tuo rubinetto e ti diciamo come stanno le cose — anche se la risposta è che non ti serve niente. Poi ti lasciamo il tempo di pensare: il preventivo vale 3 mesi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-blue-600 p-6 rounded-lg border border-blue-500 space-y-2">
              <Award className="text-white mb-1" size={22} />
              <h3 className="text-base font-bold text-white">10 Anni di Garanzia</h3>
              <p className="text-xs text-blue-50 leading-relaxed">
                <strong className="text-white">10 anni di garanzia</strong> sui nostri impianti (esclusi i consumabili). Se in questi dieci anni qualcosa non va, veniamo a sistemarlo noi: non ti giriamo a un numero verde.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <ThumbsUp className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Consulenza Onesta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Niente agenti, niente canoni che non finiscono mai. Ti proponiamo solo quello che ti serve, con due prezzi scritti: quanto costa l&apos;impianto e quanto costa mantenerlo negli anni. Dopo aver provato l&apos;acqua a casa tua, non prima.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <ShieldCheck className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Non resti mai senz'acqua</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Se si guasta veniamo in pochi giorni, non in settimane. E se serve tempo per ripararlo ti lasciamo una macchina sostitutiva: non ti facciamo tornare alle bottiglie.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <MapPin className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Una persona, non un call center</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Al <strong className="text-slate-900 font-semibold">{CONTACT.phoneDisplay}</strong> risponde Stefano, sempre lo stesso numero dal 2005. Centinaia di impianti tra Firenze, Prato e Pistoia e oltre 130 recensioni a 5 stelle su Google.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Recensioni vere: le parole dei clienti subito dopo le nostre promesse */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Non crederci sulla parola: leggi la loro.
          </h2>
          <p className="text-sm text-slate-600">
            Tre recensioni fra le oltre 130 che i nostri clienti hanno lasciato su Google, tutte a 5 stelle.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {homeReviews.map((review) => (
            <figure
              key={review.id}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-4"
            >
              <div className="text-amber-400 text-sm font-bold tracking-widest" aria-label={`${review.rating} stelle su 5`}>
                ★★★★★
              </div>
              <blockquote className="text-sm text-slate-700 leading-relaxed flex-1">
                &laquo;{review.text}&raquo;
              </blockquote>
              <figcaption className="text-xs text-slate-500 border-t border-slate-150 pt-3">
                <span className="block font-bold text-slate-900">{review.author}</span>
                {review.date} · recensione Google verificata
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="text-center">
          <a
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            title="Leggi le recensioni su Google"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            Leggile tutte sul profilo Google →
          </a>
        </div>
      </section>

      {/* Core Services Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
            Depuratori con acqua refrigerata e gassata, anche per piccoli spazi
          </h2>
          <p className="text-xs text-slate-500 max-w-xl mx-auto leading-relaxed">
            Scegli la categoria adatta alle tue necessità. Installiamo solo sistemi certificati di altissima qualità tecnologica progettati per durare a lungo.
          </p>
        </div>

        {/* Services Row Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Domestico */}
          <div className="bg-white rounded-xl border border-slate-250 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-600 p-3.5 rounded-lg w-fit">
                <Droplets size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Carboni Attivi</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Microfiltrazione che elimina cloro, odori e cattivi sapori mantenendo i minerali naturali dell'acqua. Semplice, senza scarto d'acqua.
              </p>
              <ul className="text-xs text-slate-600 font-medium space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0 font-bold" /> Mantiene i minerali</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0 font-bold" /> Soluzione economica</li>
              </ul>
            </div>
            <Link
              href={ROUTES.carboni}
              title="Scopri i depuratori a carboni attivi"
              className="mt-6 w-full py-3 rounded-lg border border-slate-200 hover:border-blue-600 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Scopri Dettagli</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* Card 2: Osmosi Inversa */}
          <div className="bg-white rounded-xl border border-slate-250 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-600 p-3.5 rounded-lg w-fit">
                <Sparkles size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Osmosi Inversa</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                La tecnologia di purificazione molecolare definitiva. Regolazione del residuo fisso per avere un'acqua oligominerale ultra leggera.
              </p>
              <ul className="text-xs text-slate-600 font-medium space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0 font-bold" /> Ideale per neonati</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0 font-bold" /> Perfetta per cucinare</li>
              </ul>
            </div>
            <Link
              href={ROUTES.osmosi}
              title="Scopri come funziona l'osmosi inversa"
              className="mt-6 w-full py-3 rounded-lg border border-slate-200 hover:border-blue-600 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Osmosi Spiegata</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* Card 3: Uffici e Ristoranti */}
          <div className="bg-white rounded-xl border border-slate-250 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-600 p-3.5 rounded-lg w-fit">
                <Clock size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Uffici e Ristoranti</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Acqua microfiltrata, liscia o frizzante, dalla tua rete per uffici, bar e ristoranti. Stop a ordini, casse e vuoti da gestire.
              </p>
              <ul className="text-xs text-slate-600 font-medium space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0" /> Niente più boccioni e casse</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0" /> Liscia o frizzante al tavolo</li>
              </ul>
            </div>
            <Link
              href={ROUTES.business}
              title="Scopri le soluzioni per uffici e ristoranti"
              className="mt-6 w-full py-3 rounded-lg border border-slate-200 hover:border-blue-600 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Soluzioni Business</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* Card 4: Assistenza e manutenzione */}
          <div className="bg-white rounded-xl border border-slate-250 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="bg-blue-50 text-blue-600 p-3.5 rounded-lg w-fit">
                <ShieldCheck size={22} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Assistenza &amp; Filtri</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sostituzione filtri, sanificazione e riparazioni, anche per impianti di altre marche a Firenze, Prato e Pistoia.
              </p>
              <ul className="text-xs text-slate-600 font-medium space-y-1.5 pt-2">
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0" /> Assistenza in pochi giorni</li>
                <li className="flex items-center gap-1.5"><Check size={12} className="text-blue-500 shrink-0" /> Macchina sostitutiva</li>
              </ul>
            </div>
            <Link
              href={ROUTES.assistenza}
              title="Scopri il servizio di assistenza e manutenzione"
              className="mt-6 w-full py-3 rounded-lg border border-slate-200 hover:border-blue-600 text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Servizio Assistenza</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* Calculator Call-out Section */}
      <section id="calc-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <WaterCalc />
      </section>

      {/* FAQ Interactive Accordion */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Domande Frequenti (FAQ)</h2>
          <p className="text-xs text-slate-500">Le domande che ci fanno più spesso sull'acqua a osmosi inversa.</p>
        </div>

        <div className="space-y-3" id="news-faq-list">
          {faqs.map((faq, index) => (
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
      </section>

      {/* Inline contact review hook page */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-50 rounded-xl p-8 border border-slate-200">
        <div className="lg:col-span-8 space-y-4">
          <h3 className="text-2xl font-bold text-slate-950">Vuoi leggere cosa dicono i nostri clienti?</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Abbiamo installato i nostri impianti in centinaia di abitazioni, studi professionali e appartamenti nel centro storico e in periferia. Sfoglia tutte le recensioni certificate su Google Maps.
          </p>
          <div className="flex gap-2">
            <Link
              href={ROUTES.recensioni}
              title="Leggi tutte le recensioni certificate"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest px-5 py-3 rounded-lg shadow-sm cursor-pointer inline-block"
            >
              Leggi Tutte le Recensioni
            </Link>
          </div>
        </div>
        <a
          href={GOOGLE_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          title="Leggi le recensioni su Google"
          className="block lg:col-span-4 bg-white p-5 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all text-center cursor-pointer"
        >
          <div className="text-amber-500 text-xl font-bold mb-1">★★★★★</div>
          <p className="text-xs text-slate-800 font-bold uppercase tracking-wider">130+ Recensioni Eccellenti</p>
          <p className="text-xs text-slate-500 mt-1">Nessun punteggio inferiore a 5 stelle a testimonianza dell'amore per l'acqua pura e l'assistenza locale.</p>
        </a>
      </section>
    </div>
  );
}
