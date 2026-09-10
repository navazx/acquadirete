#!/usr/bin/env node
// ============================================================================
//  AGENTE SOCIAL — passo 2: esegue la risposta di Matteo
//
//  Gira ogni mezz'ora nelle ore di veglia. Se c'e' una bozza in attesa legge
//  Telegram e fa quello che gli e' stato detto:
//    PUBBLICA        -> variante 1 su Facebook e Instagram
//    PUBBLICA 2 / 3  -> la variante scelta
//    SCARTA          -> archivia senza pubblicare
//  Qualsiasi altra cosa viene ignorata: nel dubbio non si pubblica.
//
//  Se non c'e' bozza, o Matteo non ha risposto, non fa e non dice niente.
// ============================================================================

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { messaggio, risposte, conferma } from './lib/telegram.mjs';
import { pubblicaFacebook, pubblicaInstagram } from './lib/meta.mjs';

const BOZZA = 'agenti/social-bozza.json';
const STATO = 'agenti/social-stato.json';
const SITO = 'https://www.acquadirete.it';

const leggiStato = () => (existsSync(STATO) ? JSON.parse(readFileSync(STATO, 'utf8')) : { ultimoUpdate: 0 });
const salva = (f, o) => writeFileSync(f, `${JSON.stringify(o, null, 2)}\n`);

/** Legge l'ordine piu' recente fra i messaggi arrivati. Torna null se non ce n'e'. */
function ordine(testi) {
  for (const testo of [...testi].reverse()) {
    const t = testo.toUpperCase().replace(/\s+/g, ' ').trim();
    if (t === 'SCARTA') return { azione: 'scarta' };
    if (t === 'RIMANDA' || t === 'SALTA') return { azione: 'rimanda' };
    const m = t.match(/^PUBBLICA(?:\s+([123]))?$/);
    if (m) return { azione: 'pubblica', variante: Number(m[1] || 1) };
  }
  return null;
}

async function main() {
  if (!existsSync(BOZZA)) return;
  const bozza = JSON.parse(readFileSync(BOZZA, 'utf8'));
  if (bozza.pubblicato || bozza.scartato) return;

  const stato = leggiStato();
  const { testi, ultimo } = await risposte(stato.ultimoUpdate);
  if (!testi.length) return;

  // Si consuma SEMPRE quello che si e' letto, ordine o no: altrimenti un "ciao"
  // resterebbe in coda per sempre e verrebbe riletto ogni mezz'ora.
  // E si consuma PRIMA di pubblicare: se il commit dello stato fallisse,
  // l'ordine e' comunque gia' sparito dalla coda di Telegram. Meglio un ordine
  // perso che un post doppio.
  await conferma(ultimo);
  salva(STATO, { ultimoUpdate: ultimo });

  const cosa = ordine(testi);
  if (!cosa) {
    // Un "PUBBLICA 9" o un "pubblica domani" sono tentativi andati a vuoto:
    // meglio dirlo, altrimenti resta a credere di aver pubblicato.
    if (testi.some((t) => /^\s*(pubblica|scarta|rimanda|salta)/i.test(t))) {
      await messaggio(
        'Non ho capito e non ho pubblicato niente.\n' +
        'Gli ordini che riconosco sono esattamente questi:\n' +
        'PUBBLICA (oppure PUBBLICA 2, PUBBLICA 3)\nRIMANDA\nSCARTA',
      );
    }
    return;
  }

  if (cosa.azione === 'scarta') {
    salva(BOZZA, { ...bozza, scartato: new Date().toISOString() });
    await messaggio('Bozza scartata, non ho pubblicato niente. Sabato te ne preparo una nuova.');
    console.log('Scartata.');
    return;
  }

  // RIMANDA non butta niente: toglie il segno di "gia' mandata", e per questo
  // sabato la stessa bozza torna identica. La differenza con SCARTA e' tutta qui:
  // scartare chiude la partita, rimandare la rimette in fila.
  if (cosa.azione === 'rimanda') {
    const rimandi = (bozza.rimandi || 0) + 1;
    const { inviato, ...resto } = bozza;
    salva(BOZZA, { ...resto, rimandata: new Date().toISOString(), rimandi });
    await messaggio(
      `Niente post questa settimana. Le idee restano: te le ripropongo sabato.` +
      (rimandi >= 3 ? '\n\nSiamo a tre rimandi: se non ti convincono, SCARTA e ne preparo di nuove.' : ''),
    );
    console.log(`Rimandata (${rimandi}).`);
    return;
  }

  const variante = bozza.varianti[cosa.variante - 1];
  if (!variante) {
    await messaggio(`Non ho la variante ${cosa.variante}: ce ne sono ${bozza.varianti.length}.`);
    return;
  }

  const didascalia = [variante.testo, '', (variante.hashtag || []).join(' ')].join('\n').trim();
  const urlFoto = bozza.foto ? `${SITO}/${bozza.foto.replace(/^\/+/, '')}` : null;

  const esiti = {};
  const errori = [];

  try {
    esiti.facebook = await pubblicaFacebook(didascalia, urlFoto);
  } catch (e) {
    errori.push(`Facebook: ${e.message}`);
  }

  // Instagram non pubblica senza immagine: non e' un errore, e' un limite suo.
  if (urlFoto) {
    try {
      esiti.instagram = await pubblicaInstagram(didascalia, urlFoto);
    } catch (e) {
      errori.push(`Instagram: ${e.message}`);
    }
  } else {
    esiti.instagram = { saltato: 'nessuna foto: Instagram le pretende' };
  }

  salva(BOZZA, {
    ...bozza,
    pubblicato: new Date().toISOString(),
    variantePubblicata: cosa.variante,
    esiti,
    errori: errori.length ? errori : undefined,
  });

  const righe = [`Pubblicata la variante ${cosa.variante}.`, ''];
  if (esiti.facebook) righe.push(`Facebook: ${esiti.facebook.url}`);
  if (esiti.instagram?.id) righe.push('Instagram: pubblicato');
  if (esiti.instagram?.saltato) righe.push(`Instagram: saltato (${esiti.instagram.saltato})`);
  if (errori.length) righe.push('', 'Non e\' andato tutto liscio:', ...errori.map((e) => `• ${e}`));
  await messaggio(righe.join('\n'));

  console.log(errori.length ? `Pubblicato con errori: ${errori.join(' | ')}` : 'Pubblicato su entrambi.');
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
