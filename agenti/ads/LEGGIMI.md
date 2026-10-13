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
4. Se l'analisi ha preparato delle modifiche semplici a Google Ads, gli arriva
   subito dopo **la proposta**: l'elenco numerato, già pronto.

## Cosa può applicare l'agente, e cosa no (dal 13 ott 2026)

Matteo ha chiesto: *"ma poi chi le applica le cose che dice?"*. Da allora le
modifiche semplici non restano un elenco di clic da fare: l'agente le porta
pronte e lui risponde su Telegram.

| Matteo scrive | Cosa succede |
|---|---|
| `APPROVA ADS` | le applica tutte su Google Ads |
| `APPROVA ADS 1 3` | solo quelle coi numeri scritti |
| `RIFIUTA ADS` e il motivo | non tocca niente; il motivo va in `lezioni.md` |
| `ANNULLA ADS` | rimette com'era l'ultima proposta applicata |

**Si può applicare così, e solo dopo il suo APPROVA:**

- escludere una ricerca (parola chiave esclusa, a frase o esatta);
- mettere in pausa una parola chiave;
- mettere in pausa un annuncio;
- il contrario di queste tre, con ANNULLA ADS, e solo su quello che ha fatto lui.

**Non si può, mai:** budget, offerte, campagne o gruppi accesi o spenti, annunci
nuovi o riscritti, cancellazioni, e tutto Meta. Non è una raccomandazione: il
codice che scrive su Google Ads (`scripts/lib/ads.mjs`, `PERMESSE`) accetta solo
quelle forme di operazione e rifiuta il resto.

**I controlli** (`scripts/lib/ads-azioni.mjs`) si fanno due volte, quando la
proposta nasce e di nuovo quando si applica. Una modifica viene scartata se:

- punta a una campagna, un gruppo, una parola o un annuncio che non esiste;
- un'esclusione fermerebbe una nostra parola chiave attiva, una ricerca che nel
  mese ha portato una conversione, o più del 15% dei clic;
- riguarda prezzo, costo, gratis o preventivo (vedi sotto);
- una pausa lascerebbe un gruppo senza parole o senza annunci, toccherebbe
  qualcosa che ha convertito, o toglierebbe in tutto più del 20% dei clic;
- supera i tetti: 15 esclusioni, 3 parole in pausa, 1 annuncio in pausa per volta.

La proposta vale 21 giorni, poi scade. Sta in `agenti/ads/proposte.json`: in
chiaro ci sono solo data, stato e quante modifiche; l'elenco è cifrato, perché
il repository è pubblico. La chiave è quella del service account degli agenti
su GitHub, quindi **dal PC la proposta non si può leggere**: per sapere cosa
c'era dentro si guarda il messaggio su Telegram.

Perché funzioni, su Google Ads l'utente del service account `seo-report-bot`
deve avere accesso **Standard** (lo decide Matteo: Amministratore → Accesso e
sicurezza → Utenti). Con "Sola lettura" le proposte arrivano lo stesso, ma
all'APPROVA Google ferma tutto e l'agente lo dice. Si prova senza cambiare
niente con il workflow **Agente Ads - prova dell'accesso**. La chiave sul PC
(`cruscotto-readonly`) resta di sola lettura.

Meta resta fuori: lì l'agente legge e consiglia, e fa tutto Matteo.

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
