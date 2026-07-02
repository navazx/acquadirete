// Genera un nuovo articolo del blog Acquadirete via API Claude e lo inserisce
// in lib/blogPosts.ts. Eseguito dal workflow GitHub Actions "blog-scrivi-bozza".
//
// Variabili d'ambiente richieste:
//   ANTHROPIC_API_KEY  — chiave API Claude (repository secret)
//   OUT_MD             — (opz.) percorso dove scrivere la bozza .md per Telegram
//
// Exit code: 0 = articolo generato; 3 = coda argomenti esaurita; 1 = errore.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('ANTHROPIC_API_KEY mancante');
  process.exit(1);
}

const BLOG_FILE = 'lib/blogPosts.ts';
const OUT_MD = process.env.OUT_MD || '/tmp/bozza.md';
const MODEL = 'claude-opus-4-8';

// Coda argomenti: [slug, angolo/descrizione]. Lo script sceglie il primo slug
// non ancora presente in lib/blogPosts.ts.
const QUEUE = [
  ['ogni-quanto-cambiare-filtri-depuratore', 'Ogni quanto cambiare i filtri del depuratore: indicazioni generali, i segnali da non ignorare, come funziona una manutenzione fatta bene'],
  ['erogatore-frizzante-ufficio-costi', 'Erogatore di acqua frizzante in ufficio: quanto costa e quanto si risparmia rispetto alle casse di bottiglie'],
  ['acqua-frizzante-bar-ristoranti', 'Acqua frizzante per bar e ristoranti: dire addio alle casse, vantaggi pratici ed economici'],
  ['domande-prima-contratto-depuratore', 'Le domande da fare prima di firmare un contratto per un depuratore'],
  ['acqua-sa-di-cloro', "Acqua che sa di cloro: perche' succede e come si risolve"],
  ['quanto-si-risparmia-senza-bottiglie', "Quanto si risparmia davvero rinunciando alle bottiglie d'acqua"],
];

const src = readFileSync(BLOG_FILE, 'utf8');
const existing = [...src.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]);
const next = QUEUE.find(([slug]) => !existing.includes(slug));
if (!next) {
  console.log('CODA_FINITA');
  process.exit(3);
}
const [slug, hint] = next;
console.log('Genero articolo:', slug);

const oggi = new Date().toISOString().slice(0, 10);

const prompt = `Sei un copywriter per il sito del blog di "Acquadirete", azienda di depuratori e osmosi inversa per acqua a Firenze, Prato e Pistoia.

Scrivi UN nuovo articolo del blog sul tema: "${hint}" (slug fisso: ${slug}).

Rispondi SOLO con un oggetto JSON valido (nessun testo prima o dopo, niente blocchi markdown), con ESATTAMENTE questa forma:
{
  "slug": "${slug}",
  "title": "titolo H1 dell'articolo",
  "metaTitle": "titolo SEO di MASSIMO 60 caratteri, che finisce con | Acquadirete",
  "metaDescription": "descrizione SEO di MASSIMO 160 caratteri",
  "excerpt": "riassunto di 1-2 frasi per la card dell'indice",
  "publishedAt": "${oggi}",
  "readingMinutes": 5,
  "relatedServices": ["2-3 valori tra: prato, pistoia, depuratore, osmosi, carboni, frizzante, business, assistenza"],
  "relatedPosts": ["1-2 slug tra quelli gia' esistenti e pertinenti: ${existing.join(', ')}"],
  "sections": [
    { "paragraphs": ["paragrafo introduttivo, SENZA campo heading"] },
    { "heading": "Titolo sezione", "paragraphs": ["paragrafo", "paragrafo"] }
  ],
  "faqs": [ { "q": "domanda", "a": "risposta" }, { "q": "domanda", "a": "risposta" } ]
}

REGOLE DI STILE (obbligatorie):
- Prima persona plurale ("noi", "ti"): tono diretto, onesto, anti-vendita-aggressiva.
- 4-6 sezioni con heading (oltre alla prima introduzione senza heading) e 2-3 faqs.
- NIENTE numeri inventati spacciati per dati reali di Acquadirete (prezzi, tempi, percentuali): resta generico e onesto ("in generale sul mercato...", "te lo diciamo gratis col sopralluogo").
- Temi di salute: rimanda sempre al medico o pediatra; solo fatti generali verificabili.
- RISPETTA i limiti: metaTitle <= 60 caratteri, metaDescription <= 160 caratteri.
- Chiudi l'ultima sezione con un invito al sopralluogo gratuito e senza impegno, senza pressione.`;

const res = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-api-key': API_KEY,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  }),
});

if (!res.ok) {
  console.error('Errore API Claude:', res.status, await res.text());
  process.exit(1);
}

const data = await res.json();
if (data.stop_reason === 'refusal') {
  console.error('Richiesta rifiutata dai filtri di sicurezza.');
  process.exit(1);
}

const textBlock = (data.content || []).find((b) => b.type === 'text');
let text = (textBlock ? textBlock.text : '').trim();
text = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

let article;
try {
  article = JSON.parse(text);
} catch (e) {
  console.error('JSON non valido dalla risposta:', e.message);
  console.error(text.slice(0, 600));
  process.exit(1);
}

article.slug = slug; // blinda lo slug della coda
if ((article.metaTitle || '').length > 60) console.warn('Attenzione: metaTitle >60 char');
if ((article.metaDescription || '').length > 160) console.warn('Attenzione: metaDescription >160 char');

// Inserisci l'oggetto prima della chiusura "];" dell'array BLOG_POSTS.
const idx = src.lastIndexOf('];');
if (idx === -1) {
  console.error('Non trovo la chiusura dell array BLOG_POSTS in ' + BLOG_FILE);
  process.exit(1);
}
const objTs = JSON.stringify(article, null, 2).replace(/\n/g, '\n  ');
const newSrc = src.slice(0, idx) + '  ' + objTs + ',\n' + src.slice(idx);
writeFileSync(BLOG_FILE, newSrc);
console.log('Articolo inserito in', BLOG_FILE);

// Versione leggibile .md per Telegram.
let md = `# ${article.title}\n\n_Slug: /blog/${slug} — pubblicazione: ${article.publishedAt}_\n\n`;
md += `**metaTitle:** ${article.metaTitle}\n**metaDescription:** ${article.metaDescription}\n\n---\n\n`;
for (const s of article.sections || []) {
  if (s.heading) md += `## ${s.heading}\n\n`;
  for (const p of s.paragraphs || []) md += `${p}\n\n`;
}
if (article.faqs && article.faqs.length) {
  md += `---\n\n## Domande frequenti\n\n`;
  for (const f of article.faqs) md += `**${f.q}**\n${f.a}\n\n`;
}
writeFileSync(OUT_MD, md);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `title=${article.title}\nslug=${slug}\n`);
}
console.log('TITOLO:', article.title);
