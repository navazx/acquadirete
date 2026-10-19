---
name: correggi-post
description: Corregge la bozza del post social in attesa (agenti/social-bozza.json) con le note che Matteo ha scritto su Telegram dopo CORREGGI, e la rispinge su main perché gli torni da approvare. Gira in correggi-post.yml.
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Correggere il post social con le note di Matteo

Matteo ha visto su Telegram la bozza del post della settimana e ha risposto
**CORREGGI** con delle note. Il tuo lavoro è applicare quelle note, e solo quelle,
e rispingere la bozza. A rimandargliela ci pensa il workflow *Social - manda la
bozza*, che parte da solo quando la bozza cambia su `main`.

**NON pubblicare niente sui social e non mandare messaggi.** Pubblicare resta un
PUBBLICA di Matteo. Il repository è già nella cartella di lavoro: non clonarlo.

## PASSO 1 — Leggi

- `agenti/METODO.md`, per intero: come si lavora, e la rilettura da critico prima
  di rimandare la bozza.
- `/tmp/note-di-matteo.txt` — le correzioni. Valgono più di qualsiasi tua idea.
- `agenti/social-bozza.json` — la bozza che ha visto.
- `agenti/LEGGIMI.md`, per intero: il formato della bozza, le foto e le note di
  Matteo sulle foto, la grafica delle curiosità e quella delle recensioni.
- `agenti/social-lezioni.md` — le correzioni che Matteo ha già dato ai post
  passati: valgono come regole.

**Se la bozza ha il campo `pubblicato` o `scartato`, fermati senza toccare
niente** e scrivi perché: non c'è più niente da correggere.

## PASSO 2 — Correggi

Fai **tutte** le correzioni chieste, e **niente altro**: non cambiare il tema, non
riscrivere le varianti che Matteo non ha nominato.

- **Il testo** — cambia le `varianti`. Se la nota non dice quale, vale per tutte.
- **La foto** (temi installazione e contesto diverso) — scegline un'altra in
  `public/assets/social/`: aprile col tool Read e guardale davvero, leggi
  `agenti/social-foto-note.json`, non riusare una foto già uscita
  (`git log -p -- agenti/social-bozza.json`), e scarta quelle in disordine. Se non
  ce n'è una adatta metti `"foto": null` e dillo nel commit: il post uscirà solo
  su Facebook, e Matteo lo saprà.
- **La grafica** (curiosità e recensioni) — cambia il campo `grafica`, cancella
  l'immagine di prima (`git rm` del file scritto nel campo `foto`) e rifalla:
  `npm ci`, poi `node scripts/grafica-curiosita.mjs agenti/social-bozza.json`
  oppure `node scripts/grafica-recensione.mjs agenti/social-bozza.json`. Aprila
  col tool Read e guardala prima di andare avanti.
- **Sotto una recensione non va mai la foto di un impianto**: va la grafica delle
  recensioni, anche se la nota chiede solo "cambia la foto".
- Le didascalie devono andare d'accordo con l'immagine: niente che la foto o la
  grafica smentisca.

Se una nota è vaga ("più corto", "meno pubblicitario"), applicala dove serve
davvero e dillo nel commit. Se chiede una cosa vietata qui sotto, non farla e
scrivilo nel commit.

**Regole da non violare mai**, anche se una nota le chiede:

- niente numeri spacciati per dati di Acquadirete: prezzi, percentuali di
  risparmio o di impurità tolte, tempi di installazione;
- temi di salute: solo fatti generali, e si rimanda a medico o pediatra;
- Acquadirete non vende addolcitori: non nominarli;
- una recensione si cita solo con parole davvero presenti in
  `lib/google-reviews.json`;
- privacy: mai il nome del cliente, la via, il numero civico, un volto, una targa.
  La zona generica ("a Bagno a Ripoli") va bene.

## PASSO 3 — Rimetti la bozza in attesa

In `agenti/social-bozza.json`:

- **togli il campo `inviato`** (e `rimandata`, se c'è): è così che la bozza torna
  a Matteo;
- aggiungi in fondo all'elenco `correzioni` (crealo se manca) una voce
  `{ "quando": "<ora ISO>", "note": "<le note di Matteo>", "fatto": "<cosa hai cambiato, una riga>" }`.
  **Matteo legge `fatto` in cima al messaggio Telegram** (dal 19 ott 2026): se nelle
  note ti ha fatto una domanda ("è vero che…?"), la risposta va lì, chiara, con la
  fonte che hai controllato. Una domanda senza risposta è una correzione non fatta.

Controlla che il file sia JSON valido: `node -e "JSON.parse(require('fs').readFileSync('agenti/social-bozza.json','utf8'))"`.

## PASSO 4 — Commit e push

Un commit su `main` con la bozza (e l'immagine, se l'hai rifatta). Prima riga:
`Social: bozza corretta con le note di Matteo`. Nel corpo, una riga per
correzione fatta, e cosa non hai fatto e perché. **Non scrivere mai le sigle fra
parentesi quadre per saltare il deploy o i controlli**, nemmeno citate:
l'immagine nuova deve andare online, Instagram la scarica dal sito.

Poi `git pull --rebase origin main` e `git push origin HEAD:main`. Se il push
fallisce, **non provare altre strade**: scrivi l'errore per intero e fermati.
