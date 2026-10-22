import type { Metadata } from 'next';
import { Phone, Check, Star, ChevronDown } from 'lucide-react';
import { BarraContatti, FinestraModulo, PulsanteModulo, MESSAGGIO_WHATSAPP } from '../../components/ModuloSopralluogo';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import { CONTACT, OG_DEFAULTS, telHref, whatsappHref } from '../../lib/siteConfig';
import { REVIEW_RATING_TESTO, REVIEW_TOTAL } from '../../lib/reviews';

// Pagina d'arrivo degli annunci Google (14 ott 2026). Con gli annunci sulla home
// e su /prezzi-depuratori, 547 clic in 28 giorni avevano dato 2 contatti: pagine
// fatte per leggere, non per chiedere il sopralluogo. Qui una cosa sola: in alto
// la risposta a chi cerca "depuratore acqua prezzi" / "quanto costa", subito il
// modulo corto e i pulsanti Chiama e WhatsApp, poi solo i motivi per fidarsi.
//
// Ci arriva solo chi clicca l'annuncio: noindex, fuori da ROUTES e dalla
// sitemap, nessun link verso il resto del sito (solo le pagine legali). Menu e
// piè di pagina del sito li nasconde lo <style> qui sotto, senza toccare il
// layout. Prezzi, garanzia, rate e validità del preventivo sono quelli già
// pubblicati su /prezzi-depuratori: se cambiano là, vanno cambiati anche qui.
export const metadata: Metadata = {
  title: "Depuratore d'acqua installato da 400 € | Acquadirete",
  description:
    'Depuratori a Firenze, Prato e Pistoia installati da 400 €. Sopralluogo gratuito, 10 anni di garanzia (esclusi i consumabili), anche a rate a tasso zero.',
  alternates: { canonical: '/sopralluogo-gratuito' },
  openGraph: { ...OG_DEFAULTS, url: '/sopralluogo-gratuito' },
  robots: { index: false, follow: false },
};

const PUNTI = [
  'Sopralluogo gratuito in 10 minuti',
  'Installazione compresa, fatta da noi',
  '10 anni di garanzia (esclusi i consumabili)',
  'Anche a rate a tasso zero',
];

const PREZZI = [
  { titolo: 'Impianto installato', cifra: 'da 400 € a 4.000 €', testo: "Dipende dall'impianto: carboni attivi o osmosi inversa, acqua fredda o frizzante, rubinetto a più vie." },
  { titolo: 'Manutenzione', cifra: 'da 60 €', testo: 'Cambio filtri e controllo. Ti avvisiamo noi quando è il momento.' },
  { titolo: 'Preventivo', cifra: 'gratis, valido 3 mesi', testo: 'Nessun impegno: hai tutto il tempo di confrontarlo con altri.' },
];

const PASSI = [
  { titolo: 'Ci lasci il numero', testo: 'Ti richiamiamo noi e fissiamo un giorno che va bene a te.' },
  { titolo: "Veniamo a provare l'acqua", testo: 'In una decina di minuti guardiamo la tua acqua e lo spazio in cucina, e ti diciamo cosa ti serve davvero. Anche quando basta il più semplice.' },
  { titolo: 'Ti lasciamo il preventivo', testo: 'Con le voci principali scritte, valido 3 mesi. Decidi con calma.' },
];

// Tre recensioni vere da lib/google-reviews.json. Dove sono accorciate c'è […]:
// le parole che restano sono quelle del cliente, senza ritocchi.
const RECENSIONI = [
  { autore: 'Mino M.', testo: '[…] Stefano si è dimostrato preparato e disponibile. La comparazione con altri rivenditori è risultata la più favorevole, considerando la garanzia e gli altri vantaggi che ho trovato. Consigliato!' },
  { autore: 'Simone B.', testo: "Dopo oltre due anni dall'installazione devo dire che l'unica cosa di cui mi pento è di non averlo acquistato prima. Stefano e Matteo hanno una grande professionalità e una grande simpatia. […]" },
  { autore: 'Elisa B.', testo: 'Stefano molto disponibile e professionale. Ha saputo consigliarmi il prodotto giusto capendo fin da subito le esigenze! Consigliatissimo!' },
];

