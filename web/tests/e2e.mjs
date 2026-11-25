// Test nel browser dell'applicazione compilata (docs/). Per ogni sezione, in inglese e in italiano:
// nessun errore in console, nessuno sbordo a 390 pixel, nessuna stringa non tradotta; le tabelle
// non hanno colonne tagliate a 1280 pixel e sotto scorrono al proprio interno con la prima colonna
// fissa. Poi: indirizzo condivisibile, cambio lingua, indicatore delle fonti, avvertenze
// espandibili, riquadri della mappa, rapporto stampabile A e B, sezione Banche, e cosa viene
// scaricato all'avvio. Salva uno screenshot di ogni sezione in reports/figures/app/.
// Uso: npm run build && npm run e2e   (usa il Chrome installato; CHROME_CHANNEL=chromium per quello di Playwright)
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir, unlink } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const DOCS = resolve(here, "../../docs"), SHOTS = resolve(here, "../../reports/figures/app");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/markdown", ".svg": "image/svg+xml" };
const banks = JSON.parse(await readFile(join(DOCS, "data/banche.json"), "utf-8"));
const firstBank = [...banks.banche].sort((a, b) => b.attivo - a.attivo)[0];
const SECTIONS = [["01_overview", "overview"], ["02_simulator", "simulator"], ["03_map", "map"], ["04_country", "country/IT"], ["05_banks", "banks"], ["06_bank_sheet", `banks/${firstBank.lei}`],
                  ["07_channels", "channels"], ["08_monitor", "monitor"], ["09_level", "level"], ["10_compare", "compare"], ["11_method", "method"]];
