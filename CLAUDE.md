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
Le 7 recensioni per esteso in `lib/google-reviews.json` sono inserite **a mano**; `rating` e `total` invece li allinea a Google l'agente recensioni ogni giorno (dal 4 ott 2026: 4,9 su 136), esposte da `lib/reviews.ts` come `REVIEW_TOTAL`/`REVIEW_RATING`. Quando le recensioni sono "live" i filtri per categoria spariscono (Google non fornisce la categoria).

**Attenzione al doppio binario del conteggio.** `REVIEW_TOTAL` è dinamico e alimenta `ReviewList` e il JSON-LD `aggregateRating` (`app/layout.tsx`, `app/recensioni/page.tsx`). Le diciture marketing dicono invece **"130+"/"oltre 130"** e sono testo *hardcoded*: **18 occorrenze in 10 file** fra `components/` e `app/` (Header, Footer, HomeView, più i `title`/`description` di homepage, recensioni e pagine servizio). Per trovarle tutte prima di cambiare il numero:

```bash
grep -rn "130" sito/components/ sito/app/ --include=*.tsx
```

L'arrotondamento per difetto è voluto: "130+" resta veritiero finché `total` ≥ 130, quindi non va rincorso a ogni recensione nuova — si aggiorna a scaglioni di dieci.

C'è anche un metodo automatico predisposto ma non attivo: `scripts/fetch-google-reviews.mjs` (girato in `prebuild`) sovrascriverebbe il JSON se in `.env.local` fosse impostata `GOOGLE_PLACES_API_KEY` (+ opz. `GOOGLE_PLACE_ID`). Senza chiave non fa nulla.

Place ID Google (CID): `0x8fb9e4ae2b8cbb8a`, mid `/g/1tsw55w8`.
- `GOOGLE_PROFILE_URL` → apre il profilo per leggere tutte le recensioni.
- `GOOGLE_WRITE_REVIEW_URL` → apre direttamente il dialogo "scrivi recensione" a stelle.

## Form contatti
**Niente più email/Web3Forms (rimosso il 2026-07-16)**: il form invia solo a `/api/lead` (funzione Netlify, `netlify/functions/lead.mjs`), che scrive la richiesta sul foglio Google "Gestionale_Clienti" (scheda **"Lead-Contatti"**, con Provenienza "Sito web" e Stato "Da richiamare" — valori dei menu a tendina del foglio, da tenere allineati) e manda l'avviso Telegram. In `next dev` l'endpoint non esiste: il form simula l'invio riuscito (fallback in `ContactForm.tsx`). C'è anche `/api/meta-leads` (`netlify/functions/meta-leads.mjs`): webhook per i moduli Lead Ads di Meta, che scrive sulla stessa scheda con Provenienza "Meta / Facebook". Le pagine privacy/cookie policy citano Google e Telegram (non più Web3Forms) come fornitori per il modulo. Helper condiviso in `netlify/functions/_shared/google-sheets.mjs` (service account del report SEO, zero dipendenze). Env necessarie su Netlify: `GSC_KEY_JSON`, `LEADS_SHEET_ID`, `META_VERIFY_TOKEN` + `META_PAGE_TOKEN` (+ `META_APP_SECRET` opzionale) per la parte Meta. In `next dev` gli endpoint `/api/*` non esistono (sono funzioni Netlify): il form funziona lo stesso.

**Contatti arrivati dagli annunci Google** (dal 2026-09-27): `lib/provenienza.ts` legge all'atterraggio se l'indirizzo ha il parametro che Google Ads aggiunge solo ai clic sugli annunci (`gclid`, `gbraid`, `wbraid`); il form lo manda come `daAnnuncioGoogle` e `lead.mjs` scrive nelle Note "(dalla pagina /, arrivato da un annuncio Google)" e aggiunge una riga al Telegram. Niente cookie né storage: il valore vive in memoria nella scheda (sopravvive alle navigazioni interne, non alla chiusura), quindi conta anche chi rifiuta i cookie — cioè i moduli che le conversioni di Google Ads non vedono. La colonna Provenienza resta "Sito web" (valore del menu a tendina).

