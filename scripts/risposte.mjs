#!/usr/bin/env node
// ============================================================================
//  RISPOSTE SU TELEGRAM — l'unico che legge quello che Matteo scrive al bot
//
//  Gira ogni mezz'ora nelle ore di veglia. E' uno solo di proposito: Telegram
//  consegna ogni messaggio a chi lo legge per primo, quindi due lettori si
//  ruberebbero gli ordini a vicenda.
//
//  Ordini riconosciuti:
//    post social   PUBBLICA [1|2|3] · RIMANDA (o SALTA) · SCARTA
//    proposte      APPROVA [ARTICOLO|SEO] · RIFIUTA [ARTICOLO|SEO] [motivo]
//                  CORREGGI [ARTICOLO|SEO] <cosa cambiare> — la riscrive e la
//                  ripropone (anche un RIFIUTA che chiede di correggere vale cosi')
//    foto          una foto (o un'immagine mandata come file) finisce fra quelle
//                  per i post, in public/assets/social/. Il workflow poi la mette
//                  in riga per Instagram e la manda online col sito.
//
//  Una proposta e' un ramo proposta/... preparato da un agente: un articolo, delle
//  correzioni SEO. APPROVA lo unisce a main e Netlify lo mette online. RIFIUTA
//  cancella il ramo; il motivo, se c'e', finisce fra le lezioni che l'agente dei
//  contenuti rilegge prima del prossimo articolo.
//
//  Qualsiasi altra cosa non fa nulla: nel dubbio si sta fermi.
//  Legge sempre, anche senza niente in sospeso: una foto puo' arrivare quando
//  vuole. Un ordine arrivato quando non c'e' niente da decidere riceve risposta
//  ("non c'e' nessun post in attesa") invece di restare in coda e scattare
//  settimane dopo su una bozza che Matteo non ha mai visto.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { messaggio, risposte, conferma, scaricaFile } from './lib/telegram.mjs';
import { pubblicaFacebook, pubblicaInstagram } from './lib/meta.mjs';

const BOZZA = 'agenti/social-bozza.json';
const STATO = 'agenti/telegram-stato.json';
const PROPOSTE = 'agenti/proposte.json';
const LEZIONI = 'agenti/contenuti/lezioni.md';
const SITO = 'https://www.acquadirete.it';
const CARTELLA_FOTO = 'public/assets/social';
const NOTE_FOTO = 'agenti/social-foto-note.json';

const AIUTO =
  'Non ho capito, e non ho fatto niente.\n' +
  'Gli ordini che riconosco sono questi:\n\n' +
  'Per il post: PUBBLICA (oppure PUBBLICA 2, PUBBLICA 3) · RIMANDA · SCARTA\n' +
  'Per le proposte: APPROVA ARTICOLO · CORREGGI ARTICOLO e cosa cambiare · RIFIUTA ARTICOLO e il motivo\n' +
  'Per i post: mandami una foto e la metto fra quelle da usare';

