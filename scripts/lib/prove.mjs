// ============================================================================
//  Il registro delle prove: agenti/prove.md (dal 16 ott 2026)
//
//  Ogni modifica che Matteo approva (articoli, correzioni SEO, scritte del
//  sito, riparazioni, modifiche a Google Ads) entra qui da sola, con la data in
//  cui va ricontrollata. Così ogni modifica diventa una prova: dopo quattro
//  settimane si guarda nei numeri veri (contatti e clienti nel Gestionale, clic
//  e posizioni su Google) se ha funzionato. Quello che funziona si tiene e si
//  ripete, quello che no diventa una lezione. Prima nessuno tornava a vedere.
//
//  Le scrive scripts/risposte.mjs all'APPROVA. Gli esiti li scrive il
//  Direttore il 1° del mese (.claude/skills/direttore), dentro la proposta
//  degli ordini. Regole in agenti/LEGGIMI.md, "Il registro delle prove".
// ============================================================================

import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

export const FILE = 'agenti/prove.md';
export const GIORNI = 28;

const INTESTAZIONE = `# Il registro delle prove

Ogni modifica approvata da Matteo è una prova: qui c'è cosa è cambiato, cosa ci si
aspetta, e quando si guarda se ha funzionato. Le righe nuove le scrive la segreteria
all'APPROVA; l'esito lo scrive il Direttore il 1° del mese, guardando i numeri veri.
Regole in \`agenti/LEGGIMI.md\`, "Il registro delle prove". **Mai cifre in euro qui**:
il repository è pubblico.
`;

const giorno = (d) => d.toISOString().slice(0, 10);

/** Dall'anteprima di una proposta, le righe "Cosa ci si aspetta:" e "Come si misura:". */
export function attesaDa(testo = '') {
  const prendi = (etichetta) => {
    const m = testo.match(new RegExp(`^\\**${etichetta}\\**\\s*:?\\**\\s*(.+)$`, 'im'));
    return m ? m[1].replace(/\*+/g, '').trim().slice(0, 400) : '';
  };
  return { attesa: prendi('Cosa ci si aspetta'), misura: prendi('Come si misura') };
}

export function segnaProva({ tipo, titolo, cosa = '', attesa = '', misura = '', giorni = GIORNI }, adesso = new Date(), file = FILE) {
  const controllo = new Date(adesso.getTime() + giorni * 864e5);
  if (!existsSync(file)) writeFileSync(file, INTESTAZIONE);
  const righe = [
    `## ${giorno(adesso)} · ${tipo} · ${titolo}`,
    cosa && `- Cosa è cambiato: ${cosa}`,
    `- Cosa ci si aspetta: ${attesa || "non scritto nella proposta: lo stabilisce il Direttore al controllo"}`,
    misura && `- Come si misura: ${misura}`,
    `- Si controlla dal: ${giorno(controllo)}`,
    '- Esito: da vedere',
  ].filter(Boolean);
  appendFileSync(file, `\n${righe.join('\n')}\n`);
  return giorno(controllo);
}

/** Le prove ancora "da vedere" la cui data di controllo è arrivata. */
export function daControllare(oggi = new Date(), file = FILE) {
  if (!existsSync(file)) return [];
  const blocchi = readFileSync(file, 'utf8').split(/\n(?=## \d{4}-\d{2}-\d{2} · )/).slice(1);
  return blocchi
    .map((b) => ({
      titolo: b.split('\n')[0].replace(/^## /, ''),
      controllo: (b.match(/Si controlla dal: (\d{4}-\d{2}-\d{2})/) || [])[1],
      aperta: /- Esito: da vedere/.test(b),
    }))
    .filter((p) => p.aperta && p.controllo && p.controllo <= giorno(oggi));
}
