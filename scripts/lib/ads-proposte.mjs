// ============================================================================
//  LE PROPOSTE DELL'AGENTE ADS — dove stanno, e cosa succede quando Matteo decide
//
//  agenti/ads/proposte.json tiene la storia: una voce per proposta, con data,
//  stato e quante modifiche. L'elenco delle modifiche e' cifrato (il repo e'
//  pubblico): vedi lib/ads-azioni.mjs.
//
//  Stati: in attesa → applicata | rifiutata | scaduta | superata (ne e' arrivata
//  una nuova) | annullata (Matteo ha scritto ANNULLA ADS dopo averla approvata).
//
//  La crea scripts/ads-manda.mjs (il 18 del mese, dopo la revisione). La chiude
//  scripts/risposte.mjs quando Matteo risponde su Telegram:
//    APPROVA ADS            le applica tutte
//    APPROVA ADS 1 3        solo quelle coi numeri detti
//    RIFIUTA ADS [motivo]   non tocca niente; il motivo va fra le lezioni
//    ANNULLA ADS            rimette com'era l'ultima proposta applicata
//
//  Qui dentro niente Telegram: ogni funzione torna il testo da mandare, e chi la
//  chiama lo manda. Se qualcosa si e' rotto torna anche `guasto`: la frase per il
//  Meccanico (lib/meccanico.mjs), perche' un guasto non si rimanda a Matteo.
//  Nel log vanno solo i conteggi.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { struttura, muta } from './ads.mjs';
import { loadKey } from './gsc.mjs';
import { controlla, operazioni, registro, contrario, riga, cifra, decifra, LIMITI } from './ads-azioni.mjs';

export const FILE = 'agenti/ads/proposte.json';
const GIORNO = 24 * 60 * 60 * 1000;

export const leggi = (dir = '.') => (existsSync(join(dir, FILE)) ? JSON.parse(readFileSync(join(dir, FILE), 'utf8')) : []);
export function salva(elenco, dir = '.') {
  mkdirSync(dirname(join(dir, FILE)), { recursive: true });
  writeFileSync(join(dir, FILE), `${JSON.stringify(elenco, null, 2)}\n`);
}
export const inAttesa = (elenco) => elenco.filter((p) => p.stato === 'in attesa');
const quante = (n) => (n === 1 ? 'una modifica' : `${n} modifiche`);
const giornoIt = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** Aggiunge una proposta nuova all'elenco. Quella che aspettava ancora e' superata. */
export function nuova(elenco, buone, adesso = new Date()) {
  const ora = adesso.toISOString();
  for (const p of elenco) if (p.stato === 'in attesa') Object.assign(p, { stato: 'superata', decisa: ora });
  let id = `ads-${ora.slice(0, 10)}`;
  for (let n = 2; elenco.some((p) => p.id === id); n += 1) id = `ads-${ora.slice(0, 10)}-${n}`;
  const p = {
    id, tipo: 'ADS', titolo: `${quante(buone.length)} a Google Ads`, creata: ora, stato: 'in attesa',
    quante: buone.length, cifrato: cifra({ azioni: buone }),
  };
  elenco.push(p);
  return p;
}

const senzaPermesso = () =>
  'Non ho potuto farlo: su Google Ads il mio accesso è ancora di sola lettura, e Google mi ha fermato. Non è cambiato niente.\n\n' +
  'Per darmi il permesso: Google Ads → Amministratore → Accesso e sicurezza → Utenti → ' +
  `${loadKey().client_email} → livello di accesso → Standard.\n` +
  'Poi riscrivimi lo stesso ordine: la proposta resta in attesa.';

/**
 * APPROVA ADS. `solo` e' l'elenco dei numeri scelti (vuoto = tutte).
 * Torna { testo, nota }: il messaggio per Matteo e, se ha applicato qualcosa, la
 * nota per la bacheca (senza ricerche e senza cifre: la bacheca e' pubblica).
 */
