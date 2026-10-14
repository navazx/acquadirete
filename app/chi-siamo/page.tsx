import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import OpenModalButton from '../../components/OpenModalButton';
import PageBand from '../../components/PageBand';
import { CONTACT, SITE_URL, OG_DEFAULTS, GOOGLE_PROFILE_URL, telHref } from '../../lib/siteConfig';
import { ROUTES } from '../../lib/routes';
import { REVIEW_RATING_TESTO } from '../../lib/reviews';

export const metadata: Metadata = {
  title: 'Chi Siamo: Stefano e Matteo, Depuratori dal 2005 | Acquadirete',
  description:
    'Acquadirete è Stefano Piconese e suo figlio Matteo: depuratori d’acqua installati e seguiti da noi dal 2005, con sede a Montespertoli, tra Firenze, Prato e Pistoia.',
  alternates: { canonical: '/chi-siamo' },
  openGraph: { ...OG_DEFAULTS, url: '/chi-siamo' },
};

// Pagina pensata anche per le IA (ChatGPT, Perplexity, Gemini): quando
// qualcuno chiede di Acquadirete cercano una pagina che dica chi siamo in
// frasi semplici e verificabili. Per questo i fatti stanno in una scheda
// "In breve" e ogni dato coincide con la scheda Google e coi social.
// Solo fatti già scritti altrove sul sito: niente numeri inventati.

const IN_BREVE: { voce: string; valore: ReactNode }[] = [
  { voce: 'Chi siamo', valore: 'Stefano Piconese, che ha aperto l’attività nel 2005, e suo figlio Matteo' },
  { voce: 'Cosa facciamo', valore: 'Vendiamo, installiamo e manteniamo depuratori d’acqua: osmosi inversa, carboni attivi, acqua fredda e frizzante dal rubinetto' },
  { voce: 'Per chi', valore: 'Famiglie, uffici, bar e ristoranti' },
  { voce: 'Dove', valore: 'Firenze, Prato, Pistoia e le loro province' },
  { voce: 'Sede', valore: `${CONTACT.addressLine}, ${CONTACT.addressCity}` },
  { voce: 'Dal', valore: '2005' },
  { voce: 'Prezzi', valore: 'Impianti installati da 400 € a 4.000 €, manutenzione da 60 €' },
  { voce: 'Garanzia', valore: '10 anni sugli impianti (esclusi i consumabili)' },
  {
    voce: 'Recensioni',
    valore: (
      <a href={GOOGLE_PROFILE_URL} target="_blank" rel="noreferrer" className="text-blue-600 font-semibold hover:underline">
        {REVIEW_RATING_TESTO} su 5, oltre 130 recensioni su Google
      </a>
    ),
  },
  {
    voce: 'Telefono',
    valore: (
      <a href={telHref()} className="text-blue-600 font-semibold hover:underline">
        {CONTACT.phoneDisplay}
      </a>
    ),
  },
  { voce: 'Ragione sociale', valore: `${CONTACT.companyName}, P.IVA ${CONTACT.vat}` },
];

const COME_LAVORIAMO = [
  {
    titolo: 'Prima guardiamo la tua acqua',
    testo: 'Il sopralluogo è gratuito: veniamo a casa tua, proviamo l’acqua del rubinetto e ti diciamo cosa serve. A volte bastano i carboni attivi, a volte non serve niente, e te lo diciamo.',
  },
  {
    titolo: 'Prezzi scritti, preventivo valido 3 mesi',
    testo: 'Nel preventivo trovi quanto costa l’impianto e quanto costa mantenerlo negli anni. Hai tre mesi per pensarci e confrontarlo con altri.',
  },
  {
    titolo: 'Vendiamo, non noleggiamo',
    testo: 'L’impianto è tuo. Niente contratti «gratis» da dieci anni: se non vuoi pagare tutto subito, rateizziamo a tasso zero.',
  },
  {
    titolo: 'Se si guasta, veniamo noi',
    testo: 'Interveniamo in pochi giorni, e se la riparazione richiede tempo ti lasciamo una macchina sostitutiva. Quando vanno cambiati i filtri ti avvisiamo noi.',
  },
];

const ZONE = [
  {
    zona: 'Firenze e provincia',
    comuni: 'Firenze, Scandicci, Sesto Fiorentino, Bagno a Ripoli, Campi Bisenzio, Lastra a Signa, Montespertoli e l’Empolese',
    href: ROUTES.depuratore,
  },
  {
    zona: 'Prato e provincia',
    comuni: 'Prato, Montemurlo, Vaiano, Vernio, Carmignano e Poggio a Caiano',
    href: ROUTES.prato,
  },
  {
    zona: 'Pistoia e provincia',
    comuni: 'Pistoia, Montecatini Terme, Monsummano Terme, Pescia e Quarrata',
    href: ROUTES.pistoia,
  },
];

