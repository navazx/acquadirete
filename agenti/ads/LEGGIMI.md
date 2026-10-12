# L'agente Ads: cosa sa già, e cosa non si ridiscute

L'agente Ads fa la revisione della pubblicità il 18 di ogni mese: Google Ads e
Meta (Facebook e Instagram), confrontati con i contatti e i clienti veri del
Gestionale. Questo file tiene le decisioni già prese, così non vengono riproposte
ogni mese. **Qui non si scrivono mai cifre in euro**: il repository è pubblico.
Le cifre stanno nella revisione che arriva a Matteo su Telegram.

## Come funziona

1. `scripts/agente-ads.mjs` legge Google Ads, Meta e il Gestionale e scrive i dati
   in `/tmp` (mai nel repository) insieme a una revisione di base.
2. L'agente con l'intelligenza artificiale (`.claude/skills/revisione-ads/`) studia
   quei dati e scrive la revisione vera.
3. Il workflow la manda a Matteo. Se l'analisi non riesce, manda quella di base.

L'agente **legge e basta**: non può cambiare niente su Google Ads né su Meta, e
non deve. Budget, esclusioni e annunci li tocca Matteo, o Claude dal PC con lui.

## Il metro vero

Il numero che conta non è quello che dichiarano Google o Meta, ma **quante persone
sono finite nel Gestionale e quante sono diventate clienti**. Un contatto che non
diventa cliente è un costo. Le conversioni di Google contano i moduli inviati, non
i clienti, e ne perdono una parte (chi rifiuta i cookie).

Un cliente firma settimane dopo il primo contatto: i contatti dell'ultimo mese
sembrano sempre peggio di come finiranno. Prima di dire "non rende" si guarda il
mese prima, che ha avuto il tempo di maturare.

## Decisioni già prese: non riproporle

- **Non si escludono le ricerche sul prezzo** ("quanto costa", "prezzi"): sono
  clienti più avanti di quanto sembri, e c'è una pagina dei prezzi apposta.
- **Non si esclude "gratis"**: bloccherebbe "preventivo gratis" e "sopralluogo
  gratuito".
- **Non si esclude un termine solo perché ha zero conversioni visibili**: Google
  non dice quale ricerca ha convertito per quasi tutte le conversioni.
- **Un marchio concorrente si esclude sempre in due forme**, staccata e attaccata
  ("acqua life" e "acqualife"): è già rientrato due volte dalla porta laterale.
- **Mai il nome di un concorrente nei titoli degli annunci**, e niente critiche
  dirette.
- **"Nessun foro nel piano cucina" non si scrive**: a volte il piano si fora. Si
  dice "un solo rubinetto in cucina".
- **Niente addolcitori**: Acquadirete non li vende.

## In osservazione (aggiornato il 12 ott 2026)

- **Meta è all'ultima prova** fino a fine ottobre (vedi `agenti/ordini.md`): dal 21
  settembre la zona è ristretta alle tre province, dal 2 ottobre c'è il video nuovo.
  La revisione del 18 ottobre è il punto intermedio: quanti contatti dopo la zona
  ristretta, quanti fuori zona (ZX), quanti clienti. La decisione sul budget è di
  Matteo.
- **Il gruppo "Confronto"** (ricerche su marchi concorrenti e "quale scegliere") è
  voluto, ed è sotto esame: se non porta contatti si spegne, se ne porta si tiene.
  La revisione dice com'è andato.
- **Il gruppo "Prezzi"** porta alla pagina dei prezzi: va giudicato sui contatti
  nati da quella pagina, non sui clic.

## Le zone

Nel Gestionale ogni contatto ha una zona per tempo di viaggio: da Z1 (vicino) a Z6,
e **ZX = fuori zona**, dove non si va. Un contatto ZX è pubblicità buttata: la quota
di ZX per canale è uno dei numeri più importanti della revisione.
