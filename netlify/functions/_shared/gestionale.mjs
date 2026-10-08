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
import { getAccessToken, appendOrMergeRow, nowInItaly } from './google-sheets.mjs';
import { etichettaZona } from './zone.mjs';

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
export const STATI_LEAD = ['Da richiamare', 'Contattato', 'Preventivo inviato', 'Cliente', 'Non interessato'];

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

// Nome del lead → "COGNOME NOME" per l'anagrafica (01/10/2026). Fino a ieri
// si girava sempre, come se il lead fosse "Nome Cognome"; ma i lead in scheda
// sono quasi tutti già girati a mano e "BORSELLI PAOLO" diventava "PAOLO
// BORSELLI". Ora si contano i nomi di battesimo dei clienti (in "COGNOME
// NOME" è l'ultima parola) e si gira solo se la prima parola fa da nome più
// spesso dell'ultima; nel dubbio resta com'è. Gemella di cognomePrimoLC nel
// .gs (Codice.gs v13): se cambi una, cambia l'altra.
export function cognomePrimo(nome, nomiClienti) {
  const parti = testo(nome).toUpperCase().split(/\s+/).filter(Boolean);
  if (parti.length < 2) return parti.join(' ');
  const conta = {};
  for (const n of nomiClienti) {
    const p = String(n ?? '').toUpperCase().replace(/\([^)]*\)/g, ' ').split(/\/|\sE\s/)[0]
      .replace(/[^A-ZÀ-Ü' ]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (p.length >= 2) conta[p[p.length - 1]] = (conta[p[p.length - 1]] || 0) + 1;
  }
  const primo = conta[parti[0]] || 0;
  const ultimo = conta[parti[parti.length - 1]] || 0;
  return primo > ultimo ? [...parti.slice(1), parti[0]].join(' ') : parti.join(' ');
}

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

// Colonne "Sospesa / Urgente" e "Motivo" di Clienti-Impianti (dal 1 ott
// 2026), in fondo alla tabella. "Sospesa" = la manutenzione non si fa finché
// non si riattiva (non compare più fra le scadute); "Urgente" = ha chiamato
// per un guasto. Il Motivo comincia con il giorno ("01/10/2026 — perde
// acqua"). Facoltative: le crea l'app la prima volta che servono. Nomi scelti
// apposta senza parole che usano le altre automazioni per trovare le loro
// colonne (manutenzione, note, zona, …): niente scambi di colonna.
const INTESTAZIONE_AVVISO = 'Sospesa / Urgente';
const INTESTAZIONE_MOTIVO = 'Motivo';
const AVVISI = ['Sospesa', 'Urgente'];
const avvisoDa = (v) => (/urgent/i.test(String(v ?? '')) ? 'Urgente' : /sospes/i.test(String(v ?? '')) ? 'Sospesa' : '');

async function leggiClienti(foglio) {
  const griglia = await foglio.leggi(`'${TAB_CLIENTI}'!A1:Z1500`, 'UNFORMATTED_VALUE');
  const mappa = colonnePerNome(griglia, COLONNE_CLIENTI, 'codice');
  // Solo corrispondenza esatta, come per "Data stato" dei lead.
  const intestazioni = (griglia[mappa.riga - 1] || []).map(normalizza);
  const iA = intestazioni.indexOf(normalizza(INTESTAZIONE_AVVISO));
  const iM = intestazioni.indexOf(normalizza(INTESTAZIONE_MOTIVO));
  if (iA !== -1) mappa.col.AVVISO = iA + 1;
  if (iM !== -1) mappa.col.MOTIVO = iM + 1;
  return { griglia, mappa };
}

// Crea le due intestazioni se mancano (subito dopo l'ultima colonna, con lo
// stesso aspetto delle altre) e restituisce le loro colonne.
async function colonneAvviso(foglio, mappa) {
  const scritture = [];
  for (const [campo, titolo] of [['AVVISO', INTESTAZIONE_AVVISO], ['MOTIVO', INTESTAZIONE_MOTIVO]]) {
    if (mappa.col[campo]) continue;
    const c = Math.max(mappa.larghezza, mappa.col.AVVISO || 0, mappa.col.MOTIVO || 0) + 1;
    await foglio.copiaCella(TAB_CLIENTI, mappa.riga, mappa.larghezza, mappa.riga, c).catch(() => {});
    scritture.push({ range: `'${TAB_CLIENTI}'!${lettera(c)}${mappa.riga}`, values: [[titolo]] });
    mappa.col[campo] = c;
  }
  if (scritture.length) await foglio.scrivi(scritture, 'RAW');
  return { cA: mappa.col.AVVISO, cM: mappa.col.MOTIVO };
}

// Scrive avviso e motivo sulla riga (vuoti = toglie). RAW: sono testo.
async function scriviAvviso(foglio, mappa, riga, avviso, motivo) {
  const { cA, cM } = await colonneAvviso(foglio, mappa);
  await foglio.scrivi([
    { range: `'${TAB_CLIENTI}'!${lettera(cA)}${riga}`, values: [[avviso]] },
    { range: `'${TAB_CLIENTI}'!${lettera(cM)}${riga}`, values: [[motivo]] },
  ], 'RAW');
}

// Se la riga ha uno degli avvisi in `quali`, lo toglie e restituisce cosa
// c'era (per l'annulla); altrimenti null.
async function togliAvviso(foglio, mappa, riga, r, quali) {
  if (!mappa.col.AVVISO) return null;
  const avviso = avvisoDa(r[mappa.col.AVVISO - 1]);
  if (!avviso || !quali.includes(avviso)) return null;
  const motivo = mappa.col.MOTIVO ? testo(r[mappa.col.MOTIVO - 1]) : '';
  await scriviAvviso(foglio, mappa, riga, '', '');
  return { avviso, motivo };
}

// Colonna "Data stato" di Lead-Contatti (dal 30 set 2026): il giorno
// dell'ultimo cambio di Stato. Vuota = lo stato non è mai cambiato da quando
// il contatto è arrivato, quindi vale la Data di arrivo. La scrivono sia
// questa app (cambiaStatoLead) sia l'onEdit del foglio quando lo stato si
// cambia a mano (segnaDataStatoLead in Codice.gs): regole in copia doppia.
// È facoltativa: se l'intestazione non c'è, la crea chi scrive per primo.
const INTESTAZIONE_DATA_STATO = 'Data stato';

async function leggiLead(foglio) {
  // FORMATTED: la colonna Data è testo ("29/06/2026, 17:22:49") o una data
  // vera a seconda di chi l'ha scritta; formattata si legge uguale.
  const griglia = await foglio.leggi(`'${TAB_LEAD}'!A1:Z2000`, 'FORMATTED_VALUE');
  const mappa = colonnePerNome(griglia, COLONNE_LEAD, 'stato');
  // Solo corrispondenza esatta: "data" da sola è la colonna dell'arrivo.
  const i = (griglia[mappa.riga - 1] || []).map(normalizza).indexOf(normalizza(INTESTAZIONE_DATA_STATO));
  if (i !== -1) mappa.col.DATA_STATO = i + 1;
  return { griglia, mappa };
}

// Scrive la data di oggi in "Data stato" sulla riga `r`, creando prima
// l'intestazione se manca (subito dopo l'ultima colonna, con lo stesso
// aspetto delle altre intestazioni).
async function segnaDataStato(foglio, mappa, r) {
  let c = mappa.col.DATA_STATO;
  const scritture = [];
  if (!c) {
    c = mappa.larghezza + 1;
    await foglio.copiaCella(TAB_LEAD, mappa.riga, mappa.larghezza, mappa.riga, c).catch(() => {});
    scritture.push({ range: `'${TAB_LEAD}'!${lettera(c)}${mappa.riga}`, values: [[INTESTAZIONE_DATA_STATO]] });
  }
  // USER_ENTERED: "30/09/2026" diventa una data vera (foglio in italiano),
  // come quella che scrive l'onEdit; niente orario, quindi niente fuso.
  scritture.push({ range: `'${TAB_LEAD}'!${lettera(c)}${r}`, values: [[testoData(oggi())]] });
  await foglio.scrivi(scritture, 'USER_ENTERED');
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
    // 'Sospesa' | 'Urgente' | '' e il suo motivo ("01/10/2026 — perde acqua").
    avviso: col.AVVISO ? avvisoDa(v('AVVISO')) : '',
    motivo: col.MOTIVO ? testo(v('MOTIVO')) : '',
  };
}

