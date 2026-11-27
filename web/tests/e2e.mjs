// Browser test of the built application (docs/). For every page, in English and in Italian:
// no console errors, no overflow at 390 pixels, no untranslated strings; tables have no clipped
// columns at 1280 pixels and below that width they scroll internally with the first column
// fixed; AA contrast of the rendered text in both themes; alternative text of the charts; footer line.
// Then: shareable address, language switch, source indicator, expandable caveats,
// map insets, printable report, Banks section, keyboard and visible focus, reduced
// motion, mobile navigation, sharing preview and page weight.
// The screenshots are taken by tests/shots.mjs.
// Usage: npm run build && npm run e2e   (uses the installed Chrome; CHROME_CHANNEL=chromium for Playwright's own)
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const DOCS = resolve(here, "../../docs"),
  OUT = resolve(here, "../../reports/figures/app");
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".md": "text/markdown",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
};
const banks = JSON.parse(await readFile(join(DOCS, "data/banks.json"), "utf-8"));
const firstBank = [...banks.banche].sort((a, b) => b.attivo - a.attivo)[0];
const SECTIONS = [
  "home",
  "overview",
  "simulator",
  "map",
  "country/IT",
  "banks",
  `banks/${firstBank.lei}`,
  "channels",
  "monitor",
  "level",
  "compare",
  "method",
  "about",
];
const NO_NOTES = ["home", "about"]; // presentation pages: they show no figures with caveats of their own
// words that must not appear in the other language; bank names and study titles are removed before the check
const SENTINELS = {
  en: [" della ", " delle ", " dei ", " sono ", " paesi", " depositi", " banche ", " con ", " gli ", " nella "],
  it: [" the ", " and ", " with ", " which ", " banks "],
};
const NAMES = [...[...banks.banche, ...banks.criterio.escluse].map((b) => b.nome), "Stablecoins and monetary policy transmission"].sort(
  (a, b) => b.length - a.length,
);
const DISCLAIMER = {
  en: "Independent university project (ESCP Business School). Not affiliated with any institution whose data it uses.",
  it: "Progetto universitario indipendente (ESCP Business School). Non affiliato ad alcuna istituzione di cui usa i dati.",
};
const AUTHOR = "Lorenzo Bianchi",
  UNIVERSITY = "ESCP Business School";

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  try {
    const file = join(DOCS, path === "/" ? "index.html" : path);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
const results = [],
  failures = [];
const fail = (m) => failures.push(m);
async function visit(page, route) {
  await page.goto(base + "#/" + route);
  await page.waitForSelector("main .card", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector("[data-loading]"), null, { timeout: 15000 });
  await page.waitForTimeout(700); // the charts draw after the first render
}
const watch = (page, errors) => {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("requestfailed", (q) => errors.push(`request failed: ${q.url()}`));
};
/** Tables of the page: width of the content against the visible width, and fixed first column after a scroll. */
const tables = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll(".table-wrap")].map((w) => {
      const cell = w.querySelector("tbody td"),
        over = w.scrollWidth - w.clientWidth;
      let stuck = null;
      if (over > 1 && cell) {
        w.scrollLeft = Math.min(over, 120);
        stuck = Math.abs(cell.getBoundingClientRect().left - w.getBoundingClientRect().left) <= 1.5;
        w.scrollLeft = 0;
      }
      return { over, overflowX: getComputedStyle(w).overflowX, sticky: cell ? getComputedStyle(cell).position === "sticky" : null, stuck };
    }),
  );
const leaks = async (page, lang) => {
  let text = " " + (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ") + " ";
  for (const n of NAMES) text = text.split(n).join("");
  const low = text.toLowerCase();
  return { missing: (text.match(/⟦[^⟧]*⟧/g) ?? []).slice(0, 5), foreign: SENTINELS[lang].filter((w) => low.includes(w)) };
};
/** Contrast of the rendered text: for every element with text of its own, text colour against the first opaque background behind it. */
const lowContrast = (page) =>
  page.evaluate(() => {
    const rgb = (s) => {
      const m = s.match(/[\d.]+/g).map(Number);
      return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 };
    };
    const lum = ({ r, g, b }) => {
      const f = (c) => {
        c /= 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const over = (top, under) => ({
      r: top.r * top.a + under.r * (1 - top.a),
      g: top.g * top.a + under.g * (1 - top.a),
      b: top.b * top.a + under.b * (1 - top.a),
      a: 1,
    });
    const background = (el) => {
      const layers = [];
      for (let e = el; e; e = e.parentElement) {
        const c = rgb(getComputedStyle(e).backgroundColor);
        if (c.a > 0) {
          layers.push(c);
          if (c.a === 1) break;
        }
      }
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
      const bg = background(el),
        fg = over(rgb(cs.color), bg);
      const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x),
        ratio = (a + 0.05) / (b + 0.05);
      const size = parseFloat(cs.fontSize),
        large = size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5))
        bad.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0]} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
    }
    return bad;
  });
