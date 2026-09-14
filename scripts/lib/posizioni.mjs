// ============================================================================
//  Posizioni su Google — la parte dell'agente SEO che legge Search Console.
//  Ha preso il posto di keyword-alert.mjs (spento il 14 set 2026).
//
//  Il vecchio alert chiedeva a Search Console solo per ricerca, quindi la
//  posizione era la MEDIA fra tutte le pagine del sito che comparivano: con la
//  home a 14 e altre quattro pagine fra 30 e 72, "depuratori acqua firenze"
//  risultava a 41. Qui si chiede per ricerca E pagina, e per ogni ricerca si
//  guarda la pagina che Google mostra di più.
//
//  Cosa segnala (ultimi 28 giorni contro i 28 prima):
//    prima pagina     una ricerca con almeno MIN_VISTE entra fra i primi 10
//    fuori            una ricerca che era fra i primi 10 ne esce
//    sale / scende    la stessa pagina si sposta di MOVIMENTO posizioni, entro i primi 20
//    vetrina          tante viste e zero clic stando in alto: la pagina c'è ma non convince
//    soglia           tante viste e zero clic stando fra 9 e 15: serve salire, non un titolo nuovo
//    concorrenza      più pagine del sito si contendono la stessa ricerca
//
//  Fuori dal conto: ricerche del marchio e dei numeri di telefono (non dicono
//  niente sulla SEO) e quelle con poche viste (rumore).
//
//  Ogni segnalazione parte UNA volta: lo stato resta in agenti/seo/posizioni.json.
//  Da lì le leggono gli agenti che ci lavorano sopra: "vetrina" l'agente delle
//  correzioni SEO (agenti/seo/REGOLE.md), "soglia" sugli articoli del blog
//  l'agente Contenuti (agenti/contenuti/REGOLE.md). Chi ha già lavorato una
//  pagina lo scrive in agenti/seo/posizioni-lavorate.md, così non si rifà.
// ============================================================================

import { getAccessToken, query, ymd, windows } from './gsc.mjs';

const MIN_VISTE = 10;
const VETRINA_VISTE = 30;
const VETRINA_POS = 15;
const TITOLO_POS = 8;
const BORDO = 1.5;
const PRIMA_PAGINA = 10;
const MOVIMENTO = 5;
const ENTRO = 20;
const CONCORRENZA_VISTE = 5;

const percorso = (url) => { try { return new URL(url).pathname; } catch { return url; } };
const pos = (p) => Math.round(p);
const marchio = (q) => /\d{6,}/.test(q.replace(/[\s.\-/]/g, '')) || /acqua\s*di\s*rete|acquadirete/i.test(q);

async function leggi(token, da, a) {
  const [perPagina, totali] = await Promise.all([
    query(token, { dimensions: ['query', 'page'], rowLimit: 5000, startDate: ymd(da), endDate: ymd(a) }),
    // Per data e non per ricerca: così i totali contano anche le ricerche che Google nasconde.
    query(token, { dimensions: ['date'], startDate: ymd(da), endDate: ymd(a) }),
  ]);

  const ricerche = new Map();
  for (const r of perPagina.rows || []) {
    const [q, url] = r.keys;
    if (marchio(q)) continue;
    if (!ricerche.has(q)) ricerche.set(q, []);
    ricerche.get(q).push({ pagina: percorso(url), viste: r.impressions, clic: r.clicks, pos: r.position });
  }
  for (const pagine of ricerche.values()) pagine.sort((x, y) => y.viste - x.viste);

  const somma = (campo) => (totali.rows || []).reduce((s, r) => s + r[campo], 0);
  return { ricerche, clic: somma('clicks'), viste: somma('impressions') };
}

export async function leggiPosizioni() {
  const { start, end, prevStart, prevEnd } = windows();
  const token = await getAccessToken();
  const [ora, prima] = await Promise.all([leggi(token, start, end), leggi(token, prevStart, prevEnd)]);
  return { ora, prima, periodo: `${ymd(start)} → ${ymd(end)}` };
}

