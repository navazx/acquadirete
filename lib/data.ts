import { ServiceInfo, ServicePageId } from './types';

// Le immagini sono servite come file statici da /public/assets.
const heroPrato = '/assets/hero-prato.webp';
const heroPistoia = '/assets/hero-pistoia.webp';
const heroDepuratore = '/assets/hero-depuratore.webp';
const heroOsmosi = '/assets/hero-osmosi.webp';
const heroCarboni = '/assets/hero-carboni.webp';
const heroFrizzante = '/assets/hero-frizzante.webp';
const heroBusiness = '/assets/hero-business.webp';
const heroAssistenza = '/assets/hero-assistenza.webp';

export const SERVICES_INFO: Record<ServicePageId, ServiceInfo> = {
  prato: {
    title: 'Depuratore acqua a Prato: acqua buona dal rubinetto, senza pensieri',
    subtitle: 'Impianti a osmosi inversa per Prato e provincia. Installiamo, manuteniamo e ti avvisiamo noi quando serve: tu non pensi a niente.',
    heroImage: heroPrato,
    problem: [
      'A Prato come ovunque, il mercato dei depuratori è pieno di venditori porta a porta e telefonate che promettono l\'acqua "gratis". Gratis non lo è mai: spesso sono contratti pluriennali nascosti, da migliaia di euro.',
      'Noi siamo l\'opposto di tutto questo. Veniamo a casa o nella tua attività, controlliamo la tua acqua, e ti consigliamo solo ciò che ti serve davvero — anche quando la cosa più onesta è dirti di non comprare nulla.'
    ],
    benefitsTitle: 'Perché sceglierci a Prato',
    benefits: [
      'Presenti su Prato e provincia dal 2005 — un punto di riferimento locale, non un numero verde.',
      'Centinaia di impianti installati tra Firenze, Prato e Pistoia.',
      'Assistenza rapida, in pochi giorni.',
      'Macchina sostitutiva in caso di guasto: la tua famiglia o la tua attività non resta mai senz\'acqua.',
      'Oltre 120 recensioni a 5 stelle su Google.'
    ],
    faqs: [
      {
        q: 'L\'acqua a osmosi è povera di minerali?',
        a: 'Regoliamo il contenuto di sali in base alle tue esigenze: ottieni un\'acqua leggera e sicura, paragonabile a una buona oligominerale, ma senza plastica e senza il peso delle bottiglie.'
      },
      {
        q: 'Consuma o spreca molta acqua?',
        a: 'Gli impianti attuali hanno uno scarto ridotto al minimo, lontano dai modelli di una volta.'
      },
      {
        q: 'E la manutenzione?',
        a: 'Ce ne occupiamo noi: ti ricordiamo noi quando è il momento di sostituire i filtri, così non ci devi pensare.'
      }
    ],
    ctaLabel: 'Richiedi un sopralluogo gratuito a Prato',
    localSeo: {
      heading: 'Depuratori d\'acqua a Prato e provincia',
      body: [
        'A Prato l\'acqua del rubinetto è generalmente piuttosto dura e ricca di calcare: un depuratore a osmosi inversa o un sistema a carboni attivi migliora sensibilmente il gusto e la qualità dell\'acqua che bevi e con cui cucini, senza dover più comprare e trasportare casse di bottiglie su per le scale.',
        'Seguiamo clienti privati e attività a Prato città e in tutta la provincia — Montemurlo, Vaiano, Vernio, Carmignano e Poggio a Caiano — con installazione, manutenzione programmata e macchina sostitutiva in caso di guasto. Siamo un punto di riferimento sul territorio fin dal 2005.'
      ]
    }
  },
  pistoia: {
    title: 'Depuratore acqua a Pistoia: acqua buona dal rubinetto, senza pensieri',
    subtitle: 'Impianti a osmosi inversa per Pistoia e provincia. Installiamo, manuteniamo e ti avvisiamo noi quando serve: tu non pensi a niente.',
    heroImage: heroPistoia,
    problem: [
      'Anche a Pistoia il mercato dei depuratori è pieno di venditori porta a porta e telefonate che promettono l\'acqua "gratis". Gratis non lo è mai: spesso sono contratti pluriennali nascosti, da migliaia di euro.',
      'Noi siamo l\'opposto di tutto questo. Veniamo a casa o nella tua attività, controlliamo la tua acqua, e ti consigliamo solo ciò che ti serve davvero — anche quando la cosa più onesta è dirti di non comprare nulla.'
    ],
    benefitsTitle: 'Perché sceglierci a Pistoia',
    benefits: [
      'Presenti su Pistoia e provincia dal 2005 — un punto di riferimento locale, non un numero verde.',
      'Centinaia di impianti installati tra Firenze, Prato e Pistoia.',
      'Assistenza rapida, in pochi giorni.',
      'Macchina sostitutiva in caso di guasto: la tua famiglia o la tua attività non resta mai senz\'acqua.',
      'Oltre 120 recensioni a 5 stelle su Google.'
    ],
    faqs: [
      {
        q: 'L\'acqua a osmosi è povera di minerali?',
        a: 'Regoliamo il contenuto di sali in base alle tue esigenze: ottieni un\'acqua leggera e sicura, paragonabile a una buona oligominerale, ma senza plastica e senza il peso delle bottiglie.'
      },
      {
        q: 'Consuma o spreca molta acqua?',
        a: 'Gli impianti attuali hanno uno scarto ridotto al minimo, lontano dai modelli di una volta.'
      },
      {
        q: 'E la manutenzione?',
        a: 'Ce ne occupiamo noi: ti ricordiamo noi quando è il momento di sostituire i filtri, così non ci devi pensare.'
      }
    ],
    ctaLabel: 'Richiedi un sopralluogo gratuito a Pistoia',
    localSeo: {
      heading: 'Depuratori d\'acqua a Pistoia e provincia',
      body: [
        'A Pistoia l\'acqua del rubinetto è generalmente piuttosto dura e ricca di calcare: un depuratore a osmosi inversa o un sistema a carboni attivi migliora sensibilmente il gusto e la qualità dell\'acqua che bevi e con cui cucini, senza dover più comprare e trasportare casse di bottiglie su per le scale.',
        'Seguiamo clienti privati e attività a Pistoia città e in tutta la provincia — Montecatini Terme, Monsummano Terme, Pescia e Quarrata — con installazione, manutenzione programmata e macchina sostitutiva in caso di guasto. Siamo un punto di riferimento sul territorio fin dal 2005.'
      ]
    }
  },
  depuratore: {
    title: 'Depuratore acqua a casa tua a Firenze',
    subtitle: 'Acqua buona, leggera e sicura direttamente dal rubinetto di casa. Installiamo e seguiamo l\'impianto noi, tu non pensi a niente.',
    heroImage: heroDepuratore,
    problem: [
      'Comprare un depuratore oggi è diventato un campo minato: telefonate insistenti, "depuratori gratis" che gratis non sono, contratti firmati in salotto con la pressione del venditore.',
      'Noi lavoriamo all\'opposto: veniamo a casa tua, valutiamo cosa ti serve davvero, e ti lasciamo il tempo di pensare: il nostro preventivo di spesa vale per 3 mesi.'
    ],
    benefitsTitle: 'Perché sceglierci',
    benefits: [
      'Dal 2005 sul territorio — una persona che risponde e che conosci, non un call center.',
      'Centinaia di impianti installati a Firenze e provincia.',
      'Acqua leggera e sicura, con il contenuto di minerali regolato in base alle tue esigenze.',
      'Macchina sostitutiva in caso di guasto: non resti mai senz\'acqua.',
      'Oltre 120 recensioni a 5 stelle su Google da clienti veri.'
    ],
    faqs: [
      {
        q: 'L\'acqua a osmosi è troppo povera di minerali?',
        a: 'I nostri impianti regolano il contenuto di sali minerali in base alle tue esigenze. Non è acqua "morta": è acqua leggera e sicura, come una buona oligominerale, ma senza microplastiche e senza bottiglie da portare a casa.'
      },
      {
        q: 'Spreca acqua?',
        a: 'Gli impianti di oggi non sono quelli di vent\'anni fa: lo scarto è ridotto al minimo.'
      },
      {
        q: 'E se si rompe?',
        a: 'Interveniamo in pochi giorni e, se serve, ti lasciamo una macchina sostitutiva. Zero pensieri.'
      }
    ],
    ctaLabel: 'Richiedi un sopralluogo gratuito',
    localSeo: {
      heading: 'Installazione depuratori d\'acqua a Firenze',
      body: [
        'A Firenze l\'acqua del rubinetto è potabile e controllata, ma in molte zone della città e della provincia ha un marcato sapore di cloro e un buon contenuto di calcare. Un depuratore a osmosi inversa installato sotto il lavello restituisce un\'acqua leggera, senza odori e sempre disponibile, direttamente al tuo rubinetto di casa.',
        'Operiamo in tutta Firenze e nei comuni limitrofi — Scandicci, Sesto Fiorentino, Bagno a Ripoli, Campi Bisenzio, Lastra a Signa, Montespertoli e l\'Empolese — con sopralluogo gratuito a domicilio e assistenza locale: una persona che conosci, non un call center.'
      ]
    }
  },
  osmosi: {
    title: 'Osmosi inversa a Firenze: come funziona e perché conviene',
    subtitle: 'Tutto quello che serve sapere prima di scegliere un depuratore a osmosi inversa — spiegato chiaro, da chi lo installa da oltre 20 anni.',
    heroImage: heroOsmosi,
    problem: [
      'L\'osmosi inversa è un sistema che spinge l\'acqua del rubinetto attraverso una membrana con fori piccolissimi. Questa membrana lascia passare l\'acqua, ma trattiene quello che non vuoi bere: cloro, metalli pesanti, pesticidi, batteri, microplastiche.',
      'Il risultato è acqua leggera, pulita e sicura, direttamente dal tuo rubinetto. Niente bottiglie da comprare, trasportare e smaltire.'
    ],
    benefitsTitle: 'I vantaggi concreti',
    benefits: [
      'Acqua buona sempre disponibile, senza più casse d\'acqua da portare a casa.',
      'Risparmio nel tempo: l\'impianto si ripaga rispetto a una vita di bottiglie.',
      'Meno plastica, per te e per l\'ambiente.',
      'Ottima per cucinare: pasta, tè e caffè hanno un sapore più pulito.'
    ],
    faqs: [
      {
        q: 'Ma l\'osmosi non toglie anche i sali minerali buoni?',
        a: 'In parte sì, ed è un dubbio legittimo. Per questo i nostri impianti hanno una regolazione che mantiene il giusto contenuto di minerali: l\'acqua che esce è leggera ma equilibrata, non "demineralizzata". E va detto: la maggior parte dei minerali di cui il corpo ha bisogno arriva dal cibo, non dall\'acqua.'
      },
      {
        q: 'Non spreca tantissima acqua?',
        a: 'I vecchi impianti sì. Quelli di nuova generazione che installiamo riducono lo scarto al minimo.'
      },
      {
        q: 'L\'acqua avrà un sapore strano?',
        a: 'Al contrario: togliendo il cloro, la maggior parte delle persone trova l\'acqua più buona di quella in bottiglia.'
      }
    ],
    ctaLabel: 'Richiedi un sopralluogo gratuito',
    localSeo: {
      heading: 'Impianti a osmosi inversa a Firenze e provincia',
      body: [
        'Installiamo impianti a osmosi inversa a Firenze e in tutta la provincia, scegliendo insieme a te il modello più adatto alla durezza della tua acqua e ai consumi della tua famiglia. La membrana di nuova generazione riduce al minimo lo scarto e la regolazione del residuo fisso ti dà un\'acqua leggera ma equilibrata.',
        'Dopo un sopralluogo gratuito a casa tua, a Firenze o nei comuni vicini, ti diciamo onestamente se l\'osmosi è la soluzione giusta per te o se è sufficiente una microfiltrazione a carboni attivi.'
      ]
    }
  },
  carboni: {
    title: 'Depuratori a carboni attivi a Firenze, Prato e Pistoia',
    subtitle: 'La microfiltrazione che migliora gusto e sicurezza dell\'acqua mantenendo i suoi minerali. Una soluzione semplice, senza scarto d\'acqua, installata e seguita da noi.',
    heroImage: heroCarboni,
    problem: [
      'Non sempre serve l\'osmosi inversa. Se la tua acqua è già buona e vuoi soprattutto togliere il sapore di cloro, gli odori e le impurità, la microfiltrazione a carboni attivi è spesso la scelta giusta: l\'acqua passa attraverso un filtro a carboni che trattiene cloro, sedimenti e sostanze che ne rovinano il gusto.',
      'A differenza dell\'osmosi, i carboni attivi mantengono i sali minerali naturali dell\'acqua: ottieni un\'acqua più buona e sicura, ma con lo stesso contenuto di minerali del tuo rubinetto. Veniamo a casa o nella tua attività, valutiamo la tua acqua e ti diciamo onestamente qual è la tecnologia giusta per te.'
    ],
    benefitsTitle: 'I vantaggi dei carboni attivi',
    benefits: [
      'Mantiene i minerali naturali dell\'acqua: nessuna demineralizzazione.',
      'Elimina cloro, odori e cattivi sapori: l\'acqua del rubinetto torna buona da bere.',
      'Nessuno scarto d\'acqua e impianto più semplice rispetto all\'osmosi.',
      'Costi contenuti e ingombro ridotto sotto il lavello.',
      'Installazione e manutenzione seguite da noi: ti avvisiamo quando cambiare i filtri.'
    ],
    faqs: [
      {
        q: 'Qual è la differenza tra carboni attivi e osmosi inversa?',
        a: 'I carboni attivi filtrano l\'acqua trattenendo cloro, odori e impurità, ma mantengono i sali minerali. L\'osmosi inversa, invece, spinge l\'acqua attraverso una membrana finissima e rimuove anche gran parte dei minerali, dandoti un\'acqua più leggera. Se la tua acqua è già buona, spesso bastano i carboni attivi; se la cerchi molto leggera o la tua acqua è particolarmente dura, può convenire l\'osmosi.'
      },
      {
        q: 'L\'acqua resta sicura da bere?',
        a: 'Sì. La microfiltrazione a carboni attivi rimuove cloro, sedimenti e molte sostanze che peggiorano gusto e qualità, restituendo un\'acqua più buona e sicura direttamente dal rubinetto.'
      },
      {
        q: 'Ogni quanto si cambiano i filtri?',
        a: 'Dipende dal consumo e dalla durezza dell\'acqua. Ce ne occupiamo noi: ti avvisiamo quando è il momento di sostituire i filtri, così non ci devi pensare.'
      }
    ],
    note: {
      title: 'Non sai quale scegliere?',
      body: 'Carboni attivi o osmosi inversa? Dipende dalla tua acqua e da cosa cerchi. Facciamo un sopralluogo gratuito, valutiamo la tua acqua e ti consigliamo la soluzione giusta — anche se è la più semplice.'
    },
    ctaLabel: 'Richiedi un sopralluogo gratuito',
    localSeo: {
      heading: 'Microfiltrazione a carboni attivi a Firenze, Prato e Pistoia',
      body: [
        'A Firenze, Prato e Pistoia la microfiltrazione a carboni attivi è spesso la scelta giusta quando l\'acqua è già buona ma sa di cloro: migliora gusto e qualità mantenendo intatti i sali minerali, senza scarto d\'acqua e con un impianto compatto sotto il lavello.',
        'Valutiamo la tua acqua con un sopralluogo gratuito a casa o nella tua attività, in città o in provincia, e ti consigliamo se bastano i carboni attivi o se conviene passare all\'osmosi inversa.'
      ]
    }
  },
  frizzante: {
    title: 'Acqua frizzante e refrigerata a Firenze, Prato e Pistoia',
    subtitle: 'Acqua liscia, fredda e gassata sempre pronta dal tuo rubinetto o dall\'erogatore. A casa o nella tua attività, senza più bottiglie da comprare e trasportare.',
    heroImage: heroFrizzante,
    problem: [
      'L\'acqua frizzante fresca in casa di solito significa casse di bottiglie da comprare, trasportare e smaltire. Con un sistema collegato alla rete hai acqua liscia, refrigerata e frizzante a volontà, erogata al momento, senza ingombro e senza peso.',
      'Aggiungiamo la funzione fredda e gassata sia agli impianti domestici (osmosi o carboni attivi) sia agli erogatori per uffici, bar e ristoranti. Veniamo da te, valutiamo spazio e consumi e ti proponiamo la soluzione giusta.'
    ],
    benefitsTitle: 'Perché sceglierla',
    benefits: [
      'Acqua liscia, fredda e frizzante sempre disponibile, alla temperatura che preferisci.',
      'Stop alle casse d\'acqua: niente più bottiglie da comprare, portare a casa e smaltire.',
      'Soluzioni per la casa (sottolavello) e per le attività (erogatori a colonna o sottobanco).',
      'Acqua gassata al momento: bollicine sempre fresche, regolabili secondo il tuo gusto.',
      'Installazione e manutenzione seguite da noi, con sanificazione periodica e cambio bombola CO₂.'
    ],
    faqs: [
      {
        q: 'Posso avere l\'acqua frizzante anche a casa?',
        a: 'Sì. Installiamo sistemi sottolavello che, oltre a depurare l\'acqua, la erogano liscia, refrigerata o frizzante da un rubinetto dedicato. Niente più casse da portare su per le scale.'
      },
      {
        q: 'Come si fa l\'acqua gassata?',
        a: 'Il sistema aggiunge anidride carbonica alimentare all\'acqua al momento dell\'erogazione, tramite una bombola che sostituiamo noi quando serve. Le bollicine sono sempre fresche e regolabili secondo il tuo gusto.'
      },
      {
        q: 'Va bene anche per bar e ristoranti?',
        a: 'Assolutamente. Per le attività usiamo erogatori a colonna o sottobanco ad alta capacità, per servire acqua liscia o frizzante al tavolo in caraffa o bottiglia, abbattendo i costi e il via vai di casse.'
      }
    ],
    note: {
      title: 'A casa e in azienda',
      body: 'La funzione fredda e frizzante si abbina sia agli impianti domestici sia agli erogatori per uffici e ristoranti: ti consigliamo la versione più adatta al tuo spazio e ai tuoi consumi.'
    },
    ctaLabel: 'Richiedi un sopralluogo gratuito',
    localSeo: {
      heading: 'Acqua frizzante dal rubinetto a Firenze, Prato e Pistoia',
      body: [
        'Installiamo a Firenze, Prato e Pistoia sistemi che erogano acqua liscia, refrigerata e frizzante direttamente dalla rete, sia per la casa (modelli sottolavello) sia per bar, ristoranti, hotel e uffici (erogatori a colonna o sottobanco).',
        'Niente più casse da comprare e trasportare: acqua sempre fresca, al gusto e alla temperatura che preferisci, con sanificazione periodica e cambio bombola CO₂ gestiti direttamente da noi.'
      ]
    }
  },
  business: {
    title: 'Erogatori d\'acqua per uffici e ristoranti a Firenze, Prato e Pistoia',
    subtitle: 'Acqua buona, microfiltrata, liscia o frizzante, direttamente dalla tua rete. Niente più ordini, casse da stoccare e bottiglie da smaltire. Dal 2005 al servizio di aziende e locali del territorio.',
    heroImage: heroBusiness,
    problem: [
      'Per un\'attività l\'acqua in bottiglia non è solo una spesa: è una rogna logistica. Ordini da gestire, casse che occupano magazzino, vuoti da smaltire, dipendenti o personale di sala che perdono tempo a spostarle.',
      'Un impianto collegato alla rete elimina tutto questo: acqua illimitata, sempre disponibile, a un costo per litro che non ha paragoni con la bottiglia.',
      'Per uffici e aziende: acqua fresca sempre disponibile per dipendenti e clienti, senza boccioni da sostituire né casse da ordinare. Per ristoranti, bar e hotel: acqua microfiltrata liscia o frizzante da servire al tavolo, in caraffa o in bottiglia personalizzata, liberando il magazzino dal via vai di casse e vuoti.'
    ],
    benefitsTitle: 'Perché affidarsi a noi',
    benefits: [
      'Dal 2005 sul territorio, con centinaia di impianti tra Firenze, Prato e Pistoia.',
      'Assistenza rapida e macchina sostitutiva in caso di guasto: il tuo servizio non si ferma mai.',
      'Manutenzione gestita da noi: ti avvisiamo noi quando intervenire.',
      'Fornitore serio e tracciabile, non un venditore porta a porta: preventivo chiaro e fattura.',
      'Oltre 120 recensioni a 5 stelle su Google.'
    ],
    ctaLabel: 'Richiedi un preventivo gratuito',
    localSeo: {
      heading: 'Erogatori d\'acqua per attività a Firenze, Prato e Pistoia',
      body: [
        'Forniamo erogatori e depuratori d\'acqua a uffici, studi professionali, bar, ristoranti e hotel di Firenze, Prato e Pistoia. Acqua microfiltrata liscia o frizzante collegata alla rete, da servire al personale, ai clienti o al tavolo, senza più boccioni e casse da gestire.',
        'Assistenza rapida, manutenzione programmata e macchina sostitutiva in caso di guasto fanno sì che il tuo servizio non si fermi mai. Siamo un fornitore serio e tracciabile del territorio fin dal 2005.'
      ]
    }
  },
  assistenza: {
    title: 'Manutenzione e assistenza depuratori a Firenze, Prato e Pistoia',
    subtitle: 'Hai un depuratore e non sai più a chi affidarti? Lo seguiamo noi. Sostituzione filtri, sanificazione, riparazioni e controlli — con la garanzia di una persona che c\'è, oggi e tra cinque anni.',
    heroImage: heroAssistenza,
    problem: [
      'Capita spesso: hai comprato un depuratore anni fa, magari da un venditore che ti aveva promesso mari e monti, e adesso quell\'azienda non risponde più, ha chiuso, o ti chiede cifre assurde per cambiare un filtro.',
      'L\'impianto è buono, ma senza manutenzione regolare smette di funzionare bene — e l\'acqua non è più sicura come dovrebbe. Noi ci siamo per questo. E non spariamo.'
    ],
    benefitsTitle: 'Di cosa ci occupiamo',
    benefits: [
      'Sostituzione filtri e membrane nei tempi giusti, per acqua sempre sicura.',
      'Sanificazione periodica dell\'impianto.',
      'Riparazioni e ricambi in caso di guasto o perdita.',
      'Controllo della qualità dell\'acqua prodotta.',
      'Promemoria automatici: ti avvisiamo noi quando è il momento di intervenire.'
    ],
    note: {
      title: 'Hai un impianto installato da altri?',
      body: 'Seguiamo la manutenzione di depuratori a osmosi inversa di diverse marche. Dicci qual è il tuo e ti diciamo subito se possiamo prenderlo in carico. Se il tuo installatore non c\'è più, c\'è sempre una strada.'
    },
    ctaLabel: 'Richiedi assistenza',
    localSeo: {
      heading: 'Assistenza depuratori a Firenze, Prato e Pistoia, anche multimarca',
      body: [
        'Offriamo assistenza, sanificazione e sostituzione filtri per depuratori a osmosi inversa a Firenze, Prato e Pistoia, anche per impianti installati da altre aziende. Interveniamo in pochi giorni e, se serve, lasciamo una macchina sostitutiva.',
        'Se la ditta che ti ha venduto l\'impianto non c\'è più o ti chiede cifre assurde per un cambio filtri, possiamo prendere in carico la manutenzione del tuo depuratore e seguirlo nel tempo, con promemoria automatici quando è il momento di intervenire.'
      ]
    }
  }
};