const leggiJson = (f, vuoto) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : vuoto);
const salva = (f, o) => writeFileSync(f, `${JSON.stringify(o, null, 2)}\n`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const oggi = () => new Date().toISOString();

/** Traduce un messaggio in un ordine. Null se non lo e'. */
export function ordine(testo) {
  const pulito = String(testo).replace(/\s+/g, ' ').trim();
  const t = pulito.toUpperCase();

  if (t === 'SCARTA') return { argomento: 'social', azione: 'scarta' };
  if (t === 'RIMANDA' || t === 'SALTA') return { argomento: 'social', azione: 'rimanda' };
  const p = t.match(/^PUBBLICA(?: ([123]))?$/);
  if (p) return { argomento: 'social', azione: 'pubblica', variante: Number(p[1] || 1) };

  const a = pulito.match(/^(approva|rifiuta|correggi)(?: (articolo|seo|ordini))?\b[\s:,.-]*(.*)$/i);
  if (a) {
    let azione = a[1].toLowerCase();
    const tipo = a[2] ? a[2].toUpperCase() : null;
    const motivo = (a[3] || '').trim();
    // "approva domani" o "approva l'articolo" non sono ordini: meglio chiedere
    // che approvare per sbaglio.
    if (azione === 'approva' && motivo) return null;
    // Un RIFIUTA che chiede di correggere e' un CORREGGI: il 5 ott 2026 Matteo ha
    // scritto "RIFIUTA ... correggi l'articolo e riproponimelo in giornata", e
    // l'articolo e' finito nel cestino.
    if (azione === 'rifiuta' && /\b(corregg|riscriv|ripropon|rifall|sistemal)/i.test(motivo)) azione = 'correggi';
    return { argomento: 'proposta', azione, tipo, motivo };
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Post social
// ---------------------------------------------------------------------------

async function eseguiSocial(o) {
  const bozza = existsSync(BOZZA) ? leggiJson(BOZZA) : null;
  if (!bozza || bozza.pubblicato || bozza.scartato) {
    await messaggio('Non c\'è nessun post in attesa: non ho fatto niente.');
    return;
  }

  if (o.azione === 'scarta') {
    salva(BOZZA, { ...bozza, scartato: oggi() });
    await messaggio('Bozza scartata, non ho pubblicato niente. Sabato te ne preparo una nuova.');
    return;
  }

  // RIMANDA non butta niente: toglie il segno di "gia' mandata", e per questo
  // sabato la stessa bozza torna identica.
  if (o.azione === 'rimanda') {
    const rimandi = (bozza.rimandi || 0) + 1;
    const { inviato, ...resto } = bozza;
    salva(BOZZA, { ...resto, rimandata: oggi(), rimandi });
    await messaggio(
      'Niente post questa settimana. Le idee restano: te le ripropongo sabato.' +
      (rimandi >= 3 ? '\n\nSiamo a tre rimandi: se non ti convincono, SCARTA e ne preparo di nuove.' : ''),
    );
    return;
  }

  const variante = bozza.varianti[o.variante - 1];
  if (!variante) {
    await messaggio(`Non ho la variante ${o.variante}: ce ne sono ${bozza.varianti.length}.`);
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
    pubblicato: oggi(),
    variantePubblicata: o.variante,
    esiti,
    errori: errori.length ? errori : undefined,
  });

  const righe = [`Pubblicata la variante ${o.variante}.`, ''];
  if (esiti.facebook) righe.push(`Facebook: ${esiti.facebook.url}`);
  if (esiti.instagram?.id) righe.push('Instagram: pubblicato');
  if (esiti.instagram?.saltato) righe.push(`Instagram: saltato (${esiti.instagram.saltato})`);
  if (errori.length) righe.push('', 'Non è andato tutto liscio:', ...errori.map((e) => `• ${e}`));
  await messaggio(righe.join('\n'));
}

// ---------------------------------------------------------------------------
//  Proposte (rami proposta/...)
// ---------------------------------------------------------------------------

function aggiorna(ramo, campi) {
  const elenco = leggiJson(PROPOSTE, []);
  const i = elenco.findIndex((p) => p.ramo === ramo);
  if (i >= 0) elenco[i] = { ...elenco[i], ...campi };
  salva(PROPOSTE, elenco);
}

async function approva(p) {
  try {
    git('pull', '--ff-only', 'origin', 'main');
    git('fetch', 'origin', p.ramo);
    git('merge', '--no-ff', 'FETCH_HEAD', '-m', `Approvato da Matteo: ${p.titolo}`);
  } catch (e) {
    try { git('merge', '--abort'); } catch { /* niente da annullare */ }
    console.log(e.stderr || e.message);
    aggiorna(p.ramo, { problema: `non si unisce a main (${oggi()})` });
    await messaggio(
      `Non riesco a mettere online «${p.titolo}»: nel frattempo il sito è cambiato negli stessi punti.\n` +
      'Resta in attesa. Chiedi a Claude dal PC di sistemarla.',
    );
    return;
  }

  // Prima si pubblica, poi si dice che e' pubblicato.
  git('push', 'origin', 'HEAD:main');
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'approvata', decisa: oggi() });

  await messaggio(
    `Approvato: «${p.titolo}» va online fra un paio di minuti.` + (p.url ? `\n${p.url}` : ''),
  );
}

async function rifiuta(p, motivo) {
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'rifiutata', decisa: oggi(), motivo: motivo || undefined });

  if (motivo && p.tipo === 'ARTICOLO') {
    appendFileSync(LEZIONI, `\n- ${oggi().slice(0, 10)} — «${p.titolo}» rifiutato: ${motivo}\n`);
  }

  await messaggio(
    `Rifiutato: «${p.titolo}» non va online.` +
    (motivo
      ? '\nIl motivo l\'ho segnato: l\'agente lo rilegge prima di scrivere il prossimo.'
      : '\nLa prossima volta scrivi anche il perché (RIFIUTA ARTICOLO e il motivo): l\'agente lo terrà a mente.'),
  );
}

