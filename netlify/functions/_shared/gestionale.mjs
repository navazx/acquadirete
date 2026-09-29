// Logica dell'app "Gestione" (/gestione/, quella del telefono di babbo):
// legge e scrive il Gestionale_Clienti tramite l'API di Google Sheets.
//
// ATTENZIONE — perché qui c'è un doppione delle automazioni del foglio.
// Le automazioni di Apps Script (codice C0xx, formula di "Prossima
// manutenzione", zona dalla città, lead → cliente) sono trigger onEdit: scattano
// SOLO quando una persona scrive nel foglio, mai quando scrive l'API. Quindi
// tutto quello che farebbero loro, per le righe scritte dall'app lo fa questo
// file, con le stesse regole di documenti/gestionale-lead-a-cliente.gs (v10).
// Se cambi le regole lì, cambiale anche qui.
//
// Le colonne si cercano per NOME dell'intestazione, mai per posizione: nel
// foglio si spostano di continuo (vedi colonnePerNome in RapportinoWebApp.gs).
//
// Tutte le funzioni ricevono un "foglio" (l'adattatore creato da
// creaFoglioGoogle) così si possono provare con un foglio finto in memoria.
import { getAccessToken } from './google-sheets.mjs';

export const TAB_CLIENTI = 'Clienti-Impianti';
export const TAB_LEAD = 'Lead-Contatti';
export const TAB_STORICO = 'Storico-Interventi';
const INTESTAZIONI_STORICO = ['Data', 'Codice', 'Cliente', 'Prossima manutenzione', 'Segnata da'];

// Stessa mappa di COLONNE_CLIENTI in gestionale-lead-a-cliente.gs, più
// indirizzo e città che servono all'app.
const COLONNE_CLIENTI = {
  CODICE: ['codice'],
  NOME: ['nome', 'ragione sociale'],
  INDIRIZZO: ['indirizzo'],
  CITTA: ['citta', 'comune'],
  PROVINCIA: ['provincia'],
  CONTATTO: ['telefono', 'contatto'],
  ZONA: ['zona giro', 'zona'],
  TIPO: ['tipo impianto', 'impianto'],
  INSTALLAZIONE: ['data installazione', 'installazione'],
  FREQUENZA: ['frequenza'],
  MANUTENZIONE: ['prossima manutenzione', 'manutenzione'],
  NOTE: ['note'],
};

const COLONNE_LEAD = {
  DATA: ['data'],
  NOME: ['nome'],
  CONTATTO: ['telefono', 'email', 'contatto'],
  PROVENIENZA: ['provenienza'],
  INTERESSE: ['interesse'],
  STATO: ['stato'],
  NOTE: ['note'],
};

// Valori del menu a tendina "Stato" di Lead-Contatti.
export const STATI_LEAD = ['Da richiamare', 'Contattato', 'Preventivo inviato', 'Cliente'];

// Errore con un messaggio già pronto da mostrare a babbo.
export const problema = (messaggio, status = 400) =>
  Object.assign(new Error(messaggio), { perUtente: true, status });

// ---------------------------------------------------------------------------
//  Aiutanti
// ---------------------------------------------------------------------------

// Come normalizza() in RapportinoWebApp.gs.
export function normalizza(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[àáâä]/g, 'a').replace(/[èéêë]/g, 'e').replace(/[ìíîï]/g, 'i')
    .replace(/[òóôö]/g, 'o').replace(/[ùúûü]/g, 'u')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Numero di colonna (1 = A) → lettera.
