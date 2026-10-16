// ============================================================================
//  Visite del sito e valore di un cliente, per gli agenti (dal 16 ott 2026)
//
//  Due cose che prima gli agenti non avevano, e senza le quali non si può dire
//  se una pagina o un canale fa guadagnare:
//
//  1. le visite, pagina per pagina: le conta il sito da solo (lib/statistiche.ts
//     e netlify/functions/visita.mjs) e ogni notte le somma nella scheda
//     "Visite-sito" del Gestionale. Qui si leggono per un periodo e si mettono
//     accanto ai contatti arrivati da ogni pagina;
//  2. quanto vale un cliente: il margine che resta da un impianto e dalla
//     manutenzione, e il tetto di quanto può costare un cliente in pubblicità.
//     Sono cifre in euro: arrivano dal secret VALORE_CLIENTE di GitHub e NON si
//     scrivono mai nel repository, nei commit o sulla bacheca (è pubblico).
// ============================================================================

import { leggi } from './gestionale.mjs';

/** Il valore di un cliente dal secret VALORE_CLIENTE (JSON), o null se manca. */
export function valoreCliente() {
  const grezzo = process.env.VALORE_CLIENTE;
  if (!grezzo) return null;
  try {
    return JSON.parse(grezzo);
  } catch {
    return { errore: 'VALORE_CLIENTE non è JSON valido' };
  }
}

const numero = (x) => Number(String(x ?? '').replace(',', '.')) || 0;

/**
 * Le visite per pagina fra due giorni compresi ('AAAA-MM-GG'), sommate dalla
 * scheda Visite-sito. Torna { daQuando, pagine: [...] } oppure { assente } se
 * la scheda non c'è ancora (il contatore è partito il 16 ott 2026).
 */
export async function visitePerPagina(token, da, a) {
  let righe;
  try {
    righe = await leggi(token, "'Visite-sito'!A1:O20000");
  } catch (e) {
    return { assente: /unable to parse range/i.test(e.message) ? 'la scheda Visite-sito non esiste ancora: il contatore è partito il 16 ott 2026 e la crea la prima notte' : `scheda Visite-sito non leggibile: ${String(e.message).slice(0, 120)}` };
  }
  if (righe.length < 2) return { assente: 'scheda Visite-sito ancora vuota' };
  const testa = righe[0].map((h) => String(h).trim());
  const col = (nome) => testa.indexOf(nome);
  const iData = col('Data');
  const iPagina = col('Pagina');
  const pagine = new Map();
  let primo = null;
  for (const r of righe.slice(1)) {
    const giorno = String(r[iData] ?? '');
    if (!giorno) continue;
    if (!primo || giorno < primo) primo = giorno;
    if (giorno < da || giorno > a) continue;
    const p = String(r[iPagina] ?? '');
    const s = pagine.get(p) ?? Object.fromEntries(testa.slice(2).map((h) => [h, 0]));
    testa.slice(2).forEach((h, k) => { s[h] += numero(r[k + 2]); });
    pagine.set(p, s);
  }
  return {
    contatoreAttivoDal: primo,
    periodo: { da, a },
    avvertenza: 'Visualizzazioni = pagine viste; Ingressi = prima pagina della visita, divisi per provenienza. Niente cookie: chi torna conta di nuovo.',
    pagine: [...pagine.entries()]
      .map(([pagina, s]) => ({ pagina, ...s }))
      .sort((x, y) => (y.Visualizzazioni || 0) - (x.Visualizzazioni || 0)),
  };
}

/**
 * Accanto alle visite, i contatti arrivati da ogni pagina (la nota "dalla
 * pagina /…" che scrive il modulo) e quanti sono diventati clienti.
 * `lead` sono le righe di leggiLead(); da e a sono Date.
 */
export function contattiPerPagina(lead, da, a) {
  const per = {};
  for (const l of lead) {
    if (!l.data || l.data < da || l.data > a) continue;
    const pagina = (String(l.note).match(/dalla pagina (\/[^\s,)]*)/i) || [null, null])[1];
    if (!pagina) continue;
    const s = (per[pagina] ??= { contatti: 0, daAnnuncio: 0, clienti: 0 });
    s.contatti += 1;
    if (/annuncio google/i.test(l.note)) s.daAnnuncio += 1;
    if (l.stato === 'Cliente') s.clienti += 1;
  }
  return per;
}