**Anti-doppioni** (`appendOrMergeRow` in `_shared/google-sheets.mjs`): se lo stesso telefono (confronto sulle ultime 9 cifre, così i formati diversi coincidono) o la stessa email compare già in Lead-Contatti entro 30 giorni, la riga esistente viene completata (telefono/email mancanti, Interesse se vuoto, nota "Ha ricontattato il …") invece di crearne una seconda. Data e Stato non si toccano mai: li gestisce l'utente. Oltre i 30 giorni è considerata una richiesta nuova e prende una riga sua.

Dopo la scrittura sul foglio, entrambe le funzioni mandano un avviso Telegram col riepilogo del contatto (`netlify/functions/_shared/telegram.mjs`, env `TELEGRAM_BOT_TOKEN`; best-effort: se l'invio fallisce il lead resta salvato). Le env delle funzioni su Netlify vanno impostate **non-secret e con scope "all"** (con flag secret o scope ristretto il runtime non le riceve) e ogni modifica env richiede un redeploy.

## App "Gestione" (telefono di babbo)
`/gestione/` (file in `public/gestione/`, fuori da Next) è l'app per il telefono di Stefano: manutenzioni da fare ("fatta", "rimanda", mappa dei giri; i tasti delle città sono stati tolti il 05/10/2026, al loro posto c'è la mappa), contatti da richiamare e contatto nuovo scritto a mano, ricerca clienti, cliente nuovo e modifica dati. Il contatto nuovo passa da `appendOrMergeRow`, lo stesso del modulo del sito (anti-doppioni compreso), con la zona da `_shared/zone.mjs`. A ogni modifica dei file dell'app alzare `?v=` in `public/gestione/index.html`, se no un telefono può tenersi la versione vecchia. Legge e scrive il Gestionale_Clienti tramite `/api/gestione` (`netlify/functions/gestione.mjs`, logica in `_shared/gestionale.mjs`). Usa lo stesso service account dei lead (`GSC_KEY_JSON`, `LEADS_SHEET_ID`) più `GESTIONE_CHIAVE`, una chiave per persona nel formato `babbo:<chiave>,matteo:<chiave>` (il nome finisce nella colonna "Segnata da" dello storico). Si attiva un telefono una volta sola con `https://www.acquadirete.it/gestione/#chiave=<chiave>`; i link veri stanno in `acquadirete/gestione-chiavi.txt`, fuori dal repo (che è pubblico). Se un telefono si perde: si cambia solo la sua chiave e si rifà il deploy.

