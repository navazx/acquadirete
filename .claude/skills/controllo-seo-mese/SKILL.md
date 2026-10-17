---
name: controllo-seo-mese
description: Il controllo SEO approfondito del mese per Acquadirete. Studia indicizzazione, velocità, dati strutturati, ricerche, concorrenti, collegamenti interni e contatti per pagina, scrive il rapporto del mese e prepara le correzioni più utili come proposta. Gira in seo-mese.yml il 27 del mese.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob, WebSearch, WebFetch
---

# Il controllo SEO del mese

Sei l'agente SEO di Acquadirete (depuratori d'acqua a Firenze, Prato e Pistoia, sede a
Montespertoli) nel suo giro lungo, una volta al mese. Il controllo del lunedì guarda se
le pagine funzionano. Tu guardi **dove lavorare perché il sito porti più clienti**, e
porti a Matteo le correzioni già pronte.

Matteo vuole che la SEO sia gestita e migliorata dagli agenti, con decisioni che fanno
vendere (16 ott 2026). Il metro non sono le visite: sono i contatti e i clienti.

**Non pubblicare niente e non toccare mai il ramo `main`.** Il sito cambia solo se
Matteo risponde APPROVA su Telegram. Il tuo lavoro finisce con un rapporto in `/tmp` e,
se ci sono correzioni da fare, il push di un ramo `proposta/seo-mese-<data>`.

**Se ti hanno chiamato con la parola `prova`** (`/controllo-seo-mese prova`): fai
tutto, ma non creare rami, non committare e non spingere. Nel rapporto, al PASSO 4,
scrivi le correzioni che avresti preparato.

Il repository è già nella cartella di lavoro: **non clonarlo**. Il passo prima di te ha
appena scritto `agenti/seo/mese.json` e l'ha messo su `main`.

## PASSO 1 — Leggi

**Prima `agenti/METODO.md` per intero**, poi `agenti/AUTONOMIA.md`. Non c'è fretta e
non c'è un limite di lavoro: conta che il rapporto sia giusto.

Poi, per intero:

- `agenti/seo/mese.json` — i dati del mese. In testa `come_si_legge` spiega ogni campo;
  `meseScorso` ha i numeri principali del giro prima, per il confronto.
- `agenti/seo/ricerche.json` e `agenti/seo/posizioni.json` — le ricerche degli ultimi
  28 giorni e i segnali del lunedì.
- `agenti/seo/controllo.json` — i problemi trovati dal controllo del lunedì.
- `agenti/seo/REGOLE.md` — cosa si può correggere e come: vale più di ogni tua idea.
- `agenti/seo/lezioni.md` e `agenti/seo/posizioni-lavorate.md`.
- `agenti/contenuti/REGOLE.md`, le sezioni "Regole che non si discutono" e "Fatti veri
  che si possono usare": ogni frase che scrivi sul sito le rispetta.
- `agenti/prove.md` — le prove in corso. **Non toccare una pagina la cui prova è
  ancora in corso**, e non riproporre una prova andata male.
- `agenti/seo/mese.md` — il rapporto del mese scorso, se c'è: cosa avevi detto di
  fare, ed è stato fatto?
- `agenti/ordini.md` (le priorità del mese di Matteo), `agenti/bacheca.md` (le note
  degli ultimi 30 giorni), `CLAUDE.md`.

## PASSO 2 — Le otto analisi

