// App "Gestione" per i telefoni di Stefano (babbo), Matteo e della segretaria: manutenzioni, clienti e contatti
// del Gestionale_Clienti. Tutto passa da /api/gestione
// (netlify/functions/gestione.mjs), che legge e scrive il foglio.
//
// Chi la usa non è pratico di tecnologia: ogni cosa si fa in 2-3 tocchi,
// ogni scrittura chiede conferma con parole semplici e si può annullare, e i
// messaggi d'errore dicono cosa fare, non cosa è successo dentro.
(function () {
  'use strict';

  const API = '/api/gestione';
  const K_CHIAVE = 'gestione-chiave';
  const K_DATI = 'gestione-dati';

  const $ = (id) => document.getElementById(id);
  const schermo = $('schermo');

  // ---------------------------------------------------------------------
  //  Memoria del telefono (se il browser la nega, l'app funziona lo stesso)
  // ---------------------------------------------------------------------
  const memoria = {
    leggi(k) { try { return localStorage.getItem(k); } catch { return null; } },
    scrivi(k, v) { try { localStorage.setItem(k, v); } catch { /* pazienza */ } },
    togli(k) { try { localStorage.removeItem(k); } catch { /* pazienza */ } },
  };

  // La chiave arriva col link di attivazione (…/gestione/#chiave=…) e resta
  // anche nell'indirizzo: su iPhone l'icona sulla schermata Home ha una
  // memoria separata da Safari, e così la chiave viaggia con l'icona.
  function chiaveDaIndirizzo() {
    const m = location.hash.match(/chiave=([\w-]+)/);
    return m ? m[1] : null;
  }
  let chiave = chiaveDaIndirizzo() || memoria.leggi(K_CHIAVE);
  if (chiave) memoria.scrivi(K_CHIAVE, chiave);
  // Perché il codice non vale più (accesso spento da Matteo), da mostrare all'ingresso.
  let motivoSospeso = '';

  let dati = null;          // { oggi, clienti, lead, stati }
  let aggiornatoAlle = null;
  try {
    const c = JSON.parse(memoria.leggi(K_DATI) || 'null');
    if (c && c.dati) { dati = c.dati; aggiornatoAlle = c.quando; }
  } catch { /* cache rovinata: si ricarica */ }

  // ---------------------------------------------------------------------
  //  Aiutanti
  // ---------------------------------------------------------------------
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Un telefono italiano ha fra 8 e 11 cifre, prefisso compreso: un cellulare 10,
  // un fisso di solito 9 o 10. L'8 ott 2026 un "222" scritto di fretta non e'
  // stato riconosciuto dall'anti-doppioni, e Angelo Gallo e' finito due volte fra
  // i contatti. Torna il messaggio da mostrare, o '' se va bene. Piu' numeri nello
  // stesso campo ("333… / 055…") si controllano uno per uno; i numeri esteri
  // (+ seguito da un prefisso che non e' 39) non si controllano.
  const problemaTelefono = (t) => {
    for (const pezzo of String(t || '').split(/[\/,;]| - | e /i)) {
      const p = pezzo.replace(/\s/g, '');
      if (!/\d/.test(p) || /^(\+|00)(?!39)/.test(p)) continue;
      const n = p.replace(/^(\+39|0039)/, '').replace(/\D/g, '').length;
      if (n < 8) return `Il numero sembra incompleto: ha solo ${n} ${n === 1 ? 'cifra' : 'cifre'}. Un cellulare ne ha 10, un fisso di solito 9 o 10 col prefisso.`;
      if (n > 11) return `Il numero sembra troppo lungo: ha ${n} cifre. Se sono due numeri, separali con una barra: 333 1234567 / 055 123456.`;
    }
    return '';
  };

  const normalizza =(s) => String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  const ICONE = {
    chiave: '<path d="M15 7a4 4 0 1 1-3.9 4.9L4 19v-3h3v-3h3l1.1-1.1"/><circle cx="15.5" cy="8.5" r="1"/>',
    attrezzi: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    telefono: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    cerca: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    piu: '<path d="M12 5v14M5 12h14"/>',
    spunta: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    mappa: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    messaggio: '<path d="M4 19l1.5-4A8 8 0 1 1 9 18.5z"/>',
    persone: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    posta: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
    matita: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    orologio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    allarme: '<path d="M12 3.5l9 16H3z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    pausa: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    personaPiu: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M19 8v6M16 11h6"/>',
    mirino: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    cartina: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    registro: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    euro: '<path d="M17.5 6.5a6.5 6.5 0 1 0 0 11M4 10h9M4 14h9"/>',
    frecciaGiu: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    frecciaSu: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    frecciaSx: '<path d="M15 5l-7 7 7 7"/>',
    frecciaDx: '<path d="M9 5l7 7-7 7"/>',
    scatola: '<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>',
    ingranaggio: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
    cestino: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
    scudo: '<path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
    fotocamera: '<path d="M3.5 8.5h3.5l2-3h6l2 3h3.5v11h-17z"/><circle cx="12" cy="13.5" r="3.5"/>',
  };
  const icona = (n) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONE[n]}</svg>`;

  // Date: numeri seriali del foglio (giorni dal 30/12/1899), in UTC.
  const EPOCA = Date.UTC(1899, 11, 30);
  const GIORNO = 86400000;
  const serialeDa = (a, m, g) => Math.round((Date.UTC(a, m - 1, g) - EPOCA) / GIORNO);
  const daSeriale = (n) => { const d = new Date(EPOCA + n * GIORNO); return { a: d.getUTCFullYear(), m: d.getUTCMonth() + 1, g: d.getUTCDate() }; };
  const due = (n) => String(n).padStart(2, '0');
  const testoData = (x) => `${due(x.g)}/${due(x.m)}/${x.a}`;
  const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
  const dataLunga = (x) => `${x.g} ${MESI[x.m - 1]} ${x.a}`;
  function oggi() {
    const p = {};
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', year: 'numeric', month: 'numeric', day: 'numeric' })
      .formatToParts(new Date()).forEach((x) => { p[x.type] = x.value; });
    return { a: +p.year, m: +p.month, g: +p.day };
  }
  const serialeOggi = () => { const o = oggi(); return serialeDa(o.a, o.m, o.g); };
  function piuMesi(x, mesi) {
    const tot = x.a * 12 + (x.m - 1) + mesi;
    const a = Math.floor(tot / 12);
    const m = (tot % 12) + 1;
    return { a, m, g: Math.min(x.g, new Date(Date.UTC(a, m, 0)).getUTCDate()) };
  }
  const isoDa = (x) => `${x.a}-${due(x.m)}-${due(x.g)}`;
  const daIso = (s) => { const t = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/); return t ? { a: +t[1], m: +t[2], g: +t[3] } : null; };

  // Quanto manca (o da quanto è passata) la manutenzione.
  function scadenza(c) {
    if (c.prossimaSeriale == null) return { classe: 'grigio', testo: 'Nessuna data', giorni: null };
    const d = c.prossimaSeriale - serialeOggi();
    const quanto = (n) => {
      if (n < 31) return n === 1 ? '1 giorno' : `${n} giorni`;
      if (n < 365) {
        const mesi = Math.min(Math.round(n / 30.4), 11);
        return mesi === 1 ? '1 mese' : `${mesi} mesi`;
      }
      const anni = Math.floor(n / 365);
      return anni === 1 ? 'un anno' : `${anni} anni`;
    };
    if (d < 0) return { classe: 'rosso', testo: `Scaduta da ${quanto(-d)}`, giorni: d };
    if (d === 0) return { classe: 'arancio', testo: 'Scade oggi', giorni: d };
    if (d <= 60) return { classe: 'arancio', testo: `Tra ${quanto(d)}`, giorni: d };
    return { classe: 'verde', testo: `Tra ${quanto(d)}`, giorni: d };
  }

  // Numeri di telefono dentro testi come "0577-929224 - Emanuela" o
  // "roberta 348 123 4567 / 055 123456".
  function telefoni(testo) {
    const trovati = [];
    const re = /(\+?\d[\d\s./-]{4,}\d)/g;
    let m;
    while ((m = re.exec(String(testo || '')))) {
      const cifre = m[1].replace(/[^\d+]/g, '');
      if (cifre.replace(/\D/g, '').length < 6) continue;
      const nazionale = cifre.replace(/^(\+39|0039)/, '');
      trovati.push({
        mostra: m[1].trim(),
        tel: cifre,
        cellulare: /^3\d{8,9}$/.test(nazionale),
        wa: '39' + nazionale,
      });
    }
    return trovati;
  }
  const email = (testo) => (String(testo || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [null])[0];
  const senzaCap = (citta) => String(citta || '').replace(/^\s*\d{5}\s+/, '');
  // "50012 BAGNO A RIPOLI" → "Bagno a Ripoli", "COLLE VAL D'ELSA" → "Colle Val d'Elsa".
  const titoloCitta = (citta) => senzaCap(citta).toLowerCase()
    .replace(/(^|[\s'’-])\p{L}/gu, (x) => x.toUpperCase())
    .replace(/(?!^)\b(A|Di|De|Del|Della|Dei|In|E|Al|Alla|Sul|Sulla|D)\b(?=[\s'’])/g, (x) => x.toLowerCase());

  // ---------------------------------------------------------------------
  //  Parlare col foglio
  // ---------------------------------------------------------------------
  // Col campo che va e viene una richiesta può restare appesa: dopo 20
  // secondi conta come «niente linea» (e le azioni vanno in coda, vedi
  // «Senza campo»). Gli errori portano lo stato HTTP: la coda distingue un
  // rifiuto del foglio (4xx: non si riprova) da un guasto (5xx: si riprova).
  // forse: la richiesta potrebbe essere arrivata lo stesso (20 s senza risposta).
  const nientelinea = (forse = false) => Object.assign(new Error('Niente linea. Riprova quando c\'è campo.'), { linea: true, forse });
  // `attesa`: una foto, col campo debole, può metterci più di 20 secondi.
  async function api(azione, datiAzione, attesa = 20000) {
    const ferma = new AbortController();
    const timer = setTimeout(() => ferma.abort(), attesa);
    try {
      let res;
      try {
        res = await fetch(API, azione
          ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chiave': chiave || '' }, body: JSON.stringify({ azione, dati: datiAzione }), signal: ferma.signal }
          : { headers: { 'X-Chiave': chiave || '' }, cache: 'no-store', signal: ferma.signal });
      } catch {
        throw nientelinea(ferma.signal.aborted);
      }
      let corpo = {};
      try { corpo = await res.json(); } catch { if (ferma.signal.aborted) throw nientelinea(true); /* risposta vuota */ }
      if (res.status === 401) {
        memoria.togli(K_CHIAVE);
        chiave = null;
        throw Object.assign(new Error('Codice di attivazione non valido.'), { chiave: true });
      }
      // Accesso spento da Matteo (22 ott 2026): il telefono non tiene più
      // niente, né i clienti né le cose da mandare né il codice.
      if (res.status === 403 && corpo.sospeso) {
        try { Object.keys(localStorage).filter((k) => k.startsWith('gestione-')).forEach((k) => localStorage.removeItem(k)); } catch { /* memoria non disponibile */ }
        // Anche le foto: quelle da mandare e quelle già viste (26 ott 2026).
        fotoInAttesa = [];
        try { indexedDB.deleteDatabase(DB_FOTO); } catch { /* niente memoria grande */ }
        try { caches.delete(CASSETTO_FOTO).catch(() => {}); } catch { /* niente Cache */ }
        chiave = null;
        dati = null;
        motivoSospeso = corpo.errore || 'Il tuo accesso all\'app è stato sospeso.';
        // Via il codice anche dall'indirizzo, e subito la schermata d'ingresso.
        try { history.replaceState({ s: 'attiva' }, '', location.pathname); } catch { /* niente */ }
        chiudiFinestra();
        schermoAttiva(motivoSospeso);
        throw Object.assign(new Error(motivoSospeso), { chiave: true, sospeso: true });
      }
      if (!res.ok || !corpo.ok) throw Object.assign(new Error(corpo.errore || 'Qualcosa non ha funzionato. Riprova tra poco.'), { stato: res.status });
      return corpo;
    } finally {
      clearTimeout(timer);
    }
  }
  const salvaDati = () => memoria.scrivi(K_DATI, JSON.stringify({ dati, quando: aggiornatoAlle }));

  // Movimenti del magazzino appena arrivati al foglio: una rilettura partita
  // prima potrebbe non averli ancora, e si rimettono sopra (come la coda).
  // APPLICA li riconosce dall'Id, così non contano due volte.
  const appenaArrivati = [];
  let caricando = null;
  function carica() {
    if (!caricando) {
      caricando = api().then((r) => {
        // Le posizioni trovate dalla mappa mentre il foglio si rileggeva non
        // sono ancora nei dati nuovi: si portano dietro (stesso indirizzo).
        const vecchi = new Map((dati?.clienti || []).map((c) => [c.codice, c]));
        r.clienti.forEach((c) => {
          const v = vecchi.get(c.codice);
          if (!c.prec && v && v.prec && indirizzoCercato(v) === indirizzoCercato(c)) Object.assign(c, { prec: v.prec, lat: v.lat, lng: v.lng });
        });
        // E quelle segnate col «Sono qui» senza campo: c'è linea, partono.
        applicaInAttesa(r.clienti);
        const nuovi = {
          oggi: r.oggi, clienti: r.clienti, lead: r.lead, persi: r.persi || [], stati: r.stati,
          storico: r.storico || [], io: r.io || '', persone: r.persone || [], tappe: r.tappe || [],
          magazzino: r.magazzino || null, foto: r.foto || [],
          nomi: r.nomi || {}, permessi: r.permessi || {}, titolare: !!r.titolare,
          accessi: r.accessi || null, elencoPermessi: r.elencoPermessi || null,
          // Vede solo i clienti dei suoi giri (22 ott 2026): lo dice il motore.
          soloSuoi: !!r.soloSuoi,
        };
        // Le azioni ancora in coda: il foglio non le ha, lo schermo sì.
        for (const v of appenaArrivati) if (Date.now() - v.quando < 120000) APPLICA[v.azione](nuovi, v.dati);
        for (const v of leggiLista(K_CODA)) if (APPLICA[v.azione]) APPLICA[v.azione](nuovi, v.dati);
        // Le foto appena arrivate, che una rilettura partita prima non ha ancora.
        for (const v of fotoAppenaArrivate) if (Date.now() - v.quando < 120000 && !nuovi.foto.some((f) => f.id === v.foto.id)) nuovi.foto.push(v.foto);
        dati = nuovi;
        aggiornatoAlle = Date.now();
        salvaDati();
        $('avviso').hidden = true;
        mandaPosizioniInAttesa();
        mandaTutto();
        return dati;
      }).finally(() => { caricando = null; });
    }
    return caricando;
  }

  // Ricarica in sottofondo e ridisegna lo schermo, senza disturbare se
  // intanto è aperta una finestra di conferma.
  function aggiornaInSottofondo() {
    carica().then(() => { if ($('finestra').hidden && !staiScrivendo()) disegna(history.state); })
      .catch((err) => { if (err.chiave) disegna({ s: 'attiva' }); });
  }
  // Un modulo a metà non si ridisegna da solo: si perderebbe quello che si
  // sta scrivendo (ora che lo schermo si aggiorna anche quando torna il campo).
  const staiScrivendo = () => ['nuovo', 'modifica', 'nuovoLead'].includes(history.state && history.state.s)
    || /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '');

  // ---------------------------------------------------------------------
  //  Navigazione: ogni schermata è una voce della cronologia, così anche il
  //  tasto "indietro" del telefono fa quello che ci si aspetta.
  // ---------------------------------------------------------------------
  function vai(stato) {
    chiudiFinestra();
    history.pushState(stato, '', location.pathname + location.hash);
    disegna(stato);
    window.scrollTo(0, 0);
  }
  $('indietro').addEventListener('click', () => history.back());
  window.addEventListener('popstate', (e) => { chiudiFinestra(); disegna(e.state); });

  function titolo(t, conIndietro) {
    $('titolo').textContent = t;
    $('indietro').hidden = !conIndietro;
    document.title = t === 'Acquadirete' ? 'Acquadirete' : `${t} · Acquadirete`;
  }

  function disegna(stato) {
    stato = stato || { s: 'home' };
    // Si lascia la mappa (o la si ridisegna): si ricorda dove si guardava.
    if (mappaAttiva) {
      // La mappa aperta su un cliente («Sulla mappa») si ricorda a parte:
      // quella delle manutenzioni non deve riaprirsi ingrandita su di lui.
      const v = { centro: mappaAttiva.getCenter(), zoom: mappaAttiva.getZoom() };
      if (mappaAttiva.evid) vistaCercato = { ...v, evid: mappaAttiva.evid }; else vistaMappa = v;
      mappaAttiva.remove();
      mappaAttiva = null;
    }
    fermaPosizione();
    window.onresize = null;
    if (!chiave) return schermoAttiva();
    if (!dati) {
      titolo('Acquadirete', false);
      schermo.innerHTML = '<div class="carica">Carico i clienti…</div>';
      carica().then(() => disegna(history.state)).catch((err) => {
        if (err.chiave) return schermoAttiva(err.message);
        schermo.innerHTML = `<div class="vuoto">${esc(err.message)}<br><br><button class="btn pieno" id="riprova">Riprova</button></div>`;
        $('riprova').onclick = () => disegna(history.state);
      });
      return;
    }
    const schermi = { home: schermoHome, scadenze: schermoScadenze, mappa: schermoMappa, cliente: schermoCliente, lead: schermoLead, schedaLead: schermoSchedaLead, cerca: schermoCerca, nuovo: schermoModulo, modifica: schermoModulo, nuovoLead: schermoNuovoLead, persi: schermoPersi, storico: schermoStorico, giri: schermoGiri, magazzino: schermoMagazzino, impostazioni: schermoImpostazioni };
    (schermi[stato.s] || schermoHome)(stato);
  }

  // ---------------------------------------------------------------------
  //  Finestra di conferma e messaggi
  // ---------------------------------------------------------------------
  // Chi aspetta che la finestra si chiuda, comunque si chiuda (tocco fuori,
  // tasto indietro): la domanda dei materiali dopo un lavoro, che solo
  // allora mostra il messaggio con «Annulla». Una finestra nuova lo azzera.
  let alChiudere = null;
  function apriFinestra(html) {
    alChiudere = null;
    // Il messaggio in basso (es. "Annulla" dell'azione prima) coprirebbe i
    // pulsanti della finestra: si chiude.
    $('messaggio').hidden = true;
    $('finestra').innerHTML = html;
    $('finestra').hidden = false;
    $('velo').hidden = false;
    document.body.style.overflow = 'hidden';
    return $('finestra');
  }
  function chiudiFinestra() {
    $('finestra').hidden = true;
    $('velo').hidden = true;
    $('finestra').innerHTML = '';
    document.body.style.overflow = '';
    const poi = alChiudere;
    alChiudere = null;
    if (poi) poi();
  }
  $('velo').addEventListener('click', chiudiFinestra);

  let timerMessaggio = null;
  function messaggio(testo, { errore = false, azione = null, durata = 5000 } = {}) {
    const m = $('messaggio');
    m.className = 'messaggio' + (errore ? ' errore' : '');
    m.innerHTML = `<span>${esc(testo)}</span>` + (azione ? `<button type="button">${esc(azione.testo)}</button>` : '');
    m.hidden = false;
    if (azione) m.querySelector('button').onclick = () => { m.hidden = true; azione.fai(); };
    clearTimeout(timerMessaggio);
    timerMessaggio = setTimeout(() => { m.hidden = true; }, durata);
  }

  // Blocca il pulsante mentre si scrive, così un doppio tocco non scrive due volte.
  async function conPulsante(btn, testoAttesa, lavoro) {
    const prima = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = testoAttesa;
    try { return await lavoro(); } finally { if (btn.isConnected) { btn.disabled = false; btn.innerHTML = prima; } }
  }

  // ---------------------------------------------------------------------
  //  Attivazione (una volta sola, la fa Matteo)
  // ---------------------------------------------------------------------
  function schermoAttiva(errore) {
    errore = errore || motivoSospeso;
    titolo('Acquadirete', false);
    schermo.innerHTML = `
      <p class="saluto">Benvenuto</p>
      <p>Per usare l'app serve il codice di attivazione. Te lo dà Matteo.</p>
      <form id="f-attiva">
        <label class="campo"><span>Codice di attivazione</span>
          <input name="codice" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
        ${errore ? `<p class="errore-campo">${esc(errore)}</p>` : ''}
        <button class="btn pieno grande" style="width:100%">${icona('chiave')} Attiva</button>
      </form>`;
    $('f-attiva').onsubmit = (e) => {
      e.preventDefault();
      chiave = e.target.codice.value.trim().toLowerCase();
      if (!chiave) return;
      motivoSospeso = '';
      memoria.scrivi(K_CHIAVE, chiave);
      history.replaceState({ s: 'home' }, '', location.pathname + '#chiave=' + chiave);
      dati = null;
      disegna({ s: 'home' });
    };
  }

  // ---------------------------------------------------------------------
  //  Home
  // ---------------------------------------------------------------------
  // Sospesi e urgenti stanno nelle loro pagine, non fra le scadute.
  function contaScadenze() {
    let scadute = 0; let presto = 0; let urgenti = 0; let sospese = 0;
    dati.clienti.forEach((c) => {
      if (c.avviso === 'Urgente') { urgenti++; return; }
      if (c.avviso === 'Sospesa') { sospese++; return; }
      const s = scadenza(c);
      if (s.giorni == null) return;
      if (s.giorni < 0) scadute++;
      else if (s.giorni >= 0 && s.giorni <= 60) presto++;
    });
    return { scadute, presto, urgenti, sospese };
  }

  // ---------------------------------------------------------------------
  //  Giri del giorno, e come hanno pagato (19 ott 2026, richieste di Matteo)
  // ---------------------------------------------------------------------
  // Un giro per ognuno di quelli che vanno dai clienti (dati.persone: i nomi
  // delle chiavi col permesso «giro», "matteo" e "babbo"; la segretaria no).
  // Dal 21 ott 2026 l'app li chiama per nome, «Giro di Matteo», «Giro di
  // Stefano», mai «il tuo» o «babbo» (richiesta di Matteo): i nomi veri
  // arrivano dal motore (dati.nomi, cambiabili dalle Impostazioni).
  const io = () => (dati && dati.io) || '';
  const giranti = () => (dati && dati.persone) || [];
  const hoGiro = () => giranti().includes(io());
  // I giri in ordine: prima il mio, se ce l'ho.
  const ordineGiri = () => (hoGiro() ? [io(), ...giranti().filter((p) => p !== io())] : giranti());
  const altri = () => ordineGiri().slice(1);
  // Il giro di riferimento (mappa, tappa nuova): il mio, o il primo.
  const giroPrincipale = () => ordineGiri()[0] || '';
  const nomeChi = (k) => (!k ? '' : (dati && dati.nomi && dati.nomi[k]) || k.charAt(0).toUpperCase() + k.slice(1));
  const daChi = (k) => `da ${nomeChi(k)}`;
  const giroDiNome = (k) => `Giro di ${nomeChi(k)}`;
  // «Matteo», «Matteo e Stefano», «Matteo, Stefano e Mario».
  const elencoNomi = (l) => { const n = l.map(nomeChi); return n.length > 1 ? `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}` : n.join(''); };
  const puo = (permesso) => !!(dati && (dati.titolare || (dati.permessi && dati.permessi[permesso])));

  // Dopo «Manutenzione fatta» l'app chiede come ha pagato. «Da risentire» =
  // non ha ancora pagato: si ritrova negli Interventi fatti, e quando paga si
  // cambia da lì. Il primo valore è quello che va nel foglio. «Gratis in
  // garanzia» (21 ott 2026, Matteo): fatta senza far pagare, è a posto così.
  const DA_RISENTIRE = 'Da risentire';
  const GARANZIA = 'Gratis in garanzia';
  const PAGAMENTI = [
    ['Contanti', 'Contanti', 'Contanti'],
    ['POS', 'POS (carta o bancomat)', 'POS'],
    ['Fattura e poi bonifico', 'Fattura, poi bonifico', 'Fattura, poi bonifico'],
    [GARANZIA, 'Gratis, in garanzia', 'In garanzia'],
    [DA_RISENTIRE, 'Da risentire per il pagamento', 'Da risentire per il pagamento'],
  ];
  const breve = (p) => (PAGAMENTI.find((x) => x[0] === p) || [p, p, p])[2];
  const icoPagamento = (v) => (v === DA_RISENTIRE ? 'orologio' : v === GARANZIA ? 'scudo' : 'euro');
  const etichettaPagamento = (p) => (p === DA_RISENTIRE ? `<span class="etichetta arancio">${esc(breve(p))}</span>`
    : p === GARANZIA ? `<span class="etichetta blu">${esc(breve(p))}</span>`
    : p ? `<span class="etichetta verde">${esc(breve(p))}</span>` : '<span class="etichetta grigio">Pagamento non segnato</span>');
  // "19/10/2026" → numero ordinabile.
  const quandoFatto = (s) => { const m = String(s.data).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : 0; };
  const daPagare = () => (dati.storico || []).filter((s) => s.pagamento === DA_RISENTIRE);

  // "01/10/2026 — perde acqua" → { quando: "01/10/2026", perche: "perde acqua", t: ordinabile }
  function leggiMotivo(c) {
    const s = String(c.motivo || '');
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*—\s*)?/);
    return {
      quando: m ? `${due(m[1])}/${due(m[2])}/${m[3]}` : '',
      perche: m ? s.slice(m[0].length).trim() : s.trim(),
      t: m ? Date.UTC(+m[3], +m[2] - 1, +m[1]) : 0,
    };
  }
  const statoLead = (l) => l.stato || 'Da richiamare';

  // Da risentire: preventivi mandati e mai chiusi, e contatti sentiti e poi
  // lasciati li'. Prende il posto del riepilogo del lunedi' dell'agente lead
  // (spento il 30 set 2026). Nel foglio non c'e' la data dell'ultimo contatto:
  // si conta dall'ultima traccia datata, cioe' la nota piu' recente scritta
  // dall'app ("gg/mm: …") o "Ha ricontattato il …", e se non ce n'e' nessuna
  // dall'arrivo del contatto.
  const RISENTI = { 'Preventivo inviato': 7, 'Contattato': 21 };
  const RISENTI_MAX = 60; // un "sentito" fermo da piu' di due mesi e' freddo: resta fra i Sentiti
  function ultimaTraccia(l) {
    let t = quandoArrivato(l);
    const adesso = Date.now();
    const note = String(l.note || '');
    for (const m of note.matchAll(/(?:^| — )(\d{2})\/(\d{2}): /g)) {
      let a = new Date(adesso).getUTCFullYear();
      let d = Date.UTC(a, +m[2] - 1, +m[1]);
      if (d > adesso + GIORNO) d = Date.UTC(a - 1, +m[2] - 1, +m[1]); // nota di dicembre letta a gennaio
      t = Math.max(t, d);
    }
    for (const m of note.matchAll(/Ha ricontattato il (\d{1,2})\/(\d{1,2})\/(\d{4})/g)) {
      t = Math.max(t, Date.UTC(+m[3], +m[2] - 1, +m[1]));
    }
    // Data dell'ultimo cambio di stato (colonna "Data stato", gg/mm/aaaa), se
    // il motore la manda: vuota vuol dire stato mai cambiato dall'arrivo.
    const s = String(l.dataStato || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (s) t = Math.max(t, Date.UTC(+s[3], +s[2] - 1, +s[1]));
    return t;
  }
  function daRisentire() {
    return dati.lead
      .map((l) => ({ l, giorni: Math.floor((Date.now() - ultimaTraccia(l)) / GIORNO) }))
      .filter(({ l, giorni }) => {
        const soglia = RISENTI[statoLead(l)];
        if (!soglia || !quandoArrivato(l)) return false;
        return giorni >= soglia && (statoLead(l) === 'Preventivo inviato' || giorni <= RISENTI_MAX);
      })
      .sort((a, b) => b.giorni - a.giorni);
  }

  function schermoHome() {
    titolo('Acquadirete', false);
    const { scadute, presto, urgenti } = contaScadenze();
    // Le tappe dei giri: le tue e quelle dell'altro.
    const tappe = (p) => tappeDel(oggiTesto(), p).length;
    const quante = (n) => (n === 0 ? 'nessuna tappa' : n === 1 ? '1 tappa' : `${n} tappe`);
    const giri = ordineGiri().map((p) => `${quante(tappe(p))} per ${nomeChi(p)}`);
    const qualcuna = ordineGiri().some((p) => tappe(p));
    const daRichiamare = dati.lead.filter((l) => statoLead(l) === 'Da richiamare').length;
    const risentire = daRisentire().length;
    const pagare = daPagare().length;
    const alle = aggiornatoAlle ? new Date(aggiornatoAlle).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    // Ordine delle tessere (26 ott 2026, Matteo): gli urgenti dentro
    // «Manutenzioni da fare» (prima avevano una tessera rossa loro, in cima),
    // «Aggiungi» subito sotto «Cerca», «Interventi fatti» in fondo.
    schermo.innerHTML = `
      ${riquadroCoda()}
      <div class="tessere">
        <button class="tessera" data-vai="scadenze">
          <span class="ico">${icona('attrezzi')}</span>
          <span><b>Manutenzioni da fare</b>
          <small>${urgenti ? `<span class="n-rosso">${urgenti === 1 ? '1 urgente' : `${urgenti} urgenti`}</span> · ` : ''}${scadute ? `<span class="n-rosso">${scadute} scadute</span> · ` : ''}${presto} nei prossimi 2 mesi</small></span>
        </button>
        ${giranti().length ? `<button class="tessera" data-vai="giri">
          <span class="ico">${icona('cartina')}</span>
          <span><b>Giro del giorno</b>
          <small>${qualcuna ? giri.join(' · ') : `Prepara ${ordineGiri().length > 1 ? 'i giri' : 'il giro'} di ${esc(elencoNomi(ordineGiri()))}`}</small></span>
        </button>` : ''}
        <button class="tessera" data-vai="lead">
          <span class="ico">${icona('telefono')}</span>
          <span><b>Contatti da chiamare</b>
          <small>${daRichiamare ? `<span class="n-rosso">${daRichiamare} da chiamare</span>` : 'Nessuno da chiamare'}${risentire ? ` · ${risentire} da risentire` : ''}</small></span>
        </button>
        <button class="tessera" data-vai="cerca">
          <span class="ico">${icona('cerca')}</span>
          <span><b>Cerca clienti e contatti</b><small>Per nome, città o telefono</small></span>
        </button>
        <button class="tessera" id="aggiungi">
          <span class="ico">${icona('piu')}</span>
          <span><b>Aggiungi</b><small>Un cliente nuovo o un contatto</small></span>
        </button>
        ${mag() ? `<button class="tessera" data-vai="magazzino">
          <span class="ico">${icona('scatola')}</span>
          <span><b>Magazzino</b>
          <small>${(() => {
            const riordinare = articoliMag().filter(daRiordinare).length;
            const ricontare = articoliMag().filter((a) => a.quantita < 0).length;
            return [riordinare && `<span class="n-rosso">${riordinare} da riordinare</span>`, ricontare && `<span class="n-rosso">${ricontare} da ricontare</span>`]
              .filter(Boolean).join(' · ') || `${articoliMag().length} articoli`;
          })()}</small></span>
        </button>` : ''}
        <button class="tessera" data-vai="storico">
          <span class="ico">${icona('registro')}</span>
          <span><b>Interventi fatti</b>
          <small>${pagare ? `<span class="n-rosso">${pagare} da risentire per il pagamento</span>` : 'Storico e pagamenti'}</small></span>
        </button>
      </div>
      ${dati.soloSuoi ? '<p class="spiega">Vedi i clienti e i contatti dei tuoi giri (dell\'ultimo mese e futuri). Per gli altri chiedi a Matteo.</p>' : ''}
      <p class="aggiornato">${io() ? `Stai usando l'app come <b>${esc(nomeChi(io()))}</b><br>` : ''}${alle ? `Dati aggiornati alle ${alle}` : ''}<br><button id="ricarica">Aggiorna adesso</button>
        ${dati.titolare ? `<br><button data-vai="impostazioni">${icona('ingranaggio')} Impostazioni</button>` : ''}</p>`;
    schermo.querySelectorAll('[data-vai]').forEach((b) => { b.onclick = () => vai({ s: b.dataset.vai, vista: b.dataset.vista }); });
    $('aggiungi').onclick = chiediCosaAggiungere;
    $('ricarica').onclick = (e) => conPulsante(e.target, 'Aggiorno…', () => carica().then(() => disegna(history.state)).catch((err) => messaggio(err.message, { errore: true })));
    collegaRiquadroCoda();
  }

  // Una tessera sola per «Nuovo cliente» e «Nuovo contatto» (19 ott 2026,
  // Matteo: una voce in meno nella schermata iniziale): si sceglie dopo.
  function chiediCosaAggiungere() {
    apriFinestra(`
      <h3>Chi vuoi aggiungere?</h3>
      <div class="tessere">
        <button class="tessera" type="button" data-vai="nuovo">
          <span class="ico">${icona('piu')}</span>
          <span><b>Un cliente</b><small>Ha l'impianto: entra nelle manutenzioni</small></span>
        </button>
        <button class="tessera" type="button" data-vai="nuovoLead">
          <span class="ico">${icona('personaPiu')}</span>
          <span><b>Un contatto</b><small>Ha telefonato o scritto per informazioni</small></span>
        </button>
      </div>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('finestra').querySelectorAll('[data-vai]').forEach((b) => { b.onclick = () => vai({ s: b.dataset.vai }); });
    $('no').onclick = chiudiFinestra;
  }

  // ---------------------------------------------------------------------
  //  Manutenzioni da fare
  // ---------------------------------------------------------------------
  function voceCliente(c, conScadenza = true) {
    const s = scadenza(c);
    const posto = [titoloCitta(c.citta), c.zona].filter(Boolean).join(' · ');
    // Urgenti e sospese mostrano il loro motivo al posto della scadenza.
    let riga3 = '';
    if (c.perso) {
      riga3 = `<span class="riga3"><span class="etichetta grigio">Cliente perso${c.persoIl ? ' dal ' + esc(c.persoIl) : ''}</span></span>`;
    } else if (c.avviso) {
      const mo = leggiMotivo(c);
      const etichetta = c.avviso === 'Urgente' ? `<span class="etichetta rosso">Urgente${mo.quando ? ' dal ' + esc(mo.quando) : ''}</span>` : `<span class="etichetta grigio">Sospesa${mo.quando ? ' dal ' + esc(mo.quando) : ''}</span>`;
      riga3 = `<span class="riga3">${etichetta}${etichettaGiro(c)}</span>${mo.perche ? `<span class="riga2" style="color:var(--testo)">${esc(mo.perche)}</span>` : ''}`;
    } else if (conScadenza) {
      riga3 = `<span class="riga3"><span class="etichetta ${s.classe}">${esc(s.testo)}</span>${c.prossima ? `<span class="etichetta grigio">${esc(c.prossima)}</span>` : ''}${etichettaGiro(c)}</span>`;
    }
    return `<button class="voce" data-codice="${esc(c.codice)}">
      <b>${esc(c.nome)}</b>
      <span class="riga2">${esc(posto || c.indirizzo || '—')}${c.tipo ? ' · ' + esc(c.tipo) : ''}</span>
      ${riga3}
    </button>`;
  }
  function collegaVoci() {
    schermo.querySelectorAll('[data-codice]').forEach((b) => { b.onclick = () => vai({ s: 'cliente', codice: b.dataset.codice }); });
  }

  // Tre filtri (26 ott 2026, Matteo: «le manutenzioni "nei prossimi due mesi"
  // perché non le posso selezionare con il filtro, e "da fare" rinominale
  // "scadute"»): "Scadute", "Prossimi 2 mesi" e "Sospese" (senza data,
  // finché non si riattivano). Prima scadute e prossime stavano insieme in
  // "Da fare". Gli urgenti (dal 26 ott non hanno più una pagina loro) stanno
  // in cima alle Scadute, dal più vecchio. Per scegliere dove andare c'è la
  // mappa: i tasti delle città sono stati tolti il 5 ott 2026.
  const VISTE = [['scadute', 'Scadute'], ['presto', 'Prossimi 2 mesi'], ['sospese', 'Sospese']];
  function schermoScadenze(stato) {
    titolo('Manutenzioni', true);
    const vista = VISTE.some(([v]) => v === stato.vista) ? stato.vista : 'scadute';
    const conGiorni = dati.clienti.filter((c) => !c.avviso).map((c) => ({ c, s: scadenza(c) })).filter((x) => x.s.giorni != null);
    const perData = (x, y) => x.c.prossimaSeriale - y.c.prossimaSeriale;
    // Tutte le scadute insieme, dalla più vecchia: anche quelle di anni fa,
    // che babbo sposta fra le sospese o fra i persi (scelta di Matteo, 1 ott).
    const scadute = conGiorni.filter((x) => x.s.giorni < 0).sort(perData).map((x) => x.c);
    const presto = conGiorni.filter((x) => x.s.giorni >= 0 && x.s.giorni <= 60).sort(perData).map((x) => x.c);
    const sospese = dati.clienti.filter((c) => c.avviso === 'Sospesa').sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    const urgenti = dati.clienti.filter((c) => c.avviso === 'Urgente').sort((a, b) => leggiMotivo(a).t - leggiMotivo(b).t);
    const conta = { scadute: scadute.length, presto: presto.length, sospese: sospese.length };

    schermo.innerHTML = `
      <div class="pillole a-capo">${VISTE.map(([v, t]) => `<button class="pillola" data-vista="${v}" aria-pressed="${vista === v}">${t} (${conta[v]})</button>`).join('')}</div>
      <button class="btn vai-mappa" id="vai-mappa" type="button">${icona('mappa')} Vedi sulla mappa</button>
      <div id="elenco"></div>`;

    const lista = (l) => `<div class="lista">${l.map((c) => voceCliente(c)).join('')}</div>`;
    if (vista === 'sospese') {
      $('elenco').innerHTML = sospese.length ? lista(sospese)
        : '<div class="vuoto">Nessuna manutenzione sospesa.<br><br>Per sospenderne una: nella scheda del cliente tocca «Rimanda la manutenzione» e poi «Sospendi, senza data».</div>';
    } else if (vista === 'presto') {
      $('elenco').innerHTML = presto.length ? lista(presto) : '<div class="vuoto">Niente in scadenza nei prossimi 2 mesi.</div>';
    } else {
      $('elenco').innerHTML = `
        ${urgenti.length ? `<h2 class="gruppo gruppo-rosso">${icona('allarme')} Urgenti (${urgenti.length})</h2>${lista(urgenti)}
        <h2 class="gruppo">Scadute (${scadute.length})</h2>` : ''}
        ${scadute.length ? lista(scadute) : '<div class="vuoto">Nessuna manutenzione scaduta 👍</div>'}`;
    }
    collegaVoci();

    schermo.querySelectorAll('[data-vista]').forEach((b) => {
      b.onclick = () => { history.replaceState({ s: 'scadenze', vista: b.dataset.vista }, '', location.pathname + location.hash); disegna(history.state); };
    });
    // Dalle sospese la mappa si apre con anche le sospese accese, dalle
    // prossime anche quelle fra 30 e 60 giorni.
    $('vai-mappa').onclick = () => vai({ s: 'mappa', cat: vista === 'sospese' ? [...CATEGORIE_DI_BASE, 'sospese'] : vista === 'presto' ? [...CATEGORIE_DI_BASE, 'due'] : CATEGORIE_DI_BASE });
  }

  // ---------------------------------------------------------------------
  //  Posizioni dei clienti (per la mappa)
  // ---------------------------------------------------------------------
  // Le cerca il telefono su OpenStreetMap (Nominatim: gratis, al massimo una
  // richiesta al secondo) e le salva nella scheda "Coordinate" del foglio,
  // così ogni indirizzo si cerca una volta sola. Prima l'indirizzo intero; se
  // non si trova (abbreviazioni, errori di battitura, frazioni) il centro del
  // paese, cioè una posizione approssimativa ("paese").
  // Lo script che le ha cercate tutte la prima volta (5 ott 2026) usa questa
  // stessa funzione: se cambi le regole, le posizioni vecchie restano come sono.
  const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
  const indirizzoCercato = (c) => [c.indirizzo, c.citta].map((s) => String(s == null ? '' : s).trim()).filter(Boolean).join(', ');
  let ultimaRicerca = 0;
  // Tutti i risultati (al massimo 10): quale vale lo decide chi chiama.
  async function chiediNominatim(parametri) {
    const attesa = ultimaRicerca + 1100 - Date.now();
    if (attesa > 0) await new Promise((ok) => setTimeout(ok, attesa));
    ultimaRicerca = Date.now();
    // Riquadro: Toscana larga, Versilia e Lunigiana. Fuori di qui è un omonimo.
    const q = new URLSearchParams({
      format: 'jsonv2', limit: '10', addressdetails: '1', countrycodes: 'it', viewbox: '9.6,44.6,12.4,42.3', bounded: '1',
      'accept-language': 'it', email: 'info@acquadirete.it', ...parametri,
    });
    const res = await fetch(`${NOMINATIM}?${q}`);
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    // Civico anche un negozio o un albergo col numero: «Via del Trebbio 4»
    // per OpenStreetMap è prima di tutto un ostello (19 ott 2026).
    // via: una strada, una piazza (place/square), o un posto che sta su una via
    // (l'albergo di «Viale Lavagnini» trovato al posto della strada).
    // bbox: il riquadro del luogo [sud, nord, ovest, est]; luogo: una frazione o località.
    return (await res.json()).map((r) => {
      const a = r.address || {};
      const piazza = r.category === 'place' && r.type === 'square';
      return {
        lat: +r.lat, lng: +r.lon, civico: r.type === 'house' || r.category === 'building' || !!a.house_number,
        via: r.category === 'highway' || piazza || (!!a.road && !['place', 'boundary'].includes(r.category)),
        luogo: r.category === 'place' && r.type !== 'house' && !piazza, address: a,
        bbox: Array.isArray(r.boundingbox) ? r.boundingbox.map(Number) : null,
      };
    });
  }
  const kmFra = (a, b) => Math.hypot((b.lng - a.lng) * Math.cos((a.lat + b.lat) * Math.PI / 360), b.lat - a.lat) * 111.32;
  // Il risultato sta davvero in quel paese? «Firenze», «Prato», «Pistoia» sono
  // anche province: «Via Italia, Firenze» combacerebbe con la Via Italia di
  // Vinci. Vale se un luogo dell'indirizzo è il paese scritto, o una parte
  // del nome («Montespertoli» per «Montagnaga Montespertoli»), o comincia
  // come lui («Tavarnelle Val di Pesa» per «Tavarnelle»), o se è un comune
  // fuso che lo contiene: «Incisa Valdarno» sta in «Figline e Incisa
  // Valdarno» (21 ott 2026). Solo per i nomi di due parole o più: «Massa»
  // non deve combaciare con «Massa e Cozzile».
  const LUOGHI = ['city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood', 'city_district', 'municipality', 'isolated_dwelling', 'locality'];
  const nelPaese = (paese) => {
    const nomi = [paese, ...paese.split(/\s*[,/]\s*/)].map(normalizza).filter(Boolean);
    return (r) => LUOGHI.some((k) => {
      const v = normalizza(r.address && r.address[k]);
      return v && nomi.some((n) => ` ${n} `.includes(` ${v} `) || ` ${v} `.startsWith(` ${n} `)
        || (n.includes(' ') && ` ${v} `.includes(` ${n} `)));
    });
  };
  const SANTE = /^(croce|maria|lucia|caterina|chiara|margherita|reparata|felicita|trinita|elisabetta|anna|agata|marta|cristina|giustina|apollonia|verdiana|brigida|orsola|monica|rosa|teresa|cecilia)$/i;
  async function cercaPosizione(c) {
    // Abbreviazioni sciolte; le iniziali dei nomi si tolgono invece di
    // indovinarle: «Via Balbo» trova anche «Via Cesare Balbo».
    // «S.» davanti a un nome è un santo, non un'iniziale (19 ott 2026: «Via S.
    // Michele delle Campora» diventava «Via Michele…» e non si trovava).
    const santo = (_, n) => `${SANTE.test(n) ? 'Santa ' : /^[aeiou]/i.test(n) ? 'Sant\'' : 'San '}${n}`;
    const via = String(c.indirizzo || '')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\bL\.go\b/gi, 'Largo').replace(/\bV\.le\b/gi, 'Viale').replace(/\bP\.?zz?a\b/gi, 'Piazza').replace(/\bC\.so\b/gi, 'Corso')
      .replace(/\bS\.\s*M\.\s*/gi, 'Santa Maria ').replace(/\bS\.\s*(\p{L}+)/giu, santo)
      .replace(/\b(Loc|Fraz)\.\s*/gi, '').replace(/(^|\s)(Localit[aà]|Frazione|Loc|Fraz)\s+/gi, ' ')
      .replace(/(^|\s)[A-Za-z]\.\s*/g, ' ')
      .replace(/\s+/g, ' ').trim();
    const paese = senzaCap(c.citta).replace(/\b(Loc|Fraz)\.\s*/gi, '').replace(/\s+/g, ' ').trim();
    const cap = (String(c.citta || '').match(/^\s*(\d{5})\s/) || [])[1];
    // Fra più risultati buoni vince quello nella provincia del foglio: «San
    // Donnino» sta a Campi Bisenzio, ma anche in Garfagnana e a Certaldo, e
    // il primo della lista era quello sbagliato (12 ott 2026). È solo una
    // preferenza: se la provincia del foglio è sbagliata si prende il primo.
    const prov = String(c.provincia || '').trim().toUpperCase();
    const inProvincia = (r) => {
      const iso = r.address['ISO3166-2-lvl6'];
      return !/^[A-Z]{2}$/.test(prov) || !iso || iso === `IT-${prov}`;
    };
    // Poi si scartano quelli con un CAP diverso da quello scritto nella città
    // (dal 18 ott 2026 quasi tutte ce l'hanno): «50013» dice Campi Bisenzio
    // meglio della provincia. Il CAP conta solo se almeno un risultato ce
    // l'ha uguale (un CAP generico, «50100», non toglie niente), un risultato
    // senza CAP non è scartato, e non fa mai perdere un civico trovato: «Via
    // Pisana 696, 50143 Firenze» per OpenStreetMap è nel 50142, e il civico
    // giusto vale più del CAP scritto.
    // Il CAP «di tutta la città» delle città che ne hanno tanti non dice
    // la zona: per Firenze, Pisa, Livorno e La Spezia non conta.
    const capVero = cap && !['50100', '56100', '57100', '19100'].includes(cap) ? cap : null;
    const capDi = (r) => String(r.address.postcode || '').split(/[;,\s]+/).filter(Boolean);
    const nelCap = (r) => !!capVero && capDi(r).includes(capVero);
    const scegli = (lista, vaBene = () => true) => {
      const primo = lista.find((r) => vaBene(r) && inProvincia(r)) || lista.find(vaBene);
      if (!primo || !lista.some((r) => vaBene(r) && nelCap(r))) return primo;
      const colCap = lista.find((r) => vaBene(r) && (nelCap(r) || !capDi(r).length) && inProvincia(r));
      return colCap && !(primo.civico && !colCap.civico) ? colCap : primo;
    };
    const precisione = (r) => (r.civico ? 'civico' : r.via ? 'via' : 'paese');
    // Un posto (negozio, albergo) vale solo se sta sulla via cercata: «Via
    // Pellicceria 1» trovava una pellicceria in Via Melchiorre Gioia.
    const PICCOLE = /^(via|viale|piazza|piazzale|largo|corso|vicolo|strada|localita|di|del|della|dello|dei|degli|delle|da|de|la|le|il|lo|san|santa|santo|sant|al|alla|in)$/;
    const paroleDi = (s) => normalizza(s).split(' ').filter((w) => w.length >= 3 && !PICCOLE.test(w) && !/^\d/.test(w));
    const paroleVia = paroleDi(via);
    const sullaVia = (r) => !paroleVia.length || !r.address.road || paroleDi(r.address.road).some((w) => paroleVia.includes(w));
    // Trovato il paese, la via si cerca solo lì dentro, senza il suo nome (19
    // ott 2026, 15 clienti di Firenze in Piazza della Signoria): «Firenze»,
    // «Prato», «Pistoia» sono anche province, e «Via Galliano, Firenze» dava
    // solo le vie omonime di Sesto e di Fiesole, scartate. Si prova anche con
    // Via e Viale scambiati («Viale Gramsci» scritto «Via Gramsci»). Vale una
    // via nel paese o entro 4 km dal suo centro; se non c'è, la frazione o la
    // località scritta («San Piero in Mercato»), sempre come «paese».
    async function dentroIlPaese(centro) {
      const bb = centro.bbox;
      const [s, n, w, e] = bb && bb.length === 4 && bb[1] - bb[0] >= 0.02 && bb[1] - bb[0] <= 0.4
        ? bb : [centro.lat - 0.045, centro.lat + 0.045, centro.lng - 0.06, centro.lng + 0.06];
      const viewbox = `${w - 0.01},${n + 0.01},${e + 0.01},${s - 0.01}`;
      const varianti = [via];
      if (/^Via\s/i.test(via)) varianti.push(via.replace(/^Via\s/i, 'Viale '));
      else if (/^Viale\s/i.test(via)) varianti.push(via.replace(/^Viale\s/i, 'Via '));
      // Senza «del», «della»…: «Via del Belvedere» per OpenStreetMap è «Via di Belvedere».
      const senzaArticolo = via.replace(/^(\p{L}+)\s+(?:di|del|dello|della|dei|degli|delle|de')\s+/iu, '$1 ');
      if (senzaArticolo !== via) varianti.push(senzaArticolo);
      // Una frazione col numero («San Piero in Mercato 218»): il nome da solo.
      const senzaNumero = via.replace(/[\s,]+\d+\s*\S*$/, '');
      if (senzaNumero !== via && senzaNumero.length >= 4) varianti.push(senzaNumero);
      // Senza «Via»: in centro a Firenze per OpenStreetMap è «Pellicceria»,
      // non «Via Pellicceria» (21 ott 2026, due clienti in Piazza della Signoria).
      const senzaTipo = via.replace(/^(Via|Viale)\s+/i, '');
      const conTipo = varianti.length;
      if (senzaTipo !== via && senzaTipo.replace(/[\s,]+\d+\s*\S*$/, '').length >= 4) varianti.push(senzaTipo);
      let luogo = null;
      for (const [k, v] of varianti.entries()) {
        const lista = await chiediNominatim({ q: v, viewbox, bounded: '1' });
        const r = scegli(lista.filter((x) => (x.civico || x.via) && sullaVia(x) && inProvincia(x) && (nelPaese(paese)(x) || kmFra(centro, x) <= 4)));
        if (r) return { lat: r.lat, lng: r.lng, prec: precisione(r) };
        // Senza «Via» vale solo una strada: «Via Paterno 16» a Borgo San
        // Lorenzo trovava il paesino di Paterno, a 12 km.
        if (k < conTipo) luogo = luogo || lista.find((x) => x.luogo && inProvincia(x) && kmFra(centro, x) <= 12);
      }
      return luogo ? { lat: luogo.lat, lng: luogo.lng, prec: 'paese' } : null;
    }
    let strade = [];
    if (via && paese) {
      strade = await chiediNominatim({ q: `${via}, ${paese}` });
      const r = scegli(strade, (x) => nelPaese(paese)(x) && sullaVia(x));
      if (r) return { lat: r.lat, lng: r.lng, prec: precisione(r) };
      // La via nella sua zona postale, senza il nome del paese (la frazione
      // che OpenStreetMap chiama in un altro modo): vale solo se poi sta
      // vicino al paese, come le altre strade trovate qui (sotto, 4 km).
      if (capVero) strade = strade.concat((await chiediNominatim({ street: via, postalcode: capVero })).filter(nelCap));
    }
    // Una parola sola è rischiosa («vicino» porterebbe nel senese un cliente
    // di Prato): lì il risultato DEVE stare nella provincia del foglio.
    // Il paese: prima come comune (il centro vero: «Prato» da solo darebbe la
    // provincia), poi come frazione; se sono due nomi («Le Valli, Figline»)
    // uno alla volta, dal più grande; poi la prima e l'ultima parola
    // («Marcialla Barberino Val d'Elsa», «Montagnaga Montespertoli»); per
    // ultimo dal CAP.
    const pezzi = paese.split(/\s*[,/]\s*/).filter(Boolean);
    const parole = paese.split(/[\s,/]+/).filter((p) => p.length >= 5);
    const nomi = [paese, ...(pezzi.length > 1 ? pezzi.reverse() : [])].filter(Boolean);
    const tentativi = [
      ...nomi.flatMap((n) => [[{ city: n }], [{ q: n }]]),
      parole.length > 1 && [{ q: parole[0] }, inProvincia],
      parole.length > 1 && [{ city: parole[parole.length - 1] }, inProvincia],
      cap && [{ postalcode: cap }],
    ];
    for (const t of tentativi) {
      if (!t) continue;
      const lista = await chiediNominatim(t[0]);
      const r = t[1] ? lista.find(t[1]) : scegli(lista);
      if (!r) continue;
      // La via esiste, ma OpenStreetMap la mette nella frazione accanto (Via
      // del Castagno «a San Donnino» per lui è a San Piero a Ponti, a 900
      // metri): vale se sta entro 4 km dal centro del paese. Più lontano è
      // la via omonima di un altro comune.
      const vicina = strade.filter((s) => (s.civico || s.via) && sullaVia(s)).map((s) => ({ s, km: kmFra(r, s) })).filter((x) => x.km <= 4).sort((a, b) => a.km - b.km)[0];
      if (vicina) return { lat: vicina.s.lat, lng: vicina.s.lng, prec: precisione(vicina.s) };
      if (via) {
        const dentro = await dentroIlPaese(r);
        if (dentro) return dentro;
      }
      return { lat: r.lat, lng: r.lng, prec: 'paese' };
    }
    return { prec: 'nessuna' };
  }

  // Cerca, una alla volta, le posizioni che mancano e le salva a gruppi.
  // Si ferma se si esce dalla mappa o se OpenStreetMap non risponde: le
  // altre si cercano la prossima volta.
  let cercaInCorso = false;
  // Cosa fare a ogni posizione trovata (c) e alla fine (null): lo decide la
  // mappa aperta in quel momento, che può non essere quella che ha iniziato.
  let quandoTrovata = () => {};
  async function cercaPosizioniMancanti(clienti) {
    const dopoOgnuna = (c) => quandoTrovata(c);
    if (cercaInCorso) return;
    cercaInCorso = true;
    const daSalvare = [];
    const salva = async () => {
      const pezzo = daSalvare.splice(0);
      if (pezzo.length) await api('posizioni', { posizioni: pezzo }).catch(() => { /* si ricercano la prossima volta */ });
    };
    try {
      for (const c of clienti) {
        if (!mappaAttiva) break;
        const cercato = indirizzoCercato(c);
        let p;
        try { p = await cercaPosizione(c); } catch { break; }
        Object.assign(c, p);
        // Se intanto i dati si sono ricaricati, anche il cliente "nuovo".
        const ora = dati && clienteDa(c.codice);
        if (ora && ora !== c && indirizzoCercato(ora) === cercato) Object.assign(ora, p);
        daSalvare.push({ codice: c.codice, cercato, ...p });
        dopoOgnuna(c);
        if (daSalvare.length >= 10) await salva();
      }
    } finally {
      await salva();
      cercaInCorso = false;
      if (dati) memoria.scrivi(K_DATI, JSON.stringify({ dati, quando: aggiornatoAlle }));
      dopoOgnuna(null);
    }
  }

  // ---------------------------------------------------------------------
  //  Dove si trova il telefono
  // ---------------------------------------------------------------------
  // Il permesso lo chiede il telefono la prima volta. Se è stato negato,
  // l'app non può richiederlo: va riacceso nelle impostazioni.
  const SU_IPHONE = /iPhone|iPad|iPod/.test(navigator.userAgent);
  function erroreGps(err) {
    if (err && err.code === 1) {
      return SU_IPHONE
        ? 'La posizione è bloccata. Sull\'iPhone: Impostazioni › Privacy e sicurezza › Localizzazione › Siti web di Safari › «Mentre usi l\'app». Poi riprova.'
        : 'La posizione è bloccata. In Chrome: tocca il lucchetto accanto all\'indirizzo (o Impostazioni › Impostazioni sito › Posizione) e permettila per acquadirete.it. Poi riprova.';
    }
    return 'Il telefono non riesce a sapere dove sei. Controlla che la posizione (GPS) sia accesa e riprova.';
  }
  // fresca: niente posizione vecchia tenuta in memoria dal telefono (serve
  // per «Sono qui», dove conta il punto di adesso).
  function doveSono({ fresca = false } = {}) {
    return new Promise((ok, ko) => {
      if (!navigator.geolocation) { ko(new Error('Questo telefono non sa dove si trova.')); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, margine: Math.round(p.coords.accuracy) }),
        (err) => ko(new Error(erroreGps(err))),
        // Senza campo il GPS parte senza l'aiuto della rete e ci mette di più:
        // per «Sono qui» si aspetta fino a 30 secondi.
        { enableHighAccuracy: true, timeout: fresca ? 30000 : 20000, maximumAge: fresca ? 0 : 60000 },
      );
    });
  }

  // ---------------------------------------------------------------------
  //  Mappa dei giri
  // ---------------------------------------------------------------------
  // Un puntino per ogni manutenzione da fare, colorato come nelle liste: si
  // vede dove sono ammassate, si toccano quelle da mettere nel giro e il
  // giro si apre in Google Maps. La libreria della mappa (Leaflet, con le
  // cartine di OpenStreetMap) si scarica solo quando si apre questa pagina.
  const LEAFLET = {
    js: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js', 'sha512-puJW3E/qXDqYp9IfhAI54BJEaWIfloJ7JWs7OeD5i6ruC9JZL1gERT1wjtwXFlh7CjE7ZJ+/vcRZRkIYIb6p4g=='],
    css: ['https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css', 'sha512-h9FcoyWjHcOcmEVkxOfTLnmZFWIH0iZhZT1H2TbOq55xssQGEJHEaIm+PgoUaZbRvQTNTluNOEfb1ZRy6D3BOw=='],
  };
  let leafletInArrivo = null;
  function caricaLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (!leafletInArrivo) {
      leafletInArrivo = new Promise((ok, ko) => {
        if (!document.querySelector('link[data-leaflet]')) {
          const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: LEAFLET.css[0], integrity: LEAFLET.css[1], crossOrigin: 'anonymous' });
          css.dataset.leaflet = '1';
          document.head.append(css);
        }
        const js = Object.assign(document.createElement('script'), { src: LEAFLET.js[0], integrity: LEAFLET.js[1], crossOrigin: 'anonymous' });
        js.onload = () => ok(window.L);
        js.onerror = () => { leafletInArrivo = null; js.remove(); ko(new Error('Mappa non scaricata')); };
        document.head.append(js);
      });
    }
    return leafletInArrivo;
  }

  const CATEGORIE_MAPPA = [
    { id: 'urgenti', nome: 'Urgenti' },
    { id: 'scadute', nome: 'Scadute' },
    { id: 'mese', nome: 'Entro 30 giorni' },
    { id: 'due', nome: 'Fra 30 e 60 giorni' },
    { id: 'sospese', nome: 'Sospese' },
  ];
  const CATEGORIE_DI_BASE = ['urgenti', 'scadute', 'mese'];
  function categoriaMappa(c) {
    if (c.avviso === 'Urgente') return 'urgenti';
    if (c.avviso === 'Sospesa') return 'sospese';
    const s = scadenza(c);
    if (s.giorni == null || s.giorni > 60) return null;
    return s.giorni < 0 ? 'scadute' : s.giorni <= 30 ? 'mese' : 'due';
  }

  // I giri: i clienti scelti, nell'ordine in cui farli. Fino al 19 ott 2026
  // il giro stava solo nel telefono; ora sta nel foglio (colonna "Chi ci
  // va"), uno per persona, e ognuno vede anche quello dell'altro. L'ordine
  // non si salva: si ricalcola dalle posizioni.
  memoria.togli('gestione-giro'); // il vecchio giro del telefono
  const MAX_TAPPE = 10; // Google Maps apre al massimo 10 tappe
  // Da dove parte babbo (sede, Via 1° Maggio a Montespertoli): serve solo a
  // mettere le tappe in un ordine sensato.
  const SEDE = { lat: 43.6436, lng: 11.0756 };
  // Ognuno parte da casa sua: Matteo da San Donnino, 50013 Campi Bisenzio
  // (19 ott 2026, sua richiesta); chi non è qui parte dalla sede.
  const PARTENZE = {
    babbo: { ...SEDE, nome: 'Montespertoli' },
    matteo: { lat: 43.7956, lng: 11.1502, nome: 'San Donnino' },
  };
  const partenzaDi = (p) => PARTENZE[p] || { ...SEDE, nome: 'Montespertoli' };
  let elencoGiroAperto = false;
  let mappaAttiva = null;   // la mappa Leaflet mostrata adesso
  let vistaMappa = null;    // centro e zoom, per ritrovarla uguale tornando indietro
  let vistaCercato = null;  // lo stesso, per la mappa aperta su un cliente ({ evid, centro, zoom })
  let fermaPosizione = () => {}; // smette di seguire il telefono quando si lascia la mappa

  const clienteDa = (codice) => dati.clienti.find((c) => c.codice === codice);
  // Distanza "a volo d'uccello" in gradi corretti: basta per confrontare.
  const distanza = (a, b) => Math.hypot((b.lng - a.lng) * Math.cos((a.lat + b.lat) * Math.PI / 360), b.lat - a.lat);

  // Ordina dei punti ({ lat, lng }) come un giro che parte da `casa` e ci
  // torna: prima il più vicino ogni volta, poi si sciolgono gli incroci
  // (2-opt). Si parte dal punto più vicino a casa.
  function ordinaPunti(punti, casa = SEDE) {
    const resto = punti.slice();
    const percorso = [casa];
    while (resto.length) {
      const qui = percorso[percorso.length - 1];
      let i = 0;
      resto.forEach((t, j) => { if (distanza(qui, t) < distanza(qui, resto[i])) i = j; });
      percorso.push(resto.splice(i, 1)[0]);
    }
    percorso.push(casa);
    for (let meglio = true, giri = 0; meglio && giri < 50; giri++) {
      meglio = false;
      for (let i = 1; i < percorso.length - 2; i++) {
        for (let j = i + 1; j < percorso.length - 1; j++) {
          const prima = distanza(percorso[i - 1], percorso[i]) + distanza(percorso[j], percorso[j + 1]);
          const dopo = distanza(percorso[i - 1], percorso[j]) + distanza(percorso[i], percorso[j + 1]);
          if (dopo < prima - 1e-9) { percorso.splice(i, j - i + 1, ...percorso.slice(i, j + 1).reverse()); meglio = true; }
        }
      }
    }
    // L'anello è lungo uguale nei due versi: si parte dalla tappa più vicina a casa.
    const tappe = percorso.slice(1, -1);
    if (tappe.length > 1 && distanza(casa, tappe[0]) > distanza(casa, tappe[tappe.length - 1])) tappe.reverse();
    return tappe;
  }

  // ---------------------------------------------------------------------
  //  Tappe dei giri (dal 20 ott 2026: lavori di ogni tipo, orari, giorni)
  // ---------------------------------------------------------------------
  // Una tappa è una riga della scheda "Giri" del foglio: giorno, ora
  // (facoltativa), di chi è, che lavoro è, e chi si va a trovare (un cliente,
  // un contatto o un indirizzo qualsiasi). Le tappe della colonna "Chi ci va"
  // del 19 ott arrivano senza giorno: valgono per oggi.
  const LAVORI = ['Manutenzione', 'Guasto', 'Installazione', 'Sopralluogo', 'Altro'];
  const oggiTesto = () => testoData(oggi());
  const giornoDi = (t) => t.giorno || oggiTesto();
  const serialeGiorno = (s) => { const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? serialeDa(+m[3], +m[2], +m[1]) : null; };
  const testoGiorno = (ser) => testoData(daSeriale(ser));
  // Le tappe da fare quel giorno; oggi anche quelle rimaste dai giorni prima.
  function tappeDel(giorno, p) {
    const s = serialeGiorno(giorno);
    const oggiS = serialeOggi();
    return (dati.tappe || []).filter((t) => {
      if (t.stato || (p && t.chi !== p)) return false;
      const g = serialeGiorno(giornoDi(t));
      return s === oggiS ? g <= oggiS : g === s;
    });
  }
  // Dove si va: il cliente (con la sua posizione e i suoi dati di oggi), o
  // quello che è scritto nella tappa (contatto, indirizzo qualsiasi).
  function luogoTappa(t) {
    const c = t.codice && clienteIn(dati, t.codice);
    if (c) return { nome: c.nome, indirizzo: c.indirizzo, citta: c.citta, provincia: c.provincia, lat: c.lat, lng: c.lng, telefono: c.contatto, cliente: c };
    return { nome: t.nome, indirizzo: t.indirizzo, citta: t.citta, provincia: '', lat: t.lat, lng: t.lng, telefono: t.telefono, cliente: null };
  }
  const puntoTappa = (t) => { const l = luogoTappa(t); return l.lat != null ? { lat: l.lat, lng: l.lng } : null; };
  // Le tappe con l'ora vanno in fila per ora; quelle senza si infilano dove
  // allungano meno il giro, da casa a casa; quelle senza posizione in fondo.
  // Una fascia oraria («dalle 9 alle 11», dal 21 ott 2026) va in fila per
  // l'ora d'inizio, e a pari inizio prima quella che finisce prima.
  function ordinaTappe(lista, casa = SEDE) {
    const conOra = lista.filter((t) => t.ora).sort((a, b) => a.ora.localeCompare(b.ora) || (a.oraFine || '99').localeCompare(b.oraFine || '99'));
    const senza = lista.filter((t) => !t.ora);
    const libere = senza.filter(puntoTappa);
    const inFondo = senza.filter((t) => !puntoTappa(t));
    if (!conOra.length) return [...ordinaPunti(libere.map((t) => ({ t, ...puntoTappa(t) })), casa).map((x) => x.t), ...inFondo];
    const seq = conOra.slice();
    const d = (a, b) => (a && b ? distanza(a, b) : 0);
    const punto = (i) => (i < 0 || i >= seq.length ? casa : puntoTappa(seq[i]));
    // Prima le più lontane da casa: si mettono meglio quando il giro è ancora vuoto.
    libere.sort((a, b) => distanza(casa, puntoTappa(b)) - distanza(casa, puntoTappa(a)));
    // Prima di un appuntamento entro le 10 non c'è tempo per altro: lì non si
    // infila niente. Una fascia che va oltre le 10 («dalle 9 alle 12») lascia spazio.
    const daQui = (conOra[0].oraFine || conOra[0].ora) < '10:00' ? 1 : 0;
    for (const t of libere) {
      const p = puntoTappa(t);
      let dove = daQui;
      let costo = Infinity;
      for (let i = daQui; i <= seq.length; i++) {
        const c = d(punto(i - 1), p) + d(p, punto(i)) - d(punto(i - 1), punto(i));
        if (c < costo) { costo = c; dove = i; }
      }
      seq.splice(dove, 0, t);
    }
    return [...seq, ...inFondo];
  }
  // Il giro di `p` quel giorno (di default oggi), in ordine.
  const giroDi = (p, giorno = oggiTesto()) => (p ? ordinaTappe(tappeDel(giorno, p), partenzaDi(p)) : []);
  // Le tappe ancora da fare di un cliente o di un contatto, dalla più vicina.
  const tappeDi = (filtro) => (dati.tappe || []).filter((t) => !t.stato && filtro(t))
    .sort((a, b) => (serialeGiorno(giornoDi(a)) - serialeGiorno(giornoDi(b))) || a.ora.localeCompare(b.ora));
  const chiaveLead = (l) => `${l.data}|${l.nome}`;
  const nuovoId = () => `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  // «oggi», «domani», «lun 27/10», «rimasta dal 19/10».
  const GIORNI = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  function quandoTappa(t, conOra = true) {
    const s = serialeGiorno(giornoDi(t));
    const o = serialeOggi();
    const g = daSeriale(s);
    const giorno = s === o ? 'oggi' : s === o + 1 ? 'domani' : s < o ? `rimasta dal ${due(g.g)}/${due(g.m)}`
      : `${GIORNI[new Date(Date.UTC(g.a, g.m - 1, g.g)).getUTCDay()]} ${due(g.g)}/${due(g.m)}`;
    return conOra && t.ora ? `${giorno} ${t.oraFine ? `dalle ${t.ora} alle ${t.oraFine}` : `alle ${t.ora}`}` : giorno;
  }
  // «10:00», o la fascia «09:00–11:00».
  const orarioTappa = (t) => (t.ora && t.oraFine ? `${t.ora}–${t.oraFine}` : t.ora || '');
  const etichettaLavoro = (t) => `<span class="etichetta lavoro-${normalizza(t.lavoro || 'Altro')}">${esc(t.lavoro || 'Altro')}</span>`;
  // «Giro di Stefano oggi alle 10:00» sulle voci dei clienti.
  function etichettaGiro(c) {
    const t = tappeDi((x) => x.codice === c.codice)[0];
    if (!t) return '';
    return `<span class="etichetta${t.chi === io() ? ' chi-mio' : ''}">${esc(giroDiNome(t.chi))} ${esc(quandoTappa(t))}</span>`;
  }

  // Salva una tappa (nuova o cambiata) e lo dice, con «Annulla».
  // `materiali`: dopo «Fatto» chiede che materiali sono stati usati (dal 20
  // ott 2026), e il messaggio con «Annulla» arriva dopo.
  async function salvaLaTappa(t, testo, { materiali = null } = {}) {
    const prima = (dati.tappe || []).find((x) => x.id === t.id);
    const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
    try {
      const { r, voce } = await manda('tappa', t, testo);
      if (r) { APPLICA.tappa(dati, r.tappa); salvaDati(); }
      disegna(history.state);
      const indietro = () => {
        if (r.annulla && r.annulla.togli) return togliLaTappa(r.tappa, 'Annullato.');
        return salvaLaTappa({ ...(prima || r.annulla) }, 'Annullato.');
      };
      const annullaTappa = voce ? () => annullaInCoda(voce, () => { dati.tappe = fotoTappe; }) : indietro;
      const avvisa = (mov) => {
        if (mov) disegna(history.state);
        messaggio(testo + (mov ? ` · ${mov.testo}` : '') + (voce ? fuoriLinea(voce) : ''), {
          durata: 10000,
          azione: { testo: 'Annulla', fai: async () => { if (mov) await annullaMovimento(mov, { zitto: true }); annullaTappa(); } },
        });
      };
      if (materiali && mag()) chiediMateriali({ ...materiali, dopo: avvisa });
      else avvisa(null);
      return true;
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      return false;
    }
  }
  async function togliLaTappa(t, testo = 'Tolta dal giro.') {
    const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
    try {
      const { r, voce } = await manda('togliTappa', { id: t.id, codice: t.codice }, `Tolta dal giro: ${luogoTappa(t).nome}`);
      if (r) { APPLICA.togliTappa(dati, { id: t.id, codice: t.codice }); salvaDati(); }
      disegna(history.state);
      const rimetti = voce ? () => annullaInCoda(voce, () => { dati.tappe = fotoTappe; })
        : r.annulla ? () => salvaLaTappa({ ...r.annulla }, 'Rimessa nel giro.') : null;
      messaggio(testo + (voce ? fuoriLinea(voce) : ''), { durata: 10000, azione: rimetti ? { testo: 'Annulla', fai: rimetti } : null });
      return true;
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      return false;
    }
  }

  // «Svuota»: tutte le tappe di quel giorno fuori, dopo la conferma.
  function chiediSvuota(p, giorno) {
    const lista = tappeDel(giorno, p);
    if (!lista.length) return;
    apriFinestra(`
      <h3>Svuotare il giro di ${esc(nomeChi(p))}?</h3>
      <p>Tolgo ${lista.length === 1 ? 'la tappa' : `tutte le ${lista.length} tappe`}. I clienti restano fra le manutenzioni da fare.</p>
      <button class="btn pieno grande" type="button" id="si">Sì, svuota</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      const tolte = [];
      try {
        for (const t of lista) {
          const { r } = await manda('togliTappa', { id: t.id, codice: t.codice }, `Tolta dal giro: ${luogoTappa(t).nome}`);
          if (r) APPLICA.togliTappa(dati, { id: t.id, codice: t.codice });
          tolte.push(t);
        }
        salvaDati();
        chiudiFinestra();
        disegna(history.state);
        messaggio('Giro svuotato.', { azione: { testo: 'Annulla', fai: () => rimettiTappe(tolte, giorno) }, durata: 12000 });
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
  }
  // L'annulla di «Svuota» (26 ott 2026: Matteo l'aveva toccato per sbaglio e
  // il giro è stato rimesso a mano): le tappe tornano uguali, con lo stesso Id.
  async function rimettiTappe(tolte, giorno) {
    try {
      for (const t of tolte) {
        const { vecchia, ...x } = t;
        const tappa = { ...x, giorno: t.giorno || giorno };
        const { r } = await manda('tappa', tappa, `Rimessa nel giro: ${luogoTappa(t).nome}`);
        if (r) APPLICA.tappa(dati, tappa);
      }
      salvaDati();
      disegna(history.state);
      messaggio('Giro rimesso com\'era.');
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
    }
  }

  // Il link che apre Google Maps col percorso: si parte da dove si è, l'ultima
  // tappa è l'arrivo. Indirizzi scritti (Google li trova meglio delle
  // coordinate di OpenStreetMap); le coordinate se la posizione è segnata
  // sul posto («Sono qui»), o se l'indirizzo manca.
  function linkGiro(tappe) {
    const dove = (t) => {
      const l = luogoTappa(t);
      return (l.cliente && sulPosto(l.cliente)) || (l.indirizzo
        ? [l.indirizzo, senzaCap(l.citta) ? l.citta : '', l.provincia].filter(Boolean).join(', ')
        : l.lat != null ? `${l.lat},${l.lng}` : senzaCap(l.citta));
    };
    const q = new URLSearchParams({ api: '1', travelmode: 'driving', destination: dove(tappe[tappe.length - 1]) });
    if (tappe.length > 1) q.set('waypoints', tappe.slice(0, -1).map(dove).join('|'));
    return `https://www.google.com/maps/dir/?${q}`;
  }

  // Più clienti nello stesso punto (stesso palazzo, o "centro del paese")
  // si aprono a girasole, così si tocca ognuno.
  function sparpaglia(lista) {
    const gruppi = new Map();
    lista.forEach((x) => {
      const k = `${x.c.lat.toFixed(4)},${x.c.lng.toFixed(4)}`;
      if (!gruppi.has(k)) gruppi.set(k, []);
      gruppi.get(k).push(x);
    });
    for (const g of gruppi.values()) {
      g.forEach((x, i) => {
        if (g.length === 1) { x.lat = x.c.lat; x.lng = x.c.lng; return; }
        const metri = (x.c.prec === 'paese' ? 140 : 14) * Math.sqrt(i + 0.5);
        const angolo = i * 2.39996; // angolo d'oro
        x.lat = x.c.lat + (metri / 111320) * Math.cos(angolo);
        x.lng = x.c.lng + (metri / (111320 * Math.cos(x.c.lat * Math.PI / 180))) * Math.sin(angolo);
      });
    }
    return lista;
  }

  let turnoMappa = 0; // quale schermoMappa è l'ultimo: gli altri non devono più disegnare
  function schermoMappa(stato) {
    const questa = ++turnoMappa;
    titolo('Mappa dei giri', true);
    const scelte = new Set(Array.isArray(stato.cat) ? stato.cat : CATEGORIE_DI_BASE);
    // Le tappe di oggi: il giro principale (il mio, se ce l'ho) e quelle degli altri, ognuna
    // col suo numero. Una tappa si riconosce dal cliente, o dal suo Id se è
    // un contatto o un indirizzo qualsiasi.
    const chiaveTappa = (t) => t.codice || t.id;
    const giro = giroDi(giroPrincipale());
    const numMio = new Map(giro.map((t, i) => [chiaveTappa(t), i + 1]));
    const numSuo = new Map(altri().flatMap((p) => giroDi(p).map((t, i) => [chiaveTappa(t), i + 1])));
    const tutti = dati.clienti.map((c) => ({ c, cat: categoriaMappa(c) })).filter((x) => x.cat);
    // Le tappe che non sono clienti (un contatto, un indirizzo) hanno un
    // puntino loro, blu: un «cliente» finto con la tappa dentro.
    [...giro, ...altri().flatMap((p) => giroDi(p))].filter((t) => !t.codice && t.lat != null).forEach((t) => {
      tutti.push({ c: { codice: t.id, nome: t.nome, indirizzo: t.indirizzo, citta: t.citta, lat: t.lat, lng: t.lng, prec: 'via', finto: true, tappa: t }, cat: 'tappa' });
    });
    // Il cliente aperto da «Sulla mappa» nella sua scheda (17 ott 2026) e le
    // tappe dei giri si vedono anche senza una manutenzione vicina: puntino
    // verde, «lontana». `centra` vale una volta sola (poi diventa `evid`), così
    // un aggiornamento in sottofondo non riporta la mappa su di lui.
    const evid = stato.centra || stato.evid || null;
    [evid, ...[...numMio.keys(), ...numSuo.keys()].filter((k) => /^C\d+$/.test(k))].forEach((k) => {
      const c = k && clienteDa(k);
      if (c && !tutti.some((x) => x.c === c)) tutti.push({ c, cat: 'lontana' });
    });
    const evidenziato = (c) => c.codice === evid;
    const segni = new Map(); // codice → puntino, per aprire il fumetto del cliente cercato
    const conta = {};
    tutti.forEach((x) => { conta[x.cat] = (conta[x.cat] || 0) + 1; });

    schermo.innerHTML = `
      <div class="pillole pillole-mappa">${CATEGORIE_MAPPA.map((k) => `<button class="pillola" data-cat="${k.id}" aria-pressed="${scelte.has(k.id)}"><span class="pallino-mappa ${k.id}"></span>${k.nome} (${conta[k.id] || 0})</button>`).join('')}</div>
      <p class="stato-mappa" id="stato-mappa" hidden></p>
      <div class="mappa" id="mappa"><div class="carica">Carico la mappa…</div></div>
      <div class="giro" id="giro"></div>`;

    let L = null;
    let strato = null;
    const nelGiro = (c) => numMio.has(c.codice);

    function dimensiona() {
      const el = $('mappa');
      if (!el) return;
      const sotto = $('giro').offsetHeight + 34;
      el.style.height = `${Math.max(300, window.innerHeight - el.getBoundingClientRect().top - window.scrollY - sotto)}px`;
      if (mappaAttiva) mappaAttiva.invalidateSize();
    }

    // Riga sopra la mappa: quante posizioni si stanno cercando, o quanti
    // clienti scelti non ci sono (indirizzo che manca o non trovato).
    function disegnaStato(cercando) {
      const el = $('stato-mappa');
      if (!el) return;
      const mostrati = tutti.filter((x) => scelte.has(x.cat));
      const daCercare = mostrati.filter((x) => !x.c.prec && x.c.citta).length;
      const fuori = mostrati.filter((x) => x.c.lat == null && !(cercando && !x.c.prec && x.c.citta));
      if (navigator.onLine === false) {
        el.innerHTML = 'Senza campo: la cartina si vede nelle zone già guardate, i puntini ci sono tutti.';
      } else if (cercando && daCercare) {
        el.innerHTML = `Cerco dove stanno ${daCercare} ${daCercare === 1 ? 'cliente' : 'clienti'}: i puntini compaiono man mano.`;
      } else if (fuori.length) {
        el.innerHTML = `${fuori.length} ${fuori.length === 1 ? 'cliente non è' : 'clienti non sono'} sulla mappa (indirizzo che manca). <button class="link" id="vedi-fuori">Vedi chi</button>`;
        $('vedi-fuori').onclick = () => {
          const f = apriFinestra(`<h3>Non sono sulla mappa</h3><p>Manca la città o l'indirizzo non si trova. Si sistemano da «Modifica i dati» nella scheda.</p>
            <div class="lista">${fuori.map((x) => voceCliente(x.c)).join('')}</div>
            <button class="btn leggero" id="chiudi-fuori">Chiudi</button>`);
          f.querySelectorAll('[data-codice]').forEach((b) => { b.onclick = () => vai({ s: 'cliente', codice: b.dataset.codice }); });
          $('chiudi-fuori').onclick = chiudiFinestra;
        };
      } else {
        el.innerHTML = '';
      }
      el.hidden = !el.innerHTML;
      dimensiona();
    }

    // L'elenco delle tappe sta chiuso (l'ordine si legge dai numeri sui
    // puntini): aperto ruberebbe mezza mappa.
    function disegnaGiro() {
      const tappe = giro;
      const nome = (t) => luogoTappa(t).nome.split('/')[0].replace(/\(.*?\)/g, '').trim();
      // Una riga per il giro dell'altro (i suoi puntini sono chiari).
      const degliAltri = altri().map((p) => {
        const n = tappeDel(oggiTesto(), p).length;
        return `<p class="giro-altro">Giro di ${esc(nomeChi(p))}: ${n === 1 ? '1 tappa' : `${n} tappe`}${n ? ' (puntini chiari)' : ''} · <button class="link" data-giri>Vedi i giri</button></p>`;
      }).join('');
      $('giro').innerHTML = (tappe.length
        ? `<div class="giro-testa"><b>${esc(giroDiNome(giroPrincipale()))}, oggi: ${tappe.length} ${tappe.length === 1 ? 'tappa' : 'tappe'}</b>
            <span><button class="link" id="elenco-giro">${elencoGiroAperto ? 'Chiudi elenco' : 'Elenco'}</button><button class="link" id="svuota-giro">Svuota</button></span></div>
          ${elencoGiroAperto ? `<p class="giro-tappe">${tappe.map((t, i) => `<span><b>${i + 1}</b>${t.ora ? `${esc(orarioTappa(t))} ` : ''}${esc(nome(t))} <i>${esc(titoloCitta(luogoTappa(t).citta))}</i></span>`).join('')}</p>` : ''}
          <a class="btn pieno largo" href="${esc(linkGiro(tappe))}" target="_blank" rel="noopener">${icona('mappa')} Apri il giro di ${esc(nomeChi(giroPrincipale()))} in Google Maps</a>`
        : giranti().length ? `<p class="giro-vuoto">Tocca un puntino e poi «Aggiungi al giro». Le tappe senza ora si mettono in ordine da sole: il giro di ${esc(nomeChi(giroPrincipale()))} parte da ${esc(partenzaDi(giroPrincipale()).nome)}.</p>` : '') + degliAltri;
      if ($('svuota-giro')) $('svuota-giro').onclick = () => chiediSvuota(giroPrincipale(), oggiTesto());
      if ($('elenco-giro')) $('elenco-giro').onclick = () => { elencoGiroAperto = !elencoGiroAperto; disegnaGiro(); };
      $('giro').querySelectorAll('[data-giri]').forEach((b) => { b.onclick = () => vai({ s: 'giri' }); });
      dimensiona();
    }

    function popup(c) {
      // Una tappa che non è un cliente (contatto, indirizzo qualsiasi).
      if (c.finto) {
        const t = c.tappa;
        return `<div class="popup-cliente">
          <b>${esc(t.nome)}</b>
          <span>${esc([t.indirizzo, titoloCitta(t.citta)].filter(Boolean).join(', '))}</span>
          <span class="riga3">${etichettaLavoro(t)}<span class="etichetta${t.chi === io() ? ' chi-mio' : ''}">${esc(giroDiNome(t.chi))} ${esc(quandoTappa(t))}</span></span>
          <div class="popup-azioni"><button class="btn pieno" data-giro="modifica">Cambia la tappa</button>
            ${t.contatto ? '<button class="btn" data-azione="contatto">Apri il contatto</button>' : ''}</div>
        </div>`;
      }
      const s = scadenza(c);
      const etichetta = c.avviso === 'Urgente' ? '<span class="etichetta rosso">Urgente</span>'
        : c.avviso === 'Sospesa' ? '<span class="etichetta grigio">Sospesa</span>'
        : `<span class="etichetta ${s.classe}">${esc(s.testo)}</span>`;
      const suaTappa = tappeDi((t) => t.codice === c.codice)[0];
      return `<div class="popup-cliente">
        <b>${esc(c.nome)}</b>
        <span>${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', '))}</span>
        <span class="riga3">${etichetta}${c.prossima ? `<span class="etichetta grigio">${esc(c.prossima)}</span>` : ''}${etichettaGiro(c)}</span>
        ${c.tipo ? `<span class="tipo">${esc(c.tipo)}</span>` : ''}
        ${c.prec === 'paese' ? '<small>Posizione approssimativa: centro del paese. Quando sei lì, «Sono qui» nella scheda la sistema.</small>' : ''}
        <div class="popup-azioni">${!giranti().length ? '' : suaTappa ? '<button class="btn" data-giro="modifica">Cambia la tappa</button>' : '<button class="btn pieno" data-giro="aggiungi">Aggiungi al giro</button>'}
          <button class="btn" data-azione="scheda">Apri la scheda</button>
        </div>
      </div>`;
    }

    function disegnaPuntini() {
      if (!strato) return;
      strato.clearLayers();
      segni.clear();
      // Le tappe del giro e il cliente cercato si vedono sempre, anche se la
      // loro categoria è spenta.
      const visibili = sparpaglia(tutti.filter((x) => x.c.lat != null && (scelte.has(x.cat) || x.cat === 'tappa' || nelGiro(x.c) || numSuo.has(x.c.codice) || evidenziato(x.c))));
      visibili.forEach((x) => {
        const n = (numMio.get(x.c.codice) || 0) - 1;
        const ev = evidenziato(x.c);
        // Le tappe del giro dell'altro: col loro numero, ma più chiare.
        const suo = n < 0 && numSuo.get(x.c.codice);
        const classi = ['pin', x.cat, x.c.prec === 'paese' ? 'circa' : '', n >= 0 ? 'nel-giro' : '', suo ? 'altrui' : '', ev ? 'evidenziato' : ''].filter(Boolean).join(' ');
        const testo = n >= 0 ? String(n + 1) : suo ? String(suo) : x.cat === 'urgenti' ? '!' : '';
        const lato = ev ? 36 : x.cat === 'urgenti' || n >= 0 || suo ? 32 : 26;
        const segno = L.marker([x.lat, x.lng], {
          icon: L.divIcon({ className: 'pin-mappa', html: `<span class="${classi}">${testo}</span>`, iconSize: [lato, lato], iconAnchor: [lato / 2, lato / 2], popupAnchor: [0, -lato / 2] }),
          keyboard: false,
          // Il cliente cercato, le tappe del giro e gli urgenti sopra gli altri puntini.
          zIndexOffset: ev ? 3000 : n >= 0 ? 2000 : suo ? 1500 : x.cat === 'urgenti' ? 1000 : x.cat === 'scadute' ? 500 : 0,
        });
        segni.set(x.c.codice, segno);
        segno.bindPopup(() => popup(x.c), { maxWidth: 280, minWidth: 220, autoPanPaddingTopLeft: [16, 64], autoPanPaddingBottomRight: [16, 16] });
        segno.on('popupopen', (e) => {
          const el = e.popup.getElement();
          el.querySelectorAll('[data-giro]').forEach((b) => {
            b.onclick = () => {
              mappaAttiva.closePopup();
              if (x.c.finto) chiediTappa({ tappa: x.c.tappa });
              else if (b.dataset.giro === 'modifica') chiediTappa({ tappa: tappeDi((t) => t.codice === x.c.codice)[0] });
              else chiediTappa({ cliente: x.c });
            };
          });
          const scheda = el.querySelector('[data-azione="scheda"]');
          if (scheda) scheda.onclick = () => vai({ s: 'cliente', codice: x.c.codice });
          const contatto = el.querySelector('[data-azione="contatto"]');
          if (contatto) contatto.onclick = () => apriLeadDaChiave(x.c.tappa.contatto);
        });
        segno.addTo(strato);
      });
    }

    schermo.querySelectorAll('[data-cat]').forEach((b) => {
      b.onclick = () => {
        if (scelte.has(b.dataset.cat)) scelte.delete(b.dataset.cat); else scelte.add(b.dataset.cat);
        b.setAttribute('aria-pressed', String(scelte.has(b.dataset.cat)));
        history.replaceState({ ...(history.state || {}), s: 'mappa', cat: [...scelte] }, '', location.pathname + location.hash);
        disegnaPuntini();
        disegnaStato(cercaInCorso);
      };
    });

    disegnaGiro();
    caricaLeaflet().then((libreria) => {
      const el = $('mappa');
      // Nel frattempo si è cambiata pagina, o la mappa è stata ridisegnata
      // (l'app riaperta sulla mappa si disegna due volte: coi dati salvati e
      // poi con quelli appena riletti). Due mappe nello stesso riquadro
      // davano «La mappa non si carica» con internet che andava.
      if (!el || history.state?.s !== 'mappa' || questa !== turnoMappa) return;
      L = libreria;
      el.innerHTML = '';
      dimensiona();
      const m = L.map(el, { zoomControl: true, attributionControl: true });
      m.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        // Chieste «in chiaro» (CORS, OpenStreetMap lo permette): così sw.js
        // può tenere da parte quelle già viste, per la mappa senza campo.
        crossOrigin: true,
        attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(m);
      mappaAttiva = m;
      strato = L.layerGroup().addTo(m);
      disegnaPuntini();

      // «Dove sono»: il puntino blu del telefono (col cerchio del margine),
      // che si sposta mentre si va. Se il permesso c'è già si accende da
      // solo; il pulsante poi riporta la mappa sul puntino.
      let segui = null;
      let qui = null;
      let puntino = null;
      let cerchio = null;
      let bottone = null;
      let daCentrare = false; // pulsante toccato, posizione non ancora arrivata
      const testoBottone = (t) => { bottone.querySelector('span').textContent = t; };
      fermaPosizione = () => {
        if (segui != null) navigator.geolocation.clearWatch(segui);
        segui = null;
      };
      function seguiTelefono(toccato) {
        if (!navigator.geolocation) { messaggio('Questo telefono non sa dove si trova.', { errore: true }); return; }
        if (toccato && qui) m.setView(qui, Math.max(m.getZoom(), 13));
        if (toccato && !qui) { daCentrare = true; testoBottone('Cerco…'); }
        if (segui != null) return;
        segui = navigator.geolocation.watchPosition((p) => {
          if (mappaAttiva !== m) return;
          qui = [p.coords.latitude, p.coords.longitude];
          if (!cerchio) {
            cerchio = L.circle(qui, { radius: p.coords.accuracy, color: '#1a73e8', weight: 1, fillColor: '#1a73e8', fillOpacity: 0.12, interactive: false }).addTo(m);
            // Sopra i puntini dei clienti (che stanno nel markerPane, 600)
            // e sotto i fumetti (700): se no in città sparisce fra gli altri.
            if (!m.getPane('qui')) Object.assign(m.createPane('qui').style, { zIndex: 650, pointerEvents: 'none' });
            puntino = L.circleMarker(qui, { pane: 'qui', radius: 9, color: '#fff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1, interactive: false }).addTo(m);
          } else {
            cerchio.setLatLng(qui).setRadius(p.coords.accuracy);
            puntino.setLatLng(qui);
          }
          if (daCentrare) { daCentrare = false; testoBottone('Dove sono'); m.setView(qui, Math.max(m.getZoom(), 13)); }
        }, (err) => {
          fermaPosizione();
          if (mappaAttiva !== m) return;
          testoBottone('Dove sono');
          // Accesa da sola e non riuscita: si tace, c'è sempre il pulsante.
          if (daCentrare) messaggio(erroreGps(err), { errore: true, durata: 15000 });
          daCentrare = false;
        }, { enableHighAccuracy: true, timeout: 20000, maximumAge: 30000 });
      }
      const DoveSono = L.Control.extend({
        onAdd() {
          bottone = L.DomUtil.create('button', 'dove-sono');
          bottone.type = 'button';
          bottone.innerHTML = `${icona('mirino')}<span>Dove sono</span>`;
          L.DomEvent.disableClickPropagation(bottone);
          bottone.onclick = () => seguiTelefono(true);
          return bottone;
        },
      });
      new DoveSono({ position: 'topright' }).addTo(m);
      if (navigator.permissions && navigator.geolocation) {
        navigator.permissions.query({ name: 'geolocation' })
          .then((s) => { if (s.state === 'granted' && mappaAttiva === m) seguiTelefono(false); })
          .catch(() => { /* telefono che non lo dice: si aspetta il pulsante */ });
      }

      m.evid = evid;
      const vista = evid ? (vistaCercato && vistaCercato.evid === evid ? vistaCercato : null) : vistaMappa;
      const cercato = evid && clienteDa(evid);
      if (cercato && cercato.lat != null && (stato.centra || !vista)) {
        // Da «Sulla mappa»: vicino a lui, col suo fumetto aperto. Poi
        // `centra` diventa `evid`: resta evidenziato ma la mappa non ci
        // torna più da sola.
        m.setView([cercato.lat, cercato.lng], 16);
        const s = segni.get(cercato.codice);
        if (s) s.openPopup();
        const { centra, ...resto } = history.state || {};
        history.replaceState({ ...resto, evid: cercato.codice }, '', location.pathname + location.hash);
      } else if (vista) {
        m.setView(vista.centro, vista.zoom);
      } else {
        // Si apre sulla zona dove sta il grosso dei clienti: i pochi lontani
        // (Livorno, Versilia) si vedono allontanando la mappa.
        const punti = tutti.filter((x) => x.c.lat != null && scelte.has(x.cat)).map((x) => x.c);
        if (punti.length) {
          const mediana = (v) => v.slice().sort((a, b) => a - b)[Math.floor(v.length / 2)];
          const centro = { lat: mediana(punti.map((p) => p.lat)), lng: mediana(punti.map((p) => p.lng)) };
          const vicini = punti.sort((a, b) => distanza(centro, a) - distanza(centro, b)).slice(0, Math.max(1, Math.ceil(punti.length * 0.85)));
          m.fitBounds(vicini.map((p) => [p.lat, p.lng]), { padding: [24, 24], maxZoom: 13 });
        } else {
          m.setView([SEDE.lat, SEDE.lng], 10);
        }
      }

      // Le posizioni che mancano: prima quelle che si vedono, le urgenti in testa.
      const ordineCat = Object.fromEntries(CATEGORIE_MAPPA.map((k, i) => [k.id, scelte.has(k.id) ? i : i + 10]));
      const mancano = tutti.filter((x) => !x.c.prec && x.c.citta).sort((a, b) => (ordineCat[a.cat] ?? 99) - (ordineCat[b.cat] ?? 99)).map((x) => x.c);
      quandoTrovata = (c) => {
        if (mappaAttiva !== m) return;
        if (c) { if (c.lat != null) disegnaPuntini(); disegnaStato(true); } else disegnaStato(false);
      };
      disegnaStato(mancano.length > 0 || cercaInCorso);
      if (mancano.length) cercaPosizioniMancanti(mancano);
    }).catch((err) => {
      console.error('Mappa:', err);
      const el = $('mappa');
      if (questa !== turnoMappa) return;
      if (el) el.innerHTML = '<div class="vuoto">La mappa non si carica: serve internet.<br><br><button class="btn pieno" id="riprova-mappa">Riprova</button></div>';
      if ($('riprova-mappa')) $('riprova-mappa').onclick = () => disegna(history.state);
    });
    window.onresize = dimensiona;
  }

  // ---------------------------------------------------------------------
  //  Scheda cliente
  // ---------------------------------------------------------------------
  // Il punto da dare a Google Maps: la posizione segnata sul posto («Sono
  // qui») se c'è, perché è quella giusta; se no l'indirizzo scritto, che
  // Google trova meglio delle coordinate di OpenStreetMap. Fino al 15 ott
  // 2026 «Portami lì» usava sempre l'indirizzo, e dopo un «Sono qui» portava
  // ancora nel posto sbagliato.
  const sulPosto = (c) => (c && c.prec === 'gps' && c.lat != null ? `${(+c.lat).toFixed(6)},${(+c.lng).toFixed(6)}` : '');
  // Su Android «Portami lì» apre Maps con geo: (26 ott 2026, Matteo: durante
  // il giro Maps si apriva «senza il punto», solo la mappa). Il link web di
  // Google Maps, con Maps già aperto, può riportare l'app in primo piano
  // senza fare la ricerca; geo: è il modo di Android per dire «apri questo
  // posto», e Maps lo esegue sempre (indirizzo o coordinate). Su iPhone geo:
  // non esiste: resta il link web, in una scheda nuova.
  const ANDROID = /Android/i.test(navigator.userAgent);
  const linkPortami = (dove) => (ANDROID
    ? `href="geo:0,0?q=${encodeURIComponent(dove)}"`
    : `href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dove)}" target="_blank" rel="noopener"`);
  function pulsantiContatto(testo, indirizzo, cliente = null) {
    const nums = telefoni(testo);
    const mail = email(testo);
    let html = nums.map((n) => `<a class="btn pieno largo" href="tel:${esc(n.tel)}">${icona('telefono')} Chiama ${esc(n.mostra)}</a>`).join('');
    const cell = nums.find((n) => n.cellulare);
    if (cell) html += `<a class="btn" href="https://wa.me/${esc(cell.wa)}" target="_blank" rel="noopener">${icona('messaggio')} WhatsApp</a>`;
    const dove = sulPosto(cliente) || indirizzo;
    if (dove) html += `<a class="btn" ${linkPortami(dove)}>${icona('mappa')} Portami lì</a>`;
    // La mappa dell'app, centrata su di lui (17 ott 2026): per vedere chi gli
    // sta vicino e metterlo nel giro. Solo se ha una posizione.
    if (cliente && cliente.lat != null) html += `<button class="btn" type="button" id="sulla-mappa">${icona('cartina')} Sulla mappa</button>`;
    if (mail) html += `<a class="btn" href="mailto:${esc(mail)}">${icona('posta')} Email</a>`;
    return html;
  }

  function schermoCliente(stato) {
    const c = dati.clienti.find((x) => x.codice === stato.codice) || (dati.persi || []).find((x) => x.codice === stato.codice);
    if (!c) { titolo('Cliente', true); schermo.innerHTML = '<div class="vuoto">Cliente non trovato. Torna indietro e riprova.</div>'; return; }
    titolo('Cliente', true);
    if (c.perso) return schedaPerso(c);
    const s = scadenza(c);
    const indirizzoCompleto = [c.indirizzo, senzaCap(c.citta) ? c.citta : '', c.provincia].filter(Boolean).join(', ');
    const riga = (etichetta, valore) => (valore ? `<div><dt>${etichetta}</dt><dd>${esc(valore)}</dd></div>` : '');
    const azioni = pulsantiContatto(c.contatto, c.indirizzo || c.citta ? indirizzoCompleto : '', c);
    // Tipico dei clienti appena passati da lead: la riga nasce quasi vuota.
    const mancano = [
      !c.indirizzo && 'indirizzo', !c.citta && 'città', !c.tipo && 'impianto',
      // Data e frequenza servono solo se la scadenza non c'è ancora.
      !c.prossima && !c.installazione && 'data di installazione', !c.prossima && !c.frequenza && 'ogni quanti mesi',
    ].filter(Boolean);
    // "Rimanda" solo quando la manutenzione è da fare: scaduta o entro 2 mesi
    // (e non già sospesa: lì c'è "Riattiva").
    const daFare = s.giorni != null && s.giorni <= 60 && c.avviso !== 'Sospesa';
    const mo = leggiMotivo(c);
    // I suoi interventi, dal più recente (anche come ha pagato).
    const fatti = interventi().filter((x) => x.codice === c.codice);
    const riquadroAvviso = !c.avviso ? '' : `
      <div class="avviso-cliente ${c.avviso === 'Urgente' ? 'rosso' : 'grigio'}">
        <div><b>${icona(c.avviso === 'Urgente' ? 'allarme' : 'pausa')} ${c.avviso === 'Urgente' ? 'GUASTO URGENTE' : 'MANUTENZIONE SOSPESA'}</b>
          ${mo.quando ? `<span>dal ${esc(mo.quando)}</span>` : ''}${mo.perche ? `<p>${esc(mo.perche)}</p>` : ''}</div>
        <button class="btn" type="button" id="togli-avviso">${c.avviso === 'Urgente' ? `${icona('spunta')} Fatto` : 'Riattiva'}</button>
      </div>`;
    schermo.innerHTML = `
      <div class="testa"><h2>${esc(c.nome)}</h2><p>${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', ') || 'Indirizzo non segnato')}</p></div>
      ${riquadroAvviso}
      ${(() => {
        const inCoda = leggiLista(K_CODA).filter((v) => v.dati && v.dati.codice === c.codice);
        return inCoda.length ? `<div class="riquadro-coda piccolo">${icona('orologio')} Non ancora nel foglio: ${inCoda.map((v) => esc(String(v.testo).split(':')[0].toLowerCase())).join(', ')}. Parte appena c'è campo.</div>` : '';
      })()}
      <div class="azioni">${azioni || ''}</div>
      <div class="scadenza ${s.classe}">
        <div>Prossima manutenzione<br><span>${esc(c.prossima || 'non segnata')}</span></div>
        <div style="text-align:right">${esc(s.testo)}</div>
      </div>
      ${giranti().length ? riquadroTappe(tappeDi((t) => t.codice === c.codice)) : ''}
      <button class="btn verde grande" id="fatta" style="width:100%">${icona('spunta')} Manutenzione fatta</button>
      ${c.avviso === 'Urgente' ? `<button class="btn verde grande" id="riparazione" style="width:100%;margin-top:10px">${icona('attrezzi')} Riparazione fatta</button>` : ''}
      ${daFare ? `<button class="btn" id="rimanda" style="width:100%;margin-top:10px">${icona('orologio')} Rimanda la manutenzione</button>` : ''}
      ${c.avviso !== 'Urgente' ? `<button class="btn btn-rosso" id="urgente" style="width:100%;margin-top:10px">${icona('allarme')} Guasto urgente</button>` : ''}
      ${mancano.length ? `<div class="scadenza arancio" style="margin:16px 0 0">Mancano: ${esc(mancano.join(', '))}</div>` : ''}
      <button class="btn${mancano.length ? ' pieno' : ''}" id="modifica" style="width:100%;margin-top:${mancano.length ? '10px' : '16px'}">${icona('matita')} ${mancano.length ? 'Completa i dati' : 'Modifica i dati'}</button>
      <button class="btn" id="sono-qui" style="width:100%;margin-top:10px">${icona('mirino')} Sono qui: segna la posizione</button>
      <p class="nota-posizione">${esc(POSIZIONE_IN_MAPPA[c.prec] || 'Non è ancora sulla mappa.')}${posizioniInAttesa().some((p) => p.codice === c.codice) ? '<br>Non è ancora nel foglio: la mando appena c\'è campo.' : ''}</p>
      ${riquadroFoto(c)}
      ${fatti.length ? `<h3 class="titoletto">Interventi fatti</h3>
      <div class="lista">${fatti.map((x) => voceIntervento(x, false)).join('')}</div>` : ''}
      ${mag() && lottiDi(c.codice).length ? `<h3 class="titoletto">Materiali usati</h3>
      <div class="lista">${lottiDi(c.codice).map(voceLotto).join('')}</div>` : ''}
      <h3 class="titoletto">Dati del cliente</h3>
      <dl class="dati">
        ${riga('Impianto', c.tipo)}
        ${riga('Installato il', c.installazione)}
        ${riga('Manutenzione', c.frequenza ? `Ogni ${c.frequenza} mesi` : '')}
        ${riga('Note / prezzo', c.note)}
        ${riga('Telefono / contatto', c.contatto)}
        ${riga('Zona del giro', c.zona)}
        ${riga('Codice', c.codice)}
      </dl>
      ${puo('togliClienti') ? '<button class="btn leggero" id="perso" style="width:100%;margin-top:14px">Non è più nostro cliente</button>' : ''}`;
    if ($('perso')) $('perso').onclick = () => chiediSposta(c, 'persi');
    $('fatta').onclick = () => chiediFatta(c);
    if ($('rimanda')) $('rimanda').onclick = () => chiediRimanda(c);
    if ($('urgente')) $('urgente').onclick = () => chiediAvviso(c, 'Urgente');
    // «Fatto» di un urgente chiede cosa è stato fatto (21 ott 2026); «Riattiva» no.
    if ($('togli-avviso')) $('togli-avviso').onclick = (e) => (c.avviso === 'Urgente' ? chiediCosaHaiFatto(c) : conPulsante(e.currentTarget, 'Salvo…', () => salvaAvviso(c, '', '')));
    if ($('riparazione')) $('riparazione').onclick = () => chiediAncheManutenzione(c);
    $('modifica').onclick = () => vai({ s: 'modifica', codice: c.codice });
    $('sono-qui').onclick = (e) => chiediSonoQui(c, e.currentTarget);
    if ($('sulla-mappa')) $('sulla-mappa').onclick = () => vai({ s: 'mappa', cat: CATEGORIE_DI_BASE, centra: c.codice });
    collegaTappe({ cliente: c });
    collegaInterventi();
    collegaLotti();
    collegaFoto(c);
  }

  // «Sono qui»: dal cliente, il punto dove sta il telefono diventa la sua
  // posizione sulla mappa (precisione "gps"), più giusta di quella trovata
  // dall'indirizzo. Si chiede sempre conferma, col margine del GPS e un
  // avviso se si è lontani da dove la mappa lo metteva (scheda sbagliata).
  const POSIZIONE_IN_MAPPA = {
    gps: 'Sulla mappa: segnata sul posto ✓',
    civico: 'Sulla mappa: dal numero civico.',
    via: 'Sulla mappa: dalla via, senza il numero.',
    paese: 'Sulla mappa: centro del paese, approssimativa.',
    nessuna: 'Non è sulla mappa: indirizzo non trovato.',
  };
  function chiediSonoQui(c, btn) {
    conPulsante(btn, 'Cerco dove sei…', async () => {
      let qui;
      try { qui = await doveSono({ fresca: true }); } catch (err) { messaggio(err.message, { errore: true, durata: 15000 }); return; }
      if (qui.margine > 100) {
        messaggio(`Il telefono sa dove sei solo con un margine di ${qui.margine} metri: troppo. Esci all'aperto, aspetta qualche secondo e riprova.`, { errore: true, durata: 12000 });
        return;
      }
      const km = c.lat != null ? distanza(c, qui) * 111.32 : 0;
      const lontano = km > (c.prec === 'paese' ? 10 : 2);
      apriFinestra(`
        <h3>Segno la posizione?</h3>
        <p><strong>${esc(c.nome)}</strong><br>Il punto dove sei adesso diventa la sua posizione sulla mappa (margine ${qui.margine} metri).</p>
        ${lontano ? `<div class="scadenza arancio" style="margin:0 0 14px">Sei a ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km da dove la mappa lo metteva. Sei proprio da lui?</div>` : ''}
        <button class="btn verde grande" type="button" id="si">${icona('spunta')} Sì, è qui</button>
        <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
      $('no').onclick = chiudiFinestra;
      $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
        const prima = c.prec && c.prec !== 'nessuna' ? { lat: c.lat, lng: c.lng, prec: c.prec } : null;
        const r = await segnaPosizione(c, { lat: qui.lat, lng: qui.lng, prec: 'gps' });
        chiudiFinestra();
        disegna(history.state);
        if (r && r.salvate === 0) {
          messaggio("Non salvata: l'indirizzo del cliente è appena cambiato. Torna indietro e riprova.", { errore: true, durata: 8000 });
          return;
        }
        const annulla = prima && {
          testo: 'Annulla',
          fai: () => segnaPosizione(c, prima).then(() => { disegna(history.state); messaggio('Annullato.'); }),
        };
        messaggio(r ? 'Posizione salvata ✓' : 'Posizione segnata ✓ Qui non c\'è campo: la mando al foglio appena torna.', { durata: annulla ? 15000 : r ? 5000 : 9000, azione: annulla });
      });
    });
  }

  // Posizioni segnate col «Sono qui» e non ancora arrivate al foglio: dal
  // cliente spesso non c'è campo (cantine, campagna). Restano nel telefono e
  // partono da sole appena c'è linea (all'apertura, quando torna la rete,
  // quando si torna sull'app); intanto valgono già per la mappa e per
  // «Portami lì». Per ogni cliente vale l'ultima segnata.
  const K_POSIZIONI = 'gestione-posizioni-da-mandare';
  function posizioniInAttesa() {
    try { const v = JSON.parse(memoria.leggi(K_POSIZIONI) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  function scriviInAttesa(lista) {
    if (lista.length) memoria.scrivi(K_POSIZIONI, JSON.stringify(lista.slice(-50))); else memoria.togli(K_POSIZIONI);
  }
  // Sopra i dati appena riletti dal foglio, che queste ancora non le hanno.
  function applicaInAttesa(clienti) {
    for (const p of posizioniInAttesa()) {
      const c = clienti.find((x) => x.codice === p.codice);
      if (c && indirizzoCercato(c) === p.cercato) Object.assign(c, { lat: p.lat, lng: p.lng, prec: p.prec });
    }
  }
  // Torna la risposta del foglio, o null se non è arrivata (restano in coda).
  let mandando = null;
  async function mandaPosizioniInAttesa() {
    while (mandando) await mandando;
    const lista = posizioniInAttesa();
    if (!lista.length || !chiave) return null;
    mandando = api('posizioni', { posizioni: lista.map(({ codice, cercato, lat, lng, prec }) => ({ codice, cercato, lat, lng, prec })) })
      .then((r) => {
        // Via quelle mandate, anche le «saltate» (l'indirizzo intanto è
        // cambiato: non c'è più niente da salvare); restano quelle nuove.
        const mandate = new Set(lista.map((p) => p.id));
        scriviInAttesa(posizioniInAttesa().filter((p) => !mandate.has(p.id)));
        // Sparisce «non è ancora nel foglio» (scheda) o la riga nel riquadro (home).
        if ($('finestra').hidden && !staiScrivendo()) disegna(history.state);
        return r;
      })
      .catch(() => null);
    try { return await mandando; } finally { mandando = null; }
  }
  // Col campo che va e viene una richiesta può restare appesa a lungo: dopo
  // 5 secondi non si aspetta più (la posizione è già nel telefono) e
  // l'invio continua da solo.
  async function segnaPosizione(c, p) {
    const voce = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, codice: c.codice, cercato: indirizzoCercato(c), ...p };
    scriviInAttesa([...posizioniInAttesa().filter((x) => x.codice !== c.codice), voce]);
    Object.assign(c, p);
    memoria.scrivi(K_DATI, JSON.stringify({ dati, quando: aggiornatoAlle }));
    return Promise.race([mandaPosizioniInAttesa(), new Promise((ok) => setTimeout(() => ok(null), 5000))]);
  }
  // Quando torna il campo. Tolta la modalità aereo il telefono dice «online»
  // qualche secondo prima che la rete funzioni davvero: il primo tentativo
  // andava a vuoto e coda e avviso «Senza linea» restavano lì finché non si
  // ricaricava (Matteo, 15 ott 2026). Ora, finché c'è qualcosa in coda o
  // l'avviso è acceso, si riprova ogni 8 secondi (solo con l'app davanti).
  // carica() rilegge il foglio, toglie l'avviso e fa partire le code.
  function riprovaLinea() {
    if (!chiave || !dati || document.visibilityState !== 'visible') return;
    const daMandare = leggiLista(K_CODA).length || posizioniInAttesa().length || fotoInAttesa.length;
    if (!daMandare && $('avviso').hidden) return;
    carica().then(() => { if ($('finestra').hidden && !staiScrivendo()) disegna(history.state); }).catch(() => {});
  }
  setInterval(riprovaLinea, 8000);
  window.addEventListener('online', () => { riprovaLinea(); setTimeout(riprovaLinea, 2500); });

  // ---------------------------------------------------------------------
  //  Senza campo: quello che si segna aspetta nel telefono
  // ---------------------------------------------------------------------
  // Dal 15 ott 2026 ogni azione («fatta», «rimanda», urgente e sospesa, persi,
  // modifiche, clienti e contatti nuovi, note e stato dei contatti) funziona
  // anche senza linea: se la richiesta non parte resta in coda nel telefono,
  // lo schermo cambia subito come se fosse arrivata (APPLICA), e la coda
  // parte da sola, in ordine, appena c'è campo. Una richiesta può arrivare
  // due volte (la linea cade dopo che è partita): il motore lo regge
  // (segnaFatta, notaLead, spostaCliente); «rimanda» manda la data già
  // calcolata, l'avviso il motivo già datato.
  const K_CODA = 'gestione-da-mandare';
  const K_NON_ARRIVATE = 'gestione-non-arrivate';
  function leggiLista(k) {
    try { const v = JSON.parse(memoria.leggi(k) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
  }
  const scriviLista = (k, v) => (v.length ? memoria.scrivi(k, JSON.stringify(v)) : memoria.togli(k));
  // In coda per la linea che manca, o in fila dietro altre che stanno partendo.
  const fuoriLinea = (voce) => (voce && voce.dietro ? ' È in fila dopo le altre: parte fra poco.' : ' Senza campo: parte appena c\'è linea.');

  const clienteIn = (d, codice) => d.clienti.find((x) => x.codice === codice) || (d.persi || []).find((x) => x.codice === codice);
  const leadIn = (d, x) => d.lead.find((l) => l.data === x.data && l.nome === x.nome) || d.lead.find((l) => String(l.riga) === String(x.riga));
  const conProssima = (c, g) => { c.prossima = testoData(g); c.prossimaSeriale = serialeDa(g.a, g.m, g.g); };
  // Fatta la manutenzione, le tappe del cliente fino a quel giorno sono fatte (come fa il motore).
  // `quali`: solo alcune (una riparazione chiude solo le tappe «Guasto»).
  const chiudiTappe = (d, codice, g, quali = () => true) => {
    const fattaS = serialeDa(g.a, g.m, g.g);
    (d.tappe || []).forEach((t) => {
      if (t.codice !== codice || t.stato || !quali(t)) return;
      const s = t.giorno ? serialeGiorno(t.giorno) : serialeOggi();
      if (s != null && s <= fattaS) t.stato = 'Fatta';
    });
  };
  // L'intervento appena segnato, nello storico del telefono (una volta sola).
  // Lavoro "Guasto" = una riparazione: senza la prossima manutenzione.
  const nelloStorico = (d, x, c, prima = '') => {
    const data = testoData(daIso(x.data));
    const lavoro = x.lavoro === 'Guasto' ? 'Guasto' : '';
    d.storico = d.storico || [];
    if (d.storico.some((s) => s.codice === x.codice && s.data === data && (s.lavoro || '') === lavoro)) return;
    d.storico.push({ riga: null, data, codice: x.codice, nome: c.nome, prossima: lavoro ? '' : c.prossima, chi: d.io || '', pagamento: x.pagamento || '', prima, lavoro });
  };
  // Come cambiano i dati per ogni azione, finché il foglio non risponde.
  const APPLICA = {
    fatta(d, x) {
      const c = clienteIn(d, x.codice);
      const mesi = parseInt(c && (c.frequenza || x.frequenza), 10);
      const g = daIso(x.data);
      if (!c || !(mesi > 0) || !g) return;
      const prima = c.prossima || '';
      conProssima(c, piuMesi(g, mesi));
      if (!c.frequenza) c.frequenza = mesi;
      c.avviso = '';
      c.motivo = '';
      c.chiVa = '';
      nelloStorico(d, x, c, prima);
      chiudiTappe(d, x.codice, g);
    },
    // Come segnaRiparazione: la prossima manutenzione resta, «Urgente» no.
    riparazione(d, x) {
      const c = clienteIn(d, x.codice);
      const g = daIso(x.data);
      if (!c || !g) return;
      if (c.avviso === 'Urgente') { c.avviso = ''; c.motivo = ''; }
      nelloStorico(d, { ...x, lavoro: 'Guasto' }, c);
      chiudiTappe(d, x.codice, g, (t) => t.lavoro === 'Guasto');
    },
    annullaRiparazione(d, x) {
      d.storico = (d.storico || []).filter((s) => !(s.codice === x.codice && s.data === x.data && s.lavoro === 'Guasto'));
      const c = clienteIn(d, x.codice);
      if (c && !c.avviso && x.avvisoPrima && x.avvisoPrima.avviso === 'Urgente') { c.avviso = 'Urgente'; c.motivo = x.avvisoPrima.motivo || ''; }
    },
    tappa(d, x) {
      d.tappe = d.tappe || [];
      const giorno = daIso(x.giorno) ? testoData(daIso(x.giorno)) : x.giorno;
      const t = { ...x, giorno, chi: String(x.chi || '').toLowerCase() };
      delete t.vecchia;
      const i = d.tappe.findIndex((y) => y.id === x.id);
      if (i >= 0) d.tappe[i] = t; else d.tappe.push(t);
      // Una tappa della colonna «Chi ci va» diventa una riga: la colonna si svuota.
      if (String(x.id).startsWith('col-')) { const c = clienteIn(d, x.codice); if (c) c.chiVa = ''; }
    },
    togliTappa(d, x) {
      d.tappe = (d.tappe || []).filter((t) => t.id !== x.id);
      if (String(x.id).startsWith('col-')) { const c = clienteIn(d, x.codice); if (c) c.chiVa = ''; }
    },
    pagamento(d, x) {
      const s = (d.storico || []).find((v) => v.codice === x.codice && v.data === x.data && (x.lavoro == null || (v.lavoro || '') === x.lavoro));
      if (s) s.pagamento = x.pagamento || '';
    },
    // Come muoviMagazzino nel motore: stessi Id dei movimenti, così non si
    // conta due volte una voce già arrivata e riletta dal foglio.
    // Dal 21 ott 2026 un movimento cambia uno dei tre numeri (`su`), e la
    // merce arrivata esce da «in consegna», un impianto (o qualsiasi cosa in
    // un'installazione) usato esce da «da montare»: come nel motore.
    magazzino(d, x) {
      const m = d.magazzino;
      if (!m) return;
      m.movimenti = m.movimenti || [];
      if (m.movimenti.some((v) => String(v.id).startsWith(`${x.id}-`))) return;
      const SU = { carico: 'quantita', lavoro: 'quantita', tolto: 'quantita', ordinato: 'inConsegna', venduto: 'daMontare' };
      const su = x.causale === 'correzione' ? (['inConsegna', 'daMontare'].includes(x.su) ? x.su : 'quantita') : SU[x.causale];
      if (!su) return;
      let n = 0;
      const base = { data: testoData(daIso(x.data) || oggi()), cliente: x.codice || '', nome: x.nome || '', lavoro: x.lavoro || '', chi: d.io || '' };
      const cambia = (a, s, dopo, causale, note) => {
        const prima = a[s] || 0;
        a[s] = arrotonda(dopo);
        const delta = arrotonda(a[s] - prima);
        if (delta) m.movimenti.push({ ...base, id: `${x.id}-${++n}`, articolo: a.codice, descrizione: a.descrizione, quantita: delta, causale, note, su: s });
      };
      (x.righe || []).forEach((r) => {
        const a = m.articoli.find((y) => y.codice === r.articolo);
        if (!a) return;
        const q = Number(r.quantita) || 0;
        const prima = a[su] || 0;
        const piu = ['carico', 'ordinato', 'venduto'].includes(x.causale);
        cambia(a, su, x.causale === 'correzione' ? q : piu ? prima + q : prima - q, CAUSALI_MAG[x.causale], x.note || '');
        if (!m.numeri) return;
        if (x.causale === 'carico') {
          const giu = Math.min(q, Math.max(0, a.inConsegna || 0));
          if (giu > 0) cambia(a, 'inConsegna', (a.inConsegna || 0) - giu, CAUSALI_MAG.carico, 'Era in consegna');
        }
        if (x.causale === 'lavoro' && (normalizza(x.lavoro) === 'installazione' || /^impianti/.test(normalizza(a.categoria)))) {
          const giu = Math.min(q, Math.max(0, a.daMontare || 0));
          if (giu > 0) cambia(a, 'daMontare', (a.daMontare || 0) - giu, CAUSALE_MONTATO, 'Era da montare');
        }
      });
    },
    // Come cambiaMateriali nel motore: i pezzi segnati prima per
    // quell'intervento tornano, quelli giusti si tolgono.
    materiali(d, x) {
      const m = d.magazzino;
      if (!m) return;
      m.movimenti = m.movimenti || [];
      if (m.movimenti.some((v) => String(v.id).startsWith(`${x.id}-`))) return;
      const giorno = daIso(x.data) ? testoData(daIso(x.data)) : String(x.data);
      const vecchi = m.movimenti.filter((v) => v.cliente === x.codice && v.data === giorno && v.causale === CAUSALI_MAG.lavoro && stessoLavoro(v.lavoro, x.lavoro));
      vecchi.forEach((v) => { const a = m.articoli.find((y) => y.codice === v.articolo); if (a) a.quantita = arrotonda(a.quantita - v.quantita); });
      m.movimenti = m.movimenti.filter((v) => !vecchi.includes(v));
      const voluti = new Map();
      (x.righe || []).forEach((r) => { const q = Number(r.quantita) || 0; if (q > 0) voluti.set(r.articolo, arrotonda((voluti.get(r.articolo) || 0) + q)); });
      let n = 0;
      voluti.forEach((q, k) => {
        const a = m.articoli.find((y) => y.codice === k);
        if (!a) return;
        a.quantita = arrotonda(a.quantita - q);
        m.movimenti.push({ id: `${x.id}-${++n}`, data: giorno, articolo: k, descrizione: a.descrizione, quantita: -q, causale: CAUSALI_MAG.lavoro, cliente: x.codice, nome: x.nome || '', lavoro: x.lavoro || 'Manutenzione', chi: d.io || '', note: '' });
      });
    },
    annullaMagazzino(d, x) {
      const m = d.magazzino;
      if (!m) return;
      const suo = (v) => String(v.id).startsWith(`${x.id}-`);
      (m.movimenti || []).filter(suo).forEach((v) => {
        const a = m.articoli.find((y) => y.codice === v.articolo);
        const s = ['inConsegna', 'daMontare'].includes(v.su) ? v.su : 'quantita';
        if (a) a[s] = arrotonda((a[s] || 0) - v.quantita);
      });
      m.movimenti = (m.movimenti || []).filter((v) => !suo(v));
    },
    // Un articolo nuovo compare quando arriva al foglio: il codice lo dà il foglio.
    articolo(d, x) {
      const a = x.codice && d.magazzino && d.magazzino.articoli.find((y) => y.codice === x.codice);
      if (!a) return;
      const numero = (v) => (v === '' || v == null ? null : Number(v));
      Object.assign(a, { categoria: x.categoria, descrizione: x.descrizione, fornitore: x.fornitore || '', scorta: numero(x.scorta), costo: numero(x.costo), note: x.note || '' });
    },
    assegna(d, x) {
      (x.codici || [x.codice]).forEach((k) => { const c = clienteIn(d, k); if (c) c.chiVa = x.a || ''; });
    },
    rimanda(d, x) {
      const c = clienteIn(d, x.codice);
      const g = daIso(x.data);
      if (!c || !g) return;
      conProssima(c, g);
      if (c.avviso === 'Sospesa') { c.avviso = ''; c.motivo = ''; }
    },
    avviso(d, x) {
      const c = clienteIn(d, x.codice);
      if (c) { c.avviso = x.avviso; c.motivo = x.avviso ? x.motivo : ''; }
    },
    sposta(d, x) {
      d.persi = d.persi || [];
      const [da, a] = x.verso === 'persi' ? [d.clienti, d.persi] : [d.persi, d.clienti];
      const i = da.findIndex((c) => c.codice === x.codice);
      if (i < 0) return;
      const [c] = da.splice(i, 1);
      if (x.verso === 'persi') Object.assign(c, { perso: true, persoIl: testoData(oggi()) });
      else { delete c.perso; delete c.persoIl; }
      a.push(c);
    },
    modifica(d, x) {
      const c = clienteIn(d, x.codice);
      if (!c) return;
      const k = x.campi || {};
      const prima = indirizzoCercato(c);
      if ('telefono' in k) c.contatto = k.telefono;
      ['indirizzo', 'tipo', 'note'].forEach((n) => { if (n in k) c[n] = k[n]; });
      if ('citta' in k) c.citta = String(k.citta).toUpperCase();
      if ('installazione' in k) { const g = daIso(k.installazione); c.installazione = g ? testoData(g) : ''; }
      if ('frequenza' in k) c.frequenza = k.frequenza;
      // Indirizzo cambiato: la posizione trovata dall'indirizzo non vale più.
      if (indirizzoCercato(c) !== prima && c.prec !== 'gps') { delete c.prec; delete c.lat; delete c.lng; }
      // Come la formula del foglio: senza data, la prossima viene da installazione + frequenza.
      const inst = String(c.installazione || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!c.prossima && inst && parseInt(c.frequenza, 10) > 0) conProssima(c, piuMesi({ a: +inst[3], m: +inst[2], g: +inst[1] }, parseInt(c.frequenza, 10)));
    },
    stato(d, x) {
      const l = leadIn(d, x);
      if (!l) return;
      if (statoLead(l) !== x.stato) l.dataStato = testoData(oggi());
      l.stato = x.stato;
    },
    nota(d, x) {
      const l = leadIn(d, x);
      if (l) l.note = [l.note, `${x.giorno}: ${x.nota}`].filter(Boolean).join(' — ');
    },
    // Le foto (26 ott 2026): la descrizione cambiata, tolta, rimessa. Quelle
    // nuove non passano da qui: aspettano nella memoria grande (mandaFoto).
    foto(d, x) {
      const f = (d.foto || []).find((y) => y.id === x.id);
      if (f && x.grande == null) f.descrizione = x.descrizione || '';
    },
    togliFoto(d, x) {
      d.foto = (d.foto || []).filter((y) => y.id !== x.id);
    },
    rimettiFoto(d, x) {
      d.foto = d.foto || [];
      if (x.foto && !d.foto.some((y) => y.id === x.id)) d.foto.push(x.foto);
    },
    // nuovo, nuovoLead e annulla non cambiano lo schermo: il cliente o il
    // contatto nuovo compare quando arriva al foglio.
  };

  // Prova subito; se la linea non c'è va in coda e lo schermo cambia già.
  // Torna { r } (la risposta del foglio) oppure { voce } (in coda).
  //
  // Prima nel telefono, poi al foglio (16 ott 2026, Matteo: «se modifico e
  // chiudo subito l'app si salva?»). La voce si scrive in coda PRIMA di
  // mandarla: se l'app si chiude mentre c'è «Salvo…», all'apertura riparte
  // da sola. `forse` = potrebbe essere già arrivata: il motore regge il
  // doppione, e la coda non lo segnala come errore. Se in coda c'è già
  // altro, la nuova va in fondo e parte dopo, perché l'ordine conta.
  const inVoloOra = new Set(); // voci che manda() sta mandando adesso: mandaCoda non le tocca
  const segnaForse = (id, forse) => scriviLista(K_CODA, leggiLista(K_CODA).map((v) => (v.id === id ? { ...v, forse } : v)));
  // `id`: scelto prima da chi chiama (le foto di un cliente nuovo aspettano quella voce).
  const nuovoIdVoce = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  async function manda(azione, datiAzione, testo, { id = nuovoIdVoce() } = {}) {
    const prima = leggiLista(K_CODA);
    const voce = { id, azione, dati: datiAzione, testo, quando: Date.now(), forse: !prima.length, dietro: prima.length > 0 };
    scriviLista(K_CODA, [...prima, voce]);
    const applica = () => { if (dati && APPLICA[azione]) { APPLICA[azione](dati, datiAzione); salvaDati(); } };
    if (prima.length) {
      applica();
      mandaCoda();
      return { voce };
    }
    inVoloOra.add(voce.id);
    try {
      const r = await api(azione, datiAzione);
      scriviLista(K_CODA, leggiLista(K_CODA).filter((v) => v.id !== voce.id));
      return { r };
    } catch (err) {
      if (!err.linea) { scriviLista(K_CODA, leggiLista(K_CODA).filter((v) => v.id !== voce.id)); throw err; }
      segnaForse(voce.id, !!err.forse);
      applica();
      return { voce };
    } finally {
      inVoloOra.delete(voce.id);
    }
  }
  // Fotografia di un cliente o contatto, per rimetterlo com'era.
  const fotografia = (o) => {
    const copia = JSON.parse(JSON.stringify(o));
    return () => { Object.keys(o).forEach((k) => { delete o[k]; }); Object.assign(o, copia); };
  };
  // «Annulla» su una cosa ancora in coda: si toglie e lo schermo torna com'era.
  function annullaInCoda(voce, ripristina) {
    const coda = leggiLista(K_CODA);
    if (!coda.some((v) => v.id === voce.id)) {
      messaggio('È già arrivata al foglio: da qui non si annulla più.', { errore: true, durata: 8000 });
      return;
    }
    scriviLista(K_CODA, coda.filter((v) => v.id !== voce.id));
    ripristina();
    salvaDati();
    disegna(history.state);
    messaggio('Annullato.');
  }

  // Manda la coda in ordine, una alla volta. Si ferma alla prima senza linea
  // (riprova dopo). Una rifiutata dal foglio (es. cliente non più nel
  // foglio) si toglie e finisce fra le «non arrivate», mostrate in home; un
  // guasto del motore (5xx) si riprova per un giorno.
  let svuotando = null;
  function mandaCoda() {
    if (svuotando) return svuotando;
    svuotando = (async () => {
      let cambiate = 0;
      for (;;) {
        const [voce] = leggiLista(K_CODA);
        if (!voce || !chiave || inVoloOra.has(voce.id)) break;
        // Da qui potrebbe arrivare: se l'app si chiude adesso, al riavvio si sa.
        segnaForse(voce.id, true);
        try {
          const r = await api(voce.azione, voce.dati);
          // Il codice del cliente nuovo, per le sue foto che lo aspettano
          // (prima di togliere la voce: chi manda le foto guarda lì).
          if (voce.azione === 'nuovo' && r.codice) segnaCodiceNuovo(voce.id, r.codice);
          // Il cliente nuovo c'era già (stesso nome): il foglio non l'ha
          // aggiunto. Se però era «forse arrivato», quello che c'è è lui.
          if (voce.azione === 'nuovo' && r.giaPresente && !voce.forse) {
            scriviLista(K_NON_ARRIVATE, [...leggiLista(K_NON_ARRIVATE), { testo: voce.testo, errore: `c'era già ${r.perso ? 'fra i clienti persi' : 'fra i clienti'} (${r.codice}), non l'ho aggiunto di nuovo`, quando: Date.now() }]);
          }
        } catch (err) {
          if (err.linea || err.chiave) { if (err.linea) segnaForse(voce.id, voce.forse || !!err.forse); break; }
          // Guasto del motore o di Google: si riprova (ogni 8 secondi con
          // l'app aperta) per un giorno intero, poi la si dà per non arrivata.
          if (err.stato >= 500 && Date.now() - (voce.quando || 0) < 24 * 3600 * 1000) break;
          // Un «annulla» forse già arrivato: «la data è cambiata» vuol dire che è fatto.
          const giaFatto = voce.forse && voce.azione === 'annulla' && err.stato === 409;
          if (!giaFatto) scriviLista(K_NON_ARRIVATE, [...leggiLista(K_NON_ARRIVATE), { testo: voce.testo, errore: err.message, quando: Date.now() }]);
        }
        scriviLista(K_CODA, leggiLista(K_CODA).filter((v) => v.id !== voce.id));
        cambiate++;
      }
      return cambiate;
    })().finally(() => { svuotando = null; });
    // Arrivate al foglio: si rileggono i dati veri (codici nuovi compresi).
    svuotando.then((n) => { if (n) aggiornaInSottofondo(); });
    return svuotando;
  }

  // Il riquadro in home: cosa aspetta il campo, e cosa il foglio ha rifiutato.
  function riquadroCoda() {
    const coda = leggiLista(K_CODA).map((v) => v.testo);
    const posizioni = posizioniInAttesa().map((p) => { const c = dati && clienteIn(dati, p.codice); return `Posizione di ${c ? c.nome : p.codice}`; });
    // Le foto, una riga per cliente.
    const perCliente = new Map();
    fotoInAttesa.forEach((f) => perCliente.set(f.nome, (perCliente.get(f.nome) || 0) + 1));
    const foto = [...perCliente].map(([nome, n]) => (n === 1 ? `Foto di ${nome}` : `${n} foto di ${nome}`));
    const tutte = [...coda, ...posizioni, ...foto];
    const rifiutate = leggiLista(K_NON_ARRIVATE);
    return (tutte.length ? `
      <div class="riquadro-coda">
        <b>${icona('orologio')} Da mandare al foglio (${tutte.length})</b>
        <p>Segnate senza campo: partono da sole appena c'è linea.</p>
        <ul>${tutte.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <button class="btn" type="button" id="manda-coda">Prova a mandarle adesso</button>
      </div>` : '') + (rifiutate.length ? `
      <div class="riquadro-coda rifiutate">
        <b>${icona('allarme')} Non sono arrivate al foglio</b>
        <ul>${rifiutate.map((x) => `<li>${esc(x.testo)}: <i>${esc(x.errore)}</i></li>`).join('')}</ul>
        <p>Vanno rifatte a mano, o chiedi a Matteo.</p>
        <button class="btn" type="button" id="visto-rifiutate">Ho capito</button>
      </div>` : '');
  }
  function collegaRiquadroCoda() {
    if ($('manda-coda')) {
      $('manda-coda').onclick = (e) => conPulsante(e.currentTarget, 'Provo…', async () => {
        await Promise.all([mandaTutto(), mandaPosizioniInAttesa()]);
        disegna(history.state);
        if (leggiLista(K_CODA).length || posizioniInAttesa().length || fotoInAttesa.length) messaggio('Ancora niente linea: riprovo da solo appena torna.', { errore: true });
      });
    }
    if ($('visto-rifiutate')) $('visto-rifiutate').onclick = () => { scriviLista(K_NON_ARRIVATE, []); disegna(history.state); };
  }

  // ---------------------------------------------------------------------
  //  Foto dei clienti
  // ---------------------------------------------------------------------
  // Dal 26 ott 2026 (Matteo: «quando babbo fa un sopralluogo può aggiungere
  // un nuovo cliente con le foto del lavello ecc., così quando vado io a
  // montare so cosa mi serve»). Il telefono riduce ogni foto (lato lungo
  // 1600 px, più una miniatura da 400) e la tiene nella sua memoria grande
  // (IndexedDB) finché non è arrivata: nella scheda si vede subito, e parte
  // da sola, una alla volta, appena c'è campo. Quelle di un cliente nuovo
  // segnato senza campo aspettano il suo codice (C0xx), che arriva con lui.
  // Le foto del foglio si scaricano quando servono e restano nel telefono
  // (Cache), così si rivedono anche senza campo. Il motore le tiene
  // nell'archivio di Netlify (vedi salvaFoto in gestionale.mjs).
  const DB_FOTO = 'gestione-foto';
  const CASSETTO_FOTO = 'gestione-foto';
  const MAX_FOTO_SALVATE = 400; // immagini tenute nel telefono (miniature comprese)
  const K_CODICI_NUOVI = 'gestione-codici-nuovi'; // voce «nuovo» → codice dato dal foglio
  // { id, codice, nuovo (id della voce del cliente nuovo), nome, descrizione, grande, piccola, quando, chi, url }
  let fotoInAttesa = [];
  const fotoAppenaArrivate = []; // { quando, foto }: per una rilettura partita prima

  let dbFoto = null;
  function apriDbFoto() {
    if (!dbFoto) {
      dbFoto = new Promise((ok, ko) => {
        const r = indexedDB.open(DB_FOTO, 1);
        r.onupgradeneeded = () => r.result.createObjectStore('attesa', { keyPath: 'id' });
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
      dbFoto.catch(() => { dbFoto = null; });
    }
    return dbFoto;
  }
  async function nelDbFoto(modo, fai) {
    const db = await apriDbFoto();
    return new Promise((ok, ko) => {
      const t = db.transaction('attesa', modo);
      const r = fai(t.objectStore('attesa'));
      t.oncomplete = () => ok(r.result);
      t.onerror = () => ko(t.error);
      t.onabort = () => ko(t.error);
    });
  }
  // All'apertura: quelle rimaste da mandare. Senza memoria grande (navigazione
  // privata su qualche telefono) restano solo quelle di questa apertura.
  async function caricaFotoInAttesa() {
    try {
      const tutte = await nelDbFoto('readonly', (s) => s.getAll());
      fotoInAttesa = (tutte || []).sort((a, b) => a.quando - b.quando).map((f) => ({ ...f, url: URL.createObjectURL(f.piccola) }));
    } catch { /* pazienza */ }
  }
  async function mettiFotoInAttesa(lista) {
    for (const f of lista) {
      const { url, ...daTenere } = f;
      try { await nelDbFoto('readwrite', (s) => s.put(daTenere)); } catch { /* resta solo in memoria */ }
      fotoInAttesa = fotoInAttesa.filter((x) => x.id !== f.id).concat({ ...f, url: url || URL.createObjectURL(f.piccola) });
    }
  }
  async function togliFotoInAttesa(id) {
    fotoInAttesa = fotoInAttesa.filter((x) => x.id !== id);
    try { await nelDbFoto('readwrite', (s) => s.delete(id)); } catch { /* era solo in memoria */ }
  }
  const codiciNuovi = () => { try { return JSON.parse(memoria.leggi(K_CODICI_NUOVI) || '{}') || {}; } catch { return {}; } };
  function segnaCodiceNuovo(idVoce, codice) {
    memoria.scrivi(K_CODICI_NUOVI, JSON.stringify({ ...codiciNuovi(), [idVoce]: codice }));
  }
  const codiceFoto = (f) => f.codice || codiciNuovi()[f.nuovo] || '';

  // Le immagini già viste stanno nel telefono sotto un indirizzo finto (non
  // si chiede mai alla rete: il service worker non c'entra).
  const indirizzoFoto = (id, mini) => `/gestione/foto/${encodeURIComponent(id)}${mini ? '-mini' : ''}.jpg`;
  const urlFoto = new Map(); // indirizzo → immagine pronta da mostrare
  const comeJpeg = (b) => new Response(b, { headers: { 'Content-Type': 'image/jpeg' } });
  async function tieniFoto(id, mini, blob) {
    try {
      const cassetto = await caches.open(CASSETTO_FOTO);
      await cassetto.put(indirizzoFoto(id, mini), comeJpeg(blob));
      const chiavi = await cassetto.keys();
      for (const k of chiavi.slice(0, Math.max(0, chiavi.length - MAX_FOTO_SALVATE))) await cassetto.delete(k);
    } catch { /* niente Cache: si riscarica */ }
  }
  // L'immagine di una foto del foglio: dal telefono se c'è, se no dal foglio.
  async function immagineFoto(id, mini) {
    const k = indirizzoFoto(id, mini);
    if (urlFoto.has(k)) return urlFoto.get(k);
    let blob = null;
    try { const r = await (await caches.open(CASSETTO_FOTO)).match(k); if (r) blob = await r.blob(); } catch { /* niente Cache */ }
    if (!blob) {
      const ferma = new AbortController();
      const timer = setTimeout(() => ferma.abort(), 30000);
      let res;
      try {
        res = await fetch(`${API}?foto=${encodeURIComponent(id)}${mini ? '&mini=1' : ''}`, { headers: { 'X-Chiave': chiave || '' }, cache: 'no-store', signal: ferma.signal });
        if (!res.ok) throw new Error(res.status === 404 ? 'Foto non trovata.' : 'La foto non si apre. Riprova tra poco.');
        blob = await res.blob();
      } catch (err) {
        throw err.name === 'AbortError' || err instanceof TypeError ? nientelinea() : err;
      } finally { clearTimeout(timer); }
      tieniFoto(id, mini, blob);
    }
    const u = URL.createObjectURL(blob);
    urlFoto.set(k, u);
    return u;
  }

  // Una foto scelta dal telefono, ridotta: il lato lungo a 1600 px (si legge
  // ancora la scritta su una cartuccia) e una miniatura da 400. JPEG anche
  // se era HEIC o PNG; il telefono la gira già per il verso giusto.
  async function riduciFoto(file) {
    const indirizzo = URL.createObjectURL(file);
    try {
      // onload e non decode(): decode() può restare appeso finché la pagina non si ridisegna.
      const img = new Image();
      await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('foto')); img.src = indirizzo; });
      const fai = (lato, qualita) => new Promise((ok, ko) => {
        const k = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
        const tela = document.createElement('canvas');
        tela.width = Math.max(1, Math.round(img.naturalWidth * k));
        tela.height = Math.max(1, Math.round(img.naturalHeight * k));
        const g = tela.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, tela.width, tela.height);
        g.drawImage(img, 0, 0, tela.width, tela.height);
        tela.toBlob((b) => (b ? ok(b) : ko(new Error('foto'))), 'image/jpeg', qualita);
      });
      return { grande: await fai(1600, 0.8), piccola: await fai(400, 0.7) };
    } finally {
      URL.revokeObjectURL(indirizzo);
    }
  }
  const nuovoIdFoto = () => `f${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const base64 = (blob) => new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = () => ko(r.error);
    r.readAsDataURL(blob);
  });

  // Manda le foto in attesa, una alla volta. Si ferma alla prima senza linea.
  // Una rifiutata dal foglio (cliente non più nel foglio) finisce fra le
  // «non arrivate»; un guasto del motore si riprova per tre giorni.
  let mandandoFoto = null;
  function mandaFoto() {
    if (mandandoFoto) return mandandoFoto;
    mandandoFoto = (async () => {
      let arrivate = 0;
      for (const f of [...fotoInAttesa]) {
        if (!chiave) break;
        const codice = codiceFoto(f);
        if (!codice) {
          // Il cliente nuovo è ancora in coda (o sta per avere il codice,
          // appena salvato col campo): la foto aspetta lui.
          if (leggiLista(K_CODA).some((v) => v.id === f.nuovo) || Date.now() - (f.quando || 0) < 60000) continue;
          scriviLista(K_NON_ARRIVATE, [...leggiLista(K_NON_ARRIVATE), { testo: `Foto di ${f.nome}`, errore: 'il cliente nuovo non è arrivato al foglio', quando: Date.now() }]);
          await togliFotoInAttesa(f.id);
          continue;
        }
        try {
          const r = await api('foto', { id: f.id, codice, descrizione: f.descrizione || '', grande: await base64(f.grande), piccola: await base64(f.piccola) }, 90000);
          // Tolta dal telefono mentre partiva: si toglie anche dal foglio.
          const ora = fotoInAttesa.find((x) => x.id === f.id);
          if (!ora) {
            manda('togliFoto', { id: f.id, codice }, `Foto tolta: ${f.nome}`).catch(() => {});
            continue;
          }
          // E la descrizione cambiata intanto.
          if ((ora.descrizione || '') !== (f.descrizione || '')) {
            r.foto.descrizione = ora.descrizione || '';
            manda('foto', { id: f.id, codice, descrizione: r.foto.descrizione }, `Descrizione di una foto: ${f.nome}`).catch(() => {});
          }
          // Già nel telefono: non si riscarica per vederla.
          urlFoto.set(indirizzoFoto(f.id, true), f.url);
          await tieniFoto(f.id, true, f.piccola);
          await tieniFoto(f.id, false, f.grande);
          fotoAppenaArrivate.push({ quando: Date.now(), foto: r.foto });
          if (dati) { dati.foto = (dati.foto || []).filter((x) => x.id !== f.id).concat(r.foto); salvaDati(); }
          await togliFotoInAttesa(f.id);
          arrivate++;
        } catch (err) {
          if (err.linea || err.chiave) break;
          if (err.stato >= 500 && Date.now() - (f.quando || 0) < 3 * 24 * 3600 * 1000) break;
          scriviLista(K_NON_ARRIVATE, [...leggiLista(K_NON_ARRIVATE), { testo: `Foto di ${f.nome}`, errore: err.message, quando: Date.now() }]);
          await togliFotoInAttesa(f.id);
        }
      }
      // I codici dei clienti nuovi che nessuna foto aspetta più.
      const servono = new Set(fotoInAttesa.map((f) => f.nuovo).filter(Boolean));
      const restano = Object.fromEntries(Object.entries(codiciNuovi()).filter(([k]) => servono.has(k)));
      if (Object.keys(restano).length) memoria.scrivi(K_CODICI_NUOVI, JSON.stringify(restano)); else memoria.togli(K_CODICI_NUOVI);
      return arrivate;
    })().catch(() => 0).finally(() => { mandandoFoto = null; });
    // Arrivate: via l'orologio dalle miniature (e dal riquadro in home).
    mandandoFoto.then((n) => {
      if (n && dati && $('finestra').hidden && !staiScrivendo() && ['cliente', 'home', 'giri'].includes((history.state || {}).s)) disegna(history.state);
    });
    return mandandoFoto;
  }
  // Prima la coda (i clienti nuovi prendono il codice), poi le foto.
  const mandaTutto = () => mandaCoda().then(() => mandaFoto()).catch(() => {});

  // Le foto di un cliente: quelle del foglio e, dopo, quelle ancora da mandare.
  function fotoDi(codice) {
    const delFoglio = ((dati && dati.foto) || []).filter((f) => f.codice === codice);
    const ancora = fotoInAttesa.filter((f) => codiceFoto(f) === codice && !delFoglio.some((x) => x.id === f.id))
      .map((f) => ({ id: f.id, codice, descrizione: f.descrizione || '', quando: '', chi: f.chi || '', attesa: true }));
    return [...delFoglio, ...ancora];
  }
  const urlMini = (f) => (f.attesa ? (fotoInAttesa.find((x) => x.id === f.id) || {}).url : urlFoto.get(indirizzoFoto(f.id, true)));

  // Il tasto «Aggiungi foto»: il telefono chiede se fotocamera o galleria.
  const tastoFoto = (id, testo = 'Aggiungi foto') => `<label class="btn tasto-foto">${icona('fotocamera')} ${testo}<input type="file" accept="image/*" multiple id="${id}"></label>`;
  const miniature = (lista, conTogli = false) => `<div class="foto-griglia">${lista.map((f) => {
    const u = f.url || urlMini(f);
    return `<div class="foto-mini${f.attesa ? ' attesa' : ''}">
      <button type="button" data-foto="${esc(f.id)}" aria-label="Apri la foto${f.descrizione ? ': ' + esc(f.descrizione) : ''}"><img alt="" data-mini="${esc(f.id)}"${u ? ` src="${u}"` : ''}></button>
      ${f.attesa ? `<span class="foto-orologio" title="Non ancora nel foglio">${icona('orologio')}</span>` : ''}
      ${f.descrizione ? `<span class="foto-desc">${esc(f.descrizione)}</span>` : ''}
      ${conTogli ? `<button type="button" class="foto-x" data-foto-togli="${esc(f.id)}" aria-label="Togli questa foto">×</button>` : ''}
    </div>`;
  }).join('')}</div>`;
  // Le miniature del foglio che il telefono non ha ancora: si scaricano.
  function riempiMiniature() {
    schermo.querySelectorAll('img[data-mini]:not([src])').forEach((img) => {
      immagineFoto(img.dataset.mini, true).then((u) => { img.src = u; }).catch(() => { img.closest('.foto-mini').classList.add('senza'); });
    });
  }

  // Le foto scelte: ridotte, poi «cosa si vede?» (facoltativo). `poi` riceve la lista.
  async function preparaFoto(files, poi) {
    const scelte = [...files].slice(0, 10);
    messaggio(scelte.length === 1 ? 'Preparo la foto…' : `Preparo ${scelte.length} foto…`, { durata: 60000 });
    const pronte = [];
    for (const file of scelte) {
      try {
        const { grande, piccola } = await riduciFoto(file);
        pronte.push({ id: nuovoIdFoto(), grande, piccola, url: URL.createObjectURL(piccola), descrizione: '' });
      } catch { /* una foto che il telefono non sa aprire */ }
    }
    $('messaggio').hidden = true;
    if (!pronte.length) { messaggio('Non riesco ad aprire questa foto. Prova a farla con la fotocamera.', { errore: true, durata: 8000 }); return; }
    chiediDescrizioni(pronte, poi);
    if (files.length > 10) messaggio('Al massimo 10 foto per volta: ho preso le prime 10.', { durata: 8000 });
    else if (pronte.length < scelte.length) messaggio(`${scelte.length - pronte.length} foto non si aprono: le altre sì.`, { errore: true, durata: 8000 });
  }
  function chiediDescrizioni(pronte, poi, { pulsante = '' } = {}) {
    apriFinestra(`
      <h3>Cosa si vede?</h3>
      <p>Facoltativo: due parole aiutano chi ci va dopo («sotto il lavello», «spazio per l'impianto», «rubinetto»).</p>
      <div class="foto-da-salvare">${pronte.map((f, i) => `
        <label class="foto-riga"><img src="${f.url}" alt=""><input data-desc="${i}" maxlength="200" placeholder="Cosa si vede?" value="${esc(f.descrizione)}"></label>`).join('')}</div>
      <button class="btn pieno grande" type="button" id="salva-foto">${icona('spunta')} ${esc(pulsante || (pronte.length === 1 ? 'Salva la foto' : `Salva le ${pronte.length} foto`))}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('salva-foto').onclick = () => {
      $('finestra').querySelectorAll('[data-desc]').forEach((x) => { pronte[+x.dataset.desc].descrizione = x.value.trim().replace(/\s+/g, ' ').slice(0, 200); });
      chiudiFinestra();
      poi(pronte);
    };
  }

  // Nella scheda del cliente: le miniature e «Aggiungi foto».
  function riquadroFoto(c) {
    const lista = fotoDi(c.codice);
    return `<h3 class="titoletto">Foto${lista.length ? ` (${lista.length})` : ''}</h3>
      ${lista.length ? miniature(lista) : '<p class="spiega">Lavello, sotto il lavello, impianto vecchio: così chi va a montare sa cosa serve.</p>'}
      ${tastoFoto('file-foto')}`;
  }
  function collegaFoto(c) {
    riempiMiniature();
    schermo.querySelectorAll('[data-foto]').forEach((b) => { b.onclick = () => apriFoto(c, b.dataset.foto); });
    const file = $('file-foto');
    if (!file) return;
    file.onchange = () => {
      const scelte = [...file.files];
      file.value = '';
      if (scelte.length) preparaFoto(scelte, (pronte) => aggiungiFoto(c, pronte));
    };
  }
  async function aggiungiFoto(c, pronte) {
    await mettiFotoInAttesa(pronte.map((f) => ({ ...f, codice: c.codice, nuovo: '', nome: c.nome, quando: Date.now(), chi: io() })));
    disegna(history.state);
    messaggio(pronte.length === 1 ? 'Foto salvata ✓' : `${pronte.length} foto salvate ✓`);
    mandaFoto();
  }

  // Una foto grande, con la sua descrizione, chi l'ha fatta, le frecce per
  // le altre del cliente, «Cambia la descrizione» e «Togli la foto».
  function apriFoto(c, id) {
    const lista = fotoDi(c.codice);
    const i = lista.findIndex((f) => f.id === id);
    if (i < 0) return;
    const f = lista[i];
    const attesa = f.attesa && fotoInAttesa.find((x) => x.id === f.id);
    const chi = [f.chi ? `Fatta ${daChi(f.chi)}` : 'Fatta', f.quando ? `il ${f.quando.replace(' ', ' alle ')}` : ''].filter(Boolean).join(' ');
    apriFinestra(`
      <div class="foto-vista"><img id="foto-grande" alt="${esc(f.descrizione || 'Foto')}"${urlMini(f) ? ` src="${urlMini(f)}"` : ''}></div>
      ${lista.length > 1 ? `<div class="foto-frecce">
        <button class="btn" type="button" id="foto-prima" aria-label="La foto prima"${i === 0 ? ' disabled' : ''}>${icona('frecciaSx')}</button>
        <span>${i + 1} di ${lista.length}</span>
        <button class="btn" type="button" id="foto-dopo" aria-label="La foto dopo"${i === lista.length - 1 ? ' disabled' : ''}>${icona('frecciaDx')}</button>
      </div>` : ''}
      ${f.descrizione ? `<p class="foto-testo"><strong>${esc(f.descrizione)}</strong></p>` : ''}
      <p class="foto-chi" id="foto-chi">${attesa ? 'Non ancora nel foglio: parte da sola appena c\'è campo.' : esc(chi)}</p>
      <button class="btn" type="button" id="foto-desc">${icona('matita')} ${f.descrizione ? 'Cambia la descrizione' : 'Scrivi cosa si vede'}</button>
      <button class="btn btn-rosso" type="button" id="foto-togli">${icona('cestino')} Togli la foto</button>
      <button class="btn leggero" type="button" id="foto-chiudi">Chiudi</button>`);
    const img = $('foto-grande');
    if (attesa) img.src = URL.createObjectURL(attesa.grande);
    else {
      immagineFoto(f.id, false).then((u) => { if (img.isConnected) img.src = u; }).catch((err) => {
        if (!img.isConnected) return;
        $('foto-chi').textContent = err.linea ? 'Senza campo: la foto grande si vede quando torna la linea.' : err.message;
        if (!img.getAttribute('src')) immagineFoto(f.id, true).then((u) => { if (img.isConnected) img.src = u; }).catch(() => {});
      });
    }
    if ($('foto-prima')) $('foto-prima').onclick = () => apriFoto(c, lista[i - 1].id);
    if ($('foto-dopo')) $('foto-dopo').onclick = () => apriFoto(c, lista[i + 1].id);
    $('foto-chiudi').onclick = chiudiFinestra;
    $('foto-desc').onclick = () => chiediDescrizioneFoto(c, f);
    $('foto-togli').onclick = (e) => conPulsante(e.currentTarget, 'Tolgo…', () => togliLaFoto(c, f));
  }

  function chiediDescrizioneFoto(c, f) {
    apriFinestra(`
      <h3>Cosa si vede?</h3>
      <label class="campo"><span>Descrizione <em>(facoltativa)</em></span><input id="foto-descrizione" maxlength="200" value="${esc(f.descrizione)}"></label>
      <button class="btn pieno grande" type="button" id="salva">${icona('spunta')} Salva</button>
      <button class="btn leggero" type="button" id="no">Torna alla foto</button>`);
    $('no').onclick = () => apriFoto(c, f.id);
    $('salva').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      const descrizione = $('foto-descrizione').value.trim().replace(/\s+/g, ' ').slice(0, 200);
      if (descrizione === f.descrizione) { apriFoto(c, f.id); return; }
      const attesa = fotoInAttesa.find((x) => x.id === f.id);
      if (attesa) {
        await mettiFotoInAttesa([{ ...attesa, descrizione }]);
      } else {
        try {
          const { r, voce } = await manda('foto', { id: f.id, codice: c.codice, descrizione }, `Descrizione di una foto: ${c.nome}`);
          if (r) APPLICA.foto(dati, { id: f.id, descrizione: r.foto.descrizione });
          salvaDati();
          if (voce) messaggio('Salvata.' + fuoriLinea(voce), { durata: 8000 });
        } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); return; }
      }
      apriFoto(c, f.id);
      disegna(history.state);
    });
  }

  // «Togli»: nel foglio la riga resta, segnata «Tolta il», e l'annulla la
  // rimette. Una ancora da mandare si toglie dal telefono e basta.
  async function togliLaFoto(c, f) {
    const attesa = fotoInAttesa.find((x) => x.id === f.id);
    if (attesa) {
      await togliFotoInAttesa(f.id);
      chiudiFinestra();
      disegna(history.state);
      messaggio('Foto tolta.', { azione: { testo: 'Annulla', fai: () => mettiFotoInAttesa([attesa]).then(() => { disegna(history.state); mandaFoto(); }) } });
      return;
    }
    const copia = { ...f };
    try {
      const { voce } = await manda('togliFoto', { id: f.id, codice: c.codice }, `Foto tolta: ${c.nome}`);
      if (!voce) APPLICA.togliFoto(dati, { id: f.id });
      salvaDati();
      chiudiFinestra();
      disegna(history.state);
      const annulla = async () => {
        if (voce && leggiLista(K_CODA).some((v) => v.id === voce.id)) {
          annullaInCoda(voce, () => APPLICA.rimettiFoto(dati, { id: f.id, foto: copia }));
          return;
        }
        try {
          const { r, voce: v2 } = await manda('rimettiFoto', { id: f.id, codice: c.codice, foto: copia }, `Foto rimessa: ${c.nome}`);
          if (r) APPLICA.rimettiFoto(dati, { id: f.id, foto: r.foto });
          salvaDati();
          disegna(history.state);
          messaggio('Foto rimessa.' + (r ? '' : fuoriLinea(v2)));
        } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
      };
      messaggio('Foto tolta.' + (voce ? fuoriLinea(voce) : ''), { azione: { testo: 'Annulla', fai: annulla }, durata: 8000 });
    } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
  }

  // Scheda di un cliente perso: solo i dati e i contatti, più "È tornato cliente".
  function schedaPerso(c) {
    const riga = (etichetta, valore) => (valore ? `<div><dt>${etichetta}</dt><dd>${esc(valore)}</dd></div>` : '');
    const indirizzoCompleto = [c.indirizzo, senzaCap(c.citta) ? c.citta : '', c.provincia].filter(Boolean).join(', ');
    schermo.innerHTML = `
      <div class="testa"><h2>${esc(c.nome)}</h2><p>${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', ') || 'Indirizzo non segnato')}</p></div>
      <div class="avviso-cliente grigio">
        <div><b>CLIENTE PERSO</b>${c.persoIl ? `<span>dal ${esc(c.persoIl)}</span>` : ''}<p>Non compare fra le manutenzioni.</p></div>
      </div>
      <div class="azioni">${pulsantiContatto(c.contatto, c.indirizzo || c.citta ? indirizzoCompleto : '') || ''}</div>
      <button class="btn verde grande" id="torna" style="width:100%">${icona('spunta')} È tornato cliente</button>
      <h3 class="titoletto">Dati del cliente</h3>
      <dl class="dati">
        ${riga('Impianto', c.tipo)}
        ${riga('Installato il', c.installazione)}
        ${riga('Ultima manutenzione prevista', c.prossima)}
        ${riga('Note / prezzo', c.note)}
        ${riga('Telefono / contatto', c.contatto)}
        ${riga('Codice', c.codice)}
      </dl>`;
    $('torna').onclick = () => chiediSposta(c, 'clienti');
  }

  // Spostare fra clienti e clienti persi (nel foglio: Clienti-Impianti ↔ Clienti-Persi).
  function chiediSposta(c, verso) {
    const persi = verso === 'persi';
    apriFinestra(`
      <h3>${persi ? 'Non è più nostro cliente?' : 'È tornato cliente?'}</h3>
      <p><strong>${esc(c.nome)}</strong><br>${persi
        ? 'Lo sposto fra i <strong>clienti persi</strong>: non comparirà più fra le manutenzioni, ma la sua scheda resta e lo puoi far tornare quando vuoi.'
        : 'Lo rimetto fra i clienti, con i suoi dati di prima.'}</p>
      <button class="btn ${persi ? 'pieno' : 'verde'} grande" type="button" id="si">${persi ? 'Sì, spostalo fra i persi' : `${icona('spunta')} Sì, rimettilo fra i clienti`}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('si').onclick = (e) => conPulsante(e.currentTarget, 'Sposto…', async () => {
      try {
        const { r, voce } = await manda('sposta', { codice: c.codice, verso }, `${persi ? 'Fra i clienti persi' : 'Di nuovo cliente'}: ${c.nome}`);
        if (r) await carica().catch(() => {});
        chiudiFinestra();
        disegna(history.state);
        messaggio((persi ? 'Spostato fra i clienti persi' : 'È di nuovo fra i clienti ✓') + (voce ? fuoriLinea(voce) : ''), {
          durata: 15000,
          azione: {
            testo: 'Annulla',
            fai: voce
              ? () => annullaInCoda(voce, () => APPLICA.sposta(dati, { codice: c.codice, verso: persi ? 'clienti' : 'persi' }))
              : () => api('sposta', r.annulla).then(() => carica()).then(() => { disegna(history.state); messaggio('Annullato.'); }).catch((err) => messaggio(err.message, { errore: true, durata: 8000 })),
          },
        });
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
  }

  // Sospendere (senza data) o segnare urgente (guasto), con un motivo
  // facoltativo. Il motore mette il giorno davanti al motivo.
  function chiediAvviso(c, avviso) {
    const urgente = avviso === 'Urgente';
    apriFinestra(`
      <h3>${urgente ? 'Guasto urgente?' : 'Sospendere la manutenzione?'}</h3>
      <p><strong>${esc(c.nome)}</strong><br>${urgente
        ? 'Lo metto fra gli <strong>urgenti</strong>, in cima alle manutenzioni scadute, finché non tocchi «Riparazione fatta» o «Fatto».'
        : 'Non comparirà più fra le scadute: lo trovi nella pagina <strong>Sospese</strong> finché non tocchi «Riattiva».'}</p>
      <label class="campo"><span>${urgente ? 'Che guasto c\'è?' : 'Perché?'} <em>(facoltativo)</em></span>
        <textarea id="motivo" placeholder="${urgente ? 'Es. perde acqua sotto il lavello' : 'Es. ha venduto casa, richiama lui'}"></textarea></label>
      <button class="btn ${urgente ? 'btn-rosso-pieno' : 'pieno'} grande" type="button" id="si">${icona(urgente ? 'allarme' : 'pausa')} ${urgente ? 'Sì, segna il guasto' : 'Sì, sospendi'}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      if (await salvaAvviso(c, avviso, $('motivo').value)) chiudiFinestra();
    });
  }

  async function salvaAvviso(c, avviso, motivo) {
    try {
      const prima = c.avviso;
      const testo = avviso === 'Urgente' ? 'Segnato guasto urgente' : avviso === 'Sospesa' ? 'Manutenzione sospesa'
        : prima === 'Urgente' ? 'Non più urgente ✓' : 'Riattivata ✓';
      // Il motivo parte già col giorno: se arriva dopo (senza campo) resta quello giusto.
      const m = String(motivo || '').replace(/\s+/g, ' ').trim();
      const motivoDatato = avviso ? [testoData(oggi()), m].filter(Boolean).join(' — ') : '';
      const ripristina = fotografia(c);
      const { r, voce } = await manda('avviso', { codice: c.codice, avviso, motivo: motivoDatato, esatto: true }, `${testo.replace(' ✓', '')}: ${c.nome}`);
      if (r) { c.avviso = r.avviso; c.motivo = r.motivo; }
      chiudiFinestra();
      disegna(history.state);
      messaggio(testo + (voce ? fuoriLinea(voce) : ''), {
        durata: 15000,
        azione: {
          testo: 'Annulla',
          fai: voce
            ? () => annullaInCoda(voce, ripristina)
            : () => api('avviso', r.annulla).then(() => carica()).then(() => { disegna(history.state); messaggio('Annullato.'); }).catch((err) => messaggio(err.message, { errore: true, durata: 8000 })),
        },
      });
      if (r) aggiornaInSottofondo();
      return true;
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      return false;
    }
  }

  // Il cliente al telefono dice "passate più avanti": un tocco sposta la
  // data. Si parte da oggi se è già scaduta, altrimenti dalla data prevista
  // (stessa regola del motore, in rimandaManutenzione). Si può annullare.
  function chiediRimanda(c) {
    const o = oggi();
    const base = c.prossimaSeriale != null && c.prossimaSeriale > serialeOggi() ? daSeriale(c.prossimaSeriale) : o;
    const scelte = [1, 2, 3, 6];
    const domani = daSeriale(serialeOggi() + 1);
    apriFinestra(`
      <h3>Rimandare la manutenzione?</h3>
      <p><strong>${esc(c.nome)}</strong><br>${c.prossima ? `Adesso è segnata il <strong>${esc(c.prossima)}</strong>.` : ''} Di quanto la sposto?</p>
      <div class="lista">${scelte.map((m) => `
        <button class="btn" type="button" data-mesi="${m}" style="justify-content:space-between">
          <span>Di ${m === 1 ? '1 mese' : m + ' mesi'}</span><span style="color:var(--grigio);font-weight:600">${testoData(piuMesi(base, m))}</span>
        </button>`).join('')}</div>
      <div id="altro-giorno" hidden>
        <label class="campo" style="margin-top:14px"><span>A che giorno?</span>
          <input type="date" id="giorno" min="${isoDa(domani)}"></label>
        <button class="btn pieno grande" type="button" id="si-giorno">${icona('orologio')} Rimanda a quel giorno</button>
      </div>
      <button class="btn" type="button" id="altro">Scelgo io il giorno</button>
      <button class="btn" type="button" id="sospendi">${icona('pausa')} Sospendi, senza data</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('sospendi').onclick = () => chiediAvviso(c, 'Sospesa');
    // Si manda sempre la data esatta (quella che si vede qui), mai «di N
    // mesi»: arrivata due volte, non sposta la manutenzione di nuovo.
    const rimanda = (btn, giorno) => conPulsante(btn, 'Salvo…', async () => {
      try {
        const ripristina = fotografia(c);
        const { r, voce } = await manda('rimanda', { codice: c.codice, data: isoDa(giorno) }, `Rimandata al ${testoData(giorno)}: ${c.nome}`);
        chiudiFinestra();
        if (r) {
          const x = r.prossima.split('/');
          c.prossima = r.prossima;
          c.prossimaSeriale = serialeDa(+x[2], +x[1], +x[0]);
        }
        disegna(history.state);
        messaggio(`Rimandata al ${c.prossima}` + (voce ? fuoriLinea(voce) : ''), {
          durata: 15000,
          azione: { testo: 'Annulla', fai: voce ? () => annullaInCoda(voce, ripristina) : () => annulla(r.annulla, c, ripristina) },
        });
        if (r) aggiornaInSottofondo();
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
    $('finestra').querySelectorAll('[data-mesi]').forEach((b) => { b.onclick = () => rimanda(b, piuMesi(base, +b.dataset.mesi)); });
    $('altro').onclick = () => { $('altro-giorno').hidden = false; $('altro').hidden = true; $('giorno').focus(); };
    $('si-giorno').onclick = (e) => {
      if (!daIso($('giorno').value)) { messaggio('Scegli prima il giorno.', { errore: true }); return; }
      rimanda(e.currentTarget, daIso($('giorno').value));
    };
    $('no').onclick = chiudiFinestra;
  }

  function chiediFatta(c) {
    if (!c.frequenza) {
      const f = apriFinestra(`
        <h3>Ogni quanti mesi va fatta?</h3>
        <p>Per <strong>${esc(c.nome)}</strong> non è segnato. Lo scrivo io nel foglio.</p>
        <div class="scelta"><button type="button" data-mesi="6">Ogni 6 mesi</button><button type="button" data-mesi="12">Ogni 12 mesi</button></div>
        <button class="btn leggero" type="button" id="lascia">Lascia stare</button>`);
      f.querySelectorAll('[data-mesi]').forEach((b) => { b.onclick = () => confermaFatta(c, +b.dataset.mesi); });
      $('lascia').onclick = chiudiFinestra;
      return;
    }
    confermaFatta(c, null);
  }

  // «Come ha pagato?» (19 ott 2026, Matteo) sta nella stessa finestra: la
  // risposta toccata è anche il «sì, fatta». Così resta un tocco solo.
  function confermaFatta(c, frequenzaNuova) {
    const mesi = c.frequenza || frequenzaNuova;
    const o = oggi();
    const f = apriFinestra(`
      <h3>Manutenzione fatta oggi?</h3>
      <p><strong>${esc(c.nome)}</strong><br>La prossima sarà il <strong id="anteprima">${testoData(piuMesi(o, mesi))}</strong></p>
      <div id="altro-giorno" hidden>
        <label class="campo"><span>Che giorno l'hai fatta?</span>
          <input type="date" id="giorno" max="${isoDa(o)}" value="${isoDa(o)}"></label>
      </div>
      <p class="domanda">Come ha pagato?</p>
      ${PAGAMENTI.map(([v, t]) => `<button class="btn ${v === DA_RISENTIRE ? 'arancio' : 'verde'}" type="button" data-pag="${esc(v)}">${icona(icoPagamento(v))} ${esc(t)}</button>`).join('')}
      <button class="btn" type="button" id="altro">L'ho fatta un altro giorno</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    let giorno = null;
    $('altro').onclick = () => {
      $('altro-giorno').hidden = false;
      $('altro').hidden = true;
      $('giorno').focus();
      aggiornaGiorno();
    };
    function aggiornaGiorno() {
      const g = daIso($('giorno').value);
      if (!g) return;
      giorno = g;
      $('anteprima').textContent = testoData(piuMesi(g, mesi));
      f.querySelector('h3').textContent = `Manutenzione fatta il ${dataLunga(g)}?`;
    }
    $('giorno').onchange = aggiornaGiorno;
    $('no').onclick = chiudiFinestra;
    f.querySelectorAll('[data-pag]').forEach((b) => { b.onclick = (e) => salva(e.currentTarget, b.dataset.pag); });
    const salva = (btn, pagamento) => conPulsante(btn, 'Salvo…', async () => {
      try {
        // Lo schermo torna com'era: il cliente e lo storico del telefono.
        const ripristinaCliente = fotografia(c);
        const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
        const ripristina = () => {
          ripristinaCliente();
          dati.storico = (dati.storico || []).filter((s) => !(s.codice === c.codice && s.riga == null));
          dati.tappe = fotoTappe;
        };
        // Sempre col giorno: se parte domani (senza campo) resta quello di oggi.
        const fattaIl = giorno || oggi();
        const datiFatta = { codice: c.codice, data: isoDa(fattaIl), frequenza: frequenzaNuova || undefined, pagamento };
        const { r, voce } = await manda('fatta', datiFatta, `Manutenzione fatta il ${testoData(fattaIl)}: ${c.nome}`);
        chiudiFinestra();
        if (r) {
          // Aggiorna subito lo schermo, poi rilegge il foglio in sottofondo.
          const x = r.prossima.split('/');
          c.prossima = r.prossima;
          c.prossimaSeriale = serialeDa(+x[2], +x[1], +x[0]);
          if (frequenzaNuova) c.frequenza = frequenzaNuova;
          // Il motore toglie sospesa/urgente e «chi ci va» quando la manutenzione è fatta.
          c.avviso = '';
          c.motivo = '';
          c.chiVa = '';
          if (!r.giaSegnata) nelloStorico(dati, datiFatta, c);
          chiudiTappe(dati, c.codice, fattaIl);
          salvaDati();
        }
        disegna(history.state);
        // Senza «Annulla» solo se il foglio l'aveva già segnata (richiesta doppia).
        const puoiAnnullare = voce || (r && r.annulla);
        const annullaFatta = voce ? () => annullaInCoda(voce, ripristina) : () => annulla(r.annulla, c, ripristina);
        // Poi i materiali usati (dal 20 ott 2026); il messaggio con «Annulla»
        // arriva quando quella finestra si chiude, e annulla tutte e due.
        const avvisa = (mov) => {
          disegna(history.state);
          messaggio(`Segnata ✓ ${breve(pagamento)} · Prossima: ${c.prossima}` + (mov ? ` · ${mov.testo}` : '') + (voce ? fuoriLinea(voce) : ''), {
            durata: 15000,
            azione: puoiAnnullare || mov ? { testo: 'Annulla', fai: async () => { if (mov) await annullaMovimento(mov, { zitto: puoiAnnullare }); if (puoiAnnullare) annullaFatta(); } } : null,
          });
        };
        if (r) aggiornaInSottofondo();
        if (mag()) chiediMateriali({ codice: c.codice, nome: c.nome, lavoro: 'Manutenzione', data: fattaIl, dopo: avvisa });
        else avvisa(null);
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
  }

  // ---------------------------------------------------------------------
  //  Urgenti e guasti: cosa è stato fatto (21 ott 2026)
  // ---------------------------------------------------------------------
  // Matteo: «se il cliente ha un guasto conta come ho fatto il lavoro? Non è
  // molto chiaro», e «le cose urgenti possono essere anche semplici
  // manutenzioni di gente che ha fretta». Prima «Risolto» toglieva solo il
  // segno rosso e un guasto riparato non restava da nessuna parte. Ora il
  // «Fatto» di un urgente e il «Fatto» di una tappa Guasto chiedono cosa è
  // stato fatto: la manutenzione («Manutenzione fatta», la prossima si
  // sposta), solo una riparazione (negli Interventi fatti col pagamento e i
  // materiali, la prossima manutenzione resta: segnaRiparazione nel motore)
  // o niente (si toglie solo il segno, o si chiude solo la tappa).
  function chiediCosaHaiFatto(c, { tappa = null } = {}) {
    const mo = leggiMotivo(c);
    const mesi = c.frequenza ? `${c.frequenza} mesi` : 'sei o dodici mesi';
    apriFinestra(`
      <h3>Cosa hai fatto?</h3>
      <p><strong>${esc(c.nome)}</strong>${c.avviso === 'Urgente' && mo.perche ? `<br>${esc(mo.perche)}` : ''}</p>
      <button class="btn verde scelta-lavoro" type="button" id="fatta-manutenzione">${icona('spunta')}<span>La manutenzione<small>Anche se c'era un guasto. La prossima si sposta di ${esc(mesi)}.</small></span></button>
      <button class="btn pieno scelta-lavoro" type="button" id="fatta-riparazione">${icona('attrezzi')}<span>Solo una riparazione<small>La prossima manutenzione resta ${c.prossima ? `il ${esc(c.prossima)}` : 'com\'è'}.</small></span></button>
      ${tappa ? `<button class="btn scelta-lavoro" type="button" id="fatta-niente"><span>Niente: chiudi solo la tappa</span></button>`
        : `<button class="btn scelta-lavoro" type="button" id="fatta-niente"><span>Niente: togli solo «urgente»<small>Per esempio si è risolto al telefono.</small></span></button>`}
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('fatta-manutenzione').onclick = () => chiediFatta(c);
    $('fatta-riparazione').onclick = () => confermaRiparazione(c);
    $('fatta-niente').onclick = (e) => {
      if (tappa) { chiudiFinestra(); segnaTappaFatta(tappa, { soloTappa: true }); return; }
      conPulsante(e.currentTarget, 'Salvo…', () => salvaAvviso(c, '', ''));
    };
    $('no').onclick = chiudiFinestra;
  }

  // «Riparazione fatta» nella scheda (26 ott 2026, Matteo): verde come
  // «Manutenzione fatta», c'è solo se è segnato un guasto urgente, e prima
  // chiede se è stata fatta anche la manutenzione ordinaria. Sì = la solita
  // «Manutenzione fatta» (la prossima si sposta e il guasto si chiude), no =
  // solo la riparazione (la data della prossima resta).
  function chiediAncheManutenzione(c) {
    const mo = leggiMotivo(c);
    const mesi = c.frequenza ? `${c.frequenza} mesi` : 'sei o dodici mesi';
    apriFinestra(`
      <h3>È stata fatta anche la manutenzione ordinaria?</h3>
      <p><strong>${esc(c.nome)}</strong>${mo.perche ? `<br>${esc(mo.perche)}` : ''}</p>
      <button class="btn verde scelta-lavoro" type="button" id="anche-si">${icona('spunta')}<span>Sì, anche la manutenzione<small>La prossima si sposta di ${esc(mesi)}.</small></span></button>
      <button class="btn pieno scelta-lavoro" type="button" id="anche-no">${icona('attrezzi')}<span>No, solo la riparazione<small>La prossima manutenzione resta ${c.prossima ? `il ${esc(c.prossima)}` : 'com\'è'}.</small></span></button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('anche-si').onclick = () => chiediFatta(c);
    $('anche-no').onclick = () => confermaRiparazione(c);
    $('no').onclick = chiudiFinestra;
  }

  // Un guasto riparato senza la manutenzione: come ha pagato (la risposta
  // è anche il «sì»), poi i materiali, come per «Manutenzione fatta».
  function confermaRiparazione(c) {
    const o = oggi();
    const f = apriFinestra(`
      <h3>Riparazione fatta oggi?</h3>
      <p><strong>${esc(c.nome)}</strong><br>Va negli interventi fatti. La prossima manutenzione resta ${c.prossima ? `il <strong>${esc(c.prossima)}</strong>` : 'com\'è'}.</p>
      <div id="altro-giorno" hidden>
        <label class="campo"><span>Che giorno l'hai fatta?</span>
          <input type="date" id="giorno" max="${isoDa(o)}" value="${isoDa(o)}"></label>
      </div>
      <p class="domanda">Come ha pagato?</p>
      ${PAGAMENTI.map(([v, t]) => `<button class="btn ${v === DA_RISENTIRE ? 'arancio' : 'verde'}" type="button" data-pag="${esc(v)}">${icona(icoPagamento(v))} ${esc(t)}</button>`).join('')}
      <button class="btn" type="button" id="altro">L'ho fatta un altro giorno</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    let giorno = null;
    const aggiornaGiorno = () => {
      const g = daIso($('giorno').value);
      if (!g) return;
      giorno = g;
      f.querySelector('h3').textContent = `Riparazione fatta il ${dataLunga(g)}?`;
    };
    $('altro').onclick = () => { $('altro-giorno').hidden = false; $('altro').hidden = true; $('giorno').focus(); aggiornaGiorno(); };
    $('giorno').onchange = aggiornaGiorno;
    $('no').onclick = chiudiFinestra;
    const salva = (btn, pagamento) => conPulsante(btn, 'Salvo…', async () => {
      try {
        const fotoCliente = fotografia(c);
        const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
        const fotoStorico = (dati.storico || []).slice();
        const ripristina = () => { fotoCliente(); dati.tappe = fotoTappe; dati.storico = fotoStorico; };
        const fattaIl = giorno || oggi();
        const d = { codice: c.codice, data: isoDa(fattaIl), pagamento };
        const { r, voce } = await manda('riparazione', d, `Riparazione fatta il ${testoData(fattaIl)}: ${c.nome}`);
        chiudiFinestra();
        if (r && !r.giaSegnata) { APPLICA.riparazione(dati, d); salvaDati(); }
        disegna(history.state);
        const puoiAnnullare = voce || (r && r.annulla);
        const annullaRiparazione = voce ? () => annullaInCoda(voce, ripristina)
          : () => manda('annullaRiparazione', r.annulla, `Annulla la riparazione: ${c.nome}`)
            .then(({ r: r2, voce: v2 }) => {
              ripristina();
              salvaDati();
              disegna(history.state);
              messaggio('Annullato.' + (v2 ? fuoriLinea(v2) : ''));
              if (r2) aggiornaInSottofondo();
            })
            .catch((err) => messaggio(err.message, { errore: true, durata: 8000 }));
        const avvisa = (mov) => {
          disegna(history.state);
          messaggio(`Riparazione segnata ✓ ${breve(pagamento)}` + (mov ? ` · ${mov.testo}` : '') + (voce ? fuoriLinea(voce) : ''), {
            durata: 15000,
            azione: puoiAnnullare || mov ? { testo: 'Annulla', fai: async () => { if (mov) await annullaMovimento(mov, { zitto: puoiAnnullare }); if (puoiAnnullare) annullaRiparazione(); } } : null,
          });
        };
        if (r) aggiornaInSottofondo();
        if (mag()) chiediMateriali({ codice: c.codice, nome: c.nome, lavoro: 'Guasto', data: fattaIl, dopo: avvisa });
        else avvisa(null);
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
    f.querySelectorAll('[data-pag]').forEach((b) => { b.onclick = (e) => salva(e.currentTarget, b.dataset.pag); });
  }

  // Annulla di «fatta» o «rimanda» già arrivate al foglio. Senza campo va
  // in coda anche lui, e lo schermo torna subito com'era.
  async function annulla(datiAnnulla, c, ripristina) {
    try {
      const { voce } = await manda('annulla', datiAnnulla, `Annulla la data nuova: ${c ? c.nome : datiAnnulla.codice}`);
      if (voce) {
        if (ripristina) { ripristina(); salvaDati(); }
        disegna(history.state);
        messaggio('Annullato.' + fuoriLinea(voce));
        return;
      }
      messaggio('Annullato: la data è tornata com\'era.');
      await carica();
      disegna(history.state);
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
    }
  }

  // ---------------------------------------------------------------------
  //  Giro del giorno
  // ---------------------------------------------------------------------
  // Il giro di ognuno, giorno per giorno (19 ott 2026, Matteo: «i clienti
  // che decido di fare io e quelli del babbo, e un pulsante per spostarli
  // dalla mia alla sua lista e viceversa»; 20 ott: «anche lavori che non
  // sono le manutenzioni scadute, tipo un guasto, una nuova installazione,
  // un sopralluogo, e nel giro gli orari»). Oggi comprende anche le tappe
  // rimaste dai giorni prima, finché non si fanno o si tolgono.
  function schermoGiri(stato) {
    titolo('Giro del giorno', true);
    const o = serialeOggi();
    const ser = serialeGiorno(stato.giorno) ?? o;
    const giorno = testoGiorno(ser);
    const g = daSeriale(ser);
    const nomeGiorno = ser === o ? 'Oggi' : ser === o + 1 ? 'Domani' : ser === o - 1 ? 'Ieri'
      : `${GIORNI[new Date(Date.UTC(g.a, g.m - 1, g.g)).getUTCDay()]} ${g.g} ${MESI[g.m - 1]}`;
    const fatte = (dati.tappe || []).filter((t) => t.stato === 'Fatta' && giornoDi(t) === giorno);
    // Le manutenzioni segnate quel giorno senza una tappa (dallo storico).
    const fatteSenzaTappa = interventi().filter((x) => x.data === giorno && !fatte.some((t) => t.codice === x.codice));
    const sezione = (p) => {
      const tappe = giroDi(p, giorno);
      const mio = p === giroPrincipale();
      return `
        <div class="testa-giro"><h2 class="gruppo">${esc(giroDiNome(p))} (${tappe.length})</h2>
          ${tappe.length ? `<button class="link" type="button" data-svuota="${esc(p)}">Svuota</button>` : ''}</div>
        ${tappe.length ? `<div class="lista">${tappe.map((t, i) => voceTappa(t, i, p)).join('')}</div>
          <a class="btn${mio ? ' pieno' : ''} apri-giro" href="${esc(linkGiro(tappe))}" target="_blank" rel="noopener">${icona('mappa')} Apri il giro di ${esc(nomeChi(p))} in Google Maps</a>`
        : `<div class="vuoto">Nessuna tappa nel giro di ${esc(nomeChi(p))}.</div>`}`;
    };
    // I giri di chi ha il giro, più quello di chi l'ha perso ma ha ancora
    // tappe quel giorno (se no sparirebbero).
    const sezioni = [...ordineGiri(), ...new Set(tappeDel(giorno).map((t) => t.chi).filter((p) => p && !giranti().includes(p)))];
    schermo.innerHTML = `
      <div class="giorni">
        <button class="btn" type="button" data-giorno="${ser - 1}" aria-label="Il giorno prima">${icona('frecciaSx')}</button>
        <div class="giorno-scelto"><b>${esc(nomeGiorno)}</b><small>${esc(giorno)}</small></div>
        <button class="btn" type="button" data-giorno="${ser + 1}" aria-label="Il giorno dopo">${icona('frecciaDx')}</button>
      </div>
      <div class="vai-giorno">
        ${ser !== o ? `<button class="link" type="button" data-giorno="${o}">Torna a oggi</button>` : '<span></span>'}
        <label>Vai al giorno <input type="date" id="vai-giorno" value="${isoDa(g)}"></label>
      </div>
      <button class="btn pieno" id="nuova-tappa" type="button" style="width:100%;margin:12px 0 4px">${icona('piu')} Aggiungi una tappa</button>
      <p class="spiega">Le tappe con l'ora vanno in fila per ora; le altre si infilano dove allungano meno il giro, mai prima di un appuntamento entro le 10 (${ordineGiri().map((p) => `quello di ${esc(nomeChi(p))} parte da ${esc(partenzaDi(p).nome)}`).join(', ')}).</p>
      ${sezioni.map(sezione).join('')}
      ${fatte.length || fatteSenzaTappa.length ? `<h2 class="gruppo">Fatte ${ser === o ? 'oggi' : 'quel giorno'} (${fatte.length + fatteSenzaTappa.length})</h2>
        <div class="lista">${fatte.map(voceFatta).join('')}${fatteSenzaTappa.map((x) => voceIntervento(x)).join('')}</div>` : ''}`;
    const vaiAl = (s) => { history.replaceState({ s: 'giri', giorno: testoGiorno(s) }, '', location.pathname + location.hash); disegna(history.state); };
    schermo.querySelectorAll('[data-giorno]').forEach((b) => { b.onclick = () => vaiAl(+b.dataset.giorno); });
    $('vai-giorno').onchange = (e) => { const d = daIso(e.target.value); if (d) vaiAl(serialeDa(d.a, d.m, d.g)); };
    $('nuova-tappa').onclick = () => chiediCosaAlGiro(giorno);
    schermo.querySelectorAll('[data-svuota]').forEach((b) => { b.onclick = () => chiediSvuota(b.dataset.svuota, giorno); });
    collegaTappe({});
    collegaInterventi();
    schermo.querySelectorAll('[data-lavoro-fatto]').forEach((b) => {
      b.onclick = () => { const t = (dati.tappe || []).find((x) => x.id === b.dataset.lavoroFatto); if (t) chiediLavoroFatto(t); };
    });
  }

  // Un lavoro fatto, toccato nel Giro del giorno (21 ott 2026, Matteo: «il
  // lavoro che non riesco a cancellare lo vedo in giro del giorno»): cos'era,
  // i materiali, la scheda e «Cancella questo lavoro» (stesso permesso degli
  // interventi). Il motore (cancellaLavoro) cancella anche l'intervento che
  // quel «Fatto» aveva scritto, se c'è: il primo dello stesso cliente e tipo
  // dal giorno della tappa in poi (come interventoDellaTappa qui).
  function interventoDellaTappa(t) {
    if (!t.codice || !['Manutenzione', 'Guasto'].includes(t.lavoro)) return null;
    const dal = serialeGiorno(giornoDi(t));
    return (dati.storico || [])
      .filter((x) => x.codice === t.codice && (x.lavoro === 'Guasto' ? 'Guasto' : 'Manutenzione') === t.lavoro
        && serialeGiorno(x.data) != null && (dal == null || serialeGiorno(x.data) >= dal))
      .sort((a, b) => serialeGiorno(a.data) - serialeGiorno(b.data))[0] || null;
  }
  // I materiali di una tappa senza intervento: del primo giorno con dei materiali dal giorno della tappa.
  function materialiTappa(t) {
    const dal = serialeGiorno(giornoDi(t));
    const suoi = (mag() ? mag().movimenti || [] : []).filter((m) => m.causale === CAUSALI_MAG.lavoro && stessoLavoro(m.lavoro, t.lavoro || 'Altro')
      && (t.codice ? m.cliente === t.codice : !m.cliente && normalizza(m.nome) === normalizza(t.nome))
      && serialeGiorno(m.data) != null && (dal == null || serialeGiorno(m.data) >= dal));
    if (!suoi.length) return '';
    const primo = Math.min(...suoi.map((m) => serialeGiorno(m.data)));
    return suoi.filter((m) => serialeGiorno(m.data) === primo).map((m) => `${numeroIt(-m.quantita)} × ${m.descrizione}`).join(', ');
  }
  // «Installazione fatta», «Sopralluogo fatto».
  const fattoA = (lavoro) => (['Manutenzione', 'Installazione'].includes(lavoro) ? 'fatta' : 'fatto');
  function chiediLavoroFatto(t) {
    const l = luogoTappa(t);
    const x = interventoDellaTappa(t);
    const usati = x ? materialiDi(x.codice, x.data, x.lavoro) : materialiTappa(t);
    const apri = (t.codice && clienteIn(dati, t.codice)) || (t.contatto && leadDaChiave(t.contatto));
    apriFinestra(`
      <h3>${esc(l.nome)}</h3>
      <p>${esc(t.lavoro || 'Altro')} ${fattoA(t.lavoro)}${t.chi ? ` ${esc(daChi(t.chi))}` : ''}, nel giro del ${esc(giornoDi(t))}.${x ? `<br>Negli interventi fatti: ${esc(tipoIntervento(x).toLowerCase())} del <strong>${esc(x.data)}</strong>, ${esc(x.pagamento ? breve(x.pagamento) : 'pagamento non segnato')}.` : ''}</p>
      ${usati ? `<p>Materiali: ${esc(usati)}</p>` : ''}
      ${apri ? '<button class="btn" type="button" id="apri-lavoro">Apri la scheda</button>' : ''}
      ${puo('cancellaInterventi') ? `<button class="btn btn-rosso" type="button" id="cancella-lavoro">${icona('cestino')} Cancella questo lavoro</button>` : ''}
      <button class="btn leggero" type="button" id="no">Chiudi</button>`);
    $('no').onclick = chiudiFinestra;
    if ($('apri-lavoro')) $('apri-lavoro').onclick = () => apriTappa(t);
    if ($('cancella-lavoro')) $('cancella-lavoro').onclick = () => chiediCancellaLavoro(t, x, usati);
  }
  function chiediCancellaLavoro(t, x, usati) {
    const torna = x ? scadenzaSeCancello(x) : null;
    apriFinestra(`
      <h3>Cancellare questo lavoro?</h3>
      <p><strong>${esc(luogoTappa(t).nome)}</strong> · ${esc(t.lavoro || 'Altro')}${t.chi ? `, ${fattoA(t.lavoro)} ${esc(daChi(t.chi))}` : ''}. Sparisce dai lavori fatti del giro${x ? ' e dagli interventi fatti (nel foglio ne resta una copia)' : ''}.</p>
      ${torna != null ? `<p>Quella manutenzione aveva spostato la prossima al <strong>${esc(x.prossima)}</strong>. Se non è stata fatta davvero, rimettila al <strong>${esc(testoGiorno(torna))}</strong>.</p>` : ''}
      ${usati ? `<p>I materiali segnati (${esc(usati)}) tornano in magazzino.</p>` : ''}
      ${bottoniCancella(x, torna)}
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('finestra').querySelectorAll('[data-cancella]').forEach((b) => {
      b.onclick = (e) => conPulsante(e.currentTarget, 'Cancello…', () => cancellaIlLavoro(t, x, b.dataset.cancella === 'si'));
    });
  }
  async function cancellaIlLavoro(t, x, rimetti) {
    let r;
    try {
      r = await api('cancellaLavoro', { id: t.id, rimetti });
    } catch (err) {
      messaggio(err.linea ? 'Per cancellare serve il campo. Riprova quando c\'è linea.' : err.message, { errore: true, durata: 8000 });
      return;
    }
    const c = t.codice && clienteIn(dati, t.codice);
    const fotoC = c ? fotografia(c) : null;
    const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
    const fotoStorico = (dati.storico || []).slice();
    const via = new Set([t.id, ...(r.tappe || [])]);
    dati.tappe = (dati.tappe || []).filter((y) => !via.has(y.id));
    if (r.intervento && x) dati.storico = (dati.storico || []).filter((s) => s !== x);
    if (c && r.prossima) { const g = String(r.prossima).split('/'); conProssima(c, { g: +g[0], m: +g[1], a: +g[2] }); }
    salvaDati();
    chiudiFinestra();
    disegna(history.state);
    aggiornaInSottofondo(); // il magazzino coi pezzi tornati
    messaggio(dopoCancellato(luogoTappa(t).nome, r), {
      durata: 12000,
      azione: {
        testo: 'Annulla',
        fai: () => api('annullaCancellaLavoro', r.annulla)
          .then(() => {
            dati.tappe = fotoTappe;
            dati.storico = fotoStorico;
            if (fotoC) fotoC();
            salvaDati();
            disegna(history.state);
            aggiornaInSottofondo();
            messaggio('Annullato: il lavoro è tornato.');
          })
          .catch((err) => messaggio(err.linea ? 'Senza campo non si annulla: riprova fra poco.' : err.message, { errore: true, durata: 8000 })),
      },
    });
  }

  // Una tappa: tocchi il nome e apri la scheda; sotto, «Fatto», passarla
  // all'altro («A Stefano», «A Matteo») e cambiarla (giorno, ora, lavoro, togli).
  function voceTappa(t, i, p) {
    const l = luogoTappa(t);
    const c = l.cliente;
    const s = c ? scadenza(c) : null;
    const posto = [l.indirizzo, titoloCitta(l.citta)].filter(Boolean).join(', ');
    const mio = p === giroPrincipale();
    // A chi si può passare: il mio giro prima, poi gli altri (di solito uno solo).
    const verso = ordineGiri().filter((q) => q !== p).slice(0, 2);
    const rimasta = (serialeGiorno(giornoDi(t)) ?? 0) < serialeOggi();
    const etichette = [
      etichettaLavoro(t),
      c && c.avviso === 'Urgente' ? '<span class="etichetta rosso">Urgente</span>' : '',
      c && t.lavoro === 'Manutenzione' && !c.avviso ? `<span class="etichetta ${s.classe}">${esc(s.testo)}</span>` : '',
      !c && t.contatto ? '<span class="etichetta grigio">Contatto</span>' : '',
      // Le foto del sopralluogo: si vede dal giro che ci sono (26 ott 2026).
      c && fotoDi(c.codice).length ? `<span class="etichetta blu">${icona('fotocamera')} ${fotoDi(c.codice).length} foto</span>` : '',
      rimasta ? `<span class="etichetta arancio">${esc(quandoTappa(t, false))}</span>` : '',
      l.lat == null ? '<span class="etichetta grigio">Non è sulla mappa</span>' : '',
    ].join('');
    return `<div class="tappa">
      <button class="voce" type="button" data-tappa-apri="${esc(t.id)}">
        <b><span class="numero${mio ? '' : ' suo'}">${i + 1}</span>${t.ora ? `<span class="ora">${esc(orarioTappa(t))}</span>` : ''}${esc(l.nome)}</b>
        <span class="riga2">${esc(posto || '—')}${c && c.tipo ? ' · ' + esc(c.tipo) : ''}</span>
        <span class="riga3">${etichette}</span>
        ${t.note ? `<span class="riga2 nota-tappa">${esc(t.note)}</span>` : ''}
      </button>
      <div class="tappa-azioni${verso.length === 1 ? '' : verso.length ? ' piu-passa' : ' senza-passa'}">
        <button class="btn" type="button" data-tappa-fatta="${esc(t.id)}">${icona('spunta')} Fatto</button>
        ${verso.map((q) => `<button class="btn" type="button" data-tappa-passa="${esc(t.id)}" data-a="${esc(q)}">${icona(q === io() ? 'frecciaSu' : 'frecciaGiu')} A ${esc(nomeChi(q))}</button>`).join('')}
        <button class="btn" type="button" data-tappa-cambia="${esc(t.id)}" aria-label="Cambia la tappa">${icona('matita')}</button>
      </div>
    </div>`;
  }
  function voceFatta(t) {
    const l = luogoTappa(t);
    return `<button class="voce" type="button" data-lavoro-fatto="${esc(t.id)}">
      <b>${esc(l.nome)}</b>
      <span class="riga2">${esc(t.lavoro || 'Altro')} · fatta ${esc(daChi(t.chi))}</span>
      <span class="riga3"><span class="etichetta verde">Fatto ✓</span></span>
    </button>`;
  }

  // Nella scheda del cliente o del contatto: in quali giri è, e il tasto per aggiungerlo.
  function riquadroTappe(lista) {
    return `<div class="tappe-scheda">
      ${lista.map((t) => `<div class="tappa-riga">
        <span>${icona('cartina')} Nel giro di ${esc(nomeChi(t.chi))} ${esc(quandoTappa(t))} · ${esc(t.lavoro || 'Altro')}</span>
        <button class="link" type="button" data-tappa-cambia="${esc(t.id)}">Cambia</button>
      </div>`).join('')}
      <button class="btn" type="button" id="al-giro" style="width:100%">${icona('cartina')} ${lista.length ? 'Aggiungi un\'altra tappa' : 'Aggiungi al giro'}</button>
    </div>`;
  }

  const leadDaChiave = (k) => dati.lead.find((l) => chiaveLead(l) === k);
  function apriLeadDaChiave(k) {
    const l = leadDaChiave(k);
    if (l) vai({ s: 'schedaLead', id: idLead(l) });
    else messaggio('Questo contatto non c\'è più fra i contatti.', { errore: true });
  }
  function apriTappa(t) {
    if (!t) return;
    if (t.codice && clienteIn(dati, t.codice)) vai({ s: 'cliente', codice: t.codice });
    else if (t.contatto && leadDaChiave(t.contatto)) apriLeadDaChiave(t.contatto);
    else chiediTappa({ tappa: t });
  }
  // Più di 10 tappe in un giorno Google Maps non le apre.
  function troppe(chi, giorno, id) {
    if (tappeDel(giorno, chi).filter((t) => t.id !== id).length < MAX_TAPPE) return false;
    messaggio(`Il giro di ${nomeChi(chi)} di quel giorno ha già ${MAX_TAPPE} tappe: Google Maps non ne apre di più.`, { errore: true, durata: 8000 });
    return true;
  }

  // «Fatto»: una manutenzione passa dalla solita domanda (data, pagamento),
  // che chiude anche la tappa; gli altri lavori si segnano fatti e basta.
  function segnaTappaFatta(t, { soloTappa = false } = {}) {
    const c = t.codice && clienteIn(dati, t.codice);
    if (!soloTappa && c && t.lavoro === 'Manutenzione' && !c.perso) { chiediFatta(c); return; }
    // Un guasto: manutenzione, riparazione o niente (21 ott 2026).
    if (!soloTappa && c && t.lavoro === 'Guasto' && !c.perso) { chiediCosaHaiFatto(c, { tappa: t }); return; }
    salvaLaTappa({ ...t, giorno: giornoDi(t), stato: 'Fatta' }, `Fatto ✓ ${t.lavoro || 'Lavoro'}: ${luogoTappa(t).nome}`, {
      materiali: { codice: c ? c.codice : '', nome: luogoTappa(t).nome, lavoro: t.lavoro || 'Altro', data: oggi() },
    });
  }

  // I tasti delle tappe (pagina dei giri, scheda del cliente o del contatto).
  function collegaTappe(perAggiungere) {
    const trova = (id) => (dati.tappe || []).find((t) => t.id === id);
    schermo.querySelectorAll('[data-tappa-apri]').forEach((b) => { b.onclick = () => apriTappa(trova(b.dataset.tappaApri)); });
    schermo.querySelectorAll('[data-tappa-cambia]').forEach((b) => { b.onclick = () => { const t = trova(b.dataset.tappaCambia); if (t) chiediTappa({ tappa: t }); }; });
    schermo.querySelectorAll('[data-tappa-fatta]').forEach((b) => { b.onclick = () => { const t = trova(b.dataset.tappaFatta); if (t) segnaTappaFatta(t); }; });
    schermo.querySelectorAll('[data-tappa-passa]').forEach((b) => {
      b.onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
        const t = trova(b.dataset.tappaPassa);
        const a = b.dataset.a;
        if (!t || troppe(a, giornoDi(t), t.id)) return;
        await salvaLaTappa({ ...t, giorno: giornoDi(t), chi: a }, `Passata a ${nomeChi(a)}: ${luogoTappa(t).nome}`);
      });
    });
    if ($('al-giro')) $('al-giro').onclick = () => chiediTappa(perAggiungere);
  }

  // «Aggiungi una tappa» dalla pagina dei giri: si cerca il cliente o il
  // contatto, oppure si scrive un indirizzo qualsiasi.
  function chiediCosaAlGiro(giorno) {
    apriFinestra(`
      <h3>Chi vai a trovare?</h3>
      <label class="campo"><span>Cerca un cliente o un contatto</span>
        <input id="cerca-tappa" autocomplete="off" placeholder="Nome, città o telefono"></label>
      <div class="lista" id="trovati-tappa"></div>
      <button class="btn" type="button" id="indirizzo-libero">${icona('mappa')} Un altro indirizzo</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    const mostra = () => {
      const q = normalizza($('cerca-tappa').value);
      const el = $('trovati-tappa');
      if (q.length < 2) { el.innerHTML = ''; return; }
      const cifre = q.replace(/\D/g, '');
      const combacia = (testo) => normalizza(testo).includes(q) || (cifre.length >= 5 && String(testo).replace(/\D/g, '').includes(cifre));
      const cl = dati.clienti.filter((c) => combacia([c.nome, c.citta, c.indirizzo, c.contatto, c.codice].join(' '))).slice(0, 6);
      const le = dati.lead.filter((l) => statoLead(l) !== 'Cliente' && combacia([l.nome, l.contatto, l.note].join(' '))).slice(0, 4);
      el.innerHTML = cl.map((c) => `<button class="voce" type="button" data-scelto-cliente="${esc(c.codice)}"><b>${esc(c.nome)}</b><span class="riga2">Cliente · ${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', ') || '—')}</span></button>`).join('')
        + le.map((l) => `<button class="voce" type="button" data-scelto-lead="${esc(chiaveLead(l))}"><b>${esc(l.nome || 'Senza nome')}</b><span class="riga2">Contatto · ${esc(ETICHETTE_STATO[statoLead(l)] || statoLead(l))}</span></button>`).join('')
        || '<div class="vuoto">Nessuno con questo nome. Puoi scrivere «Un altro indirizzo».</div>';
      el.querySelectorAll('[data-scelto-cliente]').forEach((b) => { b.onclick = () => chiediTappa({ cliente: clienteIn(dati, b.dataset.sceltoCliente), giorno }); });
      el.querySelectorAll('[data-scelto-lead]').forEach((b) => { b.onclick = () => chiediTappa({ lead: leadDaChiave(b.dataset.sceltoLead), giorno }); });
    };
    $('cerca-tappa').oninput = mostra;
    $('indirizzo-libero').onclick = () => chiediTappa({ giorno });
    $('no').onclick = chiudiFinestra;
    $('cerca-tappa').focus();
  }

  // Aggiungere o cambiare una tappa: di chi, che lavoro, quando, a che ora.
  // Per un contatto o un indirizzo qualsiasi anche nome e indirizzo (la
  // posizione la cerca il telefono su OpenStreetMap, se c'è campo).
  function chiediTappa({ tappa = null, cliente = null, lead = null, giorno = null } = {}) {
    const t0 = tappa;
    const c = cliente || (t0 && t0.codice && clienteIn(dati, t0.codice)) || null;
    const l = lead || (t0 && t0.contatto && leadDaChiave(t0.contatto)) || null;
    const libero = !c;
    const s = c && scadenza(c);
    let lavoro = t0 ? (t0.lavoro || 'Altro')
      : c ? (c.avviso === 'Urgente' ? 'Guasto' : s.giorni != null && s.giorni <= 60 ? 'Manutenzione' : 'Altro')
        : l ? 'Sopralluogo' : 'Altro';
    let chi = t0 && giranti().includes(t0.chi) ? t0.chi : giroPrincipale();
    const o = serialeOggi();
    let ser = Math.max(serialeGiorno(t0 ? giornoDi(t0) : giorno || oggiTesto()) ?? o, o);
    const cittaLead = l ? ((String(l.note || '').match(/Città:\s*([^—]+)/) || [])[1] || '').trim() : '';
    const v = (x) => esc(x || '');
    const persone = ordineGiri();
    apriFinestra(`
      <h3>${t0 ? 'Cambia la tappa' : 'Aggiungi al giro'}</h3>
      ${c ? `<p><strong>${esc(c.nome)}</strong><br>${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', ') || 'Indirizzo non segnato')}</p>` : ''}
      ${persone.length > 1 ? `<p class="domanda">Nel giro di</p>
        <div class="scelta scelta-chi" id="t-chi">${persone.map((p) => `<button type="button" data-v="${esc(p)}" aria-pressed="${chi === p}">${esc(nomeChi(p))}</button>`).join('')}</div>` : ''}
      <p class="domanda">Che lavoro</p>
      <div class="pillole pillole-lavoro" id="t-lavoro">${LAVORI.map((x) => `<button type="button" class="pillola" data-v="${x}" aria-pressed="${lavoro === x}">${x}</button>`).join('')}</div>
      <p class="domanda">Quando</p>
      <div class="scelta scelta-giorno" id="t-giorno">
        <button type="button" data-v="${o}" aria-pressed="${ser === o}">Oggi</button>
        <button type="button" data-v="${o + 1}" aria-pressed="${ser === o + 1}">Domani</button>
        <button type="button" data-v="altro" aria-pressed="${ser > o + 1}">Altro giorno</button>
      </div>
      <input class="campo-data" type="date" id="t-data" min="${isoDa(daSeriale(o))}" value="${isoDa(daSeriale(ser))}" ${ser > o + 1 ? '' : 'hidden'}>
      <p class="domanda">Orario <em>(facoltativo)</em></p>
      <div class="orari">
        <label class="campo"><span>Alle, o dalle</span><input type="time" id="t-ora" value="${v(t0 && t0.ora)}"></label>
        <label class="campo"><span>Fino alle</span><input type="time" id="t-ora-fine" value="${v(t0 && t0.oraFine)}"></label>
      </div>
      <p class="spiega">Con l'ora la tappa va in fila per ora. Se il cliente dà una fascia («fra le 9 e le 11»), scrivi anche fino a che ora; se no lascia vuoto «Fino alle».</p>
      ${libero ? `
        <label class="campo"><span>Nome</span><input id="t-nome" autocapitalize="words" value="${v((t0 && t0.nome) || (l && l.nome))}"></label>
        <label class="campo"><span>Indirizzo</span><input id="t-indirizzo" value="${v(t0 && t0.indirizzo)}" placeholder="Via e numero"></label>
        <label class="campo"><span>Città</span><input id="t-citta" value="${v((t0 && t0.citta) || cittaLead)}"></label>
        <label class="campo"><span>Telefono <em>(facoltativo)</em></span><input id="t-tel" inputmode="tel" value="${v((t0 && t0.telefono) || (l && l.contatto))}"></label>` : ''}
      <label class="campo"><span>Note <em>(facoltative)</em></span><input id="t-note" value="${v(t0 && t0.note)}" placeholder="Es. citofono, cosa portare"></label>
      <button class="btn pieno grande" type="button" id="t-salva">${icona('cartina')} ${t0 ? 'Salva' : 'Metti nel giro'}</button>
      ${t0 ? '<button class="btn btn-rosso" type="button" id="t-togli">Togli dal giro</button>' : ''}
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    const scegli = (id, fai) => {
      $(id).querySelectorAll('[data-v]').forEach((b) => {
        b.onclick = () => { $(id).querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); fai(b.dataset.v); };
      });
    };
    if ($('t-chi')) scegli('t-chi', (x) => { chi = x; });
    scegli('t-lavoro', (x) => { lavoro = x; });
    scegli('t-giorno', (x) => {
      if (x === 'altro') { $('t-data').hidden = false; const d = daIso($('t-data').value); if (d) ser = Math.max(serialeDa(d.a, d.m, d.g), o); $('t-data').focus(); return; }
      ser = +x; $('t-data').hidden = true;
    });
    $('t-data').onchange = (e) => { const d = daIso(e.target.value); if (d) ser = Math.max(serialeDa(d.a, d.m, d.g), o); };
    $('no').onclick = chiudiFinestra;
    if ($('t-togli')) $('t-togli').onclick = (e) => conPulsante(e.currentTarget, 'Tolgo…', async () => { chiudiFinestra(); await togliLaTappa(t0); });
    $('t-salva').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      const nuovo = {
        id: t0 ? t0.id : nuovoId(), giorno: testoGiorno(ser), ora: $('t-ora').value, oraFine: $('t-ora-fine').value, chi, lavoro,
        codice: c ? c.codice : '', contatto: l ? chiaveLead(l) : (t0 && t0.contatto) || '',
        nome: c ? c.nome : $('t-nome').value.replace(/\s+/g, ' ').trim(),
        indirizzo: c ? c.indirizzo : $('t-indirizzo').value.trim(), citta: c ? c.citta : $('t-citta').value.trim(),
        telefono: c ? '' : $('t-tel').value.trim(), note: $('t-note').value.replace(/\s+/g, ' ').trim(),
        lat: t0 && !c ? t0.lat : null, lng: t0 && !c ? t0.lng : null, stato: '',
      };
      if (!nuovo.nome) { messaggio('Scrivi il nome.', { errore: true }); return; }
      if (nuovo.oraFine && !nuovo.ora) { messaggio('Scrivi anche da che ora: la fascia comincia da lì.', { errore: true }); return; }
      if (nuovo.oraFine && nuovo.oraFine <= nuovo.ora) { messaggio('«Fino alle» deve venire dopo l\'ora d\'inizio.', { errore: true }); return; }
      if (nuovo.oraFine === nuovo.ora) nuovo.oraFine = '';
      if (libero && !nuovo.indirizzo && !nuovo.citta) { messaggio('Scrivi almeno la città: se no non so dove andare.', { errore: true }); return; }
      if (troppe(chi, nuovo.giorno, nuovo.id)) return;
      // Contatto o indirizzo qualsiasi: dove sta lo cerca il telefono (al
      // massimo 8 secondi; senza campo la tappa resta fuori dalla mappa).
      const cambiato = !t0 || t0.indirizzo !== nuovo.indirizzo || t0.citta !== nuovo.citta;
      if (libero && (cambiato || nuovo.lat == null)) {
        const p = await Promise.race([
          cercaPosizione({ indirizzo: nuovo.indirizzo, citta: nuovo.citta, provincia: '' }).catch(() => null),
          new Promise((ok) => setTimeout(() => ok(null), 8000)),
        ]);
        if (p && p.lat != null) { nuovo.lat = p.lat; nuovo.lng = p.lng; } else if (cambiato) { nuovo.lat = null; nuovo.lng = null; }
      }
      chiudiFinestra();
      await salvaLaTappa(nuovo, `Nel giro di ${nomeChi(chi)} ${quandoTappa(nuovo)}: ${nuovo.nome}`);
    });
  }

  // ---------------------------------------------------------------------
  //  Interventi fatti (storico) e pagamenti
  // ---------------------------------------------------------------------
  // Dalla scheda Storico-Interventi del foglio: una voce per ogni
  // «Manutenzione fatta», dalla più recente, con come ha pagato. Un
  // intervento si riconosce da codice + data (19 ott 2026, Matteo: «una voce
  // per vedere lo storico degli interventi fatti, e come hanno pagato»).
  const interventi = () => (dati.storico || []).slice()
    .sort((a, b) => quandoFatto(b) - quandoFatto(a) || (b.riga || Infinity) - (a.riga || Infinity));
  const idIntervento = (x) => `${x.codice}|${x.data}|${x.lavoro || ''}`;
  // Lavoro "Guasto" nello storico = una riparazione senza manutenzione (21 ott 2026).
  const tipoIntervento = (x) => (x.lavoro === 'Guasto' ? 'Riparazione' : 'Manutenzione');
  // conNome: nella pagina degli interventi; senza, nella scheda del cliente.
  function voceIntervento(x, conNome = true) {
    const riga2 = conNome ? [`${tipoIntervento(x)} del ${x.data}`, x.chi && daChi(x.chi)] : [tipoIntervento(x), x.chi && `fatta ${daChi(x.chi)}`];
    const usati = materialiDi(x.codice, x.data, x.lavoro);
    return `<button class="voce" data-intervento="${esc(idIntervento(x))}">
      <b>${esc(conNome ? x.nome || x.codice : x.data)}</b>
      ${riga2.filter(Boolean).length ? `<span class="riga2">${esc(riga2.filter(Boolean).join(' · '))}</span>` : ''}
      ${usati ? `<span class="riga2">${icona('scatola')} ${esc(usati)}</span>` : ''}
      <span class="riga3">${etichettaPagamento(x.pagamento)}</span>
    </button>`;
  }
  function collegaInterventi() {
    schermo.querySelectorAll('[data-intervento]').forEach((b) => {
      b.onclick = () => {
        const x = (dati.storico || []).find((s) => idIntervento(s) === b.dataset.intervento);
        if (x) chiediPagamento(x);
      };
    });
  }

  function schermoStorico(stato) {
    titolo('Interventi fatti', true);
    const tutti = interventi();
    // Da risentire: chi aspetta da più tempo in cima.
    const pagare = tutti.filter((x) => x.pagamento === DA_RISENTIRE).reverse();
    const filtro = stato.filtro === 'pagare' ? 'pagare' : 'tutti';
    const lista = filtro === 'pagare' ? pagare : tutti;
    // A gruppi per mese: «Ottobre 2026 (12)».
    const gruppi = [];
    for (const x of lista) {
      const m = String(x.data).match(/\d{1,2}\/(\d{1,2})\/(\d{4})/);
      const nome = m ? `${MESI[+m[1] - 1]} ${m[2]}` : 'Senza data';
      if (!gruppi.length || gruppi[gruppi.length - 1].nome !== nome) gruppi.push({ nome, voci: [] });
      gruppi[gruppi.length - 1].voci.push(x);
    }
    schermo.innerHTML = `
      <div class="pillole">
        <button class="pillola" data-filtro="tutti" aria-pressed="${filtro === 'tutti'}">Tutti (${tutti.length})</button>
        <button class="pillola${pagare.length ? ' pillola-rossa' : ''}" data-filtro="pagare" aria-pressed="${filtro === 'pagare'}">Da risentire (${pagare.length})</button>
      </div>
      ${filtro === 'pagare' && pagare.length ? '<p class="spiega">Da risentire per il pagamento: hanno avuto un intervento ma non hanno ancora pagato. Quando pagano, tocca il nome e scegli come.</p>' : ''}
      ${gruppi.map((g) => `<h2 class="gruppo">${esc(g.nome)} (${g.voci.length})</h2><div class="lista">${g.voci.map((x) => voceIntervento(x)).join('')}</div>`).join('')
        || `<div class="vuoto">${filtro === 'pagare' ? 'Nessuno da risentire per il pagamento 👍' : 'Ancora nessun intervento segnato.<br><br>Ogni volta che tocchi «Manutenzione fatta» o «Riparazione fatta» nella scheda di un cliente, compare qui con come ha pagato.'}</div>`}`;
    schermo.querySelectorAll('[data-filtro]').forEach((b) => {
      b.onclick = () => { history.replaceState({ s: 'storico', filtro: b.dataset.filtro }, '', location.pathname + location.hash); disegna(history.state); };
    });
    collegaInterventi();
  }

  // Un intervento toccato: com'è andata, e si cambia il pagamento (chi era
  // «da risentire» e poi paga, o un pagamento segnato sbagliato).
  function chiediPagamento(x) {
    const c = clienteIn(dati, x.codice);
    const tel = c && x.pagamento === DA_RISENTIRE ? telefoni(c.contatto)[0] : null;
    const f = apriFinestra(`
      <h3>${esc(x.nome || x.codice)}</h3>
      <p>${tipoIntervento(x)} del <strong>${esc(x.data)}</strong>${x.chi ? `, fatta ${esc(daChi(x.chi))}` : ''}.<br>Pagamento: <strong>${esc(x.pagamento ? breve(x.pagamento) : 'non segnato')}</strong></p>
      ${tel ? `<a class="btn pieno" href="tel:${esc(tel.tel)}">${icona('telefono')} Chiama ${esc(tel.mostra)}</a>` : ''}
      <p class="domanda">Come ha pagato?</p>
      ${PAGAMENTI.map(([v, t]) => `<button class="btn${v === x.pagamento ? ' scelto' : ''}" type="button" data-pag="${esc(v)}">${v === x.pagamento ? `${icona('spunta')} ` : ''}${esc(t)}</button>`).join('')}
      ${mag() ? `<p class="domanda">Materiali usati</p>
        <p>${esc(materialiDi(x.codice, x.data, x.lavoro) || 'Nessuno segnato.')}</p>
        <button class="btn" type="button" id="materiali-intervento">${icona('scatola')} ${materialiDi(x.codice, x.data, x.lavoro) ? 'Cambia i materiali' : 'Segna materiali usati'}</button>` : ''}
      ${c && !(history.state && history.state.s === 'cliente' && history.state.codice === x.codice) ? '<button class="btn" type="button" id="apri-scheda">Apri la scheda del cliente</button>' : ''}
      ${puo('cancellaInterventi') ? `<button class="btn btn-rosso" type="button" id="cancella-intervento">${icona('cestino')} Cancella questo intervento</button>` : ''}
      <button class="btn leggero" type="button" id="no">Chiudi</button>`);
    f.querySelectorAll('[data-pag]').forEach((b) => {
      b.onclick = (e) => (b.dataset.pag === x.pagamento ? chiudiFinestra() : conPulsante(e.currentTarget, 'Salvo…', () => salvaPagamento(x, b.dataset.pag)));
    });
    if ($('apri-scheda')) $('apri-scheda').onclick = () => vai({ s: 'cliente', codice: x.codice });
    if ($('cancella-intervento')) $('cancella-intervento').onclick = () => chiediCancellaIntervento(x);
    if ($('materiali-intervento')) $('materiali-intervento').onclick = () => chiediMaterialiIntervento(x);
    $('no').onclick = chiudiFinestra;
  }

  // Cancellare un intervento (21 ott 2026, Matteo: lui, babbo e la
  // segretaria sì, un dipendente no: il permesso «cancellaInterventi» degli
  // Accessi, che il motore ricontrolla). Nel foglio resta una copia, nella
  // scheda «Interventi-Cancellati». Se è stato lui a spostare la prossima
  // manutenzione, si può rimetterla dov'era prima (come fa il motore: la
  // «Scadenza prima» scritta dal 21 ott 2026, se no la scadenza
  // dell'intervento prima, se no il giorno dell'intervento).
  // Serve il campo: non va in coda, perché è una cosa che non si fa di fretta.
  function scadenzaSeCancello(x) {
    const c = clienteIn(dati, x.codice);
    const sua = serialeGiorno(x.prossima);
    if (!c || c.perso || sua == null || c.prossimaSeriale !== sua) return null;
    const altre = (dati.storico || []).filter((s) => s !== x && s.codice === x.codice).map((s) => serialeGiorno(s.prossima)).filter((n) => n != null);
    if (altre.some((n) => n >= sua)) return null;
    if (serialeGiorno(x.prima) != null) return serialeGiorno(x.prima);
    return altre.length ? Math.max(...altre) : serialeGiorno(x.data);
  }
  function chiediCancellaIntervento(x) {
    const torna = scadenzaSeCancello(x);
    const usati = materialiDi(x.codice, x.data, x.lavoro);
    apriFinestra(`
      <h3>Cancellare questo intervento?</h3>
      <p>${tipoIntervento(x)} del <strong>${esc(x.data)}</strong> a <strong>${esc(x.nome || x.codice)}</strong>${x.chi ? `, fatta ${esc(daChi(x.chi))}` : ''}. Sparisce dagli interventi fatti; nel foglio ne resta una copia.</p>
      ${torna != null ? `<p>Questo intervento aveva spostato la prossima manutenzione al <strong>${esc(x.prossima)}</strong>. Se non è stato fatto davvero, rimettila al <strong>${esc(testoGiorno(torna))}</strong>.</p>` : ''}
      ${usati ? `<p>I materiali segnati (${esc(usati)}) tornano in magazzino.</p>` : ''}
      ${bottoniCancella(x, torna)}
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('finestra').querySelectorAll('[data-cancella]').forEach((b) => {
      b.onclick = (e) => conPulsante(e.currentTarget, 'Cancello…', () => cancellaLIntervento(x, b.dataset.cancella === 'si'));
    });
  }
  // «Cancella e rimetti al …» / «Cancella e lascia il …», o solo «Sì, cancella».
  const bottoniCancella = (x, torna) => (torna != null
    ? `<button class="btn btn-rosso-pieno" type="button" data-cancella="si">${icona('cestino')} Cancella e rimetti al ${esc(testoGiorno(torna))}</button>
        <button class="btn btn-rosso" type="button" data-cancella="no">Cancella e lascia il ${esc(x.prossima)}</button>`
    : `<button class="btn btn-rosso-pieno" type="button" data-cancella="no">${icona('cestino')} Sì, cancella</button>`);
  // Il messaggio dopo una cancellazione: i pezzi tornati e la scadenza.
  const dopoCancellato = (nome, r) => `Cancellato: ${nome}`
    + (r.materiali ? ` · ${pezziTesto(r.materiali)} ${r.materiali === 1 ? 'tornato' : 'tornati'} in magazzino` : '')
    + (r.materialiNo ? ' · i materiali no: rimettili dalla scheda del cliente' : '')
    + (r.prossima ? `. Prossima manutenzione al ${r.prossima}` : '');
  async function cancellaLIntervento(x, rimetti) {
    let r;
    try {
      r = await api('cancellaIntervento', { riga: x.riga, codice: x.codice, data: x.data, rimetti });
    } catch (err) {
      messaggio(err.linea ? 'Per cancellare serve il campo. Riprova quando c\'è linea.' : err.message, { errore: true, durata: 8000 });
      return;
    }
    const c = clienteIn(dati, x.codice);
    const fotoC = c ? fotografia(c) : null;
    const fotoTappe = JSON.parse(JSON.stringify(dati.tappe || []));
    dati.storico = (dati.storico || []).filter((s) => s !== x);
    dati.tappe = (dati.tappe || []).filter((t) => !(r.tappe || []).includes(t.id));
    if (c && r.prossima) { const g = String(r.prossima).split('/'); conProssima(c, { g: +g[0], m: +g[1], a: +g[2] }); }
    salvaDati();
    chiudiFinestra();
    disegna(history.state);
    aggiornaInSottofondo(); // il magazzino coi pezzi tornati
    messaggio(`${dopoCancellato(x.nome || x.codice, r)}`, {
      durata: 12000,
      azione: {
        testo: 'Annulla',
        fai: () => api('annullaCancellazione', r.annulla)
          .then(() => {
            dati.storico = [...(dati.storico || []), x];
            dati.tappe = fotoTappe;
            if (fotoC) fotoC();
            salvaDati();
            disegna(history.state);
            aggiornaInSottofondo();
            messaggio('Annullato: l\'intervento è tornato.');
          })
          .catch((err) => messaggio(err.linea ? 'Senza campo non si annulla: riprova fra poco.' : err.message, { errore: true, durata: 8000 })),
      },
    });
  }

  async function salvaPagamento(x, pagamento) {
    const prima = x.pagamento || '';
    // Col lavoro: una manutenzione e una riparazione lo stesso giorno sono due.
    const quale = { codice: x.codice, data: x.data, lavoro: x.lavoro || '' };
    const metti = (p) => { APPLICA.pagamento(dati, { ...quale, pagamento: p }); salvaDati(); };
    try {
      const { r, voce } = await manda('pagamento', { riga: x.riga, ...quale, pagamento }, `Pagamento (${breve(pagamento)}): ${x.nome || x.codice}`);
      if (r) metti(r.pagamento);
      chiudiFinestra();
      disegna(history.state);
      messaggio(`Segnato: ${breve(pagamento)}` + (voce ? fuoriLinea(voce) : ''), {
        durata: 10000,
        azione: {
          testo: 'Annulla',
          fai: voce
            ? () => annullaInCoda(voce, () => APPLICA.pagamento(dati, { ...quale, pagamento: prima }))
            : () => manda('pagamento', r.annulla, `Pagamento rimesso com'era: ${x.nome || x.codice}`)
              .then(({ r: r2 }) => { if (r2) metti(prima); disegna(history.state); messaggio('Annullato.'); })
              .catch((err) => messaggio(err.message, { errore: true, durata: 8000 })),
        },
      });
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
    }
  }

  // ---------------------------------------------------------------------
  //  Impostazioni: chi usa l'app e cosa può fare (21 ott 2026)
  // ---------------------------------------------------------------------
  // Solo per Matteo (il motore manda gli accessi solo a lui, e solo lui li
  // può cambiare). Una persona per ogni chiave dell'app: il nome con cui
  // l'app la chiama e i permessi, scritti nella scheda «Accessi» del foglio.
  // Una persona nuova (un dipendente) arriva con una chiave nuova, e qui
  // compare da sola con i permessi di base: il giro sì, cancellare no.
  function schermoImpostazioni() {
    titolo('Impostazioni', true);
    if (!dati.titolare || !dati.accessi) {
      schermo.innerHTML = '<div class="vuoto">Le impostazioni le vede solo Matteo.</div>';
      return;
    }
    const elenco = dati.elencoPermessi || [];
    schermo.innerHTML = `
      <p class="spiega">Le vedi solo tu. Per ognuno scegli come lo chiama l'app e cosa può fare. Vale subito; sugli altri telefoni si vede alla prossima apertura dell'app.</p>
      ${dati.accessi.map((a) => `
        <form class="riquadro-accesso" data-persona="${esc(a.persona)}">
          <h2 class="gruppo">${esc(a.nome)}${a.persona === io() ? ' (tu)' : ''}</h2>
          <label class="campo"><span>Nome nell'app</span>
            <input name="nome" value="${esc(a.nome)}" autocapitalize="words" maxlength="30" required></label>
          ${a.titolare ? '<p class="spiega">Sei il titolare: puoi fare tutto e solo tu vedi le impostazioni.</p>'
            : elenco.map((p) => `<div class="permesso">
              <span><b>${esc(p.nome)}</b><small>${esc(p.spiega)}</small></span>
              <div class="scelta scelta-si-no" data-permesso="${esc(p.id)}">
                <button type="button" data-v="si" aria-pressed="${!!a[p.id]}">Sì</button>
                <button type="button" data-v="no" aria-pressed="${!a[p.id]}">No</button>
              </div>
            </div>`).join('')}
          <button class="btn pieno" type="submit">${icona('spunta')} Salva ${esc(a.nome)}</button>
        </form>`).join('')}
      <p class="spiega">Per dare l'app a una persona nuova serve un codice di attivazione nuovo: si prepara dal PC. Appena c'è, la persona compare qui.</p>`;
    schermo.querySelectorAll('.riquadro-accesso').forEach((f) => {
      f.querySelectorAll('[data-permesso]').forEach((g) => {
        g.querySelectorAll('[data-v]').forEach((b) => {
          b.onclick = () => g.querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
      });
      f.onsubmit = (e) => {
        e.preventDefault();
        const permessi = {};
        f.querySelectorAll('[data-permesso]').forEach((g) => { permessi[g.dataset.permesso] = g.querySelector('[data-v="si"]').getAttribute('aria-pressed') === 'true'; });
        conPulsante(f.querySelector('[type=submit]'), 'Salvo…', () => salvaAccesso({ persona: f.dataset.persona, nome: f.nome.value.trim(), permessi }));
      };
    });
  }
  async function salvaAccesso(scelta, testo) {
    let r;
    try {
      r = await api('accessi', scelta);
    } catch (err) {
      messaggio(err.linea ? 'Per cambiare le impostazioni serve il campo.' : err.message, { errore: true, durata: 8000 });
      return;
    }
    const a = r.accesso;
    dati.accessi = dati.accessi.map((x) => (x.persona === a.persona ? a : x));
    dati.nomi = { ...(dati.nomi || {}), [a.persona]: a.nome };
    dati.persone = dati.accessi.filter((x) => x.giro).map((x) => x.persona);
    salvaDati();
    disegna(history.state);
    messaggio(testo || `Salvato: ${a.nome}`, testo ? {} : { durata: 10000, azione: { testo: 'Annulla', fai: () => salvaAccesso(r.annulla, 'Rimesso com\'era.') } });
  }

  // ---------------------------------------------------------------------
  //  Magazzino (20 ott 2026)
  // ---------------------------------------------------------------------
  // Matteo: «questo è il file del magazzino, creane uno migliore nel
  // gestionale e fai in modo che le quantità si aggiornino anche dall'app:
  // quando si fa un lavoro si devono poter inserire le quantità dei
  // materiali usati». Gli articoli stanno nella scheda "Magazzino" del
  // foglio, ogni cambio in "Movimenti-Magazzino" (vedi muoviMagazzino in
  // _shared/gestionale.mjs). Dopo «Manutenzione fatta» e dopo «Fatto» di una
  // tappa l'app chiede che materiali sono stati usati; nella pagina
  // Magazzino si segna la merce arrivata, si corregge un numero contato, si
  // aggiunge un articolo.
  const mag = () => (dati && dati.magazzino) || null;
  const articoliMag = () => (mag() ? mag().articoli : []);
  const articoloDa = (k) => articoliMag().find((a) => a.codice === k);
  const CAUSALI_MAG = { carico: 'Arrivata merce', lavoro: 'Usato in un lavoro', tolto: 'Tolto', correzione: 'Contati', ordinato: 'Ordinato al fornitore', venduto: 'Venduto, da montare' };
  const CAUSALE_MONTATO = 'Montato';
  const arrotonda = (n) => Math.round(n * 100) / 100;
  const numeroIt = (n) => String(arrotonda(n)).replace('.', ',');
  // «In consegna» (ordinati al fabbricante) e «Da montare» (venduti a un
  // cliente), dal 21 ott 2026: il totale disponibile è quelli che ci sono,
  // più quelli in arrivo, meno quelli già venduti, e «da riordinare» si guarda
  // lì (Matteo: «così da sapere quando fare l'ordine»). `numeri` = il foglio
  // ha già quelle colonne (dopo aggiornaMagazzino).
  const numeriMag = () => !!(mag() && mag().numeri);
  // I costi d'acquisto: solo a chi ha il permesso (22 ott 2026; il motore agli altri non li manda).
  const vedeCosti = () => !(dati && dati.permessi && dati.permessi.costi === false);
  const disponibile = (a) => arrotonda((a.quantita || 0) + (a.inConsegna || 0) - (a.daMontare || 0));
  // Sotto la scorta minima, non alla pari (24 ott 2026, Matteo): come nel foglio.
  const daRiordinare = (a) => a.scorta != null && disponibile(a) < a.scorta;
  const categorieMag = () => (mag() && mag().categorie) || ['Filtri e ricambi', 'Impianti', 'Impianti usati', 'Miscelatori e rubinetti', 'Altro'];
  const categoriaDi = (a) => (categorieMag().includes(a.categoria) ? a.categoria : 'Altro');
  // Il colore della categoria (lo stesso del foglio): una classe «cat-impianti»…
  const classeCategoria = (cat) => `cat-${normalizza(cat).replace(/ /g, '-')}`;
  const coloreQuantita = (a) => (a.quantita < 0 || disponibile(a) < 0 ? 'rosso' : a.quantita === 0 ? 'grigio' : daRiordinare(a) ? 'arancio' : '');
  const NOMI_NUMERI = { inConsegna: 'in consegna', daMontare: 'da montare' };
  // I movimenti salvati insieme hanno lo stesso Id col numero in fondo: «t…-1», «t…-2».
  const lotto = (x) => String(x.id).replace(/-\d+$/, '');
  // Un numero scritto da babbo: «28,50», «€ 28.50», «3 » → "28.50", "28.50", "3"; vuoto → ''.
  const numeroScritto = (v) => String(v == null ? '' : v).replace(/[\s€]/g, '').replace(',', '.');
  const pezziTesto = (n) => `${numeroIt(n)} ${n === 1 ? 'pezzo' : 'pezzi'}`;

  // I materiali di un intervento: quelli «Usato in un lavoro» per quel
  // cliente quel giorno, con quel lavoro (Manutenzione vale anche senza
  // lavoro), come lavoroCombacia in cambiaMateriali nel motore: un guasto
  // lo stesso giorno non si mescola con la manutenzione.
  const stessoLavoro = (v, lavoro) => {
    const l = normalizza(lavoro || 'Manutenzione');
    return normalizza(v) === l || (l === 'manutenzione' && !normalizza(v));
  };
  function usatiIntervento(codice, data, lavoro) {
    return (mag() ? mag().movimenti || [] : [])
      .filter((x) => codice && x.cliente === codice && x.data === data && x.causale === CAUSALI_MAG.lavoro && stessoLavoro(x.lavoro, lavoro));
  }
  // «1 × Filtro …, 2 × …».
  function materialiDi(codice, data, lavoro) {
    return usatiIntervento(codice, data, lavoro).map((x) => `${numeroIt(-x.quantita)} × ${x.descrizione}`).join(', ');
  }

  // Segnare o correggere dopo i materiali di un intervento fatto (21 ott
  // 2026, Matteo: «se uno se ne scorda, e per cambiare se uno sbaglia; se uno
  // cambia si deve correggere anche il magazzino, non vorrei che si sommino
  // i pezzi»). Dalla finestra dell'intervento in «Interventi fatti». La
  // finestra parte coi pezzi già segnati e si salva l'elenco GIUSTO: il
  // motore (cambiaMateriali) rimette in magazzino quelli di prima e toglie
  // quelli nuovi, così i pezzi non si sommano mai.
  function chiediMaterialiIntervento(x) {
    const scelti = new Map();
    usatiIntervento(x.codice, x.data, x.lavoro).forEach((m) => scelti.set(m.articolo, arrotonda((scelti.get(m.articolo) || 0) - m.quantita)));
    const g = String(x.data).split('/');
    chiediMateriali({ codice: x.codice, nome: x.nome || x.codice, lavoro: x.lavoro || 'Manutenzione', data: { g: +g[0], m: +g[1], a: +g[2] }, scelti, cambia: true, dopo: () => disegna(history.state) });
  }
  async function salvaMaterialiIntervento(d, testo) {
    const foto = JSON.parse(JSON.stringify(dati.magazzino));
    try {
      const { r, voce } = await manda('materiali', d, testo);
      if (r) {
        APPLICA.materiali(dati, d);
        appenaArrivati.push({ azione: 'materiali', dati: d, quando: Date.now() });
        salvaDati();
        aggiornaInSottofondo();
      }
      return { r, voce, foto };
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      return null;
    }
  }
  // I materiali usati per un cliente, a gruppi (uno per volta che sono stati segnati), dal più recente.
  function lottiDi(codice) {
    const gruppi = new Map();
    for (const x of (mag() ? mag().movimenti || [] : [])) {
      if (x.cliente !== codice || x.causale !== CAUSALI_MAG.lavoro) continue;
      if (!gruppi.has(lotto(x))) gruppi.set(lotto(x), { id: lotto(x), data: x.data, lavoro: x.lavoro, chi: x.chi, nome: x.nome, righe: [] });
      gruppi.get(lotto(x)).righe.push(x);
    }
    return [...gruppi.values()].reverse().sort((a, b) => quandoFatto(b) - quandoFatto(a));
  }
  const elencoRighe = (righe) => righe.map((x) => `${numeroIt(Math.abs(x.quantita))} × ${x.descrizione}`).join(', ');
  function voceLotto(g) {
    return `<button class="voce" type="button" data-lotto="${esc(g.id)}">
      <b>${esc(g.data)}${g.lavoro ? ` · ${esc(g.lavoro)}` : ''}</b>
      <span class="riga2">${esc(elencoRighe(g.righe))}</span>
      ${g.chi ? `<span class="riga2">Segnati ${esc(daChi(g.chi))}</span>` : ''}
    </button>`;
  }
  // Un gruppo di materiali toccato nella scheda del cliente: si può togliere
  // (segnato per sbaglio): i pezzi tornano in magazzino.
  function collegaLotti() {
    schermo.querySelectorAll('[data-lotto]').forEach((b) => {
      b.onclick = () => {
        const righe = (mag() ? mag().movimenti || [] : []).filter((x) => lotto(x) === b.dataset.lotto);
        if (!righe.length) return;
        const x = righe[0];
        apriFinestra(`
          <h3>Materiali usati il ${esc(x.data)}</h3>
          <p>${x.nome ? `<strong>${esc(x.nome)}</strong>${x.lavoro ? ` · ${esc(x.lavoro)}` : ''}<br>` : ''}${x.chi ? `Segnati ${esc(daChi(x.chi))}.` : ''}</p>
          <ul class="movimenti">${righe.map(rigaMovimento).join('')}</ul>
          <button class="btn btn-rosso" type="button" id="togli-lotto">Segnati per sbaglio: rimettili in magazzino</button>
          <button class="btn leggero" type="button" id="no">Chiudi</button>`);
        $('no').onclick = chiudiFinestra;
        $('togli-lotto').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => { chiudiFinestra(); await annullaMovimento({ id: b.dataset.lotto }); });
      };
    });
  }
  // Una riga dell'elenco dei movimenti: «−1 Usato in un lavoro — Rossi», sotto data e chi.
  const rigaMovimento = (x) => `<li><span class="q ${x.quantita > 0 ? 'piu' : 'meno'}">${x.quantita > 0 ? '+' : '−'}${numeroIt(Math.abs(x.quantita))}</span>
    <span>${esc(x.causale === CAUSALI_MAG.lavoro ? x.descrizione : x.causale)}${NOMI_NUMERI[x.su] ? ` <em>(${NOMI_NUMERI[x.su]})</em>` : ''}${x.causale === CAUSALI_MAG.lavoro && x.nome ? '' : x.nome ? ` — ${esc(x.nome)}` : ''}${x.note ? ` (${esc(x.note)})` : ''}
    <small>${esc(x.data)}${x.causale === CAUSALI_MAG.lavoro && x.nome ? ` · per ${esc(x.nome)}` : ''}${x.chi ? ` · ${esc(nomeChi(x.chi))}` : ''}</small></span></li>`;

  // Manda un movimento; torna quel che serve per annullarlo (o null se il foglio l'ha rifiutato).
  async function mandaMovimento(datiMov, testo) {
    try {
      const { r, voce } = await manda('magazzino', datiMov, testo);
      if (r) {
        APPLICA.magazzino(dati, datiMov);
        appenaArrivati.push({ azione: 'magazzino', dati: datiMov, quando: Date.now() });
        salvaDati();
        aggiornaInSottofondo();
      }
      return { id: datiMov.id, r, voce };
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      return null;
    }
  }
  // Annulla un movimento (tutte le sue righe): le quantità tornano com'erano.
  // Se è ancora nel telefono (senza campo) si toglie dalla coda; se forse è
  // già arrivato, si chiede anche al foglio di toglierlo. `zitto`: il
  // messaggio lo dà chi annulla anche il lavoro.
  async function annullaMovimento(mov, { zitto = false } = {}) {
    const inCoda = leggiLista(K_CODA).find((v) => v.azione === 'magazzino' && v.dati && v.dati.id === mov.id && !inVoloOra.has(v.id));
    if (inCoda) {
      scriviLista(K_CODA, leggiLista(K_CODA).filter((v) => v.id !== inCoda.id));
      APPLICA.annullaMagazzino(dati, { id: mov.id });
      salvaDati();
      if (!inCoda.forse) {
        disegna(history.state);
        if (!zitto) messaggio('Annullato: le quantità sono tornate com\'erano.');
        return;
      }
    }
    try {
      const { r, voce } = await manda('annullaMagazzino', { id: mov.id }, 'Annullato un movimento del magazzino');
      if (r) {
        APPLICA.annullaMagazzino(dati, { id: mov.id });
        appenaArrivati.push({ azione: 'annullaMagazzino', dati: { id: mov.id }, quando: Date.now() });
        salvaDati();
      }
      disegna(history.state);
      if (!zitto) messaggio('Annullato: le quantità sono tornate com\'erano.' + (voce ? fuoriLinea(voce) : ''));
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
    }
  }
  // Il messaggio dopo un movimento salvato da solo, con «Annulla».
  function avvisaMovimento(mov) {
    disegna(history.state);
    if (!mov) return;
    messaggio(mov.testo.charAt(0).toUpperCase() + mov.testo.slice(1) + (mov.voce ? fuoriLinea(mov.voce) : ''), {
      durata: 10000,
      azione: { testo: 'Annulla', fai: () => annullaMovimento(mov) },
    });
  }

  // «Che materiali hai usato?» (dopo un lavoro) o «Cos'è arrivato?» (merce
  // arrivata): si tocca + sugli articoli e si salva tutto insieme. `dopo(mov)`
  // riceve il movimento salvato, o null se non si è usato niente, comunque
  // si chiuda la finestra. Le righe non si spostano mentre si tocca.
  // `cambia`: i materiali di un intervento già fatto (chiediMaterialiIntervento):
  // `scelti` arriva coi pezzi già segnati e si salva l'elenco giusto.
  function chiediMateriali({ codice = '', nome = '', lavoro = '', data = null, carico = false, scelti = new Map(), cambia = false, partenza = null, dopo = () => {} }) {
    if (!mag()) { dopo(null); return; }
    const iniziali = partenza || new Map(scelti);
    const giaSegnati = cambia ? [...iniziali.keys()].map(articoloDa).filter(Boolean) : [];
    let finito = false;
    const fine = (mov) => { if (!finito) { finito = true; dopo(mov); } };
    // In cima i più usati nei lavori (per lo stesso lavoro contano doppio).
    const punti = new Map();
    if (!carico) {
      for (const x of mag().movimenti || []) {
        if (x.causale === CAUSALI_MAG.lavoro) punti.set(x.articolo, (punti.get(x.articolo) || 0) + (lavoro && x.lavoro === lavoro ? 2 : 1));
      }
    }
    const soliti = [...punti].sort((a, b) => b[1] - a[1]).map(([k]) => articoloDa(k)).filter((a) => a && !giaSegnati.includes(a)).slice(0, 8);
    const inCima = [...giaSegnati, ...soliti];
    // In cima anche quelli che si aspettano (21 ott 2026): con la merce
    // arrivata quelli «in consegna», in un lavoro quelli venduti «da montare».
    const attesi = cambia ? [] : articoliMag().filter((a) => !inCima.includes(a) && (carico ? (a.inConsegna || 0) > 0 : (a.daMontare || 0) > 0));
    inCima.push(...attesi);
    // Poi le categorie che servono a quel lavoro.
    const primi = carico ? [] : lavoro === 'Installazione' ? ['Impianti', 'Miscelatori e rubinetti'] : ['Filtri e ricambi'];
    const ordine = [...primi, ...categorieMag().filter((x) => !primi.includes(x))];
    // Le altre restano chiuse in un tasto (sono tante: 80 fra impianti e miscelatori).
    const aperte = new Set(carico ? ['Filtri e ricambi'] : primi);
    apriFinestra(`
      <h3>${carico ? 'Cos\'è arrivato?' : cambia ? 'Materiali usati' : 'Che materiali hai usato?'}</h3>
      <p>${carico ? 'Tocca + sugli articoli arrivati: si aggiungono al magazzino.'
        : cambia ? `<strong>${esc(nome)}</strong> · ${esc(String(lavoro || 'Manutenzione').toLowerCase())} del ${esc(testoData(data))}<br>Metti i numeri giusti con − e +: il magazzino si corregge da solo, i pezzi non si sommano.`
        : `${nome ? `<strong>${esc(nome)}</strong>${lavoro ? ` · ${esc(lavoro)}` : ''}<br>` : ''}Tocca + su quello che hai usato: si toglie dal magazzino.`}</p>
      <input class="cerca-finestra" id="cerca-mat" type="search" autocomplete="off" placeholder="Cerca un articolo">
      <div id="lista-mat"></div>
      ${puo('modificaMagazzino') ? '<button class="link" type="button" id="mat-nuovo">Non c\'è? Aggiungi un articolo</button>' : ''}
      <div class="piede-finestra">
        <button class="btn pieno grande" type="button" id="mat-salva"></button>
        <button class="btn leggero" type="button" id="mat-niente">${carico ? 'Lascia stare' : cambia ? 'Lascia com\'era' : 'Niente dal magazzino'}</button>
      </div>`);
    const aggiornaSalva = () => {
      const n = [...scelti.values()].filter((x) => x > 0);
      const pezzi = n.reduce((s, x) => s + x, 0);
      if (cambia) {
        const uguale = [...new Set([...scelti.keys(), ...iniziali.keys()])].every((k) => (scelti.get(k) || 0) === (iniziali.get(k) || 0));
        $('mat-salva').disabled = uguale;
        $('mat-salva').textContent = uguale ? (iniziali.size ? 'Cambia i numeri con − e +' : 'Tocca + su quello che hai usato') : n.length ? `Salva: ${pezziTesto(pezzi)}${n.length > 1 ? ` (${n.length} articoli)` : ''}` : 'Nessun materiale: rimettili in magazzino';
        return;
      }
      $('mat-salva').disabled = !n.length;
      $('mat-salva').textContent = !n.length ? (carico ? 'Tocca + sugli articoli arrivati' : 'Tocca + su quello che hai usato')
        : `${carico ? 'Aggiungi' : 'Togli'} ${pezziTesto(pezzi)}${n.length > 1 ? ` (${n.length} articoli)` : ''}`;
    };
    const rigaMateriale = (a) => {
      const n = scelti.get(a.codice) || 0;
      return `<div class="materiale${n ? ' scelto' : ''}" data-mat="${esc(a.codice)}">
        <div class="mat-testo"><b>${esc(a.descrizione)}</b><small>${a.fornitore ? `${esc(a.fornitore)} · ` : ''}${a.quantita < 0 ? 'sotto zero: da ricontare' : `ne hai ${numeroIt(a.quantita)}`}${a.inConsegna > 0 ? ` · ${numeroIt(a.inConsegna)} in consegna` : ''}${a.daMontare > 0 ? ` · ${numeroIt(a.daMontare)} da montare` : ''}</small></div>
        <div class="contatore"><button type="button" data-d="-1" aria-label="Uno in meno">−</button><output>${numeroIt(n)}</output><button type="button" data-d="1" aria-label="Uno in più">+</button></div>
      </div>`;
    };
    const gruppo = (t, lista, cls = '') => (lista.length ? `<h4 class="gruppo ${cls}">${esc(t)}</h4><div class="lista-materiali">${lista.map(rigaMateriale).join('')}</div>` : '');
    const disegnaLista = () => {
      const q = normalizza($('cerca-mat').value);
      const tutti = articoliMag();
      let html;
      if (q) {
        const trovati = tutti.filter((a) => normalizza([a.descrizione, a.fornitore, a.codice, a.categoria].join(' ')).includes(q)).slice(0, 40);
        html = trovati.length ? gruppo(`Trovati (${trovati.length})`, trovati) : '<div class="vuoto">Nessun articolo con questo nome.</div>';
      } else {
        html = gruppo('Segnati per questo intervento', giaSegnati) + gruppo(carico ? 'In consegna: quelli che aspetti' : 'Venduti, da montare', attesi) + gruppo('Usati di solito', soliti) + ordine.map((cat) => {
          // In un lavoro prima quelli che ci sono (si usa quello che si ha), poi i finiti.
          const lista = tutti.filter((a) => categoriaDi(a) === cat && !inCima.includes(a));
          if (!carico) lista.sort((a, b) => (b.quantita > 0) - (a.quantita > 0));
          if (!lista.length || aperte.has(cat)) return gruppo(cat, lista, classeCategoria(cat));
          const presi = lista.filter((a) => scelti.get(a.codice)).length;
          return `<button class="mostra-altri ${classeCategoria(cat)}" type="button" data-apri="${esc(cat)}">${esc(cat)} (${lista.length})${presi ? ` · ${presi} ${presi === 1 ? 'scelto' : 'scelti'}` : ''}</button>`;
        }).join('');
        if (!carico && !tutti.some((a) => categoriaDi(a) === 'Filtri e ricambi')) {
          html = '<p class="spiega">Filtri e ricambi non sono ancora nel magazzino: aggiungili con «Non c\'è? Aggiungi un articolo», in fondo.</p>' + html;
        }
      }
      $('lista-mat').innerHTML = html;
      $('lista-mat').querySelectorAll('[data-apri]').forEach((b) => { b.onclick = () => { aperte.add(b.dataset.apri); disegnaLista(); }; });
      $('lista-mat').querySelectorAll('[data-mat]').forEach((riga) => {
        riga.querySelectorAll('[data-d]').forEach((b) => {
          b.onclick = () => {
            const k = riga.dataset.mat;
            const n = Math.max(0, (scelti.get(k) || 0) + Number(b.dataset.d));
            scelti.set(k, n);
            riga.classList.toggle('scelto', n > 0);
            riga.querySelector('output').textContent = numeroIt(n);
            aggiornaSalva();
          };
        });
      });
    };
    $('cerca-mat').oninput = disegnaLista;
    disegnaLista();
    aggiornaSalva();
    alChiudere = () => fine(null);
    $('mat-niente').onclick = chiudiFinestra;
    // L'articolo nuovo, se è per un lavoro, è già scelto (uno).
    if ($('mat-nuovo')) $('mat-nuovo').onclick = () => chiediDatiArticolo(null, {
      perLavoro: !carico,
      poi: (nuovo) => {
        if (nuovo && !carico) scelti.set(nuovo.codice, (scelti.get(nuovo.codice) || 0) + 1);
        chiediMateriali({ codice, nome, lavoro, data, carico, scelti, cambia, partenza: iniziali, dopo });
      },
    });
    $('mat-salva').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      const righe = [...scelti].filter(([, n]) => n > 0).map(([articolo, quantita]) => ({ articolo, quantita }));
      if (cambia) {
        const pezzi = righe.reduce((s, r) => s + r.quantita, 0);
        const d = { id: nuovoId(), codice, nome, lavoro: lavoro || 'Manutenzione', data: isoDa(data), righe };
        const esito = await salvaMaterialiIntervento(d, `Materiali corretti (${pezziTesto(pezzi)}): ${nome}`);
        if (!esito) return;
        alChiudere = null;
        chiudiFinestra();
        fine(null);
        const { r, voce, foto } = esito;
        const indietro = async () => {
          const x = await salvaMaterialiIntervento({ ...r.annulla, id: nuovoId(), lavoro: lavoro || 'Manutenzione', data: isoDa(data) }, `Materiali rimessi com'erano: ${nome}`);
          if (x) { disegna(history.state); messaggio('Annullato: i materiali sono com\'erano.'); }
        };
        messaggio((righe.length ? `Materiali salvati: ${pezziTesto(pezzi)}` : 'Materiali tolti: sono tornati in magazzino') + (voce ? fuoriLinea(voce) : ''), {
          durata: 10000,
          azione: voce ? { testo: 'Annulla', fai: () => annullaInCoda(voce, () => { dati.magazzino = foto; }) }
            : r && r.annulla ? { testo: 'Annulla', fai: indietro } : null,
        });
        return;
      }
      if (!righe.length) return;
      const pezzi = righe.reduce((s, r) => s + r.quantita, 0);
      const datiMov = { id: nuovoId(), causale: carico ? 'carico' : 'lavoro', data: isoDa(data || oggi()), codice, nome, lavoro, righe };
      const mov = await mandaMovimento(datiMov, carico ? `Arrivata merce (${pezziTesto(pezzi)})` : `Materiali usati (${pezziTesto(pezzi)}): ${nome || 'senza nome'}`);
      if (!mov) return;
      mov.testo = `${carico ? 'aggiunti al magazzino' : 'tolti dal magazzino'} ${pezziTesto(pezzi)}`;
      alChiudere = null;
      chiudiFinestra();
      fine(mov);
    });
  }

  // Una finestra per un numero: − e + grandi, oppure lo si scrive.
  function chiediNumero({ titolo: t, testo: p = '', valore = 1, positivo = false, pulsante, nota = '', fai }) {
    apriFinestra(`
      <h3>${esc(t)}</h3>
      ${p ? `<p>${p}</p>` : ''}
      <div class="contatore grande"><button type="button" data-d="-1" aria-label="Uno in meno">−</button>
        <input id="n-val" type="text" inputmode="decimal" autocomplete="off" value="${esc(numeroIt(valore))}">
        <button type="button" data-d="1" aria-label="Uno in più">+</button></div>
      ${nota ? `<label class="campo"><span>${esc(nota)} <em>(facoltativo)</em></span><input id="n-nota"></label>` : ''}
      <button class="btn pieno grande" type="button" id="n-salva">${pulsante}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    const leggi = () => (numeroScritto($('n-val').value) === '' ? NaN : Number(numeroScritto($('n-val').value)));
    $('finestra').querySelectorAll('[data-d]').forEach((b) => {
      b.onclick = () => { const n = leggi(); $('n-val').value = numeroIt(Math.max(0, (isFinite(n) ? n : 0) + Number(b.dataset.d))); };
    });
    $('no').onclick = chiudiFinestra;
    $('n-salva').onclick = (e) => {
      const n = leggi();
      if (!isFinite(n) || n < 0 || (positivo && n === 0)) { messaggio(positivo ? 'Scrivi quanti.' : 'Scrivi un numero.', { errore: true }); return; }
      conPulsante(e.currentTarget, 'Salvo…', () => fai(arrotonda(n), $('n-nota') ? $('n-nota').value.replace(/\s+/g, ' ').trim() : ''));
    };
  }

  // Un articolo toccato: quanti ce ne sono, e cosa si può fare. Dal 21 ott
  // 2026 anche quanti ne sono in consegna e da montare, e il totale: toccando
  // uno di quei due numeri lo si corregge.
  function chiediArticolo(a) {
    const movimenti = (mag().movimenti || []).filter((x) => x.articolo === a.codice).slice(-8).reverse();
    const numeri = numeriMag();
    const cambia = puo('modificaMagazzino'); // senza, la finestra mostra e basta
    const tot = disponibile(a);
    apriFinestra(`
      <h3>${esc(a.descrizione)}</h3>
      <p><span class="pallino ${classeCategoria(categoriaDi(a))}"></span>${esc([a.fornitore, categoriaDi(a)].filter(Boolean).join(' · '))}</p>
      <div class="quanti-grande ${coloreQuantita(a)}"><b>${numeroIt(a.quantita)}</b>
        <span>in magazzino${a.quantita < 0 ? ': sotto zero, ricontali' : !numeri && daRiordinare(a) ? ' · da riordinare' : ''}</span></div>
      ${numeri ? `<div class="tre-numeri">
        <button type="button" id="a-n-consegna"${cambia ? '' : ' disabled'}><b>${numeroIt(a.inConsegna || 0)}</b><small>in consegna</small></button>
        <button type="button" id="a-n-montare"${cambia ? '' : ' disabled'}><b>${numeroIt(a.daMontare || 0)}</b><small>da montare</small></button>
        <div class="totale ${tot < 0 ? 'rosso' : daRiordinare(a) ? 'arancio' : ''}"><b>${numeroIt(tot)}</b><small>${tot < 0 ? 'da ordinare!' : daRiordinare(a) ? 'da riordinare' : 'totale'}</small></div>
      </div>
      <p class="spiega">Totale = in magazzino + in consegna − da montare.${cambia ? ' Tocca «in consegna» o «da montare» per correggerli.' : ''}</p>` : ''}
      <p class="spiega">${esc([a.scorta != null ? `Scorta minima: ${numeroIt(a.scorta)}` : 'Scorta minima non segnata', a.costo != null ? `costo € ${numeroIt(a.costo)}` : '', a.note].filter(Boolean).join(' · '))}</p>
      ${cambia ? `<button class="btn pieno" type="button" id="a-arrivati">${icona('frecciaGiu')} Ne sono arrivati</button>
      ${numeri ? `<div class="azioni-magazzino">
        <button class="btn" type="button" id="a-ordinati">${icona('orologio')} Ordinati</button>
        <button class="btn" type="button" id="a-venduti">${icona('euro')} Venduti, da montare</button>
      </div>` : ''}
      <button class="btn" type="button" id="a-tolti">Ne ho tolti (rotti, resi…)</button>
      <button class="btn" type="button" id="a-contati">${icona('spunta')} Ho contato: correggi il numero</button>
      <button class="btn" type="button" id="a-modifica">${icona('matita')} Modifica i dati</button>`
        : '<p class="spiega">Per cambiare il magazzino serve il permesso, che dà Matteo.</p>'}
      ${movimenti.length ? `<p class="domanda">Ultimi movimenti</p><ul class="movimenti">${movimenti.map(rigaMovimento).join('')}</ul>` : ''}
      <button class="btn leggero" type="button" id="no">Chiudi</button>`);
    // Un movimento di un articolo solo, poi il messaggio con «Annulla».
    // `altro`: `su` (quale numero si corregge) o `nome` (per chi è venduto).
    const salvaUno = async (causale, quantita, note, testo, fatto, altro = {}) => {
      const mov = await mandaMovimento({ id: nuovoId(), causale, data: isoDa(oggi()), righe: [{ articolo: a.codice, quantita }], note, ...altro }, testo);
      if (!mov) return;
      mov.testo = fatto;
      chiudiFinestra();
      avvisaMovimento(mov);
    };
    $('no').onclick = chiudiFinestra;
    if (!cambia) return;
    $('a-arrivati').onclick = () => chiediNumero({
      titolo: 'Quanti ne sono arrivati?',
      testo: `${esc(a.descrizione)}${a.inConsegna > 0 ? `<br>Ne aspettavi <strong>${numeroIt(a.inConsegna)}</strong>: escono da «in consegna».` : ''}`,
      valore: a.inConsegna > 0 ? a.inConsegna : 1, positivo: true, pulsante: `${icona('frecciaGiu')} Aggiungi al magazzino`,
      fai: (n) => salvaUno('carico', n, '', `Arrivati ${numeroIt(n)}: ${a.descrizione}`, `aggiunti al magazzino ${pezziTesto(n)}${a.inConsegna > 0 ? ', usciti da «in consegna»' : ''}`),
    });
    if (numeri) {
      $('a-ordinati').onclick = () => chiediNumero({
        titolo: 'Quanti ne hai ordinati?', testo: `${esc(a.descrizione)}<br>Restano «in consegna» finché non arrivano: allora tocca «Ne sono arrivati».`,
        positivo: true, nota: 'Note (quando arrivano, a chi…)', pulsante: `${icona('orologio')} Segna in consegna`,
        fai: (n, nota) => salvaUno('ordinato', n, nota, `Ordinati ${numeroIt(n)}: ${a.descrizione}`, `in consegna ${pezziTesto(n)} in più`),
      });
      $('a-venduti').onclick = () => chiediNumero({
        titolo: 'Quanti ne hai venduti da montare?', testo: `${esc(a.descrizione)}<br>Restano «da montare» finché non li monti: quando segni i materiali dell'installazione escono da soli.`,
        positivo: true, nota: 'Per chi', pulsante: `${icona('euro')} Segna da montare`,
        fai: (n, nota) => salvaUno('venduto', n, '', `Venduti ${numeroIt(n)}: ${a.descrizione}`, `da montare ${pezziTesto(n)} in più`, { nome: nota }),
      });
      const correggi = (su, nome) => chiediNumero({
        titolo: `Quanti ne sono ${nome}?`, testo: `${esc(a.descrizione)}<br>Per l'app sono <strong>${numeroIt(a[su] || 0)}</strong>.`, valore: Math.max(0, a[su] || 0),
        pulsante: `${icona('spunta')} Sono questi`,
        fai: (n) => {
          if (n === (a[su] || 0)) { chiudiFinestra(); messaggio('Il numero era già giusto ✓'); return null; }
          return salvaUno('correzione', n, '', `Corretti ${nome} (${numeroIt(n)}): ${a.descrizione}`, `corretto: ${nome} ora sono ${numeroIt(n)}`, { su });
        },
      });
      $('a-n-consegna').onclick = () => correggi('inConsegna', 'in consegna');
      $('a-n-montare').onclick = () => correggi('daMontare', 'da montare');
    }
    $('a-tolti').onclick = () => chiediNumero({
      titolo: 'Quanti ne hai tolti?', testo: `${esc(a.descrizione)}<br>Se li hai usati per un cliente, segnali dalla sua scheda.`, positivo: true, nota: 'Perché',
      pulsante: 'Togli dal magazzino', fai: (n, nota) => salvaUno('tolto', n, nota, `Tolti ${numeroIt(n)}: ${a.descrizione}`, `tolti dal magazzino ${pezziTesto(n)}`),
    });
    $('a-contati').onclick = () => chiediNumero({
      titolo: 'Quanti ne hai contati?', testo: `${esc(a.descrizione)}<br>Per l'app sono <strong>${numeroIt(a.quantita)}</strong>.`, valore: Math.max(0, a.quantita),
      pulsante: `${icona('spunta')} Sono questi`,
      fai: (n) => {
        if (n === a.quantita) { chiudiFinestra(); messaggio('Il numero era già giusto ✓'); return null; }
        return salvaUno('correzione', n, '', `Contati ${numeroIt(n)}: ${a.descrizione}`, `corretto: ora sono ${numeroIt(n)}`);
      },
    });
    $('a-modifica').onclick = () => chiediDatiArticolo(a);
  }

  // Articolo nuovo (a = null) o i suoi dati da cambiare. `poi(nuovo)`: dalla
  // finestra dei materiali, che si riapre dopo (anche con «Lascia stare»).
  function chiediDatiArticolo(a, { poi = null, perLavoro = false } = {}) {
    let categoria = a ? categoriaDi(a) : 'Filtri e ricambi';
    const v = (x) => esc(x == null ? '' : x);
    apriFinestra(`
      <h3>${a ? 'Modifica l\'articolo' : 'Nuovo articolo'}</h3>
      <label class="campo"><span>Cos'è</span><input id="ar-desc" value="${v(a && a.descrizione)}" placeholder="Es. Cartuccia carboni 10 pollici"></label>
      <p class="domanda">Che tipo</p>
      <div class="pillole pillole-lavoro" id="ar-cat">${categorieMag().map((x) => `<button type="button" class="pillola" data-v="${esc(x)}" aria-pressed="${x === categoria}">${esc(x)}</button>`).join('')}</div>
      <label class="campo"><span>Codice del fornitore <em>(facoltativo)</em></span><input id="ar-forn" value="${v(a && a.fornitore)}" autocomplete="off"></label>
      ${a ? '' : `<label class="campo"><span>Quanti ne hai in magazzino${perLavoro ? ' <em>(contando anche quelli appena usati)</em>' : ''}</span>
        <input id="ar-q" type="text" inputmode="decimal" autocomplete="off" value="0"></label>`}
      <label class="campo"><span>Scorta minima <em>(facoltativa: quando ne restano meno di così è «da riordinare»)</em></span>
        <input id="ar-scorta" type="text" inputmode="decimal" autocomplete="off" value="${a && a.scorta != null ? numeroIt(a.scorta) : ''}"></label>
      ${vedeCosti() ? `<label class="campo"><span>Costo d'acquisto in euro <em>(facoltativo)</em></span>
        <input id="ar-costo" type="text" inputmode="decimal" autocomplete="off" value="${a && a.costo != null ? numeroIt(a.costo) : ''}"></label>` : ''}
      <label class="campo"><span>Note <em>(facoltative)</em></span><input id="ar-note" value="${v(a && a.note)}"></label>
      <button class="btn pieno grande" type="button" id="ar-salva">${icona('spunta')} ${a ? 'Salva' : 'Aggiungi al magazzino'}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('ar-cat').querySelectorAll('[data-v]').forEach((b) => {
      b.onclick = () => { categoria = b.dataset.v; $('ar-cat').querySelectorAll('[data-v]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); };
    });
    if (poi) alChiudere = () => poi(null);
    $('no').onclick = chiudiFinestra;
    if (!a) $('ar-desc').focus();
    $('ar-salva').onclick = (e) => {
      const campi = {
        codice: a ? a.codice : '', categoria, descrizione: $('ar-desc').value.replace(/\s+/g, ' ').trim(), fornitore: $('ar-forn').value.trim(),
        scorta: numeroScritto($('ar-scorta').value), note: $('ar-note').value.replace(/\s+/g, ' ').trim(),
      };
      if (!a) campi.quantita = numeroScritto($('ar-q').value) || '0';
      if (!campi.descrizione) { messaggio('Scrivi cos\'è l\'articolo.', { errore: true }); return; }
      // Senza il permesso dei costi il campo non c'è e il costo non si manda: resta quello che c'è.
      if (vedeCosti()) campi.costo = numeroScritto($('ar-costo').value);
      if ([campi.scorta, campi.costo, campi.quantita].some((x) => x && !(Number(x) >= 0))) {
        messaggio('Controlla i numeri: solo cifre, per esempio 28,50.', { errore: true });
        return;
      }
      conPulsante(e.currentTarget, 'Salvo…', async () => {
        const prima = a ? { ...a } : null;
        try {
          const { r, voce } = await manda('articolo', campi, `${a ? 'Articolo cambiato' : 'Articolo nuovo'}: ${campi.descrizione}`);
          let nuovo = null;
          if (r && r.articolo) {
            const m = mag();
            const c = m.articoli.find((x) => x.codice === r.articolo.codice);
            if (c) Object.assign(c, r.articolo); else m.articoli.push(r.articolo);
            nuovo = r.articolo;
            salvaDati();
          }
          alChiudere = null;
          chiudiFinestra();
          if (poi) poi(a ? null : nuovo); else disegna(history.state);
          if (a) {
            messaggio('Salvato ✓' + (voce ? fuoriLinea(voce) : ''), {
              durata: 10000,
              azione: {
                testo: 'Annulla',
                fai: voce ? () => annullaInCoda(voce, () => APPLICA.articolo(dati, prima))
                  : () => manda('articolo', r.annulla, `Articolo rimesso com'era: ${prima.descrizione}`)
                    .then(({ r: r2 }) => { if (r2) APPLICA.articolo(dati, prima); salvaDati(); disegna(history.state); messaggio('Annullato.'); })
                    .catch((err) => messaggio(err.message, { errore: true, durata: 8000 })),
              },
            });
          } else if (voce) {
            messaggio(`Lo aggiungo al magazzino appena c'è campo: fino ad allora non compare.${voce.dietro ? ' È in fila dopo le altre.' : ''}`, { durata: 10000 });
          } else {
            messaggio(r.giaPresente ? `C'era già: ${r.articolo.descrizione}` : `Aggiunto al magazzino ✓ ${r.articolo.descrizione}`, { durata: 8000 });
          }
        } catch (err) {
          messaggio(err.message, { errore: true, durata: 8000 });
        }
      });
    };
  }

  // Un articolo nell'elenco: il bordo col colore della categoria, e sotto
  // quanti ne sono in consegna e da montare, col totale (21 ott 2026).
  function voceArticolo(a) {
    const tot = disponibile(a);
    const etichetta = a.quantita < 0 ? '<span class="etichetta rosso">Sotto zero: ricontali</span>'
      : tot < 0 ? '<span class="etichetta rosso">Da ordinare: venduti più di quelli che hai</span>'
        : daRiordinare(a) ? '<span class="etichetta arancio">Da riordinare</span>' : '';
    const attesa = [a.inConsegna > 0 && `${numeroIt(a.inConsegna)} in consegna`, a.daMontare > 0 && `${numeroIt(a.daMontare)} da montare`].filter(Boolean);
    return `<button class="voce articolo ${classeCategoria(categoriaDi(a))}" type="button" data-articolo="${esc(a.codice)}">
      <span class="articolo-testo"><b>${esc(a.descrizione)}</b>
        ${a.fornitore || a.note ? `<span class="riga2">${esc([a.fornitore, a.note].filter(Boolean).join(' · '))}</span>` : ''}
        ${attesa.length ? `<span class="riga2 attesa">${esc(attesa.join(' · '))} · totale ${numeroIt(tot)}</span>` : ''}
        ${etichetta ? `<span class="riga3">${etichetta}</span>` : ''}</span>
      <span class="pezzi ${coloreQuantita(a)}"><b>${numeroIt(a.quantita)}</b><small>${a.quantita === 1 ? 'pezzo' : 'pezzi'}</small></span>
    </button>`;
  }

  // La pagina del magazzino. Dal 21 ott 2026 (Matteo: «nell'app metti anche
  // per filtrare impianti, filtri, miscelatori») una fila di categorie, coi
  // colori del foglio, sopra l'elenco; e i filtri «In consegna» e «Da montare».
  const FILTRI_MAG = ['riordinare', 'finiti', 'consegna', 'montare'];
  function schermoMagazzino(stato) {
    titolo('Magazzino', true);
    if (!mag()) { schermo.innerHTML = '<div class="vuoto">Il magazzino non è ancora nel foglio. Chiedi a Matteo.</div>'; return; }
    const tutti = articoliMag();
    const numeri = numeriMag();
    const filtro = FILTRI_MAG.includes(stato.filtro) ? stato.filtro : 'tutti';
    const cat = categorieMag().includes(stato.cat) ? stato.cat : '';
    const gruppi = {
      tutti, riordinare: tutti.filter(daRiordinare), finiti: tutti.filter((a) => a.quantita <= 0),
      consegna: tutti.filter((a) => a.inConsegna > 0), montare: tutti.filter((a) => a.daMontare > 0),
    };
    const base = gruppi[filtro];
    const pezzi = tutti.reduce((s, a) => s + Math.max(0, a.quantita), 0);
    const valore = tutti.reduce((s, a) => s + Math.max(0, a.quantita) * (a.costo || 0), 0);
    const pillola = (k, t, rossa = false) => `<button class="pillola${rossa && gruppi[k].length ? ' pillola-rossa' : ''}" data-filtro="${k}" aria-pressed="${filtro === k}">${t} (${gruppi[k].length})</button>`;
    schermo.innerHTML = `
      <div class="cerca"><input id="cerca-mag" type="search" autocomplete="off" placeholder="Cerca un articolo" value="${esc(stato.q || '')}"></div>
      <div class="pillole">
        ${pillola('tutti', 'Tutti')}${pillola('riordinare', 'Da riordinare', true)}${pillola('finiti', 'Finiti')}
        ${numeri ? pillola('consegna', 'In consegna') + pillola('montare', 'Da montare') : ''}
      </div>
      <div class="pillole pillole-categorie">
        <button class="pillola" data-cat="" aria-pressed="${!cat}">Tutte le categorie</button>
        ${categorieMag().map((c) => `<button class="pillola ${classeCategoria(c)}" data-cat="${esc(c)}" aria-pressed="${cat === c}">${esc(c)} (${base.filter((a) => categoriaDi(a) === c).length})</button>`).join('')}
      </div>
      ${puo('modificaMagazzino') ? `<div class="azioni-magazzino">
        <button class="btn pieno" type="button" id="arrivata">${icona('frecciaGiu')} È arrivata merce</button>
        <button class="btn" type="button" id="nuovo-articolo">${icona('piu')} Nuovo articolo</button>
      </div>` : ''}
      <p class="spiega">${pezziTesto(pezzi)} in magazzino${valore ? `, per € ${Math.round(valore).toLocaleString('it-IT')} al prezzo d'acquisto` : ''}.${numeri ? ' Il totale di un articolo è in magazzino + in consegna − da montare: «da riordinare» si guarda lì.' : ''} ${puo('modificaMagazzino') ? 'Tocca un articolo per segnare quelli arrivati, ordinati o venduti, correggere i numeri o cambiarne i dati.' : 'Puoi guardarlo; per cambiarlo serve il permesso, che dà Matteo. I materiali usati in un lavoro li segni lo stesso, dopo il lavoro o dalla finestra dell\'intervento.'}</p>
      <div id="lista-mag"></div>`;
    const disegnaLista = () => {
      const q = normalizza($('cerca-mag').value);
      let lista = base;
      if (q) lista = lista.filter((a) => normalizza([a.descrizione, a.fornitore, a.codice, a.categoria, a.note].join(' ')).includes(q));
      const html = categorieMag().filter((c) => !cat || c === cat).map((c) => {
        const l = lista.filter((a) => categoriaDi(a) === c);
        return l.length ? `<h2 class="gruppo ${classeCategoria(c)}">${esc(c)} (${l.length})</h2><div class="lista">${l.map(voceArticolo).join('')}</div>` : '';
      }).join('');
      const vuoti = {
        riordinare: 'Niente da riordinare.<br><br>Un articolo è «da riordinare» quando il suo totale scende sotto la scorta minima: la scegli toccandolo, in «Modifica i dati».',
        finiti: 'Nessun articolo finito.',
        consegna: 'Niente in consegna.<br><br>Quando ordini al fornitore, tocca l\'articolo e «Ordinati».',
        montare: 'Niente da montare.<br><br>Quando un cliente compra, tocca l\'articolo e «Venduti, da montare».',
      };
      $('lista-mag').innerHTML = html || `<div class="vuoto">${q ? 'Nessun articolo con questo nome.' : cat ? `Nessun articolo fra ${esc(cat)}.` : vuoti[filtro] || 'Il magazzino è vuoto.'}</div>`;
      $('lista-mag').querySelectorAll('[data-articolo]').forEach((b) => { b.onclick = () => { const a = articoloDa(b.dataset.articolo); if (a) chiediArticolo(a); }; });
    };
    const ricorda = (cambi) => {
      history.replaceState({ s: 'magazzino', filtro, cat, q: $('cerca-mag').value, ...cambi }, '', location.pathname + location.hash);
      disegna(history.state);
    };
    $('cerca-mag').oninput = () => { history.replaceState({ ...history.state, q: $('cerca-mag').value }, '', location.pathname + location.hash); disegnaLista(); };
    schermo.querySelectorAll('[data-filtro]').forEach((b) => { b.onclick = () => ricorda({ filtro: b.dataset.filtro }); });
    schermo.querySelectorAll('[data-cat]').forEach((b) => { b.onclick = () => ricorda({ cat: b.dataset.cat }); });
    if ($('arrivata')) $('arrivata').onclick = () => chiediMateriali({ carico: true, dopo: avvisaMovimento });
    if ($('nuovo-articolo')) $('nuovo-articolo').onclick = () => chiediDatiArticolo(null);
    disegnaLista();
  }

  // ---------------------------------------------------------------------
  //  Contatti (lead)
  // ---------------------------------------------------------------------
  const ETICHETTE_STATO = {
    'Da richiamare': 'Da chiamare',
    'Contattato': 'L\'ho sentito',
    'Preventivo inviato': 'Gli ho mandato il preventivo',
    'Cliente': 'È diventato cliente',
    // Sentiti ma non interessati, o perditempo: si chiude la partita, e non
    // tornano piu' fra quelli da risentire (30 set 2026, richiesta di Matteo).
    'Non interessato': 'Non gli interessa',
  };
  const RISENTIRE = 'risentire';
  const FILTRI_LEAD = [
    ['Da richiamare', 'Da chiamare'],
    [RISENTIRE, 'Da risentire'],
    ['Contattato', 'Sentiti'],
    ['Preventivo inviato', 'Preventivo'],
    ['Cliente', 'Clienti'],
    ['Non interessato', 'Non interessati'],
  ];
  // "29/06/2026, 17:22:49" → numero ordinabile; senza data in fondo.
  function quandoArrivato(l) {
    const m = String(l.data).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/);
    return m ? Date.UTC(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0)) : 0;
  }
  const idLead = (l) => `${l.riga}|${l.data}|${l.nome}`;

  function schermoLead(stato) {
    titolo('Contatti', true);
    const conta = {};
    dati.lead.forEach((l) => { conta[statoLead(l)] = (conta[statoLead(l)] || 0) + 1; });
    const risentire = daRisentire();
    conta[RISENTIRE] = risentire.length;
    const filtro = stato.filtro || (conta['Da richiamare'] ? 'Da richiamare' : risentire.length ? RISENTIRE : 'Contattato');
    const quanti = new Map(risentire.map(({ l, giorni }) => [l, giorni]));
    const elenco = filtro === RISENTIRE
      ? risentire.map(({ l }) => l)
      : dati.lead.filter((l) => statoLead(l) === filtro).sort((a, b) => quandoArrivato(b) - quandoArrivato(a));
    const perche = (l) => {
      const g = quanti.get(l);
      return statoLead(l) === 'Preventivo inviato'
        ? `<span class="etichetta arancio">Preventivo senza risposta da ${g} giorni</span>`
        : `<span class="etichetta arancio">Sentito e poi fermo da ${g} giorni</span>`;
    };
    schermo.innerHTML = `
      <button class="btn pieno" id="nuovo-lead" style="width:100%;margin-bottom:14px">${icona('personaPiu')} Aggiungi un contatto</button>
      <div class="pillole">${FILTRI_LEAD.map(([v, t]) => `<button class="pillola" data-filtro="${esc(v)}" aria-pressed="${filtro === v}">${t} (${conta[v] || 0})</button>`).join('')}</div>
      ${filtro === RISENTIRE ? '<p class="spiega">Preventivi mandati da più di una settimana, e contatti sentiti che poi non si sono più fatti vivi. Una telefonata e sai se va avanti. I giorni si contano dall\'ultima nota, o dall\'arrivo se note non ce ne sono.</p>' : ''}
      <div class="lista">${elenco.map((l) => `
        <button class="voce" data-lead="${esc(idLead(l))}">
          <b>${esc(l.nome || 'Senza nome')}</b>
          <span class="riga2">Arrivato il ${esc(String(l.data).split(',')[0] || '—')}${l.provenienza ? ' · ' + esc(l.provenienza) : ''}</span>
          ${filtro === RISENTIRE ? `<span class="riga3">${perche(l)}</span>`
            : l.interesse ? `<span class="riga3"><span class="etichetta">${esc(l.interesse)}</span></span>` : ''}
        </button>`).join('') || '<div class="vuoto">Nessun contatto qui</div>'}</div>`;
    schermo.querySelectorAll('[data-filtro]').forEach((b) => {
      b.onclick = () => { history.replaceState({ s: 'lead', filtro: b.dataset.filtro }, '', location.pathname + location.hash); disegna(history.state); };
    });
    schermo.querySelectorAll('[data-lead]').forEach((b) => { b.onclick = () => vai({ s: 'schedaLead', id: b.dataset.lead }); });
    $('nuovo-lead').onclick = () => vai({ s: 'nuovoLead' });
  }

  // Contatto nuovo scritto a mano: chi telefona o scrive senza passare dal
  // modulo del sito. Il motore lo scrive in Lead-Contatti come quelli del
  // sito (nuovoLead in gestionale.mjs), poi si apre la sua scheda.
  const PROVENIENZE = [['Passaparola', 'Passaparola'], ['Meta / Facebook', 'Facebook'], ['Sito web', 'Sito web'], ['Annuncio Google (WhatsApp/telefono)', 'Annuncio Google']];
  function schermoNuovoLead() {
    titolo('Nuovo contatto', true);
    const piuUsati = (valori, n) => {
      const conta = {};
      valori.filter(Boolean).forEach((v) => { conta[v] = (conta[v] || 0) + 1; });
      return Object.keys(conta).sort((a, b) => conta[b] - conta[a]).slice(0, n);
    };
    const citta = [...new Set(dati.clienti.map((c) => titoloCitta(c.citta)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
    const interessi = piuUsati(dati.lead.map((l) => l.interesse.trim()), 20);
    let provenienza = 'Passaparola';
    schermo.innerHTML = `
      <form id="f-lead" novalidate>
        <label class="campo"><span>Nome e cognome</span><input name="nome" autocomplete="off" autocapitalize="words" required></label>
        <p class="errore-campo" id="err-nome" hidden>Scrivi almeno il nome.</p>
        <label class="campo"><span>Telefono</span><input name="telefono" type="tel" inputmode="tel" autocomplete="off"></label>
        <label class="campo"><span>Email <em>(facoltativo)</em></span><input name="email" type="email" inputmode="email" autocomplete="off" autocapitalize="none"></label>
        <p class="errore-campo" id="err-tel" hidden>Scrivi il telefono (o l'email), se no non lo puoi richiamare.</p>
        <p class="errore-campo" id="err-tel-cifre" hidden></p>
        <label class="campo"><span>Città</span><input name="citta" list="l-citta-lead" autocomplete="off"></label>
        <datalist id="l-citta-lead">${citta.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <div class="campo"><span>Come ci ha conosciuto?</span>
          <div class="scelta">${PROVENIENZE.map(([v, t]) => `<button type="button" data-prov="${esc(v)}" aria-pressed="${v === provenienza}">${t}</button>`).join('')}</div></div>
        <label class="campo"><span>Cosa gli interessa <em>(facoltativo)</em></span><input name="interesse" list="l-interessi" autocomplete="off"></label>
        <datalist id="l-interessi">${interessi.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <label class="campo"><span>Note <em>(facoltativo)</em></span><textarea name="note" placeholder="Es. ha chiamato per un preventivo, richiamare dopo le 17"></textarea></label>
        <button class="btn verde grande" style="width:100%">${icona('spunta')} Salva il contatto</button>
      </form>`;
    const f = $('f-lead');
    f.querySelectorAll('[data-prov]').forEach((b) => {
      b.onclick = () => {
        provenienza = b.dataset.prov;
        f.querySelectorAll('[data-prov]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      };
    });
    const v = (n) => f.elements[n].value.trim();
    f.onsubmit = (e) => {
      e.preventDefault();
      $('err-nome').hidden = !!v('nome');
      $('err-tel').hidden = !!(v('telefono') || v('email'));
      if (!v('nome')) { f.elements.nome.focus(); return; }
      if (!v('telefono') && !v('email')) { f.elements.telefono.focus(); return; }
      const sbagliato = problemaTelefono(v('telefono'));
      $('err-tel-cifre').textContent = sbagliato;
      $('err-tel-cifre').hidden = !sbagliato;
      if (sbagliato) { f.elements.telefono.focus(); return; }
      conPulsante(f.querySelector('button.verde'), 'Salvo…', async () => {
        try {
          const { r, voce } = await manda('nuovoLead', {
            nome: v('nome'), telefono: v('telefono'), email: v('email'), citta: v('citta'),
            provenienza, interesse: v('interesse'), note: v('note'),
          }, `Contatto nuovo: ${v('nome').toUpperCase()}`);
          if (voce) {
            // Compare fra i contatti quando arriva al foglio; intanto è nel riquadro in home.
            history.replaceState({ s: 'home' }, '', location.pathname + location.hash);
            disegna(history.state);
            messaggio('Contatto segnato ✓' + fuoriLinea(voce), { durata: 8000 });
            return;
          }
          await carica().catch(() => {});
          const l = r.doppione
            ? dati.lead.find((x) => x.riga === r.riga)
            : dati.lead.find((x) => x.nome === r.nome && x.data === r.data);
          if (l) history.replaceState({ s: 'schedaLead', id: idLead(l) }, '', location.pathname + location.hash);
          else history.replaceState({ s: 'lead', filtro: 'Da richiamare' }, '', location.pathname + location.hash);
          disegna(history.state);
          messaggio(r.doppione ? 'Era già tra i contatti: ho aggiornato la sua scheda ✓' : 'Contatto salvato ✓', { durata: 6000 });
        } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
      });
    };
  }

  function trovaLeadLocale(id) {
    const [riga, ...resto] = String(id).split('|');
    const nome = resto.pop();
    const data = resto.join('|');
    return dati.lead.find((l) => l.data === data && l.nome === nome) || dati.lead.find((l) => String(l.riga) === riga);
  }

  function schermoSchedaLead(stato) {
    const l = trovaLeadLocale(stato.id);
    titolo('Contatto', true);
    if (!l) { schermo.innerHTML = '<div class="vuoto">Contatto non trovato. Torna indietro e riprova.</div>'; return; }
    const attuale = statoLead(l);
    const riga = (etichetta, valore) => (valore ? `<div><dt>${etichetta}</dt><dd>${esc(valore)}</dd></div>` : '');
    // Le note dei moduli Meta arrivano come "quando_preferisci_essere_contattato?:
    // dalle_17:00_alle_20:00 — (form 1869…, ad 1202…)": via i trattini bassi
    // e via i codici tecnici, che a babbo non dicono niente.
    const note = String(l.note || '').split(' — ')
      .map((p) => p.trim().replace(/\s*\((?:storico[^)]*|form \d+[^)]*|dalla pagina[^)]*|scritto dall'app[^)]*)\)\s*$/i, '').replace(/_/g, ' ').replace(/\?:\s*/g, '? ').trim())
      .filter((p) => p && !/^\(?(form|ad) \d+/i.test(p))
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join('\n');
    schermo.innerHTML = `
      <div class="testa"><h2>${esc(l.nome || 'Senza nome')}</h2><p>Arrivato il ${esc(String(l.data).split(',')[0])}${l.provenienza ? ' da ' + esc(l.provenienza) : ''}</p></div>
      <div class="azioni">${pulsantiContatto(l.contatto, '')}</div>
      ${giranti().length ? riquadroTappe(tappeDi((t) => t.contatto === chiaveLead(l))) : ''}
      <h3 class="titoletto">Com'è andata?</h3>
      <div class="stati">${(dati.stati || Object.keys(ETICHETTE_STATO)).map((s) => `
        <button class="stato" data-stato="${esc(s)}" aria-pressed="${attuale === s}">
          <span class="pallino">${attuale === s ? icona('spunta') : ''}</span>${esc(ETICHETTE_STATO[s] || s)}
        </button>`).join('')}</div>
      <form id="f-nota">
        <label class="campo"><span>Aggiungi una nota <em>(facoltativo)</em></span>
          <textarea name="nota" placeholder="Es. richiamare lunedì mattina"></textarea></label>
        <button class="btn pieno" style="width:100%">Salva la nota</button>
      </form>
      <h3 class="titoletto">Dettagli</h3>
      <dl class="dati">
        ${riga('Interessato a', l.interesse)}
        ${riga('Telefono / email', l.contatto)}
        ${riga('Note', note)}
      </dl>`;

    collegaTappe({ lead: l });
    schermo.querySelectorAll('[data-stato]').forEach((b) => {
      b.onclick = () => {
        const nuovo = b.dataset.stato;
        if (nuovo === attuale) return;
        if (nuovo === 'Cliente') {
          const f = apriFinestra(`
            <h3>È diventato cliente?</h3>
            <p>Aggiungo <strong>${esc(l.nome)}</strong> all'elenco dei clienti, poi ti apro la sua scheda per scrivere indirizzo e impianto.</p>
            <button class="btn verde grande" type="button" id="si">${icona('spunta')} Sì, aggiungilo</button>
            <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
          $('no').onclick = chiudiFinestra;
          $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', () => salvaStato(l, nuovo).then(chiudiFinestra, () => {}));
          return f;
        }
        salvaStato(l, nuovo).catch(() => {});
      };
    });

    $('f-nota').onsubmit = (e) => {
      e.preventDefault();
      const testo = e.target.nota.value.trim();
      if (!testo) return;
      conPulsante(e.target.querySelector('button'), 'Salvo…', async () => {
        try {
          const o = oggi();
          const { r, voce } = await manda('nota', { riga: l.riga, data: l.data, nome: l.nome, nota: testo, giorno: `${due(o.g)}/${due(o.m)}` }, `Nota per ${l.nome}`);
          if (r) l.note = r.note;
          disegna(history.state);
          messaggio('Nota salvata ✓' + (voce ? fuoriLinea(voce) : ''));
        } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
      });
    };
  }

  async function salvaStato(l, nuovo) {
    try {
      const { r, voce } = await manda('stato', { riga: l.riga, data: l.data, nome: l.nome, stato: nuovo }, `${ETICHETTE_STATO[nuovo] || nuovo}: ${l.nome}`);
      if (voce) {
        // Senza campo: lo stato cambia già qui; se diventa cliente, la sua
        // scheda nasce quando la richiesta arriva al foglio.
        disegna(history.state);
        messaggio((nuovo === 'Cliente' ? 'Segnato: diventa cliente appena arriva al foglio.' : `Salvato ✓ ${ETICHETTE_STATO[nuovo] || nuovo}.`) + fuoriLinea(voce), { durata: 8000 });
        return;
      }
      l.stato = nuovo;
      if (r.dataStato) l.dataStato = r.dataStato; // "Da risentire" riparte da oggi
      disegna(history.state);
      if (r.cliente && r.cliente.giaPresente) {
        messaggio(`Segnato. Era già tra i clienti (${r.cliente.codice}).`, { durata: 8000 });
      } else if (r.cliente) {
        // Dritti alla scheda nuova: la riga nasce senza indirizzo né impianto.
        await carica().catch(() => {});
        vai({ s: 'cliente', codice: r.cliente.codice });
        messaggio(`Aggiunto ai clienti ✓ (${r.cliente.codice})`, { durata: 6000 });
        return;
      } else {
        messaggio(`Salvato ✓ ${ETICHETTE_STATO[nuovo] || nuovo}`);
      }
      aggiornaInSottofondo();
    } catch (err) {
      messaggio(err.message, { errore: true, durata: 8000 });
      throw err;
    }
  }

  // ---------------------------------------------------------------------
  //  Cerca
  // ---------------------------------------------------------------------
  // Cerca fra i clienti e fra i contatti (lead), e dice sempre quale dei due
  // è ciascuno: due gruppi coi loro titoli, e sui contatti il loro stato
  // (9 ott 2026, richiesta di Matteo).
  function schermoCerca(stato) {
    titolo('Cerca', true);
    const persi = dati.persi || [];
    schermo.innerHTML = `
      <div class="cerca"><input type="search" id="q" placeholder="Nome, città o telefono" autocomplete="off" enterkeyhint="search" value="${esc(stato.q || '')}"></div>
      <div id="risultati"></div>
      ${persi.length ? `<button class="mostra-altri" id="vai-persi">Clienti persi (${persi.length})</button>` : ''}`;
    if ($('vai-persi')) $('vai-persi').onclick = () => vai({ s: 'persi' });
    const q = $('q');
    const nove = (testo) => (String(testo).match(/\d[\d\s./-]{7,}\d/g) || []).map((n) => n.replace(/\D/g, '').slice(-9)).filter((n) => n.length === 9);
    const nomeUguale = (nome) => normalizza(nome).split(' ').filter(Boolean).sort().join(' ');
    // Anche i persi: se uno richiama, lo si ritrova (con l'etichetta "Cliente perso").
    const tuttiClienti = dati.clienti.concat(persi);
    const indice = tuttiClienti.map((c) => ({
      c,
      testo: normalizza([c.nome, c.citta, c.indirizzo, c.codice, c.tipo].join(' ')),
      cifre: String(c.contatto).replace(/\D/g, ''),
    }));
    // Un contatto diventato cliente sta già fra i clienti: non si ripete. Si
    // tiene solo se fra i clienti non lo si ritrova né per telefono né per nome.
    const telClienti = new Set(tuttiClienti.flatMap((c) => nove(c.contatto)));
    const nomiClienti = new Set(tuttiClienti.map((c) => nomeUguale(c.nome)));
    const indiceLead = dati.lead
      .filter((l) => statoLead(l) !== 'Cliente' || !(nove(l.contatto).some((n) => telClienti.has(n)) || nomiClienti.has(nomeUguale(l.nome))))
      .map((l) => ({
        l,
        // Nelle note c'è anche la zona e la città ("Zona: Z1 — Firenze città").
        testo: normalizza([l.nome, l.note, l.interesse].join(' ')),
        cifre: String(l.contatto).replace(/\D/g, ''),
      }));
    const voceLead = (l) => `<button class="voce" data-lead="${esc(idLead(l))}">
        <b>${esc(l.nome || 'Senza nome')}</b>
        <span class="riga2">Arrivato il ${esc(String(l.data).split(',')[0] || '—')}${l.provenienza ? ' · ' + esc(l.provenienza) : ''}</span>
        <span class="riga3"><span class="etichetta">Contatto · ${esc(ETICHETTE_STATO[statoLead(l)] || statoLead(l))}</span></span>
      </button>`;
    function cerca() {
      const v = q.value;
      history.replaceState({ s: 'cerca', q: v }, '', location.pathname + location.hash);
      const parole = normalizza(v).split(' ').filter(Boolean);
      const cifre = v.replace(/\D/g, '');
      if (!parole.length) { $('risultati').innerHTML = '<div class="vuoto">Scrivi un pezzo del nome, la città o il numero di telefono: lo cerco fra i clienti e fra i contatti.</div>'; return; }
      const combacia = (x) => (cifre.length >= 4 && x.cifre.includes(cifre)) || parole.every((p) => x.testo.includes(p));
      const clienti = indice.filter(combacia).slice(0, 40);
      const contatti = indiceLead.filter(combacia).sort((a, b) => quandoArrivato(b.l) - quandoArrivato(a.l)).slice(0, 20);
      // Se ci sono tutti e due, in cima quanti sono: i contatti stanno sotto
      // e con tanti clienti (una città) non si vedrebbero.
      const n = (k, uno, tanti) => `${k} ${k === 1 ? uno : tanti}`;
      $('risultati').innerHTML = (clienti.length || contatti.length)
        ? (clienti.length && contatti.length ? `<p class="sommario-cerca">Trovati ${n(clienti.length, 'cliente', 'clienti')} e ${n(contatti.length, 'contatto', 'contatti')}. <button class="link" type="button" id="vai-contatti">Vai ai contatti</button></p>` : '')
          + (clienti.length ? `<h3 class="titoletto gruppo-cerca">Clienti (${clienti.length})</h3><div class="lista">${clienti.map((x) => voceCliente(x.c)).join('')}</div>` : '')
          + (contatti.length ? `<h3 class="titoletto gruppo-cerca" id="gruppo-contatti">Contatti (${contatti.length})</h3><div class="lista">${contatti.map((x) => voceLead(x.l)).join('')}</div>` : '')
        : '<div class="vuoto">Nessuno trovato, né fra i clienti né fra i contatti.</div>';
      if ($('vai-contatti')) $('vai-contatti').onclick = () => $('gruppo-contatti').scrollIntoView({ behavior: 'smooth', block: 'start' });
      collegaVoci();
      schermo.querySelectorAll('[data-lead]').forEach((b) => { b.onclick = () => vai({ s: 'schedaLead', id: b.dataset.lead }); });
    }
    q.oninput = cerca;
    cerca();
    if (!stato.q) setTimeout(() => q.focus(), 50);
  }

  // Clienti persi: chi non è più cliente (scheda Clienti-Persi del foglio).
  function schermoPersi() {
    titolo('Clienti persi', true);
    const persi = (dati.persi || []).slice().sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
    schermo.innerHTML = `
      <p style="margin:0 0 14px;color:var(--grigio)">Non sono più clienti: non compaiono fra le manutenzioni. Se uno torna, aprilo e tocca «È tornato cliente».</p>
      <div class="lista">${persi.map((c) => voceCliente(c)).join('') || '<div class="vuoto">Nessun cliente perso</div>'}</div>`;
    collegaVoci();
  }

  // ---------------------------------------------------------------------
  //  Nuovo cliente e modifica dei dati (stesso modulo)
  // ---------------------------------------------------------------------
  function schermoModulo(stato) {
    const c = stato.codice ? dati.clienti.find((x) => x.codice === stato.codice) : null;
    if (stato.codice && !c) { titolo('Modifica', true); schermo.innerHTML = '<div class="vuoto">Cliente non trovato. Torna indietro e riprova.</div>'; return; }
    titolo(c ? 'Modifica i dati' : 'Nuovo cliente', true);
    const piuUsati = (valori, n) => {
      const conta = {};
      valori.filter(Boolean).forEach((v) => { conta[v] = (conta[v] || 0) + 1; });
      return Object.keys(conta).sort((a, b) => conta[b] - conta[a]).slice(0, n);
    };
    const citta = piuUsati(dati.clienti.map((x) => titoloCitta(x.citta)), 200).sort();
    const tipi = piuUsati(dati.clienti.map((x) => x.tipo.trim()), 40);
    const inst = c ? (c.installazione ? c.installazione.split('/').reverse().join('-') : '') : isoDa(oggi());
    // Se non è segnata (clienti appena arrivati da un contatto) parte da 12,
    // come per un cliente nuovo: senza, la scadenza resterebbe vuota.
    let mesi = (c && c.frequenza) || 12;
    const scelteMesi = [6, 12].concat(mesi && ![6, 12].includes(mesi) ? [mesi] : []);
    const valore = (v) => `value="${esc(v || '')}"`;
    schermo.innerHTML = `
      ${c ? `<div class="testa" style="margin-bottom:16px"><h2>${esc(c.nome)}</h2></div>` : ''}
      <form id="f-modulo" novalidate>
        ${c ? '' : `<label class="campo"><span>Cognome e nome</span><input name="nome" autocomplete="off" autocapitalize="characters" required></label>
        <p class="errore-campo" id="err-nome" hidden>Scrivi almeno il nome.</p>`}
        <label class="campo"><span>Telefono</span><input name="telefono" type="tel" inputmode="tel" autocomplete="off" ${valore(c && c.contatto)}></label>
        <label class="campo"><span>Indirizzo <em>(via e numero)</em></span><input name="indirizzo" autocomplete="off" ${valore(c && c.indirizzo)}></label>
        <label class="campo"><span>Città</span><input name="citta" list="l-citta" autocomplete="off" ${valore(c && titoloCitta(c.citta))}></label>
        <datalist id="l-citta">${citta.map((x) => `<option value="${esc(x)}">`).join('')}</datalist>
        <label class="campo"><span>Impianto</span><input name="tipo" list="l-tipi" autocomplete="off" ${valore(c && c.tipo)}></label>
        <datalist id="l-tipi">${tipi.map((t) => `<option value="${esc(t)}">`).join('')}</datalist>
        <label class="campo"><span>Installato il</span><input name="installazione" type="date" ${valore(inst)} max="${isoDa(oggi())}"></label>
        <div class="campo"><span>Manutenzione</span>
          <div class="scelta">${scelteMesi.map((m) => `<button type="button" data-mesi="${m}" aria-pressed="${m === mesi}">Ogni ${m} mesi</button>`).join('')}</div></div>
        <label class="campo"><span>Note o prezzo <em>(facoltativo)</em></span><textarea name="note">${esc(c ? c.note : '')}</textarea></label>
        ${c ? '' : `<div class="campo"><span>Foto <em>(facoltative: lavello, sotto il lavello, impianto vecchio…)</em></span>
          <div id="foto-nuove"></div>${tastoFoto('file-foto-nuovo')}</div>`}
        <button class="btn verde grande" style="width:100%">${icona('spunta')} ${c ? 'Salva le modifiche' : 'Salva il cliente'}</button>
      </form>`;
    const f = $('f-modulo');
    // Le foto del cliente nuovo (26 ott 2026): restano nel modulo finché non si salva.
    let fotoNuove = [];
    function disegnaFotoNuove() {
      $('foto-nuove').innerHTML = fotoNuove.length ? miniature(fotoNuove, true) : '';
      $('foto-nuove').querySelectorAll('[data-foto]').forEach((b) => {
        b.onclick = () => { const x = fotoNuove.find((y) => y.id === b.dataset.foto); chiediDescrizioni([x], disegnaFotoNuove, { pulsante: 'Fatto' }); };
      });
      $('foto-nuove').querySelectorAll('[data-foto-togli]').forEach((b) => {
        b.onclick = () => { fotoNuove = fotoNuove.filter((y) => y.id !== b.dataset.fotoTogli); disegnaFotoNuove(); };
      });
    }
    if (!c) {
      const file = $('file-foto-nuovo');
      file.onchange = () => {
        const scelte = [...file.files];
        file.value = '';
        if (scelte.length) preparaFoto(scelte, (pronte) => { fotoNuove = fotoNuove.concat(pronte); disegnaFotoNuove(); });
      };
    }
    f.querySelectorAll('[data-mesi]').forEach((b) => {
      b.onclick = () => {
        mesi = +b.dataset.mesi;
        f.querySelectorAll('[data-mesi]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      };
    });
    const v = (n) => f.elements[n].value.trim();
    f.onsubmit = (e) => {
      e.preventDefault();
      if (!c && !v('nome')) { $('err-nome').hidden = false; f.elements.nome.focus(); return; }
      if (!c) $('err-nome').hidden = true;
      conPulsante(f.querySelector('button.verde'), 'Salvo…', () => (c ? salvaModifica() : salvaNuovo()));
    };

    async function salvaModifica() {
      // Solo i campi cambiati: il resto della riga nel foglio non si tocca.
      const prima = { telefono: c.contatto, indirizzo: c.indirizzo, citta: titoloCitta(c.citta), tipo: c.tipo, installazione: inst, note: c.note };
      const campi = {};
      Object.keys(prima).forEach((k) => { if (v(k) !== String(prima[k] || '').trim()) campi[k] = v(k); });
      if (mesi !== c.frequenza) campi.frequenza = mesi;
      if (!Object.keys(campi).length) { history.back(); return; }
      try {
        const { r, voce } = await manda('modifica', { codice: c.codice, campi }, `Dati cambiati: ${c.nome}`);
        if (r) await carica().catch(() => {});
        history.back();
        messaggio('Dati salvati ✓' + (r ? '' : fuoriLinea(voce)), { durata: r ? 5000 : 8000 });
      } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
    }

    async function salvaNuovo() {
      // Le foto vanno nel telefono PRIMA del cliente, legate alla sua voce:
      // se l'app si chiude mentre salva, ripartono con lui.
      const idVoce = nuovoIdVoce();
      const nome = v('nome').toUpperCase();
      const conFoto = fotoNuove.slice();
      await mettiFotoInAttesa(conFoto.map((x) => ({ ...x, codice: '', nuovo: idVoce, nome, quando: Date.now(), chi: io() })));
      const senzaFoto = async () => { for (const x of conFoto) await togliFotoInAttesa(x.id); };
      const conLeFoto = (testo) => (conFoto.length ? `${testo} Le foto partono da sole.` : testo);
      try {
        const { r, voce } = await manda('nuovo', {
          nome: v('nome'), telefono: v('telefono'), indirizzo: v('indirizzo'), citta: v('citta'),
          tipo: v('tipo'), installazione: v('installazione'), frequenza: mesi, note: v('note'),
        }, `Cliente nuovo: ${nome}`, { id: idVoce });
        if (voce) {
          // Il codice C0xx lo dà il foglio: la scheda nasce quando arriva.
          history.replaceState({ s: 'home' }, '', location.pathname + location.hash);
          disegna(history.state);
          messaggio('Cliente segnato ✓' + fuoriLinea(voce) + (conFoto.length ? ' Le foto partono con lui.' : ''), { durata: 8000 });
          return;
        }
        if (r.giaPresente) {
          // Le foto restano nel modulo (un altro «Salva» le rimette in
          // attesa), o vanno a lui se si apre la sua scheda.
          await senzaFoto();
          apriFinestra(`
            <h3>${r.perso ? 'È fra i clienti persi' : 'C\'è già un cliente con questo nome'}</h3>
            <p><strong>${esc(r.nome)}</strong> (${esc(r.codice)}) ${r.perso
              ? 'è fra i clienti persi. Non l\'ho aggiunto di nuovo: apri la sua scheda e tocca «È tornato cliente».'
              : `è già nell'elenco. Non l'ho aggiunto di nuovo.${conFoto.length ? ' Se apri la sua scheda, le foto le metto lì.' : ''}`}</p>
            <button class="btn pieno grande" type="button" id="apri">Apri la sua scheda</button>
            <button class="btn leggero" type="button" id="no">Torna al modulo</button>`);
          $('no').onclick = chiudiFinestra;
          $('apri').onclick = async () => {
            if (!r.perso && conFoto.length) {
              await mettiFotoInAttesa(conFoto.map((x) => ({ ...x, codice: r.codice, nuovo: '', nome: r.nome, quando: Date.now(), chi: io() })));
              mandaFoto();
            }
            history.replaceState({ s: 'cliente', codice: r.codice }, '', location.pathname + location.hash);
            chiudiFinestra();
            disegna(history.state);
          };
          return;
        }
        segnaCodiceNuovo(idVoce, r.codice);
        await carica().catch(() => {});
        mandaFoto();
        history.replaceState({ s: 'cliente', codice: r.codice }, '', location.pathname + location.hash);
        disegna(history.state);
        messaggio(conLeFoto(`Cliente salvato ✓ (${r.codice}).`), { durata: 6000 });
      } catch (err) {
        await senzaFoto();
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    }
  }

  // ---------------------------------------------------------------------
  //  Avvio
  // ---------------------------------------------------------------------
  history.replaceState(history.state || { s: 'home' }, '', location.pathname + location.hash);
  // Per aprirsi anche senza campo (sw.js). Se il telefono non lo permette, pazienza.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/gestione/sw.js', { scope: '/gestione/' }).catch(() => {});

  disegna(history.state);

  // Le foto rimaste da mandare: si vedono (scheda, riquadro in home) e partono.
  caricaFotoInAttesa().then(() => {
    if (!fotoInAttesa.length || !chiave) return;
    if (dati && $('finestra').hidden && !staiScrivendo()) disegna(history.state);
    mandaFoto();
  });

  if (chiave && dati) {
    // Mostra subito i dati salvati, intanto rilegge il foglio.
    carica().then(() => { if ($('finestra').hidden) disegna(history.state); }).catch((err) => {
      if (err.chiave) return disegna({ s: 'attiva' });
      const alle = aggiornatoAlle ? new Date(aggiornatoAlle).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
      $('avviso').textContent = `Senza linea: vedi i dati del ${alle}. Quello che segni resta nel telefono e parte da solo appena torna il campo.`;
      $('avviso').hidden = false;
    });
  }

  // Tornando sull'app dopo un po' (es. dal telefono dopo una chiamata), rilegge.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !chiave) return;
    mandaPosizioniInAttesa();
    mandaTutto();
    if (Date.now() - (aggiornatoAlle || 0) > 120000) aggiornaInSottofondo();
  });
})();
