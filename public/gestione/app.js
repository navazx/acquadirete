// App "Gestione" per il telefono di babbo: manutenzioni, clienti e contatti
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
  async function api(azione, datiAzione) {
    const ferma = new AbortController();
    const timer = setTimeout(() => ferma.abort(), 20000);
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
      if (!res.ok || !corpo.ok) throw Object.assign(new Error(corpo.errore || 'Qualcosa non ha funzionato. Riprova tra poco.'), { stato: res.status });
      return corpo;
    } finally {
      clearTimeout(timer);
    }
  }
  const salvaDati = () => memoria.scrivi(K_DATI, JSON.stringify({ dati, quando: aggiornatoAlle }));

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
        const nuovi = { oggi: r.oggi, clienti: r.clienti, lead: r.lead, persi: r.persi || [], stati: r.stati };
        // Le azioni ancora in coda: il foglio non le ha, lo schermo sì.
        for (const v of leggiLista(K_CODA)) if (APPLICA[v.azione]) APPLICA[v.azione](nuovi, v.dati);
        dati = nuovi;
        aggiornatoAlle = Date.now();
        salvaDati();
        $('avviso').hidden = true;
        mandaPosizioniInAttesa();
        mandaCoda();
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
    const schermi = { home: schermoHome, scadenze: schermoScadenze, mappa: schermoMappa, cliente: schermoCliente, lead: schermoLead, schedaLead: schermoSchedaLead, cerca: schermoCerca, nuovo: schermoModulo, modifica: schermoModulo, nuovoLead: schermoNuovoLead, persi: schermoPersi };
    (schermi[stato.s] || schermoHome)(stato);
  }

  // ---------------------------------------------------------------------
  //  Finestra di conferma e messaggi
  // ---------------------------------------------------------------------
  function apriFinestra(html) {
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
    const daRichiamare = dati.lead.filter((l) => statoLead(l) === 'Da richiamare').length;
    const risentire = daRisentire().length;
    const alle = aggiornatoAlle ? new Date(aggiornatoAlle).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : '';
    schermo.innerHTML = `
      ${riquadroCoda()}
      <div class="tessere">
        ${urgenti ? `<button class="tessera urgente" data-vai="scadenze" data-vista="urgenti">
          <span class="ico">${icona('allarme')}</span>
          <span><b>${urgenti === 1 ? '1 cliente urgente' : `${urgenti} clienti urgenti`}</b><small>${urgenti === 1 ? 'Ha' : 'Hanno'} chiamato per un guasto</small></span>
        </button>` : ''}
        <button class="tessera" data-vai="scadenze">
          <span class="ico">${icona('attrezzi')}</span>
          <span><b>Manutenzioni da fare</b>
          <small>${scadute ? `<span class="n-rosso">${scadute} scadute</span> · ` : ''}${presto} nei prossimi 2 mesi</small></span>
        </button>
        <button class="tessera" data-vai="lead">
          <span class="ico">${icona('telefono')}</span>
          <span><b>Contatti da chiamare</b>
          <small>${daRichiamare ? `<span class="n-rosso">${daRichiamare} da chiamare</span>` : 'Nessuno da chiamare'}${risentire ? ` · ${risentire} da risentire` : ''}</small></span>
        </button>
        <button class="tessera" data-vai="cerca">
          <span class="ico">${icona('cerca')}</span>
          <span><b>Cerca clienti e contatti</b><small>Per nome, città o telefono</small></span>
        </button>
        <button class="tessera" data-vai="nuovo">
          <span class="ico">${icona('piu')}</span>
          <span><b>Nuovo cliente</b><small>Aggiungi un cliente all'elenco</small></span>
        </button>
        <button class="tessera" data-vai="nuovoLead">
          <span class="ico">${icona('personaPiu')}</span>
          <span><b>Nuovo contatto</b><small>Chi ha telefonato o scritto per informazioni</small></span>
        </button>
      </div>
      <p class="aggiornato">${alle ? `Dati aggiornati alle ${alle}` : ''}<br><button id="ricarica">Aggiorna adesso</button></p>`;
    schermo.querySelectorAll('[data-vai]').forEach((b) => { b.onclick = () => vai({ s: b.dataset.vai, vista: b.dataset.vista }); });
    $('ricarica').onclick = (e) => conPulsante(e.target, 'Aggiorno…', () => carica().then(() => disegna(history.state)).catch((err) => messaggio(err.message, { errore: true })));
    collegaRiquadroCoda();
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
      riga3 = `<span class="riga3">${etichetta}</span>${mo.perche ? `<span class="riga2" style="color:var(--testo)">${esc(mo.perche)}</span>` : ''}`;
    } else if (conScadenza) {
      riga3 = `<span class="riga3"><span class="etichetta ${s.classe}">${esc(s.testo)}</span>${c.prossima ? `<span class="etichetta grigio">${esc(c.prossima)}</span>` : ''}</span>`;
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

  // Tre pagine: "Da fare" (scadute e in scadenza), "Urgenti" (hanno chiamato
  // per un guasto) e "Sospese" (senza data, finché non si riattivano). Per
  // scegliere dove andare c'è la mappa: i tasti delle città sono stati tolti
  // il 5 ott 2026, quando è arrivata (richiesta di Matteo).
  const VISTE = [['fare', 'Da fare'], ['urgenti', 'Urgenti'], ['sospese', 'Sospese']];
  function schermoScadenze(stato) {
    titolo('Manutenzioni', true);
    const vista = VISTE.some(([v]) => v === stato.vista) ? stato.vista : 'fare';
    const { urgenti, sospese } = contaScadenze();
    const conta = { fare: null, urgenti, sospese };
    const inPagina = vista === 'fare'
      ? dati.clienti.filter((c) => { if (c.avviso) return false; const s = scadenza(c); return s.giorni != null && s.giorni <= 60; })
      : dati.clienti.filter((c) => c.avviso === (vista === 'urgenti' ? 'Urgente' : 'Sospesa'));

    schermo.innerHTML = `
      <div class="pillole">${VISTE.map(([v, t]) => `<button class="pillola${v === 'urgenti' && urgenti ? ' pillola-rossa' : ''}" data-vista="${v}" aria-pressed="${vista === v}">${t}${conta[v] != null ? ` (${conta[v]})` : ''}</button>`).join('')}</div>
      <button class="btn vai-mappa" id="vai-mappa" type="button">${icona('mappa')} Vedi sulla mappa</button>
      <div id="elenco"></div>`;

    if (vista !== 'fare') {
      // Gli urgenti dal più vecchio (chi aspetta da più tempo in cima), le sospese per nome.
      const lista = inPagina.slice()
        .sort(vista === 'urgenti' ? (a, b) => leggiMotivo(a).t - leggiMotivo(b).t : (a, b) => a.nome.localeCompare(b.nome, 'it'));
      $('elenco').innerHTML = lista.length
        ? `<div class="lista">${lista.map((c) => voceCliente(c)).join('')}</div>`
        : vista === 'urgenti'
          ? `<div class="vuoto">Nessun cliente urgente 👍<br><br>Se un cliente chiama per un guasto: cercalo e nella sua scheda tocca «Ha un guasto».<br><br><button class="btn pieno" id="vai-cerca" style="width:100%">${icona('cerca')} Cerca il cliente</button></div>`
          : '<div class="vuoto">Nessuna manutenzione sospesa.<br><br>Per sospenderne una: nella scheda del cliente tocca «Rimanda la manutenzione» e poi «Sospendi, senza data».</div>';
      if ($('vai-cerca')) $('vai-cerca').onclick = () => vai({ s: 'cerca' });
    } else {
      const conGiorni = inPagina.map((c) => ({ c, s: scadenza(c) }));
      const perData = (x, y) => x.c.prossimaSeriale - y.c.prossimaSeriale;
      // Tutte le scadute insieme, dalla più vecchia: anche quelle di anni fa,
      // che babbo sposta fra le sospese o fra i persi (scelta di Matteo, 1 ott).
      const scadute = conGiorni.filter((x) => x.s.giorni < 0).sort(perData);
      const presto = conGiorni.filter((x) => x.s.giorni >= 0 && x.s.giorni <= 60).sort(perData);
      $('elenco').innerHTML = `
        <h2 class="gruppo">Scadute (${scadute.length})</h2>
        <div class="lista">${scadute.map((x) => voceCliente(x.c)).join('') || '<div class="vuoto">Nessuna manutenzione scaduta 👍</div>'}</div>
        <h2 class="gruppo">Nei prossimi 2 mesi (${presto.length})</h2>
        <div class="lista">${presto.map((x) => voceCliente(x.c)).join('') || '<div class="vuoto">Niente in scadenza</div>'}</div>`;
    }
    collegaVoci();

    schermo.querySelectorAll('[data-vista]').forEach((b) => {
      b.onclick = () => { history.replaceState({ s: 'scadenze', vista: b.dataset.vista }, '', location.pathname + location.hash); disegna(history.state); };
    });
    // Dalle sospese, la mappa si apre con anche le sospese accese.
    $('vai-mappa').onclick = () => vai({ s: 'mappa', cat: vista === 'sospese' ? [...CATEGORIE_DI_BASE, 'sospese'] : CATEGORIE_DI_BASE });
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
    return (await res.json()).map((r) => ({
      lat: +r.lat, lng: +r.lon, civico: r.type === 'house' || r.category === 'building' || !!(r.address && r.address.house_number),
      via: r.category === 'highway', address: r.address || {},
    }));
  }
  const kmFra = (a, b) => Math.hypot((b.lng - a.lng) * Math.cos((a.lat + b.lat) * Math.PI / 360), b.lat - a.lat) * 111.32;
  // Il risultato sta davvero in quel paese? «Firenze», «Prato», «Pistoia» sono
  // anche province: «Via Italia, Firenze» combacerebbe con la Via Italia di
  // Vinci. Vale se un luogo dell'indirizzo è il paese scritto, o una parte
  // del nome («Montespertoli» per «Montagnaga Montespertoli»), o comincia
  // come lui («Tavarnelle Val di Pesa» per «Tavarnelle»).
  const LUOGHI = ['city', 'town', 'village', 'hamlet', 'suburb', 'quarter', 'neighbourhood', 'city_district', 'municipality', 'isolated_dwelling', 'locality'];
  const nelPaese = (paese) => {
    const nomi = [paese, ...paese.split(/\s*[,/]\s*/)].map(normalizza).filter(Boolean);
    return (r) => LUOGHI.some((k) => {
      const v = normalizza(r.address && r.address[k]);
      return v && nomi.some((n) => ` ${n} `.includes(` ${v} `) || ` ${v} `.startsWith(` ${n} `));
    });
  };
  async function cercaPosizione(c) {
    // Abbreviazioni sciolte; le iniziali dei nomi si tolgono invece di
    // indovinarle: «Via Balbo» trova anche «Via Cesare Balbo».
    const via = String(c.indirizzo || '')
      .replace(/\(.*?\)/g, ' ')
      .replace(/\bL\.go\b/gi, 'Largo').replace(/\bV\.le\b/gi, 'Viale').replace(/\bP\.?zz?a\b/gi, 'Piazza').replace(/\bC\.so\b/gi, 'Corso')
      .replace(/\b(Loc|Fraz)\.\s*/gi, '')
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
    let strade = [];
    if (via && paese) {
      strade = await chiediNominatim({ q: `${via}, ${paese}` });
      const r = scegli(strade, nelPaese(paese));
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
      const vicina = strade.filter((s) => s.civico || s.via).map((s) => ({ s, km: kmFra(r, s) })).filter((x) => x.km <= 4).sort((a, b) => a.km - b.km)[0];
      if (vicina) return { lat: vicina.s.lat, lng: vicina.s.lng, prec: precisione(vicina.s) };
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

  // Il giro: i codici dei clienti scelti, nell'ordine in cui farli. Resta
  // nel telefono, così si prepara la sera e si parte la mattina.
  const K_GIRO = 'gestione-giro';
  const MAX_TAPPE = 10; // Google Maps apre al massimo 10 tappe
  // Da dove parte babbo (sede, Via 1° Maggio a Montespertoli): serve solo a
  // mettere le tappe in un ordine sensato.
  const SEDE = { lat: 43.6436, lng: 11.0756 };
  let giro = (() => {
    try { const g = JSON.parse(memoria.leggi(K_GIRO) || '[]'); return Array.isArray(g) ? g.filter((k) => typeof k === 'string').slice(0, MAX_TAPPE) : []; } catch { return []; }
  })();
  let elencoGiroAperto = false;
  let mappaAttiva = null;   // la mappa Leaflet mostrata adesso
  let vistaMappa = null;    // centro e zoom, per ritrovarla uguale tornando indietro
  let vistaCercato = null;  // lo stesso, per la mappa aperta su un cliente ({ evid, centro, zoom })
  let fermaPosizione = () => {}; // smette di seguire il telefono quando si lascia la mappa

  const clienteDa = (codice) => dati.clienti.find((c) => c.codice === codice);
  // Distanza "a volo d'uccello" in gradi corretti: basta per confrontare.
  const distanza = (a, b) => Math.hypot((b.lng - a.lng) * Math.cos((a.lat + b.lat) * Math.PI / 360), b.lat - a.lat);

  // Ordina le tappe come un giro che parte dalla sede e ci torna: prima la
  // più vicina ogni volta, poi si sciolgono gli incroci (2-opt). Le tappe
  // senza posizione restano in fondo.
  function ordinaGiro(codici) {
    const conPosto = codici.map(clienteDa).filter((c) => c && c.lat != null);
    const senza = codici.filter((k) => !conPosto.some((c) => c.codice === k));
    const resto = conPosto.slice();
    const percorso = [SEDE];
    while (resto.length) {
      const qui = percorso[percorso.length - 1];
      let i = 0;
      resto.forEach((t, j) => { if (distanza(qui, t) < distanza(qui, resto[i])) i = j; });
      percorso.push(resto.splice(i, 1)[0]);
    }
    percorso.push(SEDE);
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
    if (tappe.length > 1 && distanza(SEDE, tappe[0]) > distanza(SEDE, tappe[tappe.length - 1])) tappe.reverse();
    return [...tappe.map((c) => c.codice), ...senza];
  }
  function salvaGiro() { memoria.scrivi(K_GIRO, JSON.stringify(giro)); }

  // Il link che apre Google Maps col percorso: si parte da dove si è, l'ultima
  // tappa è l'arrivo. Indirizzi scritti (Google li trova meglio delle
  // coordinate di OpenStreetMap); le coordinate se la posizione è segnata
  // sul posto («Sono qui»), o se l'indirizzo manca.
  function linkGiro(tappe) {
    const dove = (c) => sulPosto(c) || (c.indirizzo
      ? [c.indirizzo, senzaCap(c.citta) ? c.citta : '', c.provincia].filter(Boolean).join(', ')
      : `${c.lat},${c.lng}`);
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
    giro = giro.filter((k) => clienteDa(k));
    const tutti = dati.clienti.map((c) => ({ c, cat: categoriaMappa(c) })).filter((x) => x.cat);
    // Il cliente aperto da «Sulla mappa» nella sua scheda (17 ott 2026) e le
    // tappe del giro si vedono anche senza una manutenzione vicina: puntino
    // verde, «lontana». `centra` vale una volta sola (poi diventa `evid`), così
    // un aggiornamento in sottofondo non riporta la mappa su di lui.
    const evid = stato.centra || stato.evid || null;
    [evid, ...giro].forEach((k) => {
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
    const nelGiro = (c) => giro.includes(c.codice);

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
      const tappe = giro.map(clienteDa).filter(Boolean);
      const nome = (c) => c.nome.split('/')[0].replace(/\(.*?\)/g, '').trim();
      $('giro').innerHTML = tappe.length
        ? `<div class="giro-testa"><b>Giro: ${tappe.length} ${tappe.length === 1 ? 'tappa' : 'tappe'}</b>
            <span><button class="link" id="elenco-giro">${elencoGiroAperto ? 'Chiudi elenco' : 'Elenco'}</button><button class="link" id="svuota-giro">Svuota</button></span></div>
          ${elencoGiroAperto ? `<p class="giro-tappe">${tappe.map((c, i) => `<span><b>${i + 1}</b>${esc(nome(c))} <i>${esc(titoloCitta(c.citta))}</i></span>`).join('')}</p>` : ''}
          <a class="btn pieno largo" href="${esc(linkGiro(tappe))}" target="_blank" rel="noopener">${icona('mappa')} Apri il giro in Google Maps</a>`
        : '<p class="giro-vuoto">Tocca un puntino e poi «Aggiungi al giro». Le tappe si mettono in ordine da sole, partendo da Montespertoli.</p>';
      if ($('svuota-giro')) $('svuota-giro').onclick = () => { giro = []; salvaGiro(); disegnaGiro(); disegnaPuntini(); };
      if ($('elenco-giro')) $('elenco-giro').onclick = () => { elencoGiroAperto = !elencoGiroAperto; disegnaGiro(); };
      dimensiona();
    }

    function popup(c) {
      const s = scadenza(c);
      const etichetta = c.avviso === 'Urgente' ? '<span class="etichetta rosso">Urgente</span>'
        : c.avviso === 'Sospesa' ? '<span class="etichetta grigio">Sospesa</span>'
        : `<span class="etichetta ${s.classe}">${esc(s.testo)}</span>`;
      return `<div class="popup-cliente">
        <b>${esc(c.nome)}</b>
        <span>${esc([c.indirizzo, titoloCitta(c.citta)].filter(Boolean).join(', '))}</span>
        <span class="riga3">${etichetta}${c.prossima ? `<span class="etichetta grigio">${esc(c.prossima)}</span>` : ''}</span>
        ${c.tipo ? `<span class="tipo">${esc(c.tipo)}</span>` : ''}
        ${c.prec === 'paese' ? '<small>Posizione approssimativa: centro del paese. Quando sei lì, «Sono qui» nella scheda la sistema.</small>' : ''}
        <div class="popup-azioni">
          <button class="btn ${nelGiro(c) ? '' : 'pieno'}" data-azione="giro">${nelGiro(c) ? 'Togli dal giro' : 'Aggiungi al giro'}</button>
          <button class="btn" data-azione="scheda">Apri la scheda</button>
        </div>
      </div>`;
    }

    function cambiaGiro(c) {
      if (nelGiro(c)) {
        giro = giro.filter((k) => k !== c.codice);
      } else {
        if (giro.length >= MAX_TAPPE) { messaggio(`In un giro ci stanno al massimo ${MAX_TAPPE} tappe.`, { errore: true }); return; }
        giro = ordinaGiro([...giro, c.codice]);
      }
      salvaGiro();
      mappaAttiva.closePopup();
      disegnaGiro();
      disegnaPuntini();
    }

    function disegnaPuntini() {
      if (!strato) return;
      strato.clearLayers();
      segni.clear();
      // Le tappe del giro e il cliente cercato si vedono sempre, anche se la
      // loro categoria è spenta.
      const visibili = sparpaglia(tutti.filter((x) => x.c.lat != null && (scelte.has(x.cat) || nelGiro(x.c) || evidenziato(x.c))));
      visibili.forEach((x) => {
        const n = giro.indexOf(x.c.codice);
        const ev = evidenziato(x.c);
        const classi = ['pin', x.cat, x.c.prec === 'paese' ? 'circa' : '', n >= 0 ? 'nel-giro' : '', ev ? 'evidenziato' : ''].filter(Boolean).join(' ');
        const testo = n >= 0 ? String(n + 1) : x.cat === 'urgenti' ? '!' : '';
        const lato = ev ? 36 : x.cat === 'urgenti' || n >= 0 ? 32 : 26;
        const segno = L.marker([x.lat, x.lng], {
          icon: L.divIcon({ className: 'pin-mappa', html: `<span class="${classi}">${testo}</span>`, iconSize: [lato, lato], iconAnchor: [lato / 2, lato / 2], popupAnchor: [0, -lato / 2] }),
          keyboard: false,
          // Il cliente cercato, le tappe del giro e gli urgenti sopra gli altri puntini.
          zIndexOffset: ev ? 3000 : n >= 0 ? 2000 : x.cat === 'urgenti' ? 1000 : x.cat === 'scadute' ? 500 : 0,
        });
        segni.set(x.c.codice, segno);
        segno.bindPopup(() => popup(x.c), { maxWidth: 280, minWidth: 220, autoPanPaddingTopLeft: [16, 64], autoPanPaddingBottomRight: [16, 16] });
        segno.on('popupopen', (e) => {
          const el = e.popup.getElement();
          el.querySelector('[data-azione="giro"]').onclick = () => cambiaGiro(x.c);
          el.querySelector('[data-azione="scheda"]').onclick = () => vai({ s: 'cliente', codice: x.c.codice });
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
  function pulsantiContatto(testo, indirizzo, cliente = null) {
    const nums = telefoni(testo);
    const mail = email(testo);
    let html = nums.map((n) => `<a class="btn pieno largo" href="tel:${esc(n.tel)}">${icona('telefono')} Chiama ${esc(n.mostra)}</a>`).join('');
    const cell = nums.find((n) => n.cellulare);
    if (cell) html += `<a class="btn" href="https://wa.me/${esc(cell.wa)}" target="_blank" rel="noopener">${icona('messaggio')} WhatsApp</a>`;
    const dove = sulPosto(cliente) || indirizzo;
    if (dove) html += `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dove)}" target="_blank" rel="noopener">${icona('mappa')} Portami lì</a>`;
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
    const riquadroAvviso = !c.avviso ? '' : `
      <div class="avviso-cliente ${c.avviso === 'Urgente' ? 'rosso' : 'grigio'}">
        <div><b>${icona(c.avviso === 'Urgente' ? 'allarme' : 'pausa')} ${c.avviso === 'Urgente' ? 'URGENTE' : 'MANUTENZIONE SOSPESA'}</b>
          ${mo.quando ? `<span>dal ${esc(mo.quando)}</span>` : ''}${mo.perche ? `<p>${esc(mo.perche)}</p>` : ''}</div>
        <button class="btn" type="button" id="togli-avviso">${c.avviso === 'Urgente' ? `${icona('spunta')} Risolto` : 'Riattiva'}</button>
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
      <button class="btn verde grande" id="fatta" style="width:100%">${icona('spunta')} Manutenzione fatta</button>
      ${daFare ? `<button class="btn" id="rimanda" style="width:100%;margin-top:10px">${icona('orologio')} Rimanda la manutenzione</button>` : ''}
      ${c.avviso !== 'Urgente' ? `<button class="btn btn-rosso" id="urgente" style="width:100%;margin-top:10px">${icona('allarme')} Ha un guasto: è urgente</button>` : ''}
      ${mancano.length ? `<div class="scadenza arancio" style="margin:16px 0 0">Mancano: ${esc(mancano.join(', '))}</div>` : ''}
      <button class="btn${mancano.length ? ' pieno' : ''}" id="modifica" style="width:100%;margin-top:${mancano.length ? '10px' : '16px'}">${icona('matita')} ${mancano.length ? 'Completa i dati' : 'Modifica i dati'}</button>
      <button class="btn" id="sono-qui" style="width:100%;margin-top:10px">${icona('mirino')} Sono qui: segna la posizione</button>
      <p class="nota-posizione">${esc(POSIZIONE_IN_MAPPA[c.prec] || 'Non è ancora sulla mappa.')}${posizioniInAttesa().some((p) => p.codice === c.codice) ? '<br>Non è ancora nel foglio: la mando appena c\'è campo.' : ''}</p>
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
      <button class="btn leggero" id="perso" style="width:100%;margin-top:14px">Non è più nostro cliente</button>`;
    $('perso').onclick = () => chiediSposta(c, 'persi');
    $('fatta').onclick = () => chiediFatta(c);
    if ($('rimanda')) $('rimanda').onclick = () => chiediRimanda(c);
    if ($('urgente')) $('urgente').onclick = () => chiediAvviso(c, 'Urgente');
    if ($('togli-avviso')) $('togli-avviso').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', () => salvaAvviso(c, '', ''));
    $('modifica').onclick = () => vai({ s: 'modifica', codice: c.codice });
    $('sono-qui').onclick = (e) => chiediSonoQui(c, e.currentTarget);
    if ($('sulla-mappa')) $('sulla-mappa').onclick = () => vai({ s: 'mappa', cat: CATEGORIE_DI_BASE, centra: c.codice });
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
    const daMandare = leggiLista(K_CODA).length || posizioniInAttesa().length;
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
  // Come cambiano i dati per ogni azione, finché il foglio non risponde.
  const APPLICA = {
    fatta(d, x) {
      const c = clienteIn(d, x.codice);
      const mesi = parseInt(c && (c.frequenza || x.frequenza), 10);
      const g = daIso(x.data);
      if (!c || !(mesi > 0) || !g) return;
      conProssima(c, piuMesi(g, mesi));
      if (!c.frequenza) c.frequenza = mesi;
      c.avviso = '';
      c.motivo = '';
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
  async function manda(azione, datiAzione, testo) {
    const prima = leggiLista(K_CODA);
    const voce = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, azione, dati: datiAzione, testo, quando: Date.now(), forse: !prima.length, dietro: prima.length > 0 };
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
    const tutte = [...coda, ...posizioni];
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
        await Promise.all([mandaCoda(), mandaPosizioniInAttesa()]);
        disegna(history.state);
        if (leggiLista(K_CODA).length || posizioniInAttesa().length) messaggio('Ancora niente linea: riprovo da solo appena torna.', { errore: true });
      });
    }
    if ($('visto-rifiutate')) $('visto-rifiutate').onclick = () => { scriviLista(K_NON_ARRIVATE, []); disegna(history.state); };
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
      <h3>${urgente ? 'Ha un guasto?' : 'Sospendere la manutenzione?'}</h3>
      <p><strong>${esc(c.nome)}</strong><br>${urgente
        ? 'Lo metto fra gli <strong>urgenti</strong>, in cima alla schermata iniziale, finché non tocchi «Risolto».'
        : 'Non comparirà più fra le scadute: lo trovi nella pagina <strong>Sospese</strong> finché non tocchi «Riattiva».'}</p>
      <label class="campo"><span>${urgente ? 'Cosa è successo?' : 'Perché?'} <em>(facoltativo)</em></span>
        <textarea id="motivo" placeholder="${urgente ? 'Es. perde acqua sotto il lavello' : 'Es. ha venduto casa, richiama lui'}"></textarea></label>
      <button class="btn ${urgente ? 'btn-rosso-pieno' : 'pieno'} grande" type="button" id="si">${icona(urgente ? 'allarme' : 'pausa')} ${urgente ? 'Sì, è urgente' : 'Sì, sospendi'}</button>
      <button class="btn leggero" type="button" id="no">Lascia stare</button>`);
    $('no').onclick = chiudiFinestra;
    $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      if (await salvaAvviso(c, avviso, $('motivo').value)) chiudiFinestra();
    });
  }

  async function salvaAvviso(c, avviso, motivo) {
    try {
      const prima = c.avviso;
      const testo = avviso === 'Urgente' ? 'Segnato urgente' : avviso === 'Sospesa' ? 'Manutenzione sospesa'
        : prima === 'Urgente' ? 'Risolto ✓' : 'Riattivata ✓';
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

  function confermaFatta(c, frequenzaNuova) {
    const mesi = c.frequenza || frequenzaNuova;
    const o = oggi();
    const f = apriFinestra(`
      <h3>Manutenzione fatta oggi?</h3>
      <p><strong>${esc(c.nome)}</strong><br>La prossima sarà il <strong id="anteprima">${testoData(piuMesi(o, mesi))}</strong></p>
      <button class="btn verde grande" type="button" id="si">${icona('spunta')} Sì, fatta oggi</button>
      <div id="altro-giorno" hidden>
        <label class="campo" style="margin-top:14px"><span>Che giorno l'hai fatta?</span>
          <input type="date" id="giorno" max="${isoDa(o)}" value="${isoDa(o)}"></label>
      </div>
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
      $('si').innerHTML = `${icona('spunta')} Sì, fatta il ${due(g.g)}/${due(g.m)}`;
    }
    $('giorno').onchange = aggiornaGiorno;
    $('no').onclick = chiudiFinestra;
    $('si').onclick = (e) => conPulsante(e.currentTarget, 'Salvo…', async () => {
      try {
        const ripristina = fotografia(c);
        // Sempre col giorno: se parte domani (senza campo) resta quello di oggi.
        const fattaIl = giorno || oggi();
        const { r, voce } = await manda('fatta', { codice: c.codice, data: isoDa(fattaIl), frequenza: frequenzaNuova || undefined }, `Manutenzione fatta il ${testoData(fattaIl)}: ${c.nome}`);
        chiudiFinestra();
        if (r) {
          // Aggiorna subito lo schermo, poi rilegge il foglio in sottofondo.
          const x = r.prossima.split('/');
          c.prossima = r.prossima;
          c.prossimaSeriale = serialeDa(+x[2], +x[1], +x[0]);
          if (frequenzaNuova) c.frequenza = frequenzaNuova;
          // Il motore toglie sospesa/urgente quando la manutenzione è fatta.
          c.avviso = '';
          c.motivo = '';
        }
        disegna(history.state);
        // Senza «Annulla» solo se il foglio l'aveva già segnata (richiesta doppia).
        const puoiAnnullare = voce || (r && r.annulla);
        messaggio(`Segnata ✓ Prossima: ${c.prossima}` + (voce ? fuoriLinea(voce) : ''), {
          durata: 15000,
          azione: puoiAnnullare ? { testo: 'Annulla', fai: voce ? () => annullaInCoda(voce, ripristina) : () => annulla(r.annulla, c, ripristina) } : null,
        });
        if (r) aggiornaInSottofondo();
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
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
  const PROVENIENZE = [['Passaparola', 'Passaparola'], ['Meta / Facebook', 'Facebook'], ['Sito web', 'Sito web'], ['Altro', 'Altro']];
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
        <button class="btn verde grande" style="width:100%">${icona('spunta')} ${c ? 'Salva le modifiche' : 'Salva il cliente'}</button>
      </form>`;
    const f = $('f-modulo');
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
      try {
        const { r, voce } = await manda('nuovo', {
          nome: v('nome'), telefono: v('telefono'), indirizzo: v('indirizzo'), citta: v('citta'),
          tipo: v('tipo'), installazione: v('installazione'), frequenza: mesi, note: v('note'),
        }, `Cliente nuovo: ${v('nome').toUpperCase()}`);
        if (voce) {
          // Il codice C0xx lo dà il foglio: la scheda nasce quando arriva.
          history.replaceState({ s: 'home' }, '', location.pathname + location.hash);
          disegna(history.state);
          messaggio('Cliente segnato ✓' + fuoriLinea(voce), { durata: 8000 });
          return;
        }
        if (r.giaPresente) {
          apriFinestra(`
            <h3>${r.perso ? 'È fra i clienti persi' : 'C\'è già un cliente con questo nome'}</h3>
            <p><strong>${esc(r.nome)}</strong> (${esc(r.codice)}) ${r.perso
              ? 'è fra i clienti persi. Non l\'ho aggiunto di nuovo: apri la sua scheda e tocca «È tornato cliente».'
              : 'è già nell\'elenco. Non l\'ho aggiunto di nuovo.'}</p>
            <button class="btn pieno grande" type="button" id="apri">Apri la sua scheda</button>
            <button class="btn leggero" type="button" id="no">Torna al modulo</button>`);
          $('no').onclick = chiudiFinestra;
          $('apri').onclick = () => { history.replaceState({ s: 'cliente', codice: r.codice }, '', location.pathname + location.hash); chiudiFinestra(); disegna(history.state); };
          return;
        }
        await carica().catch(() => {});
        history.replaceState({ s: 'cliente', codice: r.codice }, '', location.pathname + location.hash);
        disegna(history.state);
        messaggio(`Cliente salvato ✓ (${r.codice})`, { durata: 6000 });
      } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
    }
  }

  // ---------------------------------------------------------------------
  //  Avvio
  // ---------------------------------------------------------------------
  history.replaceState(history.state || { s: 'home' }, '', location.pathname + location.hash);
  // Per aprirsi anche senza campo (sw.js). Se il telefono non lo permette, pazienza.
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/gestione/sw.js', { scope: '/gestione/' }).catch(() => {});

  disegna(history.state);

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
    mandaCoda();
    if (Date.now() - (aggiornatoAlle || 0) > 120000) aggiornaInSottofondo();
  });
})();