async function eseguiProposta(o, aperte) {
  const candidate = o.tipo ? aperte.filter((p) => p.tipo === o.tipo) : aperte;
  const verbo = o.azione.toUpperCase();

  if (!candidate.length) {
    await messaggio(`Non c'è nessuna proposta${o.tipo ? ` ${o.tipo.toLowerCase()}` : ''} in attesa: non ho fatto niente.`);
    return;
  }
  if (candidate.length > 1) {
    const tipi = [...new Set(candidate.map((p) => p.tipo))];
    await messaggio(`Ci sono ${candidate.length} proposte in attesa: scrivi ${tipi.map((t) => `${verbo} ${t}`).join(' oppure ')}.`);
    return;
  }
  if (o.azione === 'approva') await approva(candidate[0]);
  else if (o.azione === 'correggi') await correggi(candidate[0], o.motivo);
  else await rifiuta(candidate[0], o.motivo);
}

/**
 * CORREGGI: il ramo resta, e parte "Proposta - correggila" (correggi-proposta.yml),
 * che lo riscrive con le note di Matteo e lo rispinge. Il push fa ripartire
 * "Proposta - presentala a Matteo", che lo rimette in attesa e glielo rimanda.
 */
async function correggi(p, note) {
  if (!note) {
    await messaggio(`Cosa devo cambiare? Scrivi CORREGGI ${p.tipo} e subito dopo le correzioni, nello stesso messaggio.`);
    return;
  }
  aggiorna(p.ramo, { stato: 'da correggere', correzioni: [...(p.correzioni || []), { note, chiesta: oggi() }] });
  if (p.tipo === 'ARTICOLO') {
    appendFileSync(LEZIONI, `\n- ${oggi().slice(0, 10)} — «${p.titolo}» da correggere: ${note}\n`);
  }
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY || 'navazx/acquadirete'}/actions/workflows/correggi-proposta.yml/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main', inputs: { ramo: p.ramo, note: note.slice(0, 2000) } }),
  });
  if (res.status !== 204) {
    console.log(`Avvio della correzione rifiutato: HTTP ${res.status} ${await res.text()}`);
    aggiorna(p.ramo, { stato: 'in attesa' });
    await messaggio(`Non sono riuscito a far partire la correzione di «${p.titolo}». Resta in attesa com'era: chiedi a Claude dal PC.`);
    return;
  }
  await messaggio(
    `Ricevuto: correggo «${p.titolo}» con le tue note e te lo ripropongo appena è pronto, di solito entro mezz'ora.\n` +
    'Non è andato online niente.',
  );
}

// ---------------------------------------------------------------------------
//  Foto per i post
// ---------------------------------------------------------------------------

const TENTATIVO = /^\s*(pubblica|scarta|rimanda|salta|approva|rifiuta|correggi)/i;

/**
 * Nome della foto senza estensione: data e numero del messaggio, cosi' due foto
 * non si pestano. E' anche la chiave delle note, perche' un HEIC diventa .jpg.
 */
export const chiaveFoto = (f, giorno = oggi().slice(0, 10)) => `tg-${giorno}-${f.messaggio}`;

export function nomeFoto(f, percorsoTelegram, giorno) {
  const da = f.nome || percorsoTelegram || '';
  const est = (da.match(/\.([a-z0-9]{2,5})$/i)?.[1] || 'jpg').toLowerCase();
  return `${chiaveFoto(f, giorno)}.${est}`;
}

/**
 * Un messaggio di testo che non e' un ordine, mandato entro due minuti da una
 * foto senza didascalia, e' la sua descrizione: capita spesso di mandare prima
 * la foto e poi scrivere. Con piu' foto di fila (un album) vale per tutte.
 * Toglie da `testi` quelli usati, cosi' non vengono letti anche come ordini.
 */
export function attaccaNote(foto, messaggi, eOrdine = ordine) {
  const usati = new Set();
  for (const m of messaggi) {
    if (eOrdine(m.testo) || TENTATIVO.test(m.testo)) continue;
    const vicine = foto.filter((f) => !f.nota && m.data >= f.data && m.data - f.data <= 120);
    if (!vicine.length) continue;
    for (const f of vicine) f.nota = m.testo;
    usati.add(m);
  }
  return messaggi.filter((m) => !usati.has(m)).map((m) => m.testo);
}

