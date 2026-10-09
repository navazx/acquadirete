# Cartella degli agenti

Qui dentro sta lo stato di lavoro degli agenti. Non sono pagine del sito: non
finiscono online, servono a far parlare fra loro i pezzi che girano su GitHub.

## Gli ordini del mese: leggili per primi

`ordini.md` sono le **3 priorità del mese**, scelte dal Direttore e approvate da
Matteo. Ogni agente le legge prima di lavorare: se una lo riguarda, quel lavoro
viene prima del suo solito. Se in cima c'è scritto "in attesa di Matteo" non sono
ancora approvate.

Il Direttore (`direttore.yml`, istruzioni in `.claude/skills/direttore/`) gira il
1° del mese: `scripts/direttore-dati.mjs` raccoglie i numeri del mese finito in un
file temporaneo (mai nel repo: dentro c'è la spesa), il Direttore scrive gli ordini
sul ramo `proposta/ordini-AAAA-MM`, e la proposta arriva a Matteo come le altre,
con `APPROVA ORDINI` / `CORREGGI ORDINI` / `RIFIUTA ORDINI`. I numeri in euro gli
arrivano a parte, in un messaggio Telegram che non passa dal repo.
**Negli ordini e nei commit non si scrivono mai cifre in euro**: il repo è pubblico.

## La bacheca: leggila subito dopo gli ordini

`bacheca.md` sono le note che gli agenti si sono lasciati negli ultimi 30 giorni,
più quelle di Matteo: cosa hanno visto, cosa può servire agli altri. Ogni agente la
legge prima di lavorare e, finito il giro, lascia da 1 a 3 note. La bacheca vera è
un artifact su claude.ai che Matteo legge dal telefono; come si scrive, e come ci
arrivano gli agenti che girano su GitHub, sta in `bacheca/LEGGIMI.md`.

## Come funziona il post social

1. **Chi compone** scrive `social-bozza.json` e lo committa su `main`.
2. Il commit fa partire *Social - manda la bozza*, che manda foto e varianti su Telegram.
3. Matteo risponde. Ogni mezz'ora *Risposte su Telegram* (`scripts/risposte.mjs`) legge Telegram:
   - `PUBBLICA` (o `PUBBLICA 2`, `PUBBLICA 3`) → Facebook e Instagram
   - `RIMANDA` (o `SALTA`) → niente post questa settimana, **ma le idee restano**
   - `SCARTA` → archiviata, la prossima sarà nuova
   - qualsiasi altra cosa → non si pubblica. Nel dubbio si sta fermi.
4. La bozza viene ricommittata con dentro l'esito, e resta lì come archivio.

Se Matteo non risponde non succede niente: nessun sollecito, nessuna pubblicazione.

## Le proposte: articoli e correzioni SEO

Gli agenti che cambiano il sito non toccano mai `main`. Lavorano su un ramo a parte,
e il sito cambia solo se Matteo dice di sì.

1. L'agente spinge un ramo `proposta/articolo-<slug>`, `proposta/seo-<data>` oppure
   (il Direttore) `proposta/ordini-<AAAA-MM>`.
   Nel messaggio di commit: prima riga il titolo, sotto le note per Matteo.
2. Il push fa partire *Proposta - presentala a Matteo*, che **prova a costruire il
   sito** con quelle modifiche. Se non si costruisce, a Matteo arriva solo l'errore.
3. Se si costruisce, la proposta finisce in `agenti/proposte.json` con stato
   `in attesa` e arriva su Telegram **con l'anteprima come file**, presa da
   `agenti/anteprime/`: il testo completo per gli articoli, il prima e dopo in
   italiano per le correzioni SEO. Senza anteprima il messaggio non si capisce, ed è
   successo davvero: la prima proposta SEO aveva tutta la correzione stipata nella
   prima riga del commit (che diventa il titolo) e come dettaglio un link a GitHub.
   **La prima riga del commit è un titolo corto, il resto sta nell'anteprima.**
4. *Risposte su Telegram* esegue la risposta:
   - `APPROVA ARTICOLO` / `APPROVA SEO` → il ramo si unisce a `main` e va online
   - `RIFIUTA ARTICOLO` / `RIFIUTA SEO` e il motivo → il ramo si cancella. Il motivo,
     per gli articoli, finisce in `agenti/contenuti/lezioni.md`
   - `CORREGGI ARTICOLO` / `CORREGGI SEO` e cosa cambiare → il ramo resta, parte
     *Proposta - correggila* (`correggi-proposta.yml`, istruzioni in
     `.claude/skills/correggi-proposta/`) che applica le note e lo rispinge, e la
     proposta torna a Matteo corretta. Anche un `RIFIUTA` il cui motivo chiede di
     correggere o riproporre vale come `CORREGGI` (dal 5 ott 2026)
   - con una sola proposta aperta basta `APPROVA`, `CORREGGI` o `RIFIUTA`

Una proposta per tipo alla volta: finché ce n'è una in attesa, l'agente non ne
prepara un'altra dello stesso tipo.

Le regole per scrivere gli articoli stanno in `agenti/contenuti/REGOLE.md`.

**Dalle posizioni su Google alle proposte.** Il controllo SEO del lunedì scrive
`seo/posizioni.json`. Due tipi di segnale diventano lavoro: `vetrina` (pagina in alto,
zero clic → l'agente delle correzioni SEO riscrive titolo e description) e `soglia` su
un articolo del blog (fra il 9° e il 15° posto → l'agente Contenuti lo arricchisce al
posto di un articolo nuovo). Chi lavora una pagina lo segna in
`seo/posizioni-lavorate.md` e per 60 giorni non la si ritocca. `concorrenza` e le
pagine dei servizi in soglia restano a Matteo: toccano le pagine che portano i contatti.

## Le recensioni su Google

Il giro è in tre pezzi, perché nessuno dei tre può fare il lavoro degli altri.

1. **Il sensore** (`scripts/agente-recensioni.mjs`, ogni mattina su GitHub) chiede a
   Google le recensioni e le confronta con quelle già viste, in
   `recensioni/stato.json`. Le nuove le mette in coda in
   `recensioni/da-rispondere.json`.
2. **L'agente nel cloud** (lunedì, mercoledì, venerdì) legge la coda e scrive la
   risposta pronta da incollare in `recensioni/bozze/<data>-<nome>.md`, poi svuota
   la coda. Le regole stanno in `recensioni/REGOLE.md`.
3. **Il postino** (`scripts/recensioni-bozza.mjs`) manda a Matteo le bozze che non
   ha ancora mandato, e se le segna in `recensioni/mandate.json`.

**La risposta la incolla Matteo a mano**, dal profilo Google. Non è una scelta:
Google non dà modo di rispondere da fuori.

### Oggi il pezzo 2 è fermo, e il motivo è di Google

**Google non ci dà il testo delle recensioni di Acquadirete.** La scheda su Maps non
ha un indirizzo pubblico (è un'attività che va dal cliente), e per quelle l'API
risponde con nome, media e *numero* di recensioni, ma il campo con le recensioni non
lo manda affatto — verificato il 12 set 2026 chiedendolo esplicitamente.

Quindi il sensore fa quello che può, che non è poco: **si accorge che è arrivata una
recensione** (il totale è giusto, 135) e lo dice, con il link per leggerla e quello
per rispondere. Quello che non può fare è preparare la risposta, perché non sa cosa
c'è scritto. La routine che scrive le bozze è **spenta** finché non cambia qualcosa.

Per avere il testo — e per rispondere senza uscire da qui — serve la **Google
Business Profile API**: è gratis, ma va chiesta a Google e approvata.

Altre due cose che sembrano difetti e non lo sono:

- **Anche quando Google manda le recensioni, ne manda cinque**, le "più rilevanti", e
  ruotano. Quindi una recensione vecchia può comparire domani e sembrare nuova: va in
  coda solo quella scritta negli ultimi 60 giorni.
- **Per le recensioni belle non arriva nessun avviso subito**, solo la risposta
  pronta qualche giorno dopo. Due messaggi per la stessa recensione sarebbero
  rumore. Le eccezioni sono quelle da 3 stelle o meno, dove aspettare costa: lì
  l'avviso parte lo stesso giorno.

## Un solo lettore di Telegram

Telegram consegna ogni messaggio a chi lo legge per primo. Per questo **c'è un solo
script che legge le risposte di Matteo**, `scripts/risposte.mjs`, e smista gli ordini:
post social da una parte, proposte dall'altra. Un secondo lettore ruberebbe gli
ordini al primo. L'ultimo messaggio letto sta in `agenti/telegram-stato.json`.

## Rimandare non è scartare

`RIMANDA` toglie dalla bozza il segno `inviato` e incrementa `rimandi`. Il sabato
dopo il workflow gira a vuoto sull'agente che compone — che si ferma, perché una
bozza in attesa c'è già — e la ripresenta **identica**, dicendo quante volte è stata
rimandata. Al terzo rimando il messaggio suggerisce di scartarla, senza farlo da sé:
la decisione resta di Matteo.

`SCARTA` invece chiude la partita: la bozza prende il campo `scartato` e non è più
in attesa, quindi il sabato dopo l'agente ne compone una nuova.

## Il formato della bozza

`social-bozza.esempio.json` è lì come modello. In breve:

- `tema` — installazione, curiosità, contesto diverso, recensione (ruotano)
- `foto` — percorso dentro `public/assets/social/`, oppure `null`
- `varianti` — due o tre didascalie fra cui scegliere, ognuna coi suoi hashtag
- `grafica` — solo per le curiosità: i testi dell'immagine (vedi sotto)

## La grafica delle curiosità

**Una curiosità ogni tre post** (scelta di Matteo, 27 set 2026): la settimana
dell'anno divisibile per 3. Fra giugno e agosto 2026 Matteo le pubblicava con
la stessa immagine ogni volta: etichetta CURIOSITÀ con la lampadina,
titolo "LO SAPEVI CHE…" in blu notte con la parola chiave in azzurro, tre righe con
un'icona tonda, e a destra la cucina col depuratore. Quello stile resta: l'immagine
non si cerca e non si inventa, si fa con lo stampo `scripts/grafica-curiosita.mjs`.

Chi compone scrive nella bozza, oltre alle varianti:

```json
"grafica": {
  "titolo": "Lo sapevi che *il calcare* non fa male alla salute?",
  "intro": "facoltativa: una o due frasi",
  "punti": [
    { "icona": "testo:Ca Mg", "titolo": "Cos'è davvero", "testo": "Una o due frasi." },
    { "icona": "rubinetto", "titolo": "Il problema è un altro", "testo": "…" },
    { "icona": "attrezzi", "titolo": "Ognuno ha la sua acqua", "testo": "…" }
  ]
}
```

- Fra asterischi la parte in azzurro: il soggetto della curiosità.
- Esattamente tre punti, ognuno un titoletto corto e una o due frasi.
- Icone: goccia, scudo, rubinetto, bicchiere, foglia, casa, famiglia, bottiglia,
  filtro, onde (odori), lampadina, euro, check, cuore, bolle (frizzante), freddo,
  attrezzi, calendario; oppure `testo:…` per due-tre caratteri dentro il cerchio
  (`testo:Ca Mg`, `testo:NO₃`).

Poi `npm ci` e `node scripts/grafica-curiosita.mjs agenti/social-bozza.json`: lo
script scrive `public/assets/social/curiosita-<data>.jpg` e lo mette nel campo
`foto`. **Va aperta e guardata** prima del commit: se un testo è brutto a capo o
troppo fitto, si accorcia e si rifà. Se non ci sta, lo script si ferma e dice
cosa accorciare. Il commit porta anche l'immagine, e **senza `[skip netlify]`**:
Instagram la scarica dal sito.

Già uscite, da non ripetere: impianti di depurazione e osmosi, acqua frizzante,
i 700 kg di bottiglie all'anno, il calcare minerale naturale, il cloro, i nitrati.

**Senza foto si pubblica lo stesso, ma solo su Facebook**: Instagram l'immagine
la pretende, e deve stare a un indirizzo pubblico (per questo le foto vivono
nel sito e vanno online col deploy).

## Le foto

**Il modo più comodo: mandarle al bot su Telegram**, come foto o come file (il
file resta a piena qualità, anche HEIC). Il lettore delle risposte le salva in
`public/assets/social/` con un nome tipo `tg-2026-09-27-812.jpg`, le mette in riga
e le manda online col sito, e risponde "Foto ricevuta". Niente PC.

**Si può dire all'agente cosa c'è nella foto**: che impianto è, in che zona, per
chi. Basta scriverlo come didascalia della foto, oppure in un messaggio mandato
entro due minuti. Finisce in `agenti/social-foto-note.json` (e non accanto alla
foto, perché quella cartella va online col sito), e chi compone la bozza lo usa
come fatto vero. Anche lì valgono le regole di privacy: se la nota nomina il
cliente o la via, nel post non ci va.

Dal PC vanno in `sito/public/assets/social/`, **così come escono dal telefono**. Non
serve ritagliarle, convertirle o rinominarle: al primo push ci pensa il workflow
*Social - metti in riga le foto* (`scripts/normalizza-foto.mjs`), che

- le raddrizza secondo l'orientamento della fotocamera
- le converte in JPEG, anche partendo dagli HEIC dell'iPhone
- taglia dal centro solo quanto basta se sono troppo alte o troppo panoramiche
  (Instagram accetta da 4:5 a 1.91:1, e rifiuta senza spiegare perché)
- le porta a 1440px di lato lungo
- **toglie i dati EXIF**, dove fra le altre cose c'è il luogo dello scatto

Chi è già in regola non viene toccato. **Attenzione: la foto originale viene
sostituita** dalla versione sistemata — l'originale a piena risoluzione resta solo
dove ce l'hai tu.

Il nome del file non conta: chi compone la bozza **apre la foto e guarda cosa c'è
dentro**, quindi `IMG_2831.jpg` va benissimo.

## Doppie pubblicazioni

Non possono succedere: l'ordine viene tolto dalla coda di Telegram **prima**
di pubblicare. Se qualcosa va storto dopo, si perde l'ordine — non si pubblica
due volte. Fra i due, il male minore è chiaro.
