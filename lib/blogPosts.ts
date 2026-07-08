import { BlogPost } from './types';

// Articoli del blog. Aggiungere un nuovo post: estendere questo array con un
// nuovo oggetto BlogPost (vedi lib/types.ts per la forma) — non serve toccare
// altro, la pagina indice (/blog) e la sitemap si aggiornano da sole.
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'carboni-attivi-vs-osmosi-inversa',
    title: 'Carboni attivi o osmosi inversa? La guida per scegliere il depuratore giusto',
    metaTitle: 'Carboni Attivi o Osmosi Inversa? | Acquadirete',
    metaDescription:
      'Carboni attivi o osmosi inversa: le differenze spiegate semplici, e quando conviene scegliere l\'uno o l\'altro. Sopralluogo gratuito a Firenze, Prato e Pistoia.',
    excerpt:
      'Carboni attivi o osmosi inversa? Le differenze reali, spiegate senza tecnicismi, per capire quale soluzione serve davvero alla tua acqua.',
    publishedAt: '2026-06-21',
    readingMinutes: 6,
    relatedServices: ['carboni', 'osmosi', 'depuratore'],
    sections: [
      {
        paragraphs: [
          'È la domanda che ci sentiamo fare più spesso, sia al telefono che durante i sopralluoghi: "Mi serve l\'osmosi inversa o bastano i carboni attivi?". La risposta onesta è che dipende dalla tua acqua e da cosa cerchi — e spesso la soluzione più semplice è anche quella giusta, anche se non è quella che rende di più a chi vende.',
          'In questa guida ti spieghiamo le differenze reali tra le due tecnologie, senza tecnicismi, così puoi farti un\'idea chiara prima ancora di parlare con noi (o con chiunque altro).',
        ],
      },
      {
        heading: 'Cosa fanno davvero i carboni attivi',
        paragraphs: [
          'Un depuratore a carboni attivi fa passare l\'acqua del rubinetto attraverso un filtro che trattiene cloro, sedimenti, odori e molte sostanze che ne rovinano gusto e qualità. È lo stesso principio che usano le caraffe filtranti, ma con una capacità e una precisione molto superiori.',
          'Il punto chiave: i carboni attivi non toccano i sali minerali naturali dell\'acqua. Bevi un\'acqua più buona e più sicura, ma con la stessa "composizione" di base del tuo rubinetto — solo senza cloro e senza ciò che ne peggiora il sapore.',
          'Vantaggi pratici: impianto semplice, nessuno scarto d\'acqua, nessuna corrente elettrica necessaria, costi più contenuti sia all\'acquisto che nel tempo.',
        ],
      },
      {
        heading: 'Cosa fa davvero l\'osmosi inversa',
        paragraphs: [
          'L\'osmosi inversa spinge l\'acqua attraverso una membrana con pori talmente piccoli da trattenere quasi tutto ciò che è disciolto nell\'acqua: non solo cloro e sedimenti, ma anche metalli pesanti, nitrati, pesticidi, batteri e gran parte dei sali minerali, calcio e magnesio compresi.',
          'Il risultato è un\'acqua molto più "leggera" — il motivo per cui spesso viene paragonata a una buona oligominerale in bottiglia. Nei nostri impianti regoliamo il residuo fisso in base alle tue esigenze, così l\'acqua non risulta "demineralizzata" ma equilibrata.',
          'Il compromesso: l\'impianto è più complesso, richiede un piccolo scarico per l\'acqua di lavaggio della membrana (ridotto al minimo nei sistemi più recenti) e una manutenzione un po\' più strutturata nel tempo.',
        ],
      },
      {
        heading: 'Le differenze in pratica',
        paragraphs: [
          '• Sapore e odori: entrambe le tecnologie li eliminano efficacemente.',
          '• Sali minerali: i carboni attivi li mantengono inalterati, l\'osmosi inversa li riduce (regolabili in base alle tue esigenze).',
          '• Metalli pesanti, nitrati, microplastiche: rimossi in modo significativo solo dall\'osmosi inversa.',
          '• Scarto d\'acqua: nessuno con i carboni attivi, minimo ma presente con l\'osmosi inversa.',
          '• Costo e complessità impianto: i carboni attivi sono più semplici ed economici, sia all\'acquisto che nella manutenzione.',
        ],
      },
      {
        heading: 'Quando ti bastano i carboni attivi',
        paragraphs: [
          'Se la tua acqua di rubinetto è già buona dal punto di vista chimico e il problema principale è il sapore di cloro o qualche odore sgradevole, i carboni attivi risolvono il problema con un impianto più semplice e meno costoso. È la scelta giusta per chi vuole semplicemente "acqua del rubinetto più buona", senza altre necessità particolari.',
        ],
      },
      {
        heading: 'Quando conviene l\'osmosi inversa',
        paragraphs: [
          'Se la tua zona ha un\'acqua particolarmente dura o calcarea, se cerchi un\'acqua più leggera per cucinare o per il latte dei più piccoli, o se vuoi la massima rimozione possibile di sostanze indesiderate, l\'osmosi inversa è la soluzione più completa. È anche la scelta più diffusa per chi vuole smettere del tutto di comprare acqua in bottiglia, gassata compresa.',
        ],
      },
      {
        heading: 'Non sai ancora quale scegliere? Te lo diciamo noi, gratis',
        paragraphs: [
          'Non esiste una risposta valida per tutti: dipende dalla durezza della tua acqua, da quanto la usi e da cosa cerchi davvero. Per questo il nostro sopralluogo è gratuito e senza impegno: veniamo a casa tua o nella tua attività, analizziamo l\'acqua, e ti diciamo onestamente qual è la soluzione più adatta — anche quando è la più semplice ed economica delle due.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Posso passare dai carboni attivi all\'osmosi inversa in futuro?',
        a: 'Sì, sono impianti distinti e indipendenti: puoi sempre passare da uno all\'altro in un secondo momento, senza dover rifare tutto da capo.',
      },
      {
        q: 'L\'osmosi inversa toglie troppi minerali per essere sana?',
        a: 'No: regoliamo il residuo fisso in base alle tue esigenze, quindi l\'acqua resta leggera ma equilibrata. Va comunque ricordato che la maggior parte dei minerali di cui il corpo ha bisogno arriva dal cibo, non dall\'acqua.',
      },
      {
        q: 'Quale delle due tecnologie scarta più acqua?',
        a: 'I carboni attivi non hanno alcuno scarto. L\'osmosi inversa ne ha uno minimo, molto ridotto rispetto ai sistemi di qualche anno fa, per il lavaggio periodico della membrana.',
      },
    ],
  },
  {
    slug: 'depuratore-acqua-gratis-contratti',
    title: 'Depuratore acqua "gratis"? Come funzionano davvero questi contratti',
    metaTitle: 'Depuratore Gratis: Come Funzionano i Contratti | Acquadirete',
    metaDescription:
      'Depuratore acqua gratis: come funzionano davvero questi contratti porta a porta, i segnali da riconoscere e cosa valutare prima di firmare.',
    excerpt:
      'Telefonate e venditori porta a porta promettono un depuratore "gratis". Ecco come funzionano davvero questi contratti e cosa guardare prima di firmare.',
    publishedAt: '2026-06-22',
    readingMinutes: 5,
    relatedServices: ['depuratore', 'assistenza'],
    relatedPosts: ['quanto-costa-depuratore-osmosi-inversa', 'installatore-depuratore-scomparso-cosa-fare'],
    sections: [
      {
        paragraphs: [
          'Capita spesso: una telefonata o un venditore alla porta propone un depuratore "gratis", magari abbinato a un buono sconto o a un test dell\'acqua omaggio. Non è un\'offerta da rifiutare per principio, ma vale la pena capire come funziona davvero prima di firmare qualcosa.',
        ],
      },
      {
        heading: 'Come funziona davvero il modello "gratis"',
        paragraphs: [
          'Nella grande maggioranza dei casi, "gratis" significa che l\'impianto non si paga in un\'unica soluzione iniziale, ma tramite un canone mensile o un contratto pluriennale — spesso 5 anni o più. Alla fine, il costo totale pagato è quasi sempre superiore a quello di un acquisto diretto dello stesso impianto.',
          'Non è necessariamente scorretto: per alcune famiglie un canone mensile più basso può avere senso. Il problema nasce quando le condizioni reali del contratto — durata, penali di recesso, cosa succede in caso di guasto — non vengono spiegate con chiarezza al momento della firma.',
        ],
      },
      {
        heading: 'I segnali da non ignorare',
        paragraphs: [
          '• Pressione per firmare subito, "l\'offerta vale solo oggi": un\'azienda seria lascia il tempo di pensare e confrontare.',
          '• Nessun documento scritto chiaro su durata del contratto e penali di recesso prima della firma.',
          '• Il venditore non sa o non vuole dire chi farà la manutenzione e con quali tempi di intervento.',
          '• Nessun referente locale rintracciabile in caso di problemi, solo un numero verde o un call center.',
        ],
      },
      {
        heading: 'Conosci i tuoi diritti',
        paragraphs: [
          'Se firmi un contratto a casa tua (fuori da un negozio o sede commerciale), la legge italiana ti dà 14 giorni di diritto di recesso, senza dover dare spiegazioni e senza penali. Vale la pena saperlo prima di firmare qualunque cosa sotto pressione.',
        ],
      },
      {
        heading: 'Cosa cambia con un acquisto diretto',
        paragraphs: [
          'Con un acquisto diretto sai esattamente cosa stai pagando, da subito: il prezzo dell\'impianto è chiaro, la garanzia è scritta nero su bianco, e la manutenzione è un servizio che scegli (e puoi cambiare) liberamente, non un canone bloccato per anni. È il motivo per cui lavoriamo così: veniamo a casa tua, ti facciamo un preventivo chiaro, e ti lasciamo tre mesi di tempo per decidere — senza nessuna pressione.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Quindi il depuratore "gratis" è sempre da evitare?',
        a: 'Non sempre, ma va valutato con attenzione: leggi bene durata, canone totale nel tempo e condizioni di recesso prima di firmare, e confronta sempre con il costo di un acquisto diretto equivalente.',
      },
      {
        q: 'Posso recedere da un contratto già firmato?',
        a: 'Se l\'hai firmato a casa o fuori da una sede commerciale, hai 14 giorni di diritto di recesso per legge, senza dover dare motivazioni. Dopo questo termine dipende dalle condizioni specifiche del contratto firmato.',
      },
      {
        q: 'Come faccio a sapere se un preventivo è onesto?',
        a: 'Chiedi sempre: prezzo totale chiaro, cosa è incluso nella manutenzione, chi interviene in caso di guasto e in quanto tempo. Se una di queste risposte manca o è vaga, prendi tempo prima di firmare.',
      },
    ],
  },
  {
    slug: 'quanto-costa-depuratore-osmosi-inversa',
    title: 'Quanto costa un depuratore a osmosi inversa? Guida ai prezzi',
    metaTitle: 'Quanto Costa un Depuratore a Osmosi Inversa | Acquadirete',
    metaDescription:
      'Quanto costa un depuratore a osmosi inversa: fasce di prezzo indicative, cosa incide sul costo e quanto si spende di manutenzione nel tempo.',
    excerpt:
      'Quanto costa davvero un depuratore a osmosi inversa? Le fasce di prezzo indicative, cosa le fa variare e quanto si spende di manutenzione.',
    publishedAt: '2026-06-23',
    readingMinutes: 5,
    relatedServices: ['osmosi', 'depuratore', 'assistenza'],
    relatedPosts: ['depuratore-acqua-gratis-contratti', 'noleggio-vs-acquisto-depuratore'],
    sections: [
      {
        paragraphs: [
          'È una delle prime domande che ci vengono fatte, ed è giusto così: prima di decidere vuoi sapere a cosa vai incontro. La risposta onesta è "dipende" — ma possiamo darti dei riferimenti chiari per orientarti, prima ancora di chiamarci.',
        ],
      },
      {
        heading: 'Le fasce di prezzo, in generale',
        paragraphs: [
          'Sul mercato, un impianto a osmosi inversa domestico va indicativamente da poche centinaia di euro per i sistemi più semplici, fino a oltre 3.000 € per impianti di fascia alta con più stadi di filtrazione, capacità maggiore e funzioni aggiuntive come l\'acqua refrigerata o gassata.',
          'Questi sono valori di mercato generali, non un nostro listino: il prezzo giusto per la tua situazione dipende dalla tua acqua, dai tuoi consumi e da cosa cerchi davvero. Per questo il sopralluogo e il preventivo sono sempre gratuiti — è l\'unico modo per darti un numero vero, non una stima al buio.',
        ],
      },
      {
        heading: 'Cosa fa variare il prezzo',
        paragraphs: [
          '• Numero di stadi di filtrazione e qualità della membrana.',
          '• Capacità dell\'impianto, in base ai consumi della famiglia o dell\'attività.',
          '• Funzioni aggiuntive: acqua refrigerata, gassata, erogatore dedicato.',
          '• Installazione: complessità dell\'allaccio, distanza dal punto di erogazione.',
        ],
      },
      {
        heading: 'E la manutenzione, quanto costa nel tempo?',
        paragraphs: [
          'Oltre al costo iniziale, considera la manutenzione periodica (cambio filtri e, più di rado, della membrana): in genere si parla di una cifra contenuta su base annua, molto inferiore al risparmio generato evitando le bottiglie. Noi te lo includiamo già nel preventivo, così sai sempre cosa aspettarti, senza sorprese più avanti.',
        ],
      },
      {
        heading: 'Occhio alle promozioni troppo aggressive',
        paragraphs: [
          'Un prezzo molto più basso della media, o una promozione "solo per oggi", spesso nasconde un contratto a canone con costi nascosti più alti nel tempo. Ne parliamo nel dettaglio nella nostra guida sui contratti "depuratore gratis" — vale la pena leggerla prima di firmare qualsiasi cosa.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Il preventivo gratuito è vincolante?',
        a: 'No, è gratuito e senza impegno. Te lo lasciamo per iscritto e resta valido 3 mesi, così hai tutto il tempo di pensarci.',
      },
      {
        q: 'Conviene comprare o noleggiare un depuratore?',
        a: 'Nella maggior parte dei casi l\'acquisto diretto costa meno nel tempo rispetto a un canone pluriennale, ma dipende da quanto vuoi investire da subito. Possiamo valutarlo insieme durante il sopralluogo.',
      },
      {
        q: 'Il prezzo include l\'installazione?',
        a: 'Sì, nei nostri preventivi l\'installazione è sempre inclusa e chiara fin da subito, senza costi aggiuntivi a sorpresa.',
      },
    ],
  },
  {
    slug: 'installatore-depuratore-scomparso-cosa-fare',
    title: 'Il tuo installatore del depuratore è scomparso? Ecco cosa fare',
    metaTitle: 'Installatore Depuratore Scomparso? | Acquadirete',
    metaDescription:
      'Il tuo installatore del depuratore è scomparso o ha chiuso? Ecco cosa fare, e come trovare assistenza anche per impianti di altre marche.',
    excerpt:
      'Il tuo installatore del depuratore non risponde più o ha chiuso? Ecco cosa fare passo per passo, senza dover buttare via l\'impianto.',
    publishedAt: '2026-06-24',
    readingMinutes: 5,
    relatedServices: ['assistenza', 'depuratore'],
    relatedPosts: ['depuratore-acqua-gratis-contratti'],
    sections: [
      {
        paragraphs: [
          'Hai un depuratore installato qualche anno fa, ma l\'azienda che te l\'ha venduto non risponde più al telefono, ha chiuso o ha cambiato nome — oppure è ancora lì ma ti chiede cifre fuori da ogni logica solo per cambiare un filtro. Non sei il primo a trovarti in questa situazione: capita più spesso di quanto si pensi, soprattutto con i venditori che lavorano per pochi anni in una zona e poi si spostano altrove.',
          'La buona notizia è che quasi sempre c\'è una soluzione, senza dover buttare via l\'impianto e ricominciare da zero.',
        ],
      },
      {
        heading: 'Perché succede così spesso',
        paragraphs: [
          'Il mercato dei depuratori ha tante piccole realtà locali e diversi venditori che operano tramite agenzie o reti commerciali, spesso legate a contratti di vendita porta a porta o telefonica. Quando l\'agenzia chiude, cambia ragione sociale o il venditore smette di lavorare in quella zona, il cliente resta con un impianto funzionante ma senza più nessuno che se ne occupi.',
          'Ne abbiamo parlato anche nella nostra guida sui contratti "depuratore gratis": spesso il modello di vendita è pensato per durare quanto il contratto, non quanto l\'impianto. Passati gli anni dell\'accordo, l\'assistenza è spesso la prima cosa a sparire.',
        ],
      },
      {
        heading: 'Cosa non conviene fare',
        paragraphs: [
          '• Continuare a usarlo senza cambiare filtri o membrana solo perché "funziona ancora": un impianto non manutenuto smette di filtrare bene molto prima di quanto te ne accorga dal sapore.',
          '• Staccarlo e tornare all\'acqua in bottiglia pensando che sia l\'unica alternativa: nella maggior parte dei casi l\'impianto si può recuperare.',
          '• Affidarti al primo numero trovato online senza verificare se lavora davvero sulla tua marca e nella tua zona.',
        ],
      },
      {
        heading: 'I passi da seguire',
        paragraphs: [
          '1. Recupera quello che puoi: il modello dell\'impianto (spesso scritto su un\'etichetta sotto il lavello), eventuali fatture o il contratto. Anche solo una foto dell\'impianto è spesso sufficiente a un tecnico per capire di che tipo si tratta.',
          '2. Cerca chi fa assistenza multimarca nella tua zona: molte aziende serie, compresa la nostra, seguono anche impianti che non hanno installato loro. Dillo chiaramente quando chiami: "il mio impianto non è vostro, potete seguirlo comunque?".',
          '3. Chiedi una valutazione prima di decidere: a volte basta un cambio filtri, altre volte conviene sostituire l\'impianto. Si capisce solo dopo averlo visto, non al telefono a scatola chiusa.',
        ],
      },
      {
        heading: 'Riparare o sostituire? Dipende da cosa trova il tecnico',
        paragraphs: [
          'Se l\'impianto è stato manutenuto fino a poco tempo fa ed è di una marca diffusa, spesso basta rimettere in pari filtri e membrana per farlo tornare come nuovo. Se invece è rimasto fermo per anni, oppure è un modello particolare di cui è difficile trovare i ricambi, può convenire sostituirlo con uno nuovo. Il sopralluogo serve esattamente a capire quale delle due strade ha senso per te, senza che tu debba indovinare.',
        ],
      },
      {
        heading: 'Noi seguiamo anche impianti che non abbiamo installato noi',
        paragraphs: [
          'Una parte delle richieste di assistenza che riceviamo riguarda proprio impianti installati da altre aziende, spesso non più operative. Dicci marca e modello — basta anche una foto — e ti diciamo subito se possiamo prenderlo in carico. Se possiamo seguirlo, ti includiamo anche i promemoria automatici per i cambi filtro futuri, così non ti ritrovi mai più nella stessa situazione.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Posso farvi seguire un depuratore che non avete installato voi?',
        a: 'Sì, seguiamo la manutenzione di depuratori a osmosi inversa di diverse marche. Dicci qual è il tuo, anche solo con una foto, e ti diciamo subito se possiamo prenderlo in carico.',
      },
      {
        q: 'Non ho più la fattura né il contratto originale, è un problema?',
        a: 'Non è indispensabile: nella maggior parte dei casi basta vedere l\'impianto o una foto dell\'etichetta con il modello per capire come intervenire.',
      },
      {
        q: 'E se conviene sostituirlo invece di ripararlo?',
        a: 'Te lo diciamo onestamente dopo averlo visto, senza interesse a venderti qualcosa che non ti serve: se basta un cambio filtri te lo diciamo, se conviene sostituirlo te ne spieghiamo il motivo.',
      },
    ],
  },
  {
    slug: 'noleggio-vs-acquisto-depuratore',
    title: 'Noleggio o acquisto del depuratore? Perché scegliamo di vendere, non affittare',
    metaTitle: 'Noleggio o Acquisto Depuratore? | Acquadirete',
    metaDescription:
      'Noleggio o acquisto di un depuratore? Spieghiamo onestamente perché scegliamo di vendere, non affittare, e cosa cambia davvero per te nel tempo.',
    excerpt:
      'Tanti proponiamo solo il noleggio. Noi no: ecco perché preferiamo vendere il depuratore, e cosa cambia davvero per te tra le due strade.',
    publishedAt: '2026-06-25',
    readingMinutes: 5,
    relatedServices: ['depuratore', 'osmosi', 'assistenza'],
    relatedPosts: ['quanto-costa-depuratore-osmosi-inversa', 'depuratore-acqua-gratis-contratti'],
    sections: [
      {
        paragraphs: [
          'Tanti dei contratti che vedi proporre — al telefono, porta a porta, o nelle promozioni "tutto incluso" — sono in realtà noleggi camuffati da depuratore "gratis" o "a partire da pochi euro al mese". Noi lavoriamo diversamente: vendiamo l\'impianto. Ti spieghiamo onestamente perché, così puoi decidere con tutte le informazioni, non solo le nostre.',
        ],
      },
      {
        heading: 'Come funziona il noleggio',
        paragraphs: [
          'Con il noleggio, l\'impianto resta di proprietà dell\'azienda: tu paghi un canone mensile o annuale per usarlo, di solito per un periodo minimo di alcuni anni. Il vantaggio è l\'esborso iniziale basso o nullo. Lo svantaggio è che, somma dopo somma, nella maggior parte dei casi il totale pagato nel tempo supera ampiamente il costo di un acquisto diretto dello stesso impianto — a volte anche di parecchio.',
        ],
      },
      {
        heading: 'Come funziona l\'acquisto',
        paragraphs: [
          'Con l\'acquisto paghi l\'impianto una volta, alle condizioni che hai visto e approvato prima di firmare. Da quel momento l\'impianto è tuo: la manutenzione è un servizio che scegli liberamente — puoi anche cambiare chi te la fa, se non sei contento — non un canone da cui sei legato per anni.',
        ],
      },
      {
        heading: 'Perché scegliamo di vendere',
        paragraphs: [
          'Non perché il noleggio sia sempre scorretto: per qualcuno, spalmare il costo nel tempo ha senso. Ma nella nostra esperienza, la maggior parte delle persone alla fine paga di più, capisce le condizioni reali solo a contratto già firmato, e si ritrova legata a un fornitore anche quando non ne è più soddisfatta. Preferiamo essere chiari da subito: un prezzo, una garanzia scritta, e la libertà di scegliere chi ti assiste — comprese le manutenzioni future, se un giorno preferissi rivolgerti altrove.',
        ],
      },
      {
        heading: 'Non vuoi pagare tutto in una volta? Si può rateizzare a tasso zero',
        paragraphs: [
          'Il vantaggio principale del noleggio è non dover affrontare subito l\'intera spesa. Ma questo non è un buon motivo per rinunciare all\'acquisto: possiamo rateizzare l\'impianto a tasso zero, così spalmi il costo nel tempo senza interessi e senza sorprese.',
          'La differenza rispetto al canone di noleggio è sostanziale. Con la rateizzazione paghi il prezzo dell\'impianto — quello che hai visto e approvato — diviso in comode rate, e a fine pagamento l\'impianto è tuo: nessun interesse, nessun costo nascosto, nessun obbligo di restituirlo o riscattarlo. In pratica ottieni la comodità della rata mensile, ma con i vantaggi della proprietà.',
        ],
      },
      {
        heading: 'Quando il noleggio può comunque avere senso',
        paragraphs: [
          'Se ti serve l\'impianto solo per un periodo limitato (es. un\'attività stagionale), il noleggio può essere una scelta legittima. Se invece il tuo unico dubbio è non immobilizzare una somma tutta insieme, spesso la nostra rateizzazione a tasso zero risolve la questione meglio del noleggio. In ogni caso, confronta sempre il costo totale nel tempo, non solo la rata mensile, e leggi bene cosa succede a fine contratto.',
        ],
      },
    ],
    faqs: [
      {
        q: 'Quindi non offrite il noleggio?',
        a: 'Il nostro modello è la vendita diretta, con preventivo chiaro e garanzia scritta. Parliamone pure al sopralluogo se hai esigenze particolari: ti diciamo onestamente cosa ha senso per la tua situazione.',
      },
      {
        q: 'Posso comprare l\'impianto a rate?',
        a: 'Sì: possiamo rateizzare l\'acquisto a tasso zero, così spalmi la spesa senza interessi. Paghi il prezzo dell\'impianto in comode rate e alla fine l\'impianto è tuo, senza i vincoli di un noleggio.',
      },
      {
        q: 'Con l\'acquisto la manutenzione costa di più?',
        a: 'No: la manutenzione la scegli e la paghi solo quando serve, a un costo chiaro deciso prima. Non è inclusa "a scatola chiusa" in un canone che continui a pagare comunque.',
      },
      {
        q: 'Cosa succede a fine contratto di noleggio?',
        a: 'Dipende dal contratto firmato: a volte l\'impianto va restituito, altre si può riscattare a un prezzo aggiuntivo. Vale la pena saperlo prima di firmare, non a contratto scaduto.',
      },
    ],
  },
  {
    slug: 'osmosi-inversa-fa-male',
    title: 'L\'osmosi inversa fa male? Quello che c\'è davvero da sapere',
    metaTitle: 'L\'Osmosi Inversa Fa Male? Cosa Sapere | Acquadirete',
    metaDescription:
      'L\'osmosi inversa fa male? La risposta onesta sulla sicurezza di quest\'acqua, da dove nasce il dubbio e cosa considerare davvero.',
    excerpt:
      'L\'osmosi inversa fa male? Rispondiamo onestamente al dubbio più diffuso su quest\'acqua, andando oltre la sola domanda sui minerali.',
    publishedAt: '2026-06-25',
    readingMinutes: 5,
    relatedServices: ['osmosi', 'carboni', 'depuratore'],
    relatedPosts: ['carboni-attivi-vs-osmosi-inversa', 'osmosi-inversa-neonati'],
    sections: [
      {
        paragraphs: [
          'È una domanda che ci arriva spesso, di solito dopo che qualcuno ha letto qualcosa online senza riuscire a capire se è fondato o no. Te la rispondiamo onestamente, senza venderti niente: l\'acqua a osmosi inversa è la stessa tecnologia usata da decenni in tutto il mondo, compresa larga parte dell\'acqua minerale che compri in bottiglia. Il dubbio nasce quasi sempre da una preoccupazione specifica, e vale la pena affrontarla punto per punto.',
        ],
      },
      {
        heading: 'Da dove nasce il dubbio',
        paragraphs: [
          'Il punto centrale è quasi sempre lo stesso: l\'osmosi inversa riduce anche i sali minerali disciolti nell\'acqua, non solo le sostanze indesiderate. Da qui nasce il timore che sia un\'acqua "povera" o "morta". È una preoccupazione legittima da chiarire, non da ignorare.',
        ],
      },
      {
        heading: 'Cosa c\'è di vero',
        paragraphs: [
          'È vero che l\'osmosi riduce il contenuto di minerali. Non è vero che questo la rende dannosa: per una persona con un\'alimentazione normale e varia, la stragrande maggioranza dei minerali di cui il corpo ha bisogno (calcio, magnesio, potassio) arriva dal cibo, non dall\'acqua del rubinetto. È lo stesso motivo per cui le acque minerali oligominerali — quelle "leggere" che si trovano in bottiglia — sono considerate sicure e anzi consigliate in molte situazioni.',
          'Per questo, nei nostri impianti regoliamo il residuo fisso in base alle tue esigenze: non lasciamo l\'acqua completamente demineralizzata, ma equilibrata, paragonabile appunto a una buona oligominerale.',
        ],
      },
      {
        heading: 'E i materiali dell\'impianto?',
        paragraphs: [
          'I componenti a contatto con l\'acqua (membrane, serbatoi, tubi) sono realizzati con materiali certificati per uso alimentare, gli stessi standard richiesti per qualsiasi impianto idrico o per l\'industria dell\'acqua in bottiglia. Non c\'è nulla di "sperimentale": è una tecnologia matura, regolata e diffusa da decenni.',
        ],
      },
      {
        heading: 'Hai un dubbio specifico di salute? Parlane col tuo medico',
        paragraphs: [
          'Se hai una condizione medica particolare, segui una dieta specifica, o hai dubbi legati all\'alimentazione di un neonato, la risposta più corretta non te la diamo noi né un articolo online: parlane con il tuo medico o pediatra, che conosce la tua situazione. Noi possiamo dirti con certezza come funziona l\'impianto e come regoliamo i minerali; le valutazioni mediche personali restano un\'altra cosa.',
        ],
      },
    ],
    faqs: [
      {
        q: 'L\'acqua a osmosi è la stessa che compro in bottiglia?',
        a: 'È molto simile alle acque minerali oligominerali, "leggere", che trovi in commercio: regoliamo il residuo fisso per ottenere un risultato comparabile, senza microplastiche e senza il peso delle bottiglie.',
      },
      {
        q: 'È sicura da bere tutti i giorni?',
        a: 'Sì, è la stessa tecnologia usata da decenni in ambito domestico e industriale in tutto il mondo. Per dubbi legati a condizioni di salute specifiche, parla comunque con il tuo medico.',
      },
      {
        q: 'Perché allora alcuni dicono che "fa male"?',
        a: 'Quasi sempre per la riduzione dei minerali, scambiata per un rischio. Regolando il residuo fisso, come facciamo noi, questo timore non ha più ragione d\'essere.',
      },
    ],
  },
  {
    slug: 'osmosi-inversa-neonati',
    title: 'Osmosi inversa e neonati: l\'acqua è sicura per il latte in formula?',
    metaTitle: 'Osmosi Inversa per Neonati: è Sicura? | Acquadirete',
    metaDescription:
      'Osmosi inversa e neonati: l\'acqua è adatta per il latte in formula? Cosa sapere davvero, senza allarmismi, e perché su salute e dieta decide il pediatra.',
    excerpt:
      'L\'acqua a osmosi inversa va bene per il latte del neonato? Rispondiamo con onestà, separando i fatti generali dalle valutazioni che spettano al pediatra.',
    publishedAt: '2026-06-26',
    readingMinutes: 5,
    relatedServices: ['osmosi', 'carboni', 'depuratore'],
    relatedPosts: ['osmosi-inversa-fa-male', 'carboni-attivi-vs-osmosi-inversa'],
    sections: [
      {
        paragraphs: [
          'Quando in casa arriva un neonato, anche una domanda semplice come "che acqua uso per il latte in formula?" diventa improvvisamente importante. Ce lo chiedono spesso, e la nostra risposta è sempre la stessa: ti diciamo con precisione come funziona la nostra acqua, ma sulle scelte legate alla salute del tuo bambino l\'ultima parola è del pediatra, non nostra né di un articolo online.',
          'Detto questo, possiamo aiutarti a capire i fatti generali, così arrivi preparato quando ne parli con chi di dovere.',
        ],
      },
      {
        heading: 'Perché per un neonato l\'acqua "leggera" è spesso preferita',
        paragraphs: [
          'Per la preparazione del latte in formula, pediatri e indicazioni sanitarie tendono a consigliare un\'acqua a basso contenuto di minerali, in particolare con poco sodio e pochi nitrati. È il motivo per cui molte famiglie scelgono in commercio le acque oligominerali "leggere" proprio per i più piccoli.',
          'Il latte in formula è già bilanciato dal produttore con i nutrienti necessari: l\'acqua serve solo a ricostituirlo, e un\'acqua leggera evita di alterare quell\'equilibrio. Questo è un principio generale, non una prescrizione per il tuo caso specifico: quella resta una valutazione del pediatra.',
        ],
      },
      {
        heading: 'Dove si colloca l\'acqua a osmosi inversa',
        paragraphs: [
          'L\'osmosi inversa produce proprio un\'acqua a basso contenuto di sali minerali, paragonabile a una buona oligominerale leggera, lo stesso tipo di acqua spesso indicata per i più piccoli. Nei nostri impianti il residuo fisso è regolabile: non lasciamo l\'acqua completamente demineralizzata, ma equilibrata.',
          'Abbiamo affrontato più in generale il tema della sicurezza di quest\'acqua nell\'articolo "L\'osmosi inversa fa male?": se il dubbio di fondo è quello, ti consigliamo di leggerlo, perché molti timori nascono semplicemente dalla riduzione dei minerali, che è un fatto noto e gestito, non un rischio.',
        ],
      },
      {
        heading: 'Un punto che vale sempre: l\'igiene',
        paragraphs: [
          'Indipendentemente dal tipo di acqua, per i neonati l\'aspetto più delicato è quello igienico. Le indicazioni più diffuse per la preparazione del latte riguardano la pulizia, la corretta conservazione e, in molti casi, il trattamento termico dell\'acqua prima dell\'uso. Sono accorgimenti generali che valgono per qualsiasi acqua: di rubinetto, in bottiglia o filtrata.',
          'Anche qui le modalità precise per il tuo bambino te le indica il pediatra. Noi ci limitiamo a ricordarti che nessun depuratore sostituisce queste attenzioni di base.',
        ],
      },
      {
        heading: 'Cosa possiamo dirti noi (e cosa no)',
        paragraphs: [
          'Possiamo dirti con certezza come funziona il nostro impianto, che tipo di acqua produce e come regoliamo i minerali. Quello che non facciamo è darti consigli medici: se hai dubbi sull\'alimentazione del tuo bambino, su quantità, temperature o esigenze particolari, la persona giusta a cui chiedere è il pediatra che lo segue.',
          'Se vuoi, durante il sopralluogo gratuito analizziamo la tua acqua e ti spieghiamo esattamente cosa cambierebbe con un nostro impianto: avrai informazioni chiare e concrete da portare anche al pediatra, per decidere con tutti gli elementi in mano.',
        ],
      },
    ],
    faqs: [
      {
        q: 'L\'acqua a osmosi inversa va bene per il latte in formula?',
        a: 'È un\'acqua leggera, a basso contenuto di minerali, simile alle oligominerali spesso indicate per i più piccoli. Resta però una valutazione da confermare con il tuo pediatra, che conosce la situazione del tuo bambino.',
      },
      {
        q: 'Devo comunque bollire o trattare l\'acqua prima di usarla?',
        a: 'Per i neonati l\'igiene nella preparazione del latte è fondamentale, qualunque sia l\'acqua. Le modalità precise, incluso l\'eventuale trattamento termico, te le indica il pediatra: nessun depuratore le sostituisce.',
      },
      {
        q: 'Togliendo i minerali, all\'acqua manca qualcosa di importante per il neonato?',
        a: 'Il latte in formula è già bilanciato con i nutrienti necessari, e regoliamo comunque il residuo fisso per non lasciare l\'acqua del tutto demineralizzata. Per ogni dubbio nutrizionale, però, fai sempre riferimento al pediatra.',
      },
    ],
  },
  {
    "slug": "ogni-quanto-cambiare-filtri-depuratore",
    "title": "Ogni quanto cambiare i filtri del depuratore: guida onesta alla manutenzione",
    "metaTitle": "Ogni quanto cambiare i filtri depuratore | Acquadirete",
    "metaDescription": "Quando cambiare i filtri del tuo depuratore? Indicazioni generali, i segnali da non ignorare e come funziona una manutenzione fatta bene. Guida onesta.",
    "excerpt": "Filtri a carboni, membrane osmotiche e prefiltri: ti spieghiamo ogni quanto vanno cambiati, i segnali da non sottovalutare e cosa comprende una manutenzione seria.",
    "publishedAt": "2026-07-06",
    "readingMinutes": 5,
    "relatedServices": [
      "depuratore",
      "osmosi",
      "assistenza"
    ],
    "relatedPosts": [
      "carboni-attivi-vs-osmosi-inversa",
      "installatore-depuratore-scomparso-cosa-fare"
    ],
    "sections": [
      {
        "paragraphs": [
          "È la domanda che ci fanno più spesso: \"ogni quanto devo cambiare i filtri del depuratore?\". La risposta onesta è che dipende, ma non vogliamo lasciarti con una frase vaga. In questo articolo ti diamo indicazioni generali realistiche, ti spieghiamo quali segnali non vanno mai ignorati e cosa significa, concretamente, una manutenzione fatta bene. Senza allarmismi e senza spingerti a sostituire tutto ogni due mesi \"per sicurezza\"."
        ]
      },
      {
        "heading": "Perché i filtri vanno cambiati (e cosa succede se non lo fai)",
        "paragraphs": [
          "I filtri di un depuratore hanno il compito di trattenere ciò che non vuoi nel bicchiere: sedimenti, cloro, cattivi odori e, nel caso dell'osmosi inversa, gran parte delle sostanze disciolte. Con l'uso, però, si saturano. Un filtro esausto smette di lavorare come dovrebbe, e nei casi peggiori può diventare esso stesso un punto in cui i batteri proliferano.",
          "In altre parole, un depuratore non manutenuto rischia di peggiorare la qualità dell'acqua invece di migliorarla. Per questo la manutenzione non è un optional o un modo per farti spendere: è la parte che fa funzionare davvero l'impianto nel tempo."
        ]
      },
      {
        "heading": "Indicazioni generali sui tempi di sostituzione",
        "paragraphs": [
          "Ti diamo dei riferimenti di massima, validi in generale sul mercato e non numeri \"nostri\" spacciati per legge. I prefiltri a sedimenti e i filtri a carboni attivi vengono in genere sostituiti circa una volta l'anno, a volte ogni sei mesi se l'acqua in ingresso è particolarmente carica o il consumo è alto. La membrana a osmosi inversa dura molto più a lungo: spesso diversi anni, perché è protetta a monte dai filtri precedenti.",
          "Questi intervalli però cambiano in base a tre fattori: la qualità dell'acqua della tua zona (a Firenze, Prato e Pistoia la durezza e i valori non sono uguali ovunque), quante persone usano l'impianto e quanti litri consumate. Ecco perché in fase di sopralluogo ti diamo un piano di manutenzione tarato sul tuo caso, non una tabella copia-incolla."
        ]
      },
      {
        "heading": "I segnali da non ignorare",
        "paragraphs": [
          "Oltre alle scadenze, ci sono segnali pratici che il tuo depuratore ti manda. Un calo evidente del flusso d'acqua, un ritorno di sapore o odore di cloro, un gusto \"strano\" o un'acqua meno limpida sono campanelli d'allarme che vale la pena non rimandare."
        ]
      },
      {
        "heading": "Come funziona una manutenzione fatta bene",
        "paragraphs": [
          "Una manutenzione seria non è solo \"svito il vecchio filtro e avvito quello nuovo\". Un intervento fatto bene comprende la sostituzione dei filtri previsti, la sanificazione dell'impianto quando serve, il controllo delle guarnizioni e dei raccordi per escludere perdite e, dove possibile, una verifica dei valori dell'acqua in uscita per confermare che tutto stia lavorando come deve.",
          "Diffida di chi cambia solo la cartuccia più facile da raggiungere e ti saluta in cinque minuti. E diffida anche del contrario: chi ti dice che va sostituito tutto ogni pochi mesi senza motivo. La trasparenza è mostrarti cosa è stato fatto e perché, lasciandoti traccia degli interventi."
        ]
      },
      {
        "heading": "Il nostro approccio (e cosa possiamo fare per te)",
        "paragraphs": [
          "Con Acquadirete puoi avere un piano di manutenzione programmata, così non devi ricordarti tu le scadenze: ti contattiamo noi al momento giusto. Se invece hai comprato un impianto da qualcun altro che è \"sparito\", possiamo comunque valutare se prenderlo in carico, ovviamente dopo un controllo.",
          "Se non sei sicuro di ogni quanto cambiare i filtri del tuo depuratore, o sospetti che siano da un pezzo che nessuno li tocca, fissa un sopralluogo gratuito e senza impegno a Firenze, Prato o Pistoia. Diamo un'occhiata all'impianto, ti diciamo onestamente cosa serve e decidi con calma tu. Nessuna pressione."
        ]
      }
    ],
    "faqs": [
      {
        "q": "Ogni quanto vanno cambiati i filtri a carboni attivi?",
        "a": "In generale circa una volta l'anno, a volte ogni sei mesi con acqua molto carica o consumi elevati. L'intervallo esatto dipende dalla tua zona e dall'uso: te lo indichiamo col sopralluogo."
      },
      {
        "q": "La membrana dell'osmosi inversa quanto dura?",
        "a": "Molto più dei prefiltri: spesso diversi anni, perché è protetta dai filtri a monte. Proprio per questo è fondamentale non trascurare i filtri che la precedono, altrimenti si rovina prima."
      },
      {
        "q": "Cosa succede se non cambio mai i filtri?",
        "a": "Il depuratore perde efficacia e, nei casi peggiori, i filtri saturi possono diventare un punto in cui proliferano batteri. Un impianto non manutenuto rischia di peggiorare l'acqua invece di migliorarla."
      }
    ]
  },
];
