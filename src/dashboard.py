"""Genera il cruscotto: una pagina HTML unica, senza server e senza dipendenze esterne.

Legge i risultati in data/processed e data/raw e scrive docs/index.html, che GitHub
Pages pubblica così com'è. I calcoli degli scenari sono rifatti nel browser con le
stesse formule dei moduli 4 e 5; un test automatico verifica che coincidano.

Uso: python src/dashboard.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, DOCS = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "docs"
REPO = "https://github.com/sqsw5ryvdh-netizen/euro-stablecoin-exposure"


def build_data() -> dict:
    m3 = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    month = m3.mese.max()
    w = m3[m3.mese == month].pivot(index="paese", columns="serie", values="milioni_eur") / 1000
    retail = pd.read_csv(PROC / "m5_retail_share.csv", index_col=0)
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    m1 = json.loads((PROC / "m1_level.json").read_text())
    m2 = json.loads((PROC / "m2_summary.json").read_text())
    m5 = json.loads((PROC / "m5_summary.json").read_text())
    mp = pd.read_csv(PROC / "m5_two_channel_map.csv", index_col=0)
    r3_path = PROC / "m4_r3_weights.csv"
    r3 = pd.read_csv(r3_path, index_col=0) if r3_path.exists() else None

    countries = []
    for code in sorted(w.index, key=lambda k: retail.loc[k, "nome"]):
        c = {"code": code, "nome": retail.loc[code, "nome"], "vista": float(w.loc[code, "vista_fam"] + w.loc[code, "vista_imp"]),
             "clientela": float(w.loc[code, "dep_fam"] + w.loc[code, "dep_imp"]), "ingrosso": float(w.loc[code, "titoli"] + w.loc[code, "dep_ifm"]),
             "totale": float(w.loc[code, "totale"]), "prestiti": float(retail.loc[code, "prestiti"]),
             "retailAlta": bool(retail.loc[code, "quota_retail_alta"]), "pop": float(inp["popolazione"][code]),
             "c1": float(mp.loc[code, "depositi_a_vista"]), "usd": float(mp.loc[code, "dollari"]),
             "fonteUsd": str(mp.loc[code, "fonte_dollari"]), "quadrante": str(mp.loc[code, "quadrante"])}
        if r3 is not None:
            c["r3"] = float(r3.loc[code, "peso"])
            c["r3Quota"] = float(r3.loc[code, "quota_possessori"])
            c["r3Imputato"] = bool(r3.loc[code, "imputato"])
        countries.append(c)

    idx = pd.read_csv(PROC / "m2_weekly_index.csv", index_col=0)
    flags = m2.get("segnalazione", {})
    own_path = PROC / "level_own.json"
    own = json.loads(own_path.read_text()) if own_path.exists() else None
    rules = [{"id": "R1", "nome": "R1 - in proporzione ai depositi a vista"}, {"id": "R2", "nome": "R2 - pro capite"}]
    if r3 is not None:
        rules.append({"id": "R3", "nome": "R3 - in proporzione ai possessori di cripto-attività"})
    presets = []
    if own is not None:
        presets.append({"nome": "Minimo proprio", "usd": round(own["B1"]["famiglie"]["minimo_mld_eur"] * m1["cambio"]["usd_per_eur"], 1)})
    presets += [{"nome": "Oggi, quota 7,5%", "usd": round(m1["livello"]["base_mld_usd"], 1)},
               {"nome": "Oggi, quota 15%", "usd": round(m1["livello"]["alto_mld_usd"], 1)},
               {"nome": "ESM base 2030", "usd": 143}, {"nome": "ESM alto 2030", "usd": 300}, {"nome": "ESM alto, quota 15%", "usd": 600}]
    return {
        "generato": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "meseBilanci": month, "fx": inp["usd_per_eur"], "dataCambio": inp["data_cambio"],
        "coef": {"uniforme": m5["coefficienti"]["regola_uniforme"], "sd": m5["coefficienti"]["deviazione_standard_pp"],
                 "basso": m5["coefficienti"]["col3"]["basso"], "alto": m5["coefficienti"]["col3"]["alto"]},
        "sogliaRetail": m5["soglia_quota_retail"]["valore"],
        "countries": countries, "rules": rules, "presets": presets,
        "mappa": {"medX": m5["mappa"]["mediana_depositi_a_vista"], "medY": m5["mappa"]["mediana_dollari"], "trimestre": m5["mappa"]["trimestre_bri"]},
        "livello": {"data": m1["data_circolazione"], "baseEur": m1["livello"]["base_mld_eur"], "altoEur": m1["livello"]["alto_mld_eur"],
                    "baseUsd": m1["livello"]["base_mld_usd"], "altoUsd": m1["livello"]["alto_mld_usd"],
                    "proprio": None if own is None else own["verdetto"],
                    "b1": None if own is None else {k: own["B1"]["famiglie"][f"{k}_mld_eur"] for k in ("minimo", "centrale", "massimo")}},
        "indice": {"settimane": idx.index.tolist(), "usdt": idx.usdt.round(5).tolist(), "usdt_nc": idx.usdt_senza_coinbase.round(5).tolist(),
                   "usdc": idx.usdc.round(5).tolist(), "usdc_nc": idx.usdc_senza_coinbase.round(5).tolist(),
                   "volEurUsdt": idx.volume_eur_usdt_mld.round(4).tolist(), "volEurUsdc": idx.volume_eur_usdc_mld.round(4).tolist()},
        "segnalazione": flags.get("ultima_settimana", {}),
        "repo": REPO,
    }


def main() -> None:
    data = build_data()
    html = TEMPLATE.replace("__DATA__", json.dumps(data, ensure_ascii=False, separators=(",", ":"))).replace("__MODEL__", MODEL_JS)
    DOCS.mkdir(exist_ok=True)
    (DOCS / "index.html").write_text(html, encoding="utf-8")
    (DOCS / ".nojekyll").write_text("")
    print(f"scritto docs/index.html: {len(html) / 1024:.0f} KB, {len(data['countries'])} paesi, {len(data['indice']['settimane'])} settimane")


# Funzioni pure, senza accesso alla pagina: sono le stesse formule dei moduli 4 e 5.
# Il test tests/test_program.py le esegue con node e le confronta con i risultati Python.
MODEL_JS = r"""
function allocate(D, amountUsd, rule, sigma) {
  const eur = amountUsd / D.fx * sigma;
  const w = D.countries.map(c => rule === 'R1' ? c.vista : rule === 'R2' ? c.pop : c.r3);
  const W = w.reduce((a, b) => a + b, 0);
  return D.countries.map((c, i) => Math.min(eur * w[i] / W, c.vista));
}
function credit(D, c, outflow, variant) {
  const sd = 100 * outflow / c.totale / D.coef.sd;
  const low = D.coef.basso * sd / 100 * c.prestiti, high = D.coef.alto * sd / 100 * c.prestiti;
  if (variant === 'uniforme') return D.coef.uniforme * outflow;
  if (variant === 'basso') return low;
  if (variant === 'alto') return high;
  return c.retailAlta ? high : low;
}
function compute(D, amountUsd, rule, sigma, variant) {
  const out = allocate(D, amountUsd, rule, sigma);
  return D.countries.map((c, i) => {
    const cr = credit(D, c, out[i], variant);
    return {code: c.code, nome: c.nome, deflusso: out[i], persiVista: out[i] / c.vista, effettoPp: 100 * out[i] / c.totale,
            aumentoIngrosso: out[i] / c.ingrosso, credito: cr, creditoPct: 100 * cr / c.prestiti};
  });
}
function totals(D, rows) {
  const s = k => D.countries.reduce((a, c) => a + c[k], 0);
  const f = rows.reduce((a, r) => a + r.deflusso, 0), cr = rows.reduce((a, r) => a + r.credito, 0);
  return {deflusso: f, persiVista: f / s('vista'), effettoPp: 100 * f / s('totale'), aumentoIngrosso: f / s('ingrosso'),
          credito: cr, creditoPct: 100 * cr / s('prestiti')};
}
"""

TEMPLATE = r"""<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stablecoin in dollari e banche dell'area euro</title>
<style>
:root{--surface:#fcfcfb;--panel:#ffffff;--ink:#0b0b0b;--ink2:#52514e;--grid:#e4e3df;--s1:#2a78d6;--s2:#eb6834;--soft:#cde2fb;--band:#f3f2ee}
@media (prefers-color-scheme: dark){:root{--surface:#1a1a19;--panel:#232322;--ink:#f0efec;--ink2:#c3c2b7;--grid:#3a3a37;--s1:#3987e5;--s2:#d95926;--soft:#184f95;--band:#2a2a28}}
*{box-sizing:border-box}
body{margin:0;background:var(--surface);color:var(--ink);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:1120px;margin:0 auto;padding:20px 16px 48px}
h1{font-size:1.5rem;line-height:1.25;margin:0 0 6px}
h2{font-size:1.1rem;margin:0 0 4px}
p{margin:0 0 10px}
.muted{color:var(--ink2)}
.small{font-size:.86rem}
section{background:var(--panel);border:1px solid var(--grid);border-radius:10px;padding:16px;margin-top:16px}
.controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px 22px;align-items:end}
label{display:block;font-size:.86rem;color:var(--ink2);margin-bottom:4px}
input[type=range]{width:100%;accent-color:var(--s1)}
select,button{font:inherit;color:var(--ink);background:var(--surface);border:1px solid var(--grid);border-radius:6px;padding:6px 9px}
button{cursor:pointer}
button:hover,select:hover{border-color:var(--ink2)}
.presets{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.big{font-size:1.25rem;font-weight:600;font-variant-numeric:tabular-nums}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-top:14px}
.tile{border:1px solid var(--grid);border-radius:8px;padding:10px 12px}
.tile .v{font-size:1.45rem;font-weight:600;font-variant-numeric:tabular-nums}
.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th,td{padding:6px 8px;text-align:right;border-bottom:1px solid var(--grid);white-space:nowrap}
th:first-child,td:first-child{text-align:left}
th{font-weight:600;font-size:.84rem;color:var(--ink2);cursor:pointer;user-select:none;position:sticky;top:0;background:var(--panel)}
th[aria-sort]{color:var(--ink)}
tfoot td{font-weight:600;border-top:2px solid var(--grid);border-bottom:0}
.bar{display:inline-block;height:8px;border-radius:0 4px 4px 0;background:var(--s1);vertical-align:middle;margin-right:6px}
.tag{font-size:.74rem;border:1px solid var(--grid);border-radius:4px;padding:0 5px;color:var(--ink2);margin-left:6px}
svg{display:block;width:100%;height:auto;overflow:visible}
svg text{fill:var(--ink2);font-size:11px}
.legend{display:flex;flex-wrap:wrap;gap:14px;font-size:.86rem;color:var(--ink2);margin:6px 0}
.sw{display:inline-block;width:12px;height:12px;border-radius:2px;vertical-align:-1px;margin-right:5px}
#tip{position:fixed;pointer-events:none;background:var(--ink);color:var(--surface);padding:7px 9px;border-radius:6px;font-size:.82rem;line-height:1.35;max-width:270px;display:none;z-index:9}
.two{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}
.two>section{margin-top:0}
.wrapgrid{margin-top:16px}
ul{margin:6px 0 0;padding-left:20px}
a{color:var(--s1)}
.state{font-weight:600}
</style>
</head>
<body>
<main>
<h1>Stablecoin in dollari e banche dell'area euro</h1>
<p class="muted">Quanto peserebbe sulla raccolta e sul credito di ciascun paese un dato importo di USDT e USDC detenuto dai residenti. Bilanci di <span id="mese"></span>; pagina generata il <span id="gen"></span>.</p>
<p class="small muted">È un calcolo contabile su ipotesi, non una previsione. Il programma non misura quante stablecoin detengono i residenti: l'importo lo scegli tu.</p>

<section aria-label="Scenario">
  <div class="controls">
    <div>
      <label for="amount">Stablecoin in dollari detenute nell'area euro</label>
      <div class="big"><span id="amountOut"></span> mld $ <span class="muted small" id="amountEur"></span></div>
      <input id="amount" type="range" min="0" max="700" step="1">
    </div>
    <div>
      <label for="sigma">Quota finanziata con depositi bancari</label>
      <div class="big"><span id="sigmaOut"></span>%</div>
      <input id="sigma" type="range" min="0" max="100" step="5" value="100">
    </div>
    <div>
      <label for="rule">Ripartizione tra paesi</label>
      <select id="rule"></select>
    </div>
    <div>
      <label for="variant">Dal deflusso al credito</label>
      <select id="variant">
        <option value="soglia">A soglia: coefficiente alto sopra la soglia retail</option>
        <option value="uniforme">Uniforme: 50 centesimi per euro</option>
        <option value="basso">Coefficiente basso per tutti</option>
        <option value="alto">Coefficiente alto per tutti</option>
      </select>
    </div>
  </div>
  <div class="presets" id="presets" aria-label="Livelli predefiniti"></div>
  <div class="tiles">
    <div class="tile"><div class="small muted">Depositi da sostituire</div><div class="v" id="kDefl"></div><div class="small muted" id="kDeflSub"></div></div>
    <div class="tile"><div class="small muted">Depositi a vista persi</div><div class="v" id="kVista"></div><div class="small muted">famiglie e imprese, area euro</div></div>
    <div class="tile"><div class="small muted">Raccolta all'ingrosso in più</div><div class="v" id="kIngr"></div><div class="small muted">rispetto a quella esistente</div></div>
    <div class="tile"><div class="small muted">Credito in meno, 24 mesi</div><div class="v" id="kCred"></div><div class="small muted" id="kCredSub"></div></div>
  </div>
  <p class="small muted" id="levelNote" style="margin-top:12px"></p>
</section>

<section aria-label="Paesi">
  <h2>Per paese</h2>
  <p class="small muted">Clicca un'intestazione per ordinare. <span class="tag">R</span> indica i paesi sopra la soglia di quota retail, a cui la variante "a soglia" applica il coefficiente alto.</p>
  <div class="scroll"><table id="tab"><thead><tr></tr></thead><tbody></tbody><tfoot><tr></tr></tfoot></table></div>
</section>

<div class="two wrapgrid">
<section aria-label="Mappa a due canali">
  <h2>Mappa a due canali</h2>
  <p class="small muted">Orizzontale: depositi a vista sul passivo. Verticale: passività in dollari sul passivo. Le linee tratteggiate sono le mediane dei 21 paesi.</p>
  <div class="legend"><span><span class="sw" style="background:var(--s1);border-radius:50%"></span>dollari: fonte BRI</span><span><span class="sw" style="background:var(--s2)"></span>dollari: fonte BSI trimestrale</span></div>
  <svg id="map" viewBox="0 0 520 400" role="img" aria-label="Mappa a due canali"></svg>
  <ul class="small muted">
    <li><b>A</b> depositi alti, dollari bassi: più esposti alla sostituzione dei depositi; il credito ne risente di più.</li>
    <li><b>B</b> entrambi alti: esposti su tutti e due i canali.</li>
    <li><b>C</b> depositi bassi, dollari alti: la politica monetaria interna incide meno sui prestiti, quella statunitense di più.</li>
    <li><b>D</b> entrambi bassi: i meno esposti.</li>
  </ul>
</section>
<section aria-label="Indice settimanale">
  <h2>Indice settimanale: quota EUR dei volumi stablecoin/fiat</h2>
  <p class="small muted">Misura trading in euro su exchange centralizzati, non detenzioni né residenza.</p>
  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label for="tok" style="margin:0">Stablecoin</label><select id="tok"><option value="usdt">USDT</option><option value="usdc">USDC</option></select><span class="small" id="flag"></span></div>
  <div class="legend"><span><span class="sw" style="background:var(--s1)"></span>tutti gli exchange</span><span><span class="sw" style="background:var(--s2)"></span>senza Coinbase</span></div>
  <svg id="idx" viewBox="0 0 520 300" role="img" aria-label="Indice settimanale"></svg>
</section>
</div>

<section aria-label="Avvertenze">
  <h2>Come leggere questa pagina</h2>
  <ul class="small">
    <li>Il deflusso assume che le stablecoin siano state comprate con depositi bancari, nella quota scelta. È un tetto.</li>
    <li>Il credito in meno applica coefficienti del Working Paper BCE 3199, stimati su singole banche, ad aggregati nazionali: ordini di grandezza, non previsioni.</li>
    <li>La ripartizione tra paesi è un'ipotesi: l'adozione per paese non è osservata.</li>
    <li>Nessun indicatore qui è un segnale anticipatore validato.</li>
  </ul>
  <p class="small muted" style="margin-top:10px">Metodo, fonti e limiti: <a id="lSpec">SPEC</a> · <a id="lSint">sintesi</a> · <a id="lRep">report</a>. Cambio BCE del <span id="fxd"></span>: <span id="fxv"></span> dollari per euro.</p>
</section>
</main>
<div id="tip" role="status"></div>
<script id="data" type="application/json">__DATA__</script>
<script id="model">__MODEL__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const $ = id => document.getElementById(id);
const nf = (x, d = 1) => x.toLocaleString('it-IT', {minimumFractionDigits: d, maximumFractionDigits: d});
const pc = (x, d = 1) => nf(100 * x, d) + '%';
const tip = $('tip');
function showTip(e, html) { tip.innerHTML = html; tip.style.display = 'block'; const w = tip.offsetWidth, x = Math.min(e.clientX + 14, innerWidth - w - 8); tip.style.left = x + 'px'; tip.style.top = (e.clientY + 14) + 'px'; }
function hideTip() { tip.style.display = 'none'; }
const svgEl = (tag, attrs, parent) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };

const state = {amount: (D.presets.find(p => p.nome.startsWith('Oggi, quota 7,5')) || D.presets[0]).usd, sigma: 1, rule: 'R1', variant: 'soglia', sort: 'effettoPp', dir: -1, tok: 'usdt'};
const COLS = [
  {k: 'nome', t: 'Paese'}, {k: 'deflusso', t: 'Deflusso (mld €)', f: v => nf(v, 1)}, {k: 'persiVista', t: 'Depositi a vista persi', f: v => pc(v, 1)},
  {k: 'effettoPp', t: 'Effetto sulla raccolta (punti del passivo)', f: v => nf(v, 2), bar: true}, {k: 'aumentoIngrosso', t: "Raccolta all'ingrosso in più", f: v => pc(v, 1)},
  {k: 'credito', t: 'Credito in meno (mld €)', f: v => nf(v, 1)}, {k: 'creditoPct', t: 'Credito in meno (% dei prestiti)', f: v => nf(v, 2) + '%'}];
let rows = [];

function render() {
  rows = compute(D, state.amount, state.rule, state.sigma, state.variant);
  const T = totals(D, rows);
  $('amountOut').textContent = nf(state.amount, state.amount < 100 ? 1 : 0);
  $('amountEur').textContent = '= ' + nf(state.amount / D.fx, 1) + ' mld €';
  $('sigmaOut').textContent = Math.round(state.sigma * 100);
  $('kDefl').textContent = nf(T.deflusso, 1) + ' mld €';
  $('kDeflSub').textContent = nf(T.effettoPp, 2) + ' punti del passivo';
  $('kVista').textContent = pc(T.persiVista, T.persiVista < 0.01 ? 2 : 1);
  $('kIngr').textContent = '+' + pc(T.aumentoIngrosso, T.aumentoIngrosso < 0.01 ? 2 : 1);
  $('kCred').textContent = nf(T.credito, 1) + ' mld €';
  $('kCredSub').textContent = nf(T.creditoPct, 2) + '% dei prestiti a famiglie e imprese';
  const max = Math.max(...rows.map(r => r.effettoPp), 1e-9);
  const sorted = rows.slice().sort((a, b) => state.sort === 'nome' ? state.dir * a.nome.localeCompare(b.nome) : state.dir * (a[state.sort] - b[state.sort]));
  const flag = Object.fromEntries(D.countries.map(c => [c.code, c.retailAlta]));
  $('tab').tHead.rows[0].innerHTML = COLS.map(c => `<th data-k="${c.k}" ${state.sort === c.k ? `aria-sort="${state.dir < 0 ? 'descending' : 'ascending'}"` : ''}>${c.t}${state.sort === c.k ? (state.dir < 0 ? ' ▼' : ' ▲') : ''}</th>`).join('');
  $('tab').tBodies[0].innerHTML = sorted.map(r => '<tr>' + COLS.map(c => c.k === 'nome' ? `<td>${r.nome}${flag[r.code] ? '<span class="tag" title="Sopra la soglia di quota retail">R</span>' : ''}</td>` : `<td>${c.bar ? `<span class="bar" style="width:${Math.round(70 * r[c.k] / max)}px"></span>` : ''}${c.f(r[c.k])}</td>`).join('') + '</tr>').join('');
  $('tab').tFoot.rows[0].innerHTML = COLS.map(c => c.k === 'nome' ? '<td>Area euro</td>' : `<td>${c.f(T[c.k])}</td>`).join('');
  drawMap();
}

function drawMap() {
  const s = $('map'); s.innerHTML = '';
  const m = {l: 44, r: 14, t: 12, b: 36}, W = 520, H = 400;
  const xs = D.countries.map(c => 100 * c.c1), ys = D.countries.map(c => 100 * c.usd);
  const xmax = Math.ceil(Math.max(...xs) / 10) * 10, ymax = Math.ceil(Math.max(...ys) / 5) * 5;
  const X = v => m.l + (W - m.l - m.r) * v / xmax, Y = v => H - m.b - (H - m.t - m.b) * v / ymax;
  for (let v = 0; v <= xmax; v += 10) { svgEl('line', {x1: X(v), x2: X(v), y1: m.t, y2: H - m.b, stroke: 'var(--grid)'}, s); svgEl('text', {x: X(v), y: H - m.b + 14, 'text-anchor': 'middle'}, s).textContent = v + '%'; }
  for (let v = 0; v <= ymax; v += 5) { svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: 'var(--grid)'}, s); svgEl('text', {x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end'}, s).textContent = v + '%'; }
  svgEl('line', {x1: X(100 * D.mappa.medX), x2: X(100 * D.mappa.medX), y1: m.t, y2: H - m.b, stroke: 'var(--ink2)', 'stroke-dasharray': '3 3'}, s);
  svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(100 * D.mappa.medY), y2: Y(100 * D.mappa.medY), stroke: 'var(--ink2)', 'stroke-dasharray': '3 3'}, s);
  [['A', W - m.r - 4, H - m.b - 6, 'end'], ['B', W - m.r - 4, m.t + 12, 'end'], ['C', m.l + 4, m.t + 12, 'start'], ['D', m.l + 4, H - m.b - 6, 'start']].forEach(q => { const t = svgEl('text', {x: q[1], y: q[2], 'text-anchor': q[3], style: 'font-size:14px;font-weight:600;fill:var(--ink)'}, s); t.textContent = q[0]; });
  svgEl('text', {x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle'}, s).textContent = 'Depositi a vista sul passivo';
  const byCode = Object.fromEntries(rows.map(r => [r.code, r]));
  // Etichette: per ogni punto si prova a destra-sopra, sinistra-sopra, destra-sotto, sinistra-sotto, e si tiene la prima posizione libera
  const pts = D.countries.map(c => [X(100 * c.c1), Y(100 * c.usd)]), placed = [];
  const free = (bx, by) => !placed.some(q => Math.abs(q[0] - bx) < 18 && Math.abs(q[1] - by) < 11) && !pts.some(q => Math.abs(q[0] - bx) < 11 && Math.abs(q[1] - (by - 4)) < 8);
  function labelPos(x, y) {
    const tries = [[x + 7, y - 5, 'start', 9], [x - 7, y - 5, 'end', -9], [x + 7, y + 13, 'start', 9], [x - 7, y + 13, 'end', -9], [x, y - 10, 'middle', 0], [x, y + 18, 'middle', 0]];
    for (const t of tries) { if (free(t[0] + t[3], t[1])) { placed.push([t[0] + t[3], t[1]]); return t; } }
    placed.push([x + 16, y - 5]); return tries[0];
  }
  D.countries.forEach(c => {
    const x = X(100 * c.c1), y = Y(100 * c.usd), col = c.fonteUsd === 'BRI' ? 'var(--s1)' : 'var(--s2)';
    const mark = c.fonteUsd === 'BRI' ? svgEl('circle', {cx: x, cy: y, r: 5, fill: col, stroke: 'var(--panel)', 'stroke-width': 2}, s) : svgEl('rect', {x: x - 4.5, y: y - 4.5, width: 9, height: 9, fill: col, stroke: 'var(--panel)', 'stroke-width': 2}, s);
    const pos = labelPos(x, y); svgEl('text', {x: pos[0], y: pos[1], 'text-anchor': pos[2]}, s).textContent = c.code;
    const hit = svgEl('circle', {cx: x, cy: y, r: 13, fill: 'transparent'}, s), r = byCode[c.code];
    const html = `<b>${c.nome}</b> · quadrante ${c.quadrante}<br>Depositi a vista: ${pc(c.c1)} del passivo<br>Passività in dollari: ${pc(c.usd)} (${c.fonteUsd})<br>Nello scenario: deflusso ${nf(r.deflusso, 1)} mld €, credito in meno ${nf(r.creditoPct, 2)}% dei prestiti`;
    hit.addEventListener('mousemove', e => showTip(e, html)); hit.addEventListener('mouseleave', hideTip);
  });
}

function drawIndex() {
  const s = $('idx'); s.innerHTML = '';
  const m = {l: 40, r: 46, t: 10, b: 26}, W = 520, H = 300, I = D.indice, n = I.settimane.length;
  const a = I[state.tok].map(v => 100 * v), b = I[state.tok + '_nc'].map(v => 100 * v);
  const ymax = Math.ceil(Math.max(...a, ...b) / 10) * 10, step = ymax > 40 ? 20 : 5;
  const X = i => m.l + (W - m.l - m.r) * i / (n - 1), Y = v => H - m.b - (H - m.t - m.b) * v / ymax;
  for (let v = 0; v <= ymax; v += step) { svgEl('line', {x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), stroke: 'var(--grid)'}, s); svgEl('text', {x: m.l - 6, y: Y(v) + 4, 'text-anchor': 'end'}, s).textContent = v + '%'; }
  I.settimane.forEach((w, i) => { if (w.slice(8) <= '07' && ['01', '04', '07', '10'].includes(w.slice(5, 7))) svgEl('text', {x: X(i), y: H - 8, 'text-anchor': 'middle'}, s).textContent = w.slice(5, 7) + '/' + w.slice(2, 4); });
  [[a, 'var(--s1)'], [b, 'var(--s2)']].forEach(([arr, col]) => { svgEl('path', {d: arr.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(v).toFixed(1)).join(''), fill: 'none', stroke: col, 'stroke-width': 2}, s); });
  let la = Y(a[n - 1]), lb = Y(b[n - 1]); if (Math.abs(la - lb) < 12) { const mid = (la + lb) / 2; if (la < lb) { la = mid - 6; lb = mid + 6; } else { la = mid + 6; lb = mid - 6; } }
  svgEl('text', {x: W - m.r + 5, y: la + 4}, s).textContent = nf(a[n - 1], 1) + '%'; svgEl('text', {x: W - m.r + 5, y: lb + 4}, s).textContent = nf(b[n - 1], 1) + '%';
  const cross = svgEl('line', {y1: m.t, y2: H - m.b, stroke: 'var(--ink2)', visibility: 'hidden'}, s);
  const hit = svgEl('rect', {x: m.l, y: m.t, width: W - m.l - m.r, height: H - m.t - m.b, fill: 'transparent'}, s);
  const vol = I[state.tok === 'usdt' ? 'volEurUsdt' : 'volEurUsdc'];
  hit.addEventListener('mousemove', e => { const r = s.getBoundingClientRect(), px = (e.clientX - r.left) * W / r.width, i = Math.max(0, Math.min(n - 1, Math.round((px - m.l) / (W - m.l - m.r) * (n - 1))));
    cross.setAttribute('x1', X(i)); cross.setAttribute('x2', X(i)); cross.setAttribute('visibility', 'visible');
    showTip(e, `<b>Settimana del ${I.settimane[i].split('-').reverse().join('/')}</b><br>Tutti gli exchange: ${nf(a[i], 1)}%<br>Senza Coinbase: ${nf(b[i], 1)}%<br>Volume contro euro: ${nf(vol[i], 2)} mld $`); });
  hit.addEventListener('mouseleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
  const f = D.segnalazione[state.tok];
  $('flag').innerHTML = f ? `Ultima settimana: <span class="state">${f.stato}</span> <span class="muted">(scarto della quota ${nf(f.scarto_quota, 1)}, del volume ${nf(f.scarto_volume, 1)})</span>` : '';
}

function init() {
  $('mese').textContent = D.meseBilanci.split('-').reverse().join('/'); $('gen').textContent = D.generato.split('-').reverse().join('/');
  $('fxd').textContent = D.dataCambio.split('-').reverse().join('/'); $('fxv').textContent = nf(D.fx, 4);
  $('lSpec').href = D.repo + '/blob/main/SPEC.md'; $('lSint').href = D.repo + '/blob/main/SINTESI.md'; $('lRep').href = D.repo + '/tree/main/reports';
  $('rule').innerHTML = D.rules.map(r => `<option value="${r.id}">${r.nome}</option>`).join('');
  $('presets').innerHTML = D.presets.map((p, i) => `<button data-i="${i}">${p.nome}: ${nf(p.usd, p.usd < 100 ? 1 : 0)}</button>`).join('');
  $('presets').addEventListener('click', e => { const i = e.target.dataset.i; if (i !== undefined) { state.amount = D.presets[i].usd; $('amount').value = state.amount; render(); } });
  $('amount').value = state.amount;
  $('amount').addEventListener('input', e => { state.amount = +e.target.value; render(); });
  $('sigma').addEventListener('input', e => { state.sigma = e.target.value / 100; render(); });
  $('rule').addEventListener('change', e => { state.rule = e.target.value; render(); });
  $('variant').addEventListener('change', e => { state.variant = e.target.value; render(); });
  $('tok').addEventListener('change', e => { state.tok = e.target.value; drawIndex(); });
  $('tab').tHead.addEventListener('click', e => { const k = e.target.dataset.k; if (!k) return; if (state.sort === k) state.dir = -state.dir; else { state.sort = k; state.dir = k === 'nome' ? 1 : -1; } render(); });
  const L = D.livello; let note = `Livello secondo l'ipotesi ESM al ${L.data.split('-').reverse().join('/')}: ${nf(L.baseUsd, 1)} mld $ con quota 7,5% e ${nf(L.altoUsd, 1)} con quota 15%.`;
  if (L.b1 && L.proprio) note += L.proprio.esito === 'intervallo proprio'
    ? ` Intervallo proprio del programma: da ${nf(L.proprio.intervallo_mld_eur[0], 1)} a ${nf(L.proprio.intervallo_mld_eur[1], 1)} mld €.`
    : ` Stima propria dal basso, dall'indagine BCE: ${nf(L.b1.centrale, 1)} mld € al centro; il programma pubblica come proprio solo il minimo, ${nf(L.b1.minimo, 1)} mld €, perché le altre strade non la confermano.`;
  $('levelNote').textContent = note;
  render(); drawIndex();
}
init();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