const charts = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll("figure.chart")].map((f) => {
      const img = f.querySelector('[role="img"]');
      return {
        bare: f.classList.contains("bare"),
        label: img?.getAttribute("aria-label") ?? "",
        alt: f.querySelector(".sr-only")?.textContent ?? "",
        canvas: !!f.querySelector("canvas"),
      };
    }),
  );

for (const route of SECTIONS) {
  const r = {
    section: route,
    consoleErrors: [],
    overflow390: null,
    charts: 0,
    chartsWithoutAltText: 0,
    caveats: 0,
    tables1280: 0,
    tablesCut1280: 0,
    tablesScrolling390: 0,
    lowContrast: { light: 0, dark: 0 },
    language: {},
  };
  for (const [w, h, suffix] of [
    [1280, 900, ""],
    [390, 844, "_390"],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: "light" });
    const page = await ctx.newPage();
    watch(page, r.consoleErrors);
    try {
      await visit(page, route);
      const tb = await tables(page);
      if (!suffix) {
        const ch = await charts(page);
        r.charts = ch.filter((c) => c.canvas).length;
        r.chartsWithoutAltText = ch.filter((c) => !c.label || (!c.bare && c.alt.trim().length < 20)).length;
        r.caveats = await page.locator("details.note").count();
        r.tables1280 = tb.length;
        r.tablesCut1280 = tb.filter((t) => t.over > 1).length;
        r.language.en = await leaks(page, "en");
        const low = await lowContrast(page);
        r.lowContrast.light = low.length;
        if (low.length) fail(`${route} (light): ${low.length} texts below AA contrast, for example ${low.slice(0, 3).join(" | ")}`);
        if ((await page.evaluate(() => document.documentElement.lang)) !== "en") fail(`${route}: the default language is not English`);
        if (await page.locator("details.note[open]").count()) fail(`${route}: a caveat is open at start`);
        if (!(await page.locator("#source-indicator").count())) fail(`${route}: the source indicator is missing from the sidebar`);
        if (await page.locator(".banner").count()) fail(`${route}: the notice at the top of the page is still there`);
        if (!(await page.locator("main > footer.foot").innerText()).includes(DISCLAIMER.en)) fail(`${route}: the footer line is missing`);
        if ((await page.title()) !== "Euro Stablecoin Exposure Monitor") fail(`${route}: unexpected page title`);
      } else {
        const m = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
        r.overflow390 = m.scroll - m.inner;
        r.tablesScrolling390 = tb.filter((t) => t.over > 1).length;
        if (tb.some((t) => t.overflowX !== "auto")) fail(`${route}: a table does not scroll internally`);
        if (tb.some((t) => t.over > 1 && !(t.sticky && t.stuck))) fail(`${route}: at 390 px the first column of a scrolling table does not stay fixed`);
        const nav = await page.evaluate(() => ({
          tabbar: getComputedStyle(document.querySelector(".tabbar")).display,
          sidebar: document.querySelector(".side") ? getComputedStyle(document.querySelector(".side")).display : "none",
        }));
        if (nav.tabbar === "none" || nav.sidebar !== "none") fail(`${route}: at 390 px the mobile navigation is missing or the sidebar is still shown`);
      }
      if (!suffix) {
        // the same page in Italian
        await visit(page, route + "?lang=it");
        r.language.it = await leaks(page, "it");
        if ((await page.evaluate(() => document.documentElement.lang)) !== "it") fail(`${route}: lang=it does not set Italian`);
        if ((await tables(page)).some((t) => t.over > 1)) fail(`${route}: in Italian a table has clipped columns at 1280 px`);
        if (!(await page.locator("main > footer.foot").innerText()).includes(DISCLAIMER.it)) fail(`${route}: the footer line is missing in Italian`);
      }
    } catch (e) {
      r.consoleErrors.push(`loading failed at ${w}px: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
  {
    // contrast in the dark theme
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
    const page = await ctx.newPage();
    try {
      await visit(page, route);
      const low = await lowContrast(page);
      r.lowContrast.dark = low.length;
      if (low.length) fail(`${route} (dark): ${low.length} texts below AA contrast, for example ${low.slice(0, 3).join(" | ")}`);
    } catch (e) {
      r.consoleErrors.push(`dark theme: ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
  if (r.consoleErrors.length) fail(`${route}: ${r.consoleErrors.length} console errors: ${r.consoleErrors[0]}`);
  if (r.overflow390 === null || r.overflow390 > 1) fail(`${route}: horizontal overflow of ${r.overflow390} px at 390 px`);
  if (r.tablesCut1280) fail(`${route}: ${r.tablesCut1280} tables with clipped columns at 1280 px`);
  if (r.chartsWithoutAltText) fail(`${route}: ${r.chartsWithoutAltText} charts without alternative text`);
  if (!r.caveats && !NO_NOTES.includes(route)) fail(`${route}: no caveat in the section`);
  for (const lang of ["en", "it"]) {
    const l = r.language[lang];
    if (!l) continue;
    if (l.missing.length) fail(`${route} (${lang}): missing translation keys ${l.missing.join(" ")}`);
    if (l.foreign.length) fail(`${route} (${lang}): text in the other language, words found:${l.foreign.join(",")}`);
  }
  results.push(r);
}
if (!results.some((r) => r.tablesScrolling390 > 0)) fail("at 390 px no table scrolls: the check on the fixed first column verified nothing");

// ---- shareable address, dark theme, language switch, old Italian addresses
const extra = {};
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "dark" });
  const page = await ctx.newPage();
  await visit(page, "simulator?imp=300&sost=50&reg=R3&dep=T2&cred=continua");
  const s = await page.evaluate(() => ({
    amount: document.querySelector(".slider-value")?.textContent ?? "",
    rule: document.querySelector("#reg")?.value,
    deposits: document.querySelector("#dep")?.value,
    credit: document.querySelector("#cred")?.value,
    outflow: document.querySelector(".hero-value")?.textContent ?? "",
    theme: document.documentElement.dataset.theme,
  }));
  await page.click('nav a[data-section="map"]');
  await page.waitForFunction(() => document.querySelectorAll(".insets canvas").length === 3, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  s.afterNavigation = page.url().split("#")[1];
  s.mapInsets = await page.locator(".insets .inset canvas").count();
  s.mapLegend = await page.locator('[data-legend="map"] li').count();
  if (!s.amount.startsWith("€300.0 bn") || s.rule !== "R3" || s.deposits !== "T2" || s.credit !== "continua")
    fail("the scenario in the address was not applied");
  if (!s.outflow.startsWith("€150.0 bn")) fail(`expected outflow €150.0 bn (300 × 50%), found ${s.outflow}`);
  if (!/imp=300/.test(s.afterNavigation) || !/reg=R3/.test(s.afterNavigation)) fail("the scenario is not kept when changing section");
  if (s.theme !== "dark") fail("the dark theme does not follow the system preference");
  if (s.mapInsets !== 3) fail(`expected 3 enlarged insets on the map, found ${s.mapInsets}`);
  if (s.mapLegend < 3) fail("the map has no readable class legend");

  // language switch from the button: the choice goes into the address and stays while navigating
  await page.click("#lang-switch");
  await page.waitForFunction(() => document.documentElement.lang === "it", null, { timeout: 15000 });
  s.afterLanguageSwitch = page.url().split("#")[1];
  await page.click('nav a[data-section="simulator"]');
  await page.waitForTimeout(600);
  s.italian = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent,
    amount: document.querySelector(".slider-value")?.textContent ?? "",
    url: location.hash,
  }));
  if (!/lang=it/.test(s.afterLanguageSwitch) || !/lang=it/.test(s.italian.url) || !/imp=300/.test(s.italian.url))
    fail("the chosen language is not kept in the address");
  if (s.italian.title !== "Simulatore" || !s.italian.amount.startsWith("300,0 mld €"))
    fail(`in Italian, Italian title and number format expected, found ${JSON.stringify(s.italian)}`);
  await page.click("#lang-switch");
  await page.waitForFunction(() => document.documentElement.lang === "en", null, { timeout: 15000 });
  if (/lang=/.test(page.url())) fail("back in English the lang parameter stays in the address");

  // an address shared before the English version keeps working
  await visit(page, "simulatore?imp=120&lang=it");
  s.oldAddress = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent,
    amount: document.querySelector(".slider-value")?.textContent ?? "",
  }));
  if (s.oldAddress.title !== "Simulatore" || !s.oldAddress.amount.startsWith("120,0 mld €")) fail("an old Italian address does not open the right section");
  extra.address = s;
  await ctx.close();
}

