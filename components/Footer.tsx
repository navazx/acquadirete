'use client';

import Link from 'next/link';
import { Phone, Mail, MapPin, Clock } from 'lucide-react';
import { CONTACT, telHref, mailtoHref, whatsappHref, GOOGLE_PROFILE_URL, SOCIAL } from '../lib/siteConfig';
import { ROUTES } from '../lib/routes';
import { useModal } from './ModalProvider';
import InstagramIcon from './InstagramIcon';
import FacebookIcon from './FacebookIcon';
import WhatsAppIcon from './WhatsAppIcon';
import { resetConsent } from '../lib/cookieConsent';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { openModal } = useModal();

  return (
    <footer className="bg-slate-950 text-slate-300 font-sans" id="site-footer">
      {/* Upper Footer Segment */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 border-b border-slate-900">

        {/* Brand Information */}
        <div className="space-y-4" id="footer-brand">
          <Link href={ROUTES.home} className="flex items-center gap-2.5 cursor-pointer" title="Acquadirete — torna alla home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Acquadirete — depuratori acqua a Firenze, Prato e Pistoia"
              width={500}
              height={319}
              className="h-10 w-auto object-contain shrink-0"
            />
            <span className="text-xl font-bold text-white tracking-tight leading-none">
              Acqua<span className="text-blue-500">direte</span>
            </span>
          </Link>
          <p className="text-sm text-slate-400 leading-relaxed font-normal">
            Impianti per la depurazione dell'acqua a Firenze, Prato e Pistoia. Installiamo e seguiamo sistemi per case, uffici, bar e ristoranti dal 2005.
          </p>
          <a
            href={GOOGLE_PROFILE_URL}
            target="_blank"
            rel="noreferrer"
            title="Leggi le recensioni su Google"
            className="pt-2 flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer w-fit"
          >
            <span className="flex text-amber-400 text-sm">★★★★★</span>
            <span className="text-xs text-slate-400 font-medium font-mono">120+ Recensioni Google (5.0 Stelle)</span>
          </a>
          <div className="flex items-center gap-3 pt-1">
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
            <a
              href={whatsappHref('Buongiorno Acquadirete, vorrei informazioni sui depuratori acqua.')}
              target="_blank"
              referrerPolicy="no-referrer"
              title="Scrivici su WhatsApp"
              className="bg-[#25D366] hover:bg-[#1da851] text-white p-2 rounded-xl transition-colors cursor-pointer"
            >
              <WhatsAppIcon size={16} />
            </a>
          </div>
        </div>

        {/* Dynamic Navigation Column */}
        <div className="space-y-4" id="footer-links">
          <p className="text-sm font-bold uppercase tracking-wider text-white">I Nostri Servizi</p>
          <ul className="space-y-2.5 text-sm">
            <li>
              <Link href={ROUTES.depuratore} title="Depuratore Acqua a Firenze" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Depuratore Acqua a Firenze
              </Link>
            </li>
            <li>
              <Link href={ROUTES.prato} title="Depuratore Acqua a Prato" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Depuratore Acqua a Prato
              </Link>
            </li>
            <li>
              <Link href={ROUTES.pistoia} title="Depuratore Acqua a Pistoia" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Depuratore Acqua a Pistoia
              </Link>
            </li>
            <li>
              <Link href={ROUTES.osmosi} title="Osmosi Inversa" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Osmosi Inversa
              </Link>
            </li>
            <li>
              <Link href={ROUTES.carboni} title="Carboni Attivi" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Carboni Attivi
              </Link>
            </li>
            <li>
              <Link href={ROUTES.frizzante} title="Acqua Frizzante e Refrigerata" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Acqua Frizzante e Refrigerata
              </Link>
            </li>
            <li>
              <Link href={ROUTES.business} title="Depuratori Uffici e Ristoranti" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Depuratori Uffici e Ristoranti
              </Link>
            </li>
            <li>
              <Link href={ROUTES.assistenza} title="Manutenzione e Assistenza" className="hover:text-blue-400 transition-colors cursor-pointer text-left">
                Manutenzione e Assistenza
              </Link>
            </li>
          </ul>
        </div>

        {/* Contact and Reachability Column */}
        <div className="space-y-4" id="footer-contact">
          <p className="text-sm font-bold uppercase tracking-wider text-white">Contatti Diretti</p>
          <ul className="space-y-3.5 text-sm font-medium">
            <li className="flex items-start gap-2.5">
              <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div className="leading-tight">
                <span className="text-slate-100 block font-semibold">{CONTACT.companyName}</span>
                <span className="text-xs text-slate-400 font-normal">{CONTACT.addressLine}<br />{CONTACT.addressCity}</span>
              </div>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone size={16} className="text-blue-500 shrink-0" />
              <a href={telHref()} title="Chiamaci al telefono" className="hover:text-blue-400 text-slate-100 font-bold transition-colors">
                {CONTACT.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail size={16} className="text-blue-500 shrink-0" />
              <a href={mailtoHref()} title="Scrivici una email" className="hover:text-blue-400 transition-colors">
                {CONTACT.email}
              </a>
            </li>
          </ul>
        </div>

        {/* Service Hours Column */}
        <div className="space-y-4" id="footer-hours">
          <p className="text-sm font-bold uppercase tracking-wider text-white">Siamo Attivi</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2 text-slate-400">
              <Clock size={16} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                {CONTACT.hours.map((h, i) => (
                  <p key={i} className="font-semibold text-slate-200">{h}</p>
                ))}
                <p className="text-xs mt-1 text-slate-500">Assistenza in pochi giorni e macchina sostitutiva in caso di guasto</p>
              </div>
            </li>
          </ul>
          <div className="pt-2">
            <button
              onClick={openModal}
              className="text-white hover:bg-blue-600 bg-blue-700/80 px-4 py-2 border border-blue-600 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md inline-flex items-center gap-1.5"
            >
              Richiedi Informazioni
            </button>
          </div>
        </div>

      </div>

      {/* Sub Footer Legal Area */}
      <div className="bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 border-t border-slate-900/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-left md:text-left space-y-1">
            <p>&copy; {currentYear} {CONTACT.companyName}. Tutti i diritti riservati.</p>
            <p className="text-[10px]">P.IVA {CONTACT.vat} — {CONTACT.addressLine}, {CONTACT.addressCity}.</p>
          </div>
          <div className="flex gap-4 font-semibold text-slate-400">
            <Link href="/privacy-policy" title="Leggi la Privacy Policy" className="hover:text-blue-400 transition-colors">Privacy Policy</Link>
            <span>&bull;</span>
            <Link href="/cookie-policy" title="Leggi la Cookie Policy" className="hover:text-blue-400 transition-colors">Cookie Policy</Link>
            <span>&bull;</span>
            <Link href="/note-legali" title="Leggi le Note Legali" className="hover:text-blue-400 transition-colors">Note Legali</Link>
            <span>&bull;</span>
            <button onClick={resetConsent} className="hover:text-blue-400 transition-colors cursor-pointer">Gestione Cookie</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
