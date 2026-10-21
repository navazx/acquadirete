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
const INTESTAZIONI_STORICO = ['Data', 'Codice', 'Cliente', 'Prossima manutenzione', 'Segnata da', 'Pagamento', 'Scadenza prima', 'Lavoro'];
// Come ha pagato il cliente (dal 19 ott 2026, richiesta di Matteo): l'app lo
// chiede subito dopo «Manutenzione fatta». «Da risentire» = non ha ancora
// pagato, va richiamato; si cambia dopo dallo storico. Vuoto = segnata prima
// di allora, o da una versione vecchia dell'app.
// «Gratis in garanzia» dal 21 ott 2026 (Matteo): fatta senza far pagare.
export const PAGAMENTI = ['Contanti', 'POS', 'Fattura e poi bonifico', 'Gratis in garanzia', 'Da risentire'];
const pagamentoDa = (v) => {
  const p = testo(v);
  if (!p) return '';
  const trovato = PAGAMENTI.find((x) => normalizza(x) === normalizza(p));
  if (!trovato) throw problema('Pagamento non valido.');
  return trovato;
};

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
// non si riattiva (non compare più fra le scadute); "Urgente" = va fatto in
// fretta: un guasto, ma anche una manutenzione di chi ha fretta (21 ott
// 2026). Il Motivo comincia con il giorno ("01/10/2026 — perde
// acqua"). Facoltative: le crea l'app la prima volta che servono. Nomi scelti
// apposta senza parole che usano le altre automazioni per trovare le loro
// colonne (manutenzione, note, zona, …): niente scambi di colonna.
const INTESTAZIONE_AVVISO = 'Sospesa / Urgente';
const INTESTAZIONE_MOTIVO = 'Motivo';
const AVVISI = ['Sospesa', 'Urgente'];
const avvisoDa = (v) => (/urgent/i.test(String(v ?? '')) ? 'Urgente' : /sospes/i.test(String(v ?? '')) ? 'Sospesa' : '');
// Colonna "Chi ci va" (dal 19 ott 2026): in quale giro del giorno sta il
// cliente, quello di Matteo o quello di babbo (vedi assegnaManutenzione).
// Contiene il nome della chiave con la maiuscola ("Matteo", "Babbo"); vuota
// = in nessun giro. Si svuota con «Manutenzione fatta»: fatta la tappa, esce
// dal giro. Anche questo nome evita le parole delle automazioni.
const INTESTAZIONE_CHI = 'Chi ci va';
const nomePersona = (k) => (k ? k.charAt(0).toUpperCase() + k.slice(1) : '');

async function leggiClienti(foglio) {
  const griglia = await foglio.leggi(`'${TAB_CLIENTI}'!A1:Z1500`, 'UNFORMATTED_VALUE');
  const mappa = colonnePerNome(griglia, COLONNE_CLIENTI, 'codice');
  // Solo corrispondenza esatta, come per "Data stato" dei lead.
  const intestazioni = (griglia[mappa.riga - 1] || []).map(normalizza);
  const iA = intestazioni.indexOf(normalizza(INTESTAZIONE_AVVISO));
  const iM = intestazioni.indexOf(normalizza(INTESTAZIONE_MOTIVO));
  const iC = intestazioni.indexOf(normalizza(INTESTAZIONE_CHI));
  if (iA !== -1) mappa.col.AVVISO = iA + 1;
  if (iM !== -1) mappa.col.MOTIVO = iM + 1;
  if (iC !== -1) mappa.col.CHI = iC + 1;
  return { griglia, mappa };
}

// Prima colonna libera dopo l'ultima intestazione (comprese quelle aggiunte dall'app).
const colonnaLibera = (mappa) => Math.max(mappa.larghezza, mappa.col.AVVISO || 0, mappa.col.MOTIVO || 0, mappa.col.CHI || 0) + 1;

