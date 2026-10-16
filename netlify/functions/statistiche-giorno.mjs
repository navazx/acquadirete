// ============================================================================
//  Il conteggio notturno delle visite (dal 16 ott 2026)
//
//  /api/visita accoda ogni evento in "Visite-oggi". Ogni notte questa funzione
//  somma gli eventi dei giorni finiti in una riga per pagina e per giorno nella
//  scheda "Visite-sito", e lascia in "Visite-oggi" solo quelli di oggi.
//  "Visite-sito" è quella che leggono gli agenti (Direttore, SEO, Ads) per
//  sapere quali pagine portano contatti e quali no.
//
//  Gira alle 01:20 UTC (le 03:20 d'estate in Italia), quando non passa
//  quasi nessuno: un evento che arrivasse proprio fra la lettura e la
//  riscrittura di "Visite-oggi" andrebbe perso, ed è un rischio accettato.
// ============================================================================

import { appendRows, leggiRighe, riscriviRighe } from './_shared/google-sheets.mjs';
import { SCHEDA_EVENTI } from './_shared/visite.mjs';

const SCHEDA = 'Visite-sito';
// Le colonne "da …" contano gli ingressi (la prima pagina vista) per provenienza.
const FONTI = [
  ['google', 'Da Google'],
  ['annuncio', 'Da annuncio Google'],
  ['social', 'Da social'],
  ['ia', 'Da IA'],
  ['altri-motori', 'Da altri motori'],
  ['altri-siti', 'Da altri siti'],
  ['diretto', 'Diretti'],
];
export const INTESTAZIONI = [
  'Data', 'Pagina', 'Visualizzazioni', 'Ingressi',
  ...FONTI.map(([, nome]) => nome),
  'Moduli iniziati', 'Moduli inviati', 'Chiama', 'WhatsApp',
];

const giornoRoma = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' });

export function somma(righe, oggi) {
  const restano = [];
  const conti = new Map(); // "giorno|pagina" -> contatori
  for (const r of righe) {
    const [quando, pagina, evento, fonte, ingresso] = r;
    if (!quando || !pagina || Number.isNaN(Date.parse(quando))) continue;
    const giorno = giornoRoma(quando);
    if (giorno >= oggi) {
      restano.push(r);
      continue;
    }
    const chiave = `${giorno}|${pagina}`;
    if (!conti.has(chiave)) conti.set(chiave, { giorno, pagina, visite: 0, ingressi: 0, fonti: {}, iniziati: 0, inviati: 0, chiama: 0, whatsapp: 0 });
    const c = conti.get(chiave);
    if (evento === 'visita') {
      c.visite++;
      if (ingresso === 'sì') {
        c.ingressi++;
        c.fonti[fonte] = (c.fonti[fonte] || 0) + 1;
      }
    } else if (evento === 'modulo-iniziato') c.iniziati++;
    else if (evento === 'modulo-inviato') c.inviati++;
    else if (evento === 'chiama') c.chiama++;
    else if (evento === 'whatsapp') c.whatsapp++;
  }
  const somme = [...conti.values()]
    .sort((a, b) => a.giorno.localeCompare(b.giorno) || b.visite - a.visite)
    .map((c) => [
      c.giorno, c.pagina, c.visite, c.ingressi,
      ...FONTI.map(([k]) => c.fonti[k] || 0),
      c.iniziati, c.inviati, c.chiama, c.whatsapp,
    ]);
  return { somme, restano };
}

export default async () => {
  const oggi = giornoRoma(new Date().toISOString());
  const righe = await leggiRighe(SCHEDA_EVENTI, 'A2:E');
  const { somme, restano } = somma(righe, oggi);
  if (!somme.length) {
    console.log('Conteggio visite: niente da sommare.');
    return;
  }
  // Prima si scrivono le somme, poi si svuota: se la scrittura fallisce, gli
  // eventi restano e si sommano la notte dopo.
  await appendRows(SCHEDA, INTESTAZIONI, somme);
  await riscriviRighe(SCHEDA_EVENTI, restano);
  console.log(`Conteggio visite: ${somme.length} righe in ${SCHEDA}, ${righe.length - restano.length} eventi sommati, ${restano.length} restano per domani.`);
};

export const config = { schedule: '20 1 * * *' };