export async function applica(id, solo = [], adesso = new Date()) {
  const elenco = leggi();
  const p = elenco.find((x) => x.id === id && x.stato === 'in attesa');
  if (!p) return { testo: 'Non c\'è nessuna proposta per la pubblicità in attesa: non ho fatto niente.' };

  const giorni = Math.floor((adesso - new Date(p.creata)) / GIORNO);
  if (giorni > LIMITI.giorniValida) {
    Object.assign(p, { stato: 'scaduta', decisa: adesso.toISOString() });
    salva(elenco);
    return { testo: `La proposta è del ${giornoIt(p.creata)}, ${giorni} giorni fa: nel frattempo i numeri sono cambiati e non la applico. Con la revisione del 18 te ne porto una nuova.` };
  }

  let azioni;
  try {
    azioni = decifra(p.cifrato).azioni;
  } catch {
    return {
      testo: 'Non riesco a rileggere la proposta: è cambiata la chiave con cui era stata chiusa. Su Google Ads non ho toccato niente.',
      guasto: `Matteo ha scritto APPROVA ADS ma la proposta ${p.id} (agenti/ads/proposte.json) non si decifra: la chiave del service account in GSC_KEY_JSON è cambiata da quando è stata creata. La proposta non è recuperabile: va segnata "superata", e a Matteo va detto che la prossima arriva con la revisione del 18.`,
    };
  }
  const fuori = solo.filter((n) => n < 1 || n > azioni.length);
  if (fuori.length) {
    return { testo: `La proposta ha ${quante(azioni.length)}, numerate da 1 a ${azioni.length}: ${fuori.join(', ')} non c'è. Non ho fatto niente.` };
  }
  const scelte = solo.length ? azioni.filter((_, i) => solo.includes(i + 1)) : azioni;

  // Si ricontrolla sull'account di oggi: dalla proposta possono essere passati giorni.
  let buone, scartate, indirizzi;
  try {
    ({ buone, scartate } = controlla(scelte, await struttura()));
    indirizzi = await muta(operazioni(buone));
  } catch (e) {
    console.log(`Google Ads: modifiche non applicate (${e.codice || 'errore'}).`);
    if (e.senzaPermesso) return { testo: senzaPermesso() };
    const quale = e.indice !== null && e.indice !== undefined && buone?.[e.indice] ? `\nIl problema è qui: ${riga(buone[e.indice])}.` : '';
    return {
      testo: `Google Ads ha rifiutato le modifiche e non ne ha applicata nessuna: ${e.message}${quale}\nLa proposta resta in attesa: intanto puoi approvare le altre coi loro numeri.`,
      guasto: `Matteo ha scritto APPROVA ADS ma Google Ads ha rifiutato le modifiche della proposta ${p.id} (errore ${e.codice || 'sconosciuto'}): nessuna è stata applicata, la proposta resta in attesa. Guarda il log del passo "Leggi le risposte ed esegui" e scripts/lib/ads.mjs (muta).`,
    };
  }

  const nonApplicate = scartate.length ? `\n\nNon applicate:\n${scartate.map((s) => `• ${riga(s.azione)} — ${s.motivo}`).join('\n')}` : '';
  const lasciate = azioni.length - scelte.length;
  if (!buone.length) {
    Object.assign(p, { stato: 'superata', decisa: adesso.toISOString() });
    salva(elenco);
    return { testo: `Non c'era più niente da applicare: su Google Ads non ho cambiato nulla.${nonApplicate}` };
  }

  Object.assign(p, {
    stato: 'applicata', decisa: adesso.toISOString(), applicate: buone.length,
    ...(solo.length && { scelte: solo }),
    registro: cifra({ voci: registro(buone, indirizzi) }),
  });
  salva(elenco);
  console.log(`Google Ads: ${buone.length} modifiche applicate, ${scartate.length} scartate al ricontrollo.`);

  const esclusioni = buone.filter((a) => a.tipo === 'escludi').length;
  const pause = buone.length - esclusioni;
  const cosa = [esclusioni && (esclusioni === 1 ? 'una ricerca esclusa' : `${esclusioni} ricerche escluse`), pause && (pause === 1 ? 'una pausa' : `${pause} pause`)].filter(Boolean).join(', ');
  return {
    testo:
      `Fatto: ${quante(buone.length)} su Google Ads.\n\n${buone.map((a) => `• ${riga(a, 'fatta')}`).join('\n')}${nonApplicate}` +
      (lasciate ? `\n\n${lasciate === 1 ? 'L\'altra l\'ho lasciata' : `Le altre ${lasciate} le ho lasciate`} stare.` : '') +
      '\n\nBudget, offerte e campagne non li ho toccati. Se cambi idea scrivi ANNULLA ADS e rimetto tutto com\'era.',
    nota: `Matteo ha approvato su Telegram la proposta per Google Ads del ${giornoIt(p.creata)}: ${buone.length === 1 ? 'applicata' : 'applicate'} ${quante(buone.length)} (${cosa}). Budget e offerte non toccati. La revisione del mese prossimo dice se hanno funzionato.`,
  };
}

