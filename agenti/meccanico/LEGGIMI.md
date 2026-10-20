# Il Meccanico: guasti già visti

Il Meccanico (`.claude/skills/meccanico/`, workflow *Meccanico - ripara quello che
non ha funzionato*) viene chiamato quando un agente non parte, fallisce o non
lascia tracce. Questo file è la sua memoria: i guasti già capitati, la causa vera e
com'è finita. **Chi ripara un guasto nuovo lo aggiunge in fondo**, nel ramo della
riparazione.

Chi lo chiama (con `scripts/lib/meccanico.mjs`):

- il **controllo del Direttore**, ogni mattina, per tutto quello che non riesce a
  sistemare da solo (lui da solo fa ripartire un agente che non è partito);
- la **segreteria**, quando una proposta non si costruisce, non si unisce a `main`,
  o una correzione non parte;
- l'**agente Ads**, quando l'analisi del mese non riesce;
- l'**agente Recensioni**, quando la modifica alle scritte del sito ("130+" →
  "140+", frasi "a 5 stelle") non parte o si ferma a metà.

## Come stanno insieme i pezzi (per orientarsi)

- Gli agenti su GitHub li fa partire **la sveglia**, una funzione di Netlify che
  gira ogni 15 minuti (`netlify/functions/sveglia-agenti.mjs`): legge gli orari in
  `netlify/functions/_shared/orari.mjs` e avvia il workflow se da allora non è
  partito. Usa un token GitHub che sta fra le variabili di Netlify.
- L'orologio di GitHub (`schedule:`) è rimasto solo come riserva su alcuni
  workflow, e arriva con ore di ritardo.
- Le routine su claude.ai (Contenuti, Social, Scheda Google, postino della bacheca)
  da GitHub non si vedono e non si possono far ripartire da qui: si riconoscono
  solo dalle tracce che lasciano nel repo e sulla bacheca.
- Dopo un passo fatto dall'azione di Claude le credenziali git del checkout non
  valgono più: chi deve spingere dopo usa `GITHUB_TOKEN` (vedi `bacheca-consegna.mjs`).

## Guasti già visti

**Agenti partiti con ore di ritardo** — fino al 12 ott 2026. Causa: l'orologio di
GitHub, sui progetti poco attivi, mette in coda i giri programmati (cruscotto e
controllo SEO del lunedì partivano 9-10 ore dopo). Rimedio: la sveglia su Netlify,
dal pomeriggio del 12 ott. *Come riconoscerlo:* in `giri-recenti.json` il giro in
ritardo ha `avviato_da: schedule`. Se il ritardo è **dopo** il 12 ott, la domanda
giusta è perché la sveglia non l'ha avviato: guarda se gli altri giri di quelle ore
sono `workflow_dispatch` (sveglia viva, problema di quel solo agente: è nella
tabella degli orari?) o `schedule` (sveglia ferma).

**Sveglia ferma** — non ancora capitato. La causa più probabile è il token GitHub
su Netlify scaduto o revocato: la sveglia stessa lo scrive a Matteo ("GitHub ha
rifiutato l'avvio"). È una cosa che può fare solo Matteo (strada C). Altra causa
possibile: l'ultimo deploy di Netlify è fallito e la funzione non c'è.

**Note per la bacheca perse in silenzio** — 12 ott 2026. Causa: dopo il passo con
l'IA le credenziali del checkout non valevano più, e la consegna non riusciva a
spingere. Rimedio: la consegna usa `GITHUB_TOKEN` e, se fallisce, fa fallire il giro.

**Note ferme "in arrivo" per ore** — non è un guasto se manca `POSTINO_TOKEN` fra i
segreti del repo: senza, il postino passa da solo ogni 3 ore. È un guasto se una
nota è ferma da più di 4 ore.

**Recensioni o revisione Ads avviati e "non è successo niente"** — avviati a mano
partono in prova: serve `prova: 'false'`, che la sveglia e il Direttore passano
dalla tabella degli orari.

**Un workflow appena creato non fa il suo primo giro programmato** — GitHub ci
mette anche ore ad attivare un orario nuovo. Va avviato una volta a mano.

**Il sito non si ripubblica dopo un commit** — se nel messaggio c'è `[skip ci]` o
`[skip netlify]`, Netlify lo salta: è voluto per i file di servizio, è un guasto
se il commit cambiava il sito.

**Una routine su claude.ai si ferma a metà** — il controllo di sicurezza delle
routine blocca i comandi che cancellano o riscrivono (`git checkout -B`, `git rm`,
`rm`). Le cancellazioni vanno dentro uno script del repo.

**Google Ads rifiuta la versione dell'API** — 18 ott 2026. La revisione Ads del
mese è fallita al primo passo: «Google Ads ha rifiutato la richiesta (HTTP 400):
Version v22 is deprecated. Requests to this version will be blocked.» Causa: Google
spegne ogni versione circa un anno dopo l'uscita (date in
developers.google.com/google-ads/api/docs/sunset-dates). All'inizio il blocco va a
tratti: il 19 ott il cruscotto ha letto la spesa con la v22 senza errori. Rimedio:
`VERSIONE` in `scripts/lib/ads.mjs` portata a v26 (vale fino a novembre 2027), in un
posto solo (la usa anche `ads-conversioni.mjs`). Prima di cambiarla: le "breaking
changes" delle note di rilascio contro i campi che usiamo, e l'indirizzo che senza
credenziali risponde 401 (404 = versione che non esiste). *Come riconoscerlo prima
che fallisca la revisione:* nel log del cruscotto «Spesa Google non letta: …
deprecated» (il cruscotto non fallisce, scrive la spesa vuota). Dopo la riparazione
la revisione del mese non riparte da sola: va avviata una volta `agente-ads.yml`.

**Il passo con l'IA si ferma in mezzo secondo** — 19 ott 2026, correzioni SEO. Nel
log: `"is_error": true`, `duration_ms` 508, `num_turns` 1, `total_cost_usd` 0,
`modelUsage` vuoto: l'IA non ha neanche cominciato, e il testo dell'errore il log
non lo mostra (l'azione lo nasconde). Danno questo quadro il limite d'uso
dell'abbonamento Claude raggiunto o un accesso rifiutato. Una configurazione
sbagliata si esclude con un altro giro con l'IA dello stesso giorno, stessa versione
di Claude Code, stesso modello e stessi parametri (il 19 ott Correggi-post alle 16:16
UTC ha lavorato 37 turni); un errore del servizio (500/529) no, perché Claude Code
riprova per minuti, non mezzo secondo. Rimedio: rilancio del solo lavoro fallito
(`rilancia`: rifà solo il job caduto; nel rilancio l'azione vede come attore chi
aveva avviato il giro la prima volta, quindi passa il controllo dei bot). Se
ricapita spesso serve vedere il testo dell'errore: un passo che, se l'IA fallisce,
stampa il campo `result` di `claude-execution-output.json` (tocca i workflow).

**Un guasto si perde se il Meccanico salta un giro** — 19-20 ott 2026. Il controllo
del Direttore dice un guasto solo per 48 ore dall'appuntamento (`DA_DIRE`). Il 19 il
Meccanico non ha lavorato (l'azione rifiutava i bot, sistemato la sera) e il 20 la
revisione Ads, con appuntamento il 18 alle 07:00 UTC, era già oltre: non è stata
ripassata, anche se il messaggio di riserva del Meccanico lo promette. A ogni giro
guarda anche i giri falliti in `giri-recenti.json` e le tue note «mi sono fermato
prima di finire» sulla bacheca: lì stanno i guasti rimasti senza risposta.
