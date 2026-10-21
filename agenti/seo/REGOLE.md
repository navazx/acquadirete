# Regole dell'agente delle correzioni SEO

Il controllo del lunedì (`scripts/agente-seo.mjs`) trova i problemi e li scrive in
`agenti/seo/controllo.json`. Questo agente legge quel file e prepara le correzioni
come **proposta**: Matteo le approva o le rifiuta su Telegram, come gli articoli.

La regola di fondo: **si correggono cose con un prima e un dopo che Matteo capisce
in una riga.** Quando serve una scelta semplice (quale di due pagine deve vincere
una ricerca) **la proponi tu, già pronta, e Matteo la conferma su Telegram**: non
si lascia una cosa semplice ad aspettare che lui si sieda al PC (sua richiesta del
12 ott 2026). Vale anche per le pagine dei servizi che devono salire: **le
rinforzi aggiungendo, senza riscriverle** (dal 13 ott 2026). Quello che richiede
di riscrivere i testi che ci sono o di cambiare strategia resta fuori: lo segnala
il controllo.

## Cosa correggi

| problema (`chiave`)          | cosa fare |
|------------------------------|-----------|
| `titolo-lungo`, `titolo-assente` | riscrivere il titolo entro 60 caratteri |
| `description-lunga`, `description-assente` | riscrivere la description entro 160 caratteri |
| `titolo-doppio`, `description-doppio` | rendere ognuna diversa e specifica della sua pagina |
| `alt` | aggiungere un testo alternativo che descriva l'immagine |
| `link-redirect` | far puntare il link direttamente alla destinazione finale |
| `canonical-diverso` | far puntare il canonical all'indirizzo della pagina stessa |