**Regole in copia doppia.** Le automazioni di Apps Script del foglio (codice C0xx, formula di "Prossima manutenzione", zona/provincia dalla città, lead → cliente) sono onEdit e **non scattano quando scrive l'API**: `_shared/gestionale.mjs` le rifà per le righe create dall'app. Chi cambia quelle del foglio (`documenti/gestionale-lead-a-cliente.gs`) cambia anche queste, e viceversa. "Manutenzione fatta" scrive anche una riga nella scheda `Storico-Interventi` (creata alla prima volta). Il nome di un lead che diventa cliente passa da `cognomePrimo` (gemella di `cognomePrimoLC` in Codice.gs v13, dal 01/10/2026): non si gira più alla cieca, si gira solo se la prima parola compare come nome di battesimo (ultima parola dei clienti) più spesso dell'ultima. La colonna **"Data stato"** di Lead-Contatti (colonna H, dal 30/09/2026) è il giorno dell'ultimo cambio di Stato: la scrivono sia l'app (`segnaDataStato`) sia l'onEdit del foglio (`segnaDataStatoLead`, Codice.gs v12), solo se lo stato cambia davvero. Vuota vuol dire mai cambiato, e allora vale la Data di arrivo. L'app la passa al client come `l.dataStato`, e la usa "Da risentire". In Clienti-Impianti, in fondo, ci sono le colonne **"Sospesa / Urgente"** e **"Motivo"** (dal 01/10/2026, le crea l'app al primo uso). "Sospesa" toglie il cliente dalle scadute finché non si riattiva; "Urgente" vuol dire che ha chiamato per un guasto e il cliente va in cima alla home. Il motivo comincia con la data ("01/10/2026 — perde acqua"). "Manutenzione fatta" toglie tutti e due i segni, "rimanda" toglie solo "Sospesa"; l'annulla li rimette. I nomi delle colonne sono scelti apposta senza le parole che usano le altre automazioni per trovare le loro (manutenzione, note, zona…). **Clienti persi** (dal 01/10/2026): scheda `Clienti-Persi`, con riga 1 = intestazioni di Clienti-Impianti più "Perso il". Dall'app "Non è più nostro cliente" sposta la riga lì (`spostaCliente`: prima scrive di là, poi ricontrolla il codice e solo allora elimina la riga di qua) e "È tornato cliente" la riporta indietro. La prossima manutenzione passa come valore, non come formula. Il codice C0xx di un cliente nuovo tiene conto anche dei persi; l'onEdit del foglio no (caso raro, documentato). `importaPersi` (solo chiave "matteo") rimette righe riprese da un backup: così sono tornati i 15 cancellati a mano il 30/09.

**Mappa dei giri** (dal 05/10/2026): dalle Manutenzioni, «Vedi sulla mappa» apre una mappa (Leaflet da cdnjs con SRI, cartine OpenStreetMap) con un puntino per ogni manutenzione urgente, scaduta o in scadenza; si toccano i clienti da mettere nel giro (massimo 10, ordinati da soli partendo dalla sede di Montespertoli) e il giro si apre in Google Maps. Le coordinate stanno nella scheda **`Coordinate`** del Gestionale (Codice, Lat, Lng, Precisione, Indirizzo cercato, Aggiornato il): le cerca il telefono su Nominatim (OpenStreetMap, una richiesta al secondo) e le salva con l'azione `posizioni` (`salvaPosizioni`). Una posizione vale finché l'indirizzo è quello cercato: se cambia, l'app la ricerca. Precisione "paese" = centro del paese (indirizzo non trovato), "nessuna" = non trovato neanche il paese, **"gps"** = segnata sul posto (dal 06/10/2026): nella scheda cliente «Sono qui: segna la posizione» salva il punto dove sta il telefono, con conferma, margine del GPS (oltre 100 m rifiuta) e avviso se si è lontani da dove la mappa metteva il cliente. Una "gps" non si ricerca mai e regge le correzioni dell'indirizzo fatte dall'app nello stesso paese (`tieniPosizioneSulPosto` in `modificaCliente`); se cambia il paese decade. Nessuna automazione del foglio legge questa scheda. «Dove sono» sulla mappa segue il telefono col puntino blu (si accende da solo se il permesso c'è già). La posizione funziona solo perché `public/_headers` dà `geolocation=(self)`: fino al 06/10/2026 era `geolocation=()` e il telefono non la dava mai (in locale non si vedeva, il server di prova non manda quelle intestazioni). E la regola delle icone `svg { width: 1em }` di `app.css` va tenuta lontana dai disegni di Leaflet (`.leaflet-pane > svg`), se no il puntino blu diventa mezzo pixel.

Prova in locale: `node scripts/gestione-locale.mjs` (anteprima "gestione", porta 3005). Legge il foglio vero con la chiave di sola lettura e scrive su una copia in memoria: si può provare ogni pulsante senza toccare niente.

## Convenzioni
- Aggiungere una pagina servizio: creare `app/<slug>/page.tsx`, registrare lo slug in `lib/routes.ts` (e `types.ts` se serve un nuovo `PageId`), riusare `ServicePageView`.
- Non duplicare dati di contatto o URL Google altrove: sempre da `siteConfig.ts`.