// Crea le due intestazioni se mancano (subito dopo l'ultima colonna, con lo
// stesso aspetto delle altre) e restituisce le loro colonne.
async function colonneAvviso(foglio, mappa) {
  const scritture = [];
  for (const [campo, titolo] of [['AVVISO', INTESTAZIONE_AVVISO], ['MOTIVO', INTESTAZIONE_MOTIVO]]) {
    if (mappa.col[campo]) continue;
    const c = colonnaLibera(mappa);
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

// La colonna "Chi ci va", creata in fondo se manca.
async function colonnaChi(foglio, mappa) {
  if (mappa.col.CHI) return mappa.col.CHI;
  const c = colonnaLibera(mappa);
  await foglio.copiaCella(TAB_CLIENTI, mappa.riga, mappa.larghezza, mappa.riga, c).catch(() => {});
  await foglio.scrivi([{ range: `'${TAB_CLIENTI}'!${lettera(c)}${mappa.riga}`, values: [[INTESTAZIONE_CHI]] }], 'RAW');
  mappa.col.CHI = c;
  return c;
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
    // In quale giro del giorno sta, come nome di chiave ("matteo"); '' = in nessuno.
    chiVa: col.CHI ? testo(v('CHI')).toLowerCase() : '',
  };
}

export async function leggiTutto(foglio) {
  // Le posizioni per la mappa: se la scheda non si legge, l'app va lo stesso.
  const posizioni = leggiCoordinate(foglio).catch((err) => {
    console.error('Coordinate non lette:', err);
    return new Map();
  });
  // Lo storico degli interventi (e come hanno pagato): idem.
  const storico = leggiStorico(foglio).catch((err) => {
    console.error('Storico non letto:', err);
    return [];
  });
  // Le tappe dei giri: idem.
  const giri = leggiGiri(foglio).catch((err) => {
    console.error('Giri non letti:', err);
    return { tappe: [] };
  });
  // Il magazzino (dal 20 ott 2026): idem. null = non c'è ancora.
  const magazzino = leggiMagazzino(foglio, { completa: true }).then(magazzinoPerApp).catch((err) => {
    console.error('Magazzino non letto:', err);
    return null;
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
  // il cliente risulta "da cercare" e il telefono la ricerca. Quella segnata
  // sul posto vale finché il paese è lo stesso (gpsNelPaese).
  const pos = await posizioni;
  for (const c of clienti) {
    const p = pos.get(c.codice.toUpperCase());
    if (!p) continue;
    if (normalizza(p.cercato) !== normalizza(indirizzoCercato(c.indirizzo, c.citta))
      && !(p.prec === 'gps' && gpsNelPaese(p.cercato, c.citta))) continue;
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

  // Le tappe: le righe di "Giri" più quelle ancora nella colonna "Chi ci va"
  // (del 19 ott), come tappe di oggi senza ora, se il cliente non ha già una
  // tappa da fare. Senza `riga`: al telefono non serve.
  const { tappe: righeGiri } = await giri;
  const tappe = righeGiri.map(({ riga, ...t }) => t);
  for (const c of clienti) {
    if (!c.chiVa || tappe.some((t) => t.codice === c.codice && !t.stato)) continue;
    tappe.push({ id: idDaColonna(c.codice), giorno: '', ora: '', oraFine: '', chi: c.chiVa, lavoro: 'Manutenzione', codice: c.codice, contatto: '', nome: c.nome, indirizzo: c.indirizzo, citta: c.citta, telefono: '', note: '', lat: null, lng: null, stato: '', vecchia: true });
  }

  return {
    oggi: serialeDa(...Object.values(oggi())), clienti, lead, persi, stati: STATI_LEAD, storico: await storico, pagamenti: PAGAMENTI,
    tappe, lavori: LAVORI, magazzino: await magazzino,
  };
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
//  Storico interventi
// ---------------------------------------------------------------------------
// Scheda "Storico-Interventi": una riga per ogni «Manutenzione fatta» segnata
// dall'app (la scrive segnaFatta, l'annulla la svuota) e, dal 21 ott 2026,
// per ogni guasto riparato (segnaRiparazione, colonna "Lavoro" = "Guasto"). Riga 1 = intestazioni,
// trovate per nome. Le automazioni del foglio non la leggono. Dal 19 ott 2026
// l'app la mostra («Interventi fatti») e ci scrive come ha pagato il cliente.
async function leggiGrigliaStorico(foglio, celle = 'A1:J5000') {
  try {
    return await foglio.leggi(`'${TAB_STORICO}'!${celle}`, 'FORMATTED_VALUE');
  } catch (err) {
    if (err.status === 400) return null; // scheda non ancora creata
    throw err;
  }
}
const colonneStorico = (griglia) => {
  const testa = ((griglia && griglia[0]) || []).map(normalizza);
  const c = (nome) => testa.indexOf(normalizza(nome));
  return { data: c('Data'), codice: c('Codice'), nome: c('Cliente'), prossima: c('Prossima manutenzione'), da: c('Segnata da'), pagamento: c('Pagamento'), prima: c('Scadenza prima'), lavoro: c('Lavoro'), larghezza: testa.length };
};
// La colonna "Lavoro" (dal 21 ott 2026): "Manutenzione" o "Guasto" (una
// riparazione, segnaRiparazione). Vuota = manutenzione, le righe di prima.
const lavoroStorico = (v) => (normalizza(v) === 'guasto' ? 'Guasto' : '');
// "App (matteo)" → "matteo".
const chiDaSegnata = (s) => ((String(s).match(/\(([^)]+)\)\s*$/) || [])[1] || '').trim().toLowerCase();

async function leggiStorico(foglio) {
  const g = await leggiGrigliaStorico(foglio);
  if (!g || !g.length) return [];
  const k = colonneStorico(g);
  if (k.codice < 0 || k.data < 0) return [];
  const v = (r, i) => (i < 0 ? '' : testo(r[i]));
  const lista = [];
  for (let i = 1; i < g.length; i++) {
    const r = g[i] || [];
    const codice = v(r, k.codice).toUpperCase();
    if (!codice) continue; // riga svuotata da un annulla
    lista.push({ riga: i + 1, data: v(r, k.data), codice, nome: v(r, k.nome), prossima: v(r, k.prossima), chi: chiDaSegnata(v(r, k.da)), pagamento: v(r, k.pagamento), prima: v(r, k.prima), lavoro: lavoroStorico(v(r, k.lavoro)) });
  }
  return lista;
}

// Una colonna dello storico aggiunta dopo: "Pagamento" (la scheda nata
// prima del 19 ott 2026 ne ha cinque) e "Scadenza prima" (dal 21 ott 2026:
// la prossima manutenzione com'era prima dell'intervento, per rimetterla
// giusta se l'intervento si cancella). L'intestazione si aggiunge in fondo,
// con l'aspetto delle altre. null = la scheda non c'è ancora (la crea
// accoda, già con tutte le colonne).
async function colonnaStorico(foglio, nome) {
  const g = await leggiGrigliaStorico(foglio, 'A1:J1');
  if (!g || !g.length) return null;
  const testa = (g[0] || []).map(normalizza);
  const i = testa.indexOf(normalizza(nome));
  if (i >= 0) return i + 1;
  const c = testa.length + 1;
  await foglio.copiaCella(TAB_STORICO, 1, testa.length, 1, c).catch(() => {});
  await foglio.scrivi([{ range: `'${TAB_STORICO}'!${lettera(c)}1`, values: [[nome]] }], 'RAW');
  return c;
}
const colonnaPagamento = (foglio) => colonnaStorico(foglio, 'Pagamento');

// Cambia come ha pagato un intervento già nello storico («Da risentire» che
// poi paga, o un pagamento segnato sbagliato). L'intervento si riconosce da
// codice + data, non dal numero di riga visto dal telefono (che vale solo se
// combacia ancora). Si annulla rimettendo il pagamento di prima.
// La riga di un intervento: quella vista dal telefono se combacia ancora
// (codice + data), se no l'ultima che combacia.
function rigaIntervento(g, k, riga, cod, data) {
  const combacia = (n) => { const r = g[n - 1] || []; return testo(r[k.codice]).toUpperCase() === cod && testo(r[k.data]) === testo(data); };
  let n = Number(riga);
  if (!(n > 1 && combacia(n))) {
    n = 0;
    for (let i = g.length; i > 1 && !n; i--) if (combacia(i)) n = i;
  }
  if (!n) throw problema('Non trovo più questo intervento nello storico. Riapri l\'app e riprova.', 409);
  return n;
}

export async function cambiaPagamento(foglio, { riga, codice, data, pagamento }) {
  const pag = pagamentoDa(pagamento);
  const cod = testo(codice).toUpperCase();
  const g = await leggiGrigliaStorico(foglio);
  if (!g || !g.length) throw problema('Non trovo lo storico degli interventi. Chiedi a Matteo.', 409);
  const k = colonneStorico(g);
  const n = rigaIntervento(g, k, riga, cod, data);
  const prima = k.pagamento >= 0 ? testo((g[n - 1] || [])[k.pagamento]) : '';
  const c = k.pagamento >= 0 ? k.pagamento + 1 : await colonnaPagamento(foglio);
  await foglio.scrivi([{ range: `'${TAB_STORICO}'!${lettera(c)}${n}`, values: [[pag]] }], 'RAW');
  return { ok: true, riga: n, pagamento: pag, annulla: { riga: n, codice: cod, data: testo(data), pagamento: prima } };
}

// Cancellare un intervento fatto (21 ott 2026, Matteo: a lui, a babbo e alla
// segretaria sì, a un dipendente no: il permesso sta negli Accessi). Prima la
// riga si copia nella scheda "Interventi-Cancellati", con quando e chi, poi
// si svuota nello storico: così non si perde niente e si può annullare.
// `rimetti`: se è stato questo intervento a spostare la prossima
// manutenzione, la riporta indietro: alla "Scadenza prima" scritta nella
// riga (dal 21 ott 2026), se no alla scadenza dell'intervento prima, se no
// al giorno dell'intervento (la manutenzione torna da fare). Non la tocca se nel frattempo è cambiata, o se un altro intervento
// dello stesso cliente la tiene lì (un doppione segnato due volte).
// I materiali usati restano: si tolgono dalla scheda del cliente.
export const TAB_CANCELLATI = 'Interventi-Cancellati';
const scadenzaDopoCancellazione = (g, k, n, cod) => {
  const r = g[n - 1] || [];
  const sua = serialeDaCella(testo(r[k.prossima]));
  const fattaIl = serialeDaCella(testo(r[k.data]));
  const altre = [];
  for (let i = 2; i <= g.length; i++) {
    const x = g[i - 1] || [];
    if (i === n || testo(x[k.codice]).toUpperCase() !== cod) continue;
    const s = serialeDaCella(testo(x[k.prossima]));
    if (s != null) altre.push(s);
  }
  if (sua == null || altre.some((s) => s >= sua)) return { sua, nuova: null };
  // Segnata dal 21 ott 2026: la scadenza di prima è scritta nella riga.
  const prima = k.prima >= 0 ? serialeDaCella(testo(r[k.prima])) : null;
  if (prima != null) return { sua, nuova: prima };
  return { sua, nuova: altre.length ? Math.max(...altre) : fattaIl };
};

export async function cancellaIntervento(foglio, { riga, codice, data, rimetti = false }, { chi = 'app' } = {}) {
  const cod = testo(codice).toUpperCase();
  const g = await leggiGrigliaStorico(foglio);
  if (!g || !g.length) throw problema('Non trovo lo storico degli interventi.', 409);
  const k = colonneStorico(g);
  const n = rigaIntervento(g, k, riga, cod, data);
  const valori = Array.from({ length: k.larghezza }, (_, i) => testo((g[n - 1] || [])[i]));
  const testa = (g[0] || []).slice(0, k.larghezza).map(testo);

  // Prima la copia (se qualcosa va storto qui, l'intervento è ancora al suo posto).
  const cancellato = await foglio.accoda(TAB_CANCELLATI, [...testa, 'Cancellato il', 'Cancellato da'],
    [...valori, testoData(oggi()), `App (${chi})`]);
  const larghezza = `'${TAB_STORICO}'!A${n}:${lettera(k.larghezza)}${n}`;
  await foglio.svuota(larghezza);

  let scadenza = null;
  if (rimetti) {
    const { sua, nuova } = scadenzaDopoCancellazione(g, k, n, cod);
    try {
      const { griglia, mappa } = await leggiClienti(foglio);
      const rc = trovaCliente(griglia, mappa, cod);
      const cella = `'${TAB_CLIENTI}'!${lettera(mappa.col.MANUTENZIONE)}${rc}`;
      const attuale = serialeDaCella((griglia[rc - 1] || [])[mappa.col.MANUTENZIONE - 1]);
      if (nuova != null && attuale === sua) {
        const [[prima = '']] = (await foglio.leggi(cella, 'FORMULA')).concat([['']]);
        await foglio.scrivi([{ range: cella, values: [[nuova]] }], 'RAW');
        scadenza = { prima, scritto: nuova, prossima: testoData(dataDaSeriale(nuova)) };
      }
    } catch (err) {
      // Il cliente può essere fra i persi: l'intervento è cancellato lo stesso.
      if (!err.perUtente) throw err;
    }
  }
  return {
    ok: true, nome: valori[k.nome] || cod, prossima: scadenza ? scadenza.prossima : '',
    annulla: { riga: n, codice: cod, data: testo(data), valori, cancellato, scadenza },
  };
}

// «Annulla» della cancellazione: la riga torna nello storico (al suo posto,
// se è ancora vuoto), sparisce dai cancellati e la scadenza torna com'era.
export async function annullaCancellazione(foglio, { riga, codice, valori, cancellato, scadenza }) {
  const cod = testo(codice).toUpperCase();
  if (!Array.isArray(valori) || !valori.length || valori.length > 12) throw problema('Non riesco ad annullare.', 422);
  const righe = valori.map((v) => testo(v).slice(0, 300));
  const g = await leggiGrigliaStorico(foglio);
  if (!g || !g.length) throw problema('Non trovo lo storico degli interventi.', 409);
  const k = colonneStorico(g);
  if (testo(righe[k.codice]).toUpperCase() !== cod) throw problema('Non riesco ad annullare.', 422);
  const n = Number(riga);
  if (n > 1 && !(g[n - 1] || []).some((v) => testo(v))) {
    await foglio.scrivi([{ range: `'${TAB_STORICO}'!A${n}`, values: [righe] }], 'RAW');
  } else {
    await foglio.accoda(TAB_STORICO, INTESTAZIONI_STORICO, righe);
  }
  if (typeof cancellato === 'string' && /^'?Interventi-Cancellati'?!A\d+:[A-Z]+\d+$/.test(cancellato)) {
    await foglio.svuota(cancellato).catch((err) => console.error('Cancellati non svuotati:', err));
  }
  // La scadenza: con le stesse regole dell'annulla di «fatta».
  if (scadenza && typeof scadenza.scritto === 'number') {
    await annullaFatta(foglio, { codice: cod, prima: scadenza.prima, scritto: scadenza.scritto })
      .catch((err) => { if (!err.perUtente) throw err; });
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  Chi usa l'app e cosa può fare (21 ott 2026)
// ---------------------------------------------------------------------------
// Matteo: «fai un profilo di accesso per la segretaria; a me, babbo e alla
// segretaria fai cancellare gli interventi fatti ma non a un futuro
// dipendente, e imposta già il modo di dare le autorizzazioni dalle
// impostazioni, che posso vedere solo io». Le persone sono i nomi delle
// chiavi di GESTIONE_CHIAVE (babbo, matteo, segretaria…): una persona nuova
// si aggiunge lì, con la sua chiave. Il nome mostrato e i permessi stanno
// nella scheda "Accessi" del foglio, una riga per persona («Sì»/«No»); chi
// non ha la riga ha quelli di base qui sotto, e un dipendente nuovo ha il
// giro ma non cancella niente. Il titolare (matteo) può sempre tutto ed è
// l'unico che vede le impostazioni e cambia gli accessi. Nessuna
// automazione del foglio legge questa scheda.
export const TAB_ACCESSI = 'Accessi';
export const TITOLARE = 'matteo';
export const PERMESSI = [
  { id: 'giro', colonna: 'Ha un giro', nome: 'Ha un suo giro del giorno', spiega: 'Va dai clienti: gli si possono dare delle tappe.' },
  { id: 'cancellaInterventi', colonna: 'Cancella interventi', nome: 'Cancella gli interventi fatti', spiega: 'Dalla pagina «Interventi fatti».' },
  { id: 'togliClienti', colonna: 'Toglie clienti', nome: 'Toglie i clienti (fra i persi)', spiega: '«Non è più nostro cliente», nella scheda del cliente.' },
];
const COLONNE_ACCESSI = ['Persona', 'Nome', ...PERMESSI.map((p) => p.colonna), 'Cambiato il'];
const ACCESSI_DI_BASE = {
  matteo: { nome: 'Matteo', giro: true, cancellaInterventi: true, togliClienti: true },
  babbo: { nome: 'Stefano', giro: true, cancellaInterventi: true, togliClienti: true },
  segretaria: { nome: 'Segretaria', giro: false, cancellaInterventi: true, togliClienti: true },
};
const ACCESSI_NUOVO = { giro: true, cancellaInterventi: false, togliClienti: false };
const accessoDiBase = (p) => ({ nome: p.charAt(0).toUpperCase() + p.slice(1), ...ACCESSI_NUOVO, ...ACCESSI_DI_BASE[p] });
const siNo = (v) => {
  const n = normalizza(v);
  return ['si', 'x', 'vero', 'true', '1'].includes(n) ? true : ['no', 'falso', 'false', '0'].includes(n) ? false : null;
};

async function leggiGrigliaAccessi(foglio) {
  try {
    return await foglio.leggi(`'${TAB_ACCESSI}'!A1:J100`, 'FORMATTED_VALUE');
  } catch (err) {
    if (err.status === 400) return null; // scheda non ancora creata
    throw err;
  }
}
const colonneAccessi = (g) => {
  const testa = ((g && g[0]) || []).map(normalizza);
  return Object.fromEntries(COLONNE_ACCESSI.map((n) => [n, testa.indexOf(normalizza(n))]));
};

// Gli accessi delle persone `persone` (in quell'ordine). Se la scheda non si
// legge l'errore sale: chi controlla un permesso non deve tirare a indovinare.
export async function leggiAccessi(foglio, persone) {
  const g = await leggiGrigliaAccessi(foglio);
  const k = colonneAccessi(g);
  const righe = new Map();
  if (g && k.Persona >= 0) {
    for (let i = 1; i < g.length; i++) {
      const p = normalizza((g[i] || [])[k.Persona]).replace(/ /g, '');
      if (p && !righe.has(p)) righe.set(p, { r: g[i] || [], riga: i + 1 });
    }
  }
  return persone.map((p) => {
    const a = { persona: p, ...accessoDiBase(p), titolare: p === TITOLARE, scritto: false };
    const x = righe.get(p);
    if (x) {
      a.scritto = true;
      const nome = k.Nome >= 0 ? testo(x.r[k.Nome]) : '';
      if (nome) a.nome = nome.slice(0, 30);
      for (const pe of PERMESSI) {
        const v = k[pe.colonna] >= 0 ? siNo(x.r[k[pe.colonna]]) : null;
        if (v != null) a[pe.id] = v;
      }
    }
    if (a.titolare) PERMESSI.forEach((pe) => { a[pe.id] = true; });
    return a;
  });
}
// Quando la scheda non si legge e serve solo per mostrare (la GET).
export const accessiDiBase = (persone) => persone.map((p) => {
  const a = { persona: p, ...accessoDiBase(p), titolare: p === TITOLARE, scritto: false };
  if (a.titolare) PERMESSI.forEach((pe) => { a[pe.id] = true; });
  return a;
});

// Le impostazioni di Matteo: il nome mostrato e i permessi di una persona.
// Al titolare si cambia solo il nome. Si annulla rimandando quelli di prima.
export async function salvaAccessi(foglio, { persona, nome, permessi = {} }, { chi, tutti = [] } = {}) {
  if (chi !== TITOLARE) throw problema('Le impostazioni le può cambiare solo Matteo.', 403);
  const p = testo(persona).toLowerCase();
  if (!tutti.includes(p)) throw problema('Questa persona non ha l\'app.', 400);
  const n = testo(nome).replace(/\s+/g, ' ');
  if (!n || n.length > 30 || !/^[\p{L}' .-]+$/u.test(n)) throw problema('Scrivi il nome con sole lettere (al massimo 30).');

  const [prima] = await leggiAccessi(foglio, [p]);
  let g = await leggiGrigliaAccessi(foglio);
  if (!g || !g.length) {
    await foglio.creaScheda(TAB_ACCESSI);
    await foglio.scrivi([{ range: `'${TAB_ACCESSI}'!A1`, values: [COLONNE_ACCESSI] }], 'RAW');
    g = [COLONNE_ACCESSI];
  }
  // Le colonne che mancano (un permesso aggiunto dopo) si aggiungono in fondo.
  const k = colonneAccessi(g);
  let larghezza = (g[0] || []).length;
  const scritture = [];
  for (const c of COLONNE_ACCESSI) {
    if (k[c] >= 0) continue;
    k[c] = larghezza++;
    scritture.push({ range: `'${TAB_ACCESSI}'!${lettera(k[c] + 1)}1`, values: [[c]] });
  }
  let riga = 0;
  let ultima = 1;
  for (let i = 1; i < g.length; i++) {
    const r = g[i] || [];
    if (r.some((v) => testo(v))) ultima = i + 1;
    if (!riga && normalizza(r[k.Persona]).replace(/ /g, '') === p) riga = i + 1;
  }
  if (!riga) riga = ultima + 1;
  const vale = (pe) => (p === TITOLARE ? true : typeof permessi[pe.id] === 'boolean' ? permessi[pe.id] : prima[pe.id]);
  const cella = (c, v) => scritture.push({ range: `'${TAB_ACCESSI}'!${lettera(k[c] + 1)}${riga}`, values: [[v]] });
  cella('Persona', p);
  cella('Nome', n);
  PERMESSI.forEach((pe) => cella(pe.colonna, vale(pe) ? 'Sì' : 'No'));
  cella('Cambiato il', testoData(oggi()));
  await foglio.scrivi(scritture, 'RAW');
  const [dopo] = await leggiAccessi(foglio, [p]);
  return {
    ok: true, accesso: dopo,
    annulla: { persona: p, nome: prima.nome, permessi: Object.fromEntries(PERMESSI.map((pe) => [pe.id, prima[pe.id]])) },
  };
}

// ---------------------------------------------------------------------------
//  Giri del giorno («Chi ci va»)
// ---------------------------------------------------------------------------
// I giri di Matteo e di babbo, condivisi fra i due telefoni (19 ott 2026,
// Matteo: «un gestore della gita giornaliera con i clienti che decido di fare
// io e quelli del babbo, e un pulsante per spostarli dalla mia alla sua
// lista»). Un cliente sta nel giro di `a` (nome della chiave), o in nessuno
// (''). Le persone possibili sono quelle di GESTIONE_CHIAVE. `codici` (al
// massimo 20) per spostarne tanti insieme («Svuota il giro»).
export async function assegnaManutenzione(foglio, { codice, codici, a = '' }, { persone = [] } = {}) {
  const chi = testo(a).toLowerCase();
  if (chi && !persone.includes(chi)) throw problema('Scelta non valida.');
  const lista = Array.isArray(codici) ? codici : [codice];
  if (!lista.length || lista.length > 20) throw problema('Scelta non valida.');
  const { griglia, mappa } = await leggiClienti(foglio);
  const righe = lista.map((k) => ({ codice: testo(k).toUpperCase(), riga: trovaCliente(griglia, mappa, k) }));
  const prima = righe.map(({ codice: k, riga }) => ({ codice: k, a: mappa.col.CHI ? testo((griglia[riga - 1] || [])[mappa.col.CHI - 1]).toLowerCase() : '' }));
  if (chi || mappa.col.CHI) {
    const c = await colonnaChi(foglio, mappa);
    await foglio.scrivi(righe.map(({ riga }) => ({ range: `'${TAB_CLIENTI}'!${lettera(c)}${riga}`, values: [[nomePersona(chi)]] })), 'RAW');
  }
  const nome = testo((griglia[righe[0].riga - 1] || [])[mappa.col.NOME - 1]);
  // Per uno solo, l'annulla rimette il giro di prima. «Svuota» chiede conferma prima.
  return { ok: true, nome, chiVa: chi, annulla: Array.isArray(codici) ? null : prima[0] };
}

// ---------------------------------------------------------------------------
//  Tappe dei giri (scheda "Giri")
// ---------------------------------------------------------------------------
// Dal 20 ott 2026 (Matteo: «aggiungere al giro mio o di babbo anche lavori che
// non sono le manutenzioni scadute, tipo un guasto, una nuova installazione,
// un sopralluogo; e nel giro gli orari») ogni tappa è una riga della scheda
// "Giri": il giorno, l'ora (facoltativa), di chi è, che lavoro è, e chi si va
// a trovare. Può essere un cliente (Codice), un contatto di Lead-Contatti non
// ancora cliente (Contatto = "data|nome") o un indirizzo qualsiasi; nome,
// indirizzo e posizione sono scritti nella riga, così la tappa si apre anche
// senza il cliente. L'Id lo sceglie il telefono: la stessa richiesta arrivata
// due volte (senza campo) aggiorna la stessa riga invece di farne due.
// Le tappe tolte si svuotano (le righe non si spostano mai). La colonna
// "Chi ci va" di Clienti-Impianti (19 ott) resta letta come «tappa di oggi
// senza ora» finché quella tappa non si tocca: allora diventa una riga qui.
// Nessuna automazione del foglio legge questa scheda. Dal 21 ott 2026 (Matteo:
// «nel caso che il cliente ci dica una fascia oraria») la colonna Q «Fino
// alle» chiude la fascia: «Ora» 09:00 e «Fino alle» 11:00 = fra le 9 e le 11.
// Vuota = un orario solo (o nessuno). La scheda nata prima ne ha 16: la
// diciassettesima intestazione la scrive salvaTappa la prima volta che serve.
export const TAB_GIRI = 'Giri';
const INTESTAZIONI_GIRI = ['Id', 'Giorno', 'Ora', 'Chi', 'Lavoro', 'Codice', 'Contatto', 'Nome', 'Indirizzo', 'Città', 'Telefono', 'Note', 'Lat', 'Lng', 'Stato', 'Aggiunta il', 'Fino alle'];
const ULTIMA_GIRI = lettera(INTESTAZIONI_GIRI.length); // Q
export const LAVORI = ['Manutenzione', 'Guasto', 'Installazione', 'Sopralluogo', 'Altro'];
const G = Object.fromEntries(INTESTAZIONI_GIRI.map((h, i) => [h, i]));

async function leggiGiri(foglio) {
  let griglia;
  try {
    griglia = await foglio.leggi(`'${TAB_GIRI}'!A1:${ULTIMA_GIRI}3000`, 'UNFORMATTED_VALUE');
  } catch (err) {
    if (err.status === 400) return { griglia: null, tappe: [] }; // scheda non ancora creata
    throw err;
  }
  const tappe = [];
  for (let i = 1; i < (griglia || []).length; i++) {
    const r = griglia[i] || [];
    const id = testo(r[G.Id]);
    if (!id) continue; // tappa tolta
    const lat = Number(r[G.Lat]);
    const lng = Number(r[G.Lng]);
    tappe.push({
      riga: i + 1, id, giorno: testo(r[G.Giorno]), ora: testo(r[G.Ora]), oraFine: testo(r[G['Fino alle']]), chi: testo(r[G.Chi]).toLowerCase(),
      lavoro: testo(r[G.Lavoro]), codice: testo(r[G.Codice]).toUpperCase(), contatto: testo(r[G.Contatto]),
      nome: testo(r[G.Nome]), indirizzo: testo(r[G.Indirizzo]), citta: testo(r[G.Città]), telefono: testo(r[G.Telefono]),
      note: testo(r[G.Note]), lat: r[G.Lat] === '' || !isFinite(lat) ? null : lat, lng: r[G.Lng] === '' || !isFinite(lng) ? null : lng,
      stato: testo(r[G.Stato]),
    });
  }
  return { griglia, tappe };
}

// La tappa vecchia della colonna "Chi ci va", finché non diventa una riga.
const idDaColonna = (codice) => `col-${codice}`;
async function togliDaColonna(foglio, codice) {
  const { griglia, mappa } = await leggiClienti(foglio);
  if (!mappa.col.CHI) return;
  const riga = trovaCliente(griglia, mappa, codice);
  if (!testo((griglia[riga - 1] || [])[mappa.col.CHI - 1])) return;
  await foglio.scrivi([{ range: `'${TAB_CLIENTI}'!${lettera(mappa.col.CHI)}${riga}`, values: [['']] }], 'RAW');
}

const rigaGiro = (t) => INTESTAZIONI_GIRI.map((h) => {
  const v = { Id: t.id, Giorno: t.giorno, Ora: t.ora, Chi: nomePersona(t.chi), Lavoro: t.lavoro, Codice: t.codice, Contatto: t.contatto, Nome: t.nome,
    Indirizzo: t.indirizzo, 'Città': t.citta, Telefono: t.telefono, Note: t.note, Lat: t.lat ?? '', Lng: t.lng ?? '', Stato: t.stato, 'Aggiunta il': t.aggiunta,
    'Fino alle': t.oraFine }[h];
  return v == null ? '' : v;
});

// Aggiunge o cambia una tappa (stesso Id = stessa tappa). Restituisce la
// tappa di prima per l'annulla (o null se è nuova: l'annulla la toglie).
export async function salvaTappa(foglio, dati, { persone = [], chi: chiScrive = 'app' } = {}) {
  const id = testo(dati.id);
  if (!/^[\w-]{6,40}$/.test(id)) throw problema('Tappa non valida.');
  const chi = testo(dati.chi).toLowerCase();
  if (!persone.includes(chi)) throw problema('Scegli di chi è il giro.');
  const lavoro = LAVORI.find((l) => normalizza(l) === normalizza(dati.lavoro)) || 'Altro';
  const giorno = leggiDataUtente(dati.giorno);
  if (!giorno) throw problema('Scegli il giorno della tappa.');
  const serG = serialeDa(giorno.a, giorno.m, giorno.g);
  const serOggi = serialeDa(...Object.values(oggi()));
  if (serG < serOggi - 400 || serG > serOggi + 400) throw problema('Il giorno è troppo lontano: controlla la data.');
  // "9:00" → "09:00"; vuoto → ''; altro → errore.
  const orario = (v) => {
    const s = testo(v);
    if (!s) return '';
    const m = s.match(/^(\d{1,2})[:.](\d{2})$/);
    if (!(m && +m[1] < 24 && +m[2] < 60)) throw problema('Orario non valido.');
    return `${m[1].padStart(2, '0')}:${m[2]}`;
  };
  const ora = orario(dati.ora);
  let oraFine = orario(dati.oraFine);
  if (oraFine && !ora) throw problema('Scrivi da che ora: la fascia comincia da lì.');
  if (oraFine && oraFine <= ora) throw problema('La fascia deve finire dopo che comincia: controlla gli orari.');
  if (oraFine === ora) oraFine = '';
  const codice = testo(dati.codice).toUpperCase();
  if (codice && !/^C\d+$/.test(codice)) throw problema('Codice cliente non valido.');
  const nome = testo(dati.nome).slice(0, 120);
  if (!nome) throw problema('Manca il nome della tappa.');
  const numero = (v) => (v === '' || v == null || !isFinite(Number(v)) ? null : Math.round(Number(v) * 1e6) / 1e6);
  const lat = numero(dati.lat);
  const lng = numero(dati.lng);
  const tappa = {
    id, giorno: testoData(giorno), ora, oraFine, chi, lavoro, codice,
    contatto: testo(dati.contatto).slice(0, 120), nome, indirizzo: testo(dati.indirizzo).slice(0, 200), citta: testo(dati.citta).slice(0, 80),
    telefono: testo(dati.telefono).slice(0, 80), note: testo(dati.note).slice(0, 300),
    lat: lat != null && lat > 35 && lat < 48 ? lat : null, lng: lng != null && lng > 6 && lng < 19 ? lng : null,
    stato: testo(dati.stato) === 'Fatta' ? 'Fatta' : '', aggiunta: `${testoData(oggi())} (${chiScrive})`,
  };
  const { griglia, tappe } = await leggiGiri(foglio);
  const prima = tappe.find((t) => t.id === id) || null;
  // La scheda nata con 16 colonne: l'intestazione «Fino alle», con l'aspetto delle altre.
  if (griglia && griglia.length && (griglia[0] || []).length < INTESTAZIONI_GIRI.length && !testo((griglia[0] || [])[G['Fino alle']])) {
    await foglio.copiaCella(TAB_GIRI, 1, G['Fino alle'], 1, G['Fino alle'] + 1).catch(() => {});
    await foglio.scrivi([{ range: `'${TAB_GIRI}'!${ULTIMA_GIRI}1`, values: [['Fino alle']] }], 'RAW');
  }
  if (prima) {
    tappa.aggiunta = testo((griglia[prima.riga - 1] || [])[G['Aggiunta il']]) || tappa.aggiunta;
    await foglio.scrivi([{ range: `'${TAB_GIRI}'!A${prima.riga}:${ULTIMA_GIRI}${prima.riga}`, values: [rigaGiro(tappa)] }], 'RAW');
  } else {
    await foglio.accodaRighe(TAB_GIRI, INTESTAZIONI_GIRI, [rigaGiro(tappa)]);
  }
  // La tappa vecchia di "Chi ci va" ora è una riga: la colonna si svuota.
  if (id.startsWith('col-') && codice) await togliDaColonna(foglio, codice).catch((err) => console.error('Chi ci va non svuotata:', err));
  return { ok: true, tappa, annulla: prima ? { ...prima, riga: undefined } : { id, togli: true } };
}

// Toglie una tappa dal giro (la riga si svuota). L'annulla la rimette uguale.
export async function togliTappa(foglio, { id }) {
  const k = testo(id);
  if (k.startsWith('col-')) {
    await togliDaColonna(foglio, k.slice(4).toUpperCase());
    return { ok: true, annulla: null };
  }
  const { tappe } = await leggiGiri(foglio);
  const t = tappe.find((x) => x.id === k);
  if (!t) return { ok: true, giaTolta: true, annulla: null };
  await foglio.svuota(`'${TAB_GIRI}'!A${t.riga}:${ULTIMA_GIRI}${t.riga}`);
  return { ok: true, annulla: { ...t, riga: undefined } };
}

// Le tappe di un cliente non ancora fatte, fino al giorno della manutenzione
// fatta compreso: diventano «Fatta». Restituisce gli Id, per l'annulla.
// `quali`: solo alcune (una riparazione chiude solo le tappe «Guasto»).
async function segnaTappeFatte(foglio, codice, serQuando, quali = () => true) {
  const { tappe } = await leggiGiri(foglio);
  const fatte = tappe.filter((t) => t.codice === codice && !t.stato && (serialeDaCella(t.giorno) ?? Infinity) <= serQuando && quali(t));
  if (fatte.length) await foglio.scrivi(fatte.map((t) => ({ range: `'${TAB_GIRI}'!O${t.riga}`, values: [['Fatta']] })), 'RAW');
  return fatte.map((t) => t.id);
}
async function rimettiTappe(foglio, ids) {
  if (!Array.isArray(ids) || !ids.length) return;
  const { tappe } = await leggiGiri(foglio);
  const daRimettere = tappe.filter((t) => ids.includes(t.id) && t.stato === 'Fatta');
  if (daRimettere.length) await foglio.scrivi(daRimettere.map((t) => ({ range: `'${TAB_GIRI}'!O${t.riga}`, values: [['']] })), 'RAW');
}

// ---------------------------------------------------------------------------
//  Manutenzione fatta
// ---------------------------------------------------------------------------

// Segna la manutenzione fatta il giorno `data` (di default oggi): "Prossima
// manutenzione" diventa data + frequenza, come chiede il foglio stesso
// ("Aggiornala quando fai l'intervento"). Restituisce quel che serve per
// annullare.
export async function segnaFatta(foglio, { codice, data, frequenza, pagamento }, { chi = 'app' } = {}) {
  const quando = data ? leggiDataUtente(data) : oggi();
  if (!quando) throw problema('Data non valida.');
  const pag = pagamentoDa(pagamento);
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

  const prossima = piuMesi(quando, mesi);
  const serProssima = serialeDa(prossima.a, prossima.m, prossima.g);
  const nome = testo(r[col.NOME - 1]);
  // La stessa richiesta arrivata due volte: il telefono senza campo riprova,
  // ma la prima era già passata (15 ott 2026). La data è già quella giusta:
  // non si riscrive niente e lo storico non si ripete.
  if (serialeDaCella(r[col.MANUTENZIONE - 1]) === serProssima) {
    return { ok: true, nome, fatta: testoData(quando), prossima: testoData(prossima), annulla: null, giaSegnata: true };
  }

  // Cosa c'era prima (formula compresa), per poterlo rimettere.
  const cellaK = `'${TAB_CLIENTI}'!${lettera(col.MANUTENZIONE)}${riga}`;
  const [[prima = '']] = (await foglio.leggi(cellaK, 'FORMULA')).concat([['']]);
  const scritture = [{ range: cellaK, values: [[serProssima]] }];
  if (frequenzaScritta) {
    scritture.push({ range: `'${TAB_CLIENTI}'!${lettera(col.FREQUENZA)}${riga}`, values: [[mesi]] });
  }
  // RAW con il numero seriale: la cella è già formattata gg/mm/aaaa, e così
  // non c'è nessuna conversione di data (né di fuso) di mezzo.
  await foglio.scrivi(scritture, 'RAW');

  let storico = null;
  try {
    const rigaStorico = [testoData(quando), testo(codice).toUpperCase(), nome, testoData(prossima), `App (${chi})`];
    // Il pagamento e la scadenza di prima nelle loro colonne (la sesta e la
    // settima, se la scheda nasce adesso).
    const cP = (await colonnaPagamento(foglio)) || INTESTAZIONI_STORICO.indexOf('Pagamento') + 1;
    const cS = (await colonnaStorico(foglio, 'Scadenza prima')) || INTESTAZIONI_STORICO.indexOf('Scadenza prima') + 1;
    const cL = (await colonnaStorico(foglio, 'Lavoro')) || INTESTAZIONI_STORICO.indexOf('Lavoro') + 1;
    const serPrima = serialeDaCella(r[col.MANUTENZIONE - 1]);
    while (rigaStorico.length < Math.max(cP, cS, cL)) rigaStorico.push('');
    rigaStorico[cP - 1] = pag;
    rigaStorico[cS - 1] = serPrima == null ? '' : testoData(dataDaSeriale(serPrima));
    rigaStorico[cL - 1] = 'Manutenzione';
    storico = await foglio.accoda(TAB_STORICO, INTESTAZIONI_STORICO, rigaStorico);
  } catch (err) {
    // Lo storico è un di più: se non si scrive, la manutenzione è segnata lo stesso.
    console.error('Storico interventi non scritto:', err);
  }

  // Fatta la manutenzione, non è più né sospesa né urgente, ed esce dal giro.
  const avvisoPrima = await togliAvviso(foglio, mappa, riga, r, AVVISI);
  const chiPrima = col.CHI ? testo(r[col.CHI - 1]) : '';
  if (chiPrima) await foglio.scrivi([{ range: `'${TAB_CLIENTI}'!${lettera(col.CHI)}${riga}`, values: [['']] }], 'RAW');
  // E le sue tappe nei giri fino a quel giorno sono fatte (20 ott 2026).
  const tappeFatte = await segnaTappeFatte(foglio, testo(codice).toUpperCase(), serQuando).catch((err) => { console.error('Tappe non segnate:', err); return []; });

  return {
    ok: true,
    nome,
    fatta: testoData(quando),
    prossima: testoData(prossima),
    pagamento: pag,
    annulla: { codice: testo(codice).toUpperCase(), prima, scritto: serProssima, frequenzaScritta, storico, avvisoPrima, chiPrima, tappeFatte },
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

// ---------------------------------------------------------------------------
//  Guasto riparato (21 ott 2026)
// ---------------------------------------------------------------------------
// Matteo: «se il cliente ha un guasto conta come ho fatto il lavoro? Non è
// molto chiaro». Prima no: «Risolto» toglieva solo il segno rosso, e
// «Manutenzione fatta» spostava la prossima manutenzione anche quando non
// era stata fatta. Ora un guasto riparato SENZA la manutenzione va nello
// storico con Lavoro "Guasto" (l'app lo chiama «Riparazione»), col giorno e
// come ha pagato, ma la prossima manutenzione non si tocca: "Prossima
// manutenzione" e "Scadenza prima" restano vuote, così cancellando una
// manutenzione questa riga non la tiene ferma. Toglie il segno «Urgente»
// (non «Sospesa») e chiude solo le sue tappe «Guasto» fino a quel giorno.
// La stessa richiesta arrivata due volte (stesso cliente, giorno e lavoro)
// non scrive un'altra riga. Se c'è stata anche la manutenzione, l'app usa
// segnaFatta, che fa già tutto questo.
export async function segnaRiparazione(foglio, { codice, data, pagamento }, { chi = 'app' } = {}) {
  const quando = data ? leggiDataUtente(data) : oggi();
  if (!quando) throw problema('Data non valida.');
  const pag = pagamentoDa(pagamento);
  const serQuando = serialeDa(quando.a, quando.m, quando.g);
  const serOggi = serialeDa(...Object.values(oggi()));
  if (serQuando > serOggi) throw problema('La data è nel futuro: scegli oggi o un giorno passato.');
  if (serQuando < serOggi - 730) throw problema('La data è di più di due anni fa: controlla.');

  const { griglia, mappa } = await leggiClienti(foglio);
  const riga = trovaCliente(griglia, mappa, codice);
  const r = griglia[riga - 1] || [];
  const cod = testo(codice).toUpperCase();
  const nome = testo(r[mappa.col.NOME - 1]);
  const giorno = testoData(quando);
  if ((await leggiStorico(foglio)).some((s) => s.codice === cod && s.data === giorno && s.lavoro === 'Guasto')) {
    return { ok: true, nome, fatta: giorno, pagamento: pag, annulla: null, giaSegnata: true };
  }

  // Qui lo storico è l'intervento stesso: se non si scrive, è un errore.
  const cP = (await colonnaPagamento(foglio)) || INTESTAZIONI_STORICO.indexOf('Pagamento') + 1;
  const cL = (await colonnaStorico(foglio, 'Lavoro')) || INTESTAZIONI_STORICO.indexOf('Lavoro') + 1;
  const rigaStorico = [giorno, cod, nome, '', `App (${chi})`];
  while (rigaStorico.length < Math.max(cP, cL)) rigaStorico.push('');
  rigaStorico[cP - 1] = pag;
  rigaStorico[cL - 1] = 'Guasto';
  const storico = await foglio.accoda(TAB_STORICO, INTESTAZIONI_STORICO, rigaStorico);

  const avvisoPrima = await togliAvviso(foglio, mappa, riga, r, ['Urgente']);
  const tappeFatte = await segnaTappeFatte(foglio, cod, serQuando, (t) => normalizza(t.lavoro) === 'guasto')
    .catch((err) => { console.error('Tappe non segnate:', err); return []; });
  return { ok: true, nome, fatta: giorno, pagamento: pag, annulla: { codice: cod, data: giorno, storico, avvisoPrima, tappeFatte } };
}

// «Annulla» della riparazione: la riga dello storico si svuota (solo se è
// ancora lei), il segno «Urgente» torna (se intanto non ne è stato messo un
// altro) e le tappe chiuse tornano da fare.
export async function annullaRiparazione(foglio, { codice, data, storico, avvisoPrima, tappeFatte }) {
  const cod = testo(codice).toUpperCase();
  const m = typeof storico === 'string' && storico.match(/^'?Storico-Interventi'?!A(\d+):[A-Z]+\d+$/);
  if (!m) throw problema('Non riesco ad annullare.', 422);
  const g = await leggiGrigliaStorico(foglio);
  const k = colonneStorico(g);
  const r = (g || [])[+m[1] - 1] || [];
  if (testo(r[k.codice]).toUpperCase() === cod && testo(r[k.data]) === testo(data) && lavoroStorico(r[k.lavoro]) === 'Guasto') {
    await foglio.svuota(storico);
  }
  if (avvisoPrima && avvisoPrima.avviso === 'Urgente') {
    try {
      const { griglia, mappa } = await leggiClienti(foglio);
      const riga = trovaCliente(griglia, mappa, cod);
      const ora = mappa.col.AVVISO ? avvisoDa((griglia[riga - 1] || [])[mappa.col.AVVISO - 1]) : '';
      if (!ora) await scriviAvviso(foglio, mappa, riga, 'Urgente', testo(avvisoPrima.motivo).slice(0, 600));
    } catch (err) {
      // Il cliente può essere passato fra i persi: la riparazione è annullata lo stesso.
      if (!err.perUtente) throw err;
    }
  }
  await rimettiTappe(foglio, (Array.isArray(tappeFatte) ? tappeFatte : []).map(testo).filter((x) => /^[\w-]{6,40}$/.test(x))).catch((err) => console.error('Tappe non rimesse:', err));
  return { ok: true };
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

export async function annullaFatta(foglio, { codice, prima, scritto, frequenzaScritta, storico, avvisoPrima, chiPrima, tappeFatte }) {
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
  // E chi ci doveva andare (solo un nome, niente formule dal telefono).
  const chiRimesso = testo(chiPrima).slice(0, 40);
  if (chiRimesso && mappa.col.CHI && /^[\p{L} ]+$/u.test(chiRimesso)) {
    await foglio.scrivi([{ range: `'${TAB_CLIENTI}'!${lettera(mappa.col.CHI)}${riga}`, values: [[chiRimesso]] }], 'RAW');
  }
  // E le tappe dei giri tornano da fare.
  await rimettiTappe(foglio, (Array.isArray(tappeFatte) ? tappeFatte : []).map(testo).filter((x) => /^[\w-]{6,40}$/.test(x))).catch((err) => console.error('Tappe non rimesse:', err));
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

  // Già spostato: la stessa richiesta arrivata due volte (il telefono senza
  // campo riprova). Non è un errore.
  const haCodice = (x) => x.griglia.slice(x.mappa.riga).some((r) => testo(r[x.mappa.col.CODICE - 1]).toUpperCase() === cod);
  if (!haCodice(da) && haCodice(a)) {
    return { ok: true, codice: cod, verso, giaSpostato: true, annulla: { codice: cod, verso: verso === 'persi' ? 'clienti' : 'persi' } };
  }
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
// altrimenti in maiuscolo come l'ha scritta babbo. Se c'è il CAP davanti si
// tiene quello (19 ott 2026: Firenze ne ha tanti, e «50142 FIRENZE» sarebbe
// diventato il «50127 FIRENZE» più usato); del nome, la grafia più usata.
function cittaComeNelFoglio(dati, col, scritta) {
  const chiave = chiaveCitta(scritta);
  const cap = (testo(scritta).match(/^(\d{5})\s+/) || [])[1];
  const conta = {};
  if (chiave) {
    for (const r of dati) {
      if (chiaveCitta(r[col.CITTA - 1]) !== chiave) continue;
      const v = testo(r[col.CITTA - 1]);
      conta[v] = (conta[v] || 0) + 1;
    }
  }
  const ordinate = Object.keys(conta).sort((x, y) => conta[y] - conta[x]);
  if (!cap) return ordinate[0] || testo(scritta).toUpperCase();
  const conQuelCap = ordinate.find((v) => v.startsWith(`${cap} `));
  if (conQuelCap) return conQuelCap;
  return `${cap} ${(ordinate[0] || testo(scritta).toUpperCase()).replace(/^\s*\d{4,5}\s+/, '')}`;
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
// Per le correzioni fatte a mano nel foglio vale gpsNelPaese, in lettura.
async function tieniPosizioneSulPosto(foglio, codice, prima, dopo) {
  if (chiaveCitta(prima.citta) && chiaveCitta(prima.citta) !== chiaveCitta(dopo.citta)) return;
  const p = (await leggiCoordinate(foglio)).get(codice);
  if (!p || p.prec !== 'gps' || !gpsNelPaese(p.cercato, prima.citta)) return;
  await foglio.scrivi([{ range: `'${TAB_COORDINATE}'!E${p.riga}`, values: [[indirizzoCercato(dopo.indirizzo, dopo.citta)]] }], 'RAW');
}

// La posizione «Sono qui» legata a quell'indirizzo è ancora nello stesso
// paese della città scritta oggi? Il 18 ott 2026 Matteo ha aggiunto a mano
// nel foglio i CAP a quasi tutte le città, e 8 posizioni segnate sul posto
// risultavano «da ricercare»: il telefono le avrebbe sovrascritte con quelle
// di OpenStreetMap. Il CAP non conta; senza indirizzo (o senza città) vale.
// "Indirizzo cercato" è «indirizzo, città»: la città è la coda dopo una
// virgola (dopo l'ultima, o prima: «Le Valli, Figline»), mai un pezzo di
// parola («Lastra a Signa» non è «Signa»).
function gpsNelPaese(cercato, citta) {
  const paese = chiaveCitta(citta);
  const pezzi = String(cercato ?? '').replace(/\b\d{5}\b/g, ' ').split(',');
  if (!paese || !normalizza(pezzi.join(' '))) return true;
  return pezzi.some((_, i) => i > 0 && chiaveCitta(pezzi.slice(i).join(',')) === paese)
    || chiaveCitta(pezzi.join(',')) === paese;
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
// Gli stessi valori del menu a tendina della colonna Provenienza del foglio.
// "Altro" non esiste più dal 21 ott 2026: al suo posto "Annuncio Google
// (WhatsApp/telefono)", chi chiama o scrive su WhatsApp dopo un annuncio (il
// modulo del sito lo sa da solo, le chiamate no: lo dice chi risponde).
const PROVENIENZE = ['Meta / Facebook', 'Sito web', 'Annuncio Google (WhatsApp/telefono)', 'Passaparola'];
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

  // La stessa richiesta arrivata due volte (il telefono riprova se l'app si è
  // chiusa mentre mandava, 16 ott 2026): oggi l'app ha già scritto un contatto
  // con questo nome e questo telefono o email. L'anti-doppioni del sito lo
  // prenderebbe per la stessa persona che richiama («Ha ricontattato il…»).
  const adesso = nowInItaly();
  const oggiTesto = adesso.split(',')[0].trim();
  const cifre = (s) => String(s).replace(/\D/g, '').slice(-9);
  const { griglia: gl, mappa: ml } = await leggiLead(foglio);
  for (let i = ml.riga; i < gl.length; i++) {
    const r = gl[i] || [];
    const v = (campo) => testo(r[ml.col[campo] - 1]);
    if (v('NOME') !== nome || !v('DATA').startsWith(oggiTesto) || !v('NOTE').includes('(scritto dall\'app')) continue;
    const contatto = v('CONTATTO');
    const stesso = (telefono && cifre(telefono).length === 9 && contatto.replace(/\D/g, '').includes(cifre(telefono)))
      || (email && contatto.toLowerCase().includes(email.toLowerCase()));
    if (stesso) return { ok: true, nome, data: v('DATA'), doppione: true, riga: i + 1, giaScritto: true };
  }

  const riga = [
    adesso,
    nome,
    [telefono, email].filter(Boolean).join(' · '),
    // Un telefono con l'app vecchia può ancora mandare "Altro": resta vuoto,
    // da scegliere poi nel foglio, invece di finire su una voce sbagliata.
    PROVENIENZE.includes(dati.provenienza) ? dati.provenienza : '',
    testo(dati.interesse).slice(0, 100),
    'Da richiamare',
    note,
  ];
  const esito = await foglio.accodaLead(riga, { telefono, email });
  return { ok: true, nome, data: riga[0], doppione: !!esito.doppione, riga: esito.riga ?? null };
}

// `giorno` ("gg/mm") è il giorno in cui la nota è stata scritta: se il
// telefono era senza campo arriva dopo, ma col suo giorno.
export async function notaLead(foglio, { riga, data, nome, nota, giorno }) {
  riga = parseInt(riga, 10);
  const t = testo(nota).replace(/\s+/g, ' ').slice(0, 500);
  if (!t) throw problema('La nota è vuota.');
  const { griglia, mappa } = await leggiLead(foglio);
  const r = trovaLead(griglia, mappa, { riga, data, nome });
  const prima = testo(griglia[r - 1][mappa.col.NOTE - 1]);
  const { g, m } = oggi();
  const quando = /^\d{2}\/\d{2}$/.test(testo(giorno)) ? testo(giorno) : `${String(g).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
  const aggiunta = `${quando}: ${t}`;
  // La stessa nota arrivata due volte (il telefono senza campo riprova).
  if (prima.endsWith(aggiunta)) return { ok: true, note: prima };
  const nuova = [prima, aggiunta].filter(Boolean).join(' — ');
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
// giusta, non si ricerca mai e regge l'indirizzo corretto nello stesso
// paese, vedi gpsNelPaese), "civico", "via", "paese" (centro del paese:
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
  const cittaOra = new Map();
  for (let i = mappa.riga; i < griglia.length; i++) {
    const r = griglia[i] || [];
    const codice = testo(r[mappa.col.CODICE - 1]).toUpperCase();
    if (!codice) continue;
    cercatoOra.set(codice, indirizzoCercato(r[mappa.col.INDIRIZZO - 1], r[mappa.col.CITTA - 1]));
    cittaOra.set(codice, r[mappa.col.CITTA - 1]);
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
    // «Sono qui» segnato senza campo arriva dopo: se intanto l'indirizzo è
    // stato scritto meglio a mano nello stesso paese, vale lo stesso.
    const stesso = normalizza(p?.cercato) === normalizza(cercato) || (prec === 'gps' && gpsNelPaese(p?.cercato, cittaOra.get(codice)));
    if (cercato == null || (!cercato && prec !== 'gps') || !prec || visti.has(codice) || !stesso) { saltate++; continue; }
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
//  Magazzino
// ---------------------------------------------------------------------------
// Dal 20 ott 2026 (Matteo: «questo è il file del magazzino, creane uno
// migliore nel gestionale e fai in modo che le quantità si aggiornino anche
// dall'app: quando si fa un lavoro si devono poter inserire le quantità dei
// materiali usati»). Prima era Magazzino.xlsx sul PC: due fogli (Impianti e
// Miscelatori), i totali a formula, nessuna traccia di cosa entrava e usciva.
//
// Due schede:
// - "Magazzino": un articolo per riga, col codice M001… La quantità è un
//   numero scritto, non una formula: si può correggere anche a mano nel
//   foglio, e l'app riparte da lì. "Valore" è una formula sola, nella sua
//   intestazione (ARRAYFORMULA): l'app non ci scrive mai.
// - "Movimenti-Magazzino": ogni cambio fatto dall'app (merce arrivata, usata
//   in un lavoro, tolta, contata), con chi e per quale cliente. Si accoda e
//   basta; l'annulla svuota le sue righe e rimette la quantità.
// L'Id dei movimenti lo sceglie il telefono (come per le tappe): la stessa
// richiesta arrivata due volte (senza campo) non scala due volte. Due
// telefoni che scalano lo stesso articolo nello stesso secondo possono
// perdere un conto: con due persone succede di rado, e «Ho contato» rimette
// il numero giusto. Nessuna automazione del foglio legge queste schede.
export const TAB_MAGAZZINO = 'Magazzino';
export const TAB_MOVIMENTI = 'Movimenti-Magazzino';
// Dal 21 ott 2026 (Matteo: «ci vorrà una colonna "in consegna" con le
// macchine ordinate dal fabbricante e una "da montare" per i clienti che
// comprano, con un'altra colonna che fa il totale, così da sapere quando fare
// l'ordine») dopo la Quantità ci sono "In consegna", "Da montare" e "Totale
// disponibile" = Quantità + In consegna − Da montare (una formula sola,
// nell'intestazione: l'app non ci scrive). «Da riordinare» si guarda sul
// totale. Il foglio di prima si aggiorna con aggiornaMagazzino.
const INTESTAZIONI_MAGAZZINO = ['Codice', 'Categoria', 'Descrizione', 'Codice fornitore', 'Quantità', 'In consegna', 'Da montare', 'Totale disponibile', 'Scorta minima', 'Costo', 'Note', 'Aggiornato il'];
const INTESTAZIONI_MOVIMENTI = ['Id', 'Data', 'Articolo', 'Descrizione', 'Quantità', 'Causale', 'Cliente', 'Nome', 'Lavoro', 'Fatto da', 'Note', 'Colonna'];
export const CATEGORIE = ['Filtri e ricambi', 'Impianti', 'Impianti usati', 'Miscelatori e rubinetti', 'Altro'];
// Il colore di ogni categoria, uguale nel foglio (sfondo di Codice…Codice
// fornitore) e nell'app (21 ott 2026: «così da sapere subito dove cercare»).
export const COLORI_CATEGORIE = {
  'Filtri e ricambi': '#cffafe', Impianti: '#dbeafe', 'Impianti usati': '#ede9fe', 'Miscelatori e rubinetti': '#dcfce7', Altro: '#f1f5f9',
};
// Il nome nell'app → l'intestazione della colonna.
const CAMPI_ARTICOLO = {
  codice: 'Codice', categoria: 'Categoria', descrizione: 'Descrizione', fornitore: 'Codice fornitore', quantita: 'Quantità',
  inConsegna: 'In consegna', daMontare: 'Da montare', scorta: 'Scorta minima', costo: 'Costo', note: 'Note', aggiornato: 'Aggiornato il',
};
const CAMPI_MOVIMENTO = { id: 'Id', data: 'Data', articolo: 'Articolo', descrizione: 'Descrizione', quantita: 'Quantità', causale: 'Causale', cliente: 'Cliente', nome: 'Nome', lavoro: 'Lavoro', chi: 'Fatto da', note: 'Note', su: 'Colonna' };
// I tre numeri di un articolo. Un movimento ne cambia uno: la colonna
// "Colonna" dei movimenti dice quale (vuota = la Quantità in magazzino).
const NUMERI = { quantita: 'Quantità', inConsegna: 'In consegna', daMontare: 'Da montare' };
const suDa = (v) => Object.keys(NUMERI).find((k) => k !== 'quantita' && normalizza(NUMERI[k]) === normalizza(v)) || 'quantita';
// Cosa chiede il telefono → cosa si scrive nel foglio, e su quale numero.
const CAUSALI = {
  carico: 'Arrivata merce', lavoro: 'Usato in un lavoro', tolto: 'Tolto', correzione: 'Contati',
  ordinato: 'Ordinato al fornitore', venduto: 'Venduto, da montare',
};
const SU_DI = { carico: 'quantita', lavoro: 'quantita', tolto: 'quantita', ordinato: 'inConsegna', venduto: 'daMontare' };
// Scritti dal motore insieme a un altro movimento: la merce arrivata esce da
// «In consegna», e un articolo venduto usato in un lavoro esce da «Da montare».
const CAUSALE_MONTATO = 'Montato';
const CAUSALE_INIZIALE = 'Carico iniziale';
// Gli Id dei movimenti scritti dal motore («inizio-M001», «nuovo-M087»): il
// telefono non li usa e non li annulla (un «inizio» li prenderebbe tutti).
const ID_DEL_MOTORE = /^(inizio|nuovo)(-|$)/i;
const categoriaDa = (v) => CATEGORIE.find((c) => normalizza(c) === normalizza(v)) || 'Altro';
const arrotonda = (n) => Math.round(n * 100) / 100;
// "2", "2,5", 2.5 → numero; vuoto o non un numero → null.
const numeroDa = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : null;
  const s = testo(v).replace(/[\s€]/g, '').replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
};
// Una data scritta come testo dall'app, o come data a mano nel foglio.
const dataCella = (v) => (typeof v === 'number' ? testoData(dataDaSeriale(v)) : testo(v));
const colonneDa = (griglia, nomi) => {
  const testa = ((griglia && griglia[0]) || []).map(normalizza);
  return Object.fromEntries(Object.entries(nomi).map(([k, h]) => [k, testa.indexOf(normalizza(h))]));
};
const cellaMag = (tab, col, riga) => `'${tab}'!${lettera(col + 1)}${riga}`;

// Le due schede in una lettura sola (se ci sono tutte e due). null = il
// magazzino non c'è ancora. `completa`: le righe scritte a mano nel foglio
// senza codice ricevono il loro M0xx (come farebbe un'automazione).
async function leggiMagazzino(foglio, { completa = false } = {}) {
  const intervalli = [`'${TAB_MAGAZZINO}'!A1:T1000`, `'${TAB_MOVIMENTI}'!A1:P6000`];
  let griglie;
  try {
    griglie = await foglio.leggiInsieme(intervalli, 'UNFORMATTED_VALUE');
  } catch (err) {
    if (err.status !== 400) throw err;
    // Una delle due schede non c'è (ancora): si leggono una per una.
    const una = (r) => foglio.leggi(r, 'UNFORMATTED_VALUE').catch((e) => { if (e.status === 400) return null; throw e; });
    griglie = await Promise.all(intervalli.map(una));
  }
  const [gm, gv] = griglie;
  if (!gm || !gm.length) return null;
  const col = colonneDa(gm, CAMPI_ARTICOLO);
  if (col.codice < 0 || col.descrizione < 0 || col.quantita < 0) {
    throw problema('Nel foglio Magazzino mancano le colonne Codice, Descrizione o Quantità. Chiedi a Matteo.', 500);
  }
  const articoli = [];
  for (let i = 1; i < gm.length; i++) {
    const r = gm[i] || [];
    const v = (k) => (col[k] < 0 ? '' : r[col[k]]);
    const a = {
      riga: i + 1, codice: testo(v('codice')).toUpperCase(), categoria: testo(v('categoria')), descrizione: testo(v('descrizione')).replace(/\s+/g, ' '),
      fornitore: testo(v('fornitore')), quantita: numeroDa(v('quantita')) ?? 0, inConsegna: numeroDa(v('inConsegna')) ?? 0, daMontare: numeroDa(v('daMontare')) ?? 0,
      scorta: numeroDa(v('scorta')), costo: numeroDa(v('costo')), note: testo(v('note')), aggiornato: dataCella(v('aggiornato')),
    };
    if (a.codice || a.descrizione) articoli.push(a);
  }
  if (completa) {
    const senza = articoli.filter((a) => !a.codice && a.descrizione);
    if (senza.length) {
      senza.forEach((a) => { a.codice = prossimoArticolo(articoli); });
      await foglio.scrivi(senza.map((a) => ({ range: cellaMag(TAB_MAGAZZINO, col.codice, a.riga), values: [[a.codice]] })), 'RAW')
        .catch((err) => { console.error('Codici del magazzino non scritti:', err); senza.forEach((a) => { a.codice = ''; }); });
    }
  }
  const movimenti = [];
  const cv = colonneDa(gv, CAMPI_MOVIMENTO);
  for (let i = 1; i < (gv || []).length; i++) {
    const r = gv[i] || [];
    const v = (k) => (cv[k] < 0 ? '' : r[cv[k]]);
    const id = testo(v('id'));
    if (!id) continue; // movimento annullato
    movimenti.push({
      riga: i + 1, id, data: dataCella(v('data')), articolo: testo(v('articolo')).toUpperCase(), descrizione: testo(v('descrizione')),
      quantita: numeroDa(v('quantita')) ?? 0, causale: testo(v('causale')), cliente: testo(v('cliente')).toUpperCase(), nome: testo(v('nome')),
      lavoro: testo(v('lavoro')), chi: testo(v('chi')).toLowerCase(), note: testo(v('note')), su: suDa(v('su')),
    });
  }
  // Le colonne «In consegna» e «Da montare» (e «Colonna» nei movimenti) ci
  // sono? Prima di aggiornaMagazzino no: allora quei numeri non si toccano.
  const numeri = col.inConsegna >= 0 && col.daMontare >= 0 && cv.su >= 0;
  return { col, colMov: cv, articoli, movimenti, numeri };
}
// Il codice dopo il più alto: M001, M002… (M1000 dopo M999).
function prossimoArticolo(articoli) {
  const n = Math.max(0, ...articoli.map((a) => +((a.codice.match(/^M(\d+)$/) || [])[1] || 0)));
  return `M${String(n + 1).padStart(3, '0')}`;
}
// Per l'app: senza i numeri di riga, e solo i movimenti dell'ultimo anno.
function magazzinoPerApp(m) {
  if (!m) return null;
  const limite = serialeDa(...Object.values(oggi())) - 400;
  const recente = (x) => { const d = leggiDataUtente(x.data); return !d || serialeDa(d.a, d.m, d.g) >= limite; };
  return {
    articoli: m.articoli.filter((a) => a.codice).map(({ riga, ...a }) => a),
    movimenti: m.movimenti.filter(recente).slice(-3000).map(({ riga, ...x }) => x),
    categorie: CATEGORIE,
    colori: COLORI_CATEGORIE,
    numeri: m.numeri,
  };
}

const rigaMovimento = (x) => INTESTAZIONI_MOVIMENTI.map((h) => {
  const k = Object.keys(CAMPI_MOVIMENTO).find((c) => CAMPI_MOVIMENTO[c] === h);
  const v = k === 'chi' ? nomePersona(x.chi) : x[k];
  return v == null ? '' : v;
});
// Accoda i movimenti nelle colonne della scheda (che Matteo potrebbe aver
// spostato): la riga si costruisce sulle intestazioni che ci sono. Torna
// l'intervallo scritto (serve a cambiaMateriali per tornare indietro).
async function accodaMovimenti(foglio, m, lista) {
  if (!lista.length) return null;
  const cv = m.colMov;
  const conIntestazioni = Object.values(cv).some((c) => c >= 0);
  const righe = lista.map((x) => {
    if (!conIntestazioni) return rigaMovimento(x);
    const r = [];
    for (const [k, c] of Object.entries(cv)) {
      if (c < 0) continue;
      while (r.length <= c) r.push('');
      r[c] = k === 'chi' ? nomePersona(x.chi) : x[k] ?? '';
    }
    return r;
  });
  return foglio.accodaRighe(TAB_MOVIMENTI, INTESTAZIONI_MOVIMENTI, righe);
}

// Aggiunge un articolo nuovo (senza `codice`) o cambia i dati di uno che
// c'è (con `codice`). La quantità di un articolo che c'è non si cambia da
// qui: passa dai movimenti («È arrivata merce», «Ho contato»…).
export async function salvaArticolo(foglio, dati, { chi = 'app' } = {}) {
  const m = await leggiMagazzino(foglio);
  if (!m) throw problema('Il magazzino non c\'è ancora nel foglio. Chiedi a Matteo.', 409);
  const descrizione = testo(dati.descrizione).replace(/\s+/g, ' ').slice(0, 200);
  if (!descrizione) throw problema('Scrivi cos\'è l\'articolo.');
  const numero = (v, max) => {
    if (v === '' || v == null) return '';
    const n = numeroDa(v);
    if (n == null || n < 0 || n > max) throw problema('Controlla i numeri: uno non va bene.');
    return arrotonda(n);
  };
  const campi = {
    categoria: categoriaDa(dati.categoria), descrizione, fornitore: testo(dati.fornitore).slice(0, 60),
    scorta: numero(dati.scorta, 10000), costo: numero(dati.costo, 100000), note: testo(dati.note).replace(/\s+/g, ' ').slice(0, 300),
    aggiornato: testoData(oggi()),
  };
  const daApp = (a) => ({ ...a, riga: undefined, scorta: a.scorta === '' ? null : a.scorta, costo: a.costo === '' ? null : a.costo });
  const scrivi = (riga, valori) => foglio.scrivi(Object.entries(valori).filter(([k]) => m.col[k] >= 0)
    .map(([k, v]) => ({ range: cellaMag(TAB_MAGAZZINO, m.col[k], riga), values: [[v]] })), 'RAW');

  const codice = testo(dati.codice).toUpperCase();
  if (codice) {
    const a = m.articoli.find((x) => x.codice === codice);
    if (!a) throw problema('Non trovo più questo articolo nel magazzino. Riapri l\'app e riprova.', 409);
    await scrivi(a.riga, campi);
    const prima = { codice, categoria: a.categoria, descrizione: a.descrizione, fornitore: a.fornitore, scorta: a.scorta ?? '', costo: a.costo ?? '', note: a.note };
    return { ok: true, articolo: daApp({ ...a, ...campi }), annulla: prima };
  }

  // Nuovo. Lo stesso articolo c'è già (richiesta arrivata due volte, o
  // scritto due volte): non si raddoppia.
  const uguale = m.articoli.find((x) => normalizza(x.descrizione) === normalizza(descrizione) && normalizza(x.fornitore) === normalizza(campi.fornitore));
  if (uguale) return { ok: true, giaPresente: true, articolo: daApp(uguale), annulla: null };
  const quantita = numero(dati.quantita, 100000) || 0;
  const nuovo = { codice: prossimoArticolo(m.articoli), ...campi, quantita };
  const riga = Math.max(1, ...m.articoli.map((a) => a.riga)) + 1;
  await scrivi(riga, nuovo);
  if (quantita) {
    await accodaMovimenti(foglio, m, [{ id: `nuovo-${nuovo.codice}`, data: testoData(oggi()), articolo: nuovo.codice, descrizione, quantita, causale: CAUSALE_INIZIALE, chi, note: 'Articolo nuovo' }])
      .catch((err) => console.error('Movimento iniziale non scritto:', err));
  }
  return { ok: true, articolo: daApp({ ...nuovo, riga }), annulla: null };
}

// Un movimento del magazzino: merce arrivata (`carico`), usata in un lavoro
// (`lavoro`, col cliente), tolta per altro (`tolto`: rotta, resa…), contata
// (`correzione`: il numero giusto, non la differenza; `su` dice quale dei
// tre numeri), ordinata al fornitore (`ordinato`: In consegna) o venduta a un
// cliente e da montare (`venduto`: Da montare). `righe` =
// [{ articolo, quantita }]. Ogni numero cambiato diventa un movimento con Id
// "<id>-<n>". Due conti si fanno da soli (21 ott 2026): la merce arrivata
// esce da «In consegna» (fino a quanta ce n'era), e un articolo usato in
// un'installazione, o un impianto usato in qualsiasi lavoro, esce da «Da
// montare» (stesso limite). Restituisce i numeri nuovi.
export async function muoviMagazzino(foglio, dati, { chi = 'app' } = {}) {
  const id = testo(dati.id);
  if (!/^[\w-]{6,40}$/.test(id) || ID_DEL_MOTORE.test(id)) throw problema('Richiesta non valida.');
  const tipo = testo(dati.causale);
  const causale = CAUSALI[tipo];
  if (!causale) throw problema('Richiesta non valida.');
  const su = tipo === 'correzione' ? (NUMERI[dati.su] ? testo(dati.su) : 'quantita') : SU_DI[tipo];
  const righe = Array.isArray(dati.righe) ? dati.righe : [];
  if (!righe.length || righe.length > 40) throw problema('Scegli almeno un articolo.');
  const quando = dati.data ? leggiDataUtente(dati.data) : oggi();
  if (!quando) throw problema('Data non valida.');
  const serQuando = serialeDa(quando.a, quando.m, quando.g);
  const serOggi = serialeDa(...Object.values(oggi()));
  if (serQuando > serOggi + 1 || serQuando < serOggi - 730) throw problema('Controlla la data: è troppo lontana.');

  const m = await leggiMagazzino(foglio);
  if (!m) throw problema('Il magazzino non c\'è ancora nel foglio. Chiedi a Matteo.', 409);
  if (su !== 'quantita' && !m.numeri) throw problema('Nel foglio il magazzino non ha ancora le colonne «In consegna» e «Da montare». Chiedi a Matteo.', 409);
  // La stessa richiesta arrivata due volte: è già fatta.
  if (m.movimenti.some((x) => x.id.startsWith(`${id}-`))) return { ok: true, giaFatto: true, articoli: [], annulla: { id } };

  const finali = new Map(); // "codice|numero" → { a, su, dopo }
  const ora = (a, s) => (finali.has(`${a.codice}|${s}`) ? finali.get(`${a.codice}|${s}`).dopo : a[s]);
  const movimenti = [];
  const base = {
    data: testoData(quando), cliente: testo(dati.codice).toUpperCase().slice(0, 10), nome: testo(dati.nome).slice(0, 120),
    lavoro: testo(dati.lavoro).slice(0, 40), chi,
  };
  // Cambia un numero e scrive il suo movimento (se è cambiato davvero).
  const cambia = (a, s, dopo, causaleMov, note) => {
    const prima = ora(a, s);
    finali.set(`${a.codice}|${s}`, { a, su: s, dopo: arrotonda(dopo) });
    const delta = arrotonda(dopo - prima);
    if (!delta) return; // contati ed erano giusti: niente da scrivere
    movimenti.push({
      ...base, id: `${id}-${movimenti.length + 1}`, articolo: a.codice, descrizione: a.descrizione, quantita: delta, causale: causaleMov,
      note, su: s === 'quantita' ? '' : NUMERI[s],
    });
  };
  const nota = testo(dati.note).replace(/\s+/g, ' ').slice(0, 300);
  for (const r of righe) {
    const codice = testo(r && r.articolo).toUpperCase();
    const a = m.articoli.find((x) => x.codice === codice);
    if (!a) throw problema('Un articolo non c\'è più nel magazzino. Riapri l\'app e riprova.', 409);
    const q = numeroDa(r.quantita);
    if (q == null || q < 0 || q > 100000 || (tipo !== 'correzione' && q === 0)) throw problema('Controlla le quantità: una non va bene.');
    const prima = ora(a, su);
    const piu = ['carico', 'ordinato', 'venduto'].includes(tipo);
    cambia(a, su, tipo === 'correzione' ? q : piu ? prima + q : prima - q, causale, nota);
    if (!m.numeri) continue;
    if (tipo === 'carico') {
      const giu = Math.min(q, Math.max(0, ora(a, 'inConsegna')));
      if (giu > 0) cambia(a, 'inConsegna', ora(a, 'inConsegna') - giu, causale, 'Era in consegna');
    }
    if (tipo === 'lavoro' && (normalizza(dati.lavoro) === 'installazione' || /^impianti/.test(normalizza(a.categoria)))) {
      const giu = Math.min(q, Math.max(0, ora(a, 'daMontare')));
      if (giu > 0) cambia(a, 'daMontare', ora(a, 'daMontare') - giu, CAUSALE_MONTATO, 'Era da montare');
    }
  }
  // I numeri nuovi di ogni articolo toccato, per l'app.
  const perArticolo = new Map();
  for (const { a, su: s, dopo } of finali.values()) {
    const x = perArticolo.get(a.codice) || { codice: a.codice, quantita: a.quantita, inConsegna: a.inConsegna, daMontare: a.daMontare };
    x[s] = dopo;
    perArticolo.set(a.codice, x);
  }
  const articoli = [...perArticolo.values()];
  const perApp = (x) => ({ ...x, su: suDa(x.su), chi: testo(chi).toLowerCase() });
  if (!movimenti.length) return { ok: true, articoli, movimenti: [], annulla: null };

  const celle = (lista) => lista.flatMap(({ a, su: s, v }) => [
    { range: cellaMag(TAB_MAGAZZINO, m.col[s], a.riga), values: [[v]] },
    ...(m.col.aggiornato >= 0 ? [{ range: cellaMag(TAB_MAGAZZINO, m.col.aggiornato, a.riga), values: [[testoData(oggi())]] }] : []),
  ]);
  const cambiati = [...finali.values()].filter(({ a, su: s, dopo }) => dopo !== a[s]);
  await foglio.scrivi(celle(cambiati.map(({ a, su: s, dopo }) => ({ a, su: s, v: dopo }))), 'RAW');
  try {
    await accodaMovimenti(foglio, m, movimenti);
  } catch (err) {
    // Senza movimenti la stessa richiesta, riprovata, scalerebbe di nuovo:
    // i numeri tornano com'erano (le date no: non contano).
    await foglio.scrivi(cambiati.map(({ a, su: s }) => ({ range: cellaMag(TAB_MAGAZZINO, m.col[s], a.riga), values: [[a[s]]] })), 'RAW')
      .catch((e) => console.error('Quantità non rimesse:', e));
    throw err;
  }
  return { ok: true, articoli, movimenti: movimenti.map(perApp), annulla: { id } };
}

// Annulla un movimento (tutte le sue righe): le quantità tornano indietro
// della stessa differenza, anche se intanto sono cambiate per altro, e le
// righe dei movimenti si svuotano. Arrivato due volte, la seconda non fa niente.
export async function annullaMagazzino(foglio, { id }) {
  const k = testo(id);
  if (!/^[\w-]{6,40}$/.test(k) || ID_DEL_MOTORE.test(k)) throw problema('Questo movimento non si annulla dall\'app.');
  const m = await leggiMagazzino(foglio);
  if (!m) throw problema('Il magazzino non c\'è ancora nel foglio. Chiedi a Matteo.', 409);
  const suoi = m.movimenti.filter((x) => x.id.startsWith(`${k}-`));
  if (!suoi.length) return { ok: true, giaAnnullato: true, articoli: [] };
  // Ogni movimento torna indietro sul suo numero (Quantità, In consegna o Da montare).
  const finali = new Map();
  for (const x of suoi) {
    const a = m.articoli.find((y) => y.codice === x.articolo);
    if (!a || m.col[x.su] < 0) continue; // articolo tolto dal foglio: il movimento si svuota e basta
    const chiave = `${a.codice}|${x.su}`;
    finali.set(chiave, { a, su: x.su, dopo: arrotonda((finali.has(chiave) ? finali.get(chiave).dopo : a[x.su]) - x.quantita) });
  }
  const larghezza = Math.max(INTESTAZIONI_MOVIMENTI.length, ...Object.values(m.colMov).map((c) => c + 1));
  await foglio.scrivi([
    ...[...finali.values()].flatMap(({ a, su: s, dopo }) => [
      { range: cellaMag(TAB_MAGAZZINO, m.col[s], a.riga), values: [[dopo]] },
      ...(m.col.aggiornato >= 0 ? [{ range: cellaMag(TAB_MAGAZZINO, m.col.aggiornato, a.riga), values: [[testoData(oggi())]] }] : []),
    ]),
    ...suoi.map((x) => ({ range: `'${TAB_MOVIMENTI}'!A${x.riga}:${lettera(larghezza)}${x.riga}`, values: [Array(larghezza).fill('')] })),
  ], 'RAW');
  return { ok: true, articoli: [...finali.values()].map(({ a, su: s, dopo }) => ({ codice: a.codice, [s]: dopo })) };
}

// I materiali di un intervento fatto, segnati o corretti dopo (21 ott 2026,
// Matteo: «se uno se ne scorda, e per cambiare se uno sbaglia; se uno cambia
// si deve correggere anche il magazzino, non vorrei che si sommino i pezzi»).
// `righe` è l'elenco GIUSTO dei materiali usati quel giorno da quel cliente
// (anche vuoto = nessuno), non quelli da aggiungere: i movimenti «Usato in un
// lavoro» già segnati per quell'intervento (stesso cliente, stessa data,
// stesso `lavoro`: Manutenzione, che vale anche senza lavoro, o Guasto per
// una riparazione) si tolgono e i loro pezzi tornano in
// magazzino, poi si scrivono quelli nuovi. Così il conto è sempre quello
// dell'ultima volta. Prima si accodano i movimenti nuovi, poi in una
// scrittura sola le quantità e lo svuotamento dei vecchi; se quella non
// riesce, i nuovi si svuotano. Arrivata due volte (stesso `id`) non rifà niente.
// L'annulla è un altro cambio, con le righe di prima.
export async function cambiaMateriali(foglio, dati, { chi = 'app' } = {}) {
  const id = testo(dati.id);
  if (!/^[\w-]{6,40}$/.test(id) || ID_DEL_MOTORE.test(id)) throw problema('Richiesta non valida.');
  const cod = testo(dati.codice).toUpperCase();
  if (!/^C\d+$/.test(cod)) throw problema('Codice cliente non valido.');
  const quando = leggiDataUtente(dati.data);
  if (!quando) throw problema('Data non valida.');
  const serQuando = serialeDa(quando.a, quando.m, quando.g);
  const serOggi = serialeDa(...Object.values(oggi()));
  if (serQuando > serOggi + 1 || serQuando < serOggi - 730) throw problema('Controlla la data: è troppo lontana.');
  const giorno = testoData(quando);
  const elenco = Array.isArray(dati.righe) ? dati.righe : [];
  if (elenco.length > 40) throw problema('Troppi articoli insieme.');
  const lavoro = LAVORI.find((l) => normalizza(l) === normalizza(dati.lavoro)) || 'Manutenzione';
  const lavoroCombacia = (v) => normalizza(v) === normalizza(lavoro) || (lavoro === 'Manutenzione' && !normalizza(v));

  const m = await leggiMagazzino(foglio);
  if (!m) throw problema('Il magazzino non c\'è ancora nel foglio. Chiedi a Matteo.', 409);
  if (m.movimenti.some((x) => x.id.startsWith(`${id}-`))) return { ok: true, giaFatto: true, articoli: [], annulla: null };

  // Le quantità che si vogliono, per articolo (lo stesso articolo due volte si somma).
  const voluti = new Map();
  for (const r of elenco) {
    const codice = testo(r && r.articolo).toUpperCase();
    const q = numeroDa(r && r.quantita);
    if (q == null || q < 0 || q > 100000) throw problema('Controlla le quantità: una non va bene.');
    if (!q) continue;
    if (!m.articoli.some((x) => x.codice === codice)) throw problema('Un articolo non c\'è più nel magazzino. Riapri l\'app e riprova.', 409);
    voluti.set(codice, arrotonda((voluti.get(codice) || 0) + q));
  }
  const vecchi = m.movimenti.filter((x) => x.cliente === cod && x.data === giorno && x.causale === CAUSALI.lavoro
    && lavoroCombacia(x.lavoro) && !ID_DEL_MOTORE.test(x.id));
  const prima = new Map(); // quelli segnati finora, per l'annulla
  for (const x of vecchi) prima.set(x.articolo, arrotonda((prima.get(x.articolo) || 0) - x.quantita));

  // Quantità finali: si rimette quello che c'era e si toglie quello giusto.
  const finali = new Map();
  const dopoDi = (a) => (finali.has(a.codice) ? finali.get(a.codice).dopo : a.quantita);
  for (const x of vecchi) {
    const a = m.articoli.find((y) => y.codice === x.articolo);
    if (a) finali.set(a.codice, { a, dopo: arrotonda(dopoDi(a) - x.quantita) });
  }
  const nome = testo(dati.nome).slice(0, 120) || (vecchi[0] && vecchi[0].nome) || '';
  const nuovi = [];
  let n = 0;
  for (const [codice, q] of voluti) {
    const a = m.articoli.find((y) => y.codice === codice);
    finali.set(codice, { a, dopo: arrotonda(dopoDi(a) - q) });
    nuovi.push({
      id: `${id}-${++n}`, data: giorno, articolo: codice, descrizione: a.descrizione, quantita: -q, causale: CAUSALI.lavoro,
      cliente: cod, nome, lavoro, chi, note: vecchi.length ? 'Corretti dopo' : 'Segnati dopo',
    });
  }
  const cambiati = [...finali.values()].filter(({ a, dopo }) => dopo !== a.quantita);
  if (!vecchi.length && !nuovi.length) return { ok: true, articoli: [], movimenti: [], annulla: null };

  const accodati = await accodaMovimenti(foglio, m, nuovi);
  const larghezza = Math.max(INTESTAZIONI_MOVIMENTI.length, ...Object.values(m.colMov).map((c) => c + 1));
  try {
    await foglio.scrivi([
      ...cambiati.flatMap(({ a, dopo }) => [
        { range: cellaMag(TAB_MAGAZZINO, m.col.quantita, a.riga), values: [[dopo]] },
        ...(m.col.aggiornato >= 0 ? [{ range: cellaMag(TAB_MAGAZZINO, m.col.aggiornato, a.riga), values: [[testoData(oggi())]] }] : []),
      ]),
      ...vecchi.map((x) => ({ range: `'${TAB_MOVIMENTI}'!A${x.riga}:${lettera(larghezza)}${x.riga}`, values: [Array(larghezza).fill('')] })),
    ], 'RAW');
  } catch (err) {
    // I movimenti nuovi senza le quantità farebbero contare due volte: via.
    if (typeof accodati === 'string' && /^'?Movimenti-Magazzino'?!A\d+:[A-Z]+\d+$/.test(accodati)) {
      await foglio.svuota(accodati).catch((e) => console.error('Movimenti nuovi non svuotati:', e));
    }
    throw err;
  }
  return {
    ok: true,
    articoli: [...finali.values()].map(({ a, dopo }) => ({ codice: a.codice, quantita: dopo })),
    movimenti: nuovi.map((x) => ({ ...x, chi: testo(chi).toLowerCase() })),
    annulla: { codice: cod, data: giorno, nome, lavoro, righe: [...prima].filter(([, q]) => q > 0).map(([articolo, quantita]) => ({ articolo, quantita })) },
  };
}

// L'aspetto delle due schede. Le colonne si trovano dall'intestazione (dal
// 21 ott 2026 ce ne sono tre in più dopo la Quantità). Le formule dei colori
// non hanno separatori: valgono in ogni lingua.
// Dove sta ogni colonna (da 0; -1 = non c'è). Le intestazioni fatte di
// formula ({"Valore";ARRAYFORMULA(…)}) valgono per il loro nome.
const nomeIntestazione = (v) => (testo(v).match(/^={"([^"]+)"/) || [])[1] || testo(v);
function posizioniMagazzino(testa) {
  const nomi = (testa || []).map((v) => normalizza(nomeIntestazione(v)));
  const p = (h) => nomi.indexOf(normalizza(h));
  const pos = {
    codice: p('Codice'), categoria: p('Categoria'), descrizione: p('Descrizione'), fornitore: p('Codice fornitore'), quantita: p('Quantità'),
    inConsegna: p('In consegna'), daMontare: p('Da montare'), totale: p('Totale disponibile'), scorta: p('Scorta minima'), costo: p('Costo'),
    note: p('Note'), aggiornato: p('Aggiornato il'), valore: p('Valore'),
  };
  pos.ultima = Math.max(...Object.values(pos));
  // Le scritte riassuntive in testata, dopo la tabella.
  pos.riassunto = (testa || []).findIndex((v, i) => i > pos.ultima && /^="Valore del magazzino/i.test(testo(v)));
  pos.riordinare = (testa || []).findIndex((v, i) => i > pos.ultima && /^="Da riordinare/i.test(testo(v)));
  return pos;
}
const L = (i) => lettera(i + 1);
// Il totale: quelli che ci sono, più quelli in arrivo, meno quelli già venduti.
const formulaTotale = (pos) => `={"Totale disponibile";ARRAYFORMULA(IF(LEN(${L(pos.codice)}2:${L(pos.codice)});IFERROR(${L(pos.quantita)}2:${L(pos.quantita)}+${L(pos.inConsegna)}2:${L(pos.inConsegna)}-${L(pos.daMontare)}2:${L(pos.daMontare)};"");""))}`;
// «Da riordinare» si guarda sul totale, se c'è (prima del 21 ott 2026 sulla quantità).
const suTotale = (pos) => (pos.totale >= 0 ? pos.totale : pos.quantita);
const formulaRiordinare = (pos) => {
  const [a, s, t] = [L(pos.codice), L(pos.scorta), L(suTotale(pos))];
  return `="Da riordinare: "&SUMPRODUCT((${a}2:${a}<>"")*(${s}2:${s}<>"")*(${t}2:${t}<=${s}2:${s}))`;
};
// Le visualizzazioni filtro oltre a quelle per categoria: [titolo, colonna, formula].
function vistePiu(pos) {
  const a = `$${L(pos.codice)}2<>""`;
  const v = [
    ['Da riordinare', suTotale(pos), `=(${a})*($${L(pos.scorta)}2<>"")*($${L(suTotale(pos))}2<=$${L(pos.scorta)}2)`],
    ['Finiti', pos.quantita, `=(${a})*($${L(pos.quantita)}2<=0)`],
  ];
  if (pos.inConsegna >= 0) v.push(['In consegna', pos.inConsegna, `=(${a})*($${L(pos.inConsegna)}2>0)`]);
  if (pos.daMontare >= 0) v.push(['Da montare', pos.daMontare, `=(${a})*($${L(pos.daMontare)}2>0)`]);
  return v;
}
const rgb = (h) => ({ red: parseInt(h.slice(1, 3), 16) / 255, green: parseInt(h.slice(3, 5), 16) / 255, blue: parseInt(h.slice(5, 7), 16) / 255 });
// I colori: sui numeri (Quantità…Valore) sotto zero rosso (anche un totale
// sotto zero: si è venduto più di quel che c'è e arriva, va ordinato
// subito), da riordinare arancio, finito grigio; e su Codice…Codice
// fornitore il colore della categoria (21 ott 2026: «evidenziare con colori
// diversi impianti, miscelatori, filtri così da sapere subito dove cercare»).
function regoleMagazzino(id, pos) {
  const zona = (da, a) => [{ sheetId: id, startRowIndex: 1, startColumnIndex: da, endColumnIndex: a }];
  const regole = [];
  const regola = (ranges, formula, format) => regole.push({ addConditionalFormatRule: { index: regole.length, rule: { ranges, booleanRule: { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] }, format } } } });
  const a = `$${L(pos.codice)}2<>""`;
  const q = `$${L(pos.quantita)}2`;
  const t = `$${L(suTotale(pos))}2`;
  const numeri = zona(pos.quantita, pos.ultima + 1);
  regola(numeri, `=(${a})*((${q}<0)+(${t}<0))`, { backgroundColor: rgb('#fde7e5'), textFormat: { foregroundColor: rgb('#b3261e') } });
  if (pos.scorta >= 0) regola(numeri, `=(${a})*($${L(pos.scorta)}2<>"")*(${t}<=$${L(pos.scorta)}2)`, { backgroundColor: rgb('#fff1d6') });
  regola(numeri, `=(${a})*(${q}=0)`, { textFormat: { foregroundColor: rgb('#8a97a5') } });
  if (pos.categoria >= 0) {
    for (const [c, colore] of Object.entries(COLORI_CATEGORIE)) regola(zona(0, pos.quantita), `=$${L(pos.categoria)}2="${c}"`, { backgroundColor: rgb(colore) });
  }
  return regole;
}
function aspettoMagazzino(id, pos) {
  const colonne = (da, a) => ({ sheetId: id, startRowIndex: 1, startColumnIndex: da, endColumnIndex: a });
  const euro = (c) => ({ repeatCell: { range: colonne(c, c + 1), cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '"€" #,##0.00' } } }, fields: 'userEnteredFormat.numberFormat' } });
  const larghezze = { codice: 70, categoria: 160, descrizione: 440, fornitore: 150, quantita: 90, inConsegna: 95, daMontare: 95, totale: 130, scorta: 110, costo: 90, note: 220, aggiornato: 110, valore: 100, riassunto: 300, riordinare: 180 };
  const centro = [pos.quantita, pos.inConsegna, pos.daMontare, pos.totale].filter((c) => c >= 0);
  return [
    { repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: Math.max(pos.ultima + 1, pos.riordinare + 1) }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: rgb('#eaf4fe') } }, fields: 'userEnteredFormat(textFormat,backgroundColor)' } },
    ...Object.entries(larghezze).filter(([k]) => pos[k] >= 0).map(([k, px]) => ({ updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: pos[k], endIndex: pos[k] + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } })),
    ...[pos.costo, pos.valore].filter((c) => c >= 0).map(euro),
    ...centro.map((c) => ({ repeatCell: { range: colonne(c, c + 1), cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', textFormat: { bold: true } } }, fields: 'userEnteredFormat(horizontalAlignment,textFormat)' } })),
    ...regoleMagazzino(id, pos),
  ];
}
function aspettoMovimenti(id) {
  const larghezze = [150, 95, 75, 380, 85, 150, 75, 220, 110, 90, 260, 100];
  return [
    { repeatCell: { range: { sheetId: id, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: larghezze.length }, cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.918, green: 0.957, blue: 0.996 } } }, fields: 'userEnteredFormat(textFormat,backgroundColor)' } },
    ...larghezze.map((px, i) => ({ updateDimensionProperties: { range: { sheetId: id, dimension: 'COLUMNS', startIndex: i, endIndex: i + 1 }, properties: { pixelSize: px }, fields: 'pixelSize' } })),
    { repeatCell: { range: { sheetId: id, startRowIndex: 1, startColumnIndex: 4, endColumnIndex: 5 }, cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '+0.##;-0.##;0' }, horizontalAlignment: 'CENTER', textFormat: { bold: true } } }, fields: 'userEnteredFormat(numberFormat,horizontalAlignment,textFormat)' } },
  ];
}
const testaMagazzino = async (foglio) => ((await foglio.leggi(`'${TAB_MAGAZZINO}'!A1:T1`, 'FORMULA'))[0] || []);

// Le categorie dal PC (20 ott 2026, Matteo: «se uno usa il foglio dal PC non
// c'è modo di dividere le categorie?»). La scheda resta una sola (l'app legge
// e scrive lì), ma si guarda una categoria alla volta:
// - il riquadro «Filtra per categoria» (filtro dati / slicer) accanto al totale;
// - una visualizzazione filtro per categoria, più «Da riordinare» e «Finiti»
//   (e dal 21 ott 2026 «In consegna» e «Da montare») (Dati → Visualizzazioni
//   filtro: valgono solo per chi le apre);
// - il menu a tendina nella colonna Categoria, così a mano non si sbaglia a
//   scriverla (un nome diverso finirebbe in «Altro»).
// Le righe nascoste dal filtro l'app le legge e le scrive lo stesso. Rifatta
// una seconda volta non raddoppia niente: salta quello che c'è già.
const TITOLO_RIQUADRO = 'Filtra per categoria';
function richiesteViste(info, pos) {
  const { sheetId: id, righe, slicers, filterViews } = info;
  const tabella = { sheetId: id, startRowIndex: 0, endRowIndex: righe, startColumnIndex: 0, endColumnIndex: pos.ultima + 1 };
  const richieste = [{
    setDataValidation: {
      range: { sheetId: id, startRowIndex: 1, endRowIndex: Math.min(righe, 500), startColumnIndex: pos.categoria, endColumnIndex: pos.categoria + 1 },
      rule: { condition: { type: 'ONE_OF_LIST', values: CATEGORIE.map((c) => ({ userEnteredValue: c })) }, strict: true, showCustomUi: true },
    },
  }];
  if (!slicers.includes(TITOLO_RIQUADRO)) {
    richieste.push({
      addSlicer: {
        slicer: {
          spec: { dataRange: tabella, columnIndex: pos.categoria, title: TITOLO_RIQUADRO, applyToPivotTables: false },
          position: { overlayPosition: { anchorCell: { sheetId: id, rowIndex: 2, columnIndex: pos.riassunto >= 0 ? pos.riassunto : pos.ultima + 2 }, offsetXPixels: 8, offsetYPixels: 0, widthPixels: 280, heightPixels: 56 } },
        },
      },
    });
  }
  const viste = [
    ...CATEGORIE.map((c) => [c, pos.categoria, { condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: c }] } }]),
    ...vistePiu(pos).map(([t, col, formula]) => [t, col, { condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: formula }] } }]),
  ];
  for (const [titolo, col, filterCriteria] of viste) {
    if (filterViews.includes(titolo)) continue;
    richieste.push({ addFilterView: { filter: { title: titolo, range: tabella, filterSpecs: [{ columnIndex: col, filterCriteria }] } } });
  }
  return richieste;
}
// Tutto o niente (un batchUpdate solo). Se Google rifiuta, il motivo torna a
// chi l'ha chiesto (solo Matteo): serve a correggere la richiesta.
const aspettoOErrore = (foglio, tab, richieste) => foglio.aspetto(tab, () => richieste).catch((err) => {
  throw problema(`Google non l'accetta: ${String(err.testo || err.message).replace(/\s+/g, ' ').slice(0, 400)}`, 502);
});
export async function vistePerCategoria(foglio, _dati, { chi } = {}) {
  if (chi !== 'matteo') throw problema('Questa operazione la può fare solo Matteo.', 403);
  const info = await foglio.infoScheda(TAB_MAGAZZINO);
  if (!info) throw problema('Il magazzino non c\'è ancora nel foglio.', 409);
  const pos = posizioniMagazzino(await testaMagazzino(foglio));
  const richieste = richiesteViste(info, pos);
  await aspettoOErrore(foglio, TAB_MAGAZZINO, richieste);
  return { ok: true, richieste: richieste.length, riquadro: !info.slicers.includes(TITOLO_RIQUADRO), viste: richieste.filter((r) => r.addFilterView).length };
}

// Aggiorna il magazzino nato il 20 ott 2026 (solo la chiave di Matteo; si
// può rifare, salta quello che c'è già): tre colonne nuove subito dopo la
// Quantità («In consegna», «Da montare», «Totale disponibile»: inserite come
// colonne, così Google sposta da solo formule, filtri e riquadro), la
// scritta «Da riordinare» e la visualizzazione filtro sul totale, le
// visualizzazioni «In consegna» e «Da montare», i colori rifatti (anche
// quelli delle categorie), e nei movimenti la colonna «Colonna».
export async function aggiornaMagazzino(foglio, _dati, { chi } = {}) {
  if (chi !== 'matteo') throw problema('Questa operazione la può fare solo Matteo.', 403);
  const prima = await foglio.infoScheda(TAB_MAGAZZINO);
  if (!prima) throw problema('Il magazzino non c\'è ancora nel foglio.', 409);
  const fatto = [];
  let pos = posizioniMagazzino(await testaMagazzino(foglio));
  if (pos.codice < 0 || pos.quantita < 0 || pos.categoria < 0) throw problema('Nel foglio Magazzino non trovo Codice, Categoria o Quantità.', 409);
  if (pos.inConsegna < 0 && pos.daMontare < 0 && pos.totale < 0) {
    const q = pos.quantita;
    await aspettoOErrore(foglio, TAB_MAGAZZINO, [{ insertDimension: { range: { sheetId: prima.sheetId, dimension: 'COLUMNS', startIndex: q + 1, endIndex: q + 4 }, inheritFromBefore: true } }]);
    await foglio.scrivi([{ range: `'${TAB_MAGAZZINO}'!${L(q + 1)}1:${L(q + 2)}1`, values: [['In consegna', 'Da montare']] }], 'RAW');
    await foglio.scrivi([{ range: `'${TAB_MAGAZZINO}'!${L(q + 3)}1`, values: [[formulaTotale({ ...pos, inConsegna: q + 1, daMontare: q + 2 })]] }], 'USER_ENTERED');
    fatto.push('colonne In consegna, Da montare e Totale disponibile');
    pos = posizioniMagazzino(await testaMagazzino(foglio));
  } else if (pos.inConsegna < 0 || pos.daMontare < 0 || pos.totale < 0) {
    throw problema('Le colonne nuove ci sono solo in parte: sistemale a mano prima.', 409);
  }
  if (pos.riordinare >= 0) {
    await foglio.scrivi([{ range: `'${TAB_MAGAZZINO}'!${L(pos.riordinare)}1`, values: [[formulaRiordinare(pos)]] }], 'USER_ENTERED');
    fatto.push('scritta Da riordinare sul totale');
  }
  // Colori e visualizzazioni: le regole vecchie via tutte, poi quelle giuste;
  // «Da riordinare» si rifà (guardava la quantità), le altre si aggiungono se mancano.
  const info = await foglio.infoScheda(TAB_MAGAZZINO);
  const via = [
    ...Array.from({ length: info.regole || 0 }, () => ({ deleteConditionalFormatRule: { sheetId: info.sheetId, index: 0 } })),
    ...(info.idViste && info.idViste['Da riordinare'] != null ? [{ deleteFilterView: { filterId: info.idViste['Da riordinare'] } }] : []),
  ];
  const restano = { ...info, filterViews: info.filterViews.filter((t) => t !== 'Da riordinare' || !(info.idViste && info.idViste[t] != null)) };
  const richieste = [...via, ...aspettoMagazzino(info.sheetId, pos), ...richiesteViste(restano, pos)];
  await aspettoOErrore(foglio, TAB_MAGAZZINO, richieste);
  fatto.push(`colori e filtri (${richieste.length} richieste)`);

  const testaMov = ((await foglio.leggi(`'${TAB_MOVIMENTI}'!A1:P1`, 'FORMATTED_VALUE'))[0] || []).map(testo);
  if (testaMov.length && !testaMov.some((v) => normalizza(v) === 'colonna')) {
    await foglio.scrivi([{ range: `'${TAB_MOVIMENTI}'!${L(testaMov.length)}1`, values: [['Colonna']] }], 'RAW');
    await foglio.aspetto(TAB_MOVIMENTI, aspettoMovimenti).catch((err) => console.error('Aspetto dei movimenti non dato:', err));
    fatto.push('colonna Colonna nei movimenti');
  }
  return { ok: true, fatto };
}

// Crea il magazzino nel foglio dagli articoli del vecchio Magazzino.xlsx
// (una volta sola, solo la chiave di Matteo): codici M001…, quantità, e un
// movimento «Carico iniziale» per ogni articolo che c'è. Se il magazzino ha
// già degli articoli si ferma: non riscrive niente. Nasce già con le colonne
// del 21 ott 2026.
export async function importaMagazzino(foglio, { articoli = [] }, { chi } = {}) {
  if (chi !== 'matteo') throw problema('Questa operazione la può fare solo Matteo.', 403);
  if (!Array.isArray(articoli) || !articoli.length || articoli.length > 500) throw problema('Articoli non validi.');
  const prima = await leggiMagazzino(foglio).catch(() => null);
  if (prima && prima.articoli.length) throw problema('Il magazzino nel foglio ha già degli articoli: non lo riscrivo.', 409);
  const giorno = testoData(oggi());
  const righe = articoli.map((x, i) => {
    const descrizione = testo(x.descrizione).replace(/\s+/g, ' ').slice(0, 200);
    if (!descrizione) throw problema(`Articolo ${i + 1} senza descrizione.`);
    const q = numeroDa(x.quantita) ?? 0;
    const costo = numeroDa(x.costo);
    return { codice: `M${String(i + 1).padStart(3, '0')}`, categoria: categoriaDa(x.categoria), descrizione, fornitore: testo(x.fornitore).slice(0, 60),
      quantita: arrotonda(q), inConsegna: '', daMontare: '', scorta: '', costo: costo == null ? '' : arrotonda(costo), note: testo(x.note).slice(0, 300), aggiornato: giorno };
  });
  await foglio.creaScheda(TAB_MAGAZZINO);
  await foglio.creaScheda(TAB_MOVIMENTI);
  // Ogni valore sotto la sua intestazione (il totale è una formula: lì niente).
  const chiaveDi = Object.fromEntries(Object.entries(CAMPI_ARTICOLO).map(([k, h]) => [h, k]));
  const valori = (o) => INTESTAZIONI_MAGAZZINO.map((h) => (chiaveDi[h] ? o[chiaveDi[h]] : ''));
  await foglio.scrivi([
    { range: `'${TAB_MAGAZZINO}'!A1:${lettera(INTESTAZIONI_MAGAZZINO.length)}${righe.length + 1}`, values: [INTESTAZIONI_MAGAZZINO, ...righe.map(valori)] },
    { range: `'${TAB_MOVIMENTI}'!A1:${lettera(INTESTAZIONI_MOVIMENTI.length)}1`, values: [INTESTAZIONI_MOVIMENTI] },
  ], 'RAW');
  // Il totale e il valore di ogni riga e, in testata dopo una colonna vuota,
  // il valore del magazzino e quanti sono da riordinare.
  const pos = posizioniMagazzino(INTESTAZIONI_MAGAZZINO);
  const v = pos.ultima + 1;
  const [q, c] = [L(pos.quantita), L(pos.costo)];
  await foglio.scrivi([
    { range: `'${TAB_MAGAZZINO}'!${L(pos.totale)}1`, values: [[formulaTotale(pos)]] },
    { range: `'${TAB_MAGAZZINO}'!${L(v)}1`, values: [[`={"Valore";ARRAYFORMULA(IF(LEN(A2:A);IFERROR(${q}2:${q}*${c}2:${c};0);""))}`]] },
    { range: `'${TAB_MAGAZZINO}'!${L(v + 2)}1`, values: [[`="Valore del magazzino: € "&FIXED(SUM(${L(v)}2:${L(v)});2)`]] },
    { range: `'${TAB_MAGAZZINO}'!${L(v + 3)}1`, values: [[formulaRiordinare(pos)]] },
  ], 'USER_ENTERED');
  const m = { colMov: Object.fromEntries(Object.keys(CAMPI_MOVIMENTO).map((k, i) => [k, i])) };
  await accodaMovimenti(foglio, m, righe.filter((a) => a.quantita).map((a) => ({
    id: `inizio-${a.codice}`, data: giorno, articolo: a.codice, descrizione: a.descrizione, quantita: a.quantita, causale: CAUSALE_INIZIALE, chi, note: 'Dal file Magazzino.xlsx', su: '',
  })));
  const fatta = posizioniMagazzino(await testaMagazzino(foglio));
  await foglio.aspetto(TAB_MAGAZZINO, (id) => aspettoMagazzino(id, fatta)).catch((err) => console.error('Aspetto del magazzino non dato:', err));
  await foglio.aspetto(TAB_MOVIMENTI, aspettoMovimenti).catch((err) => console.error('Aspetto dei movimenti non dato:', err));
  return { ok: true, articoli: righe.length, movimenti: righe.filter((a) => a.quantita).length };
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
    // Più intervalli in una lettura sola (conta una volta per i limiti di Google).
    async leggiInsieme(ranges, render) {
      const q = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
      const r = await chiama(`/values:batchGet?${q}&valueRenderOption=${render}&dateTimeRenderOption=SERIAL_NUMBER`);
      return (r.valueRanges || []).map((v) => v.values ?? []);
    },
    // Id, righe, filtri dati (slicer), visualizzazioni filtro (titoli e, in
    // idViste, i loro id) e quante regole di formattazione condizionale ha
    // una scheda (null = non c'è).
    async infoScheda(tab) {
      const meta = await chiama(`?fields=${encodeURIComponent('sheets(properties(sheetId,title,gridProperties(rowCount)),slicers(spec(title)),filterViews(title,filterViewId),conditionalFormats(ranges(sheetId)))')}`);
      const s = (meta.sheets || []).find((x) => x.properties.title === tab);
      if (!s) return null;
      return {
        sheetId: s.properties.sheetId, righe: s.properties.gridProperties?.rowCount || 1000,
        slicers: (s.slicers || []).map((x) => x.spec?.title || ''), filterViews: (s.filterViews || []).map((x) => x.title || ''),
        idViste: Object.fromEntries((s.filterViews || []).map((x) => [x.title || '', x.filterViewId])),
        regole: (s.conditionalFormats || []).length,
      };
    },
    // Formattazione di una scheda: `richieste(sheetId)` dà le richieste di batchUpdate.
    async aspetto(tab, richieste) {
      const sheetId = await idScheda(tab);
      if (sheetId == null) return;
      await chiama(':batchUpdate', { method: 'POST', body: JSON.stringify({ requests: richieste(sheetId) }) });
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
