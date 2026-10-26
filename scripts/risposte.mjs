#!/usr/bin/env node
// ============================================================================
//  RISPOSTE SU TELEGRAM — l'unico che legge quello che Matteo scrive al bot
//
//  Gira ogni mezz'ora nelle ore di veglia. E' uno solo di proposito: Telegram
//  consegna ogni messaggio a chi lo legge per primo, quindi due lettori si
//  ruberebbero gli ordini a vicenda.
//
//  Ordini riconosciuti:
//    post social   PUBBLICA [1|2|3] · RIMANDA (o SALTA) · SCARTA [motivo]
//                  CORREGGI [POST] <cosa cambiare> — lo sistema e lo rimanda
//                  (anche uno SCARTA che chiede di correggere vale cosi')
//    proposte      APPROVA [ARTICOLO|SEO|ORDINI|RIPARAZIONE|RECENSIONI] · RIFIUTA [...] [motivo]
//                  CORREGGI [ARTICOLO|SEO] <cosa cambiare> — la riscrive e la
//                  ripropone (anche un RIFIUTA che chiede di correggere vale cosi')
//    pubblicita'   APPROVA ADS [1 3] · RIFIUTA ADS [motivo] · ANNULLA ADS
//                  Le modifiche a Google Ads preparate dall'agente Ads (escludere
//                  ricerche, mettere in pausa parole e annunci): APPROVA le
//                  applica, coi numeri solo quelle; ANNULLA rimette com'era
//                  l'ultima applicata. Vedi lib/ads-proposte.mjs.
//
//  Quello che Matteo corregge o rifiuta, col suo perche', finisce nel file delle
//  lezioni di quell'agente (vedi LEZIONI piu' sotto): lo rilegge ogni volta.
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
//
//  Ordine dato dal PC: quando Matteo decide in chat con Claude invece che su
//  Telegram, il workflow si avvia a mano con l'ordine scritto nel campo "ordine"
//  (ORDINE_A_MANO). Vale come un suo messaggio, e la ricevuta arriva su Telegram.
//  Legge sempre, anche senza niente in sospeso: una foto puo' arrivare quando
//  vuole. Un ordine arrivato quando non c'e' niente da decidere riceve risposta
//  ("non c'e' nessun post in attesa") invece di restare in coda e scattare
//  settimane dopo su una bozza che Matteo non ha mai visto.
// ============================================================================

import { readFileSync, writeFileSync, existsSync, appendFileSync, readdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { messaggio, risposte, conferma, scaricaFile, firma, CHI_PROPONE } from './lib/telegram.mjs';
import { pubblicaFacebook, pubblicaInstagram } from './lib/meta.mjs';
import { chiamaMeccanico } from './lib/meccanico.mjs';
import { leggi as proposteAds, inAttesa, applica as applicaAds, rifiuta as rifiutaAds, annulla as annullaAds } from './lib/ads-proposte.mjs';
import { lasciaNota } from './lib/bacheca.mjs';
import { segnaProva, attesaDa } from './lib/prove.mjs';
import { segnaDate, DATE } from './lib/date-aggiornamento.mjs';

const BOZZA = 'agenti/social-bozza.json';
const STATO = 'agenti/telegram-stato.json';
const PROPOSTE = 'agenti/proposte.json';
const SITO = 'https://www.acquadirete.it';
const CARTELLA_FOTO = 'public/assets/social';
const NOTE_FOTO = 'agenti/social-foto-note.json';

const AIUTO =
  'Non ho capito, e non ho fatto niente.\n' +
  'Gli ordini che riconosco sono questi:\n\n' +
  'Per il post: PUBBLICA (oppure PUBBLICA 2, PUBBLICA 3) · CORREGGI POST e cosa cambiare · RIMANDA · SCARTA\n' +
  'Per le proposte: APPROVA, CORREGGI o RIFIUTA col tipo scritto nel messaggio (ARTICOLO, SEO, RECENSIONI, RIPARAZIONE, ORDINI), es. CORREGGI ARTICOLO e cosa cambiare\n' +
  'Per la pubblicità: APPROVA ADS (oppure APPROVA ADS 1 3) · RIFIUTA ADS e il motivo · ANNULLA ADS\n' +
  'Per i post: mandami una foto e la metto fra quelle da usare';

const leggiJson = (f, vuoto) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : vuoto);
const salva = (f, o) => writeFileSync(f, `${JSON.stringify(o, null, 2)}\n`);
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const oggi = () => new Date().toISOString();

