// ============================================================================
//  LE MODIFICHE CHE L'AGENTE ADS PUO' APPLICARE DA SOLO — e i loro limiti
//
//  Dal 13 ott 2026 (Matteo: "ma poi chi le applica le cose che dice?") l'agente
//  Ads non si limita a consigliare: le modifiche semplici le porta gia' pronte,
//  Matteo risponde APPROVA ADS su Telegram e partono. Sono TRE, e nessun'altra:
//
//    escludi          una ricerca da non pagare piu' (parola chiave esclusa),
//                     per tutta la campagna o per un gruppo
//    pausa-parola     una parola chiave che spreca, messa in pausa
//    pausa-annuncio   un annuncio messo in pausa
//
//  Budget, offerte, campagne, annunci nuovi e cancellazioni NON passano da qui:
//  non c'e' il codice per farlo (vedi PERMESSE in lib/ads.mjs).
//
//  Chi propone e' un modello di intelligenza artificiale che ha letto anche testo
//  scritto da sconosciuti (le ricerche fatte su Google). Per questo niente di
//  quello che scrive arriva a Google Ads cosi' com'e': ogni modifica passa da
//  controlla(), che la confronta con l'account vero e la scarta se:
//    - punta a qualcosa che nell'account non esiste;
//    - un'esclusione fermerebbe una nostra parola chiave attiva, o una ricerca
//      che nel mese ha portato una conversione, o piu' del 15% dei clic;
//    - riguarda prezzo, costo, gratis o preventivo (decisioni gia' prese:
//      agenti/ads/LEGGIMI.md);
//    - una pausa lascerebbe un gruppo senza parole o senza annunci, o toglie una
//      parola che ha convertito, o in tutto piu' del 20% dei clic;
//    - supera i tetti (LIMITI).
//  Lo stesso controllo si rifa' al momento di applicare, sull'account di quel
//  giorno: fra la proposta e l'APPROVA possono passare giorni.
//
//  La proposta in attesa sta nel repo (agenti/ads/proposte.json), che e' pubblico:
//  l'elenco delle modifiche e' cifrato, in chiaro restano solo data, stato e
//  quante sono. La chiave si ricava da quella del service account (GSC_KEY_JSON):
//  la legge solo chi potrebbe comunque applicarla.
// ============================================================================

