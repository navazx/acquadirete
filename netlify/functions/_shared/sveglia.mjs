// La logica della sveglia degli agenti (netlify/functions/sveglia-agenti.mjs),
// tenuta a parte per poterla provare senza Netlify.
//
// Gli orari sono scritti come in un cron di GitHub, in UTC: minuto ora
// giorno-del-mese mese giorno-della-settimana (0 = domenica). Si capiscono
// "*", un numero, un elenco "2,6,10", un intervallo "6-20" e un passo "*/15".

/** Un campo del cron vale per questo numero? */
function vale(campo, n) {
  return campo.split(',').some((pezzo) => {
    const [base, passo] = pezzo.split('/');
    const ogni = passo ? Number(passo) : 1;
    if (base === '*') return n % ogni === 0;
    const [da, a] = base.split('-').map(Number);
    const fine = a === undefined ? da : a;
    return n >= da && n <= fine && (n - da) % ogni === 0;
  });
}

/** Il cron scatta in questo minuto (UTC)? */
export function scatta(cron, quando) {
  const [min, ora, giorno, mese, settimana] = cron.trim().split(/\s+/);
  return vale(min, quando.getUTCMinutes())
    && vale(ora, quando.getUTCHours())
    && vale(giorno, quando.getUTCDate())
    && vale(mese, quando.getUTCMonth() + 1)
    && vale(settimana, quando.getUTCDay());
}

/**
 * L'ultima volta che il cron doveva scattare, guardando indietro fino a
 * `minuti` minuti da `adesso`. Null se in quel tratto non doveva scattare.
 */
export function ultimoAppuntamento(cron, adesso, minuti) {
  const t = new Date(adesso);
  t.setUTCSeconds(0, 0);
  for (let i = 0; i <= minuti; i += 1) {
    if (scatta(cron, t)) return new Date(t);
    t.setUTCMinutes(t.getUTCMinutes() - 1);
  }
  return null;
}

/**
 * Per ogni agente con un appuntamento nelle ultime `ore` ore: se da allora il
 * suo workflow non e' mai partito, lo fa partire. Cosi' un giro saltato si
 * recupera al giro dopo, e un workflow gia' partito (dalla sveglia, da GitHub o
 * a mano) non parte due volte.
 *
 * `github(percorso, opzioni)` fa la chiamata a GitHub e torna { status, dati }.
 * Torna l'elenco di cosa ha fatto, per il log e per gli avvisi.
 */
export async function sveglia(agenti, adesso, github, { ore = 12 } = {}) {
  const esiti = [];
  for (const a of agenti) {
    const quando = ultimoAppuntamento(a.cron, adesso, ore * 60);
    if (!quando) continue;
    const ritardo = Math.round((adesso - quando) / 60000);
    const dal = quando.toISOString().replace(/\.\d+Z$/, 'Z');

    const giri = await github(`/actions/workflows/${a.workflow}/runs?per_page=1&created=${encodeURIComponent(`>=${dal}`)}`);
    if (giri.status !== 200) {
      esiti.push({ ...a, quando, ritardo, esito: 'errore', dettaglio: `non riesco a leggere i giri (HTTP ${giri.status})` });
      continue;
    }
    if (giri.dati.total_count > 0) {
      esiti.push({ ...a, quando, ritardo, esito: 'gia partito' });
      continue;
    }

    const avvio = await github(`/actions/workflows/${a.workflow}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main', ...(a.inputs && { inputs: a.inputs }) }),
    });
    esiti.push(avvio.status === 204
      ? { ...a, quando, ritardo, esito: 'avviato' }
      : { ...a, quando, ritardo, esito: 'errore', dettaglio: `GitHub ha rifiutato l'avvio (HTTP ${avvio.status})` });
  }
  return esiti;
}