// parole che non devono comparire nell'altra lingua; i nomi delle banche sono tolti prima del controllo
const SENTINELS = { en: [" della ", " delle ", " dei ", " sono ", " paesi", " depositi", " banche ", " con ", " gli ", " nella "], it: [" the ", " and ", " with ", " which ", " banks "] };
const NAMES = [...banks.banche, ...banks.criterio.escluse].map((b) => b.nome).sort((a, b) => b.length - a.length);

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const file = join(DOCS, path === "/" ? "index.html" : path);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("non trovato"); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;
await mkdir(SHOTS, { recursive: true });
for (const f of await readdir(SHOTS)) if (f.endsWith(".png")) await unlink(join(SHOTS, f));

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const results = [], failures = [];
const fail = (m) => failures.push(m);
async function visit(page, route) {
  await page.goto(base + "#/" + route);
  await page.waitForSelector("main .card", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("[data-loading]"), null, { timeout: 15000 });
  await page.waitForTimeout(700); // i grafici disegnano dopo il primo rendering
}
const watch = (page, errors) => {
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (q) => errors.push(`richiesta fallita: ${q.url()}`));
};
/** Tabelle della pagina: larghezza del contenuto contro quella visibile, e prima colonna fissa dopo uno scorrimento. */
const tables = (page) => page.evaluate(() => [...document.querySelectorAll(".table-wrap")].map((w) => {
  const cell = w.querySelector("tbody td"), over = w.scrollWidth - w.clientWidth;
  let stuck = null;
  if (over > 1 && cell) { w.scrollLeft = Math.min(over, 120); stuck = Math.abs(cell.getBoundingClientRect().left - w.getBoundingClientRect().left) <= 1.5; w.scrollLeft = 0; }
  return { over, overflowX: getComputedStyle(w).overflowX, sticky: cell ? getComputedStyle(cell).position === "sticky" : null, stuck };
}));
const leaks = async (page, lang) => {
  let text = " " + (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ") + " ";
  for (const n of NAMES) text = text.split(n).join("");
  const low = text.toLowerCase();
  return { missing: (text.match(/⟦[^⟧]*⟧/g) ?? []).slice(0, 5), foreign: SENTINELS[lang].filter((w) => low.includes(w)) };
};

for (const [name, route] of SECTIONS) {
  const r = { sezione: route, erroriConsole: [], sbordo390: null, grafici: 0, avvertenze: 0, tabelle1280: 0, tabelleTagliate1280: 0, tabelleScorrevoli390: 0, lingua: {} };
  for (const [w, h, suffix] of [[1280, 900, ""], [390, 844, "_390"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    watch(page, r.erroriConsole);
    try {
      await visit(page, route);
      const tb = await tables(page);
      if (!suffix) {
        r.grafici = await page.locator("figure.chart canvas").count();
        r.avvertenze = await page.locator("details.note").count();
        r.tabelle1280 = tb.length;
        r.tabelleTagliate1280 = tb.filter((t) => t.over > 1).length;
        r.lingua.en = await leaks(page, "en");
        if ((await page.evaluate(() => document.documentElement.lang)) !== "en") fail(`${route}: la lingua predefinita non è l'inglese`);
        if (await page.locator("details.note[open]").count()) fail(`${route}: un'avvertenza è aperta all'avvio`);
        if (!(await page.locator("#source-indicator").count())) fail(`${route}: manca l'indicatore delle fonti nella barra laterale`);
        if (await page.locator(".banner").count()) fail(`${route}: c'è ancora l'avviso in cima alla pagina`);
      } else {
        const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        r.sbordo390 = m.scroll - m.inner;
        r.tabelleScorrevoli390 = tb.filter((t) => t.over > 1).length;
        if (tb.some((t) => t.overflowX !== "auto")) fail(`${route}: una tabella non ha lo scorrimento interno`);
        if (tb.some((t) => t.over > 1 && !(t.sticky && t.stuck))) fail(`${route}: a 390 px la prima colonna di una tabella che scorre non resta fissa`);
      }
      await page.screenshot({ path: join(SHOTS, `${name}${suffix}.png`), fullPage: true });
      if (!suffix) { // la stessa sezione in italiano
        await visit(page, route + "?lang=it");
        r.lingua.it = await leaks(page, "it");
        if ((await page.evaluate(() => document.documentElement.lang)) !== "it") fail(`${route}: lang=it non imposta l'italiano`);
        const tbIt = await tables(page);
        if (tbIt.some((t) => t.over > 1)) fail(`${route}: in italiano una tabella ha colonne tagliate a 1280 px`);
      }
    } catch (e) { r.erroriConsole.push(`caricamento fallito a ${w}px: ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
  if (r.erroriConsole.length) fail(`${route}: ${r.erroriConsole.length} errori in console`);
  if (r.sbordo390 === null || r.sbordo390 > 1) fail(`${route}: sbordo orizzontale di ${r.sbordo390} px a 390 px`);
  if (r.tabelleTagliate1280) fail(`${route}: ${r.tabelleTagliate1280} tabelle con colonne tagliate a 1280 px`);
  if (!r.avvertenze) fail(`${route}: nessuna avvertenza nella sezione`);
  for (const lang of ["en", "it"]) {
    const l = r.lingua[lang];
    if (!l) continue;
    if (l.missing.length) fail(`${route} (${lang}): chiavi di traduzione mancanti ${l.missing.join(" ")}`);
    if (l.foreign.length) fail(`${route} (${lang}): testo nell'altra lingua, parole trovate:${l.foreign.join(",")}`);
  }
  results.push(r);
}
if (!results.some((r) => r.tabelleScorrevoli390 > 0)) fail("a 390 px nessuna tabella scorre: il controllo sulla prima colonna fissa non ha verificato nulla");

// ---- indirizzo condivisibile, tema scuro, cambio lingua, vecchi indirizzi in italiano
const extra = {};
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  await visit(page, "simulator?imp=300&sost=50&reg=R3&dep=T2&cred=continua");
  const s = await page.evaluate(() => ({
    importo: document.querySelector(".slider-value")?.textContent ?? "", regola: document.querySelector("#reg")?.value, depositi: document.querySelector("#dep")?.value,
    credito: document.querySelector("#cred")?.value, deflusso: document.querySelector(".kpi-value")?.textContent ?? "", tema: document.documentElement.dataset.theme,
  }));
  await page.click('nav a[data-section="map"]');
  await page.waitForFunction(() => document.querySelectorAll(".insets canvas").length === 3, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  s.dopoNavigazione = page.url().split("#")[1];
  s.riquadriMappa = await page.locator(".insets .inset canvas").count();
  await page.screenshot({ path: join(SHOTS, "12_dark_map.png"), fullPage: true });
  if (!s.importo.startsWith("€300.0 bn") || s.regola !== "R3" || s.depositi !== "T2" || s.credito !== "continua") fail("lo scenario nell'indirizzo non è stato applicato");
  if (!s.deflusso.startsWith("€150.0 bn")) fail(`deflusso atteso €150.0 bn (300 × 50%), trovato ${s.deflusso}`);
  if (!/imp=300/.test(s.dopoNavigazione) || !/reg=R3/.test(s.dopoNavigazione)) fail("lo scenario non si conserva cambiando sezione");
  if (s.tema !== "dark") fail("il tema scuro non segue la preferenza del sistema");
  if (s.riquadriMappa !== 3) fail(`attesi 3 riquadri ingranditi sulla mappa, trovati ${s.riquadriMappa}`);

  // cambio lingua dal pulsante: la scelta finisce nell'indirizzo e resta navigando
  await page.click("#lang-switch");
  await page.waitForFunction(() => document.documentElement.lang === "it", null, { timeout: 15000 });
  s.dopoCambioLingua = page.url().split("#")[1];
  await page.click('nav a[data-section="simulator"]');
  await page.waitForTimeout(600);
  s.italiano = await page.evaluate(() => ({ titolo: document.querySelector("h1")?.textContent, importo: document.querySelector(".slider-value")?.textContent ?? "", url: location.hash }));
  await page.screenshot({ path: join(SHOTS, "13_italian_simulator.png"), fullPage: true });
  if (!/lang=it/.test(s.dopoCambioLingua) || !/lang=it/.test(s.italiano.url) || !/imp=300/.test(s.italiano.url)) fail("la lingua scelta non si conserva nell'indirizzo");
  if (s.italiano.titolo !== "Simulatore" || !s.italiano.importo.startsWith("300,0 mld €")) fail(`in italiano attesi titolo e numeri all'italiana, trovati ${JSON.stringify(s.italiano)}`);
  await page.click("#lang-switch");
  await page.waitForFunction(() => document.documentElement.lang === "en", null, { timeout: 15000 });
  if (/lang=/.test(page.url())) fail("tornando all'inglese il parametro lang resta nell'indirizzo");

  // un indirizzo condiviso prima della versione in inglese continua a funzionare
  await visit(page, "simulatore?imp=120&lang=it");
  s.vecchioIndirizzo = await page.evaluate(() => ({ titolo: document.querySelector("h1")?.textContent, importo: document.querySelector(".slider-value")?.textContent ?? "" }));
  if (s.vecchioIndirizzo.titolo !== "Simulatore" || !s.vecchioIndirizzo.importo.startsWith("120,0 mld €")) fail("un vecchio indirizzo in italiano non apre la sezione giusta");
  extra.indirizzo = s;
  await ctx.close();
}

// ---- avvertenze espandibili, indicatore delle fonti, rapporto A e B, banche
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  watch(page, errors);
  await visit(page, "simulator");
  const note = page.locator("details.note").first();
  const closed = await note.evaluate((n) => ({ righe: Math.round(n.querySelector("summary").getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)), dettaglio: n.querySelector("p").textContent.length }));
  await note.locator("summary").click();
  const open = await note.evaluate((n) => n.open && n.querySelector("p").getBoundingClientRect().height > 0);
  extra.avvertenza = { righeChiusa: closed.righe, caratteriDelDettaglio: closed.dettaglio, siApre: open };
  if (closed.righe > 1 || closed.dettaglio < 40 || !open) fail(`l'avvertenza non è una riga con dettaglio espandibile: ${JSON.stringify(extra.avvertenza)}`);

  await page.click("#source-indicator");
  await page.waitForSelector("#source-notice", { timeout: 15000 });
  extra.indicatoreFonti = { porta_a: page.url().split("#")[1], testo: await page.locator("#source-notice").innerText() };
  if (!extra.indicatoreFonti.porta_a.startsWith("/method")) fail("l'indicatore delle fonti non porta a Metodo e dati");

  await visit(page, "compare");
  const titleA = await page.locator(".report h2").innerText();
  await page.click('.report button[aria-pressed="false"]');
  await page.waitForTimeout(300);
  const titleAB = await page.locator(".report h2").innerText();
  const headAB = await page.locator(".report table").nth(1).locator("th").allInnerTexts();
  await page.evaluate(() => document.body.classList.add("print-report"));
  await page.emulateMedia({ media: "print" });
  const printed = await page.evaluate(() => ({ visibili: [...document.querySelectorAll(".main > *")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.className || e.tagName), comandi: [...document.querySelectorAll(".report button")].filter((b) => b.getBoundingClientRect().height > 0).length }));
  await page.screenshot({ path: join(SHOTS, "14_report_ab_print.png"), fullPage: true });
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => document.body.classList.remove("print-report"));
  extra.rapporto = { titoloA: titleA, titoloAB: titleAB, colonneAB: headAB, inStampa: printed, indirizzo: page.url().split("#")[1] };
  if (titleA === titleAB || !headAB.some((h) => /B/.test(h)) || !/rep=ab/.test(extra.rapporto.indirizzo)) fail("il rapporto del confronto tra due scenari non compare");
  if (printed.comandi !== 0 || !printed.visibili.every((c) => /report|H1/.test(c))) fail(`in stampa non resta solo il rapporto: ${JSON.stringify(printed)}`);

  await visit(page, "banks");
  const all = await page.locator("main table").first().locator("tbody tr").count();
  await page.selectOption("#bc", "IT");
  await page.waitForTimeout(300);
  const italy = await page.locator("main table").first().locator("tbody tr").count();
  await page.fill("#bq", "unicredit");
  await page.waitForTimeout(300);
  const found = await page.locator("main table").first().locator("tbody tr").count();
  await page.locator("main table").first().locator("tbody tr").first().click();
  await page.waitForSelector("main .card h2", { timeout: 15000 });
  await page.waitForTimeout(500);
  extra.banche = { righe: all, righeItalia: italy, righeRicerca: found, scheda: await page.locator("main .card h2").first().innerText(), indirizzo: page.url().split("#")[1] };
  if (all !== banks.banche.length || italy !== banks.banche.filter((b) => b.paese === "IT").length || found !== 1 || !/unicredit/i.test(extra.banche.scheda) || !/^\/banks\/[A-Z0-9]{20}/.test(extra.banche.indirizzo))
    fail(`sezione Banche: filtro, ricerca o scheda non funzionano: ${JSON.stringify(extra.banche)}`);
  if (errors.length) fail(`errori in console nei controlli aggiuntivi: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

// ---- avvio: si scarica solo ciò che serve alla sezione aperta
{
  const loads = {};
  for (const route of ["method", "overview"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const js = [];
    page.on("response", async (q) => { if (q.url().endsWith(".js")) js.push({ file: q.url().split("/").pop(), kb: Math.round((await q.body()).length / 1024) }); });
    await visit(page, route);
    loads[route] = { file: js.map((j) => j.file.replace(/-[\w-]{8}\.js$/, "")), kb: js.reduce((a, j) => a + j.kb, 0) };
    await ctx.close();
  }
  extra.avvio = loads;
  const others = ["Simulator", "MapEurope", "CountrySheet", "Banks", "Channels", "Monitor", "Level", "Compare"];
  if (loads.method.file.includes("charts") || loads.method.file.includes("it")) fail("aprendo Metodo e dati si scaricano anche i grafici o l'altra lingua");
  for (const r of ["method", "overview"]) if (loads[r].file.some((f) => others.includes(f))) fail(`aprendo ${r} si scaricano anche altre sezioni: ${loads[r].file.join(", ")}`);
}

await browser.close();
server.close();
const out = { eseguito: new Date().toISOString(), sezioni: results, ...extra, falliti: failures };
await writeFile(join(SHOTS, "esito_test_browser.json"), JSON.stringify(out, null, 1));
for (const r of results) console.log(`${r.sezione.padEnd(28)} grafici ${r.grafici}  avvertenze ${r.avvertenze}  tabelle ${r.tabelle1280} (tagliate ${r.tabelleTagliate1280}, scorrevoli a 390: ${r.tabelleScorrevoli390})  errori ${r.erroriConsole.length}  sbordo a 390 px: ${r.sbordo390} px`);
console.log("avvio:", JSON.stringify(extra.avvio));
console.log("banche:", JSON.stringify(extra.banche), "rapporto:", extra.rapporto?.titoloAB);
console.log(failures.length ? "FALLITI:\n- " + failures.join("\n- ") : "tutti i controlli superati");
process.exit(failures.length ? 1 : 0);
