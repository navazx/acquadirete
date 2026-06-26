import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Cookie Policy | Acquadirete',
  description: 'Informativa sull\'uso dei cookie sul sito acquadirete.it — Acquadirete di Stefano Piconese.',
  alternates: { canonical: '/cookie-policy' },
  openGraph: { ...OG_DEFAULTS, url: '/cookie-policy' },
  robots: { index: false },
};

export default function CookiePolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
      <div className="mb-10">
        <Link href="/" title="Torna alla home" className="text-[10px] font-bold uppercase tracking-widest text-blue-600 hover:underline">
          ← Torna alla home
        </Link>
        <h1 className="mt-4 text-3xl font-bold text-slate-900 tracking-tight">Cookie Policy</h1>
        <p className="mt-2 text-xs text-slate-500">
          La presente Cookie Policy descrive le tipologie di cookie utilizzati dal sito <strong>www.acquadirete.it</strong> e le modalità per gestirli, in conformità al GDPR e alle Linee guida del Garante per la protezione dei dati personali del 10 giugno 2021.
        </p>
      </div>

      <div className="space-y-10 text-sm text-slate-700 leading-relaxed">

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">1. Cosa sono i cookie</h2>
          <p>I cookie sono piccoli file di testo che i siti visitati inviano al dispositivo dell'utente, dove vengono memorizzati per essere ritrasmessi agli stessi siti alla visita successiva. Esistono anche tecnologie analoghe (es. pixel, local storage) a cui si applicano le medesime regole.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">2. Tipologie di cookie utilizzati</h2>
          <p><strong>a) Cookie tecnici (necessari).</strong> Garantiscono il corretto funzionamento del sito (es. navigazione, memorizzazione delle preferenze). Non richiedono il consenso dell'utente.</p>
          <p className="mt-3"><strong>b) Cookie analitici.</strong> Raccolgono informazioni in forma aggregata sul numero di visitatori e su come utilizzano il sito. Se di terze parti e non opportunamente anonimizzati, richiedono il consenso. <em>Al momento questo sito non utilizza strumenti analitici attivi.</em></p>
          <p className="mt-3"><strong>c) Cookie di profilazione e marketing.</strong> Utilizzati per tracciare la navigazione e mostrare annunci personalizzati, anche per misurare l'efficacia delle nostre campagne pubblicitarie. Richiedono il consenso preventivo, raccolto tramite il banner mostrato alla prima visita. Questo sito utilizza il <strong>Meta Pixel</strong> (Facebook/Instagram): viene attivato solo se l'utente clicca "Accetta" sul banner, e resta disattivato in caso di rifiuto.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">3. Cookie di terze parti</h2>
          <p>Il sito può caricare risorse da servizi di terze parti che potrebbero impostare propri cookie. Per i dettagli si rimanda alle rispettive informative:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-slate-600">
            <li><strong>Netlify</strong> (hosting) — <a href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer" title="Privacy policy di Netlify" className="text-blue-600 hover:underline">netlify.com/privacy</a></li>
            <li><strong>Web3Forms</strong> (invio modulo di contatto) — <a href="https://web3forms.com/privacy" target="_blank" rel="noreferrer" title="Privacy policy di Web3Forms" className="text-blue-600 hover:underline">web3forms.com/privacy</a></li>
            <li><strong>WhatsApp / Meta</strong> (link di contatto esterno, nessun widget incorporato) — <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noreferrer" title="Privacy policy di WhatsApp" className="text-blue-600 hover:underline">whatsapp.com</a></li>
            <li><strong>Meta Pixel</strong> (Facebook/Instagram, misurazione campagne pubblicitarie — solo previo consenso) — <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noreferrer" title="Privacy policy di Meta/Facebook" className="text-blue-600 hover:underline">facebook.com/privacy</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">4. Elenco dei cookie</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Nome</th>
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Soggetto</th>
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Tipologia</th>
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Finalità</th>
                  <th className="text-left p-3 font-bold text-slate-800 border border-slate-200">Durata</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="p-3 border border-slate-200">_fbp</td>
                  <td className="p-3 border border-slate-200">Meta (Facebook/Instagram)</td>
                  <td className="p-3 border border-slate-200">Marketing</td>
                  <td className="p-3 border border-slate-200">Misurazione e ottimizzazione delle campagne pubblicitarie</td>
                  <td className="p-3 border border-slate-200">90 giorni</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="p-3 border border-slate-200">acquadirete_cookie_consent</td>
                  <td className="p-3 border border-slate-200">Prima parte</td>
                  <td className="p-3 border border-slate-200">Tecnico</td>
                  <td className="p-3 border border-slate-200">Memorizza la scelta espressa sul banner cookie (local storage, non un cookie in senso stretto)</td>
                  <td className="p-3 border border-slate-200">Nessuna scadenza, fino a cancellazione manuale</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">5. Base giuridica e consenso</h2>
          <p>I cookie tecnici sono installati sulla base del legittimo interesse del Titolare. Per i cookie analitici di terze parti e per quelli di profilazione/marketing, l'installazione avviene solo previo consenso dell'utente, raccolto tramite apposito banner alla prima visita, ove attivati.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">6. Come gestire i cookie</h2>
          <p>L'utente può modificare in qualsiasi momento la propria scelta sui cookie di marketing tramite il link <strong>"Gestione Cookie"</strong> presente in fondo a ogni pagina del sito, che fa riapparire il banner di consenso.</p>
          <p className="mt-3">È inoltre possibile gestire o disabilitare i cookie direttamente dal proprio browser:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-xs text-slate-600">
            <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noreferrer" title="Gestione cookie su Google Chrome" className="text-blue-600 hover:underline">Google Chrome</a></li>
            <li><a href="https://support.mozilla.org/it/kb/Gestione%20dei%20cookie" target="_blank" rel="noreferrer" title="Gestione cookie su Mozilla Firefox" className="text-blue-600 hover:underline">Mozilla Firefox</a></li>
            <li><a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noreferrer" title="Gestione cookie su Safari" className="text-blue-600 hover:underline">Safari</a></li>
            <li><a href="https://support.microsoft.com/it-it/microsoft-edge" target="_blank" rel="noreferrer" title="Gestione cookie su Microsoft Edge" className="text-blue-600 hover:underline">Microsoft Edge</a></li>
          </ul>
          <p className="mt-3">La disabilitazione dei cookie tecnici può compromettere il corretto funzionamento del sito.</p>
        </section>

        <section>
          <h2 className="text-base font-bold text-slate-900 uppercase tracking-wide mb-3">7. Aggiornamenti</h2>
          <p>La presente Cookie Policy può essere aggiornata. Si invita a consultarla periodicamente.</p>
        </section>

        <p className="text-xs text-slate-400 pt-4 border-t border-slate-200">
          Ultimo aggiornamento: 18 giugno 2026
        </p>
      </div>
    </div>
  );
}
