'use client';

import React, { useState } from 'react';
import { Mail, Phone, User, MapPin, Clock, Sparkles, CheckCircle2, Send, MessageSquare, ChevronDown } from 'lucide-react';
import { CONTACT, FORM } from '../lib/siteConfig';

const SERVICE_LABELS: Record<string, string> = {
  depuratore: 'Depuratore per la casa',
  osmosi: 'Osmosi inversa',
  carboni: 'Carboni attivi',
  frizzante: 'Acqua frizzante e refrigerata',
  business: 'Erogatori per ufficio o ristorante',
  assistenza: 'Assistenza o sostituzione filtri',
  test_acqua: 'Sopralluogo gratuito',
};

interface ContactFormProps {
  initialService?: string;
  isCompact?: boolean;
}

export default function ContactForm({ initialService = 'depuratore', isCompact = false }: ContactFormProps) {
  const [formData, setFormData] = useState({
    nome: '',
    telefono: '',
    email: '',
    zona: 'Firenze e Comune',
    servizio: initialService,
    messaggio: '',
    accettaPrivacy: false
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const zoneFirenze = [
    'Firenze e Comune',
    'Prato e provincia',
    'Montespertoli',
    'Empolese / Valdelsa',
    'Scandicci',
    'Sesto Fiorentino',
    'Bagno a Ripoli / Grassina',
    'Campi Bisenzio / Signa',
    'Lastra a Signa',
    'Altra zona (Firenze, Prato e Pistoia)'
  ];

  const saveLocalLead = () => {
    // Conserva sempre una copia locale della richiesta (utile come backup).
    const leads = JSON.parse(localStorage.getItem('acquadirete_leads') || '[]');
    leads.push({
      ...formData,
      date: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    });
    localStorage.setItem('acquadirete_leads', JSON.stringify(leads));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.telefono || !formData.accettaPrivacy) {
      alert('Per favore, compila i campi obbligatori contrassegnati con l\'asterisco ed accetta la privacy.');
      return;
    }

    setIsSubmitting(true);
    const servizioLabel = SERVICE_LABELS[formData.servizio] || formData.servizio;

    try {
      if (FORM.web3formsAccessKey) {
        // Invio reale: la richiesta arriva via email a info@acquadirete.it
        const response = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            access_key: FORM.web3formsAccessKey,
            subject: `Nuova richiesta dal sito — ${servizioLabel}`,
            from_name: 'Sito Acquadirete',
            'Nome e cognome': formData.nome,
            Telefono: formData.telefono,
            Email: formData.email || '—',
            Zona: formData.zona,
            'Impianto di interesse': servizioLabel,
            Note: formData.messaggio || '—',
          }),
        });
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Invio non riuscito');
        }
      } else {
        // Modalità demo: nessuna chiave configurata, simula l'invio
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      saveLocalLead();
      // Evento di conversione per Meta Ads: parte solo se l'utente ha
      // accettato i cookie di marketing (fbq esiste solo in quel caso).
      window.fbq?.('track', 'Lead', { content_name: servizioLabel });
      setIsSubmitted(true);
    } catch (err) {
      console.error('Errore invio modulo:', err);
      alert(
        `Si è verificato un problema nell'invio della richiesta. Riprova tra poco oppure chiamaci/scrivici su WhatsApp al ${CONTACT.phoneDisplay}.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      telefono: '',
      email: '',
      zona: 'Firenze e Comune',
      servizio: initialService,
      messaggio: '',
      accettaPrivacy: false
    });
    setIsSubmitted(false);
  };

  if (isSubmitted) {
    return (
      <div
        className="bg-white rounded-2xl border border-blue-100 p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[400px] animate-in zoom-in-95 duration-300"
        id="contact-form-success"
      >
        <div className="bg-emerald-50 text-emerald-500 p-4 rounded-full mb-6 relative">
          <CheckCircle2 size={48} className="relative z-10 animate-bounce" />
          <span className="absolute inset-0 bg-emerald-200/40 rounded-full scale-110 animate-ping"></span>
        </div>
        <h3 className="text-2xl font-bold text-blue-950 mb-2">Richiesta Ricevuta con Successo!</h3>
        <p className="text-gray-600 max-w-md mx-auto text-sm leading-relaxed mb-6">
          Grazie <strong className="text-blue-900">{formData.nome}</strong>, la tua richiesta per <strong className="text-blue-900">
            {formData.servizio === 'depuratore' && 'Depuratore Domestico'}
            {formData.servizio === 'osmosi' && 'Osmosi Inversa'}
            {formData.servizio === 'carboni' && 'Carboni Attivi'}
            {formData.servizio === 'frizzante' && 'Acqua Frizzante e Refrigerata'}
            {formData.servizio === 'business' && 'Sistemi Ufficio/Ristorante'}
            {formData.servizio === 'assistenza' && 'Manutenzione/Cambio filtri'}
            {formData.servizio === 'test_acqua' && 'Sopralluogo Gratuito'}
          </strong> è stata correttamente presa in carico.
        </p>

        <div className="bg-blue-50/70 border border-blue-100/80 rounded-xl p-4 w-full max-w-sm mb-6 text-left text-xs text-blue-900 space-y-2.5">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-blue-600 shrink-0" />
            <span>Ti ricontattiamo al <strong className="font-bold">{formData.telefono}</strong> al più presto.</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-blue-600 shrink-0" />
            <span>Veniamo da te per un <strong>sopralluogo gratuito e senza impegno</strong>: valutiamo la tua acqua e ti diciamo come stanno le cose.</span>
          </div>
        </div>

        <button
          onClick={resetForm}
          className="text-xs text-blue-600 font-semibold underline hover:text-blue-800 cursor-pointer"
        >
          Invia un'altra richiesta
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-6 md:p-8 shadow-sm ${isCompact ? 'max-w-md w-full' : ''}`}
      id="lead-contact-form"
    >
      <div className="mb-6">
        <span className="inline-block bg-blue-50 text-blue-800 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-md border border-blue-100">
          Preventivo e Sopralluogo Gratuito
        </span>
        <h3 className="text-xl md:text-2xl font-bold text-blue-900 mt-4 tracking-tight">
          Richiedi informazioni
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Compila ora il modulo rapido. Ti richiamiamo entro poche ore senza alcun impegno.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Nome e Cognome <span className="text-blue-500 font-extrabold">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <User size={15} />
            </div>
            <input
              type="text"
              required
              placeholder="es. Mario Rossi"
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />
          </div>
        </div>

        {/* Phone Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Numero di Telefono <span className="text-blue-500 font-extrabold">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Phone size={15} />
            </div>
            <input
              type="tel"
              required
              placeholder="es. 333 1234567"
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
            />
          </div>
        </div>

        {/* Email Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Indirizzo Email (facoltativo)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={15} />
            </div>
            <input
              type="email"
              placeholder="es. mario@gmail.com"
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
        </div>

        {/* Neighborhood Select */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            La tua Zona / Città <span className="text-blue-500 font-extrabold">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <MapPin size={15} />
            </div>
            <select
              className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 appearance-none cursor-pointer"
              value={formData.zona}
              onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
            >
              {zoneFirenze.map((z, idx) => (
                <option key={idx} value={z}>{z}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown size={15} />
            </div>
          </div>
        </div>

        {/* Service Selector */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Impianto di Interesse
          </label>
          <div className="relative">
            <select
              className="block w-full px-3 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 appearance-none cursor-pointer"
              value={formData.servizio}
              onChange={(e) => setFormData({ ...formData, servizio: e.target.value })}
            >
              <option value="depuratore">Depuratore per la casa</option>
              <option value="osmosi">Osmosi inversa</option>
              <option value="carboni">Carboni attivi</option>
              <option value="frizzante">Acqua frizzante e refrigerata</option>
              <option value="business">Erogatori per ufficio o ristorante</option>
              <option value="assistenza">Assistenza o sostituzione filtri</option>
              <option value="test_acqua">Sopralluogo gratuito</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              <ChevronDown size={15} />
            </div>
          </div>
        </div>

        {/* Message Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
            Note o richieste particolari (facoltativo)
          </label>
          <div className="relative">
            <div className="absolute top-3.5 left-3 pointer-events-none text-slate-400">
              <MessageSquare size={15} />
            </div>
            <textarea
              rows={2}
              placeholder="es. Vorrei un modello sottozoccolo, rispondetemi su WhatsApp..."
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50"
              value={formData.messaggio}
              onChange={(e) => setFormData({ ...formData, messaggio: e.target.value })}
            ></textarea>
          </div>
        </div>

        {/* Privacy Consent Checkbox */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            id="privacy-checkbox"
            type="checkbox"
            required
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-1 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
            checked={formData.accettaPrivacy}
            onChange={(e) => setFormData({ ...formData, accettaPrivacy: e.target.checked })}
          />
          <label htmlFor="privacy-checkbox" className="text-[11px] text-slate-500 leading-tight select-none cursor-pointer">
            Acconsento al trattamento dei dati personali ai fini del ricontatto commerciale in base alla Privacy Policy di Acquadirete. <span className="text-blue-500 font-extrabold">*</span>
          </label>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-widest py-3.5 px-4 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-all duration-300 flex justify-center items-center gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Elaborazione...</span>
            </>
          ) : (
            <>
              <Send size={15} />
              <span>Invia Richiesta Richiamami</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
