#!/usr/bin/env node
// ============================================================================
//  AGENTE ADS — la revisione mensile di Google Ads, fatta e mandata su Telegram
//
//  Gira su GitHub Actions il 18 di ogni mese (vedi .github/workflows/
//  agente-ads.yml). Ha preso il posto del promemoria che diceva a Matteo di
//  aprire il report Termini di ricerca: ora il report lo legge lui.
//
//  NON SCRIVE NIENTE NEL REPO, di proposito: il repository e' pubblico, e spesa,
//  termini di ricerca ed elenco dei concorrenti esclusi sono affari di
//  Acquadirete. Legge, ragiona, manda il messaggio. Fine.
//
//  NON TOCCA GOOGLE ADS: il service account ha ruolo "Solo lettura". Le
//  esclusioni le propone; metterle tocca a Matteo.
//
//  Cosa manda, sugli ultimi 30 giorni interi confrontati coi 30 prima:
//    1. i numeri: clic, spesa, conversioni, costo per conversione
//    2. la parte NASCOSTA: quanto di spesa e conversioni Google non attribuisce
//       a nessun termine visibile. Oggi ci finiscono quasi tutte le conversioni,
//       quindi "zero conversioni" su un termine NON vuol dire che non rende
//    3. i marchi rientrati DALLA PORTA LATERALE: un termine che contiene una
//       parola gia' esclusa ma scritta staccata o attaccata ("acqua life" contro
//       "acqualife"). E' successo due volte: la regola e' mettere sempre entrambe
//       le forme
//    4. le PAROLE CHE NON CONOSCE: parole dentro i termini cercati che non stanno
//       ne' nelle parole chiave ne' nel vocabolario del mestiere. Di solito sono
//       marchi concorrenti. Le decide Matteo: l'agente non indovina
//
//  Cosa NON propone mai, perche' e' gia' stato deciso (vedi memoria del
//  progetto e agenti/ads/LEGGIMI.md):
//    - escludere le ricerche sul prezzo ("quanto costa", "prezzi"): sono clienti
//      piu' avanti di quanto sembri, e il sopralluogo gratuito e' la risposta
//    - escludere "gratis": bloccherebbe "preventivo gratis"
//    - escludere un termine perche' ha zero conversioni visibili: vedi punto 2
//
//  Prova dal PC (niente Telegram, stampa il messaggio):
//    GSC_KEY_FILE=../seo-report/gsc-key-readonly.json PROVA=true node scripts/agente-ads.mjs
// ============================================================================

import { query, euro } from './lib/ads.mjs';

const giorno = (d) => d.toISOString().slice(0, 10);
const GIORNO_MS = 24 * 60 * 60 * 1000;

// Il vocabolario del mestiere: parole che in una ricerca non sono un marchio.
// Si allarga quando nel messaggio compaiono parole normali segnalate per niente.
// Le parole delle parole chiave attive si aggiungono da sole.
const VOCABOLARIO = new Set(`
  a ad al alla alle allo ai agli anche che chi ci come con cosa costa costano costi costo
  da dal dalla dei del della delle dello di do dove e ed è gli ha ho i il in la le lo ma
  me mi migliore migliori miglior meglio ne nel nella non o per piu più po qual quale quali
  quanto quanti se si sono su sul sulla ti tra tu un una uno vs fra
  acqua acque acquedotto depuratore depuratori depurazione depurata depurate depurare
  depuratrice purificatore purificatori purificazione purificare filtro filtri filtrata
  filtrante filtraggio filtrazione osmosi inversa osmotico osmotica carboni carbone attivi
  attivo microfiltrazione ultrafiltrazione ultravioletti uv lampada membrana membrane
  rubinetto rubinetti miscelatore miscelatori sottolavello sotto lavello lavandino cucina
  frizzante frizzanti gasata gassata gasatore gasare naturale fredda fresca refrigerata
  ambiente calda bombola bombole co2 anidride carbonica potabile bere bevibile buona
  casa domestico domestica domestici domestiche abitazione appartamento famiglia
  ufficio uffici azienda aziende aziendale bar ristorante ristoranti locale negozio
  erogatore erogatori boccione boccioni colonnina fontanella distributore dispenser
  impianto impianti sistema sistemi apparecchio trattamento installazione installare
  installatore installatori montaggio manutenzione assistenza tecnico tecnici cambio
  sostituzione ricambi ricambio noleggio acquisto comprare vendita prezzo prezzi preventivo
  offerta offerte economico economici conviene convenienza risparmio listino rate
  recensioni opinioni forum funziona funzionano serve servono utile vale pena consigli
  confronto classifica tipi tipo quale scegliere guida vantaggi svantaggi pro contro
  calcare cloro sapore odore durezza qualità qualita sali minerali residuo fisso ph
  microplastiche batteri piombo nitrati arsenico analisi test
  macchina macchine apparecchi dispositivo modello modelli nuovo nuova usato
  water filter home pure plus pro cold tap system purifier
  vicino vicinanze zona provincia toscana italia firenze fiorentino fiorentina prato
  pistoia empoli scandicci sesto campi bisenzio signa lastra calenzano bagno ripoli
  fiesole impruneta montespertoli montelupo certaldo castelfiorentino poggibonsi
  greve chianti pontassieve borgo lorenzo mugello montale quarrata agliana serravalle
  pescia monsummano montemurlo vaiano carmignano poggio caiano
`.split(/\s+/).filter(Boolean));

