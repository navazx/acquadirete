#!/usr/bin/env node
// ============================================================================
//  AGENTE LEAD E CLIENTI  —  gira ogni mattina su GitHub Actions
//
//  Guarda la scheda Lead-Contatti del Gestionale e avvisa su Telegram quando
//  un contatto sta fermo. E' l'agente piu' vicino ai soldi: un lead richiamato
//  in un'ora chiude molto piu' di uno richiamato dopo tre giorni.
//
//  Cosa segnala:
//    ogni giorno   - "Da richiamare" da piu' di 24 ore
//    il lunedi'    - "Preventivo inviato" fermo da oltre 7 giorni
//                  - "Contattato" fermo da oltre 21 giorni, mai deciso
//                  - lead diventati "Cliente" senza riga in Clienti-Impianti
//                  - conversione per provenienza
//
//  Se non c'e' niente da fare NON manda nulla: il silenzio vuol dire tutto a posto.
//  Non scrive mai sul foglio e non contatta mai i clienti: solo avvisi a Matteo.
//
//  Prova in locale (stampa a schermo invece di mandare il Telegram):
//    GSC_KEY_FILE="../seo-report/gsc-key-readonly.json" node scripts/agente-lead.mjs
//  Aggiungi --settimanale per vedere anche i controlli del lunedi'.
// ============================================================================

import { sendTelegram, TELEGRAM_READY } from './lib/gsc.mjs';
import { sheetsToken, leggi, leggiLead, giorniDa, oreDa } from './lib/gestionale.mjs';

const ORE_RICHIAMO = 24;
const GIORNI_PREVENTIVO = 7;
const GIORNI_CONTATTATO = 21;

// I controlli lenti girano il lunedi': ripeterli ogni giorno diventa rumore e
// smetti di leggerli. Quelli urgenti invece vanno visti tutte le mattine.
const settimanale = process.argv.includes('--settimanale') || new Date().getDay() === 1;

/** Confronta i nomi come insiemi di parole: regge "MARIO ROSSI" contro "ROSSI MARIO". */
const chiaveNome = (n) =>
  String(n).toLowerCase().replace(/[^a-zà-ÿ\s]/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');

const riga = (l, quanto) => `• ${l.nome} — ${l.contatto || 'nessun contatto'} (${quanto}, ${l.provenienza || 'origine ignota'})`;

async function main() {
  const token = await sheetsToken();
  const lead = await leggiLead(token);

  const blocchi = [];

  // --- urgente: chi ha alzato la mano e non e' stato richiamato -------------
  const daRichiamare = lead
    .filter((l) => l.stato === 'Da richiamare' && l.data && oreDa(l.data) >= ORE_RICHIAMO)
    .sort((a, b) => a.data - b.data);

  if (daRichiamare.length) {
    blocchi.push(
      `DA RICHIAMARE (${daRichiamare.length})\n` +
        daRichiamare
          .map((l) => {
            const g = giorniDa(l.data);
            return riga(l, g >= 1 ? `${g} ${g === 1 ? 'giorno' : 'giorni'} fa` : `${oreDa(l.data)} ore fa`);
          })
          .join('\n'),
    );
  }

  if (settimanale) {
    // --- preventivi partiti e mai richiusi ---------------------------------
    const preventivi = lead
      .filter((l) => l.stato === 'Preventivo inviato' && l.data && giorniDa(l.data) >= GIORNI_PREVENTIVO)
      .sort((a, b) => a.data - b.data);
    if (preventivi.length) {
      blocchi.push(
        `PREVENTIVI FERMI (${preventivi.length})\n` +
          preventivi.map((l) => riga(l, `inviato da ${giorniDa(l.data)} giorni`)).join('\n'),
      );
    }

    // --- contattati e poi lasciati li' -------------------------------------
    const freddi = lead
      .filter((l) => l.stato === 'Contattato' && l.data && giorniDa(l.data) >= GIORNI_CONTATTATO)
      .sort((a, b) => a.data - b.data);
    if (freddi.length) {
      const primi = freddi.slice(0, 8);
      blocchi.push(
        `CONTATTATI E MAI CHIUSI (${freddi.length})\n` +
          primi.map((l) => riga(l, `${giorniDa(l.data)} giorni`)).join('\n') +
          (freddi.length > primi.length ? `\n…e altri ${freddi.length - primi.length}.` : '') +
          '\nSe non se ne fa nulla, meglio metterli "Perso": cosi\' i numeri dicono la verita\'.',
      );
    }

    // --- clienti nati da un lead ma senza riga nell'anagrafica --------------
    // Colonne di Clienti-Impianti: A Codice, B Nome, G Zona giro, H Tipo impianto.
    const anagrafica = await leggi(token, 'Clienti-Impianti!A5:L1000');
    const schede = new Map();
    for (const r of anagrafica) {
      const k = chiaveNome(r[1] || '');
      if (k) schede.set(k, { codice: r[0] || '?', zona: (r[6] || '').trim(), impianto: (r[7] || '').trim() });
    }

    const senzaScheda = [];
    const daCompletare = [];
    for (const l of lead.filter((x) => x.stato === 'Cliente')) {
      const scheda = schede.get(chiaveNome(l.nome));
      if (!scheda) { senzaScheda.push(l); continue; }
      const mancano = [!scheda.impianto && 'tipo impianto', !scheda.zona && 'zona giro'].filter(Boolean);
      if (mancano.length) daCompletare.push(`• ${l.nome} (${scheda.codice}) — manca ${mancano.join(' e ')}`);
    }

    if (senzaScheda.length) {
      blocchi.push(
        `CLIENTI SENZA SCHEDA (${senzaScheda.length})\n` +
          senzaScheda.map((l) => `• ${l.nome} — lead del ${l.dataTesto.split(',')[0]}, riga ${l.riga}`).join('\n') +
          '\nRisultano "Cliente" nei lead ma non compaiono in Clienti-Impianti.',
      );
    }
    if (daCompletare.length) {
      blocchi.push(
        `SCHEDE CLIENTE DA COMPLETARE (${daCompletare.length})\n` +
          daCompletare.join('\n') +
          '\nSenza tipo impianto e zona giro non entrano nel giro manutenzioni.',
      );
    }

    // --- come sta convertendo ogni canale ----------------------------------
    const perCanale = new Map();
    for (const l of lead) {
      const k = l.provenienza || 'Non indicata';
      const v = perCanale.get(k) || { tot: 0, clienti: 0 };
      v.tot += 1;
      if (l.stato === 'Cliente') v.clienti += 1;
      perCanale.set(k, v);
    }
    const conversione = [...perCanale.entries()]
      .sort((a, b) => b[1].tot - a[1].tot)
      .map(([k, v]) => `• ${k}: ${v.clienti} ${v.clienti === 1 ? 'cliente' : 'clienti'} su ${v.tot} (${Math.round((v.clienti / v.tot) * 100)}%)`)
      .join('\n');
    blocchi.push(`CONVERSIONE PER PROVENIENZA (da sempre)\n${conversione}`);
  }

  if (!blocchi.length) {
    console.log('Niente da segnalare: nessun lead fermo.');
    return;
  }

  const testo = `Agente lead — ${new Date().toLocaleDateString('it-IT')}\n\n${blocchi.join('\n\n')}`;

  if (!TELEGRAM_READY) {
    console.log('(Telegram non configurato: stampo qui)\n');
    console.log(testo);
    return;
  }
  await sendTelegram(testo);
  console.log(`Avviso inviato: ${blocchi.length} blocchi, ${daRichiamare.length} da richiamare.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
