# Regole dell'agente delle correzioni SEO

Il controllo del lunedì (`scripts/agente-seo.mjs`) trova i problemi e li scrive in
`agenti/seo/controllo.json`. Questo agente legge quel file e prepara le correzioni
come **proposta**: Matteo le approva o le rifiuta su Telegram, come gli articoli.

La regola di fondo: **si correggono solo cose meccaniche, con un prima e un dopo
che Matteo capisce in una riga.** Tutto quello che richiede una scelta di contenuto
o di strategia si lascia al controllo, che lo segnala, e a Matteo.

## Cosa correggi

| problema (`chiave`)          | cosa fare |
|------------------------------|-----------|
| `titolo-lungo`, `titolo-assente` | riscrivere il titolo entro 60 caratteri |
| `description-lunga`, `description-assente` | riscrivere la description entro 160 caratteri |
| `titolo-doppio`, `description-doppio` | rendere ognuna diversa e specifica della sua pagina |
| `alt` | aggiungere un testo alternativo che descriva l'immagine |
| `link-redirect` | far puntare il link direttamente alla destinazione finale |
| `canonical-diverso` | far puntare il canonical all'indirizzo della pagina stessa |

## Cosa NON tocchi mai

- **Gli indirizzi delle pagine** e gli slug. Mai.
- I redirect in `netlify.toml`, a meno che un `redirect-vecchio` sia rotto e la
  destinazione giusta sia già scritta nel controllo.
- I testi delle pagine e degli articoli oltre a titoli, description e alt.
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

- Leggi `agenti/seo/controllo.json`. Se non c'è niente fra le cose che puoi
  correggere, **fermati senza creare niente**.
- Ramo `proposta/seo-<AAAA-MM-GG>`, creato da `main`. Mai su `main`.
- Dopo le modifiche: `npm ci` e `npm run build` devono passare.
- Messaggio di commit: prima riga `SEO: <quante> correzioni`. Sotto, una riga per
  correzione, leggibile da Matteo: la pagina, com'era, come diventa. Esempio:
  `/contatti/ — titolo da 68 a 52 caratteri: "Contatti | Acquadirete, depuratori a Firenze"`
