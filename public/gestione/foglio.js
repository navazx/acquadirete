// Il foglio di lavoro di un cliente, stampato dall'app (3 nov 2026, Matteo: «dall'app
// si possa stampare il foglio di lavoro dei clienti»). È lo stesso modulo del menu
// «Foglio di lavoro» del Gestionale: public/moduli/rapportino-modello.html, che
// nasce da moduli/rapportino-intervento.html. Qui non si ridisegna niente: si
// riempiono i segnaposto e si stampa.
// I dati arrivano dall'app nella memoria della scheda (sessionStorage), mai
// nell'indirizzo, e non escono dal telefono.
// Regole in copia doppia: fuga, caselle, dividiCitta, soloTelefono e soloEmail sono le
// gemelle di costruisci() in RapportinoWebApp.gs (documenti/rapportino-webapp/Codice.gs).
// Se cambia una, cambia l'altra.
(async () => {
  const K_FOGLIO = 'gestione-foglio';
  const MODELLO = '/moduli/rapportino-modello.html';
  const LOGO_SITO = 'https://www.acquadirete.it/logo.png';
  const LARGHEZZA_FOGLIO = 794; // 210 mm a schermo

  const ferma = (testo) => { document.getElementById('attesa').textContent = testo; };
  const fuga = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // Le caselle si barrano solo quando il nome dell'impianto lo dice chiaramente.
  const caselle = (tipo) => {
    const t = String(tipo).toLowerCase();
    return {
      K_OSMOSI: /(osmosi|\bgpd\b)/.test(t) ? 'x' : '',
      K_MICRO: /microfiltr/.test(t) ? 'x' : '',
      K_CARBONI: /carbon/.test(t) ? 'x' : '',
      K_GASATORE: /(gasat|frizzant|gassat|soda|co2|bombola)/.test(t) ? 'x' : '',
    };
  };
  // "50025 MONTESPERTOLI" → CAP e comune; "FIRENZE" → il CAP resta da scrivere a penna.
  const dividiCitta = (citta) => {
    const s = String(citta).replace(/\s+/g, ' ').trim();
    const m = s.match(/^(\d{5})\s+(.*)$/);
    return m ? { CAP: m[1], COMUNE: m[2].trim() } : { CAP: '', COMUNE: s };
  };
  // Tiene tutto tranne le email: in cella ci sono spesso fisso, cellulari e nomi.
  const soloTelefono = (contatto) => String(contatto).split(/[\s;,]+/)
    .filter((p) => /[a-z0-9]/i.test(p) && !p.includes('@')).join(' ');
  const soloEmail = (contatto) => String(contatto).split(/[\s;,/]+/).find((p) => p.includes('@')) || '';

  let dati = null;
  try { dati = JSON.parse(sessionStorage.getItem(K_FOGLIO)); } catch { /* resta null */ }
  if (!dati || !dati.codice) { ferma('Il foglio di lavoro si apre dalla scheda del cliente, nell\'app.'); return; }

  let html;
  try {
    const r = await fetch(MODELLO, { cache: 'no-cache' });
    if (!r.ok) throw new Error(String(r.status));
    html = await r.text();
  } catch {
    ferma('Non riesco a prendere il foglio di lavoro: serve il campo. Riprova quando c\'è linea.');
    return;
  }

  const valori = {
    CODICE: dati.codice,
    NOME: dati.nome,
    INDIRIZZO: dati.indirizzo,
    ...dividiCitta(dati.citta || ''),
    TELEFONO: soloTelefono(dati.contatto || ''),
    EMAIL: soloEmail(dati.contatto || ''),
    DATA_INSTALLAZIONE: dati.installazione,
    // Il tipo dell'impianto è il nome commerciale: va sempre nel campo Modello.
    MODELLO: dati.tipo,
    ...caselle(dati.tipo || ''),
  };
  for (const [chiave, valore] of Object.entries(valori)) html = html.split(`{{${chiave}}}`).join(fuga(valore));

  // Sul telefono il foglio si rimpicciolisce per starci tutto, i pulsanti no. Vale
  // solo a schermo: in stampa restano le misure del modulo.
  const aggiunte = `<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @media screen {
    .foglio { zoom: var(--scala, 1); }
    .barra-compila { flex-wrap: wrap; gap: 10px; padding: 8px 12px; font-size: 16px; }
    .barra-compila button { min-height: 48px; padding: 0 18px; border-radius: 10px; font-size: 18px; }
    body.compilabile { padding-top: var(--barra, 76px); }
  }
  @media screen and (max-width: 700px) { .barra-compila .nota { display: none; } }
</style>
</head>`;
  html = html.replace('</head>', () => aggiunte)
    .replace(LOGO_SITO, '/logo.png')
    .replace(/<title>[^<]*<\/title>/, () => `<title>Foglio di lavoro ${fuga(dati.nome || dati.codice)}</title>`);

  document.open();
  document.write(html);
  document.close();

  // La barra e i campi correggibili li crea lo script del modello. Qui si aggiunge
  // solo la strada per tornare all'app.
  const barra = document.querySelector('.barra-compila');
  if (barra) {
    const torna = document.createElement('button');
    torna.type = 'button';
    torna.textContent = 'Torna all\'app';
    torna.addEventListener('click', () => {
      if (history.length > 1) history.back();
      else location.href = '/gestione/';
    });
    barra.prepend(torna);
  }
  const misura = () => {
    const stile = document.documentElement.style;
    // Non innerWidth: sul telefono si allarga da sola quando il foglio non ci sta.
    const larga = Math.min(screen.width, document.documentElement.clientWidth);
    stile.setProperty('--scala', Math.min(1, larga / LARGHEZZA_FOGLIO).toFixed(3));
    if (barra) stile.setProperty('--barra', `${barra.offsetHeight + 12}px`);
  };
  addEventListener('resize', misura);
  misura();

  // La stampa parte da sola una volta, come dal Gestionale, quando il logo è pronto.
  // Ricaricando la pagina non riparte: resta il pulsante.
  if (!dati.stampa) return;
  sessionStorage.setItem(K_FOGLIO, JSON.stringify({ ...dati, stampa: false }));
  const logo = document.querySelector('.testata img');
  if (logo && logo.decode) await logo.decode().catch(() => {});
  setTimeout(() => window.print(), 400);
})();
