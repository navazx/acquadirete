# Acquadirete — sito web

Sito vetrina per **Acquadirete di Stefano Piconese** (depuratori e trattamento acqua, zona Firenze/Prato/Montespertoli). Next.js statico (SSG), pubblicato su Netlify.

## Stack e comandi
- Next.js 15 (App Router) + React 19 + TypeScript + Tailwind v4.
- `npm run dev` → dev server su porta **3001**.
- `npm run build` → build statico in `out/` (export statico, niente server Node in produzione).
- **Non lanciare `next build` mentre `next dev` è attivo**: corrompe `.next` (errore "Cannot find module './NNN.js'"). Se succede: fermare dev, eliminare `.next`, rilanciare.

## Deploy
Netlify con **auto-deploy via Git**: il repo è **github.com/navazx/acquadirete** e ogni **push su `main`** fa partire una build su Netlify che pubblica da sé (Netlify ricostruisce server-side, quindi NON serve buildare/caricare `out/` a mano per pubblicare). Branch `main` = live; `bozza-blog` = bozze articoli non ancora pubblicate. **Prima di ragionare su `origin/main` fare sempre `git fetch`** (la ref locale può essere stale). Il vecchio metodo manuale (`npm run build` + drag della cartella `out/` su Netlify) resta valido come fallback se l'auto-deploy non parte. Sito live su **https://www.acquadirete.it** (dominio collegato; `acquadirete.it` senza www fa redirect a www, che è il dominio primario — `SITE_URL` in `lib/siteConfig.ts` usa la versione www per coerenza con canonical/sitemap/robots). URL Netlify originale (https://acquadirete.netlify.app) ancora attivo come fallback.

## Struttura
- `app/<slug>/page.tsx` — pagine server, ognuna esporta `metadata` (title/description/canonical) per la SEO. Il sito è stato migrato da SPA Vite a Next SSG apposta per essere indicizzabile (ogni pagina ha URL reale, JSON-LD LocalBusiness, sitemap.xml, robots.txt).
- `components/` — viste client (`HomeView`, `ServicePageView`, ecc.) renderizzate dalle pagine server.
- `lib/` — dati condivisi: `siteConfig.ts` (contatti, URL Google, chiave Web3Forms), `routes.ts` (mappa slug↔pagina, **unico punto da modificare per cambiare un URL**), `data.ts`, `types.ts`, `reviews.ts`.
- `public/assets` — immagini.
- Modali gestite da `ModalProvider` (context + hook `useModal`).

## Pagine attive (11 + blog + legali)
`/`, `/depuratore-acqua-firenze`, `/depuratore-acqua-prato`, `/depuratore-acqua-pistoia`, `/osmosi-inversa-firenze`, `/depuratore-acqua-uffici-firenze`, `/assistenza-depuratore-firenze`, `/depuratore-carboni-attivi-firenze`, `/acqua-frizzante-firenze`, `/recensioni`, `/contatti` (mappa completa in `lib/routes.ts`).

Più `/blog` (indice) e i singoli articoli in `app/blog/[slug]/page.tsx` (contenuti in `lib/blogPosts.ts`), e le pagine legali `/privacy-policy`, `/cookie-policy`, `/note-legali` (escluse di proposito da `app/sitemap.ts`).

## Contatti e dati aziendali
Tutto in `lib/siteConfig.ts` — **modificare solo lì** per aggiornare telefono/WhatsApp/email/indirizzo/P.IVA in tutto il sito.

## Recensioni Google
Inserimento **manuale** in `lib/google-reviews.json` (7 recensioni reali, media 5,0/128, `source:"google"`), esposte da `lib/reviews.ts`. Quando le recensioni sono "live" i filtri per categoria spariscono (Google non fornisce la categoria). Le diciture marketing "120+"/"5.0" in Header/Footer/HomeView sono statiche ma veritiere.

C'è anche un metodo automatico predisposto ma non attivo: `scripts/fetch-google-reviews.mjs` (girato in `prebuild`) sovrascriverebbe il JSON se in `.env.local` fosse impostata `GOOGLE_PLACES_API_KEY` (+ opz. `GOOGLE_PLACE_ID`). Senza chiave non fa nulla.

Place ID Google (CID): `0x8fb9e4ae2b8cbb8a`, mid `/g/1tsw55w8`.
- `GOOGLE_PROFILE_URL` → apre il profilo per leggere tutte le recensioni.
- `GOOGLE_WRITE_REVIEW_URL` → apre direttamente il dialogo "scrivi recensione" a stelle.

## Form contatti
**Niente più email/Web3Forms (rimosso il 2026-07-16)**: il form invia solo a `/api/lead` (funzione Netlify, `netlify/functions/lead.mjs`), che scrive la richiesta sul foglio Google "Gestionale_Clienti" (scheda **"Lead-Contatti"**, con Provenienza "Sito web" e Stato "Da richiamare" — valori dei menu a tendina del foglio, da tenere allineati) e manda l'avviso Telegram. In `next dev` l'endpoint non esiste: il form simula l'invio riuscito (fallback in `ContactForm.tsx`). C'è anche `/api/meta-leads` (`netlify/functions/meta-leads.mjs`): webhook per i moduli Lead Ads di Meta, che scrive sulla stessa scheda con Provenienza "Meta / Facebook". Le pagine privacy/cookie policy citano Google e Telegram (non più Web3Forms) come fornitori per il modulo. Helper condiviso in `netlify/functions/_shared/google-sheets.mjs` (service account del report SEO, zero dipendenze). Env necessarie su Netlify: `GSC_KEY_JSON`, `LEADS_SHEET_ID`, `META_VERIFY_TOKEN` + `META_PAGE_TOKEN` (+ `META_APP_SECRET` opzionale) per la parte Meta. In `next dev` gli endpoint `/api/*` non esistono (sono funzioni Netlify): il form funziona lo stesso.

Dopo la scrittura sul foglio, entrambe le funzioni mandano un avviso Telegram col riepilogo del contatto (`netlify/functions/_shared/telegram.mjs`, env `TELEGRAM_BOT_TOKEN`; best-effort: se l'invio fallisce il lead resta salvato). Le env delle funzioni su Netlify vanno impostate **non-secret e con scope "all"** (con flag secret o scope ristretto il runtime non le riceve) e ogni modifica env richiede un redeploy.

## Convenzioni
- Aggiungere una pagina servizio: creare `app/<slug>/page.tsx`, registrare lo slug in `lib/routes.ts` (e `types.ts` se serve un nuovo `PageId`), riusare `ServicePageView`.
- Non duplicare dati di contatto o URL Google altrove: sempre da `siteConfig.ts`.
