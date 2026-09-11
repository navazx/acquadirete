// Funzione programmata: l'agente lead, ogni mattina.
//
// Legge la scheda Lead-Contatti e manda su Telegram chi e' fermo da richiamare
// (il lunedi' anche preventivi fermi, schede incomplete, conversione per canale).
// La logica sta in scripts/agente-lead.mjs, cosi' la stessa si prova da terminale.
//
// Sta qui e non su GitHub Actions perche' GitHub accoda i giri programmati:
// l'11 set 2026 quello delle 08:15 e' partito alle 13:19. Netlify rispetta
// l'orario, e ha gia' la chiave del Gestionale e il token del bot fra le sue
// variabili, quindi non serve aggiungere nessun segreto.
//
// Il cron e' in UTC: 06:15 sono le 08:15 con l'ora legale, le 07:15 d'inverno.
// Le funzioni programmate girano solo sul deploy pubblicato e non hanno un
// indirizzo: nessuno da fuori puo' farla partire.
import { componiAvvisoLead } from '../../scripts/agente-lead.mjs';
import { notifyTelegram } from './_shared/telegram.mjs';

export default async () => {
  // Le date del foglio sono ora italiana; il server e' in UTC.
  process.env.TZ = 'Europe/Rome';
  const settimanale = new Date().getDay() === 1;

  const avviso = await componiAvvisoLead({ settimanale });
  if (!avviso) {
    console.log('Niente da segnalare: nessun lead fermo.');
    return;
  }
  await notifyTelegram(avviso.testo);
  console.log(`Avviso inviato: ${avviso.blocchi} blocchi, ${avviso.daRichiamare} da richiamare.`);
};

export const config = {
  schedule: '15 6 * * *',
};
