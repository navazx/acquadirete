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
  const urls = [urlFoto].flat().filter(Boolean);
  let r;
  if (urls.length > 1) {
    // Piu' foto in un post solo: si caricano senza pubblicarle, poi un post le
    // tiene insieme. E' cosi' che Facebook fa gli album dentro un post.
    const ids = [];
    for (const url of urls) ids.push((await post(`/${PAGINA_FB}/photos`, { url, published: 'false' })).id);
    const allegati = Object.fromEntries(ids.map((id, i) => [`attached_media[${i}]`, JSON.stringify({ media_fbid: id })]));
    r = await post(`/${PAGINA_FB}/feed`, { message: didascalia, ...allegati });
  } else if (urls.length === 1) {
    // Senza foto e' un post di solo testo, e cambia l'indirizzo a cui si chiede:
    // /photos vuole per forza un'immagine, /feed no.
    r = await post(`/${PAGINA_FB}/photos`, { url: urls[0], message: didascalia, published: 'true' });
  } else {
    r = await post(`/${PAGINA_FB}/feed`, { message: didascalia });
  }
  const id = r.post_id || r.id;
  return { id, url: `https://www.facebook.com/${id}` };
}

/** Aspetta che Instagram abbia finito di preparare un contenitore (un carosello ci mette un po'). */
async function pronto(id) {
  for (let i = 0; i < 10; i += 1) {
    const res = await fetch(`${API}/${id}?fields=status_code&access_token=${token()}`);
    const dati = await res.json();
    // Se lo stato non si legge si va avanti: prima di questo controllo si
    // pubblicava subito, e funzionava.
    if (dati.error || !dati.status_code || dati.status_code === 'FINISHED') return;
    if (dati.status_code === 'ERROR' || dati.status_code === 'EXPIRED') {
      throw new Error(`Instagram non ha preparato il post (${dati.status_code})`);
    }
    await new Promise((ok) => setTimeout(ok, 3000));
  }
}

/**
 * Post su Instagram: si fa in due tempi, prima si prepara il contenitore e poi
 * lo si pubblica. E' l'API a volerlo cosi'.
 *
 * Instagram e' schizzinoso sulle immagini: JPEG, proporzioni fra 4:5 e 1.91:1,
 * sotto gli 8 MB. Un PNG o una foto troppo alta vengono rifiutati qui.
 */
export async function pubblicaInstagram(didascalia, urlFoto) {
  const urls = [urlFoto].flat().filter(Boolean);
  let contenitore;
  if (urls.length > 1) {
    // Carosello: un contenitore per foto, poi uno che li mette in fila.
    // Instagram le taglia tutte come la prima.
    const figli = [];
    for (const url of urls) {
      figli.push((await post(`/${PROFILO_IG}/media`, { image_url: url, is_carousel_item: 'true' })).id);
    }
    for (const id of figli) await pronto(id);
    contenitore = await post(`/${PROFILO_IG}/media`, { media_type: 'CAROUSEL', children: figli.join(','), caption: didascalia });
  } else {
    contenitore = await post(`/${PROFILO_IG}/media`, { image_url: urls[0], caption: didascalia });
  }
  await pronto(contenitore.id);
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
