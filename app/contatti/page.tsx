import type { Metadata } from 'next';
import { Phone, MapPin, Clock } from 'lucide-react';
import ContactForm from '../../components/ContactForm';
import WhatsAppIcon from '../../components/WhatsAppIcon';
import InstagramIcon from '../../components/InstagramIcon';
import FacebookIcon from '../../components/FacebookIcon';
import { CONTACT, telHref, whatsappHref, SOCIAL, OG_DEFAULTS } from '../../lib/siteConfig';

export const metadata: Metadata = {
  title: 'Contatti | Depuratori Acqua a Firenze e Prato | Acquadirete',
  description:
    'Contatta Acquadirete per depuratori, osmosi inversa, cambio filtri e assistenza a Firenze, Prato e Pistoia. Telefono, WhatsApp e modulo sopralluogo gratuito.',
  alternates: { canonical: '/contatti' },
  openGraph: { ...OG_DEFAULTS, url: '/contatti' },
};

export default function ContattiPage() {
  return (
    <div id="contatti-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-16">
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <span className="inline-block bg-blue-500/10 text-blue-600 text-[10px] font-bold uppercase tracking-widest px-3.5 py-1.5 rounded-lg border border-blue-500/20">
          Provincia di Firenze, Prato e Pistoia
        </span>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
          Contatta Acquadirete
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Hai delle domande sui nostri depuratori, l'osmosi o hai bisogno di un cambio filtri o assistenza multimarca a Firenze? Siamo qui per aiutarti.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Contact details */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="font-bold text-slate-950 uppercase tracking-widest text-[11px] pb-2 border-b border-slate-100">Recapiti Ufficiali</h2>

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="bg-slate-100 text-slate-600 p-2 rounded-lg border border-slate-200 shrink-0 mt-0.5">
                  <MapPin size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">Indirizzo Sede</h3>
                  <p className="text-slate-500 mt-1">{CONTACT.addressLine}, {CONTACT.addressCity}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Riceviamo su appuntamento.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-slate-100 text-slate-600 p-2 rounded-lg border border-slate-200 shrink-0 mt-0.5">
                  <Phone size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">Telefono e Assistenza</h3>
                  <a href={telHref()} title="Chiamaci al telefono" className="text-blue-600 font-bold block mt-1 hover:underline">{CONTACT.phoneDisplay}</a>
                  <p className="text-[10px] text-slate-400 mt-0.5">Disponibile anche su WhatsApp: {CONTACT.whatsappDisplay}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-slate-100 text-slate-600 p-2 rounded-lg border border-slate-200 shrink-0 mt-0.5">
                  <Clock size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">Orari</h3>
                  {CONTACT.hours.map((h, i) => (
                    <p key={i} className="text-slate-500 mt-1">{h}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* WhatsApp Direct Accent Box */}
            <div className="bg-emerald-50/55 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-emerald-900 text-xs uppercase tracking-wider">Preferisci WhatsApp?</h3>
                <p className="text-[11px] text-emerald-600 leading-tight">Scrivici su WhatsApp: ti rispondiamo subito.</p>
              </div>
              <a
                href={whatsappHref('Buongiorno Acquadirete, desidero informazioni.')}
                target="_blank"
                referrerPolicy="no-referrer"
                title="Scrivici su WhatsApp"
                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg p-2.5 transition-colors shrink-0 cursor-pointer"
              >
                <WhatsAppIcon size={18} className="text-white" />
              </a>
            </div>

            {/* Social links */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="font-bold text-slate-900 uppercase tracking-wide text-[10px]">Seguici sui social</h3>
              <div className="flex items-center gap-2.5">
                <a
                  href={SOCIAL.instagram}
                  target="_blank"
                  rel="noreferrer"
                  title="Seguici su Instagram"
                  className="bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 hover:opacity-85 text-white p-2 rounded-xl transition-opacity cursor-pointer"
                >
                  <InstagramIcon size={16} />
                </a>
                <a
                  href={SOCIAL.facebook}
                  target="_blank"
                  rel="noreferrer"
                  title="Seguici su Facebook"
                  className="bg-[#1877F2] hover:bg-[#145dbf] text-white p-2 rounded-xl transition-colors cursor-pointer"
                >
                  <FacebookIcon size={16} />
                </a>
              </div>
            </div>

          </div>
        </div>

        {/* Contact Form main column */}
        <div className="lg:col-span-7">
          <ContactForm initialService="depuratore" />
        </div>
      </div>
    </div>
  );
}