export function lettera(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

// Come colonnePerNome() in RapportinoWebApp.gs: trova la riga delle
// intestazioni (quella con `parolaRiga`) e la colonna di ogni campo, prima per
// corrispondenza esatta poi parziale. Se ne manca una si ferma e dice quale.
export function colonnePerNome(griglia, spec, parolaRiga) {
  for (let r = 0; r < Math.min(griglia.length, 15); r++) {
    const celle = (griglia[r] || []).map(normalizza);
    if (!celle.includes(parolaRiga)) continue;
    const col = {};
    const mancanti = [];
    for (const [campo, chiavi] of Object.entries(spec)) {
      let trovata = -1;
      for (const k of chiavi) { if (trovata === -1) trovata = celle.indexOf(k); }
      for (const k of chiavi) {
        for (let c = 0; c < celle.length && trovata === -1; c++) {
          if (celle[c] && celle[c].includes(k)) trovata = c;
        }
      }
      if (trovata === -1) mancanti.push(chiavi[0]);
      else col[campo] = trovata + 1;
    }
    if (mancanti.length) {
      throw problema(`Nel foglio manca la colonna "${mancanti.join('", "')}". Chiedi a Matteo.`, 500);
    }
    return { riga: r + 1, col, larghezza: celle.length };
  }
  throw problema('Non trovo le intestazioni nel foglio. Chiedi a Matteo.', 500);
}

// Date: il foglio le tiene come numeri seriali (giorni dal 30/12/1899).
// Si lavora sempre in UTC su giorni interi, così nessun fuso orario può
// spostare una data di un giorno (vedi memoria "fuso orario del Gestionale").
const EPOCA = Date.UTC(1899, 11, 30);
const GIORNO = 86400000;
export const serialeDa = (a, m, g) => Math.round((Date.UTC(a, m - 1, g) - EPOCA) / GIORNO);
export function dataDaSeriale(n) {
  const d = new Date(EPOCA + Math.floor(n) * GIORNO);
  return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, g: d.getUTCDate() };
}
export const testoData = ({ a, m, g }) =>
  `${String(g).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;

// Oggi a Roma, come { a, m, g }.
export function oggi(adesso = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(adesso).map((x) => [x.type, x.value])
  );
  return { a: +p.year, m: +p.month, g: +p.day };
}

// Come EDATE: stessa data N mesi dopo; il 31 gennaio + 1 mese è il 28/29 febbraio.
export function piuMesi({ a, m, g }, mesi) {
  const tot = a * 12 + (m - 1) + mesi;
  const na = Math.floor(tot / 12);
  const nm = (tot % 12) + 1;
  const ultimo = new Date(Date.UTC(na, nm, 0)).getUTCDate();
  return { a: na, m: nm, g: Math.min(g, ultimo) };
}

// Una cella data può arrivare come seriale (numero) o come testo "gg/mm/aaaa".
export function serialeDaCella(v) {
  if (typeof v === 'number' && isFinite(v)) return Math.floor(v);
  const t = String(v ?? '').match(/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return t ? serialeDa(+t[3], +t[2], +t[1]) : null;
}

// "2026-09-29" (dal selettore date del telefono) o "29/09/2026" → { a, m, g }.
export function leggiDataUtente(s) {
  let t = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (t) return { a: +t[1], m: +t[2], g: +t[3] };
  t = String(s ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (t) return { a: +t[3], m: +t[2], g: +t[1] };
  return null;
}

// "50025 MONTESPERTOLI" e "Montespertoli" diventano la stessa chiave.
export const chiaveCitta = (v) => normalizza(String(v ?? '').replace(/^\s*\d{5}\s+/, ''));

// Confronto dei nomi per insieme di parole: "Lucia Bencini" = "BENCINI LUCIA".
const chiaveNome = (s) => String(s ?? '').toLowerCase().split(/\s+/).filter(Boolean).sort().join(' ');

const testo = (v) => (v == null ? '' : String(v)).trim();

// Il valore che hanno gli altri clienti della stessa città, se sono almeno 2
// e d'accordo almeno 3 su 4 (valoreConcordeClienteAMano nel .gs). Nel dubbio
// resta vuoto: una zona sbagliata manda il giro dalla parte sbagliata.
function valoreConcorde(righe, colCitta, colValore, citta, maiuscolo = true) {
  const conta = {};
  let totale = 0;
  for (const r of righe) {
    if (chiaveCitta(r[colCitta - 1]) !== citta) continue;
    let v = testo(r[colValore - 1]);
    if (maiuscolo) v = v.toUpperCase();
    if (!v) continue;
    conta[v] = (conta[v] || 0) + 1;
    totale++;
  }
  let meglio = '';
  for (const v of Object.keys(conta)) if (!meglio || conta[v] > conta[meglio]) meglio = v;
  return meglio && conta[meglio] >= 2 && conta[meglio] / totale >= 0.75 ? meglio : '';
}

// ---------------------------------------------------------------------------
//  Lettura
// ---------------------------------------------------------------------------

async function leggiClienti(foglio) {
  const griglia = await foglio.leggi(`'${TAB_CLIENTI}'!A1:Z1500`, 'UNFORMATTED_VALUE');
  const mappa = colonnePerNome(griglia, COLONNE_CLIENTI, 'codice');
  return { griglia, mappa };
}

async function leggiLead(foglio) {
  // FORMATTED: la colonna Data è testo ("29/06/2026, 17:22:49") o una data
  // vera a seconda di chi l'ha scritta; formattata si legge uguale.
  const griglia = await foglio.leggi(`'${TAB_LEAD}'!A1:Z2000`, 'FORMATTED_VALUE');
  const mappa = colonnePerNome(griglia, COLONNE_LEAD, 'stato');
  return { griglia, mappa };
}

function clienteDaRiga(r, col, numeroRiga) {
  const v = (campo) => r[col[campo] - 1];
  const prossima = serialeDaCella(v('MANUTENZIONE'));
  const inst = serialeDaCella(v('INSTALLAZIONE'));
  const freq = parseInt(testo(v('FREQUENZA')), 10);
  return {
    riga: numeroRiga,
    codice: testo(v('CODICE')),
    nome: testo(v('NOME')),
    indirizzo: testo(v('INDIRIZZO')),
    citta: testo(v('CITTA')),
    provincia: testo(v('PROVINCIA')),
    contatto: testo(v('CONTATTO')),
    zona: testo(v('ZONA')).toUpperCase(),
    tipo: testo(v('TIPO')),
    installazione: inst == null ? '' : testo(testoData(dataDaSeriale(inst))),
    frequenza: isFinite(freq) ? freq : null,
    prossima: prossima == null ? '' : testoData(dataDaSeriale(prossima)),
    prossimaSeriale: prossima,
    note: testo(v('NOTE')),
  };
}

export async function leggiTutto(foglio) {
  const [{ griglia: gc, mappa: mc }, { griglia: gl, mappa: ml }] = await Promise.all([
    leggiClienti(foglio),
    leggiLead(foglio),
  ]);

  const clienti = [];
  for (let i = mc.riga; i < gc.length; i++) {
    const c = clienteDaRiga(gc[i] || [], mc.col, i + 1);
    if (c.nome || c.codice) clienti.push(c);
  }

  const lead = [];
  for (let i = ml.riga; i < gl.length; i++) {
    const r = gl[i] || [];
    const v = (campo) => testo(r[ml.col[campo] - 1]);
    if (!v('NOME') && !v('CONTATTO')) continue;
    lead.push({
      riga: i + 1,
      data: v('DATA'),
      nome: v('NOME'),
      contatto: v('CONTATTO'),
      provenienza: v('PROVENIENZA'),
      interesse: v('INTERESSE'),
      stato: v('STATO'),
      note: v('NOTE'),
    });
  }

  return { oggi: serialeDa(...Object.values(oggi())), clienti, lead, stati: STATI_LEAD };
}

// Le righe si spostano (gli ordinamenti del menu "Foglio di lavoro"): un
// cliente si ritrova sempre dal codice, mai dal numero di riga visto prima.
function trovaCliente(griglia, mappa, codice) {
  const c = testo(codice).toUpperCase();
  if (!/^C\d+$/.test(c)) throw problema('Codice cliente non valido.');
  for (let i = mappa.riga; i < griglia.length; i++) {
    if (testo((griglia[i] || [])[mappa.col.CODICE - 1]).toUpperCase() === c) return i + 1;
  }
  throw problema('Non trovo più questo cliente nel foglio. Riapri l\'app e riprova.', 409);
}

// ---------------------------------------------------------------------------
//  Manutenzione fatta
// ---------------------------------------------------------------------------

// Segna la manutenzione fatta il giorno `data` (di default oggi): "Prossima
// manutenzione" diventa data + frequenza, come chiede il foglio stesso
// ("Aggiornala quando fai l'intervento"). Restituisce quel che serve per
// annullare.
export async function segnaFatta(foglio, { codice, data, frequenza }, { chi = 'app' } = {}) {
  const quando = data ? leggiDataUtente(data) : oggi();
  if (!quando) throw problema('Data non valida.');
  const serQuando = serialeDa(quando.a, quando.m, quando.g);
  const serOggi = serialeDa(...Object.values(oggi()));
  if (serQuando > serOggi) throw problema('La data è nel futuro: scegli oggi o un giorno passato.');
  if (serQuando < serOggi - 730) throw problema('La data è di più di due anni fa: controlla.');

  const { griglia, mappa } = await leggiClienti(foglio);
  const riga = trovaCliente(griglia, mappa, codice);
  const r = griglia[riga - 1] || [];
  const { col } = mappa;

  let mesi = parseInt(testo(r[col.FREQUENZA - 1]), 10);
  let frequenzaScritta = false;
  if (!(mesi > 0)) {
    mesi = parseInt(frequenza, 10);
    if (!(mesi > 0 && mesi <= 36)) throw problema('Serve sapere ogni quanti mesi va fatta.', 422);
    frequenzaScritta = true;
  }

  // Cosa c'era prima (formula compresa), per poterlo rimettere.
  const cellaK = `'${TAB_CLIENTI}'!${lettera(col.MANUTENZIONE)}${riga}`;
  const [[prima = '']] = (await foglio.leggi(cellaK, 'FORMULA')).concat([['']]);

  const prossima = piuMesi(quando, mesi);
  const serProssima = serialeDa(prossima.a, prossima.m, prossima.g);
  const scritture = [{ range: cellaK, values: [[serProssima]] }];
  if (frequenzaScritta) {
    scritture.push({ range: `'${TAB_CLIENTI}'!${lettera(col.FREQUENZA)}${riga}`, values: [[mesi]] });
  }
  // RAW con il numero seriale: la cella è già formattata gg/mm/aaaa, e così
  // non c'è nessuna conversione di data (né di fuso) di mezzo.
  await foglio.scrivi(scritture, 'RAW');

  const nome = testo(r[col.NOME - 1]);
  let storico = null;
  try {
    storico = await foglio.accoda(TAB_STORICO, INTESTAZIONI_STORICO,
      [testoData(quando), testo(codice).toUpperCase(), nome, testoData(prossima), `App (${chi})`]);
  } catch (err) {
    // Lo storico è un di più: se non si scrive, la manutenzione è segnata lo stesso.
    console.error('Storico interventi non scritto:', err);
  }

  return {
    ok: true,
    nome,
    fatta: testoData(quando),
    prossima: testoData(prossima),
    annulla: { codice: testo(codice).toUpperCase(), prima, scritto: serProssima, frequenzaScritta, storico },
  };
}

export async function annullaFatta(foglio, { codice, prima, scritto, frequenzaScritta, storico }) {
  const { griglia, mappa } = await leggiClienti(foglio);
  const riga = trovaCliente(griglia, mappa, codice);
  const { col } = mappa;
  const attuale = serialeDaCella((griglia[riga - 1] || [])[col.MANUTENZIONE - 1]);
  if (attuale !== scritto) {
    throw problema('Nel frattempo la data è cambiata: non la tocco. Controlla il foglio.', 409);
  }
  const cellaK = `'${TAB_CLIENTI}'!${lettera(col.MANUTENZIONE)}${riga}`;
  // Si rimette solo ciò che può esserci stato davvero: vuoto, una data
  // (seriale) o la formula EDATE delle automazioni. Nient'altro dal telefono.
  const formulaValida = typeof prima === 'string' && /^=IF\(OR\(\$[A-Z]+\d+="";\$[A-Z]+\d+=""\);"";EDATE\(\$[A-Z]+\d+;\$[A-Z]+\d+\)\)$/.test(prima);
  if (!(prima === '' || prima == null || typeof prima === 'number' || formulaValida)) {
    throw problema('Non riesco ad annullare: sistemala a mano nel foglio.', 422);
  }
  // La formula torna com'era, ma riferita alla riga di adesso (se intanto
  // il foglio è stato riordinato); un valore semplice (seriale o vuoto) pure.
  if (formulaValida) {
    const formula = prima.replace(/\$([A-Z]+)\d+/g, (_, c) => `$${c}${riga}`);
    await foglio.scrivi([{ range: cellaK, values: [[formula]] }], 'USER_ENTERED');
  } else {
    await foglio.scrivi([{ range: cellaK, values: [[prima ?? '']] }], 'RAW');
  }
  if (frequenzaScritta) {
    await foglio.scrivi([{ range: `'${TAB_CLIENTI}'!${lettera(col.FREQUENZA)}${riga}`, values: [['']] }], 'RAW');
  }
  if (storico && /^'?Storico-Interventi'?!A\d+:[A-Z]+\d+$/.test(storico)) {
    await foglio.svuota(storico).catch((err) => console.error('Storico non svuotato:', err));
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  Cliente nuovo
// ---------------------------------------------------------------------------

// Scrive una riga nuova in fondo a Clienti-Impianti già completa di quello
// che farebbe completaClienteAMano(): codice, formula della prossima
// manutenzione, zona e provincia dagli altri clienti della stessa città.
async function aggiungiRigaCliente(foglio, campi) {
  const { griglia, mappa } = await leggiClienti(foglio);
  const { col } = mappa;
  const dati = griglia.slice(mappa.riga);

  const doppio = dati.find((r) => chiaveNome(r[col.NOME - 1]) === chiaveNome(campi.nome));
  if (doppio) {
    return { giaPresente: true, codice: testo(doppio[col.CODICE - 1]), nome: testo(doppio[col.NOME - 1]) };
  }

  let max = 0;
  for (const r of dati) {
    const m = testo(r[col.CODICE - 1]).match(/^C(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const codice = 'C' + String(max + 1).padStart(3, '0');

  // Ultima riga con qualcosa dentro: la nuova va subito sotto.
  let ultima = mappa.riga;
  griglia.forEach((r, i) => { if (i >= mappa.riga && (r || []).some((c) => testo(c))) ultima = i + 1; });
  const riga = ultima + 1;

  const chiave = chiaveCitta(campi.citta);
  const citta = chiave ? cittaComeNelFoglio(dati, col, campi.citta) : '';
  const zona = testo(campi.zona).toUpperCase() || (chiave ? valoreConcorde(dati, col.CITTA, col.ZONA, chiave) : '');
  const provincia = testo(campi.provincia).toUpperCase() || (chiave ? valoreConcorde(dati, col.CITTA, col.PROVINCIA, chiave) : '');

  // Stessa formattazione della riga sopra (bordi, caratteri, formato date).
  await foglio.copiaFormato(TAB_CLIENTI, riga - 1, riga, mappa.larghezza);

  const cella = (c) => `'${TAB_CLIENTI}'!${lettera(c)}${riga}`;
  const testi = [
    [col.CODICE, codice],
    [col.NOME, campi.nome],
    [col.INDIRIZZO, campi.indirizzo],
    [col.CITTA, citta],
    [col.PROVINCIA, provincia],
    [col.CONTATTO, campi.contatto],
    [col.ZONA, zona],
    [col.TIPO, campi.tipo],
    [col.NOTE, campi.note],
  ];
  // Il telefono resta testo: in RAW "+39 333…" non diventa un numero.
  await foglio.scrivi(testi.map(([c, v]) => ({ range: cella(c), values: [[testo(v)]] })), 'RAW');

  const cInst = lettera(col.INSTALLAZIONE);
  const cFreq = lettera(col.FREQUENZA);
  const numeri = [
    { range: cella(col.INSTALLAZIONE), values: [[campi.installazione ?? '']] },
    { range: cella(col.FREQUENZA), values: [[campi.frequenza ?? '']] },
  ];
  await foglio.scrivi(numeri, 'RAW');
  // Stessa formula che mettono le automazioni del foglio (col ";" italiano).
  await foglio.scrivi([{
    range: cella(col.MANUTENZIONE),
    values: [[`=IF(OR($${cInst}${riga}="";$${cFreq}${riga}="");"";EDATE($${cInst}${riga};$${cFreq}${riga}))`]],
  }], 'USER_ENTERED');

  return { giaPresente: false, codice, riga, zona, provincia, citta };
}

export async function nuovoCliente(foglio, dati) {
  const nome = testo(dati.nome).replace(/\s+/g, ' ').toUpperCase().slice(0, 120);
  if (!nome) throw problema('Scrivi almeno il nome.');
  const inst = dati.installazione ? leggiDataUtente(dati.installazione) : oggi();
  if (!inst) throw problema('Data di installazione non valida.');
  const frequenza = parseInt(dati.frequenza, 10);
  const esito = await aggiungiRigaCliente(foglio, {
    nome,
    contatto: testo(dati.telefono).slice(0, 120),
    indirizzo: testo(dati.indirizzo).slice(0, 150),
    citta: testo(dati.citta).slice(0, 80),
    tipo: testo(dati.tipo).slice(0, 120),
    note: testo(dati.note).slice(0, 300),
    installazione: serialeDa(inst.a, inst.m, inst.g),
    frequenza: frequenza > 0 && frequenza <= 36 ? frequenza : 12,
  });
  return { ok: true, nome, ...esito };
}

// Città scritta come la scrivono già gli altri clienti ("50025 MONTESPERTOLI"),
// altrimenti in maiuscolo come l'ha scritta babbo.
function cittaComeNelFoglio(dati, col, scritta) {
  const chiave = chiaveCitta(scritta);
  const conta = {};
  if (chiave) {
    for (const r of dati) {
      if (chiaveCitta(r[col.CITTA - 1]) !== chiave) continue;
      const v = testo(r[col.CITTA - 1]);
      conta[v] = (conta[v] || 0) + 1;
    }
  }
  return Object.keys(conta).sort((x, y) => conta[y] - conta[x])[0] || testo(scritta).toUpperCase();
}

// Modifica i dati di un cliente esistente. Scrive solo i campi arrivati;
// se cambia la città e zona/provincia sono vuote, le completa come fa
// completaClienteAMano() nel foglio.
const CAMPI_MODIFICABILI = {
  telefono: 'CONTATTO', indirizzo: 'INDIRIZZO', citta: 'CITTA', tipo: 'TIPO',
  installazione: 'INSTALLAZIONE', frequenza: 'FREQUENZA', note: 'NOTE',
};
export async function modificaCliente(foglio, { codice, campi = {} }) {
  const { griglia, mappa } = await leggiClienti(foglio);
  const { col } = mappa;
  const riga = trovaCliente(griglia, mappa, codice);
  const r = griglia[riga - 1] || [];
  const dati = griglia.slice(mappa.riga).filter((x) => x !== r);
  const cella = (c) => `'${TAB_CLIENTI}'!${lettera(c)}${riga}`;
  const testi = [];
  const numeri = [];

  for (const [nome, campo] of Object.entries(CAMPI_MODIFICABILI)) {
    if (!(nome in campi)) continue;
    let v = testo(campi[nome]);
    if (nome === 'installazione') {
      if (v) {
        const d = leggiDataUtente(v);
        if (!d) throw problema('Data di installazione non valida.');
        v = serialeDa(d.a, d.m, d.g);
      }
      numeri.push({ range: cella(col[campo]), values: [[v]] });
      continue;
    }
    if (nome === 'frequenza') {
      const n = parseInt(v, 10);
      if (v && !(n > 0 && n <= 36)) throw problema('La frequenza va da 1 a 36 mesi.');
      numeri.push({ range: cella(col[campo]), values: [[v ? n : '']] });
      continue;
    }
    if (nome === 'citta' && v) v = cittaComeNelFoglio(dati, col, v);
    testi.push({ range: cella(col[campo]), values: [[v.slice(0, 300)]] });
  }

  if ('citta' in campi && testo(campi.citta)) {
    const chiave = chiaveCitta(campi.citta);
    for (const [campo, colonna] of [['zona', col.ZONA], ['provincia', col.PROVINCIA]]) {
      if (testo(r[colonna - 1])) continue;
      const v = valoreConcorde(dati, col.CITTA, colonna, chiave);
      if (v) testi.push({ range: cella(colonna), values: [[v]] });
    }
  }

  if (!testi.length && !numeri.length) throw problema('Non hai cambiato niente.');
  if (testi.length) await foglio.scrivi(testi, 'RAW');
  if (numeri.length) await foglio.scrivi(numeri, 'RAW');

  // Se la prossima manutenzione è vuota (cliente appena passato da lead) e
  // ora ci sono installazione e frequenza, ci rimette la formula delle
  // automazioni così si calcola da sola.
  const k = await foglio.leggi(cella(col.MANUTENZIONE), 'FORMULA');
  if (!testo(k?.[0]?.[0])) {
    const cInst = lettera(col.INSTALLAZIONE);
    const cFreq = lettera(col.FREQUENZA);
    await foglio.scrivi([{
      range: cella(col.MANUTENZIONE),
      values: [[`=IF(OR($${cInst}${riga}="";$${cFreq}${riga}="");"";EDATE($${cInst}${riga};$${cFreq}${riga}))`]],
    }], 'USER_ENTERED');
  }
  return { ok: true, codice: testo(codice).toUpperCase() };
}

// ---------------------------------------------------------------------------
//  Lead
// ---------------------------------------------------------------------------

// Il lead si riconosce da data + nome, non dal numero di riga: con i lead
// nuovi che arrivano e il menu "Riordina", la riga può essere cambiata.
function trovaLead(griglia, mappa, { riga, data, nome }) {
  const combacia = (r) =>
    r && testo(r[mappa.col.DATA - 1]) === testo(data) && testo(r[mappa.col.NOME - 1]) === testo(nome);
  if (riga > mappa.riga && combacia(griglia[riga - 1])) return riga;
  for (let i = mappa.riga; i < griglia.length; i++) if (combacia(griglia[i])) return i + 1;
  throw problema('Non trovo più questo contatto nel foglio. Riapri l\'app e riprova.', 409);
}

export async function cambiaStatoLead(foglio, { riga, data, nome, stato }) {
  riga = parseInt(riga, 10);
  if (!STATI_LEAD.includes(stato)) throw problema('Stato non valido.');
  const { griglia, mappa } = await leggiLead(foglio);
  const r = trovaLead(griglia, mappa, { riga, data, nome });
  const lead = griglia[r - 1];
  const v = (campo) => testo(lead[mappa.col[campo] - 1]);

  let cliente = null;
  if (stato === 'Cliente' && v('STATO') !== 'Cliente') {
    // Come l'onEdit del foglio: il lead diventa una riga di Clienti-Impianti.
    // Nome "Nome Cognome" → "COGNOME NOME"; zona e provincia dalle note del
    // modulo ("Zona: Z4 — …"), altrimenti dagli altri clienti della città.
    const parti = v('NOME').split(/\s+/).filter(Boolean);
    const nomeAnagrafica = (parti.length < 2 ? v('NOME') : parti.slice(1).join(' ') + ' ' + parti[0]).toUpperCase();
    const note = v('NOTE');
    let provincia = '';
    if (/prato/i.test(note)) provincia = 'PO';
    else if (/pistoia/i.test(note)) provincia = 'PT';
    else if (/firenze|scandicci|sesto fiorentino|bagno a ripoli|campi bisenzio|signa|empol|montespertoli|valdelsa/i.test(note)) provincia = 'FI';
    const zona = (note.match(/\bZ[1-8X]\b/) || [''])[0];
    const dataLead = v('DATA').split(',')[0].trim();
    cliente = await aggiungiRigaCliente(foglio, {
      nome: nomeAnagrafica,
      contatto: v('CONTATTO'),
      indirizzo: '',
      citta: '',
      provincia,
      zona,
      tipo: v('INTERESSE'),
      note: dataLead ? 'Da lead del ' + dataLead : '',
      // Come l'onEdit: data e frequenza restano da compilare, la formula
      // della prossima manutenzione parte appena ci sono.
      installazione: '',
      frequenza: '',
    });
  }

  await foglio.scrivi([{ range: `'${TAB_LEAD}'!${lettera(mappa.col.STATO)}${r}`, values: [[stato]] }], 'RAW');
  return { ok: true, stato, cliente };
}

export async function notaLead(foglio, { riga, data, nome, nota }) {
  riga = parseInt(riga, 10);
  const t = testo(nota).replace(/\s+/g, ' ').slice(0, 500);
  if (!t) throw problema('La nota è vuota.');
  const { griglia, mappa } = await leggiLead(foglio);
  const r = trovaLead(griglia, mappa, { riga, data, nome });
  const prima = testo(griglia[r - 1][mappa.col.NOTE - 1]);
  const { g, m } = oggi();
  const nuova = [prima, `${String(g).padStart(2, '0')}/${String(m).padStart(2, '0')}: ${t}`].filter(Boolean).join(' — ');
  await foglio.scrivi([{ range: `'${TAB_LEAD}'!${lettera(mappa.col.NOTE)}${r}`, values: [[nuova.slice(0, 5000)]] }], 'RAW');
  return { ok: true, note: nuova };
}

// ---------------------------------------------------------------------------
//  Adattatore verso Google Sheets
// ---------------------------------------------------------------------------

export function creaFoglioGoogle(sheetId) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`;
  const chiama = async (percorso, opzioni = {}) => {
    const token = await getAccessToken();
    const res = await fetch(base + percorso, {
      ...opzioni,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const testoErr = await res.text();
      throw Object.assign(new Error(`Google Sheets ${res.status}: ${testoErr}`), { status: res.status, testo: testoErr });
    }
    return res.json();
  };
  let idSchede = null;
  const idScheda = async (titolo) => {
    if (!idSchede) {
      const meta = await chiama('?fields=sheets.properties(title,sheetId)');
      idSchede = Object.fromEntries(meta.sheets.map((s) => [s.properties.title, s.properties.sheetId]));
    }
    return idSchede[titolo];
  };

  return {
    async leggi(range, render) {
      const q = `valueRenderOption=${render}&dateTimeRenderOption=SERIAL_NUMBER`;
      return (await chiama(`/values/${encodeURIComponent(range)}?${q}`)).values ?? [];
    },
    async scrivi(data, inputOption) {
      await chiama('/values:batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ valueInputOption: inputOption, data }),
      });
    },
    async svuota(range) {
      await chiama(`/values/${encodeURIComponent(range)}:clear`, { method: 'POST', body: '{}' });
    },
    async copiaFormato(tab, rigaDa, rigaA, larghezza) {
      const sheetId = await idScheda(tab);
      if (sheetId == null) return;
      await chiama(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            copyPaste: {
              source: { sheetId, startRowIndex: rigaDa - 1, endRowIndex: rigaDa, startColumnIndex: 0, endColumnIndex: larghezza },
              destination: { sheetId, startRowIndex: rigaA - 1, endRowIndex: rigaA, startColumnIndex: 0, endColumnIndex: larghezza },
              pasteType: 'PASTE_FORMAT',
            },
          }],
        }),
      });
    },
    // Accoda una riga alla scheda (creandola con le intestazioni se non c'è).
    // Restituisce il range scritto, che serve per annullare.
    async accoda(tab, intestazioni, riga) {
      const append = () => chiama(
        `/values/${encodeURIComponent(`'${tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values: [riga] }) }
      );
      try {
        return (await append()).updates?.updatedRange ?? null;
      } catch (err) {
        if (!(err.status === 400 && /unable to parse range/i.test(err.testo))) throw err;
        await chiama(':batchUpdate', {
          method: 'POST',
          body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] }),
        }).catch((e) => { if (!/already exists/i.test(e.testo)) throw e; });
        idSchede = null;
        await chiama(`/values/${encodeURIComponent(`'${tab}'!A1`)}?valueInputOption=RAW`, {
          method: 'PUT',
          body: JSON.stringify({ values: [intestazioni] }),
        });
        return (await append()).updates?.updatedRange ?? null;
      }
    },
  };
}
