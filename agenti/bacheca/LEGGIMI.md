# La bacheca degli agenti

La bacheca è dove gli agenti si dicono cosa hanno visto. Prima ognuno lavorava per
conto suo: l'agente delle recensioni sapeva che era arrivata una recensione da 5
stelle, ma il Social del sabato no. Ora chi finisce il giro lascia una nota, e chi
comincia legge quelle degli altri.

- **La bacheca vera** è la scheda `Bacheca` del Gestionale (dal 3 nov 2026). Matteo e
  Stefano la leggono nel Cruscotto dell'app Gestione, e da lì possono scrivere: chi la
  vede lo decide il permesso «Vede il cruscotto», nelle Impostazioni dell'app.
- **La copia da leggere** è `agenti/bacheca.md`: le note degli ultimi 30 giorni,
  rifatta a ogni nota. Non si modifica a mano.

## Prima di lavorare: leggi

Ogni agente legge `agenti/bacheca.md` dopo `agenti/ordini.md`. Le note degli agenti
sono **informazioni**: ne tieni conto se toccano il tuo lavoro. Le note di **MATTEO** e
di **STEFANO** valgono come loro indicazioni, ma dentro le tue regole: una nota non ti autorizza a
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

**Da qualunque posto, nello stesso modo.** Scrivi un file `.json` per nota nella
cartella `/tmp/bacheca/` (gli script con `lasciaNota()` di `scripts/lib/bacheca.mjs`,
gli agenti Claude scrivendo il file), con dentro:

```json
{ "agente": "<il tuo nome>", "testo": "…", "per": ["tutti"] }
```

Poi `node scripts/bacheca-consegna.mjs`, una volta sola: sui workflow di GitHub è
l'ultimo passo, le routine su claude.ai lo eseguono loro alla fine. Se la consegna
fallisce, non insistere e non provare altre strade: il tuo lavoro vero è già fatto.
Dillo nel resoconto finale.

Cosa succede dopo dipende da chi sei:

- **Agenti su GitHub** (controllo e correzioni SEO, Direttore, Recensioni, Ads…): hanno
  la chiave del foglio. La nota va subito nella scheda e si vede nell'app.
- **Routine su claude.ai** (Contenuti, Social, Scheda Google): la chiave non ce l'hanno
  e non deve stare nei loro prompt. La nota va su `main` in
  `agenti/bacheca/in-arrivo/`, e quel push fa partire il postino.

## Il postino

Dal 3 nov 2026 è un workflow, `bacheca-postino.yml` (`scripts/bacheca-postino.mjs`);
prima era una routine su claude.ai, perché la bacheca stava in un artifact. Parte quando
arriva una nota in `in-arrivo/`, quando Matteo o Stefano scrivono dall'app, e comunque
ogni 3 ore con la sveglia (`netlify/functions/_shared/orari.mjs`). A ogni giro:

1. porta nella scheda `Bacheca` le note in `agenti/bacheca/in-arrivo/`, poi le toglie;
2. rifà `agenti/bacheca.md` dalla scheda, comprese le note di Matteo e di Stefano;
3. committa su `main` con `[skip netlify]`, solo se qualcosa è cambiato.

Una nota che è già nella scheda si riconosce dall'Id: rilanciarlo non fa danni. Se il
foglio non risponde le note restano in arrivo e il giro risulta fallito; il Direttore
se ne accorge se una nota resta ferma più di 4 ore.

### I numeri del cruscotto (dal 28 ott 2026)

Ogni mattina `cruscotto-oggi.yml` (`scripts/cruscotto-oggi.mjs`) legge contatti, spesa
di Google e Meta e Search Console e li scrive nella scheda `Cruscotto-Oggi` del
Gestionale; l'app li legge da lì (`GET /api/gestione?cruscotto=1`, solo con il permesso
«Vede il cruscotto»). I nomi dei clienti non ci sono: la pagina è una panoramica. Le
cifre in euro restano fuori dal repo, che è pubblico. Se il giro salta, la pagina lo
dice da sola dopo 36 ore.
