// ============================================================================
//  Report SEO mensile da Google Search Console -> Telegram.
//  Gira su GitHub Actions (.github/workflows/seo-report.yml), il 1° del mese.
//
//  Ultimi 28 giorni confrontati con i 28 precedenti: clic, impressioni, CTR,
//  posizione media, query top (per clic e per impressioni), pagine top.
//
//  Test in locale (stampa a schermo, non invia):
//    GSC_KEY_FILE="C:/.../seo-report/gsc-key.json" node scripts/seo-report.mjs
// ============================================================================

import {
  getAccessToken, query, sendTelegram, ymd, pct, windows, TELEGRAM_READY,
} from './lib/gsc.mjs';

const { start, end, prevStart, prevEnd } = windows();

async function main() {
  const token = await getAccessToken();

  const [cur, prev, topQ, topP] = await Promise.all([
    query(token, { startDate: ymd(start), endDate: ymd(end) }),
    query(token, { startDate: ymd(prevStart), endDate: ymd(prevEnd) }),
    query(token, { startDate: ymd(start), endDate: ymd(end), dimensions: ['query'], rowLimit: 30 }),
    query(token, { startDate: ymd(start), endDate: ymd(end), dimensions: ['page'], rowLimit: 6 }),
  ]);

  const c = cur.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const p = prev.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const qRows = topQ.rows || [];
  const byClicks = qRows.filter((r) => r.clicks > 0).slice(0, 6);
  // L'API ordina per clic: riordino lato client per vedere dove c'e' visibilita'.
  const byImpr = [...qRows].sort((a, b) => b.impressions - a.impressions).slice(0, 6);

  let msg = '';
  msg += '📊 REPORT SEO — Google Search Console\n';
  msg += '🌐 acquadirete.it · ultimi 28 giorni\n';
  msg += `📅 ${ymd(start)} → ${ymd(end)}\n`;
  msg += '━━━━━━━━━━━━━━\n';
  msg += `👆 Clic: ${c.clicks}  (${pct(c.clicks, p.clicks)} vs 28gg prec.)\n`;
  msg += `👁️ Impressioni: ${c.impressions}  (${pct(c.impressions, p.impressions)})\n`;
  msg += `🎯 CTR medio: ${(c.ctr * 100).toFixed(1)}%\n`;
  msg += `📍 Posizione media: ${c.position.toFixed(1)}\n`;
  msg += '━━━━━━━━━━━━━━\n';
  msg += '🔎 Query che portano clic:\n';
  byClicks.forEach((r) => {
    msg += `• ${r.keys[0]} — ${r.clicks} clic, pos ${r.position.toFixed(0)}\n`;
  });
  if (!byClicks.length) msg += '• (nessuna query con clic nel periodo)\n';
  msg += '━━━━━━━━━━━━━━\n';
  msg += '👀 Più visibilità (impressioni):\n';
  byImpr.forEach((r) => {
    msg += `• ${r.keys[0]} — ${r.impressions} viste, pos ${r.position.toFixed(0)}\n`;
  });
  if (!byImpr.length) msg += '• (nessun dato)\n';
  msg += '━━━━━━━━━━━━━━\n';
  msg += '📄 Pagine top (per clic):\n';
  (topP.rows || []).forEach((r) => {
    const u = r.keys[0].replace('https://www.acquadirete.it', '') || '/';
    msg += `• ${u} — ${r.clicks} clic\n`;
  });
  if (!(topP.rows || []).length) msg += '• (nessun dato)\n';

  if (TELEGRAM_READY) {
    await sendTelegram(msg);
    console.log('✅ Report inviato su Telegram.\n');
  } else {
    console.log('ℹ️  Telegram non configurato (manca token/chat id): mostro solo a schermo.\n');
  }
  console.log(msg);
}

main().catch((err) => {
  console.error('❌ ERRORE:', err.message);
  process.exit(1);
});