export async function leggiTutto(foglio) {
  // Le posizioni per la mappa: se la scheda non si legge, l'app va lo stesso.
  const posizioni = leggiCoordinate(foglio).catch((err) => {
    console.error('Coordinate non lette:', err);
    return new Map();
  });
  const [{ griglia: gc, mappa: mc }, { griglia: gl, mappa: ml }] = await Promise.all([
    leggiClienti(foglio),
    leggiLead(foglio),
  ]);

  const clienti = [];
  for (let i = mc.riga; i < gc.length; i++) {
    const c = clienteDaRiga(gc[i] || [], mc.col, i + 1);
    if (c.nome || c.codice) clienti.push(c);
  }
  // Una posizione vale solo se l'indirizzo è ancora quello cercato; se no
  // il cliente risulta "da cercare" e il telefono la ricerca.
  const pos = await posizioni;
  for (const c of clienti) {
    const p = pos.get(c.codice.toUpperCase());
    if (!p || normalizza(p.cercato) !== normalizza(indirizzoCercato(c.indirizzo, c.citta))) continue;
    c.prec = p.prec;
    if (p.lat != null) { c.lat = p.lat; c.lng = p.lng; }
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
      // "gg/mm/aaaa" dell'ultimo cambio di stato; vuoto = mai cambiato (vale data).
      dataStato: ml.col.DATA_STATO ? v('DATA_STATO') : '',
    });
  }

  // I clienti persi: se la scheda non c'è o non si legge, l'app va lo stesso.
  const persi = [];
  try {
    const p = await leggiPersi(foglio);
    if (p) {
      for (let i = p.mappa.riga; i < p.griglia.length; i++) {
        const r = p.griglia[i] || [];
        const c = clienteDaRiga(r, p.mappa.col, i + 1);
        if (!c.nome && !c.codice) continue;
        const quando = p.mappa.col.PERSO_IL ? serialeDaCella(r[p.mappa.col.PERSO_IL - 1]) : null;
        persi.push({ ...c, perso: true, persoIl: quando == null ? testo(r[(p.mappa.col.PERSO_IL || 0) - 1]) : testoData(dataDaSeriale(quando)) });
      }
    }
  } catch (err) {
    console.error('Clienti persi non letti:', err);
  }

  return { oggi: serialeDa(...Object.values(oggi())), clienti, lead, persi, stati: STATI_LEAD };
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

  // Fatta la manutenzione, non è più né sospesa né urgente.
  const avvisoPrima = await togliAvviso(foglio, mappa, riga, r, AVVISI);

  return {
    ok: true,
    nome,
    fatta: testoData(quando),
    prossima: testoData(prossima),
    annulla: { codice: testo(codice).toUpperCase(), prima, scritto: serProssima, frequenzaScritta, storico, avvisoPrima },
  };
}

