import { whatsappHref } from '../lib/siteConfig';
import WhatsAppIcon from './WhatsAppIcon';

// Trigger WhatsApp fisso nell'angolo in basso a destra, presente su ogni pagina.
export default function FloatingWhatsApp() {
  return (
    <a
      href={whatsappHref('Buongiorno Acquadirete, vorrei fissare un sopralluogo gratuito.')}
      target="_blank"
      referrerPolicy="no-referrer"
      className="fixed bottom-6 right-6 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl shadow-emerald-500/20 z-50 transition-all duration-300 focus:outline-none hover:scale-110 active:scale-95 group shrink-0 border-none flex items-center gap-2"
      id="floating-whatsapp-button"
      title="Contatta Acquadirete su WhatsApp"
    >
      <span className="text-xs font-bold pl-1 max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap leading-none hidden md:inline uppercase tracking-widest text-[9px]">
        WhatsApp Rapido
      </span>
      <WhatsAppIcon size={26} className="text-white" />
      <span className="absolute -top-1.5 -right-1.5 h-4 w-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center animate-bounce">1</span>
    </a>
  );
}