/** RIFIUTA ADS. Torna { testo, lezione }: la lezione, se c'e' un motivo, va nel file delle lezioni. */
export function rifiuta(id, motivo, adesso = new Date()) {
  const elenco = leggi();
  const p = elenco.find((x) => x.id === id && x.stato === 'in attesa');
  if (!p) return { testo: 'Non c\'è nessuna proposta per la pubblicità in attesa: non ho fatto niente.' };
  Object.assign(p, { stato: 'rifiutata', decisa: adesso.toISOString(), ...(motivo && { motivo }) });
  salva(elenco);
  return {
    testo: 'Rifiutata: su Google Ads non ho toccato niente.' +
      (motivo ? '\nIl motivo l\'ho segnato: lo rileggo prima della prossima revisione.' : '\nLa prossima volta scrivi anche il perché (RIFIUTA ADS e il motivo): mi serve per non riproporle.'),
    lezione: motivo ? `proposta di modifiche a Google Ads del ${giornoIt(p.creata)} rifiutata: ${motivo}` : null,
  };
}

/** ANNULLA ADS: rimette com'era l'ultima proposta applicata. Una modifica per volta, cosi' una che non va non blocca le altre. */
export async function annulla(adesso = new Date()) {
  const elenco = leggi();
  const p = [...elenco].reverse().find((x) => x.stato === 'applicata' && x.registro);
  if (!p) return { testo: 'Non c\'è niente da annullare: non ho modifiche mie su Google Ads ancora in piedi.' };

  let voci;
  try {
    voci = decifra(p.registro).voci;
  } catch {
    return {
      testo: 'Non riesco a rileggere cosa avevo applicato: è cambiata la chiave con cui l\'avevo chiuso. Su Google Ads non ho toccato niente.',
      guasto: `Matteo ha scritto ANNULLA ADS ma il registro delle modifiche applicate con la proposta ${p.id} (agenti/ads/proposte.json) non si decifra: la chiave in GSC_KEY_JSON è cambiata. Le modifiche sono ancora su Google Ads: a Matteo va scritto quali togliere a mano (stanno nel messaggio "Fatto: ..." che ha ricevuto quel giorno su Telegram).`,
    };
  }
  const tornate = [], rimaste = [];
  for (const voce of voci) {
    try {
      await muta([contrario(voce)]);
      tornate.push(voce);
    } catch (e) {
      if (e.senzaPermesso) return { testo: senzaPermesso() };
      rimaste.push({ voce, motivo: e.message });
    }
  }
  Object.assign(p, {
    stato: rimaste.length ? 'applicata' : 'annullata', annullata: adesso.toISOString(),
    registro: rimaste.length ? cifra({ voci: rimaste.map((r) => r.voce) }) : undefined,
  });
  salva(elenco);
  console.log(`Google Ads: ${tornate.length} modifiche annullate, ${rimaste.length} non riuscite.`);
  return {
    testo:
      (tornate.length ? `Annullato: ho rimesso com'era ${quante(tornate.length)} del ${giornoIt(p.decisa)}.\n\n${tornate.map((v) => `• ${riga(v, 'annullata')}`).join('\n')}` : 'Non sono riuscito ad annullare niente.') +
      (rimaste.length ? `\n\nQueste non sono riuscito a rimetterle (forse le hai già cambiate tu a mano):\n${rimaste.map((r) => `• ${riga(r.voce, 'fatta')} — ${r.motivo}`).join('\n')}` : ''),
    nota: tornate.length ? `Matteo ha annullato le modifiche a Google Ads applicate il ${giornoIt(p.decisa)}: rimesse com'erano.` : null,
  };
}

/**
 * La storia delle proposte per l'analisi del mese dopo: cosa era stato proposto,
 * cosa e' stato applicato, cosa rifiutato e perche'. Va nei dati in /tmp, mai nel
 * repo in chiaro.
 */
export function storia(ultime = 6) {
  return leggi().slice(-ultime).map((p) => {
    let azioni = [];
    try { azioni = decifra(p.cifrato).azioni; } catch { /* chiave cambiata: resta la riga senza il dettaglio */ }
    return {
      proposta: p.creata.slice(0, 10), stato: p.stato, decisa: p.decisa?.slice(0, 10), motivoDelRifiuto: p.motivo,
      modifiche: azioni.map((a, i) => ({
        cosa: riga(a), perche: a.perche,
        applicata: p.stato === 'applicata' ? !p.scelte || p.scelte.includes(i + 1) : false,
      })),
    };
  });
}