// Il cliente al telefono chiede di rimandare: la prossima manutenzione si
// sposta di `mesi` (partendo da oggi se è già scaduta, altrimenti dalla data
// prevista) oppure al giorno `data` scelto. Si annulla con annullaFatta.
// Nello storico interventi non va niente: non è un intervento fatto.
export async function rimandaManutenzione(foglio, { codice, mesi, data }) {
  const { griglia, mappa } = await leggiClienti(foglio);
  const riga = trovaCliente(griglia, mappa, codice);
  const { col } = mappa;
  const r = griglia[riga - 1] || [];
  const o = oggi();
  const serOggi = serialeDa(o.a, o.m, o.g);

  let nuova;
  if (data) {
    nuova = leggiDataUtente(data);
    if (!nuova) throw problema('Data non valida.');
  } else {
    const n = parseInt(mesi, 10);
    if (!(n > 0 && n <= 24)) throw problema('Di quanti mesi va rimandata?');
    const attuale = serialeDaCella(r[col.MANUTENZIONE - 1]);
    nuova = piuMesi(attuale != null && attuale > serOggi ? dataDaSeriale(attuale) : o, n);
  }
  const serNuova = serialeDa(nuova.a, nuova.m, nuova.g);
  if (serNuova <= serOggi) throw problema('La nuova data deve essere dopo oggi.');
  if (serNuova > serOggi + 730) throw problema('È più di due anni avanti: controlla la data.');

  const cellaK = `'${TAB_CLIENTI}'!${lettera(col.MANUTENZIONE)}${riga}`;
  const [[prima = '']] = (await foglio.leggi(cellaK, 'FORMULA')).concat([['']]);
  await foglio.scrivi([{ range: cellaK, values: [[serNuova]] }], 'RAW');
  // Una data nuova vuol dire che non è più sospesa (l'urgenza invece resta).
  const avvisoPrima = await togliAvviso(foglio, mappa, riga, r, ['Sospesa']);

  return {
    ok: true,
    nome: testo(r[col.NOME - 1]),
    prossima: testoData(nuova),
    annulla: { codice: testo(codice).toUpperCase(), prima, scritto: serNuova, frequenzaScritta: false, storico: null, avvisoPrima },
  };
}

// Sospende la manutenzione o segna il cliente come urgente (guasto), con il
// motivo; `avviso: ''` toglie quello che c'è ("Riattiva", "Risolto"). La
// data va in testa al motivo. `esatto: true` è per l'annulla: rimette il
// motivo così com'era, senza aggiungere la data.
export async function impostaAvviso(foglio, { codice, avviso = '', motivo = '', esatto = false }) {
  if (avviso && !AVVISI.includes(avviso)) throw problema('Scelta non valida.');
  const { griglia, mappa } = await leggiClienti(foglio);
  const riga = trovaCliente(griglia, mappa, codice);
  const r = griglia[riga - 1] || [];
  const avvisoPrima = mappa.col.AVVISO ? avvisoDa(r[mappa.col.AVVISO - 1]) : '';
  const motivoPrima = mappa.col.MOTIVO ? testo(r[mappa.col.MOTIVO - 1]) : '';
  const m = testo(motivo).replace(/\s+/g, ' ').slice(0, 500);
  const nuovoMotivo = !avviso ? '' : esatto ? m : [testoData(oggi()), m].filter(Boolean).join(' — ');
  await scriviAvviso(foglio, mappa, riga, avviso, nuovoMotivo);
  return {
    ok: true,
    nome: testo(r[mappa.col.NOME - 1]),
    avviso,
    motivo: nuovoMotivo,
    annulla: { codice: testo(codice).toUpperCase(), avviso: avvisoPrima, motivo: motivoPrima, esatto: true },
  };
}