async function periodo(fine) {
  const inizio = new Date(fine.getTime() - 29 * GIORNO_MS);
  return { da: giorno(inizio), a: giorno(fine), gaql: `segments.date BETWEEN '${giorno(inizio)}' AND '${giorno(fine)}'` };
}

async function totali(p) {
  const righe = await query(
    `SELECT metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE ${p.gaql}`,
  );
  return righe.reduce(
    (s, r) => ({
      clic: s.clic + Number(r.metrics.clicks || 0),
      spesa: s.spesa + euro(r.metrics.costMicros),
      conversioni: s.conversioni + Number(r.metrics.conversions || 0),
    }),
    { clic: 0, spesa: 0, conversioni: 0 },
  );
}

const parole = (testo) => testo.toLowerCase().split(/[^a-zà-ù0-9]+/i).filter(Boolean);
const eur = (n) => `€${n.toFixed(2).replace('.', ',')}`;
const variazione = (ora, prima) =>
  prima ? ` (${ora >= prima ? '+' : '−'}${Math.abs(Math.round(((ora - prima) / prima) * 100))}%)` : '';

async function main() {
  const ieri = new Date(Date.now() - GIORNO_MS);
  const ora = await periodo(ieri);
  const prima = await periodo(new Date(ieri.getTime() - 30 * GIORNO_MS));

  const [tOra, tPrima] = [await totali(ora), await totali(prima)];

  const termini = (await query(
    `SELECT search_term_view.search_term, search_term_view.status,
            metrics.clicks, metrics.cost_micros, metrics.conversions
     FROM search_term_view WHERE ${ora.gaql} AND metrics.clicks > 0`,
  )).map((r) => ({
    termine: r.searchTermView.searchTerm.toLowerCase(),
    stato: r.searchTermView.status,
    clic: Number(r.metrics.clicks || 0),
    spesa: euro(r.metrics.costMicros),
    conversioni: Number(r.metrics.conversions || 0),
  }));

  const escluse = (await query(
    `SELECT campaign_criterion.keyword.text FROM campaign_criterion
     WHERE campaign_criterion.negative = TRUE AND campaign_criterion.type = 'KEYWORD'`,
  )).map((r) => r.campaignCriterion.keyword.text.toLowerCase());

  const chiave = await query(
    `SELECT ad_group_criterion.keyword.text FROM keyword_view
     WHERE ad_group_criterion.status = 'ENABLED' AND ad_group_criterion.negative = FALSE`,
  );
  for (const r of chiave) parole(r.adGroupCriterion.keyword.text).forEach((p) => VOCABOLARIO.add(p));

  // --- 2. la parte nascosta
  const somma = (k) => termini.reduce((s, t) => s + t[k], 0);
  const nascosto = {
    clic: Math.max(0, tOra.clic - somma('clic')),
    spesa: Math.max(0, tOra.spesa - somma('spesa')),
    conversioni: Math.max(0, Math.round((tOra.conversioni - somma('conversioni')) * 100) / 100),
  };

  // Un termine che contiene un'esclusa com'e' scritta OGGI e' gia' bloccato. Nei
  // 30 giorni ci sono anche i giorni prima che quell'esclusione venisse messa:
  // senza questo filtro l'agente riproporrebbe marchi esclusi da settimane
  // (successo alla prima prova: Grohe, Culligan, Acqua Life...).
  const frasiEscluse = escluse.map((e) => ` ${parole(e).join(' ')} `);
  const bloccato = (t) => frasiEscluse.some((f) => ` ${parole(t.termine).join(' ')} `.includes(f));
  const aperti = termini.filter((t) => !bloccato(t));

  // --- 3. porta laterale: una sequenza di parole del termine che, attaccata,
  // e' uguale a un'esclusa — ma il termine non contiene l'esclusa com'e' scritta.
  const laterali = [];
  for (const t of aperti) {
    const pezzi = parole(t.termine);
    for (const e of escluse) {
      const bersaglio = e.replace(/\s+/g, '');
      const trovata = pezzi.some((_, i) => {
        let unito = '';
        for (let j = i; j < pezzi.length && unito.length < bersaglio.length; j++) {
          unito += pezzi[j];
          if (unito === bersaglio) return true;
        }
        return false;
      });
      if (trovata) laterali.push({ ...t, esclusa: e });
    }
  }

  // --- 4. parole che non conosce, sui termini non ancora parole chiave
  const sconosciute = new Map();
  for (const t of aperti.filter((x) => x.stato !== 'ADDED' && x.conversioni === 0)) {
    if (laterali.some((l) => l.termine === t.termine)) continue;
    for (const p of new Set(parole(t.termine))) {
      if (p.length < 3 || /^\d+$/.test(p) || VOCABOLARIO.has(p)) continue;
      const v = sconosciute.get(p) ?? { parola: p, clic: 0, spesa: 0, esempi: [] };
      v.clic += t.clic;
      v.spesa += t.spesa;
      if (v.esempi.length < 2) v.esempi.push(t.termine);
      sconosciute.set(p, v);
    }
  }
  const daGuardare = [...sconosciute.values()]
    .filter((v) => v.spesa >= 1 || v.clic >= 2)
    .sort((a, b) => b.spesa - a.spesa)
    .slice(0, 12);

  // --- il messaggio
  const costoConv = (t) => (t.conversioni ? eur(t.spesa / t.conversioni) : '—');
  const r = [];
  r.push(`Google Ads — revisione del mese (${ora.da.slice(8)}/${ora.da.slice(5, 7)} → ${ora.a.slice(8)}/${ora.a.slice(5, 7)})`);
  r.push('');
  r.push(`Clic: ${tOra.clic}${variazione(tOra.clic, tPrima.clic)}`);
  r.push(`Spesa: ${eur(tOra.spesa)}${variazione(tOra.spesa, tPrima.spesa)}`);
  r.push(`Conversioni: ${tOra.conversioni} (il mese prima ${tPrima.conversioni})`);
  r.push(`Costo per conversione: ${costoConv(tOra)} (il mese prima ${costoConv(tPrima)})`);
  // Con una manciata di conversioni al mese, passare da 4 a 2 raddoppia il costo
  // per conversione senza che sia cambiato niente: va detto, o sembra un allarme.
  if (tOra.conversioni + tPrima.conversioni < 20) {
    r.push('Occhio: con così poche conversioni la differenza fra un mese e l\'altro è per lo più caso, non un segnale.');
  }
  r.push('');
  r.push(
    `Parte nascosta da Google: ${nascosto.clic} clic, ${eur(nascosto.spesa)}, ${nascosto.conversioni} conversioni su ${tOra.conversioni}. ` +
    (nascosto.conversioni >= tOra.conversioni && tOra.conversioni > 0
      ? 'Tutte le conversioni stanno qui: il report non dice quale ricerca ha convertito, quindi un termine con zero conversioni non va escluso per quello.'
      : 'Un termine con zero conversioni visibili non va escluso solo per quello.'),
  );

  if (laterali.length) {
    r.push('');
    r.push('ENTRATI DALLA PORTA LATERALE (esclusi, ma scritti diversi):');
    for (const l of laterali.slice(0, 8)) r.push(`• «${l.termine}» — ${l.clic} clic, ${eur(l.spesa)}. Hai già «${l.esclusa}»: aggiungi la forma staccata/attaccata.`);
  }

  r.push('');
  if (daGuardare.length) {
    r.push('PAROLE CHE NON CONOSCO (spesso marchi concorrenti — decidi tu):');
    for (const v of daGuardare) r.push(`• ${v.parola} — ${v.clic} clic, ${eur(v.spesa)} · es. «${v.esempi.join('», «')}»`);
    r.push('');
    r.push('Se una è un marchio: escludila a corrispondenza a frase, e metti anche la forma speculare (staccata o attaccata).');
  } else {
    r.push('Nessuna parola sconosciuta con spesa: le esclusioni stanno tenendo.');
  }
  r.push('');
  r.push(`Esclusioni attive: ${escluse.length}. Dove si mettono: Google Ads → Parole chiave → Parole chiave escluse → livello Campagna.`);

  const testo = r.join('\n');
  if (process.env.PROVA === 'true') {
    console.log(`(prova: niente Telegram, ${testo.length} caratteri)\n\n${testo}`);
    return;
  }
  const { messaggio } = await import('./lib/telegram.mjs');
  await messaggio(testo);
  console.log(`Revisione mandata (${testo.length} caratteri).`);
}

main().catch((e) => {
  console.log(`Errore: ${e.message}`);
  process.exitCode = 1;
});
