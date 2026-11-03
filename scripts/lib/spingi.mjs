// ============================================================================
//  Mettere un file su main da dentro un workflow, senza toccare la cartella di
//  lavoro (che puo' essere su un ramo di proposta, o avere file che non devono
//  finire nel repo).
//
//  Si lavora in un worktree a parte preso da main. Dopo un passo fatto
//  dall'azione di Claude le credenziali git del checkout non valgono piu': se
//  c'e' GITHUB_TOKEN si spinge con quello, scritto nell'indirizzo (stessa cosa
//  che fa scripts/bacheca-consegna.mjs, dove il difetto e' stato trovato il
//  12 ott 2026).
// ============================================================================

import { rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const TOKEN = process.env.GITHUB_TOKEN;
// SPINGI_REMOTO serve solo alle prove: un repository finto al posto di GitHub.
const REMOTO = process.env.SPINGI_REMOTO
  || (TOKEN ? `https://x-access-token:${TOKEN}@github.com/${process.env.GITHUB_REPOSITORY || 'navazx/acquadirete'}.git` : 'origin');
const CON_TOKEN = TOKEN && !process.env.SPINGI_REMOTO ? ['-c', 'http.https://github.com/.extraheader='] : [];
export const senzaToken = (testo) => (TOKEN ? String(testo).split(TOKEN).join('***') : String(testo));
const git = (args, cwd) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();

/**
 * `scrivi(dir)` riceve la cartella con main dentro, ci scrive quello che deve e
 * torna i percorsi da registrare. Torna true se ha spinto qualcosa, false se non
 * c'era niente di cambiato. Se non riesce lancia un errore (senza il token dentro).
 */
export function suMain(messaggio, scrivi, { autore = 'agente' } = {}) {
  try {
    git([...CON_TOKEN, 'fetch', '--quiet', REMOTO, 'main']);
    const dir = mkdtempSync(join(tmpdir(), 'spingi-'));
    git(['worktree', 'add', '--detach', dir, 'FETCH_HEAD']);
    try {
      const percorsi = scrivi(dir);
      git(['add', '--', ...percorsi], dir);
      if (!git(['status', '--porcelain'], dir)) return false;
      git(['-c', `user.name=${autore}`, '-c', 'user.email=noreply@acquadirete.it', 'commit', '--quiet', '-m', messaggio], dir);
      // Qualcun altro puo' aver spinto su main nel frattempo: si riprova dopo il rebase.
      for (let tentativo = 1; ; tentativo += 1) {
        try {
          git([...CON_TOKEN, 'push', '--quiet', REMOTO, 'HEAD:main'], dir);
          break;
        } catch (e) {
          if (tentativo >= 3) throw e;
          git([...CON_TOKEN, 'pull', '--quiet', '--rebase', REMOTO, 'main'], dir);
        }
      }
      return true;
    } finally {
      try { git(['worktree', 'remove', '--force', dir]); } catch { rmSync(dir, { recursive: true, force: true }); }
    }
  } catch (e) {
    throw new Error(senzaToken(e.stderr?.toString() || e.message));
  }
}

/**
 * Come suMain, per un file che riscrivono in tanti (agenti/bacheca.md): `scrivi`
 * può essere async, e se qualcun altro ha spinto nel frattempo non si fa il
 * rebase, che andrebbe in conflitto: si ricomincia da capo su main nuovo.
 * Quindi `scrivi` deve poter girare più volte. Torna true se ha spinto.
 */
export async function suMainDaCapo(messaggio, scrivi, { autore = 'agente', tentativi = 3 } = {}) {
  for (let tentativo = 1; ; tentativo += 1) {
    try {
      git([...CON_TOKEN, 'fetch', '--quiet', REMOTO, 'main']);
      const dir = mkdtempSync(join(tmpdir(), 'spingi-'));
      git(['worktree', 'add', '--detach', dir, 'FETCH_HEAD']);
      try {
        const percorsi = await scrivi(dir);
        git(['add', '-A', '--', ...percorsi], dir);
        if (!git(['status', '--porcelain'], dir)) return false;
        git(['-c', `user.name=${autore}`, '-c', 'user.email=noreply@acquadirete.it', 'commit', '--quiet', '-m', messaggio], dir);
        git([...CON_TOKEN, 'push', '--quiet', REMOTO, 'HEAD:main'], dir);
        return true;
      } finally {
        try { git(['worktree', 'remove', '--force', dir]); } catch { rmSync(dir, { recursive: true, force: true }); }
      }
    } catch (e) {
      if (tentativo >= tentativi) throw new Error(senzaToken(e.stderr?.toString() || e.message));
      await new Promise((ok) => setTimeout(ok, 2000 * tentativo));
    }
  }
}
