'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Phone, User, MapPin, ChevronDown, CheckCircle2, Send, X } from 'lucide-react';
import { CONTACT, telHref, whatsappHref } from '../lib/siteConfig';
import { setGoogleAdsUserData, trackGoogleAdsConversion } from '../lib/googleAds';
import { vieneDaAnnuncioGoogle, codiceClicGoogle } from '../lib/provenienza';
import { getConsent } from '../lib/cookieConsent';
import { segna } from '../lib/statistiche';
import { ZONE } from './ContactForm';
import WhatsAppIcon from './WhatsAppIcon';

// Il modulo corto della pagina per chi arriva dagli annunci Google
// (/sopralluogo-gratuito, 14 ott 2026): solo nome, telefono e zona, perché
// ogni campo in più è un motivo per chiudere. Manda a /api/lead come
// ContactForm, quindi il contatto finisce nello stesso Gestionale con lo
// stesso avviso Telegram, la stessa nota "arrivato da un annuncio Google" e le
// stesse conversioni per Meta e Google Ads.

export const MESSAGGIO_WHATSAPP = "Buongiorno, vorrei un sopralluogo gratuito per un depuratore d'acqua.";

// Sul telefono Chiama e WhatsApp restano sempre in basso, sopra il banner dei
// cookie finché quello è aperto. Va montata dentro <body> con un portale: la
// pagina sta nel div animato di app/template.tsx, e dentro un elemento animato
// con transform un "fixed" scorre con la pagina invece di stare fermo.
export function BarraContatti() {
  const [pronta, setPronta] = useState(false);
  useEffect(() => setPronta(true), []);
  if (!pronta) return null;
  return createPortal(
    <div
      className="md:hidden fixed inset-x-0 z-40 grid grid-cols-2 gap-2 bg-white/95 backdrop-blur border-t border-slate-200 p-2"
      style={{ bottom: 'var(--cookie-banner-h, 0px)' }}
    >
      <a href={telHref()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-900 text-white font-bold py-3">
        <Phone size={18} /> Chiama
      </a>
      <a href={whatsappHref(MESSAGGIO_WHATSAPP)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold py-3">
        <WhatsAppIcon size={18} /> WhatsApp
      </a>
    </div>,
    document.body,
  );
}

// Dal 22 ott 2026 il modulo non sta più aperto nella pagina: c'è un pulsante
// che lo apre in una finestra (a tutto schermo sul telefono). Matteo: il
// modulo in pagina spingeva tutto in basso, il pulsante si vede subito.
// I pulsanti sono più d'uno (in alto e in fondo) e la finestra una sola: si
// parlano con un evento della pagina.
const APRI = 'apri-modulo-sopralluogo';

export function PulsanteModulo({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(APRI))} className={`cursor-pointer ${className}`}>
      {children}
    </button>
  );
}

