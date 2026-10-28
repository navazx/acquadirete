// Gli appuntamenti degli agenti, in un posto solo. Li leggono:
//  - la sveglia (netlify/functions/sveglia-agenti.mjs), che li fa partire;
//  - il controllo del Direttore (scripts/direttore-controllo.mjs), che guarda se
//    sono partiti davvero e se hanno lasciato la loro nota sulla bacheca.
//
// Orari in UTC, come nei cron di GitHub: d'estate in Italia sono due ore dopo,
// d'inverno una. Un agente nuovo va aggiunto QUI, se no nessuno lo fa partire e
// nessuno si accorge se manca.

// Workflow su GitHub: li avvia la sveglia.
//   inputs  quello che va passato all'avvio. ATTENZIONE a "prova": recensioni e
//           revisione Ads, avviati a mano, partono in prova (stampano e non
//           mandano). Va detto esplicitamente che e' un giro vero.
//   nota    l'agente che dopo ogni giro DEVE lasciare una nota sulla bacheca.
//           Chi scrive solo quando ha una novita' (recensioni) non lo ha.
export const AGENTI = [
  { nome: 'Recensioni', workflow: 'recensioni.yml', cron: '50 6 * * *', inputs: { prova: 'false' } },
  { nome: 'Cruscotto settimanale', workflow: 'cruscotto.yml', cron: '40 6 * * 1' },
  { nome: 'Cruscotto online (numeri del giorno)', workflow: 'cruscotto-oggi.yml', cron: '20 5 * * *', inputs: { prova: 'false' } },
  // Dal 16 ott 2026 (deciso da Matteo): i clienti nati da un annuncio tornano a Google Ads.
  { nome: 'Conversioni Ads (clienti a Google)', workflow: 'conversioni-ads.yml', cron: '55 6 * * 1', inputs: { prova: 'false' } },
  { nome: 'Controllo SEO del lunedì', workflow: 'agente-seo.yml', cron: '5 7 * * 1', nota: 'seo' },
  { nome: 'Bozza del post social', workflow: 'social-bozza.yml', cron: '30 7 * * 6' },
  { nome: 'Direttore (priorità del mese)', workflow: 'direttore.yml', cron: '0 6 1 * *', nota: 'direttore' },
  { nome: 'Report SEO del mese', workflow: 'seo-report.yml', cron: '10 7 1 * *' },
  // Dal 17 ott 2026: il controllo SEO approfondito, prima del Direttore (il 1°) e di Contenuti (il 5).
  { nome: 'Controllo SEO del mese', workflow: 'seo-mese.yml', cron: '30 7 27 * *', inputs: { prova: 'false' }, nota: 'seo' },
  { nome: 'Revisione Ads', workflow: 'agente-ads.yml', cron: '0 7 18 * *', inputs: { prova: 'false' }, nota: 'ads' },
  // La sentinella sorveglia il sito, quindi anche Netlify: il suo orario su GitHub
  // RESTA (se Netlify e' giu' parte lo stesso). Ma GitHub di cinque giri ne fa due
  // o tre, e allora la sveglia la fa partire anche lei. Rilanciarla non fa danni.
  { nome: 'Sentinella del sito', workflow: 'sentinella.yml', cron: '17 2,6,10,14,18 * * *' },
  { nome: 'Controllo degli agenti', workflow: 'direttore-controllo.yml', cron: '0 8 * * *', controllore: true },
];

// Routine su claude.ai: partono da sole, la sveglia non le tocca. Da GitHub non
// si vede se sono partite, quindi il controllo guarda le tracce che lasciano:
//   percorso  un file o una cartella del repo che il giro modifica
//   nota      la nota che lasciano sulla bacheca (la lasciano anche se si fermano)
//   proposta  il tipo di proposta che preparano (agenti/proposte.json)
export const ROUTINE = [
  { nome: 'Agente social (prepara il post)', cron: '0 7 * * 6', percorso: 'agenti/social-bozza.json', nota: 'social' },
  { nome: 'Agente contenuti (articolo del mese)', cron: '0 6 5 * *', nota: 'contenuti', proposta: 'ARTICOLO' },
  { nome: 'Agente scheda Google', cron: '22 10 15 * *', percorso: 'agenti/promemoria', nota: 'scheda' },
];