import { hkdfSync, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { loadKey } from './gsc.mjs';

export const LIMITI = {
  esclusioni: 15,        // per proposta
  pauseParole: 3,
  pauseAnnunci: 1,
  quotaEsclusione: 0.15, // una sola esclusione non puo' fermare piu' di questa parte dei clic del mese
  quotaPause: 0.20,      // tutte le pause insieme
  giorniValida: 21,      // dopo, la proposta e' vecchia: i numeri sono cambiati
};

// Decisioni gia' prese con Matteo: queste ricerche non si escludono.
const INTOCCABILI = /^(prezz|cost|quanto$|gratis$|gratuit|preventiv)/;

export const parole = (testo) => String(testo ?? '').toLowerCase().split(/[^a-zà-ù0-9]+/i).filter(Boolean);
const eur = (n) => `€ ${Number(n || 0).toFixed(2).replace('.', ',')}`;
const eCampagna = (id) => /\/campaigns\/\d+$/.test(String(id));
const eGruppo = (id) => /\/adGroups\/\d+$/.test(String(id));

/** Un'esclusione ferma questa ricerca? (Le escluse non hanno varianti simili: contano le parole com'e' scritte.) */
export function ferma(esclusa, ricerca) {
  const e = parole(esclusa.testo).join(' ');
  const r = parole(ricerca).join(' ');
  if (!e) return false;
  return esclusa.corrispondenza === 'EXACT' ? r === e : ` ${r} `.includes(` ${e} `);
}

/**
 * Controlla le modifiche contro l'account.
 *   azioni   l'elenco proposto: { tipo, testo, corrispondenza, dove, id, perche }
 *   st       com'e' fatto l'account (struttura() di lib/ads.mjs)
 *   numeri   facoltativo, i dati del mese: { termini: [{ gruppoId, termine, clic,
 *            spesa, conversioni }], parole: [{ id, clic, spesa, conversioni,
 *            punteggioQualita }], annunci: [{ id, clic, spesa, conversioni,
 *            titoli }], clicTotali }
 * Torna { buone, scartate }. Le buone hanno i nomi letti dall'account (non quelli
 * scritti da chi propone) e, se ci sono i dati, i numeri del mese.
 */
export function controlla(azioni, st, numeri = {}) {
  const buone = [], scartate = [];
  const scarta = (azione, motivo) => scartate.push({ azione, motivo });
  const gruppo = (id) => st.gruppi.find((g) => g.id === id);
  const campagna = (id) => st.campagne.find((c) => c.id === id);
  const clicTotali = Number(numeri.clicTotali || 0);
  const fatte = { escludi: 0, 'pausa-parola': 0, 'pausa-annuncio': 0 };
  const inPausa = new Set();
  let clicInPausa = 0;

  for (const grezza of Array.isArray(azioni) ? azioni : []) {
    const a = grezza && typeof grezza === 'object' ? grezza : {};
    const perche = String(a.perche || '').replace(/\s+/g, ' ').trim().slice(0, 220);

    if (a.tipo === 'escludi') {
      const testo = parole(a.testo).join(' ');
      const corrispondenza = a.corrispondenza === 'EXACT' ? 'EXACT' : a.corrispondenza === 'PHRASE' ? 'PHRASE' : null;
      const c = eCampagna(a.dove) ? campagna(a.dove) : null;
      const g = eGruppo(a.dove) ? gruppo(a.dove) : null;
      if (!testo) { scarta(a, 'manca il testo da escludere'); continue; }
      if (!corrispondenza) { scarta(a, 'la corrispondenza può essere solo a frase (PHRASE) o esatta (EXACT)'); continue; }
      if (testo.length > 80 || parole(testo).length > 10) { scarta(a, 'testo troppo lungo per una parola esclusa'); continue; }
      if (!c && !g) { scarta(a, 'la campagna o il gruppo indicato non esiste nell\'account'); continue; }
      if ((c || g).stato !== 'ENABLED') { scarta(a, 'la campagna o il gruppo indicato è spento'); continue; }
      if (parole(testo).some((p) => INTOCCABILI.test(p))) { scarta(a, 'le ricerche su prezzo, costo, gratis e preventivo non si escludono: è già stato deciso'); continue; }
      if (fatte.escludi >= LIMITI.esclusioni) { scarta(a, `più di ${LIMITI.esclusioni} esclusioni in una volta: le altre al prossimo giro`); continue; }

      const nelPosto = (x) => (c ? x.campagna === c.id : x.gruppo === g.id);
      const esclusa = { testo, corrispondenza };
      const doppia = [...st.escluse, ...buone.filter((b) => b.tipo === 'escludi')]
        .some((e) => e.dove === a.dove && parole(e.testo).join(' ') === testo && e.corrispondenza === corrispondenza);
      if (doppia) { scarta(a, 'c\'è già'); continue; }
      const nostra = st.parole.find((p) => p.attiva && nelPosto(p) && ferma(esclusa, p.testo));
      if (nostra) { scarta(a, `fermerebbe una nostra parola chiave attiva («${nostra.testo}»)`); continue; }

      let dati;
      if (numeri.termini) {
        const gruppiDelPosto = new Set(c ? st.gruppi.filter((x) => x.campagna === c.id).map((x) => x.id) : [g.id]);
        const fermati = numeri.termini.filter((t) => gruppiDelPosto.has(t.gruppoId) && ferma(esclusa, t.termine));
        const somma = (k) => fermati.reduce((s, t) => s + Number(t[k] || 0), 0);
        dati = { ricerche: fermati.length, clic: somma('clic'), spesa: Math.round(somma('spesa') * 100) / 100 };
        if (somma('conversioni') > 0) { scarta(a, 'nel mese una ricerca che fermerebbe ha portato una conversione'); continue; }
        if (clicTotali && dati.clic / clicTotali > LIMITI.quotaEsclusione) {
          scarta(a, `fermerebbe più del ${Math.round(LIMITI.quotaEsclusione * 100)}% dei clic del mese: è una scelta da fare a mano, non da Telegram`);
          continue;
        }
      }
      fatte.escludi += 1;
      buone.push({ tipo: 'escludi', testo, corrispondenza, dove: a.dove, doveNome: (c || g).nome, inCampagna: Boolean(c), perche, numeri: dati });
      continue;
    }

    if (a.tipo === 'pausa-parola') {
      const p = st.parole.find((x) => x.id === a.id);
      if (!p) { scarta(a, 'questa parola chiave non esiste nell\'account'); continue; }
      if (!p.attiva) { scarta(a, 'è già spenta'); continue; }
      if (inPausa.has(p.id)) { scarta(a, 'c\'è già'); continue; }
      if (fatte['pausa-parola'] >= LIMITI.pauseParole) { scarta(a, `più di ${LIMITI.pauseParole} parole in pausa in una volta: le altre al prossimo giro`); continue; }
      const restano = st.parole.filter((x) => x.attiva && x.gruppo === p.gruppo && x.id !== p.id && !inPausa.has(x.id));
      if (!restano.length) { scarta(a, 'il gruppo resterebbe senza parole chiave: spegnere un gruppo è una scelta di Matteo'); continue; }
      const n = (numeri.parole || []).find((x) => x.id === p.id);
      if (n && Number(n.conversioni) > 0) { scarta(a, 'nel mese ha portato una conversione'); continue; }
      const clic = Number(n?.clic || 0);
      if (clicTotali && (clicInPausa + clic) / clicTotali > LIMITI.quotaPause) {
        scarta(a, `con questa le pause toglierebbero più del ${Math.round(LIMITI.quotaPause * 100)}% dei clic del mese: è una scelta da fare a mano`);
        continue;
      }
      clicInPausa += clic;
      inPausa.add(p.id);
      fatte['pausa-parola'] += 1;
      buone.push({
        tipo: 'pausa-parola', id: p.id, testo: p.testo, corrispondenza: p.corrispondenza, doveNome: gruppo(p.gruppo)?.nome || '', perche,
        numeri: n ? { clic, spesa: Number(n.spesa || 0), punteggio: n.punteggioQualita ?? null } : undefined,
      });
      continue;
    }

    if (a.tipo === 'pausa-annuncio') {
      const ad = st.annunci.find((x) => x.id === a.id);
      if (!ad) { scarta(a, 'questo annuncio non esiste nell\'account'); continue; }
      if (!ad.attivo) { scarta(a, 'è già spento'); continue; }
      if (inPausa.has(ad.id)) { scarta(a, 'c\'è già'); continue; }
      if (fatte['pausa-annuncio'] >= LIMITI.pauseAnnunci) { scarta(a, 'un solo annuncio in pausa per volta'); continue; }
      const restano = st.annunci.filter((x) => x.attivo && x.gruppo === ad.gruppo && x.id !== ad.id && !inPausa.has(x.id));
      if (!restano.length) { scarta(a, 'il gruppo resterebbe senza annunci: spegnere un gruppo è una scelta di Matteo'); continue; }
      const n = (numeri.annunci || []).find((x) => x.id === ad.id);
      if (n && Number(n.conversioni) > 0) { scarta(a, 'nel mese ha portato una conversione'); continue; }
      const clic = Number(n?.clic || 0);
      if (clicTotali && (clicInPausa + clic) / clicTotali > LIMITI.quotaPause) {
        scarta(a, `con questa le pause toglierebbero più del ${Math.round(LIMITI.quotaPause * 100)}% dei clic del mese: è una scelta da fare a mano`);
        continue;
      }
      clicInPausa += clic;
      inPausa.add(ad.id);
      fatte['pausa-annuncio'] += 1;
      buone.push({
        tipo: 'pausa-annuncio', id: ad.id, doveNome: gruppo(ad.gruppo)?.nome || '', perche,
        titolo: String(n?.titoli?.[0] || '').slice(0, 60) || undefined,
        numeri: n ? { clic, spesa: Number(n.spesa || 0) } : undefined,
      });
      continue;
    }

    scarta(a, 'non è una delle tre modifiche che posso applicare (escludi, pausa-parola, pausa-annuncio)');
  }
  return { buone, scartate };
}

const COME = { PHRASE: 'a frase', EXACT: 'esatta', BROAD: 'generica' };

const VERBI = {
  proposta: { escludi: 'Escludo le ricerche con', pausa: 'Metto in pausa' },
  fatta: { escludi: 'Escluse le ricerche con', pausa: 'In pausa' },
  annullata: { escludi: 'Tolta l\'esclusione di', pausa: 'Di nuovo in funzione' },
};

/** Una modifica detta in italiano, senza numeri: proposta, fatta, o annullata. */
export function riga(a, quando = 'proposta') {
  const v = VERBI[quando] || VERBI.proposta;
  if (a.tipo === 'escludi') {
    return `${v.escludi} «${a.testo}» (${COME[a.corrispondenza]}) ${a.inCampagna ? `in tutta la campagna «${a.doveNome}»` : `nel gruppo «${a.doveNome}»`}`;
  }
  if (a.tipo === 'pausa-parola') return `${v.pausa} la parola chiave «${a.testo}» (${COME[a.corrispondenza] || a.corrispondenza}) del gruppo «${a.doveNome}»`;
  return `${v.pausa} un annuncio del gruppo «${a.doveNome}»${a.titolo ? ` (quello che comincia con «${a.titolo}»)` : ''}`;
}

/** I numeri del mese di una modifica, per il messaggio a Matteo (solo su Telegram: dentro c'e' la spesa). */
export function numeriDi(a) {
  const n = a.numeri;
  if (!n) return '';
  if (a.tipo === 'escludi') {
    return n.ricerche ? `Nel mese: ${n.ricerche === 1 ? 'una ricerca fermata' : `${n.ricerche} ricerche fermate`}, ${n.clic} clic, ${eur(n.spesa)}` : 'Nel mese non avrebbe fermato niente: è una prevenzione';
  }
  return `Nel mese: ${n.clic} clic, ${eur(n.spesa)}, nessuna conversione${n.punteggio ? `, punteggio di qualità ${n.punteggio} su 10` : ''}`;
}

/** Le modifiche controllate, tradotte nelle operazioni per Google Ads. */
export function operazioni(buone) {
  return buone.map((a) => {
    if (a.tipo === 'escludi') {
      const keyword = { text: a.testo, matchType: a.corrispondenza };
      return a.inCampagna
        ? { campaignCriterionOperation: { create: { campaign: a.dove, negative: true, keyword } } }
        : { adGroupCriterionOperation: { create: { adGroup: a.dove, negative: true, keyword } } };
    }
    const spegni = { update: { resourceName: a.id, status: 'PAUSED' }, updateMask: 'status' };
    return a.tipo === 'pausa-parola' ? { adGroupCriterionOperation: spegni } : { adGroupAdOperation: spegni };
  });
}

/** Quello che serve per tornare indietro: una voce per modifica applicata. */
export function registro(buone, indirizzi) {
  return buone.map(({ numeri, perche, ...a }, i) => ({ ...a, risorsa: a.tipo === 'escludi' ? indirizzi[i] : a.id }));
}

/** Il contrario di una modifica applicata. Null se manca l'indirizzo. */
export function contrario(voce) {
  if (!voce.risorsa) return null;
  if (voce.tipo === 'escludi') {
    return /\/campaignCriteria\//.test(voce.risorsa)
      ? { campaignCriterionOperation: { remove: voce.risorsa } }
      : { adGroupCriterionOperation: { remove: voce.risorsa } };
  }
  const accendi = { update: { resourceName: voce.risorsa, status: 'ENABLED' }, updateMask: 'status' };
  return voce.tipo === 'pausa-parola' ? { adGroupCriterionOperation: accendi } : { adGroupAdOperation: accendi };
}

// ---------------------------------------------------------------------------
//  Cifrare: il repo e' pubblico, l'elenco delle modifiche no.
// ---------------------------------------------------------------------------

const chiave = () => Buffer.from(hkdfSync('sha256', loadKey().private_key, 'acquadirete', 'ads-proposte', 32));

export function cifra(oggetto) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chiave(), iv);
  const testo = Buffer.concat([c.update(JSON.stringify(oggetto), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), testo]).toString('base64');
}

export function decifra(cifrato) {
  const b = Buffer.from(String(cifrato), 'base64');
  const d = createDecipheriv('aes-256-gcm', chiave(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
}
