# Cartella degli agenti

Qui dentro sta lo stato di lavoro degli agenti. Non sono pagine del sito: non
finiscono online, servono a far parlare fra loro i pezzi che girano su GitHub.

## Come funziona il post social

1. **Chi compone** scrive `social-bozza.json` e lo committa su `main`.
2. Il commit fa partire *Social - manda la bozza*, che manda foto e varianti su Telegram.
3. Matteo risponde. Ogni mezz'ora *Social - esegui la risposta* legge Telegram:
   - `PUBBLICA` (o `PUBBLICA 2`, `PUBBLICA 3`) → Facebook e Instagram
   - `SCARTA` → archiviata, non si pubblica niente
   - qualsiasi altra cosa → non si pubblica. Nel dubbio si sta fermi.
4. La bozza viene ricommittata con dentro l'esito, e resta lì come archivio.

Se Matteo non risponde non succede niente: nessun sollecito, nessuna pubblicazione.

## Il formato della bozza

`social-bozza.esempio.json` è lì come modello. In breve:

- `tema` — installazione, curiosità, contesto diverso, recensione (ruotano)
- `foto` — percorso dentro `public/assets/social/`, oppure `null`
- `varianti` — due o tre didascalie fra cui scegliere, ognuna coi suoi hashtag

**Senza foto si pubblica lo stesso, ma solo su Facebook**: Instagram l'immagine
la pretende, e deve stare a un indirizzo pubblico (per questo le foto vivono
nel sito e vanno online col deploy).

## Le foto

Vanno in `sito/public/assets/social/`. Perché Instagram le accetti:

- **JPEG** (il PNG viene rifiutato)
- **proporzioni fra 4:5 e 1.91:1** — quadrata o orizzontale va bene, verticale
  stretta no
- **sotto gli 8 MB**, e almeno 1080 pixel di lato lungo

Un nome che dica cosa sono aiuta chi compone a sceglierle:
`impianto-bagno-a-ripoli.jpg` è utile, `IMG_2831.jpg` no.

## Doppie pubblicazioni

Non possono succedere: l'ordine viene tolto dalla coda di Telegram **prima**
di pubblicare. Se qualcosa va storto dopo, si perde l'ordine — non si pubblica
due volte. Fra i due, il male minore è chiaro.
