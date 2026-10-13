// ============================================================================
//  CHIAMARE IL MECCANICO — quando qualcosa non ha funzionato e uno script da
//  solo non lo puo' sistemare
//
//  Fino al 13 ott 2026 gli script, davanti a un guasto, scrivevano a Matteo
//  "chiedi a Claude dal PC di guardarci". E' esattamente quello che lui non
//  vuole: un sistema autonomo non gli rimanda il lavoro. Ora chi trova un guasto
//  chiama il Meccanico (meccanico.yml, istruzioni in .claude/skills/meccanico/):
//  un agente che legge i log, trova la causa e la sistema, oppure porta la
//  riparazione gia' pronta da approvare.
//
//  Serve che il workflow di chi chiama abbia "actions: write" fra i permessi e
//  GITHUB_TOKEN nell'ambiente.
// ============================================================================

const REPO = () => process.env.GITHUB_REPOSITORY || 'navazx/acquadirete';

export async function github(percorso, opzioni = {}) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO()}${percorso}`, {
    ...opzioni,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...opzioni.headers,
    },
  });
  return res;
}

/** Fa partire un workflow. Torna null se e' partito, altrimenti il motivo. */
export async function avvia(workflow, inputs) {
  try {
    const res = await github(`/actions/workflows/${workflow}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main', ...(inputs && { inputs }) }),
    });
    return res.status === 204 ? null : `GitHub ha risposto ${res.status}`;
  } catch (e) {
    return e.message;
  }
}

/**
 * Passa dei guasti al Meccanico.
 *   chi       chi lo chiama, per esempio "Direttore"
 *   problemi  [{ testo, tipo?, nome?, workflow?, giro?, ... }]: `testo` e' la frase
 *             in italiano; `workflow` e `giro` (il numero del giro su GitHub)
 *             gli dicono dove guardare.
 * Torna null se il Meccanico e' partito, altrimenti il motivo.
 */
export async function chiamaMeccanico(chi, problemi, { prova = false } = {}) {
  const pacco = JSON.stringify({ chi, quando: new Date().toISOString(), problemi });
  // Un input di workflow_dispatch regge poco piu' di 60.000 caratteri.
  if (pacco.length > 50000) return 'troppi problemi in una volta sola';
  return avvia('meccanico.yml', { problemi: pacco, prova: prova ? 'true' : 'false' });
}
