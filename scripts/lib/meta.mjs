// ============================================================================
//  Pubblicazione su Facebook e Instagram (Graph API)
//
//  Il token e' META_PUBLISH_TOKEN, un secret di GitHub: e' SEPARATO da quello
//  che raccoglie i lead (META_PAGE_TOKEN, su Netlify). Se questo si rompe, i
//  contatti continuano ad arrivare. A luglio 2026 stavano sulla stessa gamba e
//  quando e' morta si sono fermati per quattro giorni.
//
//  Zero dipendenze npm.
// ============================================================================

const API = 'https://graph.facebook.com/v21.0';

export const PAGINA_FB = '1164447766749757';        // pagina "Acquadirete"
export const PROFILO_IG = '17841425768886174';      // @acquadirete.it

const token = () => {
  const t = process.env.META_PUBLISH_TOKEN;
  if (!t) {
    throw new Error(
      'Manca META_PUBLISH_TOKEN. Va messo nei secret del repo:\n' +
      '  https://github.com/navazx/acquadirete/settings/secrets/actions\n' +
      'Il valore si ricava con: node scripts/meta-token.mjs',
    );
  }
  return t;
};

async function post(path, params) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...params, access_token: token() }),
  });
  const dati = await res.json();
  if (!res.ok || dati.error) {
    const e = dati.error || {};
    throw new Error(`Meta ha rifiutato (${e.code || res.status}): ${e.message || 'errore sconosciuto'}`);
  }
  return dati;
}

/**
 * Post con foto sulla pagina Facebook.
 * La foto si passa come indirizzo pubblico, non come file: per questo le
 * immagini dei post stanno in public/assets/social/ e vanno online col deploy.
 */
export async function pubblicaFacebook(didascalia, urlFoto) {
  // Senza foto e' un post di solo testo, e cambia l'indirizzo a cui si chiede:
  // /photos vuole per forza un'immagine, /feed no.
  const r = urlFoto
    ? await post(`/${PAGINA_FB}/photos`, { url: urlFoto, message: didascalia, published: 'true' })
    : await post(`/${PAGINA_FB}/feed`, { message: didascalia });
  const id = r.post_id || r.id;
  return { id, url: `https://www.facebook.com/${id}` };
}

/**
 * Post su Instagram: si fa in due tempi, prima si prepara il contenitore e poi
 * lo si pubblica. E' l'API a volerlo cosi'.
 *
 * Instagram e' schizzinoso sulle immagini: JPEG, proporzioni fra 4:5 e 1.91:1,
 * sotto gli 8 MB. Un PNG o una foto troppo alta vengono rifiutati qui.
 */
export async function pubblicaInstagram(didascalia, urlFoto) {
  const contenitore = await post(`/${PROFILO_IG}/media`, { image_url: urlFoto, caption: didascalia });
  const r = await post(`/${PROFILO_IG}/media_publish`, { creation_id: contenitore.id });
  return { id: r.id, url: `https://www.instagram.com/p/${r.id}/` };
}

/** Controlla che il token sia vivo e abbia i permessi, senza pubblicare niente. */
export async function controllaToken() {
  const res = await fetch(`${API}/debug_token?input_token=${token()}&access_token=${token()}`);
  const dati = await res.json();
  if (dati.error) throw new Error(`Token non valido: ${dati.error.message}`);
  const scopes = new Set(dati.data?.scopes || []);
  const mancanti = ['pages_manage_posts', 'instagram_basic', 'instagram_content_publish']
    .filter((s) => !scopes.has(s));
  return { valido: !mancanti.length, mancanti, scadenza: dati.data?.expires_at };
}
