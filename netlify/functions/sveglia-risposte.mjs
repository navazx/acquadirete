// Funzione programmata: la sveglia del lettore delle risposte su Telegram.
//
// Il lettore vero (scripts/risposte.mjs) gira su GitHub Actions, perche' li'
// puo' unire le proposte a main e ha il token di Meta. Ma GitHub i giri
// programmati li fa partire quando gli pare: il 12 set 2026 ne ha fatti 5
// invece di 29, e un APPROVA di Matteo e' rimasto fermo per ore.
//
// Questa funzione non legge ne' esegue niente. Ogni 15 minuti chiede a Telegram
// se c'e' qualche messaggio in sospeso e, solo se c'e', fa partire subito il
// workflow "Risposte su Telegram". Un avvio a mano (workflow_dispatch) GitHub
// lo esegue in pochi secondi, al contrario dei giri programmati.
//
// PERCHE' NON RUBA I MESSAGGI: getUpdates chiamato SENZA offset non segna
// niente come letto. Telegram considera letto un messaggio solo quando qualcuno
// chiede gli aggiornamenti con un offset piu' alto, e questo lo fa soltanto
// risposte.mjs. Qui si guarda, non si tocca.
//
// Variabili su Netlify:
//   TELEGRAM_BOT_TOKEN      — c'e' gia' (avvisi dei lead)
//   GITHUB_DISPATCH_TOKEN   — token GitHub a grana fine, SOLO sul repo
//                             navazx/acquadirete, SOLO permesso "Actions: write".
//                             Non puo' leggere o cambiare il codice.
//
// Cron in UTC: dalle 05 alle 20:45, cioe' circa 07-23 d'estate e 06-22 d'inverno.
// Di notte no: nessuno approva un articolo alle 3.

const REPO = 'navazx/acquadirete';
const WORKFLOW = 'risposte.yml';

export default async () => {
  const bot = process.env.TELEGRAM_BOT_TOKEN;
  const github = process.env.GITHUB_DISPATCH_TOKEN;
  if (!bot || !github) {
    console.log(`Sveglia ferma: manca ${!bot ? 'TELEGRAM_BOT_TOKEN' : 'GITHUB_DISPATCH_TOKEN'} fra le variabili di Netlify.`);
    return;
  }

  // Solo uno sguardo: limit 1, niente offset, niente attesa.
  const tg = await fetch(`https://api.telegram.org/bot${bot}/getUpdates?limit=1&timeout=0`).then((r) => r.json());
  if (!tg.ok) {
    console.log(`Telegram non risponde come dovrebbe: ${tg.description}`);
    return;
  }
  if (!tg.result.length) {
    console.log('Nessun messaggio in sospeso.');
    return;
  }

  const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${github}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  // 204 = partito. Se il lettore e' gia' in corsa, GitHub mette in fila questo
  // giro (concurrency nel workflow): non ci sono doppie esecuzioni.
  console.log(res.status === 204 ? 'Messaggio in sospeso: lettore avviato.' : `GitHub ha rifiutato l'avvio: HTTP ${res.status} ${await res.text()}`);
};

export const config = {
  schedule: '*/15 5-20 * * *',
};