const CHIEDE_DI_CORREGGERE = /\b(corregg|riscriv|ripropon|rifall|sistemal)/i;
// Per un post si e' piu' larghi: "scarta, cambia la foto" vuol dire sistemalo.
const CHIEDE_DI_CORREGGERE_IL_POST = /\b(corregg|riscriv|ripropon|rifall|rifai|sistema|cambia)/i;

/** Traduce un messaggio in un ordine. Null se non lo e'. */
export function ordine(testo) {
  const pulito = String(testo).replace(/\s+/g, ' ').trim();
  const t = pulito.toUpperCase();

  if (t === 'RIMANDA' || t === 'SALTA') return { argomento: 'social', azione: 'rimanda' };
  const p = t.match(/^PUBBLICA(?: ([123]))?$/);
  if (p) return { argomento: 'social', azione: 'pubblica', variante: Number(p[1] || 1) };

  // SCARTA puo' portarsi dietro il perche': finisce fra le lezioni dell'agente
  // social. E uno SCARTA che chiede di correggere e' un CORREGGI: il 10 ott 2026
  // Matteo ha scartato un post solo perche' non c'era modo di farlo sistemare.
  const s = pulito.match(/^scarta(?: (?:il )?post)?\b[\s:,.-]*(.*)$/i);
  if (s) {
    const motivo = (s[1] || '').trim();
    return { argomento: 'social', azione: CHIEDE_DI_CORREGGERE_IL_POST.test(motivo) ? 'correggi' : 'scarta', motivo };
  }

  // ANNULLA vale solo per la pubblicita': rimette com'era l'ultima proposta applicata.
  if (/^annulla (?:ads|(?:la )?pubblicit[aà])$/i.test(pulito)) return { argomento: 'annulla-ads' };

  // (?![a-zà-ù0-9_]) fa il lavoro di \b, che dopo una lettera accentata non scatta.
  const a = pulito.match(/^(approva|rifiuta|correggi)(?![a-zà-ù0-9_])(?: (?:il |l'|la )?(articolo|seo|ordini|riparazione|recensioni|post|ads|pubblicit[aà])(?![a-zà-ù0-9_]))?[\s:,.-]*(.*)$/i);
  if (a) {
    let azione = a[1].toLowerCase();
    const tipo = a[2] ? (/^pubblicit/i.test(a[2]) ? 'ADS' : a[2].toUpperCase()) : null;
    const motivo = (a[3] || '').trim();
    // CORREGGI POST e' per il post social. Un CORREGGI senza dire cosa lo decide
    // main(), guardando che cosa c'e' in attesa.
    if (tipo === 'POST') return azione === 'correggi' ? { argomento: 'social', azione, motivo } : null;
    // "approva domani" o "approva l'articolo" non sono ordini: meglio chiedere
    // che approvare per sbaglio.
    // Fanno eccezione i numeri: "APPROVA ADS 1 3" approva solo quelle modifiche.
    if (azione === 'approva' && motivo) {
      if (tipo === 'POST' || !/^\d{1,2}(?:[\s,e]+\d{1,2})*$/i.test(motivo)) return null;
      return { argomento: 'proposta', azione, tipo, motivo: '', solo: [...new Set(motivo.match(/\d+/g).map(Number))] };
    }
    // Un RIFIUTA che chiede di correggere e' un CORREGGI: il 5 ott 2026 Matteo ha
    // scritto "RIFIUTA ... correggi l'articolo e riproponimelo in giornata", e
    // l'articolo e' finito nel cestino.
    const daRifiuta = azione === 'rifiuta' && CHIEDE_DI_CORREGGERE.test(motivo);
    if (daRifiuta) azione = 'correggi';
    return { argomento: 'proposta', azione, tipo, motivo, ...(daRifiuta && { daRifiuta }) };
  }
  return null;
}

// ---------------------------------------------------------------------------
//  Post social
// ---------------------------------------------------------------------------

/**
 * Le grafiche fatte con lo stampo (curiosita' e recensioni) servono una volta
 * sola: pubblicato il post, Facebook e Instagram ne tengono una copia loro, e sul
 * sito non devono restare (scelta di Matteo, 12 ott 2026). Le foto vere mandate
 * da Matteo invece restano dove sono. Torna true se ha tolto il file.
 */
const GRAFICA = /^assets\/social\/(curiosita|recensione)-[\w-]+\.jpg$/;

function togliGrafica(bozza) {
  const foto = String(bozza.foto || '').replace(/^\/+/, '');
  if (!GRAFICA.test(foto) || !existsSync(`public/${foto}`)) return false;
  rmSync(`public/${foto}`);
  return true;
}

async function eseguiSocial(o) {
  firma(CHI_PROPONE.POST);
  const bozza = existsSync(BOZZA) ? leggiJson(BOZZA) : null;
  if (!bozza || bozza.pubblicato || bozza.scartato) {
    await messaggio('Non c\'è nessun post in attesa: non ho fatto niente.');
    return;
  }

  if (o.azione === 'scarta') {
    const tolta = togliGrafica(bozza);
    salva(BOZZA, { ...bozza, scartato: oggi(), motivoScarto: o.motivo || undefined, graficaTolta: tolta || undefined });
    if (o.motivo) lezione('POST', `post «${bozza.tema}» scartato: ${o.motivo}`);
    await messaggio(
      'Bozza scartata, non ho pubblicato niente. Sabato te ne preparo una nuova.' +
      (o.motivo
        ? '\nIl motivo l\'ho segnato: l\'agente lo rilegge prima di ogni post.'
        : '\nSe invece vuoi che la sistemi, la prossima volta scrivi CORREGGI POST e cosa cambiare.'),
    );
    return;
  }

  if (o.azione === 'correggi') {
    await correggiPost(bozza, o.motivo);
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

  // Se qualcosa e' andato storto la grafica resta: serve per riprovare.
  const tolta = errori.length ? false : togliGrafica(bozza);

  salva(BOZZA, {
    ...bozza,
    pubblicato: oggi(),
    variantePubblicata: o.variante,
    esiti,
    errori: errori.length ? errori : undefined,
    graficaTolta: tolta || undefined,
  });

  const righe = [`Pubblicata la variante ${o.variante}.`, ''];
  if (esiti.facebook) righe.push(`Facebook: ${esiti.facebook.url}`);
  if (esiti.instagram?.id) righe.push('Instagram: pubblicato');
  if (esiti.instagram?.saltato) righe.push(`Instagram: saltato (${esiti.instagram.saltato})`);
  if (errori.length) righe.push('', 'Non è andato tutto liscio:', ...errori.map((e) => `• ${e}`));
  await messaggio(righe.join('\n'));
}

/**
 * CORREGGI per il post: parte "Social - correggi la bozza" (correggi-post.yml),
 * che riscrive agenti/social-bozza.json con le note di Matteo e la rispinge su
 * main. Quel push fa ripartire "Social - manda la bozza", che gliela rimanda.
 * La bozza qui NON si tocca: la riscrive l'altro workflow, e due mani sullo
 * stesso file nello stesso momento si pesterebbero.
 */
async function correggiPost(bozza, note) {
  if (!note) {
    await messaggio('Cosa devo cambiare nel post? Scrivi CORREGGI POST e subito dopo le correzioni, nello stesso messaggio.');
    return;
  }
  lezione('POST', `post «${bozza.tema}» da correggere: ${note}`);
  if (!(await avvia('correggi-post.yml', { note: note.slice(0, 2000) }))) {
    await messaggio(`Non sono riuscita a far partire la correzione del post. Resta in attesa com'era.\n${await alMeccanico({ tipo: 'correzione-non-parte', workflow: 'correggi-post.yml', testo: 'Matteo ha chiesto CORREGGI per il post social, ma il workflow della correzione (correggi-post.yml) non è partito.' })}`);
    return;
  }
  await messaggio(
    'Ricevuto: sistemo il post con le tue note e te lo rimando appena è pronto, di solito entro un quarto d\'ora.\n' +
    'Non ho pubblicato niente.',
  );
}

// ---------------------------------------------------------------------------
//  Le lezioni: quello che Matteo corregge resta scritto
// ---------------------------------------------------------------------------

// Ogni agente rilegge il suo file prima di lavorare, cosi' una correzione fatta
// una volta vale anche per le volte dopo.
const LEZIONI = {
  ARTICOLO: 'agenti/contenuti/lezioni.md',
  SEO: 'agenti/seo/lezioni.md',
  ORDINI: 'agenti/ordini-lezioni.md',
  RIPARAZIONE: 'agenti/meccanico/lezioni.md',
  RECENSIONI: 'agenti/recensioni/lezioni.md',
  POST: 'agenti/social-lezioni.md',
  ADS: 'agenti/ads/lezioni.md',
};

function lezione(tipo, testo) {
  const file = LEZIONI[tipo];
  if (!file) return false;
  appendFileSync(file, `\n- ${oggi().slice(0, 10)} — ${testo}\n`);
  return true;
}

/**
 * Un guasto della segreteria non si rimanda a Matteo: lo si passa al Meccanico.
 * Torna la frase da mettere in fondo al messaggio.
 */
async function alMeccanico(problema) {
  const errore = await chiamaMeccanico('Segreteria (risposte su Telegram)', [{ giro: Number(process.env.GITHUB_RUN_ID) || undefined, ...problema }]);
  return errore
    ? 'Non sono riuscita nemmeno a chiamare il Meccanico: riscrivimi lo stesso ordine fra qualche minuto.'
    : 'L\'ho passato al Meccanico: guarda lui cosa si è inceppato e ti scrive. Tu non devi fare niente.';
}

/** Fa partire un altro workflow. Col token di GitHub un avvio a mano parte comunque. */
async function avvia(workflow, inputs) {
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY || 'navazx/acquadirete'}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main', inputs }),
  });
  if (res.status === 204) return true;
  console.log(`Avvio di ${workflow} rifiutato: HTTP ${res.status} ${await res.text()}`);
  return false;
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
  firma(CHI_PROPONE[p.tipo]);
  try {
    git('pull', '--ff-only', 'origin', 'main');
    git('fetch', 'origin', p.ramo);
    git('merge', '--no-ff', 'FETCH_HEAD', '-m', `Approvato da Matteo: ${p.titolo}`);
  } catch (e) {
    try { git('merge', '--abort'); } catch { /* niente da annullare */ }
    console.log(e.stderr || e.message);
    aggiorna(p.ramo, { problema: `non si unisce a main (${oggi()})` });
    await messaggio(
      `Non riesco ancora a mettere online «${p.titolo}»: nel frattempo il sito è cambiato negli stessi punti.\n` +
      `Resta in attesa. ${await alMeccanico({ tipo: 'proposta-non-si-unisce', ramo: p.ramo, workflow: 'risposte.yml', testo: `Matteo ha approvato «${p.titolo}» (ramo ${p.ramo}) ma il ramo non si unisce a main: i due sono cambiati negli stessi punti. Va riallineato a main sul suo stesso ramo, così torna a Matteo da approvare.` })}`,
    );
    return;
  }

  // Gli articoli e le pagine che cambiano prendono la data di oggi nella mappa
  // del sito: cosi' Google sa da dove ripassare, senza "Richiedi indicizzazione"
  // a mano (lib/date-aggiornamento.mjs). Se non riesce, la proposta va online lo stesso.
  try {
    const { articoli, pagine } = segnaDate('HEAD^1');
    if (articoli.length + pagine.length) {
      git('add', 'lib/blogPosts.ts', DATE);
      git('commit', '--amend', '--no-edit');
    }
  } catch (e) {
    console.log(`Date di aggiornamento non segnate: ${e.message}`);
    try { git('checkout', '--', 'lib/blogPosts.ts', DATE); } catch { /* niente da rimettere */ }
  }

  // Prima si pubblica, poi si dice che e' pubblicato.
  git('push', 'origin', 'HEAD:main');
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'approvata', decisa: oggi() });
  segnaProvaApprovata(p);

  await messaggio(
    `Approvato: «${p.titolo}» va online fra un paio di minuti.` + (p.url ? `\n${p.url}` : '')
    + (p.fatto ? `\n\nCosa cambia sul sito:\n${p.fatto}` : ''),
  );
}

