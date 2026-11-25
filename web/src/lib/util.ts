import { useEffect, useState, useSyncExternalStore } from "react";
import { getLang, type Lang } from "../i18n";
import type { CreditVariant, DepositType, Rule, Scenario } from "./model";

// ---------- dati: l'applicazione legge solo i file JSON esportati dallo script di aggiornamento
const cache = new Map<string, Promise<unknown>>();
export function fetchJson<T>(name: string): Promise<T> {
  if (!cache.has(name)) {
    cache.set(name, fetch(`./data/${name}`).then((r) => {
      if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(name) as Promise<T>;
}
export function useJson<T>(name: string | null): { data: T | null; error: string | null } {
  const [state, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  useEffect(() => {
    if (!name) return;
    let alive = true;
    set({ data: null, error: null });
    fetchJson<T>(name).then((d) => alive && set({ data: d, error: null })).catch((e) => alive && set({ data: null, error: String(e.message ?? e) }));
    return () => { alive = false; };
  }, [name]);
  return state;
}

// ---------- indirizzi: #/sezione/argomento?parametri. Scenario e lingua vivono nei parametri, quindi ogni indirizzo è condivisibile.
/** Nomi delle sezioni usati prima della versione in inglese: gli indirizzi già condivisi continuano a funzionare. */
const ALIASES: Record<string, string> = { panoramica: "overview", simulatore: "simulator", mappa: "map", paese: "country", canali: "channels", livello: "level", confronto: "compare", metodo: "method", banche: "banks" };
function parse(hash: string) {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}
const subscribe = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const { parts, params } = parse(hash);
  const section = ALIASES[parts[0]] ?? parts[0] ?? "overview";
  const href = (path: string, extra?: Record<string, string | number | null>) => {
    const p = new URLSearchParams(params);
    if (extra) for (const [k, v] of Object.entries(extra)) v === null ? p.delete(k) : p.set(k, String(v));
    const q = p.toString();
    return `#/${path}${q ? "?" + q : ""}`;
  };
  const setParams = (extra: Record<string, string | number | null>, replace = true) => {
    const url = href([section, ...parts.slice(1)].join("/"), extra);
    if (replace) { window.history.replaceState(null, "", url); window.dispatchEvent(new HashChangeEvent("hashchange")); }
    else window.location.hash = url;
  };
  const lang: Lang = params.get("lang") === "it" ? "it" : "en";
  return { section, arg: parts[1] ?? null, params, href, setParams, lang };
}

const RULES: Rule[] = ["R1", "R2", "R3"], DEPOSITS: DepositType[] = ["T1", "T2", "T3"];
export const CREDIT_VARIANTS: CreditVariant[] = ["uniforme", "continua", "soglia", "basso", "alto"];
export const RULE_IDS = RULES, DEPOSIT_IDS = DEPOSITS;
const num = (v: string | null, fallback: number, min: number, max: number) => {
  const x = v === null ? NaN : Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
};
const pick = <T extends string>(v: string | null, options: T[], fallback: T) => (options.includes(v as T) ? (v as T) : fallback);
/** Scenario letto dall'indirizzo; prefix "b_" per il secondo scenario del confronto. */
export function readScenario(params: URLSearchParams, defaultAmount: number, prefix = ""): Scenario {
  const g = (k: string) => params.get(prefix + k);
  return {
    importo: num(g("imp"), defaultAmount, 0, 2000), sostituzione: num(g("sost"), 100, 0, 100) / 100,
    regola: pick(g("reg"), RULES, "R1"), depositi: pick(g("dep"), DEPOSITS, "T1"), credito: pick(g("cred"), CREDIT_VARIANTS, "uniforme"),
  };
}

// ---------- tema chiaro e scuro
export type Theme = "light" | "dark";
export function useTheme(): [Theme, () => void] {
  const [theme, set] = useState<Theme>(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem("tema"); } catch { /* archivio non disponibile */ }
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  const toggle = () => set((t) => {
    const next = t === "dark" ? "light" : "dark";
    try { localStorage.setItem("tema", next); } catch { /* archivio non disponibile */ }
    return next;
  });
  return [theme, toggle];
}

// ---------- esportazione CSV: in italiano punto e virgola e virgola decimale, in inglese virgola e punto,
// così il file si apre direttamente in un foglio di calcolo della stessa lingua
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const it = getLang() === "it", sep = it ? ";" : ",";
  const cell = (v: string | number | null) => (v === null ? "" : typeof v === "number" ? (it ? String(v).replace(".", ",") : String(v)) : `"${v.replace(/"/g, '""')}"`);
  const text = [header.map(cell).join(sep), ...rows.map((r) => r.map(cell).join(sep))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