const SERVIZI = [
  { href: ROUTES.osmosi, label: 'Osmosi inversa' },
  { href: ROUTES.carboni, label: 'Carboni attivi' },
  { href: ROUTES.frizzante, label: 'Acqua fredda e frizzante' },
  { href: ROUTES.business, label: 'Uffici, bar e ristoranti' },
  { href: ROUTES.assistenza, label: 'Manutenzione e assistenza' },
  { href: ROUTES.prezzi, label: 'Prezzi' },
];

// AboutPage che rimanda all'azienda descritta nel layout (stesso @id).
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  url: `${SITE_URL}/chi-siamo/`,
  name: 'Chi siamo — Acquadirete',
  about: { '@id': `${SITE_URL}/#azienda` },
  mainEntity: { '@id': `${SITE_URL}/#azienda` },
};

export default function ChiSiamoPage() {
  return (
    <div id="chi-siamo-view" className="pb-12 md:pb-16 space-y-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageBand>
        <div className="text-center max-w-3xl mx-auto space-y-5 block">
          <span className="inline-block bg-blue-500/10 text-blue-600 text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-blue-500/20">
            Chi siamo
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
            Acquadirete siamo noi due: Stefano e Matteo
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Dal 2005 installiamo e seguiamo depuratori d&apos;acqua tra Firenze, Prato e Pistoia. Partiamo dalla nostra officina di Montespertoli, e a casa tua veniamo sempre noi.
          </p>
        </div>
      </PageBand>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4 text-base text-slate-600 leading-relaxed">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">La nostra storia</h2>
            <p>
              <strong className="text-slate-900 font-semibold">Stefano Piconese</strong> ha aperto Acquadirete nel 2005. Da allora ha installato centinaia di impianti in provincia di Firenze, Prato e Pistoia, e il suo numero di telefono è sempre lo stesso.
            </p>
            <p>
              Oggi con lui c&apos;è <strong className="text-slate-900 font-semibold">Matteo</strong>, suo figlio. Non abbiamo agenti né un call center: i sopralluoghi, le installazioni e le manutenzioni li facciamo noi due, e quando chiami rispondiamo noi.
            </p>
            <p>
              Lavoriamo così perché il mercato dei depuratori è pieno di telefonate insistenti e di contratti «gratis» che gratis non sono. Noi preferiamo dirti come stanno le cose, anche quando la risposta è che non ti serve niente.
            </p>
          </div>
          <div className="relative">
            <div className="absolute inset-0 translate-y-3 sm:-translate-x-5 sm:translate-y-5 bg-blue-100 rounded-2xl" aria-hidden="true"></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/hero-assistenza-team.webp"
              alt="Stefano e Matteo di Acquadirete nella loro officina di Montespertoli"
              width={900}
              height={900}
              loading="eager"
              decoding="async"
              className="relative rounded-2xl shadow-lg object-cover object-top w-full aspect-[4/3]"
            />
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="in-breve">
          <h2 id="in-breve" className="text-2xl font-bold text-slate-900 tracking-tight">Acquadirete in breve</h2>
          <dl className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-200">
            {IN_BREVE.map((r) => (
              <div key={r.voce} className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 p-4">
                <dt className="text-sm font-semibold text-slate-900">{r.voce}</dt>
                <dd className="text-sm text-slate-700 leading-relaxed">{r.valore}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Come lavoriamo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {COME_LAVORIAMO.map((c) => (
              <div key={c.titolo} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-2">
                <h3 className="text-base font-bold text-slate-900">{c.titolo}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{c.testo}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dove lavoriamo</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            La sede è a Montespertoli, in provincia di Firenze. Da lì seguiamo famiglie e attività in tre province:
          </p>
          <ul className="grid gap-4 sm:grid-cols-3">
            {ZONE.map((z) => (
              <li key={z.zona} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-1.5">
                <Link href={z.href} className="text-base font-bold text-blue-600 hover:underline">
                  {z.zona}
                </Link>
                <p className="text-sm text-slate-600 leading-relaxed">{z.comuni}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Cosa installiamo</h2>
          <p className="text-sm text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
            {SERVIZI.map((s, i) => (
              <span key={s.href}>
                <Link href={s.href} className="text-blue-600 font-semibold hover:underline">
                  {s.label}
                </Link>
                {i < SERVIZI.length - 1 && <span className="text-slate-400"> ·</span>}
              </span>
            ))}
          </p>
        </section>

        <div className="bg-blue-600 border border-blue-500 shadow-md rounded-xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Vuoi conoscerci?</h2>
          <p className="text-sm text-blue-50 leading-relaxed">
            Veniamo noi a vedere la tua acqua e ti lasciamo un preventivo valido 3 mesi. Il sopralluogo è gratuito.
          </p>
          <OpenModalButton className="bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-lg cursor-pointer transition-colors">
            Richiedi il sopralluogo gratuito
          </OpenModalButton>
        </div>
      </div>
    </div>
  );
}