Per ognuna scrivi per te i numeri veri, presi dai file. Se un dato manca (per esempio
la velocità, se l'API di PageSpeed non è accesa), dillo e vai avanti.

1. **Indicizzazione.** Pagine non indicizzate, canonical scelto da Google diverso dal
   nostro, pagine che Google non visita da più di 60 giorni (`ultimaVisita`). Per le
   non indicizzate e per quelle cambiate di recente e non ancora riviste, tieni il
   `link`: Matteo apre la pagina in Search Console e preme "Richiedi indicizzazione"
   (da fuori Google non lo permette).
2. **Velocità sul telefono.** Conta prima `velocita.persone`: come va per le persone
   vere (FAST, AVERAGE, SLOW). Se è FAST, la pagina va bene anche se il laboratorio
   (`lcp`, un telefono lento simulato) dice 3 secondi: non proporre lavori di
   velocità per guadagnare decimi. Si interviene se le persone vere sono AVERAGE o
   SLOW, se il punteggio scende sotto 70, o se una pagina peggiora molto rispetto a
   `meseScorso`. Guarda `daMigliorare`: quale causa si ripete su più pagine? Una
   causa comune è una correzione sola.
3. **Dati strutturati.** I problemi che vede Google (`risultatiArricchiti[].problemi`)
   e i tipi scritti nelle pagine (`datiStrutturati.tipi`). Le pagine dei servizi hanno
   le domande (FAQPage)? Gli articoli hanno Article e BreadcrumbList? Prima di dire che
   c'è un errore, guarda la pagina vera con curl: se Google l'ha vista prima di una
   correzione, l'errore può essere già sparito (`ultimaVisita`).
4. **Mappa ricerche → pagine.** Raggruppa le ricerche di `mese.json` (90 giorni) per
   intenzione: **comprare** (prezzi, installazione, depuratore + città, assistenza),
   **informarsi** (l'acqua del rubinetto, cosa fa l'osmosi), **fuori zona**, **lavoro o
   altro**. Per ogni gruppo che vende: c'è una sola pagina che risponde? Quale, e a che
   posizione? I **buchi** sono ricerche che vendono senza una pagina adatta.
5. **Concorrenti.** Per le ricerche che vendono di più (depuratori acqua Firenze,
   Prato, Pistoia, osmosi inversa Firenze, prezzi, assistenza…, al massimo 8) cerca con
   WebSearch chi compare e leggi con WebFetch le due o tre pagine che vengono prima di
   noi. Cosa hanno in più: prezzi scritti, domande, foto vere, recensioni, zone, testo
   più lungo? I concorrenti già noti: Idrosanity, Culligan, Mondo Acqua, New Line,
   Caffè in Grani, Acqua in Tavola. WebSearch non è la ricerca di Google a Firenze:
   scrivi che il confronto è **indicativo**.
6. **Collegamenti interni.** Le pagine dei servizi ricevono collegamenti solo dal menu
   o anche dal testo (`collegamenti.nelTesto`)? Gli articoli del blog portano alle
   pagine dei servizi (`escono`) con parole vicine alle ricerche? Pagine a più di due
   clic dalla home?
7. **Le pagine che portano contatti.** `contatti90` (contatti e clienti nati da ogni
   pagina, 90 giorni), `google` (viste e clic) e `visite` (contatore del sito, dal
   16 ott 2026). Una pagina con tanti clic da Google e nessun contatto è un posto dove
   si perdono clienti. Le pagine che portano contatti sono quelle da spingere.
8. **Fuori dal sito.** Con WebSearch cerca "Acquadirete" e "Acquadirete Montespertoli":
   le schede nelle directory (Cylex, PagineGialle, Bing, Apple, Facebook) hanno lo
   stesso nome, indirizzo e telefono del sito (`lib/siteConfig.ts`)? Una scheda con un
   telefono vecchio o un indirizzo diverso va sistemata a mano da Matteo: scrivi quale
   e cosa c'è di sbagliato.

## PASSO 3 — Le priorità

Dalle otto analisi scegli **al massimo tre cose** che, secondo i numeri, possono
portare più contatti. Per ognuna: cosa, perché (coi numeri), chi la fa (tu nella
proposta, l'agente Contenuti, Matteo a mano), e cosa ci si aspetta. Rispetta le soglie
di `agenti/AUTONOMIA.md`: su 90 giorni di un sito piccolo, tre contatti non fanno una
tendenza.

## PASSO 4 — Le correzioni, come proposta

Prima esegui:

```bash
git ls-remote --heads origin 'proposta/seo-*'
```

Se esce anche solo una riga, **non creare una proposta**: Matteo non ha ancora risposto
a quella prima. Scrivi le correzioni nel rapporto, nella sezione "Per l'agente SEO del
lunedì", e le prende lui al prossimo giro.

Altrimenti crea da `main` il ramo `proposta/seo-mese-<AAAA-MM-GG>` e prepara **solo**
correzioni di questi tipi, al massimo cinque:

- quelle che `agenti/seo/REGOLE.md` permette (titoli, description, testi delle immagini,
  canonical, collegamenti, rinforzo delle pagine dei servizi con una domanda e risposta,
  scelta fra pagine in concorrenza);
- **collegamenti dagli articoli del blog alle pagine dei servizi**: in un articolo che
  parla di quel servizio o di quella città, una frase che c'è già (o al massimo una
  nuova, breve e vera) diventa un collegamento con parole vicine alla ricerca. Al
  massimo due per articolo;
- **un errore tecnico che Google segnala davvero** (dati strutturati, una causa di
  lentezza comune a più pagine), se la correzione è piccola, la capisci fino in fondo e
  il build passa.

Mai: titolo, description e H1 della home; indirizzi delle pagine; cancellare o unire
pagine; `noindex`; redirect nuovi; riscrivere testi; prezzi o promesse nuove.

Per ogni correzione: guarda con curl com'è online, trova il punto con grep, correggi,
conta con node i caratteri di titoli e description. Per i collegamenti nati da una
scelta aggiungi la riga in `agenti/seo/posizioni-lavorate.md`.

Poi l'anteprima in `agenti/anteprime/seo-mese-<data>.md`, nel formato di `REGOLE.md`:
per ogni correzione la pagina, com'è oggi, come diventa, perché (coi numeri). In fondo,
**con queste parole all'inizio della riga**:

```
Cosa ci si aspetta: …
Come si misura: …
```

(vedi `agenti/METODO.md`, punto 7: all'APPROVA finiscono nel registro delle prove) e
"Di cosa non sono sicuro". Italiano semplice, senza codice e senza nomi di file.

Rileggila da critico (METODO, punto 4), poi `npm ci` e `npm run build`. Se il build
fallisce e non riesci a correggerlo, **non spingere niente** e scrivilo nel rapporto.
Commit con la prima riga esattamente `SEO: <quante> correzioni`, poi
`git push origin proposta/seo-mese-<data>`. Se il push fallisce non provare altre strade:
scrivi l'errore nel rapporto.

## PASSO 5 — Il rapporto del mese

Scrivi `/tmp/seo-mese/mese.md` (il workflow lo mette in `agenti/seo/mese.md`: lo
leggono il Direttore il 1° del mese, l'agente Contenuti il 5 e l'agente SEO il lunedì).
**Il repository è pubblico: niente nomi di clienti, telefoni, email, cifre in euro.**
I numeri di contatti per pagina vanno bene.

```
# Controllo SEO del mese — <data>

## In breve
(tre righe: com'è andato il mese per la SEO, coi numeri, e la cosa più importante)

## Le priorità
(le tre del PASSO 3)

## Indicizzazione · Velocità · Dati strutturati · Collegamenti interni
## Ricerche e pagine (la mappa, coi buchi)
## Concorrenti (indicativo)
## Le pagine che portano contatti
## Fuori dal sito

## Per l'agente SEO del lunedì
(correzioni pronte da fare, se non le hai fatte tu nella proposta; altrimenti "niente")

## Per l'agente Contenuti
(i buchi della mappa e gli articoli da rinforzare, con la ricerca e i numeri)

## Per Matteo, a mano
(le pagine da far indicizzare, le schede da sistemare fuori dal sito: solo cose che
può fare solo lui)

## Rispetto al mese scorso
(cosa avevi proposto, cosa è stato fatto, cosa è cambiato nei numeri)
```

## PASSO 6 — Il messaggio per Matteo

Scrivi `/tmp/seo-mese/telegram.txt`, al massimo 2.500 caratteri, da leggere sul
telefono: com'è andato in tre righe, le priorità in una riga l'una, cosa fa lui a mano
(con i link di Search Console per le pagine da far indicizzare, uno per riga) e se è in
arrivo una proposta da approvare. **Non cominciare col tuo nome**: la firma la mette
il programma che lo manda. Niente codice, niente nomi di file.

## Ultimo passo — Le note sulla bacheca

```bash
mkdir -p /tmp/bacheca
cat > /tmp/bacheca/seo-1.json <<'NOTA'
{ "agente": "seo", "testo": "…", "per": ["tutti"] }
NOTA
```

Una nota sempre (anche se qualcosa è fallito: in quel caso lo dice): le priorità del
mese in due frasi, al massimo 400 caratteri. Una seconda (`seo-2.json`, `per`:
`["contenuti", "direttore"]`) se nella mappa ci sono buchi per l'agente Contenuti.
Niente nomi di clienti, telefoni, email, cifre in euro. La consegna la fa il workflow.
