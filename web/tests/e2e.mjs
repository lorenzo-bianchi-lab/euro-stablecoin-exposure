// Test nel browser dell'applicazione compilata (docs/). Per ogni pagina, in inglese e in italiano:
// nessun errore in console, nessuno sbordo a 390 pixel, nessuna stringa non tradotta; le tabelle
// non hanno colonne tagliate a 1280 pixel e sotto scorrono al proprio interno con la prima colonna
// fissa; contrasto AA del testo reso nei due temi; testo alternativo dei grafici; dicitura in fondo.
// Poi: indirizzo condivisibile, cambio lingua, indicatore delle fonti, avvertenze espandibili,
// riquadri della mappa, rapporto stampabile, sezione Banche, tastiera e fuoco visibile, riduzione
// del movimento, navigazione mobile, anteprima di condivisione e peso delle pagine.
// Gli screenshot li fa tests/shots.mjs.
// Uso: npm run build && npm run e2e   (usa il Chrome installato; CHROME_CHANNEL=chromium per quello di Playwright)
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const DOCS = resolve(here, "../../docs"), OUT = resolve(here, "../../reports/figures/app");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".md": "text/markdown", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png" };
const banks = JSON.parse(await readFile(join(DOCS, "data/banche.json"), "utf-8"));
const firstBank = [...banks.banche].sort((a, b) => b.attivo - a.attivo)[0];
const SECTIONS = ["home", "overview", "simulator", "map", "country/IT", "banks", `banks/${firstBank.lei}`, "channels", "monitor", "level", "compare", "method", "about"];
const NO_NOTES = ["home", "about"]; // pagine di presentazione: non mostrano numeri con avvertenze proprie
// parole che non devono comparire nell'altra lingua; nomi di banche e titoli di studi sono tolti prima del controllo
const SENTINELS = { en: [" della ", " delle ", " dei ", " sono ", " paesi", " depositi", " banche ", " con ", " gli ", " nella "], it: [" the ", " and ", " with ", " which ", " banks "] };
const NAMES = [...[...banks.banche, ...banks.criterio.escluse].map((b) => b.nome), "Stablecoins and monetary policy transmission"].sort((a, b) => b.length - a.length);
const DISCLAIMER = { en: "University project, not affiliated with the ECB", it: "Progetto universitario, non affiliato alla BCE" };

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
await mkdir(OUT, { recursive: true });

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
/** Contrasto del testo reso: per ogni elemento con testo proprio, colore del testo contro il primo fondo opaco che ha dietro. */
const lowContrast = (page) => page.evaluate(() => {
  const rgb = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
  const lum = ({ r, g, b }) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const over = (top, under) => ({ r: top.r * top.a + under.r * (1 - top.a), g: top.g * top.a + under.g * (1 - top.a), b: top.b * top.a + under.b * (1 - top.a), a: 1 });
  const background = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.a > 0) { layers.push(c); if (c.a === 1) break; } }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    for (const c of layers.reverse()) out = over(c, out);
    return out;
  };
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    if (el.closest(".sr-only, canvas, svg, [disabled], option, noscript") || !el.offsetParent) continue;
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    const bg = background(el), fg = over(rgb(cs.color), bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x), ratio = (a + 0.05) / (b + 0.05);
    const size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
    if (ratio < (large ? 3 : 4.5)) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
  }
  return bad;
});
const charts = (page) => page.evaluate(() => [...document.querySelectorAll("figure.chart")].map((f) => {
  const img = f.querySelector('[role="img"]');
  return { bare: f.classList.contains("bare"), label: img?.getAttribute("aria-label") ?? "", alt: f.querySelector(".sr-only")?.textContent ?? "", canvas: !!f.querySelector("canvas") };
}));

