# Regole dell'agente dei contenuti

L'agente le rilegge ogni volta, prima di scrivere. Non sono gusti: sono le cose che
Matteo ha già fatto togliere dagli articoli veri, e i fatti che ha confermato lui.
Se una regola va cambiata, si cambia qui.

## Cosa scrivere, in ordine di preferenza

1. **Una domanda vera di un cliente**, se ce n'è una nella sezione qui sotto. Vale
   più di qualsiasi argomento pensato a tavolino.
2. **Un articolo che sta a un passo dalla prima pagina**: vedi "Arricchire un articolo
   che c'è già" qui sotto. Se ce n'è uno, questo mese si lavora quello **al posto** di
   un articolo nuovo: un articolo che Google già mostra cento volte al mese vale più
   di uno che parte da zero.
3. **Il primo argomento della coda** che non sia già un articolo.
4. Se la coda è finita: **un tema legato a una pagina servizio che nessun articolo
   copre ancora**. Per capire quali sono scoperte, guardare i `relatedServices` degli
   articoli esistenti. Nella proposta va detto chiaramente che l'argomento l'ha
   scelto l'agente, così Matteo lo sa.

Mai due articoli sullo stesso tema. Prima di scegliere si leggono titoli e slug di
tutti gli articoli in `lib/blogPosts.ts`.

## Arricchire un articolo che c'è già

Il controllo SEO del lunedì scrive `agenti/seo/posizioni.json`. Fra i `segnali`
guarda quelli con **`tipo: "soglia"`** e una `pagina` che comincia con `/blog/`:
ricerche con tante viste e zero clic, per cui l'articolo sta fra il 9° e il 15° posto,
cioè in fondo alla prima pagina o all'inizio della seconda. Lì non clicca quasi
nessuno, e **il titolo non c'entra**: l'articolo deve salire.

- Salta gli articoli che compaiono in `agenti/seo/posizioni-lavorate.md` negli ultimi
  60 giorni. Le pagine che non sono del blog **non sono tue**, anche se sono in soglia.
- Se ce ne sono più di uno, prendi quello con più viste sommando le sue ricerche.
- Leggi le ricerche che lo riguardano: dicono cosa cerca la gente. L'articolo sale se
  risponde meglio **a quelle domande**. Aggiungi 1-2 sezioni nuove, o allarga quelle
  che ci sono, e 1 FAQ se manca proprio la risposta alla ricerca. Il titolo della
  pagina (H1) e il `metaTitle` si ritoccano solo se non contengono le parole cercate.
- **Non cambiare lo slug**, e non buttare via quello che c'è: si aggiunge e si
  migliora, non si riscrive da capo. Le "Regole che non si discutono" valgono uguali,
  e sui temi di costi vale ancora di più il divieto di cifre.
- **Collegamenti verso l'articolo**: 2-3 articoli correlati che non lo linkano ancora
  lo aggiungono ai loro `relatedPosts`. È la parte che lo fa salire di più.