**Collegamenti dentro il testo degli articoli** (dal 17 ott 2026): puoi aggiungerli
quando servono a una scelta fra pagine o a portare chi legge verso i servizi. In un paragrafo di un articolo
(`paragraphs` in `lib/blogPosts.ts`) si scrive `[parole del collegamento](/pagina/)`
e sul sito diventa un collegamento. Solo pagine del sito, con la barra finale
(`/prezzi-depuratori/`, `/depuratore-acqua-prato/`, `/blog/<slug>/`); nelle domande
frequenti (`faqs`) no, perché quel testo va anche a Google così com'è. Le parole sono
quelle della frase, vicine a quello che la gente cerca ("un acquisto diretto dello
stesso impianto", "depuratori d'acqua a Prato"), mai "clicca qui". Al massimo due per
articolo verso le pagine dei servizi o dei prezzi, più quelli verso le guide citate.
Il motivo: il blog porta la maggior parte dei clic da Google, ma fino al 17 ott 2026
chi leggeva non aveva modo di arrivare ai prezzi o ai servizi dal testo.

## Dalle posizioni su Google: titoli che non convincono

Il controllo del lunedì legge anche Search Console e scrive `agenti/seo/posizioni.json`.
Lì dentro, fra i `segnali`, ti riguardano **solo quelli con `tipo: "vetrina"`**: una
ricerca per cui la pagina sta in alto (fino all'8° posto), ha molte viste e **zero
clic**. La gente la vede e passa oltre: il titolo o la description non convincono.

- Prima guarda `agenti/seo/posizioni-lavorate.md`: se la pagina ci compare negli
  ultimi 60 giorni, **lasciala stare**.
- Guarda con curl come sono oggi titolo e description, e chiediti se rispondono a
  quella ricerca. Se la ricerca è "acqua rubinetto firenze" e il titolo parla d'altro,
  il motivo è quello.
- Riscrivili perché chi ha fatto quella ricerca capisca subito che la risposta è lì.
  Valgono tutte le regole di "Titoli e description" qui sotto: limiti di caratteri,
  italiano piano, niente numeri inventati, niente promesse.
- **Non cambiare la parola chiave per cui la pagina è già forte** per inseguire
  un'altra ricerca: se le ricerche della stessa pagina tirano in direzioni diverse,
  scegli quella con più viste e dillo nell'anteprima.
- Nell'anteprima, nel "Perché", scrivi i numeri veri: la ricerca, le viste, la
  posizione, zero clic. Esempio: *"Quando cercano «acqua firenze potabile» la pagina
  esce al 5° posto, 40 volte in un mese, e nessuno clicca."*
- Aggiungi una riga in `agenti/seo/posizioni-lavorate.md` sul ramo della proposta.
- Va nella **stessa proposta** delle correzioni del controllo, se ce ne sono.

## Dalle posizioni su Google: più pagine sulla stessa ricerca

Fra i `segnali` di `agenti/seo/posizioni.json` ti riguardano anche quelli con
`tipo: "concorrenza"`: per la stessa ricerca Google alterna due o più pagine del
sito, e nessuna sale davvero. Nel segnale trovi `pagine`, con posizione e viste di
ognuna.

Fino al 12 ott 2026 questi segnali finivano a Matteo con scritto "si decide con
Claude dal PC", e restavano lì per settimane. **Matteo ha chiesto il contrario: la
scelta la proponi tu, e lui conferma su Telegram.** Quindi non chiedere "quale
pagina preferisci?": scegli, spiega perché in due righe, e prepara la modifica.

**Quali segnali.** Tutti quelli di tipo `concorrenza` la cui ricerca non compare
in `agenti/seo/posizioni-lavorate.md` (tipo `concorrenza`) negli ultimi 60 giorni.
Le ricerche che dicono la stessa cosa (singolare e plurale, "depuratore acqua
prato" e "depuratori acqua prato") sono **una scelta sola**.

**Come scegli la pagina che deve vincere.**

1. Se una delle pagine è dedicata proprio a quella città o a quel servizio (la
   pagina di Prato per le ricerche con "prato") e non sta più di 10 posizioni
   dietro l'altra, **vince quella**: chi cerca "Prato" trova una pagina che parla
   solo di Prato.
2. Se la pagina dedicata è molto più indietro (oltre 10 posizioni), **vince quella
   più avanti**, di solito la home: spingere l'altra vorrebbe dire ripartire da
   dietro. In questo caso spesso **non c'è niente da cambiare**: lo scrivi
   nell'anteprima ("lascio vincere la home, non tocco niente") e segni la scelta
   in `posizioni-lavorate.md`, così per 60 giorni non se ne riparla.
3. Fra due articoli del blog, vince quello con più viste.

**Cosa puoi cambiare, e nient'altro.**

- **Collegamenti interni verso la pagina che deve vincere**: dalla pagina che
  perde, e da una o due altre pagine dove quella città o quel servizio è già
  nominato. Il testo del collegamento usa parole vicine alla ricerca ("depuratori
  d'acqua a Prato"), mai "clicca qui" o "scopri di più". Si usa una frase che c'è
  già; se non c'è, se ne aggiunge **una sola**, breve e vera. Al massimo tre
  collegamenti nuovi per scelta.
- Un collegamento che c'è già ma ha un testo generico: si rende descrittivo.
- **Titolo e description della pagina che perde**, solo se è un articolo del blog
  o una pagina secondaria e solo se cominciano con le stesse parole della
  vincente. Valgono le regole di "Titoli e description".

**Cosa non fai mai, nemmeno per la concorrenza.**

- Non tocchi il titolo, la description e l'H1 **della home**, e non togli una città
  dalla home: è la pagina che porta più contatti.
- Non cancelli e non unisci pagine, non aggiungi redirect, non metti `noindex`,
  non fai puntare il canonical di una pagina a un'altra, non cambi indirizzi.
- Non riscrivi i testi: oltre alla frase del collegamento non cambia niente.

**Nell'anteprima**, per ogni scelta:

```
Ricerca: «depuratore acqua prato» (e «depuratori acqua prato»)
Oggi: Google alterna la home (13° posto) e la pagina di Prato (14° posto), e nessuna
delle due sale.
Scelta: far vincere la pagina di Prato.
Perché: sono quasi alla pari, e chi cerca "Prato" trova una pagina che parla solo di Prato.
Cosa cambia: nella home la frase «…» ora porta alla pagina di Prato con le parole
«depuratori d'acqua a Prato». Il resto della home resta uguale.
```

**In `agenti/seo/posizioni-lavorate.md`**, sul ramo della proposta, una riga per
ogni ricerca del segnale, scritta com'è nel segnale:
`AAAA-MM-GG | <pagina che deve vincere> | concorrenza | <ricerca> | seo`.
Vale anche quando la scelta è "non cambio niente".

Va nella **stessa proposta** delle altre correzioni, se ce ne sono. Nel conto del
titolo del commit (`SEO: <quante> correzioni`) ogni scelta vale una correzione.

## Dalle posizioni su Google: una pagina dei servizi a un passo dalla prima pagina

Fra i `segnali` ti riguardano anche quelli con `tipo: "soglia"` **la cui `pagina`
non comincia con `/blog/`**: una pagina dei servizi (Firenze, Prato, osmosi,
uffici…) che per una ricerca sta fra il 9° e il 15° posto, con tante viste e zero
clic. È in fondo alla prima pagina o all'inizio della seconda, dove non clicca
quasi nessuno. **Il titolo non c'entra: la pagina deve salire.**

Gli articoli del blog in soglia **non sono tuoi**: li arricchisce l'agente Contenuti.

Fino al 13 ott 2026 queste pagine finivano a Matteo con scritto "si decidono
insieme a Claude dal PC", perché sono le pagine che portano i contatti. Matteo ha
chiesto anche qui il contrario: la proposta la prepari tu, lui conferma su
Telegram. Proprio perché portano i contatti, la regola è una: **si aggiunge, non
si riscrive.** Quello che c'è e funziona resta identico.

**Quali pagine.** Raggruppa i segnali per pagina (più ricerche sulla stessa pagina
sono un lavoro solo). Salta le pagine che in `agenti/seo/posizioni-lavorate.md`
hanno una riga di tipo `soglia` negli ultimi 60 giorni.

**Prima studia** (`agenti/METODO.md`):

- in `agenti/seo/ricerche.json`, tutte le ricerche per cui Google mostra quella
  pagina: dicono cosa cerca davvero la gente che ci arriva vicino;
- la pagina com'è online adesso (`curl`), per intero: **risponde a quella ricerca
  con parole sue?** Se chi cerca "depuratore acqua prato prezzi" non trova una
  riga che parli di come si arriva al prezzo, il motivo è quello;
- le domande frequenti che la pagina ha già, e gli articoli del blog che parlano
  dello stesso argomento (`lib/blogPosts.ts`).

**Cosa puoi fare, e nient'altro.**

1. **Una domanda e risposta in più** fra le domande frequenti di quella pagina
   (l'elenco `faqs` della pagina in `lib/data.ts`; finisce anche nei dati che
   Google legge). La domanda è scritta come la cerca la gente; la risposta è di
   due-quattro frasi, in italiano piano. **Una sola per pagina.** Se una domanda
   che c'è già risponde alla ricerca, non aggiungerne una doppia.
   Per scriverla valgono le sezioni "Regole che non si discutono" e "Fatti veri
   che si possono usare" di `agenti/contenuti/REGOLE.md`, che devi leggere per
   intero prima: niente prezzi, percentuali o tempi inventati, sulla salute solo
   fatti generali, niente addolcitori. Se la ricerca chiede una cosa che non puoi
   dire con un fatto vero (un prezzo), la risposta dice come si arriva a saperlo
   ("dipende dall'impianto: te lo diciamo col sopralluogo gratuito"), non lo inventa.
2. **Collegamenti interni verso la pagina**: da due o tre articoli del blog o
   pagine dove quell'argomento o quella città sono già nominati. Valgono le regole
   dei collegamenti scritte sopra per la concorrenza: testo vicino alla ricerca,
   una frase che c'è già oppure **una sola** frase nuova, breve e vera. Al massimo
   tre.

**Cosa non fai mai, nemmeno per farla salire.**

- Non tocchi titolo, description, H1, il testo in cima, i punti di forza, le
  frasi che ci sono, le foto, l'ordine dei pezzi, i pulsanti e il modulo.
- Non togli niente.
- **La home non si tocca.** Se la pagina in soglia è la home e per quella ricerca
  esiste una pagina dedicata, il lavoro sono solo i collegamenti verso la pagina
  dedicata (è una scelta di concorrenza: vedi sopra). Se non esiste, lo scrivi
  nell'anteprima ("è la home, non cambio niente") e lo segni nel registro.
- Le altre pagine che non sono né servizi né articoli (Recensioni, Contatti,
  l'indice del blog): solo i collegamenti del punto 2.

**Nell'anteprima**, per ogni pagina:

```
Pagina: la pagina di Prato (www.acquadirete.it/depuratore-acqua-prato/)
Oggi: quando cercano «…» esce all'11° posto, 45 volte in un mese, e nessuno
clicca: è in fondo alla prima pagina.
Cosa aggiungo: fra le domande frequenti, «…?», con questa risposta: «…»
Da dove la collego: dall'articolo «…», nella frase «…».
Cosa non cambia: titolo, testi, foto e modulo della pagina restano identici.
Da verificare con te: ogni cosa detta nella risposta che non sta nei fatti veri
(se non c'è niente, "niente").
```

**In `agenti/seo/posizioni-lavorate.md`**, sul ramo della proposta, una riga per
pagina: `AAAA-MM-GG | <pagina> | soglia | <la ricerca con più viste> | seo`. Vale
anche quando la scelta è "non cambio niente".

Va nella **stessa proposta** delle altre correzioni, se ce ne sono; nel conto del
titolo del commit ogni pagina rinforzata vale una correzione.

Gli altri tipi di segnale (prima pagina, sale, scende, fuori) sono solo notizie.

## Cosa NON tocchi mai

- **Gli indirizzi delle pagine** e gli slug. Mai.
- I redirect in `netlify.toml`, a meno che un `redirect-vecchio` sia rotto e la
  destinazione giusta sia già scritta nel controllo.
- I testi delle pagine e degli articoli oltre a titoli, description e alt. Due
  sole eccezioni, tutte e due aggiunte e mai riscritture: la frase col
  collegamento, e la domanda e risposta in più su una pagina dei servizi che deve
  salire (vedi sopra).
- Le pagine che non rispondono 200, le immagini pesanti, le pagine orfane: servono
  decisioni che non sono tue. Restano segnalate.
- Le diciture "130+" / "oltre 130" recensioni: vedi `CLAUDE.md`.

## Titoli e description

- **Titolo al massimo 60 caratteri, description al massimo 160.** Si contano con node
  sul testo finale, non a occhio.
- **Il titolo che conta è quello finale, com'è sulla pagina.** Controlla
  `app/layout.tsx`: se c'è un `title.template`, al titolo della pagina viene aggiunto
  un pezzo (per esempio " | Acquadirete"), e il limite vale sul totale.
- Tieni la parola chiave della pagina e la città. Il marchio in fondo solo se ci sta.
- Italiano piano, niente titoli "creativi", niente numeri inventati, niente
  promesse che il sito non fa.
- Dove si trovano: `export const metadata` in `app/<pagina>/page.tsx`; per gli
  articoli `metaTitle` e `metaDescription` in `lib/blogPosts.ts`; i dati delle pagine
  servizio possono stare in `lib/data.ts`. Cerca la stringa esatta con grep prima di
  toccare.

## La proposta

- Leggi `agenti/seo/controllo.json` e `agenti/seo/posizioni.json`. Se in nessuno dei
  due c'è qualcosa che puoi correggere o una scelta da proporre, **fermati senza
  creare niente**.
- Ramo `proposta/seo-<AAAA-MM-GG>`, creato da `main`. Mai su `main`.
- Dopo le modifiche: `npm ci` e `npm run build` devono passare.
- **Scrivi sempre l'anteprima** in `agenti/anteprime/seo-<AAAA-MM-GG>.md`. È il file
  che Matteo legge sul telefono, ed è l'unica cosa che gli spiega cosa hai fatto:
  senza, gli arriva un messaggio che non si capisce. Testo normale, niente codice,
  niente nomi di file del progetto. Per ogni correzione, quattro righe:

  ```
  Pagina: la pagina Contatti (www.acquadirete.it/contatti/)
  Oggi su Google si legge: Contatti | Depuratori Acqua a Firenze, Prato e Pistoia | Acquadirete
  Diventa: Contatti | Depuratori Firenze, Prato e Pistoia | Acquadirete
  Perché: era di 68 caratteri e Google taglia i titoli oltre i 60, quindi la fine
  spariva dai risultati. Ora ci sta tutto e restano dentro le tre città.
  ```

  Chiudi con una riga su cosa **non** cambia, per esempio: "Il testo della pagina non
  è stato toccato: cambia solo il titolo che si vede nei risultati di Google."
- Messaggio di commit: la prima riga è **solo** `SEO: <quante> correzioni`, niente
  altro. Quella riga diventa il titolo del messaggio che arriva a Matteo: se ci
  infili dentro tutta la correzione, diventa illeggibile. Il dettaglio va nelle righe
  sotto, una per correzione, e nell'anteprima.
- **Cosa hai fatto, nel concreto (Matteo, 21 ott 2026: "mi deve dire anche cosa ha
  fatto nel concreto, tipo «ho cambiato la frase nell'articolo»").** Le spiegazioni
  sulle ricerche vanno bene, ma da sole non gli dicono cosa è cambiato sul sito. Il
  corpo del commit si apre con la riga `Cosa ho fatto:` e sotto una riga per ogni
  modifica, in prima persona: quale pagina (col nome che si legge sul sito, non il
  file), in che punto, e le parole esatte tolte o messe. Poi una riga vuota, e solo
  dopo il perché. Per esempio:

  ```
  Cosa ho fatto:
  - Nell'articolo «Depuratore gratis: cosa c'è dietro i contratti», nell'elenco
    "I segnali da non ignorare", ho aggiunto la frase «Ti dicono che il depuratore
    è gratis grazie a un bonus della Regione Toscana: quel bonus non esiste», con
    "bonus della Regione Toscana" collegato all'articolo sul bonus.
  - Nella home ho cambiato il collegamento "a Prato" in "Depuratore acqua a Prato".
  ```

  Quelle righe tornano da sole nel messaggio di conferma dopo APPROVA. Lo stesso
  elenco apre l'anteprima, sotto il titolo, col titoletto "Cosa ho fatto". Se la
  scelta è di non cambiare niente, scrivilo lì: "Nella pagina di Firenze non ho
  cambiato niente: vince già la home."