export async function annullaFatta(foglio, { codice, prima, scritto, frequenzaScritta, storico, avvisoPrima }) {
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
  // Rimette sospesa/urgente se la manutenzione li aveva tolti.
  if (avvisoPrima && AVVISI.includes(avvisoPrima.avviso)) {
    await scriviAvviso(foglio, mappa, riga, avvisoPrima.avviso, testo(avvisoPrima.motivo).slice(0, 600));
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  Clienti persi
// ---------------------------------------------------------------------------
// Scheda "Clienti-Persi" (dal 1 ott 2026): chi non è più cliente. Prima babbo
// li cancellava a mano (15 il 30 set, recuperati dal backup del 21 set); ora
// dall'app si spostano qui e si possono far tornare. Riga 1 = stesse
// intestazioni di Clienti-Impianti più "Perso il". Le automazioni del foglio
// non la leggono: è solo un archivio.
export const TAB_PERSI = 'Clienti-Persi';
const INTESTAZIONE_PERSO_IL = 'Perso il';

async function leggiPersi(foglio) {
  let griglia;
  try {
    griglia = await foglio.leggi(`'${TAB_PERSI}'!A1:Z1000`, 'UNFORMATTED_VALUE');
  } catch (err) {
    if (err.status === 400) return null; // scheda non ancora creata
    throw err;
  }
  if (!griglia.length) return null;
  const mappa = colonnePerNome(griglia, COLONNE_CLIENTI, 'codice');
  const i = (griglia[mappa.riga - 1] || []).map(normalizza).indexOf(normalizza(INTESTAZIONE_PERSO_IL));
  if (i !== -1) mappa.col.PERSO_IL = i + 1;
  return { griglia, mappa };
}

// La crea (se manca) copiando le intestazioni e il loro aspetto da Clienti-Impianti.
async function preparaPersi(foglio, clienti) {
  const esistente = await leggiPersi(foglio);
  if (esistente) return esistente;
  await foglio.creaScheda(TAB_PERSI);
  const intestazioni = [...(clienti.griglia[clienti.mappa.riga - 1] || []).map(testo), INTESTAZIONE_PERSO_IL];
  await foglio.scrivi([{ range: `'${TAB_PERSI}'!A1`, values: [intestazioni] }], 'RAW');
  await foglio.copiaFormatoTra(TAB_CLIENTI, clienti.mappa.riga, TAB_PERSI, 1, intestazioni.length).catch(() => {});
  return leggiPersi(foglio);
}

// I valori di una riga rimessi nell'ordine delle intestazioni dell'altra scheda.
function perIntestazioni(valori, intestDa, intestA) {
  const pos = new Map(intestDa.map((h, i) => [normalizza(h), i]));
  return intestA.map((h) => { const i = pos.get(normalizza(h)); return i == null ? '' : (valori[i] ?? ''); });
}

const ultimaPiena = ({ griglia, mappa }) => {
  let ultima = mappa.riga;
  griglia.forEach((r, i) => { if (i >= mappa.riga && (r || []).some((c) => testo(c))) ultima = i + 1; });
  return ultima;
};

// Sposta un cliente in Clienti-Persi (verso 'persi') o lo riporta in
// Clienti-Impianti (verso 'clienti'). Scrive la riga di là, ricontrolla che
// la riga di qua sia ancora quel codice e solo allora la elimina. La
// prossima manutenzione passa come valore (la formula non sopravvive allo
// spostamento). Si annulla spostandolo indietro.
export async function spostaCliente(foglio, { codice, verso }) {
  if (verso !== 'persi' && verso !== 'clienti') throw problema('Scelta non valida.');
  const cod = testo(codice).toUpperCase();
  const clienti = await leggiClienti(foglio);
  const persi = verso === 'persi' ? await preparaPersi(foglio, clienti) : await leggiPersi(foglio);
  if (!persi) throw problema('Non trovo la scheda dei clienti persi.', 409);
  const [da, a, tabDa, tabA] = verso === 'persi'
    ? [clienti, persi, TAB_CLIENTI, TAB_PERSI]
    : [persi, clienti, TAB_PERSI, TAB_CLIENTI];

  const riga = trovaCliente(da.griglia, da.mappa, cod);
  const intestDa = (da.griglia[da.mappa.riga - 1] || []).map(testo);
  const intestA = (a.griglia[a.mappa.riga - 1] || []).map(testo);
  const valori = perIntestazioni(da.griglia[riga - 1] || [], intestDa, intestA);
  if (verso === 'persi' && a.mappa.col.PERSO_IL) valori[a.mappa.col.PERSO_IL - 1] = testoData(oggi());
  const nome = testo((da.griglia[riga - 1] || [])[da.mappa.col.NOME - 1]);

  const nuova = ultimaPiena(a) + 1;
  await foglio.copiaFormatoTra(tabDa, riga, tabA, nuova, Math.max(intestA.length, intestDa.length)).catch(() => {});
  // RAW: testi restano testi (telefoni col +), date restano numeri seriali.
  await foglio.scrivi([{ range: `'${tabA}'!A${nuova}`, values: [valori] }], 'RAW');

  const controllo = await foglio.leggi(`'${tabDa}'!${lettera(da.mappa.col.CODICE)}${riga}`, 'UNFORMATTED_VALUE');
  if (testo(controllo?.[0]?.[0]).toUpperCase() !== cod) {
    throw problema('Il foglio è cambiato mentre spostavo: il cliente adesso compare in tutte e due le schede. Chiedi a Matteo.', 409);
  }
  await foglio.eliminaRiga(tabDa, riga);
  return { ok: true, codice: cod, nome, verso, annulla: { codice: cod, verso: verso === 'persi' ? 'clienti' : 'persi' } };
}

// Una tantum, solo con la chiave di Matteo: rimette in Clienti-Persi righe
// riprese da un backup ({ intestazione: valore }, come nel foglio). Salta i
// codici che ci sono già in una delle due schede.
export async function importaPersi(foglio, { righe = [] }, { chi } = {}) {
  if (chi !== 'matteo') throw problema('Questa operazione la può fare solo Matteo.', 403);
  if (!Array.isArray(righe) || !righe.length || righe.length > 100) throw problema('Righe non valide.');
  const clienti = await leggiClienti(foglio);
  const persi = await preparaPersi(foglio, clienti);
  const codiciEsistenti = new Set([clienti, persi].flatMap(({ griglia, mappa }) =>
    griglia.slice(mappa.riga).map((r) => testo((r || [])[mappa.col.CODICE - 1]).toUpperCase())));
  const intestA = (persi.griglia[persi.mappa.riga - 1] || []).map(testo);
  const aggiunti = []; const saltati = [];
  let n = ultimaPiena(persi);
  for (const oggetto of righe) {
    const voci = Object.entries(oggetto || {});
    const cod = testo((voci.find(([h]) => normalizza(h) === 'codice') || [])[1]).toUpperCase();
    if (!/^C\d+$/.test(cod) || codiciEsistenti.has(cod)) { saltati.push(cod || '?'); continue; }
    const valori = perIntestazioni(voci.map(([, v]) => v), voci.map(([h]) => h), intestA);
    n += 1;
    // Aspetto di una riga di dati vera (formato date compreso).
    await foglio.copiaFormatoTra(TAB_CLIENTI, clienti.mappa.riga + 1, TAB_PERSI, n, intestA.length).catch(() => {});
    await foglio.scrivi([{ range: `'${TAB_PERSI}'!A${n}`, values: [valori] }], 'RAW');
    codiciEsistenti.add(cod);
    aggiunti.push(cod);
  }
  return { ok: true, aggiunti, saltati };
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
  // Da un lead il nome arriva com'è scritto in scheda: lo si mette in
  // "COGNOME NOME" guardando i clienti che ci sono già.
  if (campi.daLead) campi = { ...campi, nome: cognomePrimo(campi.nome, dati.map((r) => r[col.NOME - 1])) };

  const doppio = dati.find((r) => chiaveNome(r[col.NOME - 1]) === chiaveNome(campi.nome));
  if (doppio) {
    return { giaPresente: true, codice: testo(doppio[col.CODICE - 1]), nome: testo(doppio[col.NOME - 1]) };
  }
  // Anche fra i clienti persi: meglio farlo tornare che crearne un doppione.
  const persi = await leggiPersi(foglio).catch(() => null);
  const righePersi = persi ? persi.griglia.slice(persi.mappa.riga) : [];
  const persoDoppio = persi && righePersi.find((r) => chiaveNome(r[persi.mappa.col.NOME - 1]) === chiaveNome(campi.nome));
  if (persoDoppio) {
    return { giaPresente: true, perso: true, codice: testo(persoDoppio[persi.mappa.col.CODICE - 1]), nome: testo(persoDoppio[persi.mappa.col.NOME - 1]) };
  }

  // Il codice nuovo tiene conto anche dei persi, così non si riusa mai.
  // (L'onEdit del foglio guarda solo Clienti-Impianti: il caso in cui
  // conta è un cliente scritto a mano subito dopo aver spostato fra i persi
  // l'ultimo arrivato. Raro, ma da sapere.)
  let max = 0;
  for (const r of dati) {
    const m = testo(r[col.CODICE - 1]).match(/^C(\d+)$/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  for (const r of righePersi) {
    const m = testo(r[persi.mappa.col.CODICE - 1]).match(/^C(\d+)$/i);
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
  const scritti = {};

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
    scritti[nome] = v.slice(0, 300);
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

  if ('indirizzo' in scritti || 'citta' in scritti) {
    await tieniPosizioneSulPosto(foglio, testo(codice).toUpperCase(),
      { indirizzo: r[col.INDIRIZZO - 1], citta: r[col.CITTA - 1] },
      { indirizzo: scritti.indirizzo ?? r[col.INDIRIZZO - 1], citta: scritti.citta ?? r[col.CITTA - 1] },
    ).catch((err) => console.error('Posizione sul posto non aggiornata:', err));
  }
  return { ok: true, codice: testo(codice).toUpperCase() };
}

// Una posizione segnata sul posto («Sono qui») è più giusta di qualunque
// ricerca: se si corregge l'indirizzo restando nello stesso paese (la via
// scritta meglio, il civico, la città aggiunta a chi non l'aveva) resta
// buona, e qui si aggiorna l'indirizzo a cui è legata. Se cambia il paese
// il cliente ha traslocato: la posizione decade e il telefono la ricerca.
// Vale per le modifiche fatte dall'app; a mano nel foglio la posizione decade.
async function tieniPosizioneSulPosto(foglio, codice, prima, dopo) {
  if (chiaveCitta(prima.citta) && chiaveCitta(prima.citta) !== chiaveCitta(dopo.citta)) return;
  const p = (await leggiCoordinate(foglio)).get(codice);
  if (!p || p.prec !== 'gps' || normalizza(p.cercato) !== normalizza(indirizzoCercato(prima.indirizzo, prima.citta))) return;
  await foglio.scrivi([{ range: `'${TAB_COORDINATE}'!E${p.riga}`, values: [[indirizzoCercato(dopo.indirizzo, dopo.citta)]] }], 'RAW');
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
    // Nome in "COGNOME NOME" (cognomePrimo, dentro aggiungiRigaCliente); zona
    // e provincia dalle note del modulo ("Zona: Z4 — …"), altrimenti dagli
    // altri clienti della città.
    const note = v('NOTE');
    let provincia = '';
    if (/prato/i.test(note)) provincia = 'PO';
    else if (/pistoia/i.test(note)) provincia = 'PT';
    else if (/firenze|scandicci|sesto fiorentino|bagno a ripoli|campi bisenzio|signa|empol|montespertoli|valdelsa/i.test(note)) provincia = 'FI';
    const zona = (note.match(/\bZ[1-8X]\b/) || [''])[0];
    const dataLead = v('DATA').split(',')[0].trim();
    cliente = await aggiungiRigaCliente(foglio, {
      nome: v('NOME'),
      daLead: true,
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
  // La data solo se lo stato è cambiato davvero: ritoccare lo stesso stato
  // non deve far sembrare "appena sentito" un contatto fermo da settimane.
  let dataStato = null;
  if (v('STATO') !== stato) {
    try {
      await segnaDataStato(foglio, mappa, r);
      dataStato = testoData(oggi());
    } catch (err) {
      // Lo stato è già salvato: la data è un di più, non si butta via il resto.
      console.error('Data stato non scritta:', err);
    }
  }
  return { ok: true, stato, cliente, dataStato };
}

// Contatto nuovo scritto a mano (chi telefona o scrive senza compilare il
// modulo). Nasce come quelli del sito: stesse colonne, Stato "Da richiamare",
// nome "NOME COGNOME" in maiuscolo, zona nelle note come "Zona: Z4" così il
// passaggio a cliente la ritrova, e lo stesso anti-doppioni del sito (stesso
// telefono o email negli ultimi 30 giorni = si completa la riga che c'è).
const PROVENIENZE = ['Meta / Facebook', 'Sito web', 'Passaparola', 'Altro'];
export async function nuovoLead(foglio, dati, { chi = 'app' } = {}) {
  const nome = testo(dati.nome).replace(/\s+/g, ' ').toUpperCase().slice(0, 200);
  const telefono = testo(dati.telefono).slice(0, 50);
  const email = testo(dati.email).slice(0, 200);
  if (!nome) throw problema('Scrivi almeno il nome.');
  if (!telefono && !email) throw problema('Scrivi il telefono (o l\'email), se no non lo puoi richiamare.');
  // Gemello di problemaTelefono in public/gestione/app.js: fra 8 e 11 cifre per
  // numero, esteri esclusi. Un numero incompleto sfugge all'anti-doppioni (8 ott 2026).
  for (const pezzo of telefono.split(/[/,;]| - | e /i)) {
    const p = pezzo.replace(/\s/g, '');
    if (!/\d/.test(p) || /^(\+|00)(?!39)/.test(p)) continue;
    const n = p.replace(/^(\+39|0039)/, '').replace(/\D/g, '').length;
    if (n < 8 || n > 11) throw problema(`Il telefono sembra sbagliato: ha ${n} cifre. Un cellulare ne ha 10, un fisso di solito 9 o 10 col prefisso.`);
  }

  const citta = testo(dati.citta).slice(0, 80);
  let zona = '';
  if (citta) {
    zona = (etichettaZona(citta).match(/^Z[1-8X]\b/) || [''])[0];
    if (!zona) {
      const { griglia, mappa } = await leggiClienti(foglio);
      zona = valoreConcorde(griglia.slice(mappa.riga), mappa.col.CITTA, mappa.col.ZONA, chiaveCitta(citta));
    }
  }
  const note = [
    zona ? `Zona: ${zona}` : '',
    citta ? `Città: ${citta}` : '',
    testo(dati.note).slice(0, 1000),
    `(scritto dall'app da ${chi})`,
  ].filter(Boolean).join(' — ');

  const riga = [
    nowInItaly(),
    nome,
    [telefono, email].filter(Boolean).join(' · '),
    PROVENIENZE.includes(dati.provenienza) ? dati.provenienza : 'Altro',
    testo(dati.interesse).slice(0, 100),
    'Da richiamare',
    note,
  ];
  const esito = await foglio.accodaLead(riga, { telefono, email });
  return { ok: true, nome, data: riga[0], doppione: !!esito.doppione, riga: esito.riga ?? null };
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
//  Posizioni dei clienti (mappa delle manutenzioni)
// ---------------------------------------------------------------------------

// Scheda "Coordinate" (dal 5 ott 2026): dove sta ogni cliente, per la mappa
// dell'app. Le coordinate le cerca il telefono su OpenStreetMap (Nominatim)
// e le manda qui, così ogni indirizzo si cerca una volta sola. "Indirizzo
// cercato" è l'indirizzo com'era quando si è cercato: se poi nel foglio
// cambia, la posizione non vale più e il telefono la ricerca. Precisione:
// "gps" (segnata sul posto col pulsante «Sono qui», dal 6 ott 2026: la più
// giusta, non si ricerca mai), "civico", "via", "paese" (centro del paese:
// posizione approssimativa) o "nessuna" (cercato e non trovato: non si
// riprova finché l'indirizzo non cambia). Nessuna automazione del foglio
// legge questa scheda.
export const TAB_COORDINATE = 'Coordinate';
const INTESTAZIONI_COORDINATE = ['Codice', 'Lat', 'Lng', 'Precisione', 'Indirizzo cercato', 'Aggiornato il'];
const PRECISIONI = ['gps', 'civico', 'via', 'paese', 'nessuna'];
export const indirizzoCercato = (indirizzo, citta) => [testo(indirizzo), testo(citta)].filter(Boolean).join(', ');

// Codice → { riga, lat, lng, prec, cercato }. Se un codice compare due
// volte (due telefoni insieme), vale l'ultima riga.
async function leggiCoordinate(foglio) {
  let griglia;
  try {
    griglia = await foglio.leggi(`'${TAB_COORDINATE}'!A1:F3000`, 'UNFORMATTED_VALUE');
  } catch (err) {
    if (err.status === 400) return new Map(); // scheda non ancora creata
    throw err;
  }
  const posizioni = new Map();
  for (let i = 1; i < griglia.length; i++) {
    const r = griglia[i] || [];
    const codice = testo(r[0]).toUpperCase();
    const prec = testo(r[3]);
    if (!/^C\d+$/.test(codice) || !PRECISIONI.includes(prec)) continue;
    const lat = r[1] === '' || r[1] == null ? NaN : Number(r[1]);
    const lng = r[2] === '' || r[2] == null ? NaN : Number(r[2]);
    const trovata = prec !== 'nessuna' && isFinite(lat) && isFinite(lng);
    posizioni.set(codice, { riga: i + 1, lat: trovata ? lat : null, lng: trovata ? lng : null, prec: trovata ? prec : 'nessuna', cercato: testo(r[4]) });
  }
  return posizioni;
}

// Salva le posizioni trovate dal telefono (al massimo 50 per volta). Ognuna
// vale solo se l'indirizzo del cliente è ancora quello che è stato cercato;
// se no si salta, e il telefono la ricercherà con l'indirizzo nuovo. Quella
// segnata sul posto ("gps") va bene anche per chi non ha ancora l'indirizzo.
export async function salvaPosizioni(foglio, { posizioni = [] }) {
  if (!Array.isArray(posizioni) || !posizioni.length) throw problema('Nessuna posizione da salvare.');
  if (posizioni.length > 50) throw problema('Troppe posizioni in una volta.');
  const [{ griglia, mappa }, esistenti] = await Promise.all([leggiClienti(foglio), leggiCoordinate(foglio)]);
  const cercatoOra = new Map();
  for (let i = mappa.riga; i < griglia.length; i++) {
    const r = griglia[i] || [];
    const codice = testo(r[mappa.col.CODICE - 1]).toUpperCase();
    if (codice) cercatoOra.set(codice, indirizzoCercato(r[mappa.col.INDIRIZZO - 1], r[mappa.col.CITTA - 1]));
  }

  const quando = testoData(oggi());
  const aggiorna = [];
  const nuove = [];
  const visti = new Set();
  let saltate = 0;
  for (const p of posizioni) {
    const codice = testo(p?.codice).toUpperCase();
    const cercato = cercatoOra.get(codice);
    const prec = PRECISIONI.includes(p?.prec) ? p.prec : null;
    if (cercato == null || (!cercato && prec !== 'gps') || !prec || visti.has(codice) || normalizza(p?.cercato) !== normalizza(cercato)) { saltate++; continue; }
    visti.add(codice);
    let lat = '';
    let lng = '';
    if (prec !== 'nessuna') {
      lat = Number(p.lat);
      lng = Number(p.lng);
      // Fuori dall'Italia (con margine) è un omonimo sbagliato, non un cliente.
      if (!(lat > 35 && lat < 48 && lng > 6 && lng < 19)) { saltate++; continue; }
      lat = Math.round(lat * 1e6) / 1e6;
      lng = Math.round(lng * 1e6) / 1e6;
    }
    const riga = [codice, lat, lng, prec, cercato, quando];
    const e = esistenti.get(codice);
    if (e) aggiorna.push({ range: `'${TAB_COORDINATE}'!A${e.riga}:F${e.riga}`, values: [riga] });
    else nuove.push(riga);
  }
  // RAW: le coordinate restano numeri, la data è solo un promemoria.
  if (aggiorna.length) await foglio.scrivi(aggiorna, 'RAW');
  if (nuove.length) await foglio.accodaRighe(TAB_COORDINATE, INTESTAZIONI_COORDINATE, nuove);
  return { ok: true, salvate: aggiorna.length + nuove.length, saltate };
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
    // Come copiaFormato, ma da una scheda a un'altra (per i clienti persi).
    async copiaFormatoTra(tabDa, rigaDa, tabA, rigaA, larghezza) {
      const da = await idScheda(tabDa);
      const a = await idScheda(tabA);
      if (da == null || a == null) return;
      await chiama(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            copyPaste: {
              source: { sheetId: da, startRowIndex: rigaDa - 1, endRowIndex: rigaDa, startColumnIndex: 0, endColumnIndex: larghezza },
              destination: { sheetId: a, startRowIndex: rigaA - 1, endRowIndex: rigaA, startColumnIndex: 0, endColumnIndex: larghezza },
              pasteType: 'PASTE_FORMAT',
            },
          }],
        }),
      });
    },
    // Crea una scheda vuota con la prima riga bloccata (se c'è già, niente).
    async creaScheda(tab) {
      await chiama(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab, gridProperties: { frozenRowCount: 1 } } } }] }),
      }).catch((e) => { if (!/already exists/i.test(e.testo)) throw e; });
      idSchede = null;
    },
    // Elimina UNA riga intera (le righe sotto salgono). Usata solo per
    // spostare un cliente fra Clienti-Impianti e Clienti-Persi, dopo aver
    // ricontrollato il codice su quella riga.
    async eliminaRiga(tab, riga) {
      const sheetId = await idScheda(tab);
      if (sheetId == null) throw new Error(`Scheda ${tab} non trovata`);
      await chiama(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: riga - 1, endIndex: riga } } }] }),
      });
    },
    // Copia l'aspetto (non il contenuto) di una cella su un'altra.
    async copiaCella(tab, rigaDa, colDa, rigaA, colA) {
      const sheetId = await idScheda(tab);
      if (sheetId == null) return;
      await chiama(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({
          requests: [{
            copyPaste: {
              source: { sheetId, startRowIndex: rigaDa - 1, endRowIndex: rigaDa, startColumnIndex: colDa - 1, endColumnIndex: colDa },
              destination: { sheetId, startRowIndex: rigaA - 1, endRowIndex: rigaA, startColumnIndex: colA - 1, endColumnIndex: colA },
              pasteType: 'PASTE_FORMAT',
            },
          }],
        }),
      });
    },
    // Lead nuovo: stessa funzione del modulo del sito (anti-doppioni compreso).
    // Scrive sul foglio di LEADS_SHEET_ID, che in produzione è lo stesso.
    async accodaLead(riga, contatti) {
      return appendOrMergeRow(TAB_LEAD, ['Data', 'Nome', 'Telefono / Email', 'Provenienza', 'Interesse', 'Stato', 'Note'], riga, contatti);
    },
    // Accoda una riga alla scheda (creandola con le intestazioni se non c'è).
    // Restituisce il range scritto, che serve per annullare.
    async accoda(tab, intestazioni, riga) {
      return this.accodaRighe(tab, intestazioni, [riga]);
    },
    // Come accoda, con più righe in una chiamata sola: un "append" di Google
    // non si accavalla con quello di un altro telefono nello stesso momento.
    async accodaRighe(tab, intestazioni, righe) {
      const append = () => chiama(
        `/values/${encodeURIComponent(`'${tab}'!A1`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
        { method: 'POST', body: JSON.stringify({ values: righe }) }
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
