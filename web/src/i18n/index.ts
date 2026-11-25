// Lingua dell'interfaccia. I testi stanno in en.json e it.json, caricati su richiesta:
// all'avvio si scarica solo la lingua scelta. La scelta vive nell'indirizzo (lang=it).
export type Lang = "en" | "it";
export const LANGS: Lang[] = ["en", "it"];
type Vars = Record<string, string | number>;

let lang: Lang = "en";
let dict: Record<string, string> = {};
const loaders: Record<Lang, () => Promise<unknown>> = { en: () => import("./en.json"), it: () => import("./it.json") };

export async function loadLang(l: Lang): Promise<void> {
  dict = ((await loaders[l]()) as { default: Record<string, string> }).default;
  lang = l;
  document.documentElement.lang = l;
  document.title = t("app.title");
}
export const getLang = () => lang;
export const locale = () => (lang === "it" ? "it-IT" : "en-GB");
export const has = (key: string) => Object.prototype.hasOwnProperty.call(dict, key);

/** Testo tradotto; {nome} viene sostituito con vars.nome. Una chiave mancante resta visibile, così il test la trova. */
export function t(key: string, vars?: Vars): string {
  const s = dict[key];
  if (s === undefined) return `⟦${key}⟧`;
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s;
}

// ---------- numeri e date secondo la lingua
const missing = (x: number | null | undefined): x is null | undefined => x === null || x === undefined || Number.isNaN(x);
export const nf = (x: number | null | undefined, d = 1) => (missing(x) ? t("fmt.na") : x.toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d }));
export const pct = (x: number | null | undefined, d = 1) => (missing(x) ? t("fmt.na") : nf(100 * x, d) + "%");
export const signed = (x: number | null | undefined, d = 1) => (missing(x) ? t("fmt.na") : (x > 0 ? "+" : "") + nf(x, d));
/** Miliardi di euro o di dollari, con il simbolo nella posizione della lingua. */
export const bn = (x: number | null | undefined, d = 1, cur: "eur" | "usd" = "eur") => (missing(x) ? t("fmt.na") : t(cur === "eur" ? "fmt.bnEur" : "fmt.bnUsd", { n: nf(x, d) }));
const date = (iso: string, opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale(), { ...opt, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
export const day = (iso?: string | null) => (iso ? date(iso.slice(0, 10), { day: "numeric", month: "long", year: "numeric" }) : t("fmt.na"));
export const month = (ym?: string | null) => (ym ? date(ym.slice(0, 7) + "-01", { month: "long", year: "numeric" }) : t("fmt.na"));
export const quarter = (q?: string | null) => (q ? t("fmt.quarter", { q: q.slice(-1), y: q.slice(0, 4) }) : t("fmt.na"));
export const country = (code: string) => t(`country.${code}`);
/** Data di una fonte, secondo il tipo dichiarato nei dati. */
export function sourceDate(kind: string, value: string): string {
  switch (kind) {
    case "giorno": return day(value);
    case "settimana": return t("fmt.weekOf", { d: day(value) });
    case "mese": return month(value);
    case "trimestre": return quarter(value);
    case "testo": return t(`period.${value}`);
    default: return value;
  }
}