// Ogni proposta approvata entra nel registro delle prove (agenti/prove.md), con
// quello che l'anteprima dice di aspettarsi: fra quattro settimane il Direttore
// guarda se ha funzionato. Un registro che non si scrive non deve fermare la
// pubblicazione, quindi l'errore si dice e basta.
function segnaProvaApprovata(p) {
  try {
    const anteprime = git('diff', '--name-only', 'HEAD^1', 'HEAD', '--', 'agenti/anteprime/').split(/\r?\n/).filter((x) => x.endsWith('.md'));
    const testo = anteprime.map((a) => (existsSync(a) ? readFileSync(a, 'utf8') : '')).join('\n');
    const { attesa, misura } = attesaDa(testo);
    segnaProva({ tipo: p.tipo, titolo: `«${p.titolo}»`, cosa: `approvata da Matteo su Telegram (${p.ramo})`, attesa, misura });
  } catch (e) {
    console.log(`Registro delle prove non aggiornato: ${e.message}`);
  }
}

async function rifiuta(p, motivo) {
  firma(CHI_PROPONE[p.tipo]);
  try { git('push', 'origin', '--delete', p.ramo); } catch { /* gia' cancellato */ }
  aggiorna(p.ramo, { stato: 'rifiutata', decisa: oggi(), motivo: motivo || undefined });

  const segnata = motivo ? lezione(p.tipo, `«${p.titolo}» rifiutato: ${motivo}`) : false;

  await messaggio(
    `Rifiutato: «${p.titolo}» non va online.` +
    (segnata
      ? '\nIl motivo l\'ho segnato: l\'agente lo rilegge prima di preparare la prossima.'
      : `\nLa prossima volta scrivi anche il perché (RIFIUTA ${p.tipo} e il motivo): l'agente lo terrà a mente.`),
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
  if (candidate[0].tipo === 'ADS') {
    await eseguiAds(o, candidate[0]);
    return;
  }
  if (o.solo) {
    await messaggio(`«${candidate[0].titolo}» si approva o si rifiuta tutta intera: scrivi APPROVA ${candidate[0].tipo}. Non ho fatto niente.`);
    return;
  }
  if (o.azione === 'approva') await approva(candidate[0]);
  else if (o.azione === 'correggi') await correggi(candidate[0], o.motivo);
  else await rifiuta(candidate[0], o.motivo);
}

// ---------------------------------------------------------------------------
//  Pubblicita': le modifiche a Google Ads preparate dall'agente Ads
// ---------------------------------------------------------------------------

// Una modifica applicata a Google Ads va detta anche sulla bacheca. La consegna
// la fa il workflow, dopo.
function notaAds(testo) {
  try { lasciaNota('ads', testo, ['direttore']); } catch (e) { console.log(`Nota per la bacheca non lasciata: ${e.message}`); }
}

/**
 * La proposta non e' un ramo: e' un elenco di modifiche (cifrato) in
 * agenti/ads/proposte.json. APPROVA le applica su Google Ads, tutte o solo quelle
 * coi numeri detti; RIFIUTA non tocca niente. I limiti di cosa puo' partire stanno
 * in lib/ads-azioni.mjs e lib/ads.mjs, non qui.
 */
async function eseguiAds(o, p) {
  firma(CHI_PROPONE.ADS);
  // Un "RIFIUTA ADS ... correggi" resta un rifiuto: qui non c'e' niente da riscrivere.
  if (o.azione === 'rifiuta' || o.daRifiuta) {
    const r = rifiutaAds(p.id, o.motivo);
    if (r.lezione) lezione('ADS', r.lezione);
    await messaggio(r.testo);
    return;
  }
  if (o.azione === 'correggi') {
    await messaggio(
      'Le modifiche alla pubblicità non si correggono a parole. Scrivi APPROVA ADS coi numeri di quelle che vuoi ' +
      '(per esempio APPROVA ADS 1 3), oppure RIFIUTA ADS e il motivo. Non ho fatto niente.',
    );
    return;
  }
  const r = await applicaAds(p.id, o.solo || []);
  if (r.nota) notaAds(r.nota);
  // Le modifiche applicate a Google Ads sono una prova come le altre.
  if (r.nota) {
    try {
      segnaProva({
        tipo: 'ADS',
        titolo: 'modifiche a Google Ads approvate su Telegram',
        cosa: r.nota.replace(/^Matteo ha approvato su Telegram /, ''),
        attesa: 'meno clic che non portano contatti, senza perdere contatti veri',
        misura: 'clic, spesa e contatti "arrivato da un annuncio Google" nel Gestionale, quattro settimane prima e dopo',
      });
    } catch (e) {
      console.log(`Registro delle prove non aggiornato: ${e.message}`);
    }
  }
  await messaggio(r.guasto ? `${r.testo}\n${await alMeccanico({ tipo: 'ads-non-applicata', workflow: 'risposte.yml', testo: r.guasto })}` : r.testo);
}

async function eseguiAnnullaAds() {
  firma(CHI_PROPONE.ADS);
  const r = await annullaAds();
  if (r.nota) notaAds(r.nota);
  await messaggio(r.guasto ? `${r.testo}\n${await alMeccanico({ tipo: 'ads-non-annullata', workflow: 'risposte.yml', testo: r.guasto })}` : r.testo);
}

/**
 * CORREGGI: il ramo resta, e parte "Proposta - correggila" (correggi-proposta.yml),
 * che lo riscrive con le note di Matteo e lo rispinge. Il push fa ripartire
 * "Proposta - presentala a Matteo", che lo rimette in attesa e glielo rimanda.
 */
async function correggi(p, note) {
  firma(CHI_PROPONE[p.tipo]);
  if (!note) {
    await messaggio(`Cosa devo cambiare? Scrivi CORREGGI ${p.tipo} e subito dopo le correzioni, nello stesso messaggio.`);
    return;
  }
  aggiorna(p.ramo, { stato: 'da correggere', correzioni: [...(p.correzioni || []), { note, chiesta: oggi() }] });
  lezione(p.tipo, `«${p.titolo}» da correggere: ${note}`);
  if (!(await avvia('correggi-proposta.yml', { ramo: p.ramo, note: note.slice(0, 2000) }))) {
    aggiorna(p.ramo, { stato: 'in attesa' });
    await messaggio(`Non sono riuscita a far partire la correzione di «${p.titolo}». Resta in attesa com'era.\n${await alMeccanico({ tipo: 'correzione-non-parte', ramo: p.ramo, workflow: 'correggi-proposta.yml', testo: `Matteo ha chiesto CORREGGI per «${p.titolo}» (ramo ${p.ramo}), ma il workflow della correzione (correggi-proposta.yml) non è partito. Le sue note: ${note.slice(0, 600)}` })}`);
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

const TENTATIVO = /^\s*(pubblica|scarta|rimanda|salta|approva|rifiuta|correggi|annulla)/i;

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
  firma(CHI_PROPONE.POST);
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
  // Le proposte in attesa: i rami degli agenti, piu' quella dell'agente Ads (che
  // non e' un ramo, ma si approva e si rifiuta allo stesso modo).
  const aperte = [...leggiJson(PROPOSTE, []).filter((p) => p.stato === 'in attesa'), ...inAttesa(proposteAds())];
  // CORREGGI vale solo per quelle che si possono riscrivere.
  const daRiscrivere = aperte.filter((p) => p.tipo !== 'ADS');

  const { ultimoUpdate = 0, ultimaFoto } = leggiJson(STATO, {});
  const aMano = (process.env.ORDINE_A_MANO || '').trim();
  const { messaggi, foto, ultimo } = await risposte(ultimoUpdate);
  if (ultimo === ultimoUpdate && !aMano) return;
  for (const f of foto) f.chiave = chiaveFoto(f);

  // La foto puo' essere gia' stata salvata al giro prima, e la descrizione
  // arrivare adesso: il lettore gira ogni quarto d'ora, non aspetta.
  const precedente = ultimaFoto && !ultimaFoto.nota ? [{ ...ultimaFoto }] : [];
  const testi = attaccaNote([...precedente, ...foto], messaggi);
  const ultimaOra = foto.length ? foto[foto.length - 1] : precedente[0] || ultimaFoto;

  // Si consuma SEMPRE quello che si e' letto, e PRIMA di agire: se qualcosa si
  // rompe a meta', l'ordine e' comunque sparito dalla coda di Telegram. Meglio un
  // ordine perso che un post doppio.
  if (ultimo !== ultimoUpdate) {
    await conferma(ultimo);
    salva(STATO, {
      ultimoUpdate: ultimo,
      ...(ultimaOra && { ultimaFoto: { chiave: ultimaOra.chiave, data: ultimaOra.data, nota: ultimaOra.nota } }),
    });
  }
  if (aMano) testi.push(aMano);

  if (foto.length) await salvaFoto(foto);
  firma(null);
  if (precedente[0]?.nota) {
    const note = leggiJson(NOTE_FOTO, {});
    note[precedente[0].chiave] = { nota: precedente[0].nota, arrivata: oggi() };
    salva(NOTE_FOTO, note);
    await messaggio(`Ho attaccato la descrizione alla foto di prima: «${precedente[0].nota}»`);
  }

  const bozzaOra = leggiJson(BOZZA, null);
  const postInAttesa = Boolean(bozzaOra && !bozzaOra.pubblicato && !bozzaOra.scartato);

  // Vale l'ultimo ordine per ciascun argomento: un PUBBLICA dopo un RIMANDA vince.
  const ordini = new Map();
  let tentativiAVuoto = false;
  for (const testo of testi) {
    const o = ordine(testo);
    if (!o) {
      if (TENTATIVO.test(testo)) tentativiAVuoto = true;
      continue;
    }
    // Un CORREGGI senza dire cosa: se in attesa c'e' solo il post, e' per il post.
    // Se ci sono sia il post sia una proposta, si chiede invece di tirare a caso.
    if (o.argomento === 'annulla-ads') {
      ordini.set('annulla-ads', o);
      continue;
    }
    if (o.argomento === 'proposta' && o.azione === 'correggi' && !o.daRifiuta && !o.tipo && postInAttesa) {
      if (!daRiscrivere.length) {
        ordini.set('social', { argomento: 'social', azione: 'correggi', motivo: o.motivo });
        continue;
      }
      await messaggio(
        `In attesa ci sono il post e ${daRiscrivere.length === 1 ? 'una proposta' : `${daRiscrivere.length} proposte`}: ` +
        `scrivi CORREGGI POST oppure ${[...new Set(daRiscrivere.map((p) => `CORREGGI ${p.tipo}`))].join(' oppure ')}, e poi le correzioni.`,
      );
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
    firma(null);   // ogni ordine riparte dalla Segreteria; chi lo esegue mette il suo nome
    if (o.argomento === 'social') await eseguiSocial(o);
    else if (o.argomento === 'annulla-ads') await eseguiAnnullaAds();
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
