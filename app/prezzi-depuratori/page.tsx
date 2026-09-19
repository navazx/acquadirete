import type { Metadata } from 'next';
import Link from 'next/link';
import OpenModalButton from '../../components/OpenModalButton';
import PageBand from '../../components/PageBand';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Prezzi Depuratori Acqua: da 400 € Installato | Acquadirete',
  description:
    'Quanto costa un depuratore con Acquadirete: impianti installati da 400 € a 4.000 €, manutenzione da 60 €. E il confronto su 5 anni con noleggio e "gratis".',
  alternates: { canonical: '/prezzi-depuratori' },
  openGraph: { ...OG_DEFAULTS, url: '/prezzi-depuratori' },
};

// Cifre date da Stefano il 19 set 2026. Le colonne noleggio e "gratis" usano
// prezzi pubblici di concorrenti a Firenze (settembre 2026), senza nominarli.
const CONFRONTO = [
  {
    voce: 'Spesa iniziale',
    acquisto: 'Da 400 € a 4.000 €, installazione compresa. Anche a rate a tasso zero',
    noleggio: 'Spesso nessuna',
    gratis: 'Nessuna',
  },
  {
    voce: 'Negli anni',
    acquisto: 'Manutenzione da 60 €',
    noleggio: 'Canone da circa 25 € al mese (acqua naturale) o 39 € (frizzante)',
    gratis: 'Canone "da 1 € al giorno", cioè circa 30 € al mese',
  },
  {
    voce: 'In 5 anni, circa',
    acquisto: 'Da 700 € (impianto base più 5 manutenzioni)',
    noleggio: 'Da 1.500 € (naturale) a oltre 2.300 € (frizzante)',
    gratis: 'Circa 1.800 € e oltre',
  },
  {
    voce: 'Alla fine',
    acquisto: "L'impianto è tuo e scegli tu chi fa la manutenzione",
    noleggio: "L'impianto resta loro: o rinnovi, o lo restituisci",
    gratis: 'Dipende dal contratto: leggi durata e penali prima di firmare',
  },
];

const FAQ = [
  {
    q: 'Perché una forbice così larga, da 400 a 4.000 €?',
    a: "Perché dentro ci sono impianti molto diversi: un filtro a carboni attivi sotto il lavello non è un'osmosi inversa con acqua fredda e frizzante e un rubinetto a 5 vie. Col sopralluogo gratuito guardiamo la tua acqua e ti diciamo quale ti serve davvero, anche quando basta il più semplice.",
  },
  {
    q: 'Il noleggio non conviene mai?',
    a: "Per qualcuno può avere senso non spendere tutto subito. Ma quasi sempre, somma dopo somma, costa di più di un acquisto, e alla fine l'impianto non è tuo. Noi vendiamo e, se preferisci, rateizziamo a tasso zero: paghi a rate, e a fine pagamento l'impianto è tuo.",
  },
  {
    q: 'Il preventivo è vincolante?',
    a: 'No. È gratuito, senza impegno, e resta valido 3 mesi: hai tutto il tempo di confrontarlo con altri.',
  },
];

export default function PrezziPage() {
  return (
    <div id="prezzi-view" className="pb-12 md:pb-16 space-y-12">
      <PageBand>
        <div className="text-center max-w-3xl mx-auto space-y-5 block">
          <span className="inline-block bg-blue-500/10 text-blue-600 text-xs font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-blue-500/20">
            Prezzi chiari
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight text-balance">
            Quanto costa un depuratore, detto prima
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Quasi nessuno scrive i prezzi, e molti li nascondono dietro un &laquo;da 1 € al giorno&raquo;. Noi ti diciamo subito le cifre vere, e poi il prezzo esatto per casa tua col sopralluogo gratuito.
          </p>
        </div>
      </PageBand>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <section className="grid gap-4 sm:grid-cols-2" aria-label="I nostri prezzi">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Impianto installato</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">da 400 € a 4.000 €</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Installazione compresa, fatta da noi. Dipende dal tipo di impianto: carboni attivi o osmosi inversa, acqua a temperatura ambiente, fredda o frizzante, e il rubinetto a più vie.
            </p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Manutenzione</p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums">da 60 €</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Cambio filtri e controllo dell&apos;impianto. Ti avvisiamo noi quando è il momento, e la cifra la trovi già scritta nel preventivo.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Su 5 anni: acquisto, noleggio e &laquo;gratis&raquo; a confronto</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Le colonne del noleggio e del &laquo;gratis&raquo; usano prezzi che altre aziende pubblicano a Firenze. Sono indicativi, ma il punto si vede lo stesso: una cifra al mese sembra piccola, sommata per anni no.
          </p>
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full min-w-[640px] text-sm text-left">
              <thead className="bg-blue-50 text-slate-900">
                <tr>
                  <th scope="col" className="p-4 font-bold w-1/5"></th>
                  <th scope="col" className="p-4 font-bold">Acquisto da noi</th>
                  <th scope="col" className="p-4 font-bold">Noleggio tutto incluso</th>
                  <th scope="col" className="p-4 font-bold">Depuratore &laquo;gratis&raquo;</th>
                </tr>
              </thead>
              <tbody>
                {CONFRONTO.map((r) => (
                  <tr key={r.voce} className="border-t border-slate-200 align-top">
                    <th scope="row" className="p-4 font-semibold text-slate-900">{r.voce}</th>
                    <td className="p-4 text-slate-700">{r.acquisto}</td>
                    <td className="p-4 text-slate-700">{r.noleggio}</td>
                    <td className="p-4 text-slate-700">{r.gratis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Un&apos;avvertenza onesta: confronta sempre la stessa cosa. Un nostro impianto con acqua fredda e frizzante non si mette accanto a un noleggio di sola acqua naturale. Per confrontare due preventivi voce per voce trovi una guida qui:{' '}
            <Link href="/blog/domande-prima-contratto-depuratore/" className="text-blue-600 font-semibold hover:underline">
              le domande da fare prima di firmare
            </Link>
            .
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Domande sui prezzi</h2>
          <div className="space-y-3">
            {FAQ.map((f) => (
              <details key={f.q} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm group">
                <summary className="font-semibold text-slate-900 cursor-pointer">{f.q}</summary>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            Per approfondire:{' '}
            <Link href="/blog/noleggio-vs-acquisto-depuratore/" className="text-blue-600 font-semibold hover:underline">noleggio o acquisto</Link>
            {' · '}
            <Link href="/blog/depuratore-acqua-gratis-contratti/" className="text-blue-600 font-semibold hover:underline">come funzionano i contratti &laquo;gratis&raquo;</Link>
            {' · '}
            <Link href="/blog/quanto-costa-depuratore-osmosi-inversa/" className="text-blue-600 font-semibold hover:underline">quanto costa un&apos;osmosi inversa</Link>
          </p>
        </section>

        <div className="bg-blue-600 border border-blue-500 shadow-md rounded-xl p-6 md:p-8 text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Il prezzo esatto per casa tua</h2>
          <p className="text-sm text-blue-50 leading-relaxed">
            Veniamo noi, proviamo l&apos;acqua del tuo rubinetto e ti lasciamo un preventivo valido 3 mesi. Il sopralluogo è gratuito, tra Firenze, Prato e Pistoia.
          </p>
          <OpenModalButton className="bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold text-xs uppercase tracking-widest px-6 py-3.5 rounded-lg cursor-pointer transition-colors">
            Richiedi il sopralluogo gratuito
          </OpenModalButton>
        </div>
      </div>
    </div>
  );
}
