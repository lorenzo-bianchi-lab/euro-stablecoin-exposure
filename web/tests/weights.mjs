// Peso di ogni pagina: byte non compressi e compressi (gzip) scaricati aprendola per prima.
// Uso: node tests/weights.mjs [--dir ../docs] [--routes home,overview,...] [--out file.json]
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const DIR = resolve(arg("dir", join(here, "../../docs")));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const banks = JSON.parse(await readFile(join(DIR, "data/banks.json"), "utf-8"));
const lei = [...banks.banche].sort((a, b) => b.attivo - a.attivo)[0].lei;
const routes = arg("routes", `home,overview,simulator,map,country/IT,banks,banks/${lei},channels,monitor,level,compare,method,about`).split(",").map((r) => r.replace("LEI", lei));
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try { const file = join(DIR, path === "/" ? "index.html" : path); res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }); res.end(await readFile(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const out = {};
for (const route of routes) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const got = [];
  page.on("response", async (q) => { try { const b = await q.body(); const f = q.url().split("/").pop().split("?")[0] || "index.html"; got.push({ f, raw: b.length, gz: /\.(woff2|png)$/.test(f) ? b.length : gzipSync(b).length }); } catch { /* senza corpo */ } });
  await page.goto(`http://127.0.0.1:${server.address().port}/#/${route}`);
  await page.waitForSelector("main .card", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("[data-loading]") && !/Loading|Caricamento/.test(document.querySelector("main")?.textContent ?? ""), null, { timeout: 15000 });
  await page.waitForTimeout(800);
  const kb = (re, k) => Math.round(got.filter((g) => re.test(g.f)).reduce((a, g) => a + g[k], 0) / 1024);
  out[route.startsWith("banks/") ? "bank_sheet" : route.split("/")[0]] = { codice: kb(/\.js$/, "raw"), stile: kb(/\.css$/, "raw"), caratteri: kb(/\.woff2$/, "raw"), dati: kb(/\.json$/, "raw"), totale: kb(/./, "raw"), totaleCompresso: kb(/./, "gz"), richieste: got.length };
  await ctx.close();
}
await browser.close();
server.close();
if (arg("out")) await writeFile(resolve(arg("out")), JSON.stringify(out, null, 1));
for (const [k, v] of Object.entries(out)) console.log(`${k.padEnd(11)} totale ${String(v.totale).padStart(5)} kB (compresso ${String(v.totaleCompresso).padStart(4)})  codice ${v.codice}  stile ${v.stile}  caratteri ${v.caratteri}  dati ${v.dati}  richieste ${v.richieste}`);