// ---- expandable caveats, source indicator, A and B report, banks
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  watch(page, errors);
  await visit(page, "simulator");
  const note = page.locator("details.note").first();
  const closed = await note.evaluate((n) => ({
    lines: Math.round(n.querySelector("summary").getBoundingClientRect().height / parseFloat(getComputedStyle(n).lineHeight)),
    detail: n.querySelector("p").textContent.length,
  }));
  await note.locator("summary").click();
  const open = await note.evaluate((n) => n.open && n.querySelector("p").getBoundingClientRect().height > 0);
  extra.caveat = { closedLines: closed.lines, detailCharacters: closed.detail, opens: open };
  if (closed.lines > 2 || closed.detail < 40 || !open) fail(`the caveat is not one line with an expandable detail: ${JSON.stringify(extra.caveat)}`);

  await page.click("#source-indicator");
  await page.waitForSelector("#source-notice", { timeout: 15000 });
  extra.sourceIndicator = { leadsTo: page.url().split("#")[1], text: (await page.locator("#source-notice").innerText()).slice(0, 200) };
  if (!extra.sourceIndicator.leadsTo.startsWith("/method")) fail("the source indicator does not lead to Method and data");

  await visit(page, "compare");
  const titleA = await page.locator(".report h2").innerText();
  await page.click('.report button[aria-pressed="false"]');
  await page.waitForTimeout(300);
  const titleAB = await page.locator(".report h2").innerText();
  const headAB = await page.locator(".report table").nth(1).locator("th").allInnerTexts();
  await page.evaluate(() => document.body.classList.add("print-report"));
  await page.emulateMedia({ media: "print" });
  const printed = await page.evaluate(() => ({
    visible: [...document.querySelectorAll(".main > *")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => e.className || e.tagName),
    controls: [...document.querySelectorAll(".report button")].filter((b) => b.getBoundingClientRect().height > 0).length,
    pages: document.querySelectorAll(".report .report-page").length,
    headers: [...document.querySelectorAll(".report .report-head")].map((h) => h.textContent.trim().slice(0, 80)),
  }));
  const pdf = await page.pdf({ format: "A4", printBackground: true });
  await writeFile(join(OUT, "report_ab.pdf"), pdf);
  printed.pdfPages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  await page.emulateMedia({ media: "screen" });
  await page.evaluate(() => document.body.classList.remove("print-report"));
  extra.report = { titleA, titleAB, columnsAB: headAB, inPrint: printed, address: page.url().split("#")[1] };
  if (titleA === titleAB || !headAB.some((h) => /B/.test(h)) || !/rep=ab/.test(extra.report.address))
    fail("the report comparing two scenarios does not appear");
  if (printed.controls !== 0 || !printed.visible.every((c) => /report|H1/.test(c)))
    fail(`in print, not only the report remains: ${JSON.stringify(printed.visible)}`);
  if (printed.pages !== 2 || printed.pdfPages !== 2 || !printed.headers.every((h) => h.includes("Euro Stablecoin Exposure Monitor")))
    fail(`the report is not a two-page document with a header: ${JSON.stringify(printed)}`);

  await visit(page, "banks");
  const table = page.locator("main table").first();
  const total = Number(await page.locator("#banks-table").getAttribute("data-total")),
    firstPage = await table.locator("tbody tr").count();
  const pager = await page.locator("#banks-table .pager").count();
  if (pager) {
    await page.click('#banks-table [data-page="next"]');
    await page.waitForTimeout(200);
  }
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
  extra.banks = {
    banks: total,
    firstPageRows: firstPage,
    secondPageRows: secondPage,
    italyRows: italy,
    searchRows: found,
    sheet: await page.locator("main .card h2").first().innerText(),
    address: page.url().split("#")[1],
  };
  if (
    total !== banks.banche.length ||
    !pager ||
    firstPage >= total ||
    firstPage > 30 ||
    secondPage < 1 ||
    italy !== banks.banche.filter((b) => b.paese === "IT").length ||
    found !== 1 ||
    !/unicredit/i.test(extra.banks.sheet) ||
    !/^\/banks\/[A-Z0-9]{20}/.test(extra.banks.address)
  )
    fail(`Banks section: pagination, filter, search or bank sheet do not work: ${JSON.stringify(extra.banks)}`);
  if (errors.length) fail(`console errors in the additional checks: ${errors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

// ---- keyboard: skip-to-content link, visible focus on every element reached
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let page = await ctx.newPage();
  const keyboard = {};
  for (const route of ["home", "simulator", "map", "banks", "compare"]) {
    await page.close();
    page = await ctx.newPage(); // new page: the focus starts again from the beginning of the document
    await visit(page, route);
    await page.keyboard.press("Tab");
    const skip = await page.evaluate(() => ({
      className: document.activeElement?.className,
      visible: document.activeElement?.getBoundingClientRect().top >= 0,
    }));
    const seen = [],
      invisible = [];
    for (let i = 0; i < 45; i++) {
      await page.keyboard.press("Tab");
      const f = await page.evaluate(() => {
        const e = document.activeElement;
        if (!e || e === document.body) return null;
        const cs = getComputedStyle(e);
        return {
          tag: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + "." + String(e.className).split(" ")[0],
          ring: cs.boxShadow !== "none" || (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0),
        };
      });
      if (!f) break;
      seen.push(f.tag);
      if (!f.ring) invisible.push(f.tag);
    }
    keyboard[route] = { reached: seen.length, types: [...new Set(seen.map((s) => s.split(/[#.]/)[0]))], withoutVisibleFocus: [...new Set(invisible)] };
    if (skip.className !== "skip" || !skip.visible) fail(`${route}: the first Tab does not lead to the "skip to content" link`);
    if (seen.length < 15) fail(`${route}: only ${seen.length} elements can be reached from the keyboard`);
    if (invisible.length) fail(`${route}: focus not visible on ${[...new Set(invisible)].slice(0, 4).join(", ")}`);
  }
  await visit(page, "overview");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  keyboard.skipToContent = await page.evaluate(() => document.activeElement?.id);
  if (keyboard.skipToContent !== "content") fail('the "skip to content" link does not move the focus to the content');
  extra.keyboard = keyboard;
  await ctx.close();
}

// ---- reduced motion: no animation, neither in the components nor in the charts
{
  const motion = {};
  for (const reduce of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: reduce ? "reduce" : "no-preference" });
    const page = await ctx.newPage();
    await visit(page, "simulator");
    motion[reduce ? "reduced" : "normal"] = await page.evaluate(() => ({
      valueAnimation: getComputedStyle(document.querySelector(".changed")).animationName,
      buttonTransition: getComputedStyle(document.querySelector(".btn")).transitionDuration,
      charts: [...new Set([...document.querySelectorAll("figure.chart [data-motion]")].map((e) => e.getAttribute("data-motion")))],
    }));
    await ctx.close();
  }
  extra.motion = motion;
  if (motion.reduced.valueAnimation !== "none" || !/^0s/.test(motion.reduced.buttonTransition) || motion.reduced.charts.join() !== "off")
    fail(`with reduced motion some animations remain: ${JSON.stringify(motion.reduced)}`);
  if (motion.normal.valueAnimation === "none" || motion.normal.charts.join() !== "on")
    fail(`without reduced motion the transitions are missing: ${JSON.stringify(motion.normal)}`);
}

// ---- mobile navigation: bottom bar, full-screen menu, closing with Esc
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await visit(page, "home");
  const mobile = { items: await page.locator(".tabbar a").count() };
  await page.click(".tabbar button");
  await page.waitForSelector(".drawer nav a", { timeout: 5000 });
  mobile.menuItems = await page.locator(".drawer nav a").count();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  mobile.closedWithEsc = (await page.locator(".drawer").count()) === 0;
  await page.click(".topbar button");
  await page.click('.drawer nav a[data-section="monitor"]');
  await page.waitForSelector(".drawer", { state: "detached", timeout: 5000 }).catch(() => {});
  await page.waitForFunction(() => location.hash.startsWith("#/monitor"), null, { timeout: 5000 }).catch(() => {});
  await page.waitForSelector("main .card", { timeout: 15000 });
  mobile.afterMenu = { section: page.url().split("#")[1], menuOpen: await page.locator(".drawer").count() };
  await page.click('.tabbar a[data-tab="banks"]');
  await page.waitForTimeout(500);
  mobile.afterTabBar = page.url().split("#")[1];
  extra.mobile = mobile;
  if (
    mobile.items < 4 ||
    mobile.menuItems !== SECTIONS.length - 1 ||
    !mobile.closedWithEsc ||
    !mobile.afterMenu.section.startsWith("/monitor") ||
    mobile.afterMenu.menuOpen ||
    !mobile.afterTabBar.startsWith("/banks")
  )
    fail(`mobile navigation: ${JSON.stringify(mobile)}`);
  await ctx.close();
}

// ---- address without a section, selection on the map, caveats, About, guided tour, methodological note
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  watch(page, errors);
  const closing = {};
  await page.goto(base);
  await page.waitForSelector("main .card", { timeout: 15000 });
  closing.noSection = await page.evaluate(() => ({
    title: document.querySelector("h1")?.textContent,
    findings: document.querySelectorAll("#findings .finding").length,
    active: document.querySelector("nav a.active")?.getAttribute("data-section"),
  }));
  if (closing.noSection.title !== "Euro Stablecoin Exposure Monitor" || closing.noSection.findings !== 3 || closing.noSection.active !== "home")
    fail(`the address without a section does not open the home page: ${JSON.stringify(closing.noSection)}`);

  await visit(page, "map");
  const first = (await page.locator("main table tbody tr").first().locator("td").first().innerText()).trim();
  const open = page.locator('main a.btn.primary[href*="country/"]');
  closing.map = {
    highest: first,
    selected: (await open.count()) ? (await page.locator("main .card h2").allInnerTexts()).includes(first) : false,
    address: page.url().split("#")[1],
  };
  if (!closing.map.selected || /sel=/.test(closing.map.address))
    fail(`the map does not open with the highest-value country selected: ${JSON.stringify(closing.map)}`);
  await page.locator("main .card-head button").first().click();
  await page.waitForTimeout(300);
  closing.map.afterDeselection = { links: await open.count(), address: page.url().split("#")[1] };
  if (closing.map.afterDeselection.links !== 0 || !/sel=none/.test(closing.map.afterDeselection.address)) fail("deselection on the map does not work");

  // caveats: below a chart or a table (or below the highlighted result or the list they refer to), in a neutral style
  const notes = {};
  for (const route of SECTIONS) {
    await visit(page, route);
    notes[route] = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.background = "var(--notice-bg)";
      document.body.appendChild(probe);
      const yellow = getComputedStyle(probe).backgroundColor;
      probe.remove();
      const kind = (el) => {
        for (let e = el.previousElementSibling; e; e = e.previousElementSibling) {
          if (e.matches("details.note, p, ul.legend, .insets, .table-foot, .row")) continue;
          if (e.querySelector(":scope select, :scope input") && !e.querySelector(":scope figure.chart, :scope .table-wrap")) continue; // a control between the chart and its caveat
          if (e.matches("figure.chart") || e.querySelector(":scope figure.chart")) return "chart";
          if (e.matches(".table-wrap, table") || e.querySelector(":scope .table-wrap")) return "table";
          if (e.matches(".hero")) return "result";
          if (e.matches("ul, ol, dl, .kpis")) return "list";
          return "other:" + e.tagName.toLowerCase() + "." + e.className;
        }
        const parent = el.parentElement?.previousElementSibling;
        return parent?.matches(".hero") ? "result" : "start";
      };
      const all = [...document.querySelectorAll("details.note")];
      const count = {};
      for (const n of all) {
        const k = kind(n);
        count[k] = (count[k] ?? 0) + 1;
      }
      return {
        position: count,
        yellow: all.filter((n) => getComputedStyle(n).backgroundColor === yellow).map((n) => n.className),
        active: all.filter((n) => n.classList.contains("active")).length,
      };
    });
    const bad = Object.keys(notes[route].position).filter((k) => k.startsWith("other") || k === "start");
    if (bad.length) fail(`${route}: caveats not below a chart, a table or the result they refer to (${bad.join(", ")})`);
    if (notes[route].yellow.some((c) => !c.includes("active"))) fail(`${route}: an ordinary caveat is still yellow`);
  }
  closing.caveats = notes;
  const placed = Object.values(notes).reduce((a, n) => {
    for (const [k, v] of Object.entries(n.position)) a[k] = (a[k] ?? 0) + v;
    return a;
  }, {});
  closing.caveatsByPosition = placed;
  if ((placed.chart ?? 0) + (placed.table ?? 0) < 20) fail(`few caveats below charts and tables: ${JSON.stringify(placed)}`);

  // About: the author and the university in both languages, and no placeholder in square brackets
  for (const lang of ["en", "it"]) {
    await visit(page, "about" + (lang === "it" ? "?lang=it" : ""));
    const authors = await page.locator("#authors").innerText();
    if (!authors.includes(AUTHOR) || !authors.includes(UNIVERSITY) || /\[[^\]]*\]/.test(authors))
      fail(`About (${lang}): author, course or university missing, or a placeholder left: ${authors.replace(/\s+/g, " ")}`);
    closing["about_" + lang] = authors.replace(/\s+/g, " ");
  }

  // guided tour: five steps in order, can be skipped with the button and with Esc, in both languages
  const tour = { steps: [] };
  for (const lang of ["en", "it"]) {
    await visit(page, "home" + (lang === "it" ? "?lang=it" : ""));
    await page.click("#tour-start");
    for (let step = 1; step <= 5; step++) {
      await page.waitForSelector(`.tour[data-step="${step}"]`, { timeout: 15000 });
      await page.waitForSelector("main .card", { timeout: 15000 });
      const text = await page.locator(".tour").innerText();
      if (lang === "en") tour.steps.push({ step, section: page.url().split("#/")[1].split("?")[0], title: text.split("\n").filter(Boolean)[1] });
      if (text.includes("⟦") || text.length < 120) fail(`guided tour (${lang}), step ${step}: text missing`);
      await page.click("#tour-next");
    }
    await page.waitForSelector(".tour", { state: "detached", timeout: 5000 }).catch(() => {});
    if ((await page.locator(".tour").count()) || /tour=/.test(page.url())) fail(`guided tour (${lang}): it does not close at the last step`);
  }
  if (tour.steps.map((x) => x.section).join() !== "home,simulator,map,banks,monitor")
    fail(`guided tour: unexpected order of the steps ${tour.steps.map((x) => x.section).join()}`);
  await visit(page, "home?tour=1");
  await page.click("#tour-skip");
  await page.waitForTimeout(300);
  tour.skippedWithButton = (await page.locator(".tour").count()) === 0;
  await visit(page, "simulator?tour=2");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  tour.skippedWithEsc = (await page.locator(".tour").count()) === 0;
  await visit(page, "simulator?tour=2");
  await page.click('nav a[data-section="overview"]');
  await page.waitForTimeout(400);
  tour.closedByNavigation = !/tour=/.test(page.url());
  if (!tour.skippedWithButton || !tour.skippedWithEsc || !tour.closedByNavigation) fail(`guided tour: it cannot be skipped: ${JSON.stringify(tour)}`);
  closing.tour = tour;

  await visit(page, "method");
  const noteHref = await page.locator("#method-note").getAttribute("href");
  let notePages = 0,
    noteKb = 0;
  try {
    const pdf = await readFile(join(DOCS, noteHref));
    noteKb = Math.round(pdf.length / 1024);
    notePages = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  } catch {
    /* file missing */
  }
  closing.methodNote = { link: noteHref, pages: notePages, kB: noteKb };
  if (notePages !== 2) fail(`the methodological note linked from Method and data is not a two-page PDF: ${JSON.stringify(closing.methodNote)}`);
  if (errors.length) fail(`console errors in the closing checks: ${errors.slice(0, 3).join(" | ")}`);
  Object.assign(extra, { closing });
  await ctx.close();
}

// ---- complete charts: after three seconds the points drawn match the data points, with the tab visible
// and with the tab in the background (document hidden and no animation frame: this is also what happens
// in print or in a capture when the animation does not start)
{
  const complete = {};
  for (const mode of ["visible", "background"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    if (mode === "background")
      await ctx.addInitScript(() => {
        Object.defineProperty(document, "visibilityState", { get: () => "hidden" });
        Object.defineProperty(document, "hidden", { get: () => true });
        window.requestAnimationFrame = () => 0;
      });
    for (const route of SECTIONS) {
      const page = await ctx.newPage();
      await page.goto(base + "#/" + route);
      await page.waitForTimeout(3000);
      const state = await page.evaluate(() =>
        [...document.querySelectorAll('figure.chart [role="img"]')].map((el) => {
          const canvas = el.querySelector("canvas");
          let painted = 0;
          if (canvas) {
            const d = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) painted++;
          }
          return { ...(el.__state ? el.__state() : { expected: -1, drawn: -1 }), painted, visibility: document.visibilityState };
        }),
      );
      await page.close();
      complete[route] ??= {};
      complete[route][mode] = {
        charts: state.length,
        dataPoints: state.reduce((a, x) => a + x.expected, 0),
        drawnPoints: state.reduce((a, x) => a + x.drawn, 0),
      };
      const bad = state.filter((x) => x.expected <= 0 || x.drawn !== x.expected || x.painted < 5); // painted: samples of non-transparent pixels; the map insets are small
      if (bad.length) fail(`${route} (${mode}): ${bad.length} charts incomplete after 3 seconds: ${JSON.stringify(bad.slice(0, 2))}`);
      const expectedCharts = results.find((r) => r.section === route)?.charts ?? 0;
      if (state.length !== expectedCharts) fail(`${route} (${mode}): ${state.length} charts present after 3 seconds, ${expectedCharts} expected`);
    }
    await ctx.close();
  }
  extra.completeCharts = complete;
}

// ---- sharing preview and icon
{
  const html = await readFile(join(DOCS, "index.html"), "utf-8");
  const share = {
    title: /<title>Euro Stablecoin Exposure Monitor<\/title>/.test(html),
    missing: ["og:title", "og:description", "og:image", "twitter:card"].filter((k) => !html.includes(k)),
    icon: html.includes("favicon.svg"),
  };
  for (const f of ["og.png", "favicon.svg", "icon-180.png"]) {
    try {
      share[f] = (await readFile(join(DOCS, f))).length;
    } catch {
      share[f] = 0;
    }
  }
  extra.sharing = share;
  if (!share.title || share.missing.length || !share.icon || !share["og.png"] || !share["favicon.svg"])
    fail(`title, icon or sharing preview missing: ${JSON.stringify(share)}`);
}

// ---- weight: what is downloaded when each page is opened first (uncompressed bytes), and only what is needed
{
  const weights = {};
  for (const route of SECTIONS) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const got = [];
    page.on("response", async (q) => {
      try {
        got.push({ file: q.url().split("/").pop().split("?")[0], kb: (await q.body()).length / 1024 });
      } catch {
        /* response without a body */
      }
    });
    await visit(page, route);
    const sum = (re) => Math.round(got.filter((g) => re.test(g.file)).reduce((a, g) => a + g.kb, 0));
    weights[route] = {
      code: sum(/\.js$/),
      style: sum(/\.css$/),
      fonts: sum(/\.woff2$/),
      data: sum(/\.json$/),
      total: Math.round(got.reduce((a, g) => a + g.kb, 0)),
      files: got.filter((g) => /\.js$/.test(g.file)).map((g) => g.file.replace(/-[\w-]{8}\.js$/, "")),
    };
    await ctx.close();
  }
  extra.weight = weights;
  const own = {
    home: "Home",
    about: "About",
    overview: "Overview",
    simulator: "Simulator",
    map: "MapEurope",
    country: "CountrySheet",
    banks: "Banks",
    channels: "Channels",
    monitor: "Monitor",
    level: "Level",
    compare: "Compare",
    method: "Method",
  };
  const pages = Object.values(own);
  for (const [route, w] of Object.entries(weights)) {
    const others = w.files.filter((f) => pages.includes(f) && f !== own[route.split("/")[0]]);
    if (others.length) fail(`opening ${route} also downloads other sections: ${others.join(", ")}`);
    if (w.files.includes("it")) fail(`opening ${route} in English also downloads the Italian texts`);
  }
  if (weights.about.code > 340) fail(`a page without charts downloads the charting library: about ${weights.about.code} kB of code`);
}

await browser.close();
server.close();
const out = { ranAt: new Date().toISOString(), sections: results, ...extra, failures };
await writeFile(join(OUT, "browser_test_results.json"), JSON.stringify(out, null, 1));
for (const r of results)
  console.log(
    `${r.section.padEnd(28)} charts ${r.charts}  caveats ${r.caveats}  tables ${r.tables1280} (clipped ${r.tablesCut1280}, scrolling at 390: ${r.tablesScrolling390})  low contrast ${r.lowContrast.light}/${r.lowContrast.dark}  errors ${r.consoleErrors.length}  overflow at 390 px: ${r.overflow390} px`,
  );
console.log(
  "weight (uncompressed kB, code/total):",
  Object.entries(extra.weight ?? {})
    .map(([k, v]) => `${k.split("/")[0]} ${v.code}/${v.total}`)
    .join("  "),
);
console.log(
  "complete charts (data points/drawn, visible | background):",
  Object.entries(extra.completeCharts ?? {})
    .filter(([, v]) => v.visible.charts)
    .map(([k, v]) => `${k.split("/")[0]} ${v.visible.dataPoints}/${v.visible.drawnPoints} | ${v.background.dataPoints}/${v.background.drawnPoints}`)
    .join("  "),
);
console.log(
  "caveats by position:",
  JSON.stringify(extra.closing?.caveatsByPosition),
  "guided tour:",
  extra.closing?.tour.steps.map((x) => x.section).join(" > "),
  "note:",
  JSON.stringify(extra.closing?.methodNote),
);
console.log("banks:", JSON.stringify(extra.banks), "report:", extra.report?.titleAB, "PDF pages:", extra.report?.inPrint.pdfPages);
console.log(failures.length ? "FAILED:\n- " + failures.join("\n- ") : "all checks passed");
process.exit(failures.length ? 1 : 0);