export function trovaSegnali({ ora, prima }) {
  const segnali = [];
  // I numeri restano nello stato perché li leggono gli agenti che ci lavorano sopra.
  const aggiungi = (tipo, q, pagina, testo, c) => segnali.push({
    chiave: `${tipo}|${q}`, tipo, ricerca: q, pagina, testo,
    ...(c && { viste: c.viste, clic: c.clic, posizione: Math.round(c.pos * 10) / 10 }),
  });

  for (const [q, pagine] of ora.ricerche) {
    const c = pagine[0]; // la pagina che Google mostra di più per questa ricerca
    const p = (prima.ricerche.get(q) || []).find((x) => x.pagina === c.pagina);

    if (c.viste >= MIN_VISTE) {
      // Da 10,5 a 9,7 non è entrare in prima pagina, è oscillare sul bordo.
      if (c.pos <= PRIMA_PAGINA && (!p || (p.pos > PRIMA_PAGINA && p.pos - c.pos >= BORDO))) {
        aggiungi('prima-pagina', q, c.pagina, `"${q}" — posizione ${pos(c.pos)}${p ? ` (era ${pos(p.pos)})` : ''}, ${c.viste} viste, ${c.clic} clic`);
      } else if (p && p.viste >= MIN_VISTE && p.pos <= PRIMA_PAGINA && c.pos > PRIMA_PAGINA) {
        aggiungi('fuori', q, c.pagina, `"${q}" — da ${pos(p.pos)} a ${pos(c.pos)}, ${c.viste} viste`);
      } else if (p && p.viste >= CONCORRENZA_VISTE && Math.min(p.pos, c.pos) <= ENTRO && Math.abs(p.pos - c.pos) >= MOVIMENTO) {
        const tipo = c.pos < p.pos ? 'sale' : 'scende';
        aggiungi(tipo, q, c.pagina, `"${q}" — da ${pos(p.pos)} a ${pos(c.pos)}, ${c.viste} viste`);
      }
    }

    // Zero clic vuol dire due cose diverse secondo dove sta la pagina: in alto è il
    // titolo che non convince; a cavallo della seconda pagina è la posizione, e
    // ritoccare il titolo non serve (errore già fatto una volta, 9 set 2026).
    if (c.viste >= VETRINA_VISTE && c.clic === 0 && c.pos <= VETRINA_POS) {
      const tipo = c.pos <= TITOLO_POS ? 'vetrina' : 'soglia';
      aggiungi(tipo, q, c.pagina, `"${q}" — ${c.viste} viste in posizione ${pos(c.pos)}, nessun clic`, c);
    }

    const contendenti = pagine.filter((x) => x.viste >= CONCORRENZA_VISTE);
    if (contendenti.length >= 2) {
      const elenco = [...contendenti].sort((x, y) => x.pos - y.pos).map((x) => `${x.pagina} a ${pos(x.pos)}`).join(', ');
      aggiungi('concorrenza', q, null, `"${q}" — ${contendenti.length} pagine: ${elenco}`);
    }
  }
  return segnali;
}

const TITOLI = {
  'prima-pagina': 'ENTRATE IN PRIMA PAGINA',
  sale: 'SALGONO',
  vetrina: 'SI VEDONO MA NESSUNO CLICCA\nStanno in alto, ma il titolo o la descrizione su Google non convincono: sono le prime da ritoccare.',
  soglia: 'A UN PASSO DALLA PRIMA PAGINA\nTante viste e zero clic perché stanno in fondo o appena dopo: il titolo non c\'entra, serve farle salire (contenuto più completo, collegamenti da altre pagine).',
  concorrenza: 'PIÙ PAGINE SULLA STESSA RICERCA\nGoogle non sa quale mostrare e nessuna sale davvero: ne va rafforzata una sola, con i collegamenti dalle altre.',
  fuori: 'USCITE DALLA PRIMA PAGINA',
  scende: 'SCENDONO',
};

// Chi ci lavora sopra: una segnalazione senza nessuno che la prende in carico è
// solo un promemoria, ed è quello che gli agenti non devono essere.
export const blog = (pagina) => Boolean(pagina && pagina.startsWith('/blog/') && pagina !== '/blog/');
function chiCiPensa(tipo, pagine) {
  if (tipo === 'vetrina') return '→ Ci pensa l\'agente SEO: al suo prossimo giro del lunedì ti propone titolo e descrizione nuovi.';
  if (tipo === 'soglia') {
    const articoli = pagine.filter(blog).length;
    if (articoli === pagine.length) return '→ Ci pensa l\'agente Contenuti: il 5 del mese ti propone l\'articolo arricchito al posto di uno nuovo.';
    if (articoli) return '→ Gli articoli li arricchisce l\'agente Contenuti il 5 del mese. Le pagine dei servizi no: portano i contatti, e si decidono insieme a Claude dal PC.';
    return '→ Sono pagine dei servizi: portano i contatti, quindi nessun agente le riscrive da solo. Si decidono insieme a Claude dal PC.';
  }
  if (tipo === 'concorrenza') return '→ Qui va scelto quale pagina deve vincere, e tocca le pagine che portano i contatti: nessun agente lo fa da solo. Si decide insieme a Claude dal PC.';
  return null;
}

/** Testo del blocco "posizioni", o null se non c'è niente di nuovo da dire. */
export function componiPosizioni(dati, segnali, giaSegnalati) {
  const visti = new Set(giaSegnalati);
  const nuovi = segnali.filter((s) => !visti.has(s.chiave));
  if (!nuovi.length) return null;

  const blocchi = [];
  const { ora, prima } = dati;
  const varia = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : 'n.d.');
  blocchi.push(`POSIZIONI SU GOOGLE (${dati.periodo}, contro i 28 giorni prima)\nClic ${ora.clic} (erano ${prima.clic}, ${varia(ora.clic, prima.clic)}) · viste ${ora.viste} (erano ${prima.viste}, ${varia(ora.viste, prima.viste)})`);

  for (const tipo of Object.keys(TITOLI)) {
    const delTipo = nuovi.filter((s) => s.tipo === tipo);
    if (!delTipo.length) continue;
    const gruppi = new Map();
    for (const s of delTipo) gruppi.set(s.pagina, [...(gruppi.get(s.pagina) || []), s.testo]);
    const righe = [...gruppi].map(([pagina, testi]) =>
      pagina ? `${pagina}\n${testi.slice(0, 5).map((t) => `  • ${t}`).join('\n')}` : testi.map((t) => `• ${t}`).join('\n'));
    const chi = chiCiPensa(tipo, [...gruppi.keys()]);
    blocchi.push(`${TITOLI[tipo]}\n${righe.join('\n')}${chi ? `\n${chi}` : ''}`);
  }
  return blocchi.join('\n\n');
}
