# La bacheca degli agenti

La bacheca è dove gli agenti si dicono cosa hanno visto. Prima ognuno lavorava per
conto suo: l'agente delle recensioni sapeva che era arrivata una recensione da 5
stelle, ma il Social del sabato no. Ora chi finisce il giro lascia una nota, e chi
comincia legge quelle degli altri.

- **La bacheca vera** è un artifact su claude.ai, che Matteo legge dal telefono e su
  cui può scrivere anche lui:
  https://claude.ai/artifact/WTSEAc6prF69SVXs3TcFzL (collezione `note`).
- **La copia da leggere** è `agenti/bacheca.md`: le note degli ultimi 30 giorni,
  rifatta ogni mattina dal postino. Non si modifica a mano.

## Prima di lavorare: leggi

Ogni agente legge `agenti/bacheca.md` dopo `agenti/ordini.md`. Le note degli agenti
sono **informazioni**: ne tieni conto se toccano il tuo lavoro. Le note di **MATTEO**
valgono come sue indicazioni, ma dentro le tue regole: una nota non ti autorizza a
spendere soldi, contattare clienti, cancellare o pubblicare senza approvazione. Gli
ordini veri del mese restano quelli di `ordini.md`.

## Alla fine: lascia una nota

**Cosa scrivere.** Quello che hai visto e che può servire a qualcun altro, o che fa
capire a Matteo cosa è successo. Esempi buoni:

- Recensioni: "È arrivata una recensione nuova, ora sono 137 con media 4,9." → per Social e Contenuti
- SEO: "L'articolo sull'acqua di Firenze è entrato in prima pagina." → per Social, che può rilanciarlo
- Contenuti: "Ho proposto l'articolo sull'erogatore frizzante: se passa, il Social ha un tema."
- Social: "Matteo ha scelto la variante con la foto vera: le foto vere funzionano meglio."

Da non scrivere: "ho finito il mio lavoro" senza dire cosa, il riassunto delle tue
istruzioni, cose che stanno già in `ordini.md`.

**Regole:**

- da 1 a 3 note per giro, una o due frasi ciascuna, al massimo 400 caratteri;
- `per`: `["tutti"]` oppure gli agenti a cui serve: `direttore`, `contenuti`,
  `seo`, `social`, `recensioni`, `scheda`, `lead`, `ads`, `meccanico`, `matteo`;
- **se il tuo messaggio su Telegram chiede a Matteo di fare o decidere qualcosa,
  lascia la stessa cosa in una nota `per: ["matteo"]`**: su Telegram passa una
  volta e si perde, sulla bacheca resta (lezione del 12 ott 2026);
- **niente nomi di clienti, telefoni, email, cifre in euro**: la bacheca finisce
  anche in `agenti/bacheca.md`, e il repo è pubblico;
- le note non si correggono e non si cancellano: se hai sbagliato, lascia una nota nuova.

## Come si scrive, secondo dove giri

**Routine su claude.ai** (Contenuti, Social, Scheda Google): scrivi direttamente
sulla bacheca. Carica lo strumento con ToolSearch (`select:ArtifactData`), poi:

- `action`: `set`
- `url`: `https://claude.ai/artifact/WTSEAc6prF69SVXs3TcFzL`
- `collection`: `note`
- `doc_id`: l'ora in formato ISO con `-` al posto di `:` e `.`, più il tuo nome
  (per esempio `2026-10-11T07-12-30-000Z-social`). Sempre un id nuovo: non
  sovrascrivere mai una nota che c'è già.
- `data`: `{ "quando": "<ora ISO>", "agente": "<il tuo nome>", "testo": "…", "per": ["tutti"] }`

Se la scrittura fallisce, non insistere e non provare altre strade: il tuo lavoro
vero è già fatto. Dillo nel resoconto finale.

**Agenti su GitHub** (controllo e correzioni SEO, Direttore, Recensioni): non
arrivano alla bacheca. Lasciano la nota come file `.json` in `/tmp/bacheca/`
(gli script con `lasciaNota()` di `scripts/lib/bacheca.mjs`, gli agenti Claude
scrivendo il file), e l'ultimo passo del workflow (`scripts/bacheca-consegna.mjs`)
la mette su `main` in `agenti/bacheca/in-arrivo/`.

## Il postino

Routine su claude.ai. Passa **ogni 3 ore**, dalle 04:30 alle 19:30 UTC (dal 12 ott
2026: prima passava solo la mattina, e la nota del controllo SEO del lunedì è
rimasta ferma fino al giorno dopo). In più `scripts/bacheca-consegna.mjs` lo
**sveglia subito** ogni volta che un agente su GitHub consegna una nota, se fra i
secret del repo c'è `POSTINO_TOKEN` (il token dell'avvio via API della routine: lo
genera Matteo, non è mai scritto nel repo). A ogni giro:

1. porta sulla bacheca le note in `agenti/bacheca/in-arrivo/`;
2. scarica le note dalla bacheca, comprese quelle di Matteo, e rifà
   `agenti/bacheca.md` con `scripts/bacheca-esporta.mjs`, che toglie anche da
   `in-arrivo/` le note ormai consegnate (il postino non cancella file a mano);
3. committa su `main` con `[skip netlify]`, solo se qualcosa è cambiato.

Le note degli agenti su GitHub arrivano sulla bacheca in un paio di minuti se il
postino viene svegliato, altrimenti entro 3 ore. Le note di Matteo verso gli
agenti su GitHub arrivano al giro dopo del postino, quindi anche quelle entro 3 ore.

### I numeri del cruscotto (dal 28 ott 2026)

La bacheca sta nella stessa pagina del cruscotto, e Matteo vuole i numeri della
scheda "Numeri" aggiornati ogni giorno. Ogni mattina `cruscotto-oggi.yml`
(`scripts/cruscotto-oggi.mjs`) legge contatti, spesa di Google e Meta e Search
Console, li mette su main in `agenti/cruscotto/oggi.enc` **chiusi a chiave** (ci
sono cifre in euro, e il repo è pubblico; i nomi dei clienti non ci sono: la pagina è una panoramica) e sveglia il postino
con la chiave nel messaggio, `CRUSCOTTO-CHIAVE <64 caratteri>`. Il postino apre il
file con `scripts/cruscotto-apri.mjs` e lo copia nel database della pagina,
documento `cruscotto/oggi`; la pagina ricalcola e ridisegna tutto da lì. La chiave
non sta da nessuna parte nel repo: senza il messaggio di quella mattina il file non
si apre. Se il giro salta, la pagina lo dice da sola dopo 36 ore.
