---
name: correggi-proposta
description: Corregge una proposta in attesa (un articolo del blog o delle correzioni SEO) con le note che Matteo ha scritto su Telegram dopo CORREGGI, e la rispinge sul suo ramo. Gira in correggi-proposta.yml.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Correggere una proposta con le note di Matteo

Matteo ha letto una proposta su Telegram e ha risposto **CORREGGI** con delle note.
Il tuo lavoro è applicare quelle note, e solo quelle, e rispingere lo stesso ramo.
A ripresentargliela ci pensa il workflow *Proposta - presentala a Matteo*.

**NON pubblicare niente e NON toccare mai il ramo `main`.** Il ramo della proposta è
già quello su cui sei: controllalo con `git branch --show-current`. Non clonare niente.

## PASSO 1 — Leggi

- `/tmp/note-di-matteo.txt` — le correzioni. Valgono più di qualsiasi tua idea.
- Il ramo: `git branch --show-current`. Se comincia con `proposta/articolo-` è un
  articolo, se comincia con `proposta/seo-` sono correzioni SEO.
- Cosa contiene la proposta: `git log origin/main..HEAD` e
  `git diff origin/main...HEAD --stat`.
- L'anteprima che Matteo ha letto, in `agenti/anteprime/`.
- Le regole: `agenti/contenuti/REGOLE.md` per un articolo, `agenti/seo/REGOLE.md`
  per le correzioni SEO. E `CLAUDE.md`.

## PASSO 2 — Correggi

- Fai **tutte** le correzioni chieste, e **niente altro**: non riscrivere parti che
  Matteo non ha nominato, non cambiare argomento, titolo o indirizzo se non lo chiede.
- Se una nota è vaga ("più generico"), applicala dove serve davvero e dillo nel
  commit: dove hai cambiato e come.
- Se una nota chiede una cosa che le REGOLE vietano (un prezzo, una percentuale,
  un fatto di salute, gli addolcitori), non farla: scrivilo nel commit, così
  Matteo lo legge.
- Un articolo sta in `lib/blogPosts.ts`: se cambi titolo per Google o
  descrizione, **conta i caratteri con node** (60 e 160 al massimo) e scrivi il
  numero vero nell'anteprima.
- Attenzione alle pubblicità: Acquadirete fa pubblicità su Facebook con un modulo
  per lasciare il numero. Un avviso contro le truffe non deve mai dire di non
  lasciare i dati nei moduli delle pubblicità in generale.

## PASSO 3 — L'anteprima

Aggiorna il file in `agenti/anteprime/` perché Matteo la rilegga sul telefono:

- in cima: "Corretto il <data> con le tue note", e l'elenco di cosa hai cambiato,
  una riga per nota;
- poi il testo intero aggiornato, come prima, segnando con **(nuovo)** o
  **(cambiato)** i pezzi toccati.

Italiano semplice, senza codice e senza nomi di file del progetto.

## PASSO 4 — Il build

`npm ci` e poi `npm run build`. Se il build fallisce, correggi. Se non riesci,
fermati, scrivi l'errore e **non spingere niente**.

## PASSO 5 — Commit e push

Un commit sul ramo. **La prima riga deve essere la stessa del primo commit della
proposta** (`git log --reverse --format=%s origin/main..HEAD | head -1` ti dice
qual è, per esempio `Articolo: <titolo>` o `SEO: 3 correzioni`; se hai cambiato
il titolo dell'articolo, metti `Articolo: <titolo nuovo>`): diventa il titolo del
messaggio che arriva a Matteo. Nel corpo, una riga per correzione fatta, e cosa non hai fatto e
perché. Nel corpo **non scrivere mai le sigle fra parentesi quadre per saltare il
deploy o i controlli**: anche solo citate fermano il workflow.

Poi `git push origin HEAD`. Se il push fallisce, **non provare altre strade**:
scrivi l'errore per intero e fermati.
