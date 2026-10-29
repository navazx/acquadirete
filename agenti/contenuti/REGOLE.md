# Regole dell'agente dei contenuti

L'agente le rilegge ogni volta, prima di scrivere. Non sono gusti: sono le cose che
Matteo ha già fatto togliere dagli articoli veri, e i fatti che ha confermato lui.
Se una regola va cambiata, si cambia qui.

**Prima di tutto leggi `agenti/ordini.md`**: le priorità del mese scelte dal
Direttore e approvate da Matteo. Se una riguarda i contenuti, quel lavoro viene
prima dell'elenco qui sotto. Se in cima c'è scritto "in attesa di Matteo", non
sono ancora approvate: tienine conto, ma non sono un ordine.

## Ogni mese due lavori: uno nuovo e uno vecchio (dal 19 ott 2026)

Matteo vuole che gli articoli portino clienti, non solo visite (16 ott 2026). Fino a
ottobre il blog portava più della metà dei clic da Google e nessun contatto: chi
cerca "si può bere l'acqua del rubinetto" si informa, non compra. Per questo ogni
mese, nella **stessa proposta** (un ramo, un APPROVA):

1. **un articolo nuovo**, scelto con l'ordine qui sotto;
2. **un articolo vecchio rinforzato**, scelto come dice "Arricchire un articolo che
   c'è già". Se non ce n'è nessuno che lo meriti, lo dici nell'anteprima e fai solo
   il nuovo.

## Il metro: cosa vende

Un argomento vale per quanto è vicino all'acquisto, non per quante viste promette.

- **Vicine all'acquisto**: prezzi e costi (senza cifre inventate), confronti fra
  impianti o fra acquisto e contratti "gratis", problemi concreti in casa (calcare,
  sapore, bottiglie da portare su), le città e le zone, l'assistenza e i guasti.
- **Lontane**: curiosità sull'acqua, salute in generale, notizie. Si scrivono solo se
  portano chiaramente verso una pagina che vende, e mai due mesi di fila.

Per misurare guarda `agenti/seo/mese.json` (il controllo SEO del mese): per ogni
articolo ci sono i clic da Google (`google`), i contatti nati lì (`contatti90`) e
le visite contate dal sito (`visite`, dal 16 ott 2026: quante volte da lì parte un
modulo, una chiamata, un WhatsApp). Un articolo con tanti clic e niente contatti non
va copiato: va capito perché la gente non prosegue.

## Cosa scrivere, in ordine di preferenza

1. **Gli ordini del mese** (`agenti/ordini.md`), se uno riguarda i contenuti.
2. **Una domanda vera di un cliente**, se ce n'è una nella sezione qui sotto. Vale
   più di qualsiasi argomento pensato a tavolino.
