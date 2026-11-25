// Test nel browser dell'applicazione compilata (docs/): ogni sezione si carica senza errori
// in console, non sborda in orizzontale a 390 pixel, e lo scenario si conserva nell'indirizzo.
// Salva uno screenshot di ogni sezione in reports/figures/app/.
// Uso: npm run build && npm run e2e   (usa il Chrome installato; CHROME_CHANNEL=chromium per quello di Playwright)
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const DOCS = resolve(here, "../../docs"), SHOTS = resolve(here, "../../reports/figures/app");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/markdown", ".svg": "image/svg+xml" };
const SECTIONS = [["01_panoramica", "panoramica"], ["02_simulatore", "simulatore"], ["03_mappa", "mappa"], ["04_scheda_paese", "paese/IT"], ["05_due_canali", "canali"],
                  ["06_monitor", "monitor"], ["07_stima_livello", "livello"], ["08_confronto", "confronto"], ["09_metodo", "metodo"]];

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

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const results = [], failures = [];
async function visit(page, route) {
  await page.goto(base + "#/" + route);
  await page.waitForSelector("main .card", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("main")?.textContent?.includes("Caricamento"), null, { timeout: 15000 });
  await page.waitForTimeout(700); // i grafici disegnano dopo il primo rendering
}
for (const [name, route] of SECTIONS) {
  const r = { sezione: route, erroriConsole: [], sbordo390: null, grafici: 0 };
  for (const [w, h, suffix] of [[1280, 900, ""], [390, 844, "_390"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") r.erroriConsole.push(m.text()); });
    page.on("pageerror", (e) => r.erroriConsole.push(String(e)));
    page.on("requestfailed", (q) => r.erroriConsole.push(`richiesta fallita: ${q.url()}`));
    try {
      await visit(page, route);
      if (!suffix) r.grafici = await page.locator("figure.chart canvas").count();
      else {
        const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        r.sbordo390 = m.scroll - m.inner;
      }
      await page.screenshot({ path: join(SHOTS, `${name}${suffix}.png`), fullPage: true });
    } catch (e) { r.erroriConsole.push(`caricamento fallito a ${w}px: ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
  if (r.erroriConsole.length) failures.push(`${route}: ${r.erroriConsole.length} errori in console`);
  if (r.sbordo390 === null || r.sbordo390 > 1) failures.push(`${route}: sbordo orizzontale di ${r.sbordo390} px a 390 px`);
  results.push(r);
}

// Indirizzo condivisibile: lo scenario scritto nell'indirizzo deve arrivare nei risultati e restare cambiando sezione
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
const page = await ctx.newPage();
await visit(page, "simulatore?imp=300&sost=50&reg=R3&dep=T2&cred=continua");
const shared = await page.evaluate(() => ({
  importo: document.querySelector(".slider-value")?.textContent ?? "", regola: document.querySelector("#reg")?.value, depositi: document.querySelector("#dep")?.value,
  credito: document.querySelector("#cred")?.value, deflusso: document.querySelector(".kpi-value")?.textContent ?? "", tema: document.documentElement.dataset.theme,
}));
await page.click('nav a:has-text("Mappa d\'Europa")');
await page.waitForTimeout(500);
shared.dopoNavigazione = page.url().split("#")[1];
await page.screenshot({ path: join(SHOTS, "10_tema_scuro_mappa.png"), fullPage: true });
await ctx.close();
if (!shared.importo.startsWith("300,0") || shared.regola !== "R3" || shared.depositi !== "T2" || shared.credito !== "continua") failures.push("lo scenario nell'indirizzo non è stato applicato");
if (!shared.deflusso.startsWith("150,0")) failures.push(`deflusso atteso 150,0 mld € (300 × 50%), trovato ${shared.deflusso}`);
if (!/imp=300/.test(shared.dopoNavigazione) || !/reg=R3/.test(shared.dopoNavigazione)) failures.push("lo scenario non si conserva cambiando sezione");
if (shared.tema !== "dark") failures.push("il tema scuro non segue la preferenza del sistema");

await browser.close();
server.close();
const out = { eseguito: new Date().toISOString(), sezioni: results, indirizzoCondivisibile: shared, falliti: failures };
await writeFile(join(SHOTS, "esito_test_browser.json"), JSON.stringify(out, null, 1));
for (const r of results) console.log(`${r.sezione.padEnd(12)} grafici ${r.grafici}  errori ${r.erroriConsole.length}  sbordo a 390 px: ${r.sbordo390} px`);
console.log("indirizzo condivisibile:", JSON.stringify(shared));
console.log(failures.length ? "FALLITI:\n- " + failures.join("\n- ") : "tutti i controlli superati");
process.exit(failures.length ? 1 : 0);
