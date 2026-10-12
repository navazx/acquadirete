# Come si lavora: lo stesso metodo di quando Matteo e Claude lavorano al PC

Questo file lo legge **ogni agente, per primo, a ogni giro**. Nasce da una richiesta
di Matteo del 12 ott 2026: *"vorrei che gli agenti facessero analisi più approfondite,
non devono essere approssimativi, non mi interessa dell'uso dei token, devono lavorare
con la stessa qualità di quando facciamo le cose al PC"*.

Quindi: **non c'è fretta e non c'è un limite di lavoro. Conta solo che il risultato
sia giusto.** Un giro che dura un'ora e porta una cosa solida vale più di uno che
dura cinque minuti e porta una cosa approssimativa. Le regole del tuo lavoro (cosa
puoi toccare, cosa no) restano quelle del tuo file: questo dice *come* lavorare.

## 1. Prima capisci, poi fai

- Leggi per intero tutto quello che le tue istruzioni indicano. Non la prima metà.
- Guarda **i dati veri**, non quello che ricordi o immagini: le ricerche e le
  posizioni (`agenti/seo/ricerche.json`, `agenti/seo/posizioni.json`), la pagina
  com'è online adesso (`curl`), la storia di quel file (`git log -p`), la bacheca,
  le lezioni.
- Non partire dalla prima idea. Prima di scegliere, scrivi per te almeno **due
  strade possibili** e perché ne preferisci una.

## 2. Ogni affermazione ha una prova

- Un numero viene da un file o da un comando che hai eseguito. Mai a occhio, mai
  "circa". Se lo conti, lo conti con `node`.
- Un fatto su Acquadirete sta nei "Fatti veri" di `agenti/contenuti/REGOLE.md` o in
  una nota di Matteo. Se non c'è, non lo scrivi come fatto: lo metti fra le cose
  **da verificare col titolare**.
- Un fatto tecnico o di salute ha una fonte autorevole (Istituto Superiore di
  Sanità, Ministero della Salute, il gestore dell'acquedotto), che hai aperto e
  letto in questo giro se hai gli strumenti per farlo. Se non riesci ad aprirla,
  lo dici.
- Se una cosa non la sai, **dillo**. "Non ho modo di verificarlo" è una risposta
  seria; inventare no.

## 3. Guarda il risultato come lo vedrà chi lo riceve

- Una pagina o un articolo: il build deve passare, e il testo lo rileggi per
  intero com'è, non a pezzi.
- Un'immagine: aprila col tool Read e guardala. Un testo a capo male si vede solo così.
- Un titolo o una descrizione per Google: conta i caratteri sul testo finale.
- Un messaggio per Matteo: lo legge sul telefono, in mezzo al lavoro. La
  conclusione sta nella prima riga, in italiano semplice, senza nomi di file.

## 4. Rileggi da critico, e correggi

Prima di consegnare fai **una passata apposta**, fingendo di essere Matteo che
cerca il difetto. Chiediti, una per una:

- Cosa qui è vago, e potrebbe essere detto con un fatto?
- Cosa è inventato, o gonfiato, o non so da dove viene?
- Cosa contraddice una lezione del mio file delle lezioni? (Rileggile adesso, una
  per una, contro quello che hai fatto.)
- L'immagine e il testo dicono la stessa cosa?
- Se fossi un cliente, cosa mi suonerebbe finto o da venditore?
- Ho fatto tutto quello che mi è stato chiesto, o mi sono fermato al più facile?

Quello che trovi lo correggi, poi rifai la passata. Ti fermi quando non trovi più niente.

## 5. Spiega la scelta, e di' di cosa non sei sicuro

Nell'anteprima o nel messaggio per Matteo ci sono sempre, in poche righe:

- **Cosa ho scelto e perché**, con i numeri veri che ti hanno fatto scegliere.
- **Cosa ho scartato**, in una riga, se c'era un'alternativa sensata.
- **Di cosa non sono sicuro** o cosa va verificato col titolare. Se non c'è niente,
  si scrive "niente".

## 6. Le cose semplici si portano già fatte

Non si chiede a Matteo di scegliere fra opzioni e non si rimanda "a una seduta al
PC": si sceglie, si prepara la modifica come proposta, e gli si chiede solo la
conferma su Telegram. Vedi "Due regole per ogni agente" in `agenti/LEGGIMI.md`.

## 7. Cosa resta vietato, sempre

Spendere soldi o cambiare budget, contattare clienti, cancellare dati, pubblicare
senza approvazione. Più qualità non vuol dire più permessi.
