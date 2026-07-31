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
import { GOOGLE_PROFILE_URL } from '../lib/siteConfig';

export default function HomeView() {
  const { openModal } = useModal();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

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
              className="flex items-center gap-1.5 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors cursor-pointer"
            >
              <span className="text-amber-400 text-xs font-bold">★★★★★</span>
              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">130+ Recensioni Google 5.0</span>
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
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest uppercase px-8 py-4 rounded-lg shadow-md transition-all duration-300 cursor-pointer text-xs"
            >
              Richiedi un Sopralluogo Gratuito
            </button>
          </div>
        </div>
      </section>

      {/* Local credentials and trust badge */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white py-8 px-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-150">
          <div className="pt-4 md:pt-0">
            <p className="text-3xl font-black text-blue-900 font-mono">0€</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sopralluogo &amp; Test</p>
          </div>
          <div className="pt-4 md:pt-0">
            <p className="text-3xl font-black text-blue-900 font-mono">10</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Anni di Garanzia</p>
          </div>
          <div className="pt-4 md:pt-0">
            <p className="text-3xl font-black text-blue-900 font-mono">2005</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Sul Territorio Dal</p>
          </div>
          <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noreferrer" title="Leggi le recensioni su Google" className="block pt-4 md:pt-0 border-b border-slate-150 md:border-b-0 hover:opacity-80 transition-opacity cursor-pointer">
            <p className="text-3xl font-black text-blue-900 font-mono">130+</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Recensioni 5 Stelle</p>
          </a>
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
              Comprare un depuratore oggi è un campo minato. Noi lavoriamo all'opposto.
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Telefonate insistenti, "depuratori gratis" che gratis non sono, contratti firmati in salotto con la pressione del venditore. Noi veniamo a casa tua, valutiamo cosa ti serve davvero, e ti lasciamo il tempo di pensare: il nostro preventivo di spesa vale per 3 mesi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
            <div className="bg-blue-600 p-6 rounded-lg border border-blue-500 space-y-2">
              <Award className="text-white mb-1" size={22} />
              <h3 className="text-base font-bold text-white">10 Anni di Garanzia</h3>
              <p className="text-xs text-blue-50 leading-relaxed">
                Diamo <strong className="text-white">10 anni di garanzia</strong> sui nostri impianti (esclusi i consumabili): acquisti con la certezza di un prodotto che dura.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <ThumbsUp className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Consulenza Onesta</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Niente agenti aggressivi o contratti capestro con canoni insostenibili. Proponiamo solo ciò che ti serve, con prezzo chiaro di acquisto e manutenzione, dopo aver analizzato l'acqua a casa tua.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <ShieldCheck className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Non resti mai senz'acqua</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assistenza in pochi giorni, non in settimane. E se l'impianto si guasta, ti lasciamo una macchina sostitutiva: zero pensieri.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-2">
              <MapPin className="text-blue-500 mb-1" size={22} />
              <h3 className="text-base font-bold text-slate-900">Una persona, non un call center</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dal 2005 sul territorio: una persona che risponde e che conosci. Centinaia di impianti installati, con oltre 130 recensioni a 5 stelle su Google.
              </p>
            </div>
          </div>
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
