// Zone di sopralluogo (Z1–ZX): raggruppate per tempo di percorrenza dalla base
// (Montespertoli/Scandicci), non per provincia, così ogni zona corrisponde a un
// giro sensato. Stessa tassonomia del modulo del sito (`components/ContactForm.tsx`,
// che manda già la zona nel formato "Z4 — Empoli, …"), del modulo Meta Lead Ads
// e della colonna "Zona" dell'Excel clienti: se divergono, i dati vanno tradotti
// a mano. Qui serve solo a riconoscere la risposta che arriva da Meta, dove
// l'etichetta può essere accorciata per stare nel limite di caratteri.
export const ZONE = [
  { code: 'Z1', label: 'Firenze città', comuni: ['firenze'] },
  { code: 'Z2', label: 'Scandicci, Sesto, Campi, Calenzano', comuni: ['scandicci', 'sesto', 'campi', 'calenzano', 'signa', 'lastra', 'vaglia'] },
  { code: 'Z3', label: 'Bagno a Ripoli, Impruneta, Chianti', comuni: ['bagno a ripoli', 'impruneta', 'chianti', 'greve', 'san casciano', 'tavarnelle', 'barberino'] },
  { code: 'Z4', label: 'Empoli, Montespertoli, Castelfiorentino', comuni: ['empoli', 'valdelsa', 'montespertoli', 'castelfiorentino', 'certaldo', 'montelupo', 'montaione', 'gambassi'] },
  { code: 'Z5', label: 'Prato e provincia', comuni: ['prato', 'montemurlo', 'carmignano', 'vaiano'] },
  { code: 'Z6', label: 'Pistoia e provincia', comuni: ['pistoia', 'agliana', 'quarrata', 'montecatini'] },
  { code: 'ZX', label: 'Altro / fuori zona', comuni: ['altro', 'fuori zona'] },
];

const normalizza = (v) =>
  String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Riconosce la zona da una risposta libera (es. l'etichetta accorciata del
 * modulo Meta) e la riscrive come "Z4 — Empoli, Montespertoli, Castelfiorentino".
 * Se non riconosce nulla restituisce la risposta così com'è: meglio un dato
 * grezzo che un dato perso.
 */
export function etichettaZona(risposta) {
  const testo = normalizza(risposta);
  if (!testo) return '';
  const trovata =
    ZONE.find((z) => testo === normalizza(z.code)) ||
    ZONE.find((z) => testo === normalizza(z.label)) ||
    // Zona nominata solo in parte ("Empoli / Valdelsa", "Sesto Fiorentino"):
    // basta che compaia uno dei comuni della zona. ZX resta l'ultima scelta.
    ZONE.find((z) => z.code !== 'ZX' && z.comuni.some((c) => testo.includes(c))) ||
    ZONE.find((z) => z.code === 'ZX' && z.comuni.some((c) => testo.includes(c)));
  return trovata ? `${trovata.code} — ${trovata.label}` : String(risposta);
}
