// Il cruscotto dell'app Gestione (dal 3 nov 2026, Matteo: «cancelliamo il
// cruscotto Acquadirete e spostiamolo completamente sull'app»). Era una pagina a
// parte su claude.ai; qui c'è lo stesso: i numeri del giorno, la ragnatela degli
// agenti, le automazioni e la bacheca.
//
// Questo file è pubblico come tutto /gestione/: i numeri NON stanno qui. Arrivano
// da /api/gestione?cruscotto=1, solo a chi ha il permesso «cruscotto» (app.js li
// passa a aggiorna()). Il testo della pagina non deve contenere cifre in euro,
// nomi di clienti o il tetto del costo per cliente, che arriva coi numeri.
// Si carica solo quando serve (app.js, schermoCruscotto).
(function () {
  const HTML = String.raw`<div class="crusc">
  <p class="snapshot" id="snapshot">Numeri <strong>in caricamento</strong></p>
  <div id="p-numeri" >
  <p class="note" id="numeri-avviso" hidden style="margin:0 0 14px"></p>
  <div class="kpis">
    <div class="kpi">
      <div class="label">Lead totali</div>
      <div class="num" id="k-lead">…</div>
      <div class="sub" id="k-lead-sub">&nbsp;</div>
    </div>
    <div class="kpi">
      <div class="label">Diventati clienti</div>
      <div class="num" id="k-clienti">…</div>
      <div class="sub" id="k-clienti-sub">&nbsp;</div>
    </div>
    <div class="kpi">
      <div class="label">Clic da Google · 28 gg</div>
      <div class="num" id="k-clic">…</div>
      <div class="sub" id="k-clic-sub">&nbsp;</div>
    </div>
    <div class="kpi">
      <div class="label">Impressioni · 28 gg</div>
      <div class="num" id="k-impr">…</div>
      <div class="sub" id="k-impr-sub">&nbsp;</div>
    </div>
  </div>

  <div class="grid">

    <!-- IL PUNTO DI OGGI -->
    <section class="card wide">
      <div class="hd">
        <div>
          <h2 id="punto-titolo">Il punto di oggi</h2>
          <p class="sub">Contatti, clienti, spesa e Google, ricalcolati ogni mattina dai dati veri</p>
        </div>
        <span class="pill mute" id="punto-pill"><span class="dot"></span>in caricamento</span>
      </div>
      <ul class="fact" id="punto"><li><span class="k">Numeri</span><span class="v">Arrivano dal giro di ogni mattina.</span></li></ul>
      <p class="note" id="prossime" hidden></p>
    </section>

    <!-- LEAD -->
    <section class="card wide">
      <div class="hd">
        <div>
          <h2>Lead in arrivo</h2>
          <p class="sub" id="lead-sub">Un blocco per lead, settimana per settimana</p>
        </div>
        <div class="legend" role="list">
          <span class="key" role="listitem"><span class="sw" style="background:var(--s-meta)"></span>Meta / Facebook</span>
          <span class="key" role="listitem"><span class="sw" style="background:var(--s-site)"></span>Sito web</span>
          <span class="key" role="listitem"><span class="sw" style="background:var(--s-ads)"></span>Annuncio Google (WhatsApp/telefono)</span>
          <span class="key" role="listitem"><span class="sw" style="background:var(--s-tel)"></span>Passaparola</span>
        </div>
      </div>
      <div class="chart-box">
        <svg id="leadChart" width="100%" height="172" role="img" aria-label="Lead per settimana dal 29 giugno, divisi per provenienza"></svg>
        <div id="tooltip"></div>
      </div>
      <p class="sub" id="lead-testo" style="margin:8px 0 0"></p>

      <p class="sub" style="margin:10px 0 0">Nomi, telefoni ed email stanno solo sul <a class="plain" href="https://docs.google.com/spreadsheets/d/1jmR0DXP_25ZTniBgemRj0hEmXxcrCdxj89y4DxciHBk" target="_blank" rel="noopener">Gestionale_Clienti</a>, che è la fonte ufficiale: una correzione fatta lì compare qui la mattina dopo.</p>
    </section>


    <!-- CONVERSIONE PER FONTE -->
    <section class="card wide">
      <div class="hd">
        <h2>Google vs Meta</h2>
        <span class="pill mute" id="fonti-pill">…</span>
      </div>
      <p class="sub">Il confronto che conta è sul costo per <em>cliente</em>, non per lead</p>
      <div class="grid" style="gap:14px">
        <div>
          <div class="tbl-scroll">
            <table aria-label="Conversione per provenienza">
              <thead><tr><th>Provenienza</th><th class="n">Lead</th><th class="n">Clienti</th><th class="n">Conversione</th></tr></thead>
              <tbody id="fonti"></tbody>
            </table>
          </div>
        </div>
        <div>
          <p class="sub" id="fonti-testo" style="margin:0"></p>
          <p class="sub" style="margin:8px 0 0">Con numeri così piccoli basta un cliente in più o in meno per spostare la percentuale di parecchio: sotto i 5 contatti la conversione non si scrive.</p>
        </div>
      </div>

      <div class="label" style="margin-top:18px" id="costi-titolo">Quanto costa un cliente</div>
      <div class="costi">
        <div class="kpi">
          <div class="label"><span class="sw" style="display:inline-block;background:var(--s-meta);margin-right:6px;vertical-align:-1px"></span>Meta / Facebook</div>
          <div class="num" id="c-meta">…</div>
          <div class="sub" id="c-meta-sub">&nbsp;</div>
        </div>
        <div class="kpi">
          <div class="label"><span class="sw" style="display:inline-block;background:var(--s-site);margin-right:6px;vertical-align:-1px"></span>Google Ads</div>
          <div class="num" id="c-google">…</div>
          <div class="sub" id="c-google-sub">&nbsp;</div>
        </div>
        <div class="kpi">
          <div class="label"><span class="sw" style="display:inline-block;background:var(--s-site);margin-right:6px;vertical-align:-1px"></span>Google Ads, per conversione</div>
          <div class="num" id="c-conv">…</div>
          <div class="sub" id="c-conv-sub">&nbsp;</div>
        </div>
      </div>
      <p class="sub" style="margin:12px 0 0"><strong>Google Ads si conta solo sui clienti arrivati davvero da un annuncio</strong>, non su quelli gratis dalla ricerca normale: quelli che il modulo segna come arrivati da un annuncio e quelli con provenienza "Annuncio Google", dal 27 settembre, da quando si distinguono. È un <em>costo massimo</em>: chi clicca l'annuncio e poi telefona senza dirlo non si vede, e può solo farlo scendere. Le <strong>conversioni</strong> sono quello che conta Google: moduli e tocchi su Chiama o WhatsApp, solo di chi accetta i cookie. Dicono se l'annuncio fa muovere la gente, non se poi compra. La spesa la legge l'agente ogni mattina da Google Ads e da Meta; il conto della settimana resta anche nella scheda Cruscotto del Gestionale, ogni lunedì.</p>
    </section>


    <!-- SEO -->
    <section class="card wide">
      <div class="hd">
        <div>
          <h2>SEO · Search Console</h2>
          <p class="sub" id="seo-sub">90 giorni</p>
        </div>
        <span class="pill mute" id="seo-pill">…</span>
      </div>

      <div class="grid" style="gap:18px">
        <div class="chart-mini">
          <div class="titolo"><b>Clic per settimana</b><span id="seo-max-clic"></span></div>
          <svg id="seoClic" width="100%" height="110" role="img" aria-label="Clic settimanali da Google negli ultimi 90 giorni"></svg>
        </div>
        <div class="chart-mini">
          <div class="titolo"><b>Impressioni per settimana</b><span id="seo-max-impr"></span></div>
          <svg id="seoImpr" width="100%" height="110" role="img" aria-label="Impressioni settimanali negli ultimi 90 giorni"></svg>
        </div>
      </div>
      <p class="sub" id="seo-testo" style="margin:10px 0 0"></p>

      <div class="grid" style="gap:14px; margin-top:16px">
        <div>
          <div class="label" style="margin-bottom:6px">Pagine · dove arrivano i clic</div>
          <div class="tbl-scroll">
            <table aria-label="Pagine per clic e impressioni, 90 giorni">
              <thead><tr><th>Pagina</th><th class="n">Clic</th><th class="n">Impr.</th><th class="n">CTR</th><th class="n">Pos.</th></tr></thead>
              <tbody id="seo-pagine"></tbody>
            </table>
          </div>
          <p class="sub" id="seo-pagine-testo" style="margin:8px 0 0"></p>
        </div>
        <div>
          <div class="label" style="margin-bottom:6px">Query · cosa cercano</div>
          <div class="tbl-scroll">
            <table aria-label="Query per impressioni, 90 giorni">
              <thead><tr><th>Query</th><th class="n">Impr.</th><th class="n">Clic</th><th class="n">Pos.</th></tr></thead>
              <tbody id="seo-query"></tbody>
            </table>
          </div>
          <p class="note" id="seo-query-testo" style="margin-top:8px"></p>
        </div>
      </div>
      <p class="sub" style="margin:14px 0 0">Il lavoro sulle ricerche lo fanno gli agenti: il controllo SEO del lunedì e quello approfondito del 27 (rapporto in <a class="plain" href="https://github.com/navazx/acquadirete/blob/main/agenti/seo/mese.md" target="_blank" rel="noopener">agenti/seo/mese.md</a>). Le pagine dei servizi, quelle che vendono, sono fuori dalla prima pagina per "depuratori acqua firenze" e "prato": lì conta soprattutto la mappa, cioè il profilo Google.</p>
    </section>

    <!-- DALLA BACHECA -->
    <section class="card wide" aria-labelledby="ant-titolo">
      <div class="ant-hd">
        <div>
          <h2 id="ant-titolo">Dalla bacheca</h2>
          <p class="sub" id="ant-sub">Le ultime note degli agenti.</p>
        </div>
        <button class="c-piu" id="vai-bacheca" type="button">Apri la bacheca</button>
      </div>
      <div class="ant-lista" id="ant-lista"><p class="c-vuoto">Le ultime note degli agenti compaiono qui.</p></div>
    </section>

    <!-- RAGNATELA -->
    <section class="card wide">
      <div class="hd">
        <div>
          <h2>La ragnatela degli agenti</h2>
          <p class="sub">Chi lavora, su quale canale, e dove arriva il lavoro. Al centro il Direttore, attorno gli agenti, fuori i canali. L'anello interno è la bacheca, quello esterno è Telegram, dove ogni agente riferisce a Matteo.</p>
        </div>
        <span class="pill mute">stato al 3 nov</span>
      </div>
      <div class="legend" role="list" style="margin-bottom:10px">
        <span class="key" role="listitem"><span class="sw" style="background:var(--ok)"></span>in funzione</span>
        <span class="key" role="listitem"><span class="sw canale"></span>canale</span>
        <span class="key" role="listitem"><span class="sw bacheca"></span>bacheca, dove si lasciano le note</span>
        <span class="key" role="listitem"><span class="sw anello"></span>Telegram, dove decide Matteo</span>
        <span class="key" role="listitem">frecce = dove va il dato</span>
      </div>
      <div class="web-grid">
        <figure class="web">
          <div class="web-scroll"><svg viewBox="0 0 940 940" role="img" aria-label="Ragnatela degli agenti di Acquadirete: al centro il Direttore, dentro l'anello della bacheca dove tutti lasciano le note; attorno otto agenti in funzione e l'app Gestione; all'esterno i canali su cui lavorano; l'anello esterno è Telegram, dove ogni agente riferisce a Matteo.">
<defs><marker id="rgn-freccia" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="w-head" d="M0,0 L10,5 L0,10 z"/></marker></defs>
<line class="w-guide" x1="470" y1="320" x2="470" y2="40"/>
<line class="w-guide" x1="566.4" y1="355.1" x2="746.4" y2="140.6"/>
<line class="w-guide" x1="617.7" y1="444" x2="893.5" y2="395.3"/>
<line class="w-guide" x1="592.9" y1="556" x2="822.2" y2="716.6"/>
<line class="w-guide" x1="521.3" y1="611" x2="617.1" y2="874.1"/>
<line class="w-guide" x1="418.7" y1="611" x2="322.9" y2="874.1"/>
<line class="w-guide" x1="340.1" y1="545" x2="97.6" y2="685"/>
<line class="w-guide" x1="322.3" y1="444" x2="46.5" y2="395.3"/>
<line class="w-guide" x1="373.6" y1="355.1" x2="193.6" y2="140.6"/>
<polygon class="w-guide" points="470,285 588.9,328.3 652.2,437.9 621.5,576.1 533.3,643.8 406.7,643.8 309.8,562.5 287.8,437.9 351.1,328.3"/>
<polygon class="w-guide" points="470,180 656.4,247.8 755.6,419.6 707.6,636.3 569.2,742.5 370.8,742.5 218.9,615 184.4,419.6 283.6,247.8"/>
<polygon class="w-guide" points="470,70 727.1,163.6 863.9,400.5 797.7,699.4 606.8,845.9 333.2,845.9 123.6,670 76.1,400.5 212.9,163.6"/>
<circle class="w-anello" cx="470" cy="470" r="440"/>
<circle class="w-bacheca" cx="470" cy="470" r="125"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="470" y1="437" x2="470" y2="274"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="497.7" y1="437" x2="590.3" y2="326.6"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="620.6" y1="443.4" x2="559" y2="454.3"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="517.1" y1="503" x2="612.9" y2="570.1"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="482" y1="503" x2="536.4" y2="652.4"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="458" y1="503" x2="403.6" y2="652.4"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="412.8" y1="503" x2="325.3" y2="553.5"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="381" y1="454.3" x2="319.4" y2="443.4"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="442.3" y1="437" x2="349.7" y2="326.6"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="470" y1="216" x2="470" y2="145"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="591" y1="268.6" x2="490.4" y2="145"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="694.1" y1="296.3" x2="685.6" y2="296.4"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="758.1" y1="320" x2="709" y2="401.9"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" marker-start="url(#rgn-freccia)" x1="727.3" y1="459.9" x2="783.9" y2="505.8"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" marker-start="url(#rgn-freccia)" x1="722.4" y1="570.1" x2="756" y2="555.8"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="530.9" y1="710.4" x2="483.9" y2="795"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="456.1" y1="795" x2="409.1" y2="710.4"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" marker-start="url(#rgn-freccia)" x1="229.1" y1="688.1" x2="262.5" y2="611.5"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="172.4" y1="531.6" x2="216.6" y2="553.5"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="199.9" y1="459.9" x2="163.7" y2="481.6"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="231" y1="401.9" x2="181.9" y2="320"/>
<line class="w-edge" marker-end="url(#rgn-freccia)" x1="349" y1="268.6" x2="449.6" y2="145"/>
<text class="w-lbl" x="586.7" y="435.1" text-anchor="middle">lo storico</text>
<text class="w-lbl" x="509.2" y="581.7" text-anchor="middle">priorità</text>
<text class="w-lbl" x="396.0" y="385.8" text-anchor="middle">guasti</text>
<text class="w-lbl" x="470.0" y="184.5" text-anchor="middle">articoli su un ramo</text>
<text class="w-lbl" x="540.7" y="210.8" text-anchor="middle">correzioni</text>
<text class="w-lbl" x="689.4" y="260.4" text-anchor="middle">posizioni</text>
<text class="w-lbl" x="733.5" y="364.9" text-anchor="middle">clic e impressioni</text>
<text class="w-lbl" x="755.6" y="486.9" text-anchor="middle">legge e scrive</text>
<text class="w-lbl" x="739.2" y="567.0" text-anchor="middle">lead e scadenze</text>
<text class="w-lbl" x="507.4" y="756.7" text-anchor="middle">post da incollare</text>
<text class="w-lbl" x="457.1" y="743.1" text-anchor="middle">stelle e totale</text>
<text class="w-lbl" x="245.8" y="653.8" text-anchor="middle">legge e applica</text>
<text class="w-lbl" x="194.5" y="546.5" text-anchor="middle">spesa Meta</text>
<text class="w-lbl" x="181.8" y="474.8" text-anchor="middle">pubblica all'OK di Matteo</text>
<text class="w-lbl" x="399.3" y="210.8" text-anchor="middle">ripara e rilancia</text>
<text class="w-bacheca-t" x="470" y="599" text-anchor="middle">bacheca</text>
<g class="n-on n-dir">
<rect class="n-box" x="384.0" y="440.0" width="172" height="60" rx="9"/>
<text class="n-nome" x="470" y="466.0" text-anchor="middle">Direttore</text>
<text class="n-nota" x="470" y="485.0" text-anchor="middle">il 1° e ogni mattina</text>
</g>
<g class="n-on">
<rect class="n-box" x="402.0" y="219.0" width="136" height="52" rx="9"/>
<text class="n-nome" x="470" y="241.0" text-anchor="middle">Contenuti</text>
<text class="n-nota" x="470" y="260.0" text-anchor="middle">il 5 del mese</text>
</g>
<g class="n-on">
<rect class="n-box" x="546.6" y="271.6" width="136" height="52" rx="9"/>
<text class="n-nome" x="614.6" y="293.6" text-anchor="middle">SEO tecnico</text>
<text class="n-nota" x="614.6" y="312.6" text-anchor="middle">lunedì e il 27</text>
</g>
<g class="n-on">
<rect class="n-box" x="623.6" y="404.9" width="136" height="52" rx="9"/>
<text class="n-nome" x="691.6" y="426.9" text-anchor="middle">Cruscotto</text>
<text class="n-nota" x="691.6" y="445.9" text-anchor="middle">ogni mattina</text>
</g>
<g class="n-on">
<rect class="n-box" x="586.3" y="573.1" width="136" height="52" rx="9"/>
<text class="n-nome" x="654.3" y="595.1" text-anchor="middle">App Gestione</text>
<text class="n-nota" x="654.3" y="614.1" text-anchor="middle">la aprono Matteo e Stefano</text>
</g>
<g class="n-on">
<rect class="n-box" x="479.0" y="655.4" width="136" height="52" rx="9"/>
<text class="n-nome" x="547" y="677.4" text-anchor="middle">Scheda Google</text>
<text class="n-nota" x="547" y="696.4" text-anchor="middle">il 15 del mese</text>
</g>
<g class="n-on">
<rect class="n-box" x="325.0" y="655.4" width="136" height="52" rx="9"/>
<text class="n-nome" x="393" y="677.4" text-anchor="middle">Recensioni</text>
<text class="n-nota" x="393" y="696.4" text-anchor="middle">ogni mattina</text>
</g>
<g class="n-on">
<rect class="n-box" x="207.1" y="556.5" width="136" height="52" rx="9"/>
<text class="n-nome" x="275.1" y="578.5" text-anchor="middle">Ads</text>
<text class="n-nota" x="275.1" y="597.5" text-anchor="middle">il 18 e il lunedì</text>
</g>
<g class="n-on">
<rect class="n-box" x="180.4" y="404.9" width="136" height="52" rx="9"/>
<text class="n-nome" x="248.4" y="426.9" text-anchor="middle">Social</text>
<text class="n-nota" x="248.4" y="445.9" text-anchor="middle">ogni sabato</text>
</g>
<g class="n-on">
<rect class="n-box" x="257.4" y="271.6" width="136" height="52" rx="9"/>
<text class="n-nome" x="325.4" y="293.6" text-anchor="middle">Meccanico</text>
<text class="n-nota" x="325.4" y="312.6" text-anchor="middle">quando serve</text>
</g>
<g class="n-canale">
<rect class="n-box" x="394.0" y="98.0" width="152" height="44" rx="22"/>
<text class="n-nome" x="470" y="117.0" text-anchor="middle">Sito · GitHub</text>
<text class="n-nota" x="470" y="133.0" text-anchor="middle">navazx/acquadirete</text>
</g>
<g class="n-canale">
<rect class="n-box" x="697.1" y="273.0" width="152" height="44" rx="22"/>
<text class="n-nome" x="773.1" y="292.0" text-anchor="middle">Search Console</text>
<text class="n-nota" x="773.1" y="308.0" text-anchor="middle">clic e posizioni</text>
</g>
<g class="n-canale">
<rect class="n-box" x="738.7" y="508.8" width="152" height="44" rx="22"/>
<text class="n-nome" x="814.7" y="527.8" text-anchor="middle">Gestionale</text>
<text class="n-nota" x="814.7" y="543.8" text-anchor="middle">lead e Cruscotto</text>
</g>
<g class="n-canale">
<rect class="n-box" x="394.0" y="798.0" width="152" height="44" rx="22"/>
<text class="n-nome" x="470" y="817.0" text-anchor="middle">Profilo Google</text>
<text class="n-nota" x="470" y="833.0" text-anchor="middle">post e recensioni</text>
</g>
<g class="n-canale">
<rect class="n-box" x="142.2" y="691.1" width="152" height="44" rx="22"/>
<text class="n-nome" x="218.2" y="710.1" text-anchor="middle">Google Ads</text>
<text class="n-nota" x="218.2" y="726.1" text-anchor="middle">annunci e spesa</text>
</g>
<g class="n-canale">
<rect class="n-box" x="45.9" y="484.6" width="152" height="44" rx="22"/>
<text class="n-nome" x="121.9" y="503.6" text-anchor="middle">Facebook</text>
<text class="n-nota" x="121.9" y="519.6" text-anchor="middle">pagina e inserzioni</text>
</g>
<g class="n-canale">
<rect class="n-box" x="90.9" y="273.0" width="152" height="44" rx="22"/>
<text class="n-nome" x="166.9" y="292.0" text-anchor="middle">Instagram</text>
<text class="n-nota" x="166.9" y="308.0" text-anchor="middle">@acquadirete.it</text>
</g>
<rect class="w-pill" x="328" y="896" width="284" height="28" rx="14"/>
<text class="w-pill-t" x="470" y="914.5" text-anchor="middle">Telegram · ogni agente riferisce a Matteo</text>
</svg></div>
          <figcaption>Ognuno lavora sui suoi canali e riferisce a Matteo su Telegram. Dopo ogni giro lascia una nota sulla bacheca, l'anello interno: gli altri la leggono prima di lavorare. Il Direttore il 1° del mese propone 3 priorità e ogni mattina controlla che tutti siano partiti; se qualcosa si è rotto chiama il Meccanico, che rilancia l'agente o porta a Matteo la riparazione da approvare.</figcaption>
        </figure>
        <ul class="c-giro" aria-label="Cosa fa ogni agente">
          <li><b>Direttore · il 1° del mese</b>Legge i numeri del mese finito e sceglie 3 priorità, ognuna con chi la fa, come si misura ed entro quando. Le manda a Matteo su Telegram: APPROVA, CORREGGI o RIFIUTA ORDINI, e i numeri in euro a parte, solo per lui. Il primo giro, su settembre, è stato fatto con Matteo l'8 ottobre: Meta all'ultima prova, "depuratore gratis" in prima pagina, almeno 3 post a ottobre. Dal 1° novembre gira da solo, e dal 20 ottobre legge anche <strong>l'imbuto canale per canale</strong> (visite, contatti, preventivi, clienti) e propone come dividere il budget fra Google e Meta. In più, <strong>ogni mattina</strong> controlla che gli altri abbiano lavorato: chi non è partito lo fa ripartire, il resto lo passa al Meccanico.</li>
          <li><b>Meccanico · quando serve</b>Lo chiamano il Direttore e gli altri agenti quando qualcosa si rompe. Legge gli errori, trova la causa e la sistema: rilancia l'agente, oppure porta a Matteo la riparazione da approvare con APPROVA RIPARAZIONE. Non tocca mai il sito senza il suo sì. Al primo giro vero, il 13 ottobre, ha trovato da solo la causa di due ritardi del lunedì e ha concluso che non c'era niente da riparare. <strong>Il 20 ottobre la prima riparazione vera</strong>: Google Ads non accettava più la versione vecchia del suo sistema e la revisione Ads del 18 era saltata; l'ha aggiornata e Matteo l'ha approvata. Lo stesso giorno ha rilanciato le correzioni SEO, ferme per un intoppo di avvio.</li>
          <li><b>App Gestione · quando si apre</b>Dal telefono, Matteo e Stefano: manutenzioni in scadenza, "fatta" o rimandata, clienti da cercare e modificare, stato dei lead e contatti nuovi, la mappa dei giri. La scheda "Da risentire" mostra preventivi senza risposta e contatti fermi; "Non gli interessa" chiude chi non vuole niente. Dal 15 ottobre funziona anche senza campo; dal 19-20 c'è il giro del giorno condiviso fra Matteo e Stefano (con guasti, sopralluoghi e orari), come ha pagato, gli interventi fatti e il magazzino. Dal 21 il contatto nuovo può essere "Annuncio Google". Ha preso il posto dell'agente lead, spento il 30 settembre. Dal 3 novembre ci sta anche questo cruscotto.</li>
          <li><b>Cruscotto · ogni mattina e il lunedì</b><strong>Questa pagina si aggiorna da sola ogni mattina</strong>: l'agente legge contatti, spesa di Google e Meta e Search Console e li scrive nel Gestionale, da dove li legge l'app. Il punto di oggi, i lead, il costo per cliente e la SEO sono ricalcolati ogni volta. Il lunedì scrive anche la riga della settimana nella scheda Cruscotto del Gestionale, la memoria storica.</li>
          <li><b>Social · ogni sabato</b>Tre varianti e una foto. Le foto gliele manda Matteo sul bot di Telegram, con due righe su che impianto è. Una volta su tre fa una curiosità con l'immagine nello stile di quelle di Matteo. Matteo risponde PUBBLICA, RIMANDA o SCARTA; dopo un CORREGGI POST dice cosa ha cambiato e risponde alle domande.</li>
          <li><b>SEO tecnico · ogni lunedì e il 27</b>Il lunedì passa tutte le pagine: link rotti, redirect, titoli, description, e le ricerche dove due pagine si fanno concorrenza. Le correzioni le propone da approvare. <strong>Il 27 del mese</strong> fa il controllo approfondito: indicizzazione, velocità sulle persone vere, ricerche, concorrenti, contatti pagina per pagina. Dal 27 ottobre quello che può fare lo fa lui (anche i reindirizzamenti dei vecchi indirizzi): a Matteo chiede solo le schede negli elenchi di aziende, che si cambiano coi suoi accessi. Dal 26 la mappa del sito dice a Google il giorno vero di ogni modifica, e l'indicizzazione a mano serve solo per le pagine nuove.</li>
          <li><b>Contenuti · il 5 del mese</b>Dal 19 ottobre, ogni mese un articolo nuovo e uno vecchio rinforzato, scelti per quello che vende. Li scrive con le regole già date, li collega agli altri e li manda a Matteo da leggere. Risposte: APPROVA ARTICOLO, CORREGGI ARTICOLO e cosa cambiare (lo riscrive e lo ripropone), oppure RIFIUTA ARTICOLO e il motivo.</li>
          <li><b>Scheda Google · il 15 del mese</b>Scrive tre post pronti per il profilo Google, con la foto da metterci. Nel messaggio c'è il link che apre già la finestra del post: si incolla, si aggiunge la foto, si pubblica. Da fuori Google non lascia pubblicare. Il giro di ottobre, il 15, ha lasciato la nota sulla bacheca; dal 20 ogni mese chiede anche foto vere degli impianti e ogni tre mesi controlla tutta la scheda.</li>
          <li><b>Recensioni · ogni mattina</b>Guarda la scheda Google: se il totale sale avvisa di rispondere, se scende o arriva un voto basso lo dice subito. Dal 4 ottobre tiene anche media e totale del sito uguali a quelli della scheda, e a ogni decina porta da approvare il cambio delle scritte sul numero di recensioni. Il testo delle recensioni Google non lo dà a una scheda senza indirizzo pubblico, quindi conta, non legge.</li>
          <li><b>Ads · il 18 del mese</b>Legge Google Ads e Meta in sola lettura: spesa, contatti, termini da escludere. Poi li confronta con le persone vere arrivate nel Gestionale: costo per lead e per cliente, canale per canale. Dal 13 ottobre porta già pronte le esclusioni e le pause su Google, e le applica dopo APPROVA ADS. La prima, il 14 ottobre, è stata approvata subito: 14 ricerche escluse. Il budget non lo tocca mai. La revisione del 18 ottobre era saltata perché Google aveva cambiato versione: il Meccanico l'ha riparata il 20 ed è ripartita il 21. In più, <strong>ogni lunedì</strong> dal 16 ottobre rimanda a Google Ads i clienti nati da un annuncio.</li>
        </ul>
      </div>
    </section>

    <!-- AUTOMAZIONI -->
    <section class="card wide">
      <div class="hd">
        <h2>Automazioni</h2>
        <span class="pill ok"><span class="dot"></span>Tutte in funzione</span>
      </div>
      <p class="sub">Girano nel cloud, a PC spento · avvisi su Telegram (@claudesisisibot)</p>
      <ul class="status c-due">
        <li><span class="st-dot"></span><span>Lead (sito e Meta) → foglio + Telegram</span><span class="when">istantaneo</span></li>
        <li><span class="st-dot"></span><span>Lead → cliente nel gestionale (Apps Script e app)</span><span class="when">al cambio stato</span></li>
        <li><span class="st-dot"></span><span>Sveglia degli agenti: li fa partire all'ora giusta</span><span class="when">ogni 15 min</span></li>
        <li><span class="st-dot"></span><span>Segreteria: le risposte di Matteo su Telegram eseguite subito</span><span class="when">ogni 15 min</span></li>
        <li><span class="st-dot"></span><span>Foto mandate al bot → pronte per i post</span><span class="when">ogni 15 min</span></li>
        <li><span class="st-dot"></span><span>CORREGGI: una proposta riscritta con le note di Matteo</span><span class="when">a richiesta</span></li>
        <li><span class="st-dot"></span><span>Sentinella: il sito è online e il certificato è valido</span><span class="when">5 volte al giorno</span></li>
        <li><span class="st-dot"></span><span>Agente recensioni: nuove, voti bassi, media del sito</span><span class="when">ogni mattina</span></li>
        <li><span class="st-dot"></span><span>Scritte del sito sulle recensioni, da approvare</span><span class="when">quando servono</span></li>
        <li><span class="st-dot"></span><span>Contatore delle visite: la somma di ogni giorno nel Gestionale</span><span class="when">ogni notte</span></li>
        <li><span class="st-dot"></span><span>Cruscotto nell'app: i numeri di questa pagina</span><span class="when">ogni mattina</span></li>
        <li><span class="st-dot"></span><span>Cruscotto: una riga nel Gestionale</span><span class="when">lunedì</span></li>
        <li><span class="st-dot"></span><span>Clienti nati da un annuncio rimandati a Google Ads</span><span class="when">lunedì</span></li>
        <li><span class="st-dot"></span><span>Agente SEO: controllo del sito e correzioni da approvare</span><span class="when">lunedì</span></li>
        <li><span class="st-dot"></span><span>Agente social: bozza e pubblicazione all'OK di Matteo</span><span class="when">sabato</span></li>
        <li><span class="st-dot"></span><span>Direttore: controllo che gli agenti abbiano lavorato</span><span class="when">ogni mattina</span></li>
        <li><span class="st-dot"></span><span>Meccanico: ripara l'agente che si è fermato</span><span class="when">quando serve</span></li>
        <li><span class="st-dot"></span><span>Postino: le note delle routine sulla bacheca, e la copia per gli agenti</span><span class="when">subito, e ogni 3 ore</span></li>
        <li><span class="st-dot"></span><span>Direttore: le 3 priorità del mese, da approvare</span><span class="when">il 1º del mese</span></li>
        <li><span class="st-dot"></span><span>Controllo SEO approfondito del mese</span><span class="when">il 27</span></li>
        <li><span class="st-dot"></span><span>Agente contenuti: articolo da approvare</span><span class="when">il 5</span></li>
        <li><span class="st-dot"></span><span>Agente scheda Google: tre post pronti da incollare</span><span class="when">il 15</span></li>
        <li><span class="st-dot"></span><span>Agente Ads: Google e Meta, modifiche da approvare</span><span class="when">il 18</span></li>
        <li><span class="st-dot"></span><span>Ponte vocale: i vocali di Matteo da fuori a Claude sul PC (solo a PC acceso)</span><span class="when">quando arriva un vocale</span></li>
      </ul>
      <p class="sub" style="margin:10px 0 0">Dall'11 settembre <strong>nessuna automazione ha più chiavi o token scritti nelle istruzioni</strong>: stanno tutti nei secret di GitHub o fra le impostazioni di Netlify. Le vecchie routine sostituite (post Meta, guardiano dei redirect, promemoria articolo, monitoraggio del sito, promemoria Ads, vecchio report SEO) sono state spente: al loro posto lavorano gli agenti. Il 30 settembre è stato spento anche l'agente lead del mattino, perché l'app Gestione fa già lo stesso lavoro, e il 24 la vecchia routine delle correzioni SEO, ora attaccata al controllo del lunedì.</p>
    </section>
  </div>
  </div>

  <div id="p-agenti" hidden>
  <div class="grid">

    <!-- BACHECA -->
    <section class="card wide" aria-labelledby="bach-titolo">
      <div class="hd">
        <div>
          <h2 id="bach-titolo">Bacheca degli agenti</h2>
          <p class="sub">Finito il giro, ogni agente scrive qui cosa ha visto e cosa serve agli altri. Prima di lavorare, tutti leggono le note degli ultimi 30 giorni. Si può scrivere anche da qui.</p>
        </div>
        <span class="pill mute" id="bach-stato"><span class="dot"></span>in caricamento</span>
      </div>
      <div class="bach-grid">
        <div class="feed" id="feed">
          <p class="c-vuoto" id="feed-vuoto"><strong>Ancora nessuna nota.</strong> Le recensioni si controllano ogni giorno, SEO e Cruscotto il lunedì, Social il sabato, Contenuti il 5 del mese, Scheda Google il 15, Ads il 18, il Direttore il 1° e ogni mattina.</p>
        </div>
        <div class="bach-side">
          <details class="scrivi" id="scrivi">
            <summary>Scrivi agli agenti</summary>
            <form id="composer">
              <label class="label" for="nota-testo">La tua nota</label>
              <p class="hint">Viene copiata anche su GitHub, che è pubblico: niente nomi di clienti, telefoni o prezzi.</p>
              <textarea id="nota-testo" maxlength="600" placeholder="Es. tre clienti questo mese hanno chiesto dell'acqua frizzante per l'ufficio"></textarea>
              <select id="nota-per" aria-label="A chi è rivolta">
                <option value="tutti">Per tutti</option>
                <option value="direttore">Per il Direttore</option>
                <option value="contenuti">Per Contenuti</option>
                <option value="seo">Per SEO</option>
                <option value="social">Per Social</option>
                <option value="recensioni">Per Recensioni</option>
                <option value="scheda">Per Scheda Google</option>
                <option value="ads">Per Ads</option>
                <option value="meccanico">Per il Meccanico</option>
              </select>
              <div><button class="c-btn" id="nota-invia" type="submit">Lascia la nota</button></div>
              <div class="stato-nota" id="nota-stato" role="status"></div>
            </form>
          </details>
          <div class="filtri" id="filtri" role="group" aria-label="Filtra per agente"></div>
          <p class="side-nota">Le note restano qui; gli agenti ne leggono gli ultimi 30 giorni. Niente nomi di clienti, telefoni o cifre in euro: ogni nota viene copiata anche su GitHub, dove il progetto è pubblico.</p>
        </div>
      </div>
    </section>

  </div>
  
  <footer><span id="footer-dati">I numeri arrivano ogni mattina dal giro dell'agente.</span> Ragnatela e automazioni al 3 nov, dalle note della bacheca e dal codice degli agenti.</footer>
</div>`;

  let radice = null;
  let D = null;
  let note = [];
  let io = '';
  let scriviNota = null;
  let cambiaScheda = () => {};
  // Restano fra un disegno e l'altro: una rilettura non deve far perdere quello
  // che si sta scrivendo o il filtro scelto.
  let filtro = 'tutti';
  let quante = 40;
  let bozza = '';
  let bozzaPer = 'tutti';
  let scriviAperto = false;
  let giaViste = null;

  const SRC = {
    Meta: { cssVar: '--s-meta', label: 'Meta / Facebook' },
    Sito: { cssVar: '--s-site', label: 'Sito web' },
    Annuncio: { cssVar: '--s-ads', label: 'Annuncio Google (WhatsApp/telefono)' },
    Altro: { cssVar: '--s-tel', label: 'Passaparola' },
  };
  const ORDINE = ['Meta', 'Sito', 'Annuncio', 'Altro'];
  const PRIMO_LUNEDI = new Date(2026, 5, 29); // 29 giugno 2026, un lunedì
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // In italiano il browser non mette il punto sulle migliaia a 4 cifre (5010): lo mettiamo noi.
  const num = (n, dec = 0) => {
    const [i, d] = Number(n).toFixed(dec).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (d ? ',' + d : '');
  };
  const euro = (n) => num(Math.round(n)) + ' €';
  const data = (ymd) => new Date(ymd + 'T12:00:00');
  const quando = (ymd, conAnno) => data(ymd).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: conAnno ? 'numeric' : undefined });
  const corta = (ymd) => { const d = data(ymd); return d.getDate() + '/' + (d.getMonth() + 1); };
  const ggmm = (ymd) => ymd.slice(8, 10) + '/' + ymd.slice(5, 7);
  const oggiYmd = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const meno = (ymd, giorni) => { const d = data(ymd); d.setDate(d.getDate() - giorni); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const delta = (ora, prima) => {
    if (!prima) return '';
    const p = Math.round(((ora - prima) / prima) * 100);
    return ` <span class="delta ${p > 2 ? 'up' : p < -2 ? 'down' : 'flat'}">${p > 0 ? '+' : ''}${p}%</span>`;
  };
  const contaPer = (lead) => { const c = { Meta: 0, Sito: 0, Annuncio: 0, Altro: 0 }; lead.forEach((l) => { c[l.src] = (c[l.src] || 0) + 1; }); return c; };
  const perFonte = (c) => ORDINE.filter((s) => c[s]).map((s) => `${c[s]} ${s === 'Meta' ? 'da Meta' : s === 'Sito' ? 'dal sito' : s === 'Annuncio' ? 'da annunci Google via WhatsApp o telefono' : 'col passaparola'}`).join(', ');
  // I colori stanno sulla radice del cruscotto, non su tutta la pagina.
  const colore = (nome) => getComputedStyle(radice).getPropertyValue(nome).trim();

  // ---- grafico: un blocco per lead, impilato per settimana ----
  const settimanaDi = (ymd) => Math.floor((data(ymd) - PRIMO_LUNEDI) / (7 * 864e5));
  function drawChart() {
    const svg = $('leadChart');
    const tip = $('tooltip');
    if (!D || !svg) return;
    const lead = D.lead.filter((l) => settimanaDi(l.d) >= 0);
    const nSettimane = Math.max(settimanaDi(oggiYmd()), ...lead.map((l) => settimanaDi(l.d))) + 1;
    const perSettimana = Array.from({ length: nSettimane }, (_, w) => lead.filter((l) => settimanaDi(l.d) === w));
    const maxY = Math.max(2, ...perSettimana.map((s) => s.length));
    const W = svg.clientWidth || 340;
    const H = 172;
    const padL = 8, padR = 8, padB = 24, padT = 8;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const step = innerW / nSettimane;
    const barW = Math.min(38, step * 0.6);
    const unitH = innerH / maxY;
    const colori = {};
    ORDINE.forEach((s) => { colori[s] = colore(SRC[s].cssVar); });
    const colGrid = colore('--grid');
    const colInk3 = colore('--ink-3');
    const colCard = colore('--card');

    for (let v = 2; v <= maxY; v += 2) {
      const y = padT + innerH - v * unitH;
      const ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', padL); ln.setAttribute('x2', W - padR);
      ln.setAttribute('y1', y); ln.setAttribute('y2', y);
      ln.setAttribute('stroke', colGrid); ln.setAttribute('stroke-width', '1');
      svg.appendChild(ln);
      const et = document.createElementNS(NS, 'text');
      et.setAttribute('x', padL + 2); et.setAttribute('y', y - 3);
      et.setAttribute('font-size', '9.5'); et.setAttribute('fill', colInk3);
      et.textContent = v;
      svg.appendChild(et);
    }
    const base = document.createElementNS(NS, 'line');
    base.setAttribute('x1', padL); base.setAttribute('x2', W - padR);
    base.setAttribute('y1', padT + innerH); base.setAttribute('y2', padT + innerH);
    base.setAttribute('stroke', colInk3); base.setAttribute('stroke-width', '1');
    svg.appendChild(base);

    // con tante settimane le etichette si accavallano: una ogni due quando serve
    const ogni = step < 34 ? 2 : 1;
    perSettimana.forEach((leadSettimana, w) => {
      const cx = padL + step * w + step / 2;
      // per giorni, non per millisecondi: col cambio dell'ora a fine ottobre il lunedì diventava domenica
      const lunedi = new Date(PRIMO_LUNEDI.getFullYear(), PRIMO_LUNEDI.getMonth(), PRIMO_LUNEDI.getDate() + w * 7);
      // l'ultima settimana ha sempre l'etichetta: quella subito prima, se c'è, la lascia
      if ((w % ogni === 0 && !(ogni === 2 && w === nSettimane - 2)) || w === nSettimane - 1) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', H - 7);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '10.5');
        t.setAttribute('fill', colInk3);
        t.textContent = `${lunedi.getDate()}/${lunedi.getMonth() + 1}`;
        svg.appendChild(t);
      }
      const pila = [...leadSettimana].sort((a, b) => ORDINE.indexOf(a.src) - ORDINE.indexOf(b.src));
      pila.forEach((l, j) => {
        const hpx = Math.max(3, unitH - 2.5);
        const y = padT + innerH - (j + 1) * unitH + 2.5;
        const r = document.createElementNS(NS, 'rect');
        r.setAttribute('x', cx - barW / 2);
        r.setAttribute('y', y);
        r.setAttribute('width', barW);
        r.setAttribute('height', hpx);
        r.setAttribute('rx', '3');
        r.setAttribute('fill', colori[l.src]);
        r.setAttribute('stroke', colCard);
        r.setAttribute('stroke-width', '1');
        r.addEventListener('mouseenter', () => {
          tip.innerHTML = `<strong>${ggmm(l.d)}</strong> · ${SRC[l.src].label}<br>${esc(l.stato)}`;
          tip.style.display = 'block';
          const box = svg.getBoundingClientRect();
          tip.style.left = (cx / W * box.width) + 'px';
          tip.style.top = (y / H * box.height) + 'px';
        });
        r.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
        svg.appendChild(r);
      });
    });
  }

  // ---- grafici SEO: clic e impressioni per settimana (90 giorni) ----
  function barreSettimanali(idSvg, campo, coloreVar) {
    const el = $(idSvg);
    if (!el || !D || !D.seo) return;
    const righe = D.seo.settimane;
    const W = el.clientWidth || 340;
    const H = 110;
    const padL = 6, padR = 6, padT = 6, padB = 18;
    el.setAttribute('viewBox', `0 0 ${W} ${H}`);
    el.innerHTML = '';
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const max = Math.max(1, ...righe.map((r) => r[campo]));
    const step = innerW / righe.length;
    const barW = Math.min(30, step * 0.62);
    const tinta = colore(coloreVar);
    const colInk3 = colore('--ink-3');
    const base = document.createElementNS(NS, 'line');
    base.setAttribute('x1', padL); base.setAttribute('x2', W - padR);
    base.setAttribute('y1', padT + innerH); base.setAttribute('y2', padT + innerH);
    base.setAttribute('stroke', colInk3); base.setAttribute('stroke-width', '1');
    el.appendChild(base);
    righe.forEach((r, i) => {
      const v = r[campo];
      const h = Math.max(2, (v / max) * innerH);
      const cx = padL + step * i + step / 2;
      const rect = document.createElementNS(NS, 'rect');
      rect.setAttribute('x', cx - barW / 2);
      rect.setAttribute('y', padT + innerH - h);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', h);
      rect.setAttribute('rx', '3');
      rect.setAttribute('fill', tinta);
      // la settimana in corso, ancora parziale, più chiara
      if (r.giorni < 7) rect.setAttribute('opacity', '0.45');
      const titolo = document.createElementNS(NS, 'title');
      titolo.textContent = `Settimana del ${corta(r.dal)}: ${num(v)}${r.giorni < 7 ? ` (${r.giorni} giorni su 7)` : ''}`;
      rect.appendChild(titolo);
      el.appendChild(rect);
      if (i % 3 === 0 || i === righe.length - 1) {
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', cx); t.setAttribute('y', H - 5);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('font-size', '10');
        t.setAttribute('fill', colInk3);
        t.textContent = corta(r.dal);
        el.appendChild(t);
      }
    });
  }

  // ---- i testi e i numeri, ricalcolati dai dati del giorno ----
  function scriviNumeri() {
    const L = D.lead, oggi = oggiYmd();
    const clienti = L.filter((l) => l.stato === 'Cliente');
    const preventivi = L.filter((l) => l.stato === 'Preventivo inviato');
    const richiamare = L.filter((l) => l.stato === 'Da richiamare');
    const ultimi7 = L.filter((l) => l.d > meno(oggi, 7));
    const prima7 = L.filter((l) => l.d > meno(oggi, 14) && l.d <= meno(oggi, 7));
    const meseKey = oggi.slice(0, 7);
    const mese = L.filter((l) => l.d.startsWith(meseKey));
    const nomeMese = data(oggi).toLocaleDateString('it-IT', { month: 'long' });
    const primo = [...L].sort((a, b) => a.d.localeCompare(b.d))[0];
    const aggiornato = new Date(D.aggiornato);
    const giornoAgg = aggiornato.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });

    $('snapshot').innerHTML = `Numeri al <strong>${esc(giornoAgg)}</strong>, alle ${aggiornato.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} · si aggiornano ogni mattina`;
    const vecchi = Date.now() - aggiornato.getTime() > 36 * 3600e3;
    $('numeri-avviso').hidden = !vecchi;
    if (vecchi) $('numeri-avviso').innerHTML = `<strong>Questi numeri sono del ${esc(giornoAgg)}</strong>: il giro di stamattina non è arrivato. Lo vede il Direttore al controllo delle 9 e lo passa al Meccanico.`;

    // KPI
    $('k-lead').textContent = num(L.length);
    $('k-lead-sub').textContent = `dal ${quando(primo.d)} · ${ultimi7.length} negli ultimi 7 giorni (${prima7.length} nei 7 prima)`;
    $('k-clienti').textContent = num(clienti.length);
    $('k-clienti-sub').textContent = `${Math.round((clienti.length / L.length) * 100)}% · più ${preventivi.length} preventivi aperti`;
    const s = D.seo;
    $('k-clic').innerHTML = num(s.d28.clic) + delta(s.d28.clic, s.p28.clic);
    $('k-clic-sub').textContent = `Search Console, ${corta(s.d28.da)} – ${corta(s.d28.a)}, contro i 28 giorni prima`;
    $('k-impr').innerHTML = num(s.d28.impr) + delta(s.d28.impr, s.p28.impr);
    $('k-impr-sub').textContent = `posizione media ${num(s.d28.pos, 1)}${s.p28.pos ? ` (era ${num(s.p28.pos, 1)})` : ''} · CTR ${num(s.d28.ctr, 1)}%`;

    // costo per cliente
    const sp = D.spesa;
    const cMeta = clienti.filter((l) => l.src === 'Meta').length;
    // Solo i clienti arrivati da un annuncio, non quelli gratis dalla ricerca (Matteo, 4 nov 2026).
    const cGoogle = clienti.filter((l) => (l.src === 'Annuncio' || l.ann) && l.d >= sp.tracciatoDal).length;
    const costo = (spesa, n) => (spesa == null ? null : n ? spesa / n : null);
    const kMeta = costo(sp.meta, cMeta), kGoogle = costo(sp.googleTracciata, cGoogle), kConv = costo(sp.googleTracciata, sp.conversioni);
    $('costi-titolo').textContent = `Quanto costa un cliente · spesa fino al ${quando(sp.al)}`;
    $('c-meta').textContent = kMeta == null ? '—' : euro(kMeta);
    $('c-meta-sub').textContent = sp.meta == null ? 'spesa non letta stamattina' : `${euro(sp.meta)} spesi dal ${quando(sp.metaDal)} · ${cMeta} ${cMeta === 1 ? 'cliente' : 'clienti'}`;
    $('c-google').textContent = kGoogle == null ? '—' : euro(kGoogle);
    $('c-google-sub').innerHTML = sp.googleTracciata == null ? 'spesa non letta stamattina' : `${euro(sp.googleTracciata)} spesi dal ${quando(sp.tracciatoDal)} · ${cGoogle} ${cGoogle === 1 ? 'cliente arrivato' : 'clienti arrivati'} da un annuncio · <em>costo massimo</em>`;
    $('c-conv').textContent = kConv == null ? '—' : euro(kConv);
    $('c-conv-sub').textContent = sp.googleTracciata == null ? 'spesa non letta stamattina' : `${num(sp.conversioni ?? 0, (sp.conversioni ?? 0) % 1 ? 1 : 0)} conversioni dal ${quando(sp.tracciatoDal)}: moduli e tocchi su Chiama o WhatsApp, non clienti`;

    // il punto di oggi
    const nuoviClienti = clienti.filter((l) => (l.dal || l.d) > meno(oggi, 14));
    const piuVecchio = (lista) => lista.map((l) => l.d).sort()[0];
    const fatti = [
      ['Contatti', `Negli ultimi 7 giorni <strong>${ultimi7.length}</strong>${ultimi7.length ? ` (${esc(perFonte(contaPer(ultimi7)))})` : ''}, nei 7 prima ${prima7.length}. A ${esc(nomeMese)} finora ${mese.length}${mese.length ? `: ${esc(perFonte(contaPer(mese)))}` : ''}.`],
      ['Clienti', nuoviClienti.length
        ? `<strong>${nuoviClienti.length} ${nuoviClienti.length === 1 ? 'nuovo' : 'nuovi'}</strong> nelle ultime due settimane (${esc(perFonte(contaPer(nuoviClienti)))}).`
        : 'Nessun cliente nuovo nelle ultime due settimane.'],
      ['Da fare', [
        richiamare.length ? `<strong>${richiamare.length} da richiamare</strong>, il più vecchio arrivato il ${quando(piuVecchio(richiamare))}.` : 'Nessuno da richiamare.',
        preventivi.length ? `${preventivi.length} ${preventivi.length === 1 ? 'preventivo' : 'preventivi'} in attesa di risposta, il più vecchio del ${quando(piuVecchio(preventivi))}.` : '',
        'I nomi sono fra i contatti, qui nell\'app.',
      ].filter(Boolean).join(' ')],
      // Il tetto è riservato: arriva coi numeri, non sta in questo file.
      ['Costo cliente', kMeta == null && kGoogle == null ? 'Spesa non letta stamattina.' : `Meta <strong>${kMeta == null ? '—' : euro(kMeta)}</strong>, Google Ads <strong>${kGoogle == null ? '—' : euro(kGoogle)}</strong> al massimo.${D.tetto ? ` Il tetto deciso è ${euro(D.tetto)}.` : ''}`],
      ['Google', `${num(s.d28.clic)} clic gratuiti in 28 giorni (${s.p28.clic ? `${s.d28.clic >= s.p28.clic ? '+' : ''}${Math.round(((s.d28.clic - s.p28.clic) / s.p28.clic) * 100)}% sui 28 prima` : 'primo dato'}), posizione media ${num(s.d28.pos, 1)}.`],
    ];
    $('punto').innerHTML = fatti.map(([k, v]) => `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join('');
    $('punto-titolo').textContent = `Il punto di oggi, ${quando(oggi)}`;
    const pill = $('punto-pill');
    pill.className = 'pill ' + (richiamare.length ? 'warn' : 'ok');
    pill.innerHTML = '<span class="dot"></span>' + (richiamare.length ? `${richiamare.length} da richiamare` : 'nessuno in attesa di chiamata');
    const prove = (D.prove || []).filter((p) => p.quando >= oggi).slice(0, 4);
    $('prossime').hidden = !prove.length;
    $('prossime').innerHTML = `<strong>Prossimi controlli delle prove</strong>: ${prove.map((p) => `${quando(p.quando)}, ${esc(p.tipo.toLowerCase())} · ${esc(p.cosa)}`).join('; ')}. Li fa il Direttore il 1° del mese, guardando i numeri veri.`;

    // lead
    const tot = contaPer(L);
    $('lead-sub').textContent = 'Un blocco per lead, settimana per settimana · ' + ORDINE.filter((x) => tot[x]).map((x) => `${x === 'Altro' ? 'passaparola' : SRC[x].label.split(' (')[0]} ${tot[x]}${x === 'Meta' || x === 'Sito' ? ` (${Math.round((tot[x] / L.length) * 100)}%)` : ''}`).join(' · ');
    $('lead-testo').innerHTML = `<strong>A ${esc(nomeMese)} ${mese.length} contatti finora</strong>${mese.length ? `: ${esc(perFonte(contaPer(mese)))}` : ''}. ${nuoviClienti.length ? `<strong>Clienti nuovi</strong> nelle ultime due settimane: ${nuoviClienti.length}. ` : ''}${richiamare.length ? `<strong>Da richiamare</strong>: ${richiamare.length}.` : ''}`;
    $('leadChart').setAttribute('aria-label', `Lead per settimana dal 29 giugno al ${quando(oggi)}, divisi per provenienza`);

    // Google vs Meta
    const righeFonti = [['Sito', 'Sito web (modulo)'], ['Annuncio', SRC.Annuncio.label], ['Meta', SRC.Meta.label], ['Altro', 'Passaparola']];
    $('fonti').innerHTML = righeFonti.map(([k, etichetta]) => {
      const n = L.filter((l) => l.src === k).length, c = clienti.filter((l) => l.src === k).length;
      return `<tr><td><span class="src"><span class="sw" style="background:var(${SRC[k].cssVar})"></span>${etichetta}</span></td><td class="n">${n}</td><td class="n">${c}</td><td class="n">${n >= 5 ? Math.round((c / n) * 100) + '%' : '—'}</td></tr>`;
    }).join('');
    $('fonti-pill').textContent = `${L.length} lead, ${clienti.length} clienti`;
    const nGoo = L.filter((l) => l.src === 'Sito' || l.src === 'Annuncio').length, cGoo = clienti.filter((l) => l.src === 'Sito' || l.src === 'Annuncio').length;
    const nMeta = tot.Meta, cMetaTot = clienti.filter((l) => l.src === 'Meta').length;
    const ultimoMeta = clienti.filter((l) => l.src === 'Meta').map((l) => l.d).sort().pop();
    $('fonti-testo').innerHTML = `Dal sito, contando anche chi arriva da un annuncio e chiama o scrive: <strong>${cGoo} clienti da ${nGoo} contatti</strong> (${nGoo ? Math.round((cGoo / nGoo) * 100) : 0}%). Da Meta <strong>${cMetaTot} da ${nMeta}</strong> (${nMeta ? Math.round((cMetaTot / nMeta) * 100) : 0}%)${ultimoMeta ? `; l'ultimo contatto Meta diventato cliente è del ${quando(ultimoMeta)}` : ''}.`;

    // SEO
    $('seo-sub').innerHTML = `90 giorni, ${corta(s.d90.da)} – ${corta(s.d90.a)}: <strong>${num(s.d90.clic)} clic</strong> · <strong>${num(s.d90.impr)} impressioni</strong> · CTR ${num(s.d90.ctr, 1)}% · posizione media ${num(s.d90.pos, 1)}`;
    $('seo-pill').textContent = `dati al ${quando(s.al)}`;
    const maxClic = Math.max(...s.settimane.map((r) => r.clic)), maxImpr = Math.max(...s.settimane.map((r) => r.impr));
    $('seo-max-clic').textContent = `massimo ${num(maxClic)}`;
    $('seo-max-impr').textContent = `massimo ${num(maxImpr)}`;
    const intere = s.settimane.filter((r) => r.giorni === 7);
    const ultima = intere[intere.length - 1], record = intere.reduce((a, r) => (r.clic > a.clic ? r : a), intere[0] || { clic: 0 });
    $('seo-testo').innerHTML = ultima ? `L'ultima settimana intera, dal ${quando(ultima.dal)}, ha portato <strong>${num(ultima.clic)} clic</strong> e ${num(ultima.impr)} impressioni. ${record && record.dal !== ultima.dal ? `Il record resta la settimana del ${quando(record.dal)}, con ${num(record.clic)} clic.` : 'È il record delle 13 settimane.'}${s.settimane.some((r) => r.giorni < 7) ? ' La barra più chiara è la settimana in corso, ancora parziale.' : ''}` : '';
    $('seo-pagine').innerHTML = s.pagine.map((p) => `<tr><td>${esc(p.p)}</td><td class="n">${num(p.clic)}</td><td class="n">${num(p.impr)}</td><td class="n">${num(p.ctr, 1)}%</td><td class="n">${num(p.pos, 1)}</td></tr>`).join('');
    const clicPagine = s.pagine.reduce((a, p) => a + p.clic, 0), imprPagine = s.pagine.reduce((a, p) => a + p.impr, 0);
    $('seo-pagine-testo').textContent = s.d90.clic ? `Queste righe coprono il ${Math.round((clicPagine / s.d90.clic) * 100)}% dei clic e il ${Math.round((imprPagine / s.d90.impr) * 100)}% delle impressioni.` : '';
    $('seo-query').innerHTML = s.query.map((q) => `<tr><td>${esc(q.q)}</td><td class="n">${num(q.impr)}</td><td class="n">${num(q.clic)}</td><td class="n">${num(q.pos, 1)}</td></tr>`).join('');
    const imprQuery = s.query.reduce((a, q) => a + q.impr, 0);
    $('seo-query-testo').innerHTML = `Attenzione: Google nasconde le ricerche rare, e queste righe valgono solo il <strong>${s.d90.impr ? Math.round((imprQuery / s.d90.impr) * 100) : 0}%</strong> delle impressioni${s.quotaQuery != null ? ` (tutte le ricerche che Google mostra arrivano al ${s.quotaQuery}%)` : ''}. Servono a dare un'idea, non a trarre conclusioni.`;

    $('footer-dati').textContent = `Numeri preparati il ${giornoAgg} alle ${aggiornato.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}: contatti dal Gestionale_Clienti, spesa letta da Google Ads e Meta fino al ${quando(sp.al)}, Search Console fino al ${quando(s.al)} (gli ultimi giorni Google li dà ancora parziali). Si aggiornano da soli ogni mattina.`;
  }

  const disegnaGrafici = () => {
    if (!D || !radice || !radice.isConnected) return;
    drawChart();
    barreSettimanali('seoClic', 'clic', '--accent');
    barreSettimanali('seoImpr', 'impr', '--s-meta');
  };

  function senzaNumeri(testo) {
    $('snapshot').innerHTML = 'Numeri <strong>non ancora arrivati</strong>';
    $('punto').innerHTML = `<li><span class="k">Numeri</span><span class="v">${esc(testo)}</span></li>`;
    const pill = $('punto-pill');
    pill.className = 'pill warn';
    pill.innerHTML = '<span class="dot"></span>non caricati';
  }

  // ---- la bacheca degli agenti ----
  const AGENTI = {
    direttore: { nome: 'Direttore', c: '--a-direttore' },
    contenuti: { nome: 'Contenuti', c: '--a-contenuti' },
    seo: { nome: 'SEO', c: '--a-seo' },
    social: { nome: 'Social', c: '--a-social' },
    recensioni: { nome: 'Recensioni', c: '--a-recensioni' },
    scheda: { nome: 'Scheda Google', c: '--a-scheda' },
    lead: { nome: 'Cruscotto e lead', c: '--a-lead' },
    ads: { nome: 'Ads', c: '--a-ads' },
    meccanico: { nome: 'Meccanico', c: '--a-meccanico' },
    matteo: { nome: 'Matteo', c: '--a-matteo' },
    stefano: { nome: 'Stefano', c: '--a-matteo' },
  };
  const PASSO = 40;
  const info = (id) => AGENTI[id] || { nome: id || '?', c: '--a-altro' };
  // Come si chiama sulla bacheca chi sta usando l'app (la chiave di babbo firma «stefano»).
  const ioSuBacheca = () => (io === 'babbo' ? 'stefano' : io);
  const perMe = (n) => (n.per || []).indexOf(ioSuBacheca()) >= 0;
  function nomePer(per) {
    if (!per || !per.length || per.indexOf('tutti') >= 0) return 'per tutti';
    return 'per ' + per.map((p) => (p === ioSuBacheca() ? 'te' : info(p).nome)).join(', ');
  }
  function giorno(d) {
    const oggi = new Date();
    const ieri = new Date();
    ieri.setDate(oggi.getDate() - 1);
    if (d.toDateString() === oggi.toDateString()) return 'Oggi';
    if (d.toDateString() === ieri.toDateString()) return 'Ieri';
    return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: d.getFullYear() === oggi.getFullYear() ? undefined : 'numeric' });
  }
  function carta(n, conGiorno) {
    const a = info(n.agente);
    const d = new Date(n.quando);
    const art = document.createElement('article');
    art.className = 'bn' + (giaViste && !giaViste[n.id] ? ' nuova' : '');
    art.style.setProperty('--c', `var(${a.c})`);
    const meta = document.createElement('div');
    meta.className = 'meta';
    const who = document.createElement('span');
    who.className = 'who';
    who.textContent = a.nome;
    const t = document.createElement('span');
    t.className = 'time';
    t.textContent = isNaN(d) ? '' : (conGiorno ? giorno(d) + ', ' : '') + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const per = document.createElement('span');
    per.className = 'for' + (perMe(n) ? ' te' : '');
    per.textContent = nomePer(n.per);
    meta.append(who, t, per);
    const p = document.createElement('p');
    p.className = 'testo';
    p.textContent = n.testo || '';
    art.append(meta, p);
    return art;
  }

  function disegnaFiltri() {
    const el = $('filtri');
    const presenti = {};
    note.forEach((n) => { presenti[n.agente] = true; });
    const voci = [['tutti', 'Tutti', '--ink-3']];
    if (note.some(perMe)) voci.push(['perte', 'Per te', '--warn']);
    Object.keys(AGENTI).forEach((k) => { if (presenti[k]) voci.push([k, AGENTI[k].nome, AGENTI[k].c]); });
    el.textContent = '';
    if (voci.length < 3) return;
    voci.forEach((v) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('aria-pressed', String(filtro === v[0]));
      b.style.setProperty('--c', `var(${v[2]})`);
      const pt = document.createElement('span');
      pt.className = 'pt';
      b.append(pt, document.createTextNode(v[1]));
      b.addEventListener('click', () => { filtro = v[0]; quante = PASSO; disegnaFeed(); });
      el.appendChild(b);
    });
  }

  function disegnaFeed() {
    const feed = $('feed');
    const vuoto = $('feed-vuoto');
    disegnaFiltri();
    [...feed.querySelectorAll('.giorno, .c-piu')].forEach((e) => e.remove());
    const visibili = note.filter((n) => {
      if (filtro === 'tutti') return true;
      if (filtro === 'perte') return perMe(n);
      return n.agente === filtro || (n.per || []).indexOf(filtro) >= 0;
    });
    vuoto.hidden = visibili.length > 0;
    let gruppo = null;
    let chiave = '';
    visibili.slice(0, quante).forEach((n) => {
      const d = new Date(n.quando);
      const k = isNaN(d) ? '?' : d.toDateString();
      if (k !== chiave) {
        chiave = k;
        gruppo = document.createElement('section');
        gruppo.className = 'giorno';
        const h = document.createElement('h3');
        h.textContent = isNaN(d) ? 'Data sconosciuta' : giorno(d);
        gruppo.appendChild(h);
        feed.appendChild(gruppo);
      }
      gruppo.appendChild(carta(n, false));
    });
    if (visibili.length > quante) {
      const altre = document.createElement('button');
      altre.type = 'button';
      altre.className = 'c-piu';
      altre.textContent = `Mostra le note più vecchie (${visibili.length - quante})`;
      altre.addEventListener('click', () => { quante += PASSO; disegnaFeed(); });
      feed.appendChild(altre);
    }
  }

  function disegnaAnteprima() {
    const lista = $('ant-lista');
    const oggi = new Date().toDateString();
    const diOggi = note.filter((n) => new Date(n.quando).toDateString() === oggi).length;
    const limite = Date.now() - 14 * 864e5;
    const perTe = note.filter((n) => perMe(n) && new Date(n.quando).getTime() >= limite);
    const pezzi = [diOggi === 0 ? 'Nessuna nota oggi' : diOggi === 1 ? '1 nota oggi' : `${diOggi} note oggi`];
    if (perTe.length) pezzi.push(perTe.length === 1 ? '1 per te negli ultimi 14 giorni' : `${perTe.length} per te negli ultimi 14 giorni`);
    $('ant-sub').textContent = pezzi.join(' · ') + '.';
    lista.textContent = '';
    if (!note.length) {
      const v = document.createElement('p');
      v.className = 'c-vuoto';
      v.textContent = 'Ancora nessuna nota sulla bacheca.';
      lista.appendChild(v);
      return;
    }
    // prima le note per te degli ultimi 14 giorni, poi le più recenti, tre in tutto
    const scelte = perTe.slice(0, 3);
    note.forEach((n) => { if (scelte.length < 3 && scelte.indexOf(n) < 0) scelte.push(n); });
    scelte.sort((a, b) => (a.quando < b.quando ? 1 : -1));
    scelte.forEach((n) => lista.appendChild(carta(n, true)));
    return diOggi;
  }

  function statoBacheca(testo, classe) {
    const el = $('bach-stato');
    el.className = 'pill ' + classe;
    el.innerHTML = '<span class="dot"></span>';
    el.appendChild(document.createTextNode(testo));
  }

  function collegaScrivi() {
    const testo = $('nota-testo');
    const per = $('nota-per');
    const stato = $('nota-stato');
    const invia = $('nota-invia');
    const scatola = $('scrivi');
    testo.value = bozza;
    per.value = bozzaPer;
    scatola.open = scriviAperto;
    testo.addEventListener('input', () => { bozza = testo.value; });
    per.addEventListener('change', () => { bozzaPer = per.value; });
    scatola.addEventListener('toggle', () => { scriviAperto = scatola.open; });
    $('composer').addEventListener('submit', (e) => {
      e.preventDefault();
      const v = testo.value.trim();
      if (!v) { stato.textContent = 'Scrivi qualcosa prima di lasciare la nota.'; return; }
      invia.disabled = true;
      stato.textContent = 'Salvo la nota…';
      scriviNota(v, per.value)
        .then((nota) => {
          testo.value = '';
          bozza = '';
          stato.textContent = 'Nota lasciata. Gli agenti la leggeranno al prossimo giro.';
          note = [nota, ...note];
          disegnaFeed();
          disegnaAnteprima();
        })
        .catch((err) => { stato.textContent = err.message; })
        .finally(() => { invia.disabled = false; });
    });
  }

  addEventListener('resize', disegnaGrafici);

  window.CruscottoApp = {
    // Disegna la pagina dentro `contenitore`.
    apri({ contenitore, chi, scrivi, vaiA }) {
      io = chi;
      scriviNota = scrivi;
      cambiaScheda = vaiA;
      contenitore.innerHTML = HTML;
      radice = contenitore.querySelector('.crusc');
      collegaScrivi();
      $('vai-bacheca').addEventListener('click', () => cambiaScheda('agenti'));
    },
    // I dati (dal foglio, o dalla copia del telefono se non c'è campo).
    aggiorna({ numeri, note: arrivate, alle, copia }) {
      if (!radice || !radice.isConnected) return;
      if (numeri && Array.isArray(numeri.lead) && numeri.lead.length && numeri.seo) {
        D = numeri;
        try { scriviNumeri(); } catch (e) { console.error(e); }
      } else {
        senzaNumeri('Il primo giro di ogni mattina non è ancora arrivato.');
      }
      note = arrivate || [];
      disegnaFeed();
      const diOggi = disegnaAnteprima();
      giaViste = {};
      note.forEach((n) => { giaViste[n.id] = true; });
      statoBacheca(copia ? `senza campo: copia delle ${alle}` : `aggiornata alle ${alle}`, copia ? 'warn' : 'ok');
      disegnaGrafici();
      return diOggi || 0;
    },
    // Una scheda nascosta non ha larghezza: i grafici si rifanno quando si vede.
    mostra(scheda) {
      if (!radice) return;
      $('p-numeri').hidden = scheda !== 'numeri';
      $('p-agenti').hidden = scheda !== 'agenti';
      $('snapshot').hidden = scheda !== 'numeri';
      if (scheda === 'numeri') {
        disegnaGrafici();
        // La ragnatela è più larga del telefono: si parte dal Direttore, al centro.
        const web = radice.querySelector('.web-scroll');
        if (web) web.scrollLeft = (web.scrollWidth - web.clientWidth) / 2;
      }
    },
  };
})();