for (const route of SECTIONS) {
  const r = { sezione: route, erroriConsole: [], sbordo390: null, grafici: 0, graficiSenzaTestoAlternativo: 0, avvertenze: 0, tabelle1280: 0, tabelleTagliate1280: 0, tabelleScorrevoli390: 0, contrastoBasso: { chiaro: 0, scuro: 0 }, lingua: {} };
  for (const [w, h, suffix] of [[1280, 900, ""], [390, 844, "_390"]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: "light" });
    const page = await ctx.newPage();
    watch(page, r.erroriConsole);
    try {
      await visit(page, route);
      const tb = await tables(page);
      if (!suffix) {
        const ch = await charts(page);
        r.grafici = ch.filter((c) => c.canvas).length;
        r.graficiSenzaTestoAlternativo = ch.filter((c) => !c.label || (!c.bare && c.alt.trim().length < 20)).length;
        r.avvertenze = await page.locator("details.note").count();
        r.tabelle1280 = tb.length;
        r.tabelleTagliate1280 = tb.filter((t) => t.over > 1).length;
        r.lingua.en = await leaks(page, "en");
        const low = await lowContrast(page);
        r.contrastoBasso.chiaro = low.length;
        if (low.length) fail(`${route} (chiaro): ${low.length} testi sotto il contrasto AA, per esempio ${low.slice(0, 3).join(" | ")}`);
        if ((await page.evaluate(() => document.documentElement.lang)) !== "en") fail(`${route}: la lingua predefinita non è l'inglese`);
        if (await page.locator("details.note[open]").count()) fail(`${route}: un'avvertenza è aperta all'avvio`);
        if (!(await page.locator("#source-indicator").count())) fail(`${route}: manca l'indicatore delle fonti nella barra laterale`);
        if (await page.locator(".banner").count()) fail(`${route}: c'è ancora l'avviso in cima alla pagina`);
        if (!(await page.locator("main > footer.foot").innerText()).includes(DISCLAIMER.en)) fail(`${route}: manca la dicitura in fondo alla pagina`);
        if ((await page.title()) !== "Euro Stablecoin Exposure Monitor") fail(`${route}: titolo della pagina inatteso`);
      } else {
        const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        r.sbordo390 = m.scroll - m.inner;
        r.tabelleScorrevoli390 = tb.filter((t) => t.over > 1).length;
        if (tb.some((t) => t.overflowX !== "auto")) fail(`${route}: una tabella non ha lo scorrimento interno`);
        if (tb.some((t) => t.over > 1 && !(t.sticky && t.stuck))) fail(`${route}: a 390 px la prima colonna di una tabella che scorre non resta fissa`);
        const nav = await page.evaluate(() => ({ barra: getComputedStyle(document.querySelector(".tabbar")).display, laterale: document.querySelector(".side") ? getComputedStyle(document.querySelector(".side")).display : "none" }));
        if (nav.barra === "none" || nav.laterale !== "none") fail(`${route}: a 390 px manca la navigazione mobile o resta la barra laterale`);
      }
      if (!suffix) { // la stessa pagina in italiano
        await visit(page, route + "?lang=it");
        r.lingua.it = await leaks(page, "it");
        if ((await page.evaluate(() => document.documentElement.lang)) !== "it") fail(`${route}: lang=it non imposta l'italiano`);
        if ((await tables(page)).some((t) => t.over > 1)) fail(`${route}: in italiano una tabella ha colonne tagliate a 1280 px`);
        if (!(await page.locator("main > footer.foot").innerText()).includes(DISCLAIMER.it)) fail(`${route}: manca la dicitura in fondo alla pagina in italiano`);
      }
    } catch (e) { r.erroriConsole.push(`caricamento fallito a ${w}px: ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
  { // contrasto nel tema scuro
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
    const page = await ctx.newPage();
    try {
      await visit(page, route);
      const low = await lowContrast(page);
      r.contrastoBasso.scuro = low.length;
      if (low.length) fail(`${route} (scuro): ${low.length} testi sotto il contrasto AA, per esempio ${low.slice(0, 3).join(" | ")}`);
    } catch (e) { r.erroriConsole.push(`tema scuro: ${e.message.split("\n")[0]}`); }
    await ctx.close();
  }
  if (r.erroriConsole.length) fail(`${route}: ${r.erroriConsole.length} errori in console: ${r.erroriConsole[0]}`);
  if (r.sbordo390 === null || r.sbordo390 > 1) fail(`${route}: sbordo orizzontale di ${r.sbordo390} px a 390 px`);
  if (r.tabelleTagliate1280) fail(`${route}: ${r.tabelleTagliate1280} tabelle con colonne tagliate a 1280 px`);
  if (r.graficiSenzaTestoAlternativo) fail(`${route}: ${r.graficiSenzaTestoAlternativo} grafici senza testo alternativo`);
  if (!r.avvertenze && !NO_NOTES.includes(route)) fail(`${route}: nessuna avvertenza nella sezione`);
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
    credito: document.querySelector("#cred")?.value, deflusso: document.querySelector(".hero-value")?.textContent ?? "", tema: document.documentElement.dataset.theme,
  }));
  await page.click('nav a[data-section="map"]');
  await page.waitForFunction(() => document.querySelectorAll(".insets canvas").length === 3, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  s.dopoNavigazione = page.url().split("#")[1];
  s.riquadriMappa = await page.locator(".insets .inset canvas").count();
  s.legendaMappa = await page.locator('[data-legend="map"] li').count();
  if (!s.importo.startsWith("€300.0 bn") || s.regola !== "R3" || s.depositi !== "T2" || s.credito !== "continua") fail("lo scenario nell'indirizzo non è stato applicato");
  if (!s.deflusso.startsWith("€150.0 bn")) fail(`deflusso atteso €150.0 bn (300 × 50%), trovato ${s.deflusso}`);
  if (!/imp=300/.test(s.dopoNavigazione) || !/reg=R3/.test(s.dopoNavigazione)) fail("lo scenario non si conserva cambiando sezione");
  if (s.tema !== "dark") fail("il tema scuro non segue la preferenza del sistema");
  if (s.riquadriMappa !== 3) fail(`attesi 3 riquadri ingranditi sulla mappa, trovati ${s.riquadriMappa}`);
  if (s.legendaMappa < 3) fail("la mappa non ha una legenda a classi leggibile");

  // cambio lingua dal pulsante: la scelta finisce nell'indirizzo e resta navigando
  await page.click("#lang-switch");
  await page.waitForFunction(() => document.documentElement.lang === "it", null, { timeout: 15000 });
  s.dopoCambioLingua = page.url().split("#")[1];
  await page.click('nav a[data-section="simulator"]');
  await page.waitForTimeout(600);
  s.italiano = await page.evaluate(() => ({ titolo: document.querySelector("h1")?.textContent, importo: document.querySelector(".slider-value")?.textContent ?? "", url: location.hash }));
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
  if (closed.righe > 2 || closed.dettaglio < 40 || !open) fail(`l'avvertenza non è una riga con dettaglio espandibile: ${JSON.stringify(extra.avvertenza)}`);

  await page.click("#source-indicator");
  await page.waitForSelector("#source-notice", { timeout: 15000 });
  extra.indicatoreFonti = { porta_a: page.url().split("#")[1], testo: (await page.locator("#source-notice").innerText()).slice(0, 200) };
  if (!extra.indicatoreFonti.porta_a.startsWith("/method")) fail("l'indicatore delle fonti non porta a Metodo e dati");

  await visit(page, "compare");
  const titleA = await page.locator(".report h2").innerText();
  await page.click('.report button[aria-pressed="false"]');
  await page.waitForTimeout(300);
  const titleAB = await page.locator(".report h2").innerText();
  const headAB = await page.locator(".report table").nth(1).locator("th").allInnerTexts();
  await page.evaluate(() => document.body.classList.add("print-report"));
  await page.emulateMedia({ media: "print" });
  const printed = await page.evaluate(() => ({ visibili: [...document.querySelectorAll(".main > *")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.className || e.tagName),
    comandi: [...document.querySelectorAll(".report button")].filter((b) => b.getBoundingClientRect().height > 0).length, pagine: document.querySelectorAll(".report .report-page").length,
    intestazioni: [...document.querySelectorAll(".report .report-head")].map((h) => h.textContent.trim().slice(0, 80)) }));
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await writeFile(join(OUT, "report_ab.pdf"), pdf);
  printed.pagineDelPdf = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => document.body.classList.remove("print-report"));
  extra.rapporto = { titoloA: titleA, titoloAB: titleAB, colonneAB: headAB, inStampa: printed, indirizzo: page.url().split("#")[1] };
  if (titleA === titleAB || !headAB.some((h) => /B/.test(h)) || !/rep=ab/.test(extra.rapporto.indirizzo)) fail("il rapporto del confronto tra due scenari non compare");
  if (printed.comandi !== 0 || !printed.visibili.every((c) => /report|H1/.test(c))) fail(`in stampa non resta solo il rapporto: ${JSON.stringify(printed.visibili)}`);
  if (printed.pagine !== 2 || printed.pagineDelPdf !== 2 || !printed.intestazioni.every((h) => h.includes("Euro Stablecoin Exposure Monitor"))) fail(`il rapporto non è un documento di due pagine con intestazione: ${JSON.stringify(printed)}`);

  await visit(page, "banks");
  const table = page.locator("main table").first();
  const total = Number(await page.locator("#banks-table").getAttribute("data-total")), firstPage = await table.locator("tbody tr").count();
  const pager = await page.locator("#banks-table .pager").count();
  if (pager) { await page.click('#banks-table [data-page="next"]'); await page.waitForTimeout(200); }
  const secondPage = await table.locator("tbody tr").count();
  await page.selectOption("#bc", "IT");
  await page.waitForTimeout(300);
  const italy = await table.locator("tbody tr").count();
  await page.fill("#bq", "unicredit");
  await page.waitForTimeout(300);
  const found = await table.locator("tbody tr").count();
  await table.locator("tbody tr").first().click();
  await page.waitForSelector("main .card h2", { timeout: 15000 });
  await page.waitForTimeout(500);
  extra.banche = { banche: total, righePrimaPagina: firstPage, righeSecondaPagina: secondPage, righeItalia: italy, righeRicerca: found, scheda: await page.locator("main .card h2").first().innerText(), indirizzo: page.url().split("#")[1] };
  if (total !== banks.banche.length || !pager || firstPage >= total || firstPage > 30 || secondPage < 1 || italy !== banks.banche.filter((b) => b.paese === "IT").length || found !== 1 || !/unicredit/i.test(extra.banche.scheda) || !/^\/banks\/[A-Z0-9]{20}/.test(extra.banche.indirizzo))
    fail(`sezione Banche: paginazione, filtro, ricerca o scheda non funzionano: ${JSON.stringify(extra.banche)}`);
  if (errors.length) fail(`errori in console nei controlli aggiuntivi: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

// ---- tastiera: collegamento per saltare al contenuto, fuoco visibile su ogni elemento raggiunto
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = await ctx.newPage();
  const keyboard = {};
  for (const route of ["home", "simulator", "map", "banks", "compare"]) {
    await page.close();
    page = await ctx.newPage(); // pagina nuova: il fuoco riparte dall'inizio del documento
    await visit(page, route);
    await page.keyboard.press("Tab");
    const skip = await page.evaluate(() => ({ classe: document.activeElement?.className, visibile: document.activeElement?.getBoundingClientRect().top >= 0 }));
    const seen = [], invisible = [];
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        return { tag: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + "." + String(e.className).split(" ")[0], ring: cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) };
      });
      if (!f) break;
      seen.push(f.tag);
      if (!f.ring) invisible.push(f.tag);
    }
    keyboard[route] = { raggiunti: seen.length, tipi: [...new Set(seen.map((s) => s.split(/[#.]/)[0]))], senzaFuocoVisibile: [...new Set(invisible)] };
    if (skip.classe !== "skip" || !skip.visibile) fail(`${route}: il primo Tab non porta al collegamento "vai al contenuto"`);
    if (seen.length < 15) fail(`${route}: da tastiera si raggiungono solo ${seen.length} elementi`);
    if (invisible.length) fail(`${route}: fuoco non visibile su ${[...new Set(invisible)].slice(0, 4).join(", ")}`);
  }
  await visit(page, "overview");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  keyboard.saltoAlContenuto = await page.evaluate(() => document.activeElement?.id);
  if (keyboard.saltoAlContenuto !== "content") fail("il collegamento \"vai al contenuto\" non sposta il fuoco sul contenuto");
  extra.tastiera = keyboard;
  await ctx.close();
}

// ---- riduzione del movimento: nessuna animazione, né nei componenti né nei grafici
{
  const motion = {};
  for (const reduce of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await visit(page, "simulator");
    motion[reduce ? "ridotto" : "normale"] = await page.evaluate(() => ({
      animazioneValori: getComputedStyle(document.querySelector(".changed")).animationName, transizionePulsanti: getComputedStyle(document.querySelector(".btn")).transitionDuration,
      grafici: [...new Set([...document.querySelectorAll("figure.chart [data-motion]")].map((e) => e.getAttribute("data-motion")))] }));
    await ctx.close();
  }
  extra.movimento = motion;
  if (motion.ridotto.animazioneValori !== "none" || !/^0s/.test(motion.ridotto.transizionePulsanti) || motion.ridotto.grafici.join() !== "off") fail(`con la riduzione del movimento restano animazioni: ${JSON.stringify(motion.ridotto)}`);
  if (motion.normale.animazioneValori === "none" || motion.normale.grafici.join() !== "on") fail(`senza riduzione del movimento le transizioni non ci sono: ${JSON.stringify(motion.normale)}`);
}

// ---- navigazione mobile: barra in basso, menu a tutto schermo, chiusura con Esc
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await visit(page, "home");
  const mobile = { voci: await page.locator(".tabbar a").count() };
  await page.click(".tabbar button");
  await page.waitForSelector(".drawer nav a", { timeout: 5000 });
  mobile.vociMenu = await page.locator(".drawer nav a").count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  mobile.chiusoConEsc = (await page.locator(".drawer").count()) === 0;
  await page.click(".topbar button");
  await page.click('.drawer nav a[data-section="monitor"]');
  await page.waitForSelector(".drawer", { state: "detached", timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => location.hash.startsWith("#/monitor"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForSelector("main .card", { timeout: 15000 });
  mobile.dopoIlMenu = { sezione: page.url().split("#")[1], menuAperto: await page.locator(".drawer").count() };
  await page.click('.tabbar a[data-tab="banks"]');
  await page.waitForTimeout(500);
  mobile.dopoLaBarra = page.url().split("#")[1];
  extra.mobile = mobile;
  if (mobile.voci < 4 || mobile.vociMenu !== SECTIONS.length - 1 || !mobile.chiusoConEsc || !mobile.dopoIlMenu.sezione.startsWith("/monitor") || mobile.dopoIlMenu.menuAperto || !mobile.dopoLaBarra.startsWith("/banks"))
    fail(`navigazione mobile: ${JSON.stringify(mobile)}`);
  await ctx.close();
}

// ---- anteprima di condivisione e icona
{
  const html = await readFile(join(DOCS, "index.html"), "utf-8");
  const share = { titolo: /<title>Euro Stablecoin Exposure Monitor<\/title>/.test(html), mancanti: ["og:title", "og:description", "og:image", "twitter:card"].filter((k) => !html.includes(k)), icona: html.includes("favicon.svg") };
  for (const f of ["og.png", "favicon.svg", "icon-180.png"]) { try { share[f] = (await readFile(join(DOCS, f))).length; } catch { share[f] = 0; } }
  extra.condivisione = share;
  if (!share.titolo || share.mancanti.length || !share.icona || !share["og.png"] || !share["favicon.svg"]) fail(`titolo, icona o anteprima di condivisione mancanti: ${JSON.stringify(share)}`);
}

// ---- peso: cosa si scarica aprendo ciascuna pagina per prima (byte non compressi), e solo ciò che serve
{
  const weights = {};
  for (const route of SECTIONS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const got = [];
    page.on("response", async (q) => { try { got.push({ file: q.url().split("/").pop().split("?")[0], kb: (await q.body()).length / 1024 }); } catch { /* risposta senza corpo */ } });
    await visit(page, route);
    const sum = (re) => Math.round(got.filter((g) => re.test(g.file)).reduce((a, g) => a + g.kb, 0));
    weights[route] = { codice: sum(/\.js$/), stile: sum(/\.css$/), caratteri: sum(/\.woff2$/), dati: sum(/\.json$/), totale: Math.round(got.reduce((a, g) => a + g.kb, 0)), file: got.filter((g) => /\.js$/.test(g.file)).map((g) => g.file.replace(/-[\w-]{8}\.js$/, "")) };
    await ctx.close();
  }
  extra.peso = weights;
  const own = { home: "Home", about: "About", overview: "Overview", simulator: "Simulator", map: "MapEurope", country: "CountrySheet", banks: "Banks", channels: "Channels", monitor: "Monitor", level: "Level", compare: "Compare", method: "Method" };
  const pages = Object.values(own);
  for (const [route, w] of Object.entries(weights)) {
    const others = w.file.filter((f) => pages.includes(f) && f !== own[route.split("/")[0]]);
    if (others.length) fail(`aprendo ${route} si scaricano anche altre sezioni: ${others.join(", ")}`);
    if (w.file.includes("it")) fail(`aprendo ${route} in inglese si scarica anche l'italiano`);
  }
  if (weights.about.codice > 340) fail(`una pagina senza grafici scarica la libreria dei grafici: about ${weights.about.codice} kB di codice`);
}

await browser.close();
server.close();
const out = { eseguito: new Date().toISOString(), sezioni: results, ...extra, falliti: failures };
await writeFile(join(OUT, "esito_test_browser.json"), JSON.stringify(out, null, 1));
for (const r of results) console.log(`${r.sezione.padEnd(28)} grafici ${r.grafici}  avvertenze ${r.avvertenze}  tabelle ${r.tabelle1280} (tagliate ${r.tabelleTagliate1280}, scorrevoli a 390: ${r.tabelleScorrevoli390})  contrasto basso ${r.contrastoBasso.chiaro}/${r.contrastoBasso.scuro}  errori ${r.erroriConsole.length}  sbordo a 390 px: ${r.sbordo390} px`);
console.log("peso (kB non compressi, codice/totale):", Object.entries(extra.peso ?? {}).map(([k, v]) => `${k.split("/")[0]} ${v.codice}/${v.totale}`).join("  "));
console.log("banche:", JSON.stringify(extra.banche), "rapporto:", extra.rapporto?.titoloAB, "pagine del PDF:", extra.rapporto?.inStampa.pagineDelPdf);
console.log(failures.length ? "FALLITI:\n- " + failures.join("\n- ") : "tutti i controlli superati");
process.exit(failures.length ? 1 : 0);
