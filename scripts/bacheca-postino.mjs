#!/usr/bin/env node
// ============================================================================
//  IL POSTINO DELLA BACHECA — dal 3 nov 2026 è un workflow (bacheca-postino.yml)
//
//  Prima era una routine su claude.ai, perché solo lì si arrivava alla bacheca.
//  Ora la bacheca è nel Gestionale e serve solo a due cose: portarci le note
//  delle routine, che arrivano in agenti/bacheca/in-arrivo/, e rifare la copia
//  agenti/bacheca.md, dopo che Matteo o Stefano hanno scritto dall'app.
//  Lo fanno partire il push di una nota, l'app e la sveglia (ogni 3 ore).
// ============================================================================

import { passaggio } from './lib/bacheca-postino.mjs';

try {
  const { portate, ferme, perche } = await passaggio();
  if (ferme) {
    // Le note non si perdono, ma il giro deve risultare fallito: se no nessuno lo vede.
    console.log(`${ferme === 1 ? '1 nota resta' : `${ferme} note restano`} in arrivo: ${perche}`);
    process.exitCode = 1;
  } else {
    console.log(`Note portate sulla bacheca: ${portate}. Copia rifatta.`);
  }
} catch (e) {
  console.log(`Postino non riuscito: ${e.message}`);
  process.exitCode = 1;
}
