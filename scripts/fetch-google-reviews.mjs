// ============================================================================
//  Scarica le recensioni reali da Google (Places API New) e le salva in
//  lib/google-reviews.json. Eseguito automaticamente prima del build.
//
//  Variabili d'ambiente (in .env.local):
//    GOOGLE_PLACES_API_KEY  — (OBBLIGATORIA) API key Google Cloud con "Places API (New)" attiva
//    GOOGLE_PLACE_ID        — (opzionale) Place ID dell'attività (formato ChIJ...).
//                             Se assente, viene risolto cercando GOOGLE_PLACE_QUERY.
//    GOOGLE_PLACE_QUERY     — (opzionale) testo di ricerca dell'attività su Google.
//
//  Attività individuata dal link Google Maps fornito:
//    "Acquadirete di Stefano Piconese" — Via 1° Maggio 6, Montespertoli (FI)
//    CID Google: 0x8fb9e4ae2b8cbb8a — mid: /g/1tsw55w8
//
//  Se manca la API key o il fetch fallisce, lo script NON blocca il build:
//  lascia intatto il file esistente (fallback ai dati di esempio).
// ============================================================================

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
let placeId = process.env.GOOGLE_PLACE_ID;
const PLACE_QUERY =
  process.env.GOOGLE_PLACE_QUERY ||
  'Acquadirete di Stefano Piconese, Via 1° Maggio 6, Montespertoli';

const OUT_FILE = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'lib',
  'google-reviews.json'
);

if (!API_KEY) {
  console.warn(
    '[reviews] GOOGLE_PLACES_API_KEY non impostata: salto il fetch e mantengo i dati esistenti.'
  );
  process.exit(0);
}

try {
  // 1) Se non abbiamo il Place ID, lo risolviamo cercando l'attività per nome.
  if (!placeId) {
    const searchRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
      },
      body: JSON.stringify({ textQuery: PLACE_QUERY, languageCode: 'it' }),
    });
    if (!searchRes.ok) {
      throw new Error(`Text Search HTTP ${searchRes.status} — ${await searchRes.text()}`);
    }
    const searchData = await searchRes.json();
    const found = searchData.places?.[0];
    if (!found?.id) {
      throw new Error(`Nessuna attività trovata per la query: "${PLACE_QUERY}"`);
    }
    placeId = found.id;
    console.log(
      `[reviews] Attività risolta: ${found.displayName?.text || ''} — ${found.formattedAddress || ''} (Place ID: ${placeId})`
    );
  }

  // 2) Dettagli del luogo: media, totale e recensioni (max 5).
  const detailsRes = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=it`,
    {
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'rating,userRatingCount,reviews',
      },
    }
  );
  if (!detailsRes.ok) {
    throw new Error(`Place Details HTTP ${detailsRes.status} — ${await detailsRes.text()}`);
  }
  const data = await detailsRes.json();

  const reviews = (data.reviews ?? []).map((r, i) => ({
    id: `g${i + 1}`,
    author: r.authorAttribution?.displayName || 'Cliente Google',
    rating: typeof r.rating === 'number' ? r.rating : 5,
    date: r.relativePublishTimeDescription || '',
    text: r.text?.text || r.originalText?.text || '',
    source: 'google',
  }));

  const out = {
    rating: typeof data.rating === 'number' ? data.rating : 5,
    total: typeof data.userRatingCount === 'number' ? data.userRatingCount : reviews.length,
    reviews,
    fetchedAt: new Date().toISOString(),
  };

  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + '\n');
  console.log(
    `[reviews] OK: salvate ${reviews.length} recensioni Google (media ${out.rating}, totale ${out.total}).`
  );
} catch (err) {
  console.error('[reviews] Errore nel fetch delle recensioni Google:', err.message);
  console.warn('[reviews] Mantengo il file google-reviews.json esistente (build non bloccato).');
  process.exit(0);
}
