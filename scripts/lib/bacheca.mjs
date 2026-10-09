// ============================================================================
//  LA BACHECA DEGLI AGENTI — le note che gli agenti si lasciano a fine giro
//
//  La bacheca vera è un artifact su claude.ai, che Matteo legge dal telefono.
//  Chi gira su GitHub Actions non ci arriva: lascia la nota come file in
//  CARTELLA, scripts/bacheca-consegna.mjs la porta su main in
//  agenti/bacheca/in-arrivo/, e ogni mattina il postino (routine cloud) la mette
//  sulla bacheca. Regole e indirizzi in agenti/bacheca/LEGGIMI.md.
//
//  Il repo è pubblico e la bacheca finisce anche lì (agenti/bacheca.md):
//  niente nomi di clienti, telefoni, email, cifre in euro.
// ============================================================================

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const CARTELLA = process.env.BACHECA_DIR || '/tmp/bacheca';
export const AGENTI = ['direttore', 'contenuti', 'seo', 'social', 'recensioni', 'scheda', 'lead', 'matteo'];
export const MAX_TESTO = 600;

/** L'id del documento sulla bacheca: l'ora (senza ":" e ".") più l'agente. */
export function idNota(quando, agente) {
  return `${quando.replace(/[:.]/g, '-')}-${agente}`;
}

/** Controlla e completa una nota. Lancia un errore se non è una nota valida. */
export function normalizza(nota) {
  const agente = String(nota?.agente || '').trim().toLowerCase();
  if (!AGENTI.includes(agente)) throw new Error(`agente sconosciuto: "${nota?.agente}"`);
  const testo = String(nota?.testo || '').trim();
  if (!testo) throw new Error('testo vuoto');
  let per = Array.isArray(nota.per) ? nota.per : [nota.per || 'tutti'];
  per = per.map((p) => String(p).trim().toLowerCase()).filter((p) => p === 'tutti' || AGENTI.includes(p));
  const quando = nota.quando && !Number.isNaN(Date.parse(nota.quando)) ? new Date(nota.quando).toISOString() : new Date().toISOString();
  return {
    quando,
    agente,
    testo: testo.length > MAX_TESTO ? `${testo.slice(0, MAX_TESTO - 1)}…` : testo,
    per: per.length ? [...new Set(per)] : ['tutti'],
  };
}

/** Lascia una nota in CARTELLA. La consegna su main la fa bacheca-consegna.mjs. */
export function lasciaNota(agente, testo, per = ['tutti']) {
  const nota = normalizza({ agente, testo, per });
  mkdirSync(CARTELLA, { recursive: true });
  let id = idNota(nota.quando, nota.agente);
  for (let n = 2; existsSync(join(CARTELLA, `${id}.json`)); n += 1) id = `${idNota(nota.quando, nota.agente)}-${n}`;
  writeFileSync(join(CARTELLA, `${id}.json`), `${JSON.stringify(nota, null, 2)}\n`);
  return id;
}
