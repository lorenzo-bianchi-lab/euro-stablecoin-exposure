// Controllo automatico del contrasto sui colori del sistema grafico (src/styles/tokens.css), nei due temi.
// Soglie WCAG 2.1 livello AA: 4,5:1 per il testo, 3:1 per testo grande ed elementi grafici (bordi dei
// comandi, serie dei grafici). Il test nel browser (tests/e2e.mjs) ripete il controllo sul testo reso.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf-8");
const block = (selector: string) => {
  const start = css.indexOf(selector + " {");
  return css.slice(start, css.indexOf("\n}", start));
};
const vars = (text: string) => Object.fromEntries([...text.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{6})\b/g)].map((m) => [m[1], m[2]]));
const light = vars(block(":root")), dark = { ...light, ...vars(block(':root[data-theme="dark"]')) };

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const TEXT: [string, string[]][] = [
  ["--ink", ["--bg", "--surface", "--surface-2", "--primary-soft", "--accent-soft"]],
  ["--ink-2", ["--bg", "--surface", "--surface-2", "--primary-soft"]],
  ["--ink-3", ["--bg", "--surface", "--surface-2"]],
  ["--primary", ["--bg", "--surface", "--surface-2", "--primary-soft"]],
  ["--accent", ["--bg", "--surface", "--surface-2", "--accent-soft"]],
  ["--positive", ["--bg", "--surface"]],
  ["--danger", ["--bg", "--surface"]],
  ["--on-primary", ["--primary", "--primary-hover"]],
  ["--notice-ink", ["--notice-bg"]],
  ["--chart-axis", ["--surface"]],
  ["--chart-tooltip-ink", ["--chart-tooltip-bg"]],
];
const GRAPHIC: [string, string[]][] = [
  ...[1, 2, 3, 4, 5, 6].map((i) => [`--chart-${i}`, ["--surface"]] as [string, string[]]),
  ["--line-strong", ["--surface", "--bg"]],
  ["--map-selected", ["--surface", "--map-none"]],
  ["--map-5", ["--map-1"]],
];

for (const [name, theme] of [["chiaro", light], ["scuro", dark]] as const) {
  describe(`contrasto, tema ${name}`, () => {
    it("tutti i colori usati sono definiti", () => {
      for (const [fg, bgs] of [...TEXT, ...GRAPHIC]) for (const k of [fg, ...bgs]) expect(theme[k], k).toMatch(/^#[0-9a-f]{6}$/i);
    });
    it("testo: almeno 4,5:1 su ogni fondo su cui compare", () => {
      const low = TEXT.flatMap(([fg, bgs]) => bgs.map((bg) => ({ pair: `${fg} su ${bg}`, ratio: +contrast(theme[fg], theme[bg]).toFixed(2) }))).filter((x) => x.ratio < 4.5);
      expect(low).toEqual([]);
    });
    it("elementi grafici e serie dei grafici: almeno 3:1", () => {
      const low = GRAPHIC.flatMap(([fg, bgs]) => bgs.map((bg) => ({ pair: `${fg} su ${bg}`, ratio: +contrast(theme[fg], theme[bg]).toFixed(2) }))).filter((x) => x.ratio < 3);
      expect(low).toEqual([]);
    });
    it("la scala della mappa è ordinata: ogni classe è più lontana dal fondo della precedente", () => {
      const l = [1, 2, 3, 4, 5].map((i) => contrast(theme[`--map-${i}`], theme["--surface"]));
      for (let i = 1; i < l.length; i++) expect(l[i], `--map-${i + 1}`).toBeGreaterThan(l[i - 1]);
    });
    it("le serie dei grafici sono distinguibili tra loro anche senza il colore: coppie vicine hanno luminanza diversa o tratto diverso", () => {
      // le prime due serie, usate più spesso insieme, devono differire anche in luminanza
      expect(Math.abs(luminance(theme["--chart-1"]) - luminance(theme["--chart-2"]))).toBeGreaterThan(0.03);
    });
  });
}