// La finestra resta montata anche da chiusa, così dopo l'invio riaprendola si
// rivede "Fatto" e non un modulo vuoto da rimandare. Col tasto indietro del
// telefono si chiude la finestra, non si esce dalla pagina: per questo
// all'apertura si aggiunge un passo alla cronologia.
export function FinestraModulo() {
  const [pronta, setPronta] = useState(false);
  const [aperta, setAperta] = useState(false);
  useEffect(() => setPronta(true), []);

  useEffect(() => {
    const apri = () => {
      setAperta(true);
      if (!history.state?.moduloAperto) history.pushState({ ...history.state, moduloAperto: true }, '');
    };
    const indietro = () => setAperta(false);
    window.addEventListener(APRI, apri);
    window.addEventListener('popstate', indietro);
    return () => {
      window.removeEventListener(APRI, apri);
      window.removeEventListener('popstate', indietro);
    };
  }, []);

  useEffect(() => {
    if (!aperta) return;
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') chiudi(); };
    window.addEventListener('keydown', tasto);
    return () => {
      document.body.style.overflow = prima;
      window.removeEventListener('keydown', tasto);
    };
  }, [aperta]);

  const chiudi = () => {
    if (history.state?.moduloAperto) history.back();
    else setAperta(false);
  };

  if (!pronta) return null;
  return createPortal(
    <div
      className={`fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-slate-950/60 md:p-6 ${aperta ? '' : 'hidden'}`}
      onClick={(e) => { if (e.target === e.currentTarget) chiudi(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Richiedi il sopralluogo gratuito"
    >
      <div className="w-full md:max-w-md max-h-[100dvh] overflow-y-auto overscroll-contain">
        <ModuloSopralluogo chiudi={chiudi} />
      </div>
    </div>,
    document.body,
  );
}

// Nella finestra, sul telefono il riquadro poggia sul fondo dello schermo:
// angoli tondi solo sopra, e spazio per la barra di sistema dell'iPhone.
const SHEET = 'rounded-t-2xl md:rounded-2xl pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]';

function BottoneChiudi({ chiudi }: { chiudi: () => void }) {
  return (
    <button type="button" onClick={chiudi} aria-label="Chiudi" className="absolute top-2.5 right-2.5 inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 cursor-pointer">
      <X size={22} />
    </button>
  );
}

export default function ModuloSopralluogo({ chiudi }: { chiudi?: () => void }) {
  const [nome, setNome] = useState('');
  const [telefono, setTelefono] = useState('');
  const [zona, setZona] = useState('');
  const [privacy, setPrivacy] = useState(false);
  // Campo trappola per i bot, come in ContactForm: se arriva pieno /api/lead
  // scarta la richiesta.
  const [website, setWebsite] = useState('');
  const [invio, setInvio] = useState(false);
  const [fatto, setFatto] = useState(false);
  // Il contatore conta un modulo "iniziato" alla prima casella toccata.
  const [iniziato, setIniziato] = useState(false);
  const alPrimoCampo = () => {
    if (iniziato) return;
    setIniziato(true);
    segna('modulo-iniziato');
  };

  const zonaScelta = ZONE.find((z) => z.code === zona);

  // Sul telefono, chiusa la tastiera, la pagina può restare più in basso del
  // riquadro "Fatto": lo si riporta in vista, così si vede che è arrivata.
  useEffect(() => {
    if (fatto) document.getElementById('modulo-fatto')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [fatto]);

  const invia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !telefono || !zona || !privacy) {
      alert('Per favore, scrivi nome, telefono e zona e accetta la privacy.');
      return;
    }
    setInvio(true);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          telefono,
          email: '',
          zona: `${zonaScelta?.code} — ${zonaScelta?.label}`,
          servizio: 'Sopralluogo gratuito',
          messaggio: '',
          pagina: window.location.pathname,
          daAnnuncioGoogle: vieneDaAnnuncioGoogle(),
          // Il codice del clic e la scelta sui cookie: su Google Ads si carica
          // "è diventato cliente" solo per chi ha accettato (lib/provenienza.ts).
          clicGoogle: codiceClicGoogle(),
          consenso: getConsent() ?? '',
          website,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Invio non riuscito');

      window.fbq?.('track', 'Lead', { content_name: 'Sopralluogo gratuito' });
      setGoogleAdsUserData({ email: '', phone: telefono });
      segna('modulo-inviato');
      trackGoogleAdsConversion('form');
      setFatto(true);
    } catch (err) {
      // In next dev /api/lead non esiste (è una funzione Netlify): si finge
      // l'invio riuscito per provare la pagina in locale.
      if (process.env.NODE_ENV === 'development') {
        setFatto(true);
        return;
      }
      console.error('Errore invio modulo:', err);
      alert(`Non siamo riusciti a inviare la richiesta. Riprova tra poco, oppure chiamaci o scrivici su WhatsApp al ${CONTACT.phoneDisplay}.`);
    } finally {
      setInvio(false);
    }
  };

  if (fatto) {
    return (
      <div className={`relative bg-white border border-emerald-200 p-6 md:p-8 shadow-xl text-center ${chiudi ? SHEET : 'rounded-2xl'}`} id="modulo-fatto">
        {chiudi && <BottoneChiudi chiudi={chiudi} />}
        <CheckCircle2 size={44} className="mx-auto text-emerald-500" />
        <h2 className="text-2xl font-bold text-blue-950 mt-3">Fatto, {nome}!</h2>
        <p className="text-slate-600 mt-2">
          Ti richiamiamo al <strong className="text-blue-900">{telefono}</strong> entro poche ore per fissare il sopralluogo.
        </p>
        <p className="text-sm text-slate-500 mt-4">Se hai fretta, scrivici subito:</p>
        <a
          href={whatsappHref(MESSAGGIO_WHATSAPP)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] text-white font-bold px-5 py-3"
        >
          <WhatsAppIcon size={18} /> WhatsApp
        </a>
      </div>
    );
  }

  const campo =
    'block w-full pl-10 pr-3 py-3.5 border border-slate-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white';

  return (
    <div className={`relative bg-white border border-slate-200 p-4 sm:p-5 md:p-7 shadow-xl ${chiudi ? SHEET : 'rounded-2xl'}`} id="modulo">
      {chiudi && <BottoneChiudi chiudi={chiudi} />}
      <h2 className="text-xl md:text-2xl font-bold text-blue-950 tracking-tight pr-10">Richiedi il sopralluogo gratuito</h2>
      <p className="text-sm text-slate-600 mt-1">
        Ti richiamano Stefano o Matteo, non un call center.
      </p>

      <form onSubmit={invia} onFocus={alPrimoCampo} className="mt-4 md:mt-5 space-y-3 md:space-y-3.5">
        <label className="block">
          <span className="sr-only">Nome e cognome</span>
          <span className="relative block">
            <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="text" required autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="Nome e cognome" className={campo} value={nome} onChange={(e) => setNome(e.target.value)} />
          </span>
        </label>

        <label className="block">
          <span className="sr-only">Telefono</span>
          <span className="relative block">
            <Phone size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input type="tel" required autoComplete="tel" inputMode="tel" enterKeyHint="next" placeholder="Telefono" className={campo} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </span>
        </label>

        <label className="block">
          <span className="sr-only">Zona della casa</span>
          <span className="relative block">
            <MapPin size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select required className={`${campo} appearance-none cursor-pointer ${zona ? '' : 'text-slate-400'}`} value={zona} onChange={(e) => setZona(e.target.value)}>
              {/* Nessuna zona preselezionata, come in ContactForm. */}
              <option value="" disabled>In che zona è la casa?</option>
              {ZONE.map((z) => (
                <option key={z.code} value={z.code} className="text-slate-800">{z.label}</option>
              ))}
            </select>
            <ChevronDown size={17} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </span>
          {zonaScelta?.comuni && <span className="block text-xs text-slate-500 mt-1.5">Comprende: {zonaScelta.comuni}</span>}
        </label>

        <label className="flex items-start gap-3 py-1 cursor-pointer select-none">
          <input type="checkbox" required aria-label="Acconsento al trattamento dei dati per essere ricontattato" className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
          <span className="text-[13px] text-slate-500 leading-snug">
            Acconsento al trattamento dei dati per essere ricontattato, secondo la{' '}
            <a href="/privacy-policy" target="_blank" className="underline">privacy policy</a>.
          </span>
        </label>

        <button
          type="submit"
          disabled={invio}
          className="w-full bg-mint-400 hover:bg-mint-500 text-slate-900 font-bold text-base py-4 rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
        >
          <Send size={17} />
          {invio ? 'Invio in corso…' : 'Richiamatemi'}
        </button>
        <p className="text-xs text-slate-500 text-center">Ti richiamiamo entro poche ore. Nessun impegno.</p>

        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </form>
    </div>
  );
}
