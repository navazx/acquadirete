'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Phone, Menu, X } from 'lucide-react';
import { telHref, whatsappHref, GOOGLE_PROFILE_URL } from '../lib/siteConfig';
import { ROUTES, PAGE_BREADCRUMB } from '../lib/routes';
import { PageId } from '../lib/types';
import { useModal } from './ModalProvider';
import WhatsAppIcon from './WhatsAppIcon';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { openModal } = useModal();

  // Blocca lo scroll della pagina dietro mentre il menu mobile è aperto.
  // L'elemento che scrolla davvero è <html> (document.scrollingElement), non <body>.
  useEffect(() => {
    if (!isMenuOpen) return;
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const mainNavItems: { id: PageId; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'osmosi', label: 'Osmosi' },
    { id: 'carboni', label: 'Carboni' },
    { id: 'frizzante', label: 'Frizzante' },
    { id: 'business', label: 'Uffici e Ristoranti' },
    { id: 'assistenza', label: 'Assistenza' },
  ];
  const trailingNavItems: { id: PageId; label: string }[] = [
    { id: 'recensioni', label: 'Recensioni' },
    { id: 'contatti', label: 'Contatti' },
  ];

  // Confronto tollerante allo slash finale (trailingSlash è attivo).
  const isActive = (href: string) => {
    const normalize = (p: string) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);
    return normalize(pathname) === normalize(href);
  };

  // Il Blog non è una pagina servizio (PageId/ROUTES), quindi non rientra
  // nella mappa navigationItems: è gestito qui a parte, con un href fisso.
  const isBlogActive = pathname.startsWith('/blog');

  return (
    <header className="sticky top-0 z-50 w-full" id="site-header">
      {/* Top Banner (Info, Reviews & Direct Call) */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-950 text-white py-2 px-4 shadow-sm border-b border-blue-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center text-xs gap-2">
          {/* Social Proof badge */}
          <div className="flex items-center gap-1.5 font-medium text-blue-100 sm:justify-start justify-center">
            <a
              href={GOOGLE_PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              title="Leggi le recensioni su Google"
              className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
            >
              <span className="flex text-amber-400">★★★★★</span>
              <span className="text-white font-semibold">120+ Recensioni a 5 Stelle Google</span>
            </a>
            <span className="hidden md:inline text-blue-300">| Depurazione Acqua a Firenze, Prato e Pistoia</span>
          </div>

          {/* Contact Details */}
          <div className="flex items-center gap-4 sm:justify-end justify-center font-semibold">
            <a
              href={whatsappHref('Buongiorno Acquadirete, vorrei informazioni sui depuratori acqua.')}
              target="_blank"
              referrerPolicy="no-referrer"
              title="Scrivici su WhatsApp"
              className="flex items-center gap-1 hover:text-emerald-400 transition-colors text-emerald-300"
            >
              <WhatsAppIcon size={14} className="text-emerald-400" />
              <span>WhatsApp Rapido</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation Row */}
      <nav className="bg-white border-b border-slate-150">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-20">
            {/* Logo area */}
            <Link
              href={ROUTES.home}
              className="flex items-center gap-2.5 cursor-pointer shrink-0"
              id="header-logo"
              title="Acquadirete — torna alla home"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="Acquadirete — depuratori acqua a Firenze, Prato e Pistoia"
                width={500}
                height={319}
                className="h-10 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight leading-none">
                  <span className="text-[#2196e3]">Acqua</span><span className="text-[#16306e]">direte</span>
                </span>
                <span className="text-[9px] font-bold text-slate-400 tracking-widest uppercase leading-none mt-1">
                  Firenze · Prato · Pistoia
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden xl:flex flex-1 justify-center space-x-0.5">
              {mainNavItems.map((item) => (
                <Link
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  href={ROUTES[item.id]}
                  title={PAGE_BREADCRUMB[item.id]}
                  className={`px-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive(ROUTES[item.id])
                      ? 'text-blue-600 font-extrabold border-b-2 border-blue-600 rounded-none'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/blog"
                id="nav-link-blog"
                title="Blog: guide su depuratori e trattamento acqua"
                className={`px-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isBlogActive
                    ? 'text-blue-600 font-extrabold border-b-2 border-blue-600 rounded-none'
                    : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                }`}
              >
                Blog
              </Link>
              {trailingNavItems.map((item) => (
                <Link
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  href={ROUTES[item.id]}
                  title={PAGE_BREADCRUMB[item.id]}
                  className={`px-2 py-2 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    isActive(ROUTES[item.id])
                      ? 'text-blue-600 font-extrabold border-b-2 border-blue-600 rounded-none'
                      : 'text-slate-500 hover:text-blue-600 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>

            {/* CTA action button */}
            <div className="hidden xl:flex items-center gap-5 shrink-0">
              <button
                id="header-cta"
                onClick={openModal}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest px-4 py-3 rounded-lg shadow-md transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer whitespace-nowrap"
              >
                Sopralluogo Gratis
              </button>
            </div>

            {/* Mobile Menu Icon Toggle */}
            <div className="flex xl:hidden items-center gap-2 ml-auto">
              <a
                href={telHref()}
                className="flex items-center justify-center bg-blue-50 text-blue-600 p-2.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-colors"
                title="Chiama ora"
              >
                <Phone size={18} />
              </a>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-gray-100 text-gray-700 p-2.5 rounded-xl hover:bg-gray-200 transition-colors outline-none cursor-pointer"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMenuOpen && (
          <div className="xl:hidden border-t border-gray-100 bg-white/98 shadow-inner animate-in fade-in slide-in-from-top-4 duration-200 max-h-[calc(100vh-130px)] overflow-y-auto">
            <div className="px-4 pt-3 pb-6 space-y-1.5">
              {mainNavItems.map((item) => (
                <Link
                  key={item.id}
                  href={ROUTES[item.id]}
                  onClick={() => setIsMenuOpen(false)}
                  title={PAGE_BREADCRUMB[item.id]}
                  className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    isActive(ROUTES[item.id])
                      ? 'bg-blue-600/5 text-blue-600 font-bold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                title="Blog: guide su depuratori e trattamento acqua"
                className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all ${
                  isBlogActive
                    ? 'bg-blue-600/5 text-blue-600 font-bold border-l-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                }`}
              >
                Blog
              </Link>
              {trailingNavItems.map((item) => (
                <Link
                  key={item.id}
                  href={ROUTES[item.id]}
                  onClick={() => setIsMenuOpen(false)}
                  title={PAGE_BREADCRUMB[item.id]}
                  className={`block w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all ${
                    isActive(ROUTES[item.id])
                      ? 'bg-blue-600/5 text-blue-600 font-bold border-l-4 border-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-100 mt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    openModal();
                  }}
                  className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer"
                >
                  Richiedi Informazioni
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
