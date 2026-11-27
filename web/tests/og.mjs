// Generates the preview image for sharing the link (public/og.png, 1200×630) and the icon
// for Apple devices (public/icon-180.png), with the colours and typefaces of the design system.
// Usage: node tests/og.mjs   (to be run again only if the name or the colours change)
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = fileURLToPath(new URL(".", import.meta.url));
const font = async (pkg, file) => (await readFile(join(here, `../node_modules/@fontsource-variable/${pkg}/files/${file}`))).toString("base64");
const serif = await font("source-serif-4", "source-serif-4-latin-wght-normal.woff2"),
  sans = await font("inter", "inter-latin-wght-normal.woff2");
const mark = (
  size,
) => `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><path d="M26 16A10 10 0 1 1 16 6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
  <rect x="10.5" y="17" width="2.8" height="5.5" rx=".9" fill="#fff"/><rect x="14.9" y="13.5" width="2.8" height="9" rx=".9" fill="#fff"/><rect x="19.3" y="9" width="2.8" height="13.5" rx=".9" fill="#f0a070"/></svg>`;
const css = `@font-face{font-family:T;src:url(data:font/woff2;base64,${serif}) format("woff2");font-weight:200 900}
@font-face{font-family:S;src:url(data:font/woff2;base64,${sans}) format("woff2");font-weight:100 900}*{box-sizing:border-box}body{margin:0}`;
const og = `<style>${css}
.c{width:1200px;height:630px;background:#163b6e;color:#fff;padding:72px 80px;display:flex;flex-direction:column;justify-content:space-between;font-family:S}
h1{font:600 76px/1.05 T;letter-spacing:-.015em;margin:28px 0 0}p{font-size:30px;line-height:1.35;color:#d5e0f2;margin:0;max-width:920px}
.f{display:flex;justify-content:space-between;align-items:center;font-size:22px;color:#b7c8e6;border-top:1px solid #3b5a8c;padding-top:24px}.a{color:#f0a070;font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:20px}</style>
<div class="c"><div>${mark(84)}<h1>Euro Stablecoin<br>Exposure Monitor</h1></div>
<p>Dollar stablecoins and euro area banks: estimated level, scenarios by country and by bank, credit, weekly monitor.</p>
<div class="f"><span class="a">ESCP Business School</span><span>Independent university project</span></div></div>`;
const icon = `<style>${css}.i{width:180px;height:180px;background:#163b6e;display:flex;align-items:center;justify-content:center}</style><div class="i">${mark(150)}</div>`;
const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL ?? "chrome", headless: true });
for (const [html, w, h, file] of [
  [og, 1200, 630, "og.png"],
  [icon, 180, 180, "icon-180.png"],
]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(here, "../public", file) });
  await page.close();
}
await browser.close();
console.log("wrote public/og.png and public/icon-180.png");
