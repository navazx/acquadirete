// ============================================================================
//  IL PASSAGGIO DEL POSTINO — porta le note nel Gestionale e rifà la copia
//
//  Dal 3 nov 2026 la bacheca è la scheda "Bacheca" del Gestionale. A ogni
//  passaggio, su un main appena preso:
//    - le note nuove e quelle ferme in agenti/bacheca/in-arrivo/ vanno nella
//      scheda (quelle che ci sono già si riconoscono dall'Id);
//    - agenti/bacheca.md si riscrive dalla scheda, comprese le note di Matteo e
//      di Stefano scritte dall'app;
//    - in-arrivo si svuota.
//
//  Se il foglio non si raggiunge le note restano in in-arrivo, su main, e le
//  porta il passaggio dopo. Succede quando Google non risponde, e sempre quando
//  a consegnare è una routine su claude.ai, che la chiave non ce l'ha: il suo
//  push fa partire bacheca-postino.yml, che la chiave ce l'ha.
// ============================================================================

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { normalizza, testoCopia } from './bacheca.mjs';
import { SHEET_ID } from './gestionale.mjs';
import { suMainDaCapo } from './spingi.mjs';
import { creaFoglioGoogle, leggiBacheca, accodaNote } from '../../netlify/functions/_shared/gestionale.mjs';

const IN_ARRIVO = 'agenti/bacheca/in-arrivo';
const COPIA = 'agenti/bacheca.md';

/**
 * `nuove`: note già controllate, con il loro id. Torna { portate, ferme, perche }:
 * quante sono andate nella scheda, quante restano in arrivo e perché.
 */
export async function passaggio({ nuove = [] } = {}) {
  let esito = { portate: 0, ferme: 0, perche: '' };
  await suMainDaCapo('Bacheca: il postino [skip netlify]', async (dir) => {
    const cartella = join(dir, IN_ARRIVO);
    const inArrivo = [];
    if (existsSync(cartella)) {
      for (const f of readdirSync(cartella).filter((n) => n.endsWith('.json'))) {
        try {
          const nota = normalizza(JSON.parse(readFileSync(join(cartella, f), 'utf8')));
          inArrivo.push({ ...nota, id: basename(f, '.json'), file: join(cartella, f) });
        } catch (e) {
          // Resta lì: il Direttore la vede ferma e lo dice.
          console.log(`Nota scartata (${f}): ${e.message}`);
        }
      }
    }
    try {
      const foglio = creaFoglioGoogle(SHEET_ID);
      const sulFoglio = await leggiBacheca(foglio);
      const ci = new Set(sulFoglio.map((n) => n.id));
      const mancanti = [];
      for (const { file, ...n } of [...inArrivo, ...nuove]) {
        if (!ci.has(n.id)) { ci.add(n.id); mancanti.push(n); }
      }
      if (mancanti.length) await accodaNote(foglio, mancanti);
      for (const n of inArrivo) rmSync(n.file);
      writeFileSync(join(dir, COPIA), testoCopia([...mancanti, ...sulFoglio]));
      esito = { portate: mancanti.length, ferme: 0, perche: '' };
    } catch (e) {
      mkdirSync(cartella, { recursive: true });
      for (const { id, ...n } of nuove) writeFileSync(join(cartella, `${id}.json`), `${JSON.stringify(n, null, 2)}\n`);
      esito = { portate: 0, ferme: inArrivo.length + nuove.length, perche: e.message.split('\n')[0].slice(0, 200) };
    }
    return [COPIA, 'agenti/bacheca'];
  }, { autore: 'agente-bacheca' });
  return esito;
}