async function salvaFoto(elenco) {
  // Le note stanno qui e non accanto alla foto: la cartella delle foto va online
  // col sito, e in una nota puo' esserci il nome del cliente o la via.
  // La chiave e' il nome senza estensione, perche' un HEIC diventa .jpg.
  const note = leggiJson(NOTE_FOTO, {});
  let salvate = 0;
  const errori = [];
  for (const f of elenco) {
    try {
      const { dati, percorso } = await scaricaFile(f.fileId);
      writeFileSync(`${CARTELLA_FOTO}/${nomeFoto(f, percorso)}`, dati);
      if (f.nota) note[f.chiave] = { nota: f.nota, arrivata: oggi() };
      salvate += 1;
    } catch (e) {
      errori.push(e.message);
    }
  }
  if (Object.keys(note).length) salva(NOTE_FOTO, note);
  const inCartella = readdirSync(CARTELLA_FOTO).filter((n) => !n.startsWith('.')).length;
  const righe = [];
  if (salvate) {
    const la = salvate === 1 ? 'la' : 'le';
    righe.push(
      `${salvate === 1 ? 'Foto ricevuta' : `${salvate} foto ricevute`}: ${la} metto fra quelle per i post (ora sono ${inCartella}).`,
      `L'agente social ${la} guarda da sé quando prepara la bozza del sabato.`,
    );
    const scritte = [...new Set(elenco.map((f) => f.nota).filter(Boolean))];
    righe.push(
      '',
      scritte.length
        ? `Userà anche quello che hai scritto:\n${scritte.map((n) => `• «${n}»`).join('\n')}`
        : 'Se vuoi dirgli che impianto è o dove, scrivilo insieme alla foto (o subito dopo).',
    );
  }
  if (errori.length) righe.push('', `Non sono riuscito a salvarne ${errori.length}:`, ...errori.map((e) => `• ${e}`));
  await messaggio(righe.join('\n'));
}

// ---------------------------------------------------------------------------

async function main() {
  const aperte = leggiJson(PROPOSTE, []).filter((p) => p.stato === 'in attesa');

  const { ultimoUpdate = 0, ultimaFoto } = leggiJson(STATO, {});
  const { messaggi, foto, ultimo } = await risposte(ultimoUpdate);
  if (ultimo === ultimoUpdate) return;
  for (const f of foto) f.chiave = chiaveFoto(f);

  // La foto puo' essere gia' stata salvata al giro prima, e la descrizione
  // arrivare adesso: il lettore gira ogni quarto d'ora, non aspetta.
  const precedente = ultimaFoto && !ultimaFoto.nota ? [{ ...ultimaFoto }] : [];
  const testi = attaccaNote([...precedente, ...foto], messaggi);
  const ultimaOra = foto.length ? foto[foto.length - 1] : precedente[0] || ultimaFoto;

  // Si consuma SEMPRE quello che si e' letto, e PRIMA di agire: se qualcosa si
  // rompe a meta', l'ordine e' comunque sparito dalla coda di Telegram. Meglio un
  // ordine perso che un post doppio.
  await conferma(ultimo);
  salva(STATO, {
    ultimoUpdate: ultimo,
    ...(ultimaOra && { ultimaFoto: { chiave: ultimaOra.chiave, data: ultimaOra.data, nota: ultimaOra.nota } }),
  });

  if (foto.length) await salvaFoto(foto);
  if (precedente[0]?.nota) {
    const note = leggiJson(NOTE_FOTO, {});
    note[precedente[0].chiave] = { nota: precedente[0].nota, arrivata: oggi() };
    salva(NOTE_FOTO, note);
    await messaggio(`Ho attaccato la descrizione alla foto di prima: «${precedente[0].nota}»`);
  }

  // Vale l'ultimo ordine per ciascun argomento: un PUBBLICA dopo un RIMANDA vince.
  const ordini = new Map();
  let tentativiAVuoto = false;
  for (const testo of testi) {
    const o = ordine(testo);
    if (!o) {
      if (TENTATIVO.test(testo)) tentativiAVuoto = true;
      continue;
    }
    // Un APPROVA senza tipo, con una sola proposta aperta, e' per quella.
    if (o.argomento === 'proposta' && !o.tipo && aperte.length === 1) o.tipo = aperte[0].tipo;
    ordini.set(o.argomento === 'social' ? 'social' : `proposta:${o.tipo || '?'}`, o);
  }

  if (!ordini.size) {
    if (tentativiAVuoto) await messaggio(AIUTO);
    return;
  }

  for (const o of ordini.values()) {
    if (o.argomento === 'social') await eseguiSocial(o);
    else await eseguiProposta(o, aperte);
  }
}

const lanciatoDaTerminale = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (lanciatoDaTerminale) {
  main().catch((e) => {
    console.log(`Errore: ${e.message}`);
    process.exitCode = 1;
  });
}