// Le stesse risposte di /prezzi-depuratori.
const DOMANDE = [
  {
    q: 'Perché una forbice così larga, da 400 a 4.000 €?',
    a: "Perché dentro ci sono impianti molto diversi: un filtro a carboni attivi sotto il lavello non è un'osmosi inversa con acqua fredda e frizzante e un rubinetto a 5 vie. Col sopralluogo gratuito guardiamo la tua acqua e ti diciamo quale ti serve davvero, anche quando basta il più semplice.",
  },
  {
    q: 'Perché costa più di quelli che vedo nei negozi o online?',
    a: "Perché nella scatola c'è solo l'impianto. Da noi c'è anche chi viene prima a guardare la tua acqua, chi lo installa e lo tara, chi ti avvisa quando vanno cambiati i filtri. E se si rompe, abbiamo i ricambi e sappiamo aggiustarlo: non devi rispedire niente a nessuno. In più, 10 anni di garanzia (esclusi i consumabili).",
  },
  {
    q: 'E i depuratori «gratis»?',
    a: "Non spendere nulla all'inizio è comodo, ma quasi sempre, somma dopo somma, costa di più di un acquisto, ti lega per anni e alla fine l'impianto spesso non è tuo. Se non vuoi pagare tutto subito, noi rateizziamo a tasso zero: a fine pagamento l'impianto è tuo.",
  },
];

function Stelle() {
  return (
    <span className="inline-flex text-amber-400" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={16} fill="currentColor" strokeWidth={0} />)}
    </span>
  );
}

function PulsantiContatto({ chiaro = false }: { chiaro?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <a
        href={telHref()}
        className={`whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl font-bold px-5 py-3.5 border ${chiaro ? 'bg-white text-blue-900 border-white' : 'bg-blue-900 text-white border-blue-900'}`}
      >
        <Phone size={18} /> Chiama {CONTACT.phoneDisplay}
      </a>
      <a
        href={whatsappHref(MESSAGGIO_WHATSAPP)}
        target="_blank"
        rel="noopener noreferrer"
        className="whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl font-bold px-5 py-3.5 bg-[#25D366] text-white"
      >
        <WhatsAppIcon size={18} /> Scrivici su WhatsApp
      </a>
    </div>
  );
}

