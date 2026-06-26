import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Informativa sulla Privacy | Acquadirete',
  description: 'Informativa sul trattamento dei dati personali ai sensi del GDPR per il sito acquadirete.it — Acquadirete di Stefano Piconese.',
  alternates: { canonical: '/privacy-policy' },
  openGraph: { ...OG_DEFAULTS, url: '/privacy-policy' },
  robots: { index: false },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="mb-10">
        <Link href="/" title="Torna alla home" className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">
          ← Torna alla home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">Informativa sulla Privacy</h1>
        <p className="mt-2 text-xs text-slate-500">
          Ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679 ("GDPR") e del D.Lgs. 196/2003 e s.m.i.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          La presente informativa descrive le modalità di trattamento dei dati personali degli utenti che consultano il sito{' '}
          <strong>www.acquadirete.it</strong> o che entrano in contatto con noi tramite il sito.
        </p>
      </div>

      <div className="space-y-10 text-sm text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">1. Titolare del trattamento</h2>
          <p>Il Titolare del trattamento è <strong>ACQUADIRETE DI STEFANO PICONESE</strong>, impresa individuale di Stefano Piconese:</p>
          <ul className="mt-3 space-y-1 text-xs text-slate-600">
            <li>Sede: Via 1° Maggio 6, 50025 Montespertoli (FI)</li>
            <li>P.IVA: 06864300485 — C.F.: PCNSFN65T29D612U — REA: FI-661967</li>
            <li>PEC: stefanopiconese@pec.it</li>
            <li>Email: <a href="mailto:info@acquadirete.it" title="Scrivici una email" className="text-blue-600 hover:underline">info@acquadirete.it</a></li>
            <li>Telefono: <a href="tel:+393358168825" title="Chiamaci al telefono" className="text-blue-600 hover:underline">335 816 8825</a></li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Non è stato nominato un Responsabile della protezione dei dati (DPO), non essendone ricorrenti i presupposti di legge.
            Per qualsiasi richiesta è possibile contattare direttamente il Titolare ai recapiti sopra indicati.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">2. Tipologie di dati trattati</h2>
          <p><strong>a) Dati di navigazione.</strong> I sistemi informatici acquisiscono, nel corso del normale esercizio, alcuni dati la cui trasmissione è implicita nell'uso dei protocolli Internet (es. indirizzi IP, tipo di browser, pagine visitate). Questi dati sono utilizzati al solo fine di ricavare informazioni statistiche anonime sull'uso del sito e per controllarne il corretto funzionamento.</p>
          <p className="mt-3"><strong>b) Dati forniti volontariamente dall'utente.</strong> L'invio tramite il modulo di contatto, l'invio di email o il contatto telefonico comporta l'acquisizione dei dati di contatto (es. nome, email, numero di telefono) e di ogni dato contenuto nella comunicazione.</p>
          <p className="mt-3"><strong>c) Cookie e strumenti analoghi.</strong> Per il dettaglio si rimanda alla{' '}
            <Link href="/cookie-policy" title="Leggi la Cookie Policy" className="text-blue-600 hover:underline">Cookie Policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">3. Finalità e basi giuridiche</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Finalità</th>
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Base giuridica (art. 6 GDPR)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Rispondere a richieste di informazioni, preventivi e contatti', 'Misure precontrattuali / contrattuali (art. 6.1.b)'],
                  ['Erogazione del servizio di installazione e manutenzione', 'Esecuzione del contratto (art. 6.1.b)'],
                  ['Adempimenti contabili, fiscali e di legge', 'Obbligo legale (art. 6.1.c)'],
                  ['Garantire la sicurezza e il corretto funzionamento del sito', 'Legittimo interesse del Titolare (art. 6.1.f)'],
                  ['Cookie analitici/di marketing ed eventuali comunicazioni promozionali', 'Consenso dell\'interessato (art. 6.1.a)'],
                ].map(([fin, base], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="p-3 border border-slate-200">{fin}</td>
                    <td className="p-3 border border-slate-200">{base}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">4. Modalità del trattamento</h2>
          <p>I dati sono trattati con strumenti informatici e/o cartacei, con logiche strettamente correlate alle finalità indicate e con misure di sicurezza adeguate a prevenirne la perdita, gli usi illeciti o non corretti e gli accessi non autorizzati.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">5. Destinatari e responsabili del trattamento</h2>
          <p>I dati possono essere trattati, per le finalità sopra indicate, da soggetti che agiscono in qualità di Responsabili del trattamento, tra cui:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-slate-600">
            <li>il fornitore di servizi di hosting del sito (<strong>Netlify, Inc.</strong>);</li>
            <li>il fornitore di servizi di invio moduli di contatto (<strong>Web3Forms</strong>);</li>
            <li>il fornitore di servizi di posta elettronica;</li>
            <li>eventuali consulenti (commercialista) e fornitori di servizi tecnici;</li>
            <li>eventuali fornitori di servizi statistici e di marketing (es. Google) — <em>solo se attivati e previo consenso, vedi Cookie Policy</em>.</li>
          </ul>
          <p className="mt-3">I dati non sono diffusi né ceduti a terzi per finalità di marketing senza il consenso dell'interessato.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">6. Trasferimento dei dati verso Paesi terzi</h2>
          <p>Alcuni fornitori (es. Netlify, Web3Forms) hanno sede o infrastrutture negli Stati Uniti. Tali trasferimenti avvengono esclusivamente sulla base di garanzie adeguate ai sensi degli artt. 44 e seguenti del GDPR (es. Clausole Contrattuali Standard o decisioni di adeguatezza della Commissione europea ove applicabili). L'utente può richiedere copia di tali garanzie ai recapiti del Titolare.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">7. Periodo di conservazione</h2>
          <ul className="space-y-1.5 list-disc list-inside text-xs text-slate-600">
            <li>Dati di contatto per richieste/preventivi non andati a buon fine: non oltre <strong>24 mesi</strong>.</li>
            <li>Dati relativi a contratti e obblighi fiscali: <strong>10 anni</strong> dalla cessazione del rapporto.</li>
            <li>Dati trattati sulla base del consenso (marketing): fino a revoca del consenso.</li>
            <li>Dati di navigazione: per il tempo strettamente necessario, secondo la Cookie Policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">8. Diritti dell'interessato</h2>
          <p>L'interessato può esercitare in qualsiasi momento i diritti previsti dagli artt. 15–22 del GDPR: accesso, rettifica, cancellazione ("diritto all'oblio"), limitazione del trattamento, portabilità, opposizione al trattamento e revoca del consenso (senza pregiudizio per la liceità del trattamento effettuato prima della revoca).</p>
          <p className="mt-2">Le richieste vanno indirizzate ai recapiti indicati al punto 1.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">9. Reclamo all'Autorità di controllo</h2>
          <p>L'interessato ha diritto di proporre reclamo al <strong>Garante per la protezione dei dati personali</strong> (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer" title="Sito del Garante per la protezione dei dati personali" className="text-blue-600 hover:underline">www.garanteprivacy.it</a>) qualora ritenga che il trattamento dei propri dati avvenga in violazione della normativa vigente.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">10. Natura del conferimento dei dati</h2>
          <p>Il conferimento dei dati di navigazione è necessario all'uso del sito. Il conferimento dei dati tramite i moduli di contatto è facoltativo, ma il mancato conferimento dei dati contrassegnati come obbligatori rende impossibile dare seguito alla richiesta.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">11. Processo decisionale automatizzato</h2>
          <p>Il Titolare non adotta processi decisionali automatizzati, inclusa la profilazione, di cui all'art. 22 del GDPR.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">12. Modifiche alla presente informativa</h2>
          <p>Il Titolare si riserva di modificare la presente informativa, dandone evidenza su questa pagina. Si invita a consultarla periodicamente.</p>
        </section>

        <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
          Ultimo aggiornamento: 18 giugno 2026
        </p>
      </div>
    </div>
  );
}
