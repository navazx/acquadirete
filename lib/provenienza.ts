// Da dove è arrivata la persona che compila il modulo, per scriverlo sul
// Gestionale accanto al contatto.
//
// Google Ads, col tagging automatico, aggiunge all'indirizzo di atterraggio un
// parametro (gclid, oppure gbraid/wbraid da iPhone) SOLO sui clic sugli
// annunci: è l'unico segnale affidabile per distinguerli dalle ricerche
// gratuite, che arrivano sulle stesse pagine.
//
// Niente cookie né localStorage, di proposito: il valore vive in memoria
// finché il sito resta aperto nella scheda. Le navigazioni interne di Next non
// ricaricano il JavaScript, quindi sopravvive anche se da / si passa a
// /contatti. Non scrivendo nulla sul dispositivo non serve il consenso cookie,
// e funziona anche con chi preme "Rifiuta" — cioè proprio i moduli che Google
// Ads non riesce a contare. Il rovescio: chi clicca l'annuncio, chiude e torna
// un altro giorno non viene riconosciuto.

const PARAMETRI_ANNUNCIO = ['gclid', 'gbraid', 'wbraid'];

function daAnnuncio(search: string): boolean {
  const p = new URLSearchParams(search);
  if (PARAMETRI_ANNUNCIO.some((k) => p.has(k))) return true;
  // Riserva nel caso il tagging automatico venisse spento e si usassero le UTM.
  return p.get('utm_source') === 'google' && ['cpc', 'ppc', 'paid'].includes(p.get('utm_medium') ?? '');
}

// Letto una volta sola, quando il sito si carica: è l'indirizzo con cui la
// persona è atterrata. Questo file lo importa ContactForm, che sta nella
// modale del layout, quindi viene eseguito al primo caricamento, prima di
// qualsiasi navigazione interna che toglierebbe il parametro dall'indirizzo.
const arrivatoDaAnnuncioGoogle =
  typeof window !== 'undefined' && daAnnuncio(window.location.search);

export function vieneDaAnnuncioGoogle(): boolean {
  return arrivatoDaAnnuncioGoogle;
}