export default function SopralluogoGratuitoPage() {
  return (
    <div className="pb-20 md:pb-0">
      {/* Menu e piè di pagina del sito: qui non servono (vedi sopra). */}
      <style>{'#site-header,#site-footer{display:none!important}'}</style>

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          {/* Il logo come nella testata del sito, ma senza link: da qui non si va altrove. */}
          <span className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-header.png" alt="" width={188} height={120} className="h-8 sm:h-10 w-auto" />
            <span className="text-lg sm:text-xl font-bold tracking-tight leading-none">
              <span className="text-[#2196e3]">Acqua</span><span className="text-[#16306e]">direte</span>
            </span>
          </span>
          <a href={telHref()} className="inline-flex items-center gap-2 font-bold text-blue-900">
            <Phone size={17} /> <span className="hidden sm:inline">{CONTACT.phoneDisplay}</span><span className="sm:hidden">Chiama</span>
          </a>
        </div>
      </header>

      {/* In alto: la risposta a chi ha cercato il prezzo e il pulsante.
          Il 95% arriva dal telefono (Matteo, 22 ott 2026): titolo, i quattro
          punti, le stelle e subito il pulsante che apre il modulo, tutto senza
          scorrere. Il modulo aperto nella pagina spingeva giù tutto il resto. */}
      <section className="bg-gradient-to-br from-blue-200 via-blue-100 to-slate-50 px-4 sm:px-6 pt-5 pb-8 md:pt-14 md:pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs md:text-sm font-bold uppercase tracking-widest text-blue-700">Firenze · Prato · Pistoia</p>
          <h1 className="mt-1.5 md:mt-2 text-[1.75rem] md:text-5xl font-bold text-blue-950 tracking-tight leading-tight text-balance">
            Il depuratore d&apos;acqua installato a casa tua, da 400 €
          </h1>
          <p className="hidden md:block mt-4 text-lg text-slate-700 leading-relaxed">
            Veniamo noi a provare l&apos;acqua del tuo rubinetto e ti diciamo quale impianto ti serve e quanto costa.
          </p>
          <ul className="mt-4 md:mt-5 space-y-2">
            {PUNTI.map((p) => (
              <li key={p} className="flex items-center gap-2.5 text-slate-800 font-medium">
                <span className="bg-emerald-500 text-white rounded-full p-0.5 shrink-0"><Check size={14} strokeWidth={3} /></span>
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-4 md:mt-5 flex flex-wrap items-center gap-x-2 text-sm md:text-base text-slate-700">
            <Stelle /> <strong className="text-slate-900">{REVIEW_RATING_TESTO} su Google</strong> · {REVIEW_TOTAL} recensioni<span className="hidden sm:inline"> · dal 2005</span>
          </p>
          <div className="mt-5 md:mt-7 flex flex-col md:flex-row md:flex-wrap gap-3">
            <PulsanteModulo className="w-full md:w-auto whitespace-nowrap inline-flex items-center justify-center gap-2 rounded-xl bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold text-lg px-6 py-4 shadow-md">
              Richiedi il sopralluogo gratuito
            </PulsanteModulo>
            <div className="hidden md:block">
              <PulsantiContatto />
            </div>
          </div>
          <p className="mt-2.5 text-sm text-slate-600 text-center md:text-left">Lasci il numero, ti richiamiamo noi. Nessun impegno.</p>
        </div>
      </section>

      {/* I prezzi, scritti prima. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-950 tracking-tight">Prezzi chiari, scritti prima</h2>
          <p className="mt-2 text-slate-600">Il prezzo esatto per casa tua te lo diamo col sopralluogo. Queste sono le cifre vere.</p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {PREZZI.map((p) => (
              <div key={p.titolo} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">{p.titolo}</p>
                <p className="mt-1 text-2xl font-bold text-blue-950">{p.cifra}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.testo}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-slate-700">
            <strong>Niente contratti «gratis»</strong>: l&apos;impianto lo compri, anche a rate a tasso zero, e resta tuo.
          </p>
        </div>
      </section>

      {/* Come funziona. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-950 tracking-tight">Come funziona</h2>
          <ol className="mt-6 grid md:grid-cols-3 gap-4">
            {PASSI.map((p, i) => (
              <li key={p.titolo} className="rounded-2xl bg-white border border-slate-200 p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-900 text-white font-bold">{i + 1}</span>
                <p className="mt-3 font-bold text-lg text-blue-950">{p.titolo}</p>
                <p className="mt-1 text-slate-600 leading-relaxed">{p.testo}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Chi siamo e cosa installiamo: foto vere. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          <figure>
            <img src="/assets/hero-osmosi-reale.webp" alt="Un depuratore installato sotto lo zoccolo della cucina e uno sotto il lavello" width={1800} height={1200} loading="lazy" className="w-full h-auto rounded-2xl" />
            <figcaption className="mt-3 text-slate-700">Lo installiamo noi, <strong>sotto il lavello o sotto lo zoccolo</strong> della cucina.</figcaption>
          </figure>
          <figure>
            <img src="/assets/hero-assistenza-team.webp" alt="Stefano e Matteo di Acquadirete" width={900} height={900} loading="lazy" className="w-full aspect-[5/3] rounded-2xl object-cover object-[50%_8%]" />
            <figcaption className="mt-3 text-slate-700"><strong>Stefano e Matteo.</strong> Siamo noi che rispondiamo al telefono, veniamo a casa tua e installiamo. Dal 2005, niente agenti e niente call center.</figcaption>
          </figure>
        </div>
      </section>

      {/* Recensioni. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-950 tracking-tight">Cosa dicono i clienti</h2>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-slate-700"><Stelle /> {REVIEW_RATING_TESTO} su Google, {REVIEW_TOTAL} recensioni</p>
          <div className="mt-6 grid md:grid-cols-3 gap-4">
            {RECENSIONI.map((r) => (
              <blockquote key={r.autore} className="rounded-2xl bg-white border border-slate-200 p-5">
                <Stelle />
                <p className="mt-2 text-slate-700 leading-relaxed">&ldquo;{r.testo}&rdquo;</p>
                <footer className="mt-3 text-sm font-bold text-slate-900">{r.autore}</footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Domande sui prezzi. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-blue-950 tracking-tight">Domande sui prezzi</h2>
          <div className="mt-6 space-y-3">
            {DOMANDE.map((d) => (
              <details key={d.q} className="group rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-bold text-blue-950">
                  {d.q}
                  <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-slate-700 leading-relaxed">{d.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* In fondo: di nuovo il modo di contattarci. */}
      <section className="px-4 sm:px-6 py-12 md:py-16 bg-blue-950 text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Il prezzo esatto per casa tua</h2>
          <p className="mt-3 text-blue-100">Veniamo noi, proviamo l&apos;acqua del tuo rubinetto e ti lasciamo un preventivo valido 3 mesi. Gratis e senza impegno.</p>
          <PulsanteModulo className="mt-6 inline-flex items-center justify-center rounded-xl bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold px-6 py-4">
            Richiedi il sopralluogo gratuito
          </PulsanteModulo>
          {/* Sul telefono Chiama e WhatsApp sono già nella barra fissa in basso. */}
          <div className="mt-4 hidden md:flex justify-center">
            <PulsantiContatto chiaro />
          </div>
        </div>
      </section>

      <footer className="px-4 sm:px-6 py-6 bg-white text-center text-xs text-slate-500">
        {CONTACT.companyName} · P.IVA {CONTACT.vat} · {CONTACT.addressLine}, Montespertoli (FI)
        <br />
        <a href="/privacy-policy" className="underline">Privacy</a> · <a href="/cookie-policy" className="underline">Cookie</a> · <a href="/note-legali" className="underline">Note legali</a>
      </footer>

      <BarraContatti />
      <FinestraModulo />
    </div>
  );
}
