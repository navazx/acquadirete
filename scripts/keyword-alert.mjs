// ============================================================================
//  Alert posizionamento keyword: avvisa su Telegram quando una parola chiave
//  entra in prima pagina (o nel podio), fa un balzo, oppure peggiora forte.
//  Gira su GitHub Actions (.github/workflows/keyword-alert.yml), ogni lunedì.
//
//  Confronta gli ultimi 28 giorni con i 28 precedenti (finestre mobili: su un
//  sito piccolo finestre più corte sarebbero troppo rumorose).
//
//  Manda un messaggio SOLO se c'è qualcosa di rilevante: nessuna novità =
//  nessun avviso.
//
//  Test in locale (stampa a schermo, non invia):
//    GSC_KEY_FILE="C:/.../seo-report/gsc-key.json" node scripts/keyword-alert.mjs
// ============================================================================

import {
  getAccessToken, query, sendTelegram, ymd, windows, TELEGRAM_READY,
} from './lib/gsc.mjs';

// Keyword strategiche: il loro stato viene sempre riepilogato quando si invia
// un avviso. Il confronto è per sottostringa (match anche su varianti).
const WATCHLIST = [
  'depuratore acqua firenze',
  'depuratori acqua firenze',
  'depuratore acqua prato',
  'depuratori acqua prato',
  'depuratore acqua pistoia',
  'osmosi inversa firenze',
  'assistenza depuratori',
];

// Sotto questa soglia di impressioni una query è troppo rara per trarne
// conclusioni: la ignoro, a meno che non sia in watchlist.
const MIN_IMPRESSIONS = 3;
const PAGE_1 = 10;
const PODIUM = 3;
const BIG_MOVE = 10; // posizioni guadagnate/perse per considerarlo un balzo/calo

const { start, end, prevStart, prevEnd } = windows();

const isWatched = (q) => WATCHLIST.some((w) => q.includes(w));

function toMap(res) {
  const m = new Map();
  (res.rows || []).forEach((r) => {
    m.set(r.keys[0], { pos: r.position, impr: r.impressions, clicks: r.clicks });
  });
  return m;
}

async function main() {
  const token = await getAccessToken();
  const base = { dimensions: ['query'], rowLimit: 200 };

  const [curRes, prevRes] = await Promise.all([
    query(token, { ...base, startDate: ymd(start), endDate: ymd(end) }),
    query(token, { ...base, startDate: ymd(prevStart), endDate: ymd(prevEnd) }),
  ]);

  const cur = toMap(curRes);
  const prev = toMap(prevRes);

  const wins = [];
  const losses = [];

  for (const [q, c] of cur) {
    if (c.impr < MIN_IMPRESSIONS && !isWatched(q)) continue;

    const p = prev.get(q);
    const curPos = c.pos;

    // Query nuova: segnalo solo se nasce già in prima pagina.
    if (!p) {
      if (curPos <= PAGE_1) {
        wins.push(`🆕 "${q}" — nuova in prima pagina (pos ${curPos.toFixed(0)})`);
      }
      continue;
    }

    const prevPos = p.pos;
    const delta = prevPos - curPos; // positivo = migliorata

    if (curPos <= PODIUM && prevPos > PODIUM) {
      wins.push(`🏆 "${q}" — nel PODIO! pos ${prevPos.toFixed(0)} → ${curPos.toFixed(0)}`);
    } else if (curPos <= PAGE_1 && prevPos > PAGE_1) {
      wins.push(`🎉 "${q}" — in PRIMA PAGINA! pos ${prevPos.toFixed(0)} → ${curPos.toFixed(0)}`);
    } else if (delta >= BIG_MOVE) {
      wins.push(`📈 "${q}" — balzo di ${delta.toFixed(0)} posizioni: ${prevPos.toFixed(0)} → ${curPos.toFixed(0)}`);
    } else if (curPos > PAGE_1 && prevPos <= PAGE_1) {
      losses.push(`⚠️ "${q}" — uscita dalla prima pagina: ${prevPos.toFixed(0)} → ${curPos.toFixed(0)}`);
    } else if (delta <= -BIG_MOVE) {
      losses.push(`📉 "${q}" — calo di ${Math.abs(delta).toFixed(0)} posizioni: ${prevPos.toFixed(0)} → ${curPos.toFixed(0)}`);
    }
  }

  if (!wins.length && !losses.length) {
    console.log('Nessun movimento rilevante: nessun avviso inviato.');
    return;
  }

  let msg = '';
  msg += '🔔 ALERT KEYWORD — acquadirete.it\n';
  msg += `📅 ultimi 28gg (${ymd(start)} → ${ymd(end)}) vs 28 precedenti\n`;
  if (wins.length) {
    msg += '━━━━━━━━━━━━━━\n✅ BUONE NOTIZIE\n';
    wins.forEach((w) => { msg += `${w}\n`; });
  }
  if (losses.length) {
    msg += '━━━━━━━━━━━━━━\n⚠️ DA TENERE D\'OCCHIO\n';
    losses.forEach((l) => { msg += `${l}\n`; });
  }

  // Stato delle keyword strategiche: utile come contesto quando si invia.
  msg += '━━━━━━━━━━━━━━\n📍 Keyword monitorate:\n';
  let shown = 0;
  for (const [q, c] of [...cur].sort((a, b) => a[1].pos - b[1].pos)) {
    if (!isWatched(q)) continue;
    msg += `• ${q} — pos ${c.pos.toFixed(0)} (${c.impr} viste)\n`;
    shown += 1;
  }
  if (!shown) msg += '• (nessuna keyword monitorata con dati nel periodo)\n';

  if (TELEGRAM_READY) {
    await sendTelegram(msg);
    console.log('✅ Alert inviato su Telegram.\n');
  } else {
    console.log('ℹ️  Telegram non configurato: mostro solo a schermo.\n');
  }
  console.log(msg);
}

main().catch((err) => {
  console.error('❌ ERRORE:', err.message);
  process.exit(1);
});
