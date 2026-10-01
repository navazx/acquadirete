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

  const normalizza = (s) => String(s == null ? '' : s).toLowerCase()
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
  async function api(azione, datiAzione) {
    let res;
    try {
      res = await fetch(API, azione
        ? { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Chiave': chiave || '' }, body: JSON.stringify({ azione, dati: datiAzione }) }
        : { headers: { 'X-Chiave': chiave || '' }, cache: 'no-store' });
    } catch {
      throw Object.assign(new Error('Niente linea. Riprova quando c\'è campo.'), { linea: true });
    }
    let corpo = {};
    try { corpo = await res.json(); } catch { /* risposta vuota */ }
    if (res.status === 401) {
      memoria.togli(K_CHIAVE);
      chiave = null;
      throw Object.assign(new Error('Codice di attivazione non valido.'), { chiave: true });
    }
    if (!res.ok || !corpo.ok) throw new Error(corpo.errore || 'Qualcosa non ha funzionato. Riprova tra poco.');
    return corpo;
  }

  let caricando = null;
  function carica() {
    if (!caricando) {
      caricando = api().then((r) => {
        dati = { oggi: r.oggi, clienti: r.clienti, lead: r.lead, persi: r.persi || [], stati: r.stati };
        aggiornatoAlle = Date.now();
        memoria.scrivi(K_DATI, JSON.stringify({ dati, quando: aggiornatoAlle }));
        $('avviso').hidden = true;
        return dati;
      }).finally(() => { caricando = null; });
    }
    return caricando;
  }

  // Ricarica in sottofondo e ridisegna lo schermo, senza disturbare se
  // intanto è aperta una finestra di conferma.
  function aggiornaInSottofondo() {
    carica().then(() => { if ($('finestra').hidden) disegna(history.state); })
      .catch((err) => { if (err.chiave) disegna({ s: 'attiva' }); });
  }

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
    const schermi = { home: schermoHome, scadenze: schermoScadenze, cliente: schermoCliente, lead: schermoLead, schedaLead: schermoSchedaLead, cerca: schermoCerca, nuovo: schermoModulo, modifica: schermoModulo, nuovoLead: schermoNuovoLead, persi: schermoPersi };
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
      if (s.giorni < 0 && s.giorni >= -365) scadute++;
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
          <span><b>Contatti da richiamare</b>
          <small>${daRichiamare ? `<span class="n-rosso">${daRichiamare} da richiamare</span>` : 'Nessuno da richiamare'}${risentire ? ` · ${risentire} da risentire` : ''}</small></span>
        </button>
        <button class="tessera" data-vai="cerca">
          <span class="ico">${icona('cerca')}</span>
          <span><b>Cerca un cliente</b><small>Per nome, città o telefono</small></span>
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

  // Città di un cliente come chiave di confronto ("59100 PRATO" = "Prato").
  const chiaveCitta = (c) => normalizza(senzaCap(c.citta));
  // Città "piccola" = al massimo tanti clienti in pagina: va nel tasto della sua zona.
  const CITTA_PICCOLA = 2;
  // Nomi delle zone del giro (Z1-ZX, vedi netlify/functions/_shared/zone.mjs)
  // come li dice babbo, per i tasti che raggruppano le città piccole.
  const NOMI_ZONE = {
    // Nomi che non si confondono coi tasti delle città grandi lì accanto
    // (Pistoia, Lastra a Signa, Empoli hanno il loro).
    Z1: 'Altre di Firenze', Z2: 'Campi e Signa', Z3: 'Chianti e Bagno a Ripoli',
    Z4: 'Valdelsa', Z5: 'Dintorni di Prato', Z6: 'Valdinievole e Quarrata',
    Z7: 'Valdarno e Sieve', Z8: 'Mugello', ZX: 'Fuori zona',
  };

  // Tre pagine: "Da fare" (scadute e in scadenza), "Urgenti" (hanno chiamato
  // per un guasto) e "Sospese" (senza data, finché non si riattivano). Sotto,
  // una riga di tasti con le città di quella pagina (le più piene prima): se
  // ne toccano una o più per il giro, «Tutte» toglie il filtro.
  const VISTE = [['fare', 'Da fare'], ['urgenti', 'Urgenti'], ['sospese', 'Sospese']];
  function schermoScadenze(stato) {
    titolo('Manutenzioni', true);
    const vista = VISTE.some(([v]) => v === stato.vista) ? stato.vista : 'fare';
    const { urgenti, sospese } = contaScadenze();
    const conta = { fare: null, urgenti, sospese };
    let scelte = new Set(Array.isArray(stato.citta) ? stato.citta : []);

    // Chi sta in questa pagina, prima del filtro per città.
    const tipo = vista === 'urgenti' ? 'Urgente' : 'Sospesa';
    const inPagina = vista === 'fare'
      ? dati.clienti.filter((c) => { if (c.avviso) return false; const s = scadenza(c); return s.giorni != null && s.giorni <= 60; })
      : dati.clienti.filter((c) => c.avviso === tipo);

    // Tasti delle città: quante ce ne sono in questa pagina, dalla più piena.
    const perCitta = new Map();
    inPagina.forEach((c) => {
      const k = chiaveCitta(c);
      if (!k) return;
      const x = perCitta.get(k) || { k, nome: titoloCitta(c.citta), n: 0, zone: {} };
      x.n++;
      if (c.zona) x.zone[c.zona] = (x.zone[c.zona] || 0) + 1;
      perCitta.set(k, x);
    });
    // Le città con pochi clienti (1 o 2) si uniscono in un tasto per zona del
    // giro, chiamato col nome della zona e non col codice Z: sono vicine, e
    // 45 tasti da uno o due clienti sarebbero solo da scorrere. Se in una zona
    // la città piccola è una sola, resta col suo nome.
    const tasti = [];
    const piccolePerZona = new Map();
    for (const x of perCitta.values()) {
      const zona = Object.keys(x.zone).sort((a, b) => x.zone[b] - x.zone[a])[0];
      if (x.n <= CITTA_PICCOLA && NOMI_ZONE[zona]) {
        if (!piccolePerZona.has(zona)) piccolePerZona.set(zona, []);
        piccolePerZona.get(zona).push(x);
      } else {
        tasti.push({ id: x.k, nome: x.nome, chiavi: [x.k], n: x.n });
      }
    }
    for (const [zona, citta] of piccolePerZona) {
      if (citta.length === 1) tasti.push({ id: citta[0].k, nome: citta[0].nome, chiavi: [citta[0].k], n: citta[0].n });
      else tasti.push({ id: 'zona:' + zona, nome: NOMI_ZONE[zona], chiavi: citta.map((x) => x.k), n: citta.reduce((s, x) => s + x.n, 0), gruppo: citta.map((x) => x.nome) });
    }
    // Una città scelta prima resta visibile anche se qui non ha clienti.
    const inUnTasto = new Set(tasti.flatMap((t) => t.chiavi));
    scelte.forEach((k) => { if (!inUnTasto.has(k)) tasti.push({ id: k, nome: titoloCitta(k), chiavi: [k], n: 0 }); });
    tasti.sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'it'));
    const perId = new Map(tasti.map((t) => [t.id, t]));
    const premuto = (t) => t.chiavi.every((k) => scelte.has(k));
    const tastiCitta = tasti;

    schermo.innerHTML = `
      <div class="pillole">${VISTE.map(([v, t]) => `<button class="pillola${v === 'urgenti' && urgenti ? ' pillola-rossa' : ''}" data-vista="${v}" aria-pressed="${vista === v}">${t}${conta[v] != null ? ` (${conta[v]})` : ''}</button>`).join('')}</div>
      ${tastiCitta.length > 1 || scelte.size ? `<div class="pillole pillole-citta">
        <button class="pillola" data-citta="" aria-pressed="${!scelte.size}">Tutte</button>
        ${tastiCitta.map((t) => `<button class="pillola${t.gruppo ? ' pillola-gruppo' : ''}" data-citta="${esc(t.id)}" aria-pressed="${premuto(t)}"${t.gruppo ? ` title="${esc(t.gruppo.join(', '))}"` : ''}>${esc(t.nome)} (${t.n})</button>`).join('')}
      </div>` : ''}
      <div id="elenco"></div>`;

    function elenco() {
      history.replaceState({ s: 'scadenze', citta: [...scelte], vista }, '', location.pathname + location.hash);
      schermo.querySelectorAll('[data-citta]').forEach((b) => {
        const t = perId.get(b.dataset.citta);
        b.setAttribute('aria-pressed', String(b.dataset.citta ? !!t && premuto(t) : !scelte.size));
      });
      // Se è scelto un gruppo, sopra l'elenco si legge quali città contiene.
      const gruppiScelti = tastiCitta.filter((t) => t.gruppo && premuto(t));
      const nota = gruppiScelti.map((t) => `<p class="gruppo-citta"><b>${esc(t.nome)}:</b> ${esc(t.gruppo.join(', '))}</p>`).join('');
      const inCitta = scelte.size ? inPagina.filter((c) => scelte.has(chiaveCitta(c))) : inPagina;

      if (vista !== 'fare') {
        // Gli urgenti dal più vecchio (chi aspetta da più tempo in cima), le sospese per nome.
        const lista = inCitta.slice()
          .sort(vista === 'urgenti' ? (a, b) => leggiMotivo(a).t - leggiMotivo(b).t : (a, b) => a.nome.localeCompare(b.nome, 'it'));
        $('elenco').innerHTML = nota + (lista.length
          ? `<div class="lista">${lista.map((c) => voceCliente(c)).join('')}</div>`
          : scelte.size ? '<div class="vuoto">Nessuno in queste città.</div>'
          : vista === 'urgenti'
            ? `<div class="vuoto">Nessun cliente urgente 👍<br><br>Se un cliente chiama per un guasto: cercalo e nella sua scheda tocca «Ha un guasto».<br><br><button class="btn pieno" id="vai-cerca" style="width:100%">${icona('cerca')} Cerca il cliente</button></div>`
            : '<div class="vuoto">Nessuna manutenzione sospesa.<br><br>Per sospenderne una: nella scheda del cliente tocca «Rimanda la manutenzione» e poi «Sospendi, senza data».</div>');
        if ($('vai-cerca')) $('vai-cerca').onclick = () => vai({ s: 'cerca' });
        collegaVoci();
        return;
      }
      const conGiorni = inCitta.map((c) => ({ c, s: scadenza(c) }));
      const perData = (x, y) => x.c.prossimaSeriale - y.c.prossimaSeriale;
      const scadute = conGiorni.filter((x) => x.s.giorni < 0 && x.s.giorni >= -365).sort(perData);
      const presto = conGiorni.filter((x) => x.s.giorni >= 0 && x.s.giorni <= 60).sort(perData);
      const vecchie = conGiorni.filter((x) => x.s.giorni < -365).sort(perData).reverse();
      $('elenco').innerHTML = nota + `
        <h2 class="gruppo">Scadute (${scadute.length})</h2>
        <div class="lista">${scadute.map((x) => voceCliente(x.c)).join('') || '<div class="vuoto">Nessuna manutenzione scaduta 👍</div>'}</div>
        <h2 class="gruppo">Nei prossimi 2 mesi (${presto.length})</h2>
        <div class="lista">${presto.map((x) => voceCliente(x.c)).join('') || '<div class="vuoto">Niente in scadenza</div>'}</div>
        ${vecchie.length ? `<button class="mostra-altri" id="vecchie">Scadute da più di un anno (${vecchie.length})</button><div class="lista" id="lista-vecchie" hidden style="margin-top:10px">${vecchie.map((x) => voceCliente(x.c)).join('')}</div>` : ''}`;
      if ($('vecchie')) $('vecchie').onclick = () => { $('vecchie').hidden = true; $('lista-vecchie').hidden = false; };
      collegaVoci();
    }

    // Toccare una città la aggiunge al giro (o la toglie); «Tutte» azzera.
    // Si ridisegna solo l'elenco: la riga dei tasti resta dov'era scorsa.
    schermo.querySelectorAll('[data-citta]').forEach((b) => {
      b.onclick = () => {
        const t = perId.get(b.dataset.citta);
        if (!t) scelte = new Set();
        else if (premuto(t)) t.chiavi.forEach((k) => scelte.delete(k));
        else t.chiavi.forEach((k) => scelte.add(k));
        elenco();
      };
    });
    schermo.querySelectorAll('[data-vista]').forEach((b) => {
      b.onclick = () => { history.replaceState({ s: 'scadenze', citta: [...scelte], vista: b.dataset.vista }, '', location.pathname + location.hash); disegna(history.state); };
    });
    elenco();
  }

  // ---------------------------------------------------------------------
  //  Scheda cliente
  // ---------------------------------------------------------------------
  function pulsantiContatto(testo, indirizzo) {
    const nums = telefoni(testo);
    const mail = email(testo);
    let html = nums.map((n) => `<a class="btn pieno largo" href="tel:${esc(n.tel)}">${icona('telefono')} Chiama ${esc(n.mostra)}</a>`).join('');
    const cell = nums.find((n) => n.cellulare);
    if (cell) html += `<a class="btn" href="https://wa.me/${esc(cell.wa)}" target="_blank" rel="noopener">${icona('messaggio')} WhatsApp</a>`;
    if (indirizzo) html += `<a class="btn" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}" target="_blank" rel="noopener">${icona('mappa')} Portami lì</a>`;
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
    const azioni = pulsantiContatto(c.contatto, c.indirizzo || c.citta ? indirizzoCompleto : '');
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
        const r = await api('sposta', { codice: c.codice, verso });
        await carica();
        chiudiFinestra();
        disegna(history.state);
        messaggio(persi ? 'Spostato fra i clienti persi' : 'È di nuovo fra i clienti ✓', {
          durata: 15000,
          azione: { testo: 'Annulla', fai: () => api('sposta', r.annulla).then(() => carica()).then(() => { disegna(history.state); messaggio('Annullato.'); }).catch((err) => messaggio(err.message, { errore: true, durata: 8000 })) },
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
      const r = await api('avviso', { codice: c.codice, avviso, motivo });
      const prima = c.avviso;
      c.avviso = r.avviso;
      c.motivo = r.motivo;
      chiudiFinestra();
      disegna(history.state);
      const testo = avviso === 'Urgente' ? 'Segnato urgente' : avviso === 'Sospesa' ? 'Manutenzione sospesa'
        : prima === 'Urgente' ? 'Risolto ✓' : 'Riattivata ✓';
      messaggio(testo, {
        durata: 15000,
        azione: { testo: 'Annulla', fai: () => api('avviso', r.annulla).then(() => carica()).then(() => { disegna(history.state); messaggio('Annullato.'); }).catch((err) => messaggio(err.message, { errore: true, durata: 8000 })) },
      });
      aggiornaInSottofondo();
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
    const rimanda = (btn, dati) => conPulsante(btn, 'Salvo…', async () => {
      try {
        const r = await api('rimanda', { codice: c.codice, ...dati });
        chiudiFinestra();
        const x = r.prossima.split('/');
        c.prossima = r.prossima;
        c.prossimaSeriale = serialeDa(+x[2], +x[1], +x[0]);
        disegna(history.state);
        messaggio(`Rimandata al ${r.prossima}`, {
          durata: 15000,
          azione: { testo: 'Annulla', fai: () => annulla(r.annulla) },
        });
        aggiornaInSottofondo();
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
    $('finestra').querySelectorAll('[data-mesi]').forEach((b) => { b.onclick = () => rimanda(b, { mesi: +b.dataset.mesi }); });
    $('altro').onclick = () => { $('altro-giorno').hidden = false; $('altro').hidden = true; $('giorno').focus(); };
    $('si-giorno').onclick = (e) => {
      if (!daIso($('giorno').value)) { messaggio('Scegli prima il giorno.', { errore: true }); return; }
      rimanda(e.currentTarget, { data: $('giorno').value });
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
        const r = await api('fatta', { codice: c.codice, data: giorno ? isoDa(giorno) : undefined, frequenza: frequenzaNuova || undefined });
        chiudiFinestra();
        // Aggiorna subito lo schermo, poi rilegge il foglio in sottofondo.
        const x = r.prossima.split('/');
        c.prossima = r.prossima;
        c.prossimaSeriale = serialeDa(+x[2], +x[1], +x[0]);
        if (frequenzaNuova) c.frequenza = frequenzaNuova;
        // Il motore toglie sospesa/urgente quando la manutenzione è fatta.
        if (r.annulla && r.annulla.avvisoPrima) { c.avviso = ''; c.motivo = ''; }
        disegna(history.state);
        messaggio(`Segnata ✓ Prossima: ${r.prossima}`, {
          durata: 15000,
          azione: { testo: 'Annulla', fai: () => annulla(r.annulla) },
        });
        aggiornaInSottofondo();
      } catch (err) {
        messaggio(err.message, { errore: true, durata: 8000 });
      }
    });
  }

  async function annulla(datiAnnulla) {
    try {
      await api('annulla', datiAnnulla);
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
    'Da richiamare': 'Da richiamare',
    'Contattato': 'L\'ho sentito',
    'Preventivo inviato': 'Gli ho mandato il preventivo',
    'Cliente': 'È diventato cliente',
    // Sentiti ma non interessati, o perditempo: si chiude la partita, e non
    // tornano piu' fra quelli da risentire (30 set 2026, richiesta di Matteo).
    'Non interessato': 'Non gli interessa',
  };
  const RISENTIRE = 'risentire';
  const FILTRI_LEAD = [
    ['Da richiamare', 'Da richiamare'],
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
      conPulsante(f.querySelector('button.verde'), 'Salvo…', async () => {
        try {
          const r = await api('nuovoLead', {
            nome: v('nome'), telefono: v('telefono'), email: v('email'), citta: v('citta'),
            provenienza, interesse: v('interesse'), note: v('note'),
          });
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
          const r = await api('nota', { riga: l.riga, data: l.data, nome: l.nome, nota: testo });
          l.note = r.note;
          disegna(history.state);
          messaggio('Nota salvata ✓');
        } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
      });
    };
  }

  async function salvaStato(l, nuovo) {
    try {
      const r = await api('stato', { riga: l.riga, data: l.data, nome: l.nome, stato: nuovo });
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
  function schermoCerca(stato) {
    titolo('Cerca un cliente', true);
    const persi = dati.persi || [];
    schermo.innerHTML = `
      <div class="cerca"><input type="search" id="q" placeholder="Nome, città o telefono" autocomplete="off" enterkeyhint="search" value="${esc(stato.q || '')}"></div>
      <div class="lista" id="risultati"></div>
      ${persi.length ? `<button class="mostra-altri" id="vai-persi">Clienti persi (${persi.length})</button>` : ''}`;
    if ($('vai-persi')) $('vai-persi').onclick = () => vai({ s: 'persi' });
    const q = $('q');
    // Anche i persi: se uno richiama, lo si ritrova (con l'etichetta "Cliente perso").
    const indice = dati.clienti.concat(persi).map((c) => ({
      c,
      testo: normalizza([c.nome, c.citta, c.indirizzo, c.codice, c.tipo].join(' ')),
      cifre: String(c.contatto).replace(/\D/g, ''),
    }));
    function cerca() {
      const v = q.value;
      history.replaceState({ s: 'cerca', q: v }, '', location.pathname + location.hash);
      const parole = normalizza(v).split(' ').filter(Boolean);
      const cifre = v.replace(/\D/g, '');
      if (!parole.length) { $('risultati').innerHTML = '<div class="vuoto">Scrivi un pezzo del nome, la città o il numero di telefono.</div>'; return; }
      const trovati = indice.filter((x) =>
        (cifre.length >= 4 && x.cifre.includes(cifre)) || parole.every((p) => x.testo.includes(p))
      ).slice(0, 60);
      $('risultati').innerHTML = trovati.map((x) => voceCliente(x.c)).join('') || '<div class="vuoto">Nessun cliente trovato</div>';
      collegaVoci();
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
        await api('modifica', { codice: c.codice, campi });
        await carica().catch(() => {});
        history.back();
        messaggio('Dati salvati ✓');
      } catch (err) { messaggio(err.message, { errore: true, durata: 8000 }); }
    }

    async function salvaNuovo() {
      try {
        const r = await api('nuovo', {
          nome: v('nome'), telefono: v('telefono'), indirizzo: v('indirizzo'), citta: v('citta'),
          tipo: v('tipo'), installazione: v('installazione'), frequenza: mesi, note: v('note'),
        });
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
  disegna(history.state);

  if (chiave && dati) {
    // Mostra subito i dati salvati, intanto rilegge il foglio.
    carica().then(() => { if ($('finestra').hidden) disegna(history.state); }).catch((err) => {
      if (err.chiave) return disegna({ s: 'attiva' });
      const alle = aggiornatoAlle ? new Date(aggiornatoAlle).toLocaleString('it-IT', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';
      $('avviso').textContent = `Senza linea: vedi i dati del ${alle}. Per segnare le cose serve la linea.`;
      $('avviso').hidden = false;
    });
  }

  // Tornando sull'app dopo un po' (es. dal telefono dopo una chiamata), rilegge.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && chiave && Date.now() - (aggiornatoAlle || 0) > 120000) aggiornaInSottofondo();
  });
})();
