# Cartella degli agenti

Qui dentro sta lo stato di lavoro degli agenti. Non sono pagine del sito: non
finiscono online, servono a far parlare fra loro i pezzi che girano su GitHub.

## Come funziona il post social

1. **Chi compone** scrive `social-bozza.json` e lo committa su `main`.
2. Il commit fa partire *Social - manda la bozza*, che manda foto e varianti su Telegram.
3. Matteo risponde. Ogni mezz'ora *Social - esegui la risposta* legge Telegram:
   - `PUBBLICA` (o `PUBBLICA 2`, `PUBBLICA 3`) → Facebook e Instagram
   - `RIMANDA` (o `SALTA`) → niente post questa settimana, **ma le idee restano**
   - `SCARTA` → archiviata, la prossima sarà nuova
   - qualsiasi altra cosa → non si pubblica. Nel dubbio si sta fermi.
4. La bozza viene ricommittata con dentro l'esito, e resta lì come archivio.

Se Matteo non risponde non succede niente: nessun sollecito, nessuna pubblicazione.

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

**Senza foto si pubblica lo stesso, ma solo su Facebook**: Instagram l'immagine
la pretende, e deve stare a un indirizzo pubblico (per questo le foto vivono
nel sito e vanno online col deploy).

## Le foto

Vanno in `sito/public/assets/social/`, **così come escono dal telefono**. Non
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