- Non cambiare `publishedAt`. Aggiorna `readingMinutes` se il testo è cresciuto.
- Ramo `proposta/articolo-<slug esistente>`. Anteprima in
  `agenti/anteprime/<slug esistente>.md`, scritta per chi l'articolo non l'ha
  davanti: **perché** lo si arricchisce (ricerche, viste, posizione, zero clic, in
  italiano: *"quando cercano «depuratore acqua gratis» l'articolo esce all'11° posto,
  105 volte in un mese, e nessuno clicca"*), poi **solo le parti nuove o cambiate**
  per intero, poi i collegamenti aggiunti.
- Commit: prima riga `Articolo: arricchito «<titolo>»`.
- Aggiungi una riga in `agenti/seo/posizioni-lavorate.md` sul ramo della proposta.

## Domande dei clienti

Matteo le aggiunge qui quando un cliente chiede qualcosa di interessante. Una volta
usata, la domanda si toglie da qui.

_nessuna per ora_

## Coda

- `domande-prima-contratto-depuratore` — le domande da fare prima di firmare un contratto per il depuratore
- `quanto-si-risparmia-senza-bottiglie` — quanto si risparmia davvero smettendo di comprare bottiglie

Attenzione: sono tutti temi di costi e risparmi, cioè quelli più a rischio di numeri
inventati. Si tengono qualitativi: cosa fa variare il costo, quali voci mettere nel
conto, "te lo diciamo col sopralluogo gratuito". Nessuna cifra.

## Slug bruciati: non riproporli

- `acqua-sa-di-cloro` — lo copre già `acqua-rubinetto-firenze-si-puo-bere`
- `acqua-frizzante-bar-ristoranti` — scritto il 28 luglio 2026

## Tono

- Prima persona plurale, dando del tu: "noi", "ti".
- Diretto e onesto. Mai vendita aggressiva.
- Titoli in italiano piano. "Vieni a vedertelo dire" è stato bocciato perché non sta
  in piedi: meglio "Passiamo a dare un'occhiata".

## Regole che non si discutono

- **Niente numeri spacciati per dati Acquadirete**: prezzi, tempi di installazione,
  percentuali di risparmio. Meglio generico e onesto.
- **Salute**: solo fatti generali, e si rimanda sempre al medico o al pediatra.
- **Niente normative né adempimenti burocratici del cliente** (cosa dichiarare, ASL,
  consulenti). Matteo ha fatto togliere una sezione intera così, FAQ compresa: se un
  tema tocca la burocrazia del cliente, non si apre proprio.
- **Acquadirete non vende addolcitori**: non si nominano.
- `metaTitle` al massimo **60 caratteri**, `metaDescription` al massimo **160**.
  Si contano, non si stimano.

## Fatti veri che si possono usare

- Acquadirete lavora dal 2005 a Firenze, Prato, Pistoia e dintorni.
- Installa **miscelatori multivia a 3, 4 o 5 vie**, che sostituiscono il rubinetto
  esistente usando il foro già presente: niente fori nuovi nel piano, e un rubinetto
  solo invece di due. Vale anche per chi è in affitto. Le 5 vie sono: acquedotto
  calda, acquedotto fredda, depurata a temperatura ambiente, depurata fredda, frizzante.
- L'acqua dell'acquedotto è controllata e sicura **fino al contatore**. Da lì in poi
  colonna montante del condominio e tubature di casa sono rete privata, responsabilità
  del proprietario. Spiega perché due case nella stessa via hanno acqua diversa, e
  porta a "l'acqua che conta è quella al tuo rubinetto, ed è quella che analizziamo
  gratis". Senza allarmismi: sapore, sedimenti, non pericolo. Consiglio gratuito da
  dare: far scorrere l'acqua dopo lunghe soste.
- Il sopralluogo è gratuito.
- **Macchina sostitutiva: solo se necessario** (Matteo, 18 set 2026). Mai "in caso di
  guasto" detto come se valesse sempre, mai "non resti mai senz'acqua": si scrive
  "quando la riparazione richiede tempo e serve".
- **Preventivo scritto: "più o meno"**. Non promettere che ogni risposta è messa per
  iscritto: "le voci principali le trovi scritte sul preventivo".

## Come si scrive nel codice

- Il nuovo articolo è un oggetto `BlogPost` (forma in `lib/types.ts`) aggiunto in
  fondo all'array `BLOG_POSTS` di `lib/blogPosts.ts`, prima della chiusura `];`.
- Stile degli articoli vicini: chiavi senza virgolette, stringhe fra apici singoli.
  L'articolo `ogni-quanto-cambiare-filtri-depuratore` ha le chiavi fra virgolette
  perché l'aveva scritto un vecchio script: non va imitato.
- `sections`: la prima, senza `heading`, è l'introduzione; poi 4-6 sezioni con
  `heading` e `paragraphs`. Niente elenchi puntati: la pagina mostra solo paragrafi.
- `faqs`: 2 o 3.
- `publishedAt`: la data di oggi, `AAAA-MM-GG`.
- `readingMinutes`: numero di parole diviso 200, arrotondato.

## I collegamenti: la parte che si dimentica sempre

Ogni articolo nuovo si collega in tre modi:

1. `relatedPosts` del nuovo: 1-2 articoli esistenti davvero correlati.
2. **1-2 articoli vecchi aggiornati** perché il loro `relatedPosts` punti al nuovo.
   È il passaggio che salta sempre, ed è quello che conta di più.
3. `relatedServices`: le pagine servizio giuste, fra `depuratore`, `osmosi`,
   `carboni`, `frizzante`, `business`, `assistenza`, `prato`, `pistoia`.

L'abbinamento conta: un articolo per chi ha casa non si collega a uno per bar e
ristoranti.

## La proposta

- Si lavora sul ramo `proposta/articolo-<slug>`. **Mai su `main`.**
- Anteprima leggibile in `agenti/anteprime/<slug>.md`: titolo, meta title e meta
  description col numero di caratteri, tutto il testo, le FAQ, i collegamenti fatti
  (compresi gli articoli vecchi aggiornati). È il file che Matteo legge sul telefono,
  quindi niente codice: testo normale.
- Messaggio di commit: prima riga `Articolo: <titolo>`. Sotto, in poche righe,
  perché questo argomento e **cosa è da verificare col titolare**: ogni affermazione
  che non si appoggia ai fatti qui sopra.

## Lezioni dai rifiuti

Quando Matteo risponde `RIFIUTA ARTICOLO` con un motivo, il motivo finisce in
`agenti/contenuti/lezioni.md`. Si legge prima di scrivere.
