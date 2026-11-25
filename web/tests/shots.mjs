// Screenshot di ogni pagina dell'applicazione compilata, a 1280 e 390 pixel, tema chiaro e scuro.
// Uso: node tests/shots.mjs --out ../reports/figures/app/after            (tutte le pagine di docs/)
//      node tests/shots.mjs --dir /tmp/dist --out /tmp/shots --only banks  (una pagina di un'altra compilazione)
//      node tests/shots.mjs --routes overview,simulator --lang it --widths 390 --themes dark
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const DIR = resolve(arg("dir", join(here, "../../docs"))), OUT = resolve(arg("out", join(here, "../../reports/figures/app/after")));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/markdown", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const banks = JSON.parse(await readFile(join(DIR, "data/banche.json"), "utf-8"));
const lei = [...banks.banche].sort((a, b) => b.attivo - a.attivo)[0].lei;
const ALL = ["home", "overview", "simulator", "map", "country/IT", "banks", `banks/${lei}`, "channels", "monitor", "level", "compare", "method", "about"];
const routes = arg("routes") ? arg("routes").split(",") : arg("only") ? ALL.filter((r) => r.split("/")[0] === arg("only")) : ALL;
const widths = arg("widths", "1280,390").split(",").map(Number), themes = arg("themes", "light,dark").split(","), lang = arg("lang", "en");

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const file = join(DIR, path === "/" ? "index.html" : path);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("non trovato"); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
let n = 0;
for (const route of routes) {
  const name = `${String(ALL.indexOf(route) + 1).padStart(2, "0")}_${route.startsWith("banks/") ? "bank_sheet" : route.split("/")[0]}`;
  for (const theme of themes) for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w > 600 ? 900 : 844 }, deviceScaleFactor: 1, colorScheme: theme, reducedMotion: "reduce" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(`${base}#/${route}${lang === "en" ? "" : "?lang=" + lang}`);
      await page.waitForSelector("main h1", { timeout: 15000 });
      await page.waitForFunction(() => !document.querySelector("[data-loading]"), null, { timeout: 15000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: join(OUT, `${name}_${w}_${theme}${lang === "en" ? "" : "_" + lang}.jpg`), fullPage: true, type: "jpeg", quality: Number(arg("quality", "62")) });
      n++;
    } catch (e) { console.log(`${route} ${w} ${theme}: ${e.message.split("\n")[0]}`); }
    if (errors.length) console.log(`${route} ${w} ${theme}: errori ${errors.slice(0, 2).join(" | ")}`);
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(`${n} screenshot in ${OUT}`);
