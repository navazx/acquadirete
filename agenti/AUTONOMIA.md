# Cosa possono fare gli agenti da soli

Matteo vuole che l'acquisizione dei clienti (sito, SEO, Google Ads, Meta, scheda Google,
recensioni) sia gestita e migliorata dagli agenti (16 ott 2026). L'autonomia però si
guadagna coi risultati: si parte proponendo, e un tipo di modifica diventa automatico solo
quando ha dimostrato di funzionare. Questo file lo leggono tutti gli agenti, e il Direttore
il 1° del mese per proporre le promozioni.

## I tre colori

| Colore | Cosa vuol dire |
|---|---|
| **Verde** | l'agente lo fa da solo e poi avvisa Matteo (Telegram e bacheca) |
| **Giallo** | l'agente lo porta già pronto, e lo fa solo dopo l'APPROVA di Matteo |
| **Rosso** | mai da solo: lo decide e lo fa Matteo, l'agente al massimo lo propone |

## Oggi (16 ott 2026)

**Verde**
- Lasciare note sulla bacheca, mandare i messaggi a Matteo.
- Far ripartire un agente che non è partito (Direttore) o un giro fallito (Meccanico).
- Leggere tutti i dati: Gestionale, Search Console, Google Ads, Meta, visite del sito.

**Giallo**
- Articoli nuovi o rinforzati (Contenuti), correzioni SEO, scritte del sito sulle
  recensioni, riparazioni, ordini del mese, post social.
- Su Google Ads: escludere ricerche, mettere in pausa parole chiave e annunci (APPROVA ADS).

**Rosso**
- Spendere soldi: budget, offerte, strategia di offerta, campagne accese o spente,
  annunci nuovi a pagamento, tutto su Meta.
- Contattare clienti o contatti (i messaggi si preparano, li mandano Matteo e babbo).
- Cancellare dati, cambiare indirizzi delle pagine, togliere pagine dal sito.
- Titolo, description e H1 della home.
- Mandare dati personali dei clienti a Google o a Meta.

## Come un tipo di modifica passa da giallo a verde

1. Lo stesso tipo di modifica (per esempio "titolo e description di una pagina del
   blog") è stato approvato **5 volte di fila senza CORREGGI né RIFIUTA**;
2. le prove già controllate di quel tipo in `agenti/prove.md` non hanno peggiorato i
   numeri;
3. allora il Direttore lo propone negli ordini del mese, e diventa verde solo se Matteo
   approva gli ordini. Lo si scrive qui sotto, con la data.

Torna giallo al primo RIFIUTA di Matteo su quel tipo, o se una prova lo mostra dannoso.
Il rosso non diventa mai verde da solo: lo cambia solo Matteo, a voce.

I primi candidati: titoli e description di articoli e pagine secondarie; testi
alternativi delle immagini; collegamenti interni fra pagine; esclusione su Google Ads dei
marchi dei concorrenti.

### Promozioni decise

(nessuna, per ora)

## Soglie minime prima di giudicare

Acquadirete ha una quindicina di contatti al mese: con numeri così piccoli il caso fa
sembrare tendenze cose che non lo sono. Prima di dire "funziona" o "non funziona":

| Cosa si giudica | Serve almeno |
|---|---|
| Una campagna o un canale da tagliare | 30 giorni di dati, o 50 contatti |
| Una cosa nuova appena partita (annuncio, pagina, spot) | 7 giorni, e se possibile 14 |
| Una tendenza (un costo che sale o scende) | 3 settimane di fila nella stessa direzione |
| Una modifica SEO (titolo, collegamenti, articolo) | 4 settimane, perché Google ci mette |
| Un confronto fra due versioni (pagine, annunci) | 15 contatti per versione, o dirlo "indicativo" |
| La differenza fra due mesi | più di 3-4 contatti, che sono rumore |

Sotto queste soglie si scrive "troppo presto per dirlo, si guarda il …".

## Il tetto del costo per cliente

Matteo ha detto quanto vale un cliente (margine dell'impianto e della manutenzione) e ha
fissato un tetto di quanto può costare un cliente in pubblicità (16 ott 2026). **Le cifre
non stanno qui**, perché il repository è pubblico: arrivano a Direttore e Ads dal secret
`VALORE_CLIENTE` di GitHub (`scripts/lib/visite.mjs`). Un canale che porta clienti sotto il
tetto merita più spazio; uno sopra il tetto, o senza clienti da più di un mese, va
ridotto. Lo propongono gli agenti, lo decide Matteo.
