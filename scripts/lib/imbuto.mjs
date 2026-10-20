// ============================================================================
//  L'IMBUTO, canale per canale (dal 20 ott 2026)
//
//  Per il Direttore: dove si perdono i clienti. Per ogni canale, in un periodo:
//    visite (ingressi al sito da lì, contatore del sito dal 16 ott 2026)
//    → contatti → sentiti → preventivi → clienti
//    e, per i canali a pagamento, la spesa e il costo per contatto e per cliente.
//
//  I canali:
//    googleAds    contatti dal modulo del sito arrivati da un annuncio (lo sa il
//                 modulo dal 27 set 2026: prima finivano in "sito")
//    sito         gli altri contatti "Sito web": Google senza annuncio, IA, altri
//                 siti, chi scrive l'indirizzo. Gratis.
//    meta         i moduli di Facebook e Instagram
//    altro        passaparola, telefono, scritti a mano
//
//  Dentro ci sono cifre in euro: il risultato va solo nei file in /tmp del
//  Direttore, mai nel repo, nei commit o sulla bacheca (il repo è pubblico).
// ============================================================================

const euro = (testo) => Number(String(testo ?? '').replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
const dataIt = (t) => {
  const m = String(t || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
};
const tondo = (n) => (n == null || !Number.isFinite(n) ? null : Math.round(n));

export function canale(l) {
  if (/meta|facebook|instagram/i.test(l.provenienza)) return 'meta';
  if (/sito/i.test(l.provenienza)) return /annuncio google/i.test(l.note) ? 'googleAds' : 'sito';
  return 'altro';
}

const SENTITO = (s) => s && s !== 'Da richiamare';
const PREVENTIVO = (s) => s === 'Preventivo inviato' || s === 'Cliente';

/**
 * lead       righe di leggiLead() con `arrivo` (Date)
 * settimane  righe della tabella del Cruscotto (oggetti con "Dal", "Spesa Google", "Spesa Meta")
 * visite     risultato di visitePerPagina() per lo stesso periodo (o { assente })
 * da, a      Date, estremi compresi
 * tetto      tetto del costo per cliente (dal secret VALORE_CLIENTE), o null
 */
export function imbuto({ lead, settimane, visite, da, a, tetto = null }) {
  const fineGiorno = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 23, 59, 59);
  const nelPeriodo = lead.filter((l) => l.arrivo && l.arrivo >= da && l.arrivo <= fineGiorno);

  // La spesa: le settimane del Cruscotto che cominciano nel periodo.
  const spesa = { googleAds: 0, meta: 0 };
  for (const s of settimane) {
    const inizio = dataIt(s.Dal);
    if (!inizio || inizio < da || inizio > fineGiorno) continue;
    spesa.googleAds += euro(s['Spesa Google']);
    spesa.meta += euro(s['Spesa Meta']);
  }

  // Gli ingressi al sito per provenienza, sommati su tutte le pagine.
  const ingressi = {};
  for (const p of visite?.pagine || []) {
    for (const [k, v] of Object.entries(p)) if (/^Da |^Diretti$/.test(k)) ingressi[k] = (ingressi[k] || 0) + Number(v || 0);
  }
  const visiteDi = {
    googleAds: visite?.pagine ? ingressi['Da annuncio Google'] || 0 : null,
    sito: visite?.pagine ? ['Da Google', 'Da IA', 'Da altri motori', 'Da altri siti', 'Diretti'].reduce((s, k) => s + (ingressi[k] || 0), 0) : null,
    meta: null, // i moduli Meta non passano dal sito
    altro: null,
  };

  const canali = {};
  for (const c of ['googleAds', 'sito', 'meta', 'altro']) {
    const di = nelPeriodo.filter((l) => canale(l) === c);
    const conta = (f) => di.filter((l) => f(l.stato)).length;
    const voce = {
      visite: visiteDi[c],
      contatti: di.length,
      sentiti: conta(SENTITO),
      preventivi: conta(PREVENTIVO),
      clienti: conta((s) => s === 'Cliente'),
      nonInteressati: conta((s) => s === 'Non interessato'),
      ancoraDaRichiamare: conta((s) => !SENTITO(s)),
    };
    if (c in spesa) {
      voce.spesa = tondo(spesa[c]);
      voce.costoPerContatto = di.length ? tondo(spesa[c] / di.length) : null;
      voce.costoPerCliente = voce.clienti ? tondo(spesa[c] / voce.clienti) : null;
      voce.rispettoAlTetto = tetto == null ? 'tetto non disponibile'
        : voce.clienti ? (spesa[c] / voce.clienti <= tetto ? 'sotto il tetto' : 'sopra il tetto')
          : spesa[c] > 0 ? 'nessun cliente: speso senza ritorno' : 'nessuna spesa';
    }
    canali[c] = voce;
  }

  return {
    periodo: { da: da.toISOString().slice(0, 10), a: a.toISOString().slice(0, 10) },
    come_si_legge: 'Per ogni canale: visite al sito da lì (contatore dal 16 ott 2026; null se non si sa) → contatti → sentiti (stato diverso da "Da richiamare") → preventivi ("Preventivo inviato" o "Cliente") → clienti. Lo stato è quello di oggi: i contatti recenti possono ancora diventare clienti. googleAds conta solo i moduli con "arrivato da un annuncio Google" (dal 27 set 2026): chi chiama o scrive su WhatsApp dall\'annuncio finisce in "sito" o "altro", quindi i clienti di Google Ads sono un minimo; e prima del 27 set 2026 i contatti da annuncio sono finiti tutti in "sito". La spesa è delle settimane del Cruscotto che cominciano nel periodo. RISERVATO: niente cifre in euro nel repo.',
    canali,
  };
}
