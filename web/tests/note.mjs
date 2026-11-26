// Genera la nota metodologica in inglese (public/methodological-note.pdf, due pagine A4), scaricabile da
// "Method and data". Il testo è qui; i numeri vengono dai file di dati dell'applicazione, quindi la nota va
// rigenerata dopo ogni aggiornamento dei dati (lo fa l'aggiornamento automatico, prima della compilazione).
// Uso: npm run note
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const data = async (f) => JSON.parse(await readFile(join(here, "../public/data", f), "utf-8"));
const [ov, sim, mon, bk, meta, lv] = await Promise.all(["overview.json", "simulator.json", "monitor.json", "banks.json", "meta.json", "level.json"].map(data));
const font = async (pkg, file) => (await readFile(join(here, `../node_modules/@fontsource-variable/${pkg}/files/${file}`))).toString("base64");
const serif = await font("source-serif-4", "source-serif-4-latin-wght-normal.woff2"), sans = await font("inter", "inter-latin-wght-normal.woff2");

const n = (x, d = 1) => x.toLocaleString("en-GB", { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (x, d = 1) => n(100 * x, d) + "%";
const day = (iso) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso.slice(0, 10) + "T00:00:00Z"));
const month = (ym) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(ym + "-01T00:00:00Z"));
const NAMES = { AT: "Austria", BE: "Belgium", BG: "Bulgaria", CY: "Cyprus", DE: "Germany", EE: "Estonia", ES: "Spain", FI: "Finland", FR: "France", GR: "Greece", HR: "Croatia", IE: "Ireland", IT: "Italy", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", MT: "Malta", NL: "Netherlands", PT: "Portugal", SI: "Slovenia", SK: "Slovakia" };
const top = (f) => [...sim.paesi].sort((a, b) => f(b) - f(a)).slice(0, 3).map((c) => `${NAMES[c.code]} (${pct(f(c))})`).join(", ");
const k = sim.coefficienti, L = ov.livello, C = ov.scenarioCentrale, stat = mon.statistiche, cmp = bk.confronto;
const updated = day(meta.aggiornamento.eseguitoIl ?? meta.generato_il);

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Euro Stablecoin Exposure Monitor - Methodological note</title><style>
@font-face{font-family:T;src:url(data:font/woff2;base64,${serif}) format("woff2");font-weight:200 900}
@font-face{font-family:S;src:url(data:font/woff2;base64,${sans}) format("woff2");font-weight:100 900}
@page{size:A4;margin:15mm 16mm 14mm}
*{box-sizing:border-box}body{margin:0;font:8.6pt/1.42 S,sans-serif;color:#0f1b2d;font-feature-settings:"tnum" 1}
h1{font:600 19pt/1.15 T,serif;margin:0;color:#163b6e}h2{font:600 11pt/1.2 T,serif;color:#163b6e;margin:9pt 0 3pt;border-bottom:1px solid #d8dde6;padding-bottom:2pt}
p{margin:0 0 4pt}ul{margin:0 0 4pt;padding-left:13pt}li{margin-bottom:1.6pt}
.head{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #163b6e;padding-bottom:5pt;margin-bottom:6pt}
.meta{font-size:7.4pt;color:#45526a;text-align:right;line-height:1.35}.lead{font-size:9.4pt;color:#45526a}
table{border-collapse:collapse;width:100%;font-size:7.9pt;margin:2pt 0 5pt}th,td{text-align:left;padding:2.2pt 5pt 2.2pt 0;border-bottom:1px solid #d8dde6;vertical-align:top}th{font-weight:600;color:#45526a;border-bottom-color:#7e899c}
.f{font-family:S;background:#eef1f6;border-radius:3pt;padding:3pt 6pt;margin:2pt 0 4pt;font-size:8.2pt}
.box{border:1px solid #163b6e;border-left-width:3pt;border-radius:4pt;padding:5pt 8pt;margin:4pt 0}.box p:last-child{margin:0}
.cols{columns:2;column-gap:16pt}.cols>*{break-inside:avoid}
.foot{font-size:7.2pt;color:#45526a;border-top:1px solid #d8dde6;padding-top:3pt;margin-top:6pt;display:flex;justify-content:space-between}
.page2{break-before:page}b{font-weight:600}
</style></head><body>
<div class="head"><div><h1>Euro Stablecoin Exposure Monitor</h1><div class="lead">Methodological note · version 1.1 · Lorenzo Bianchi</div></div>
<div class="meta">Data updated on ${updated}<br>Bank balance sheets of ${month(sim.meseBilanci)}<br>Independent university project (ESCP Business School)</div></div>

<p class="lead">The programme estimates a range for the dollar stablecoins (USDT, USDC) held by euro area residents and computes, for any level of adoption, the effect on bank deposits, wholesale funding and credit, by country and by bank. It is descriptive: scenarios are assumptions, not forecasts. Reference: ECB Working Paper No 3199, "Stablecoins and monetary policy transmission" (March 2026).</p>

<h2>1. Sources</h2>
<table><tr><th style="width:36%">Source</th><th style="width:40%">Used for</th><th>Frequency, coverage</th></tr>
<tr><td>ECB, MFI balance sheet items (BSI)</td><td>Funding structure, deposits, loans, scenarios</td><td>Monthly, 21 countries</td></tr>
<tr><td>ECB Consumer Expectations Survey, Economic Bulletin 7/2026</td><td>Level estimate: share of holders, amounts held</td><td>August and November 2025, 11 countries</td></tr>
<tr><td>ECB SPACE 2024 survey</td><td>Crypto-asset owners by country (allocation rule R3)</td><td>20 countries, one imputed</td></tr>
<tr><td>ECB Working Paper 3199</td><td>Credit coefficients, retail-share definition</td><td>Published estimates</td></tr>
<tr><td>ESM Working Paper 79</td><td>Comparison level (7.5% and 15% of supply), scenarios</td><td>Published assumption</td></tr>
<tr><td>EBA 2025 EU-wide transparency exercise</td><td>Individual banks: deposits by sector, loans, assets</td><td>30 June 2025, ${bk.criterio.complete} banks, ${bk.criterio.paesi} countries</td></tr>
<tr><td>BIS locational banking statistics; ECB quarterly BSI by currency</td><td>Dollar liabilities of banks</td><td>Quarterly; BIS for 13 countries, BSI for 8</td></tr>
<tr><td>ECB reference rate; ECB consolidated banking data</td><td>Single dollar/euro rate; sample coverage</td><td>Daily; quarterly</td></tr>
<tr><td>Eurostat; GISCO</td><td>Population, households; country boundaries</td><td>Annual</td></tr>
<tr><td>DefiLlama (checked against CoinGecko); public APIs of ${mon.pannello.exchange} exchanges</td><td>Supply in circulation; weekly index of trading against the euro</td><td>Daily; daily volumes</td></tr></table>
<p>All sources are public and free. The data are refreshed every Monday by an automated run; if a source does not respond, the last valid data are kept and flagged in the application.</p>

<h2>2. Level: how much is held</h2>
<div class="f">level = households × share holding stablecoins × average amount held × dollar share</div>
<p>Households of the 21 countries (${n(lv.unita.famiglie / 1e6)} million, Eurostat); ${pct(lv.quotaDetentori)} report holding stablecoins; the average amount comes from the survey's nine amount bands (midpoints for the centre, band limits for the range); ${pct(lv.quotaDollari.centrale, 0)} is taken to be in dollars (${pct(lv.quotaDollari.minimo, 0)} to ${pct(lv.quotaDollari.massimo, 0)} in the range). The survey question refers to the household, so households are the consistent unit; applying it to individuals counts the same household several times and is reported only as a declared upper extreme. The ESM assumption (7.5% of USDT and USDC in circulation) is shown for comparison, not used as the reference.</p>

<h2>3. Structure: where funding is exposed</h2>
<div class="f">indicator = 0.50 z(C1) + 0.25 z(C2) + 0.25 z(C3)</div>
<p>C1 is sight deposits of households and firms over total liabilities, C2 the sight share of their deposits, C3 the reliance on deposits relative to wholesale funding; z is the standardised value across the 21 countries. Weights were fixed before looking at the ranking, which is stable under five alternative weightings. A second axis, dollar liabilities over total liabilities, splits countries at the two medians into four quadrants (the two-channel map).</p>

<h2>4. Scenario: from adoption to deposits</h2>
<div class="f">outflow<sub>c</sub> = amount × share funded out of deposits × w<sub>c</sub> / Σw &nbsp;&nbsp;(capped at the deposits of the chosen type)</div>
<p>The weights w follow one of three rules: in proportion to deposits (R1), per capita (R2), by crypto-asset owners (R3). The deposits hit are sight deposits of households and firms (T1), of households only (T2) or all their deposits (T3). Reported per country: outflow, share of sight deposits lost, effect on funding (outflow over total liabilities, in points) and extra wholesale funding (outflow over debt securities issued plus deposits from banks). All scenario figures are recomputed in the browser and tested against the Python modules.</p>

<div class="page2"></div>
<h2>5. Credit: from deposits to loans</h2>
<div class="f">uniform: loans = ${n(k.uniforme, 1)} × outflow &nbsp;&nbsp;|&nbsp;&nbsp; low/high: loans = β × (100 × outflow / liabilities ÷ ${n(k.sd, 1)}) / 100 × loans to households and firms</div>
<p>The headline figure uses the uniform rule of Working Paper 3199 (about EUR 50 billion fewer loans per EUR 100 billion fewer retail deposits). The range uses its two estimated coefficients, β = ${n(k.basso, 3)} for banks with a low retail share and β = ${n(k.alto, 3)} for a high one, per standard deviation (${n(k.sd, 1)} points) of sight deposits over total assets, cumulated over 24 months. Retail share = household deposits / (household deposits + deposits of non-bank financial firms); "high" means above the 75th percentile. Two sensitivity variants apply the high coefficient only above the threshold, or interpolate between the medians of the two groups.</p>
<p><b>Uncertainty range.</b> The range shown with each scenario combines the interval of the level estimate, a share funded out of deposits from 50% to 100% and, for credit, the low and high coefficients. It is not a confidence interval.</p>

<h2>6. Individual banks</h2>
<p>Each bank of the EBA sample loses the same share of deposits as its country in the scenario; the high or low coefficient is applied according to the bank's own retail share (threshold across banks: ${pct(bk.soglia)}; ${bk.banchesSopra} banks above). Summed over the covered countries this gives ${n(cmp.m6_per_euro, 2)} euro of credit per euro of outflow, against ${n(cmp.m5_soglia / cmp.deflusso_paesi_coperti, 2)} for the country-level threshold variant, ${n(cmp.m5_continua / cmp.deflusso_paesi_coperti, 2)} for the continuous one and ${n(k.uniforme, 2)} for the uniform rule. The sample covers ${pct(bk.copertura.bsi, 0)} of the assets of resident banks (${pct(bk.copertura.consolidato, 0)} of consolidated assets). These are public bank-level data, not supervisory data, and the ordering is not a judgement on soundness.</p>

<h2>7. Weekly monitor</h2>
<div class="f">EUR share = volume of stablecoin/EUR pairs ÷ volume of stablecoin pairs against all fiat currencies, per week</div>
<p>Four series (USDT and USDC, with and without Coinbase) from daily volumes of ${mon.pannello.exchange} centralised exchanges. A week is <i>flagged</i> when both the EUR share and the volume against the euro deviate by more than two standard deviations from the previous 52 weeks, with the same sign; <i>to be checked</i> when only one does. A pre-registered test found no predictive content of the index for households' sight deposits (p = ${n(mon.testPredittivo.pValue, 2)}): the index describes trading, it is not an early warning.</p>

<div class="box"><p><b>Figures at the latest data (${updated}).</b> Estimated level: EUR ${n(L.centrale)} billion, range ${n(L.minimo)} to ${n(L.massimo)} (declared upper extreme ${n(L.estremoSuperiore)}); ESM assumption for comparison: EUR ${n(L.esmBase)} billion. At the central level the area would replace ${pct(C.depositiAVistaPersi, 2)} of its sight deposits, with EUR ${n(C.creditoUniforme)} billion less credit over two years (range ${n(C.creditoBasso)} to ${n(C.creditoAlto)}). Highest sight deposits over liabilities: ${top((c) => c.c1)}. Highest dollar liabilities: ${top((c) => c.usd)}. Latest EUR share of trading volumes: USDT ${pct(stat.usdt.valore)}, USDC ${pct(stat.usdc.valore)}. Dollar amounts converted at ${n(sim.cambioUsdPerEur, 4)} dollars per euro (ECB reference rate of ${day(sim.dataCambio)}).</p></div>

<h2>8. Limits</h2>
<ul>
<li><b>No measurement of residence.</b> Holdings by euro area residents are not observed. The level is a survey-based estimate from 11 countries extended to 21; two other routes attempted (exchange reserves, national registers) did not confirm it. The reference level was adopted by decision after seeing the results, overriding the pre-registered criterion, and this is recorded in the specification.</li>
<li><b>No country-level adoption.</b> The allocation rules distribute a total; they do not measure national holdings.</li>
<li><b>No causal estimate.</b> Credit effects apply published coefficients, estimated on individual banks, to national aggregates and to consolidated banks: orders of magnitude, not forecasts.</li>
<li><b>No early warning.</b> The flagging rule marks unusual weeks; it does not anticipate outflows.</li>
<li><b>Rankings describe funding structure,</b> not the probability of outflows nor the soundness of any country's banks or of any bank.</li>
<li><b>Bank data</b> are consolidated groups including activities outside the euro area, dated June 2025, with no currency breakdown; three countries have no bank in the sample.</li>
<li><b>Not covered:</b> over-the-counter and peer-to-peer trading, decentralised finance, stablecoins other than USDT and USDC, future adoption.</li>
</ul>
<p>Full specification, decision log, reports, code and data: github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure. Application: lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure.</p>
<div class="foot"><span>Euro Stablecoin Exposure Monitor · methodological note · generated from the data updated on ${updated}</span><span>Independent university project (ESCP Business School). Not affiliated with any institution whose data it uses.</span></div>
</body></html>`;

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const page = await browser.newPage();
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
if (process.env.NOTE_PREVIEW) { // anteprima come immagine, per controllarla a vista: larghezza del foglio meno i margini
  await page.setViewportSize({ width: 673, height: 1000 });
  await page.screenshot({ path: process.env.NOTE_PREVIEW, fullPage: true });
}
await browser.close();
const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
if (pages !== 2) { console.error(`la nota metodologica deve essere di due pagine, ne ha ${pages}: accorciare il testo`); process.exit(1); }
await writeFile(join(here, "../public/methodological-note.pdf"), pdf);
console.log(`scritta public/methodological-note.pdf: ${pages} pagine, ${Math.round(pdf.length / 1024)} kB`);
