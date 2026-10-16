// ============================================================================
//  Ogni lunedì: i contatti arrivati da un annuncio e diventati clienti tornano
//  a Google Ads come conversioni (dal 16 ott 2026). Perché e cosa parte verso
//  Google: scripts/lib/ads-conversioni.mjs.
//
//  Legge Lead-Contatti, prende le righe con Stato "Cliente" e un codice del clic
//  con "cookie accettati" nella colonna "Clic annuncio Google", e le carica.
//  Rilanciarlo non fa danni: una conversione già caricata Google la riconosce
//  (stesso clic, stessa ora) e non la conta due volte, e l'azione è "una per clic".
//
//  Uso:
//    node scripts/conversioni-ads.mjs            giro vero (dal workflow)
//    node scripts/conversioni-ads.mjs --prova    Google controlla e basta (validateOnly)
//
//  Il repository è pubblico, quindi anche i log del workflow: qui si stampano
//  solo conteggi. Mai codici dei clic, nomi, righe o cifre in euro.
// ============================================================================

import { leggi } from './lib/gestionale.mjs';
import { getAccessToken } from './lib/gsc.mjs';
import { valoreCliente } from './lib/visite.mjs';
import { AZIONE, GIORNI_VALIDO, carica, creaAzione, leggiClic, trovaAzione } from './lib/ads-conversioni.mjs';
import { lasciaNota } from './lib/bacheca.mjs';

const prova = process.argv.includes('--prova');
const ORA_DEL_CLIENTE = 8; // il giorno in cui è diventato cliente, alle 8 (ora italiana: TZ=Europe/Rome nel workflow)

/** "16/10/2026, 14:56:13" o "16/10/2026" → Date (ora locale), o null. */
function data(testo, oraSeManca = 0) {
  const m = String(testo || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  const [, g, mese, anno, ore, min = 0, sec = 0] = m;
  const d = new Date(+anno, +mese - 1, +g, ore === undefined ? oraSeManca : +ore, +min, +sec);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Dalle righe di Lead-Contatti (intestazioni comprese) le conversioni da
 * caricare, più i conteggi di quelle lasciate fuori e perché.
 */
export function daCaricare(righe, valore, adesso = new Date()) {
  const iTesta = righe.findIndex((r) => r.some((c) => String(c).trim() === 'Stato'));
  const testa = (righe[iTesta] || []).map((c) => String(c).trim());
  const col = (nome) => testa.indexOf(nome);
  const [iData, iStato, iDataStato, iClic] = ['Data', 'Stato', 'Data stato', 'Clic annuncio Google'].map(col);
  const conti = { clientiDaAnnuncio: 0, senzaConsenso: 0, scaduti: 0, troppoPresto: 0 };
  const conversioni = [];
  if (iTesta < 0 || iClic < 0) return { conversioni, conti };

  for (const r of righe.slice(iTesta + 1)) {
    if (String(r[iStato] ?? '').trim() !== 'Cliente') continue;
    const clic = leggiClic(r[iClic]);
    if (!clic) continue;
    conti.clientiDaAnnuncio += 1;
    if (!clic.consenso) { conti.senzaConsenso += 1; continue; }
    const arrivo = data(r[iData]);
    if (!arrivo) continue;
    if ((adesso - arrivo) / 864e5 > GIORNI_VALIDO - 1) { conti.scaduti += 1; continue; }
    // Dopo il clic per forza: almeno un'ora dopo l'arrivo del contatto. Sempre
    // la stessa ora a ogni giro, così Google riconosce quelle già caricate.
    const cliente = data(r[iDataStato], ORA_DEL_CLIENTE);
    const quando = new Date(Math.max(arrivo.getTime() + 36e5, cliente ? cliente.getTime() : 0));
    if (quando > adesso) { conti.troppoPresto += 1; continue; }
    conversioni.push({ campo: clic.campo, codice: clic.codice, quando, valore });
  }
  return { conversioni, conti };
}

async function main() {
  const v = valoreCliente();
  const valore = Number(v?.margineImpianto?.min);
  if (!valore) throw new Error('manca il valore di un cliente (secret VALORE_CLIENTE, margineImpianto.min)');

  const token = await getAccessToken('https://www.googleapis.com/auth/spreadsheets.readonly');
  const righe = await leggi(token, 'Lead-Contatti!A1:Z2000');
  const { conversioni, conti } = daCaricare(righe, valore);
  console.log(`Clienti nati da un annuncio col codice del clic: ${conti.clientiDaAnnuncio} (senza consenso ai cookie: ${conti.senzaConsenso}, oltre i ${GIORNI_VALIDO} giorni: ${conti.scaduti}, alla prossima: ${conti.troppoPresto})`);
  console.log(`Da mandare a Google Ads: ${conversioni.length}`);

  let azione = await trovaAzione();
  if (!azione) {
    if (prova) {
      await creaAzione(valore, { prova: true });
      console.log(`L'azione "${AZIONE}" non c'è ancora: Google accetterebbe di crearla (prova, non creata).`);
      return;
    }
    azione = await creaAzione(valore);
    console.log(`Creata su Google Ads l'azione di conversione "${AZIONE}" (secondaria).`);
  }

  const esiti = await carica(azione, conversioni, { prova });
  const nuove = esiti.filter((e) => e === 'caricata').length;
  const giaCaricate = esiti.filter((e) => e === "c'era già").length;
  const errori = esiti.filter((e) => e !== 'caricata' && e !== "c'era già");
  const motivi = [...new Set(errori)].map((e) => `${e} ×${errori.filter((x) => x === e).length}`).join(', ');
  console.log(`${prova ? 'In prova, Google accetterebbe' : 'Caricate'}: ${nuove} · già caricate: ${giaCaricate} · rifiutate: ${errori.length}${motivi ? ` (${motivi})` : ''}`);

  if (!prova && (nuove || errori.length)) {
    const testo = [
      nuove && `Ho rimandato a Google Ads ${nuove === 1 ? 'un cliente nato' : `${nuove} clienti nati`} da un annuncio (azione "${AZIONE}"): così Google vede quali clic portano clienti.`,
      errori.length && `Google ne ha rifiutati ${errori.length}: ${motivi}.`,
      conti.senzaConsenso && `${conti.senzaConsenso} senza consenso ai cookie: a Google non sono andati, come vuole la privacy.`,
    ].filter(Boolean).join(' ');
    lasciaNota('ads', testo, ['direttore', 'ads']);
  }
  if (errori.length) process.exitCode = 1;
}

if (process.argv[1]?.endsWith('conversioni-ads.mjs')) {
  main().catch((e) => {
    console.error(`Conversioni non caricate: ${e.message}`);
    process.exit(1);
  });
}
