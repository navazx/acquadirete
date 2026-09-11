#!/usr/bin/env node
// ============================================================================
//  SENTINELLA — il sito e' online? Ogni 4 ore su GitHub Actions
//
//  Controlla che le pagine chiave rispondano 200, che l'indirizzo senza www
//  porti a quello con il www, e che il certificato HTTPS sia valido e non stia
//  per scadere. Se e' tutto a posto non manda niente: il silenzio vuol dire ok.
//
//  Sta su GitHub e non su Netlify apposta: un controllo che gira sullo stesso
//  servizio che deve sorvegliare tace proprio quando quel servizio e' giu'.
//
//  Una pagina che non risponde viene riprovata dopo 30 secondi prima di dare
//  l'allarme: un singhiozzo della rete non deve svegliare nessuno.
//
//  Ha preso il posto della routine cloud "monitoraggio-giornaliero-acquadirete",
//  che aveva il token del bot scritto nel prompt.
//
//  Prova:  node scripts/sentinella.mjs --prova
//  Prova di un guasto:  SENTINELLA_EXTRA=/pagina-che-non-esiste/ node scripts/sentinella.mjs --prova
// ============================================================================

import tls from 'node:tls';

const SITO = 'https://www.acquadirete.it';
const HOST = new URL(SITO).host;
const PAGINE = [
  '/',
  '/depuratore-acqua-firenze/',
  '/osmosi-inversa-firenze/',
  '/contatti/',
  '/recensioni/',
  '/sitemap.xml',
  '/robots.txt',
  ...(process.env.SENTINELLA_EXTRA || '').split(',').map((p) => p.trim()).filter(Boolean),
];

// Netlify rinnova il certificato da solo: se mancano pochi giorni vuol dire che
// il rinnovo si e' inceppato. Sotto i 14 si avvisa una volta al giorno, sotto i
// 5 a ogni giro.
const GIORNI_AVVISO = 14;
const GIORNI_URGENTE = 5;

const prova = process.argv.includes('--prova');
const aspetta = (ms) => new Promise((r) => setTimeout(r, ms));

async function risposta(url) {
  try {
    const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'acquadirete-sentinella' } });
    return { stato: res.status, dove: res.headers.get('location') };
  } catch (e) {
    return { stato: 0, errore: e.cause?.code || e.message };
  }
}

async function controllaPagina(percorso) {
  let r = await risposta(`${SITO}${percorso}`);
  if (r.stato !== 200) {
    await aspetta(30000);
    r = await risposta(`${SITO}${percorso}`);
  }
  if (r.stato === 200) return null;
  if (r.stato === 0) return `${percorso} non risponde (${r.errore})`;
  if (r.stato >= 300 && r.stato < 400) return `${percorso} manda altrove (${r.stato} verso ${r.dove}) invece di rispondere`;
  return `${percorso} risponde ${r.stato}`;
}

async function controllaSenzaWww() {
  const r = await risposta('https://acquadirete.it/');
  const ok = r.stato >= 300 && r.stato < 400 && (r.dove || '').startsWith(SITO);
  return ok ? null : `acquadirete.it senza www non porta al sito (risponde ${r.stato || r.errore}${r.dove ? ` verso ${r.dove}` : ''})`;
}

function giorniCertificato() {
  return new Promise((risolvi) => {
    const presa = tls.connect({ host: HOST, port: 443, servername: HOST, timeout: 20000 }, () => {
      const cert = presa.getPeerCertificate();
      const valido = presa.authorized;
      presa.end();
      risolvi({ valido, errore: presa.authorizationError, giorni: Math.floor((new Date(cert.valid_to) - Date.now()) / 86400000) });
    });
    presa.on('error', (e) => risolvi({ valido: false, errore: e.code || e.message, giorni: null }));
    presa.on('timeout', () => { presa.destroy(); risolvi({ valido: false, errore: 'nessuna risposta', giorni: null }); });
  });
}

async function main() {
  const problemi = [];

  const esiti = await Promise.all(PAGINE.map(controllaPagina));
  problemi.push(...esiti.filter(Boolean));

  const www = await controllaSenzaWww();
  if (www) problemi.push(www);

  const cert = await giorniCertificato();
  const primoGiroDelGiorno = new Date().getUTCHours() < 10;
  if (!cert.valido) {
    problemi.push(`certificato HTTPS non valido (${cert.errore}): i browser mostrano l'avviso di sito non sicuro`);
  } else if (cert.giorni < GIORNI_URGENTE || (cert.giorni < GIORNI_AVVISO && primoGiroDelGiorno)) {
    problemi.push(`il certificato HTTPS scade fra ${cert.giorni} giorni: Netlify dovrebbe rinnovarlo da solo, controlla il pannello`);
  }

  const riepilogo = `${PAGINE.length} pagine, certificato ${cert.valido ? `valido ancora ${cert.giorni} giorni` : 'NON valido'}`;

  if (!problemi.length) {
    console.log(`Tutto a posto: ${riepilogo}.`);
    return;
  }

  const ora = new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' });
  const testo = `Il sito ha un problema — ${ora}\n\n${problemi.map((p) => `• ${p}`).join('\n')}\n\nwww.acquadirete.it`;

  if (prova) {
    console.log(`(prova: niente Telegram)\n${riepilogo}.\n\n${testo}`);
    return;
  }
  const { messaggio } = await import('./lib/telegram.mjs');
  await messaggio(testo);
  console.log(`Allarme inviato: ${problemi.length} problemi.`);
  // Il giro risulta fallito anche in Actions: si vede a colpo d'occhio.
  process.exitCode = 1;
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
