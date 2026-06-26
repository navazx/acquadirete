import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Note Legali | Acquadirete',
  description: 'Note legali, dati identificativi e condizioni d\'uso del sito acquadirete.it — Acquadirete di Stefano Piconese.',
  alternates: { canonical: '/note-legali' },
  openGraph: { ...OG_DEFAULTS, url: '/note-legali' },
  robots: { index: false },
};

export default function NoteLegaliPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="mb-10">
        <Link href="/" title="Torna alla home" className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">
          ← Torna alla home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">Note Legali</h1>
      </div>

      <div className="space-y-10 text-sm text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">1. Dati identificativi</h2>
          <p>Il sito <strong>www.acquadirete.it</strong> è di titolarità di:</p>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            <li><strong>ACQUADIRETE DI STEFANO PICONESE</strong> — impresa individuale</li>
            <li>Titolare: Stefano Piconese</li>
            <li>Sede: Via 1° Maggio 6, 50025 Montespertoli (FI)</li>
            <li>P.IVA: 06864300485</li>
            <li>Codice Fiscale: PCNSFN65T29D612U</li>
            <li>Numero REA: FI-661967 (Camera di Commercio di Firenze)</li>
            <li>PEC: stefanopiconese@pec.it</li>
            <li>
              Email: <a href="mailto:info@acquadirete.it" title="Scrivici una email" className="text-blue-600 hover:underline">info@acquadirete.it</a>
              {' — '}Tel: <a href="tel:+393358168825" title="Chiamaci al telefono" className="text-blue-600 hover:underline">335 816 8825</a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Attività: commercio, installazione e manutenzione di sistemi di depurazione e trattamento dell'acqua.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">2. Oggetto e condizioni d'uso</h2>
          <p>Il presente sito ha finalità informativa e di presentazione dei servizi offerti. L'accesso e l'utilizzo del sito implicano l'accettazione delle presenti note legali. Le informazioni e i contenuti pubblicati non costituiscono offerta al pubblico contrattualmente vincolante: ogni preventivo è formulato individualmente a seguito di richiesta dell'utente.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">3. Proprietà intellettuale</h2>
          <p>Tutti i contenuti del sito — testi, immagini, logo, grafica, marchi e segni distintivi — sono di proprietà del Titolare o dei legittimi aventi diritto e sono protetti dalla normativa vigente in materia di proprietà intellettuale e industriale. È vietata la riproduzione, anche parziale, la distribuzione o l'utilizzo dei contenuti senza autorizzazione scritta del Titolare, salvo per uso personale e non commerciale.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">4. Limitazione di responsabilità</h2>
          <p>Il Titolare si impegna affinché i contenuti del sito siano accurati e aggiornati, ma non garantisce l'assenza di errori o omissioni né l'idoneità dei contenuti a finalità specifiche. Il Titolare non è responsabile per eventuali danni diretti o indiretti derivanti dall'accesso o dall'utilizzo del sito o dall'impossibilità di accedervi.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">5. Collegamenti a siti terzi</h2>
          <p>Il sito può contenere collegamenti a siti di terzi. Il Titolare non esercita alcun controllo su tali siti e declina ogni responsabilità in merito ai loro contenuti, alla loro disponibilità e alle loro pratiche in materia di privacy.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">6. Recensioni e contenuti di terzi</h2>
          <p>Eventuali recensioni o valutazioni mostrate sul sito provengono da piattaforme di terzi (es. Google) e riflettono le opinioni dei rispettivi autori. Il Titolare non ne modifica i contenuti.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">7. Legge applicabile e foro competente</h2>
          <p>Le presenti note legali sono regolate dalla legge italiana. Per ogni controversia relativa all'utilizzo del sito è competente, in via esclusiva, il Foro di <strong>Firenze</strong>, salvo l'applicazione di norme inderogabili a tutela del consumatore, che individuano il foro del luogo di residenza o domicilio del consumatore.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">8. Risoluzione delle controversie online (ODR)</h2>
          <p>Ai sensi del Regolamento (UE) 524/2013, si informa che la Commissione europea mette a disposizione dei consumatori una piattaforma per la risoluzione delle controversie online, accessibile all'indirizzo:{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noreferrer" title="Piattaforma europea di risoluzione delle controversie online" className="text-blue-600 hover:underline">ec.europa.eu/consumers/odr</a>
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">9. Contatti</h2>
          <p>Per qualsiasi comunicazione relativa al sito è possibile scrivere ai recapiti indicati al punto 1.</p>
        </section>

        <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
          Ultimo aggiornamento: 18 giugno 2026
        </p>
      </div>
    </div>
  );
}
