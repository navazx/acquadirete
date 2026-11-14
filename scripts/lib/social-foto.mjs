// ============================================================================
//  Le foto di una bozza social
//
//  Il campo `foto` della bozza e' un percorso (una foto), una lista di percorsi
//  (piu' foto dello stesso impianto, mandate insieme da Matteo: escono nello
//  stesso post, 14 nov 2026) oppure null. Qui si legge in un modo solo.
// ============================================================================

export const SITO = 'https://www.acquadirete.it';

/** Al massimo 10: e' il limite dei caroselli di Instagram e degli album di Telegram. */
export const MAX_FOTO = 10;

/** I percorsi delle foto, senza la barra davanti (es. assets/social/tg-….jpg). */
export function fotoDellaBozza(b) {
  const f = b?.foto;
  const elenco = Array.isArray(f) ? f : f ? [f] : [];
  return elenco.map((p) => String(p).replace(/^\/+/, '')).filter(Boolean).slice(0, MAX_FOTO);
}

export const urlFoto = (percorso) => `${SITO}/${percorso}`;
