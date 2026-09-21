import type { Metadata } from 'next';
import Link from 'next/link';
import OpenModalButton from '../../components/OpenModalButton';
import PageBand from '../../components/PageBand';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Prezzi Depuratori Acqua: da 400 € Installato | Acquadirete',
  description:
    'Quanto costa un depuratore con Acquadirete: impianti installati da 400 € a 4.000 €, manutenzione da 60 €. E un esempio su 10 anni contro un contratto «gratis».',
  alternates: { canonical: '/prezzi-depuratori' },
  openGraph: { ...OG_DEFAULTS, url: '/prezzi-depuratori' },
};

// Esempio scelto da Matteo il 19 set 2026: osmosi base da 1.500 € con
// manutenzione da 70 € l'anno, contro un contratto "gratis" di 10 anni.
// Colonna "gratis": cifre di Stefano (250-300 € l'anno di manutenzione, circa
// 60 € di "smaltimento" a intervento), confermate da casi pubblici: lettera
// ADUC (abbonamento decennale 2.200 € + 48-60 € a intervento per "smaltimento
// filtri"), guide di settore che citano 300-400 € l'anno per 10-12 anni.
const CONFRONTO = [
  {
    voce: 'Il primo giorno',
    acquisto: '1.500 €, installazione compresa. Anche a rate a tasso zero',
    gratis: '0 € per l’impianto, ma firmi 10 anni di manutenzione, spesso con un finanziamento',
  },
  {
    voce: 'Ogni anno',
    acquisto: 'Manutenzione: 70 €',
    gratis: 'Manutenzione: 250-300 €',
  },
  {
    voce: 'Ogni volta che viene il tecnico',
    acquisto: 'Niente in più: è dentro la manutenzione',
    gratis: 'Circa 60 € in più, spesso chiamati «smaltimento filtri»',
  },
  {
    voce: 'In 10 anni',
    acquisto: '2.200 € in tutto',
    gratis: 'Da 3.100 a 3.600 € circa',
  },
  {
    voce: 'Alla fine',
    acquisto: "L'impianto è tuo e scegli tu chi fa la manutenzione",
    gratis: 'Hai speso da 900 a 1.400 € in più. E se era in comodato, l’impianto non è nemmeno tuo',
  },
];

const FAQ = [
  {
    q: 'Perché una forbice così larga, da 400 a 4.000 €?',
    a: "Perché dentro ci sono impianti molto diversi: un filtro a carboni attivi sotto il lavello non è un'osmosi inversa con acqua fredda e frizzante e un rubinetto a 5 vie. Col sopralluogo gratuito guardiamo la tua acqua e ti diciamo quale ti serve davvero, anche quando basta il più semplice.",
  },
  {
    q: 'Perché costa più di quelli che vedo nei negozi o online?',
    a: "Perché nella scatola c'è solo l'impianto. Da noi c'è anche chi viene prima a guardare la tua acqua e ti dice cosa ti serve davvero; chi lo installa, collega lo scarico e lo tara, e se serve fora il piano della cucina con gli attrezzi giusti; chi ti avvisa quando vanno cambiati i filtri. E se si rompe, abbiamo i ricambi e sappiamo aggiustarlo: non devi rispedire niente a nessuno. In più, 10 anni di garanzia. Il fai da te all'inizio costa meno, ma non basta saper fare un po' di idraulica: ogni macchina è diversa, e quando c'è un problema bisogna capire qual è, che pezzo serve e come cambiarlo.",
  },
  {
    q: 'Il contratto «gratis» non conviene mai?',
    a: "Non spendere nulla all'inizio è comodo, ma quasi sempre, somma dopo somma, costa di più di un acquisto, ti lega per anni e alla fine l'impianto spesso non è tuo. Se non vuoi pagare tutto subito, noi rateizziamo a tasso zero: paghi a rate, e a fine pagamento l'impianto è tuo.",
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
            Quanto costa un depuratore? Te lo diciamo subito
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Quasi nessuno scrive i prezzi, e molti li nascondono dietro un &laquo;da 1 € al giorno&raquo;. Noi le cifre vere le scriviamo qui, e il prezzo esatto per casa tua te lo diamo col sopralluogo gratuito.
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
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Un esempio su 10 anni: acquisto o contratto &laquo;gratis&raquo;</h2>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            Prendiamo un&apos;osmosi inversa base da 1.500 € con la manutenzione a 70 € l&apos;anno, e mettiamola accanto a un contratto &laquo;gratis&raquo; come quelli che vediamo in giro: l&apos;impianto non si paga, ma firmi dieci anni di manutenzione a un prezzo alto, e a ogni visita del tecnico c&apos;è una voce in più.
          </p>
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl shadow-sm">
            <table className="w-full min-w-[520px] text-sm text-left">
              <thead className="bg-blue-50 text-slate-900">
                <tr>
                  <th scope="col" className="p-4 font-bold w-1/4"></th>
                  <th scope="col" className="p-4 font-bold">Osmosi base comprata da noi</th>
                  <th scope="col" className="p-4 font-bold">Contratto &laquo;gratis&raquo; di 10 anni</th>
                </tr>
              </thead>
              <tbody>
                {CONFRONTO.map((r) => (
                  <tr key={r.voce} className={`border-t border-slate-200 align-top ${r.voce === 'In 10 anni' ? 'bg-slate-50 font-semibold text-slate-900' : ''}`}>
                    <th scope="row" className="p-4 font-semibold text-slate-900">{r.voce}</th>
                    <td className="p-4 text-slate-700 tabular-nums">{r.acquisto}</td>
                    <td className="p-4 text-slate-700 tabular-nums">{r.gratis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            <strong className="text-slate-900">E le offerte &laquo;da 1 € al giorno&raquo;?</strong> Fai il conto: sono 365 € l&apos;anno. Chiedi per quanti anni si paga, cosa è compreso (manutenzione, filtri, uscite del tecnico) e di chi è l&apos;impianto alla fine. Su 10 anni fanno 3.650 €.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed max-w-3xl">
            È un esempio: con acqua fredda e frizzante il prezzo dell&apos;impianto sale, ma il conto si fa allo stesso modo. Per confrontare due preventivi voce per voce trovi una guida qui:{' '}
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
