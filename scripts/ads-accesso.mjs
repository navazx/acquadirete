#!/usr/bin/env node
// ============================================================================
//  AGENTE ADS — puo' scrivere su Google Ads?
//
//  Chiede a Google se accetterebbe un'esclusione finta, SENZA applicarla
//  (validateOnly): sull'account non cambia niente, mai. Serve dopo che Matteo ha
//  alzato l'accesso del service account da "Sola lettura" a "Standard", per
//  sapere se APPROVA ADS funzionera'.
//
//  Su GitHub: workflow "Agente Ads - prova dell'accesso" (ads-accesso.yml).
//  Dal PC (la chiave del PC e' di sola lettura, quindi dira' di no):
//    GSC_KEY_FILE=../seo-report/gsc-key-readonly.json node scripts/ads-accesso.mjs
// ============================================================================

import { struttura, muta } from './lib/ads.mjs';
import { controlla, operazioni } from './lib/ads-azioni.mjs';
import { loadKey } from './lib/gsc.mjs';

const st = await struttura();
const campagna = st.campagne.find((c) => c.stato === 'ENABLED');
console.log(`Account letto: ${st.campagne.length} campagne, ${st.gruppi.length} gruppi, ${st.parole.filter((p) => p.attiva).length} parole chiave attive, ${st.escluse.length} esclusioni, ${st.annunci.filter((a) => a.attivo).length} annunci attivi.`);
if (!campagna) {
  console.log('Nessuna campagna accesa: non ho dove provare.');
  process.exit(1);
}
const { buone } = controlla([{ tipo: 'escludi', testo: 'zzprova accesso acquadirete', corrispondenza: 'EXACT', dove: campagna.id }], st);
try {
  await muta(operazioni(buone), { prova: true });
  console.log(`ACCESSO IN SCRITTURA: SI. Google accetterebbe le modifiche di ${loadKey().client_email} (non ne ho applicata nessuna).`);
} catch (e) {
  if (e.senzaPermesso) {
    console.log(`ACCESSO IN SCRITTURA: NO. ${loadKey().client_email} su Google Ads e' ancora di sola lettura (${e.codice}).`);
    console.log('Si alza da Google Ads: Amministratore, Accesso e sicurezza, Utenti, livello di accesso Standard.');
  } else {
    console.log(`Google ha risposto con un altro errore (${e.codice}): ${e.message}`);
  }
  process.exitCode = 1;
}