3. **Gli argomenti della coda decisi da Matteo** (quelli con scritto "deciso da
   Matteo"): li ha scelti lui, vengono prima delle idee degli agenti.
4. **I buchi della mappa ricerche → pagine**: la sezione "Per l'agente Contenuti" di
   `agenti/seo/mese.md`. Ricerche che vendono senza una pagina adatta, coi numeri.
   Fra più buchi, quello più vicino all'acquisto (vedi "Il metro" qui sopra).
5. **Il resto della coda**, nell'ordine.
6. Se non c'è altro: **un tema legato a una pagina servizio che nessun articolo
   copre ancora**. Per capire quali sono scoperte, guardare i `relatedServices` degli
   articoli esistenti. Nella proposta va detto chiaramente che l'argomento l'ha
   scelto l'agente, così Matteo lo sa.

Mai due articoli sullo stesso tema. Prima di scegliere si leggono titoli e slug di
tutti gli articoli in `lib/blogPosts.ts`.

## Arricchire un articolo che c'è già

Ogni mese, insieme all'articolo nuovo. Quale, in quest'ordine:

1. quello indicato in `agenti/seo/mese.md` ("Per l'agente Contenuti", articoli da
   rinforzare);
2. uno in **soglia** (qui sotto);
3. l'articolo con più clic da Google negli ultimi 90 giorni (`agenti/seo/mese.json`)
   che non porta mai verso i prezzi o i servizi: lo si rinforza **nella parte che
   vende** (un collegamento nel testo verso la pagina giusta, una domanda frequente
   che risponde a "e quindi, cosa faccio?"), non nelle curiosità.

Il controllo SEO del lunedì scrive `agenti/seo/posizioni.json`. Fra i `segnali`
guarda quelli con **`tipo: "soglia"`** e una `pagina` che comincia con `/blog/`:
ricerche con tante viste e zero clic, per cui l'articolo sta fra il 9° e il 15° posto,
cioè in fondo alla prima pagina o all'inizio della seconda. Lì non clicca quasi
nessuno, e **il titolo non c'entra**: l'articolo deve salire.

- Salta gli articoli che compaiono in `agenti/seo/posizioni-lavorate.md` negli ultimi
  60 giorni. Le pagine che non sono del blog **non sono tue**, anche se sono in soglia:
  le rinforza l'agente SEO il lunedì.
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
- Va sullo **stesso ramo** dell'articolo nuovo (`proposta/articolo-<slug nuovo>`) e
  nella stessa anteprima, in una parte sua dopo l'articolo nuovo. Solo se questo mese
  non c'è un articolo nuovo il ramo prende lo slug di quello rinforzato. La parte del
  rinforzo è scritta per chi l'articolo non l'ha davanti: **perché** lo si arricchisce (ricerche, viste, posizione, zero clic, in
  italiano: *"quando cercano «depuratore acqua gratis» l'articolo esce all'11° posto,
  105 volte in un mese, e nessuno clicca"*), poi **solo le parti nuove o cambiate**
  per intero, poi i collegamenti aggiunti.
- Commit: se c'è anche il nuovo, prima riga `Articolo: <titolo nuovo> (e arricchito
  «<titolo vecchio>»)`; da solo, `Articolo: arricchito «<titolo>»`.
- Aggiungi una riga in `agenti/seo/posizioni-lavorate.md` sul ramo della proposta.

## Domande dei clienti

Matteo le aggiunge qui quando un cliente chiede qualcosa di interessante. Una volta
usata, la domanda si toglie da qui.

_nessuna per ora_

## Coda

- **`depuratore-fai-da-te-o-installato`** — "Depuratore fai da te o installato: cosa
  cambia davvero". **Deciso da Matteo il 21 set 2026: viene subito dopo l'articolo sul
  bonus della Regione**, scritto il 5 ott 2026: è quindi il prossimo della coda,
  prima degli argomenti sotto. Risponde a chi
  vede impianti molto più economici nei negozi di bricolage o online e si chiede perché
  pagarne di più. Nessuna cifra per quegli impianti ("costano molto meno"). Tono onesto
  ma chiaro: il fai da te all'inizio costa meno, ma saper fare un po' di idraulica non
  basta. **Punto centrale:** ogni macchina è diversa, e quando c'è un problema bisogna
  conoscere quell'impianto per capire cosa non va, quale pezzo serve e come cambiarlo.
  Le differenze da spiegare: (1) la scelta dell'impianto giusto dopo aver visto l'acqua,
  chi compra da solo sceglie a occhio; (2) l'installazione: allaccio all'acqua e allo
  scarico, taratura, a volte va forato il piano e servono gli attrezzi giusti, chi lo fa
  da solo rischia di rovinare il piano o di avere perdite sotto il lavello; (3) la
  manutenzione dimenticata: un filtro esausto filtra peggio; (4) se si rompe: Acquadirete
  conosce le macchine che installa, ha i ricambi e sa aggiustarle, senza rispedire niente;
  (5) la garanzia. Divieti: niente marchi di negozi (si dice "negozi di bricolage",
  "online"), niente prezzi, niente attrezzi specifici, niente allarmismi sulla salute.
  Collegare la pagina `/prezzi-depuratori/` (nel testo) e gli articoli
  `quanto-costa-depuratore-osmosi-inversa` e `noleggio-vs-acquisto-depuratore`.
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
- **Mai dire "non lasciare i tuoi dati nei moduli" in generale.** Acquadirete fa
  pubblicità su Facebook e Instagram proprio con un modulo per lasciare il numero:
  un avviso contro le truffe scritto largo ("non dare dati nei moduli", "non
  compilare moduli online") è un avviso contro i nostri annunci. Si scrive
  stretto: "nel modulo di una pubblicità che promette quel bonus". Vale per
  articoli, post social e post della scheda Google (corretto due volte: 5 e 12
  ott 2026).
- `metaTitle` al massimo **60 caratteri**, `metaDescription` al massimo **160**.
  Si contano, non si stimano.

## Fatti veri che si possono usare

- Acquadirete lavora dal 2005 a Firenze, Prato, Pistoia e dintorni.
- Installa **miscelatori multivia a 3, 4 o 5 vie**, che sostituiscono il rubinetto
  esistente usando il foro già presente: spesso così non serve forare il piano, e resta
  un rubinetto solo invece di due. **Mai promettere "nessun foro" in assoluto**
  (Matteo, 21 set 2026): a volte il piano va forato, e lo facciamo noi con gli
  attrezzi giusti. Non nominare attrezzi specifici. Vale anche per chi è in affitto. Le 5 vie sono: acquedotto
  calda, acquedotto fredda, depurata a temperatura ambiente, depurata fredda, frizzante.
- L'acqua dell'acquedotto è controllata e sicura **fino al contatore**. Da lì in poi
  colonna montante del condominio e tubature di casa sono rete privata, responsabilità
  del proprietario. Spiega perché due case nella stessa via hanno acqua diversa, e
  porta a "l'acqua che conta è quella al tuo rubinetto, ed è quella che misuriamo
  gratis". Senza allarmismi: sapore, sedimenti, non pericolo. Consiglio gratuito da
  dare: far scorrere l'acqua dopo lunghe soste.
- **Cosa misura il sopralluogo** (Matteo, 29 ott 2026): solo la **conducibilità
  elettrica** dell'acqua, cioè quanti sali ci sono sciolti. Non dice cosa contiene.
  Si scrive "misuriamo la tua acqua" o "ti facciamo vedere quanti sali contiene", mai
  che il sopralluogo trova o esclude metalli, nitrati, pesticidi, cloro o batteri, né
  che dice se l'acqua è buona o sicura. Niente "analisi completa" né "sapere com'è
  davvero la tua acqua".
- Il sopralluogo è gratuito. Dura una decina di minuti (Matteo, 22 ott 2026): si può scrivere "bastano una decina di minuti".
- **Macchina sostitutiva: solo se necessario** (Matteo, 18 set 2026). Mai "in caso di
  guasto" detto come se valesse sempre, mai "non resti mai senz'acqua": si scrive
  "quando la riparazione richiede tempo e serve".
- **Preventivo scritto: "più o meno"**. Non promettere che ogni risposta è messa per
  iscritto: "le voci principali le trovi scritte sul preventivo".
- **Il preventivo è gratuito, senza impegno e vale 3 mesi.**
- **10 anni di garanzia sugli impianti, esclusi i consumabili.** L'esclusione si
  scrive sempre insieme alla garanzia, mai "10 anni di garanzia" da solo.
- **Recensioni Google**: si scrive "oltre 130 recensioni su Google" con la media vera
  (`REVIEW_RATING_TESTO`), mai "130 recensioni a 5 stelle": Google non dice quante
  sono da 5. E non sono "certificate": quella parola non si usa.

## Parole che non si usano

Le ha tolte la revisione dei testi del 14 ott 2026; non vanno rimesse.

- "Ideale per neonati" o qualsiasi promessa per bambini: sui neonati decide il pediatra.
- "Definitiva", "ultra", "altissima qualità", "sistemi certificati": parole da depliant,
  non nostre.
- Allarmismi sull'acqua del rubinetto: "non è più sicura", "nell'acqua di Firenze ci
  sono…", "senza microplastiche" detto come promessa, i batteri. Per l'acqua di casa si
  parla di sapore, cloro e calcare.
- **Cosa trattiene l'osmosi si può dire** (Matteo, 29 ott 2026: nominare metalli
  pesanti e il resto perché è vero che l'osmosi li toglie, senza dire che per forza ci
  sono nell'acquedotto). Metalli pesanti, nitrati, pesticidi, microplastiche si possono
  nominare come cose che la membrana trattiene: è una caratteristica della macchina,
  detta con "riduce" o "trattiene", mai "elimina tutto". Non si legano mai all'acqua di
  una città o dell'acquedotto e non fanno capire che il rubinetto non è sicuro. Non
  si legano neanche al sopralluogo, che misura solo la conducibilità (vedi sopra). I
  batteri restano fuori: sono una promessa sulla salute.
- "Per sempre", "si ripaga", "la maggior parte delle persone preferisce…": promesse e
  statistiche che non possiamo dimostrare.

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
- `updatedAt` non lo scrivi, né nell'articolo nuovo né in quello rinforzato: lo
  mette da solo `scripts/lib/date-aggiornamento.mjs` quando Matteo approva, e
  dice a Google (nella mappa del sito) che l'articolo vecchio è cambiato.
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

4. **Nel testo**, almeno un collegamento verso la pagina dei servizi o dei prezzi
   che l'articolo spinge, e uno verso ogni guida che l'articolo cita.

**Collegamenti dentro il testo** (dal 17 ott 2026). In un paragrafo di un articolo
(`paragraphs` in `lib/blogPosts.ts`) si scrive `[parole del collegamento](/pagina/)`
e sul sito diventa un collegamento. Solo pagine del sito, con la barra finale
(`/prezzi-depuratori/`, `/depuratore-acqua-prato/`, `/blog/<slug>/`); nelle domande
frequenti (`faqs`) no, perché quel testo va anche a Google così com'è. Le parole sono
quelle della frase, vicine a quello che la gente cerca ("un acquisto diretto dello
stesso impianto", "depuratori d'acqua a Prato"), mai "clicca qui". Al massimo due per
articolo verso le pagine dei servizi o dei prezzi, più quelli verso le guide citate.
Il motivo: il blog porta la maggior parte dei clic da Google, ma fino al 17 ott 2026
chi leggeva non aveva modo di arrivare ai prezzi o ai servizi dal testo.

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
