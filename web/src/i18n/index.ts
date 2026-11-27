// Interface language. The texts are in en.json and it.json, loaded on demand:
// at start-up only the chosen language is downloaded. The choice lives in the address (lang=it).
export type Lang = "en" | "it";
export const LANGS: Lang[] = ["en", "it"];
type Vars = Record<string, string | number>;

let lang: Lang = "en";
let dict: Record<string, string> = {};
const loaders: Record<Lang, () => Promise<unknown>> = { en: () => import("./en"), it: () => import("./it") };

export async function loadLang(l: Lang): Promise<void> {
  dict = ((await loaders[l]()) as { default: Record<string, string> }).default;
  lang = l;
  document.documentElement.lang = l;
  document.title = t("app.title");
}
export const getLang = () => lang;
export const locale = () => (lang === "it" ? "it-IT" : "en-GB");
export const has = (key: string) => Object.prototype.hasOwnProperty.call(dict, key);

/** Translated text; {name} is replaced with vars.name. A missing key stays visible, so the test finds it. */
export function t(key: string, vars?: Vars): string {
  const s = dict[key];
  if (s === undefined) return `⟦${key}⟧`;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

// ---------- numbers and dates according to the language
const missing = (x: number | null | undefined): x is null | undefined => x === null || x === undefined || Number.isNaN(x);
export const nf = (x: number | null | undefined, d = 1) =>
  missing(x) ? t("fmt.na") : x.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (x: number | null | undefined, d = 1) => (missing(x) ? t("fmt.na") : nf(100 * x, d) + "%");
export const signed = (x: number | null | undefined, d = 1) => (missing(x) ? t("fmt.na") : (x > 0 ? "+" : "") + nf(x, d));
/** Billions of euro or of dollars, with the symbol where the language puts it. */
export const bn = (x: number | null | undefined, d = 1, cur: "eur" | "usd" = "eur") =>
  missing(x) ? t("fmt.na") : t(cur === "eur" ? "fmt.bnEur" : "fmt.bnUsd", { n: nf(x, d) });
const date = (iso: string, opt: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale(), { ...opt, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
export const day = (iso?: string | null) => (iso ? date(iso.slice(0, 10), { day: "numeric", month: "long", year: "numeric" }) : t("fmt.na"));
export const month = (ym?: string | null) => (ym ? date(ym.slice(0, 7) + "-01", { month: "long", year: "numeric" }) : t("fmt.na"));
export const quarter = (q?: string | null) => (q ? t("fmt.quarter", { q: q.slice(-1), y: q.slice(0, 4) }) : t("fmt.na"));
export const country = (code: string) => t(`country.${code}`);
/** List in prose: "A, B and C". */
export const listing = (items: string[]) => (items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + t("fmt.and") + items[items.length - 1]);
/** Date of a source, according to the type declared in the data. */
export function sourceDate(kind: string, value: string): string {
  switch (kind) {
    case "giorno":
      return day(value);
    case "settimana":
      return t("fmt.weekOf", { d: day(value) });
    case "mese":
      return month(value);
    case "trimestre":
      return quarter(value);
    case "testo":
      return t(`period.${value}`);
    default:
      return value;
  }
}
