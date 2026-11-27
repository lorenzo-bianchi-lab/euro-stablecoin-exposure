import { useEffect, useState, useSyncExternalStore } from "react";
import { getLang, type Lang } from "../i18n";
import type { CreditVariant, DepositType, Rule, Scenario } from "./model";

export const REPO = "https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure";

// ---------- data: the application reads only the JSON files exported by the update script
const cache = new Map<string, Promise<unknown>>();
export function fetchJson<T>(name: string): Promise<T> {
  if (!cache.has(name)) {
    // no-cache: the browser always asks the server whether the file has changed, so after an update
    // old data do not stay in use alongside the new application
    cache.set(
      name,
      fetch(`./data/${name}`, { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
        return r.json();
      }),
    );
  }
  return cache.get(name) as Promise<T>;
}
export function useJson<T>(name: string | null): { data: T | null; error: string | null } {
  const [state, set] = useState<{ data: T | null; error: string | null }>({ data: null, error: null });
  // a new file name empties the state at once (state adjusted during render, not in an effect)
  const [current, setCurrent] = useState(name);
  if (current !== name) {
    setCurrent(name);
    if (name) set({ data: null, error: null });
  }
  useEffect(() => {
    if (!name) return;
    let alive = true;
    fetchJson<T>(name)
      .then((d) => alive && set({ data: d, error: null }))
      .catch((e) => alive && set({ data: null, error: String(e.message ?? e) }));
    return () => {
      alive = false;
    };
  }, [name]);
  return state;
}

// ---------- addresses: #/section/argument?parameters. Scenario and language live in the parameters, so every address can be shared.
/** Section names used before the English version: addresses already shared keep working. */
const ALIASES: Record<string, string> = {
  panoramica: "overview",
  simulatore: "simulator",
  mappa: "map",
  paese: "country",
  canali: "channels",
  livello: "level",
  confronto: "compare",
  metodo: "method",
  banche: "banks",
};
function parse(hash: string) {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};
/** Goes to a new address, replacing the current history entry or adding a new one. */
function go(url: string, replace: boolean) {
  if (replace) {
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = url;
}
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const { parts, params } = parse(hash);
  const section = ALIASES[parts[0]] ?? parts[0] ?? "home";
  const href = (path: string, extra?: Record<string, string | number | null>) => {
    const p = new URLSearchParams(params);
    if (extra)
      for (const [k, v] of Object.entries(extra)) {
        if (v === null) p.delete(k);
        else p.set(k, String(v));
      }
    const q = p.toString();
    return `#/${path}${q ? "?" + q : ""}`;
  };
  const setParams = (extra: Record<string, string | number | null>, replace = true) => go(href([section, ...parts.slice(1)].join("/"), extra), replace);
  const lang: Lang = params.get("lang") === "it" ? "it" : "en";
  return { section, arg: parts[1] ?? null, params, href, setParams, lang };
}

const RULES: Rule[] = ["R1", "R2", "R3"],
  DEPOSITS: DepositType[] = ["T1", "T2", "T3"];
export const CREDIT_VARIANTS: CreditVariant[] = ["uniforme", "continua", "soglia", "basso", "alto"];
export const RULE_IDS = RULES,
  DEPOSIT_IDS = DEPOSITS;
const num = (v: string | null, fallback: number, min: number, max: number) => {
  const x = v === null ? NaN : Number(v);
  return Number.isFinite(x) ? Math.min(max, Math.max(min, x)) : fallback;
};
const pick = <T extends string>(v: string | null, options: T[], fallback: T) => (options.includes(v as T) ? (v as T) : fallback);
/** Scenario read from the address; prefix "b_" for the second scenario of the comparison. */
export function readScenario(params: URLSearchParams, defaultAmount: number, prefix = ""): Scenario {
  const g = (k: string) => params.get(prefix + k);
  return {
    importo: num(g("imp"), defaultAmount, 0, 2000),
    sostituzione: num(g("sost"), 100, 0, 100) / 100,
    regola: pick(g("reg"), RULES, "R1"),
    depositi: pick(g("dep"), DEPOSITS, "T1"),
    credito: pick(g("cred"), CREDIT_VARIANTS, "uniforme"),
  };
}

// ---------- light and dark theme
export type Theme = "light" | "dark";
/** The theme is applied to the document at once: the charts read the colours from the CSS tokens while they redraw. */
const applyTheme = (t: Theme) => {
  document.documentElement.dataset.theme = t;
  return t;
};
export function useTheme(): [Theme, () => void] {
  const [theme, set] = useState<Theme>(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("tema");
    } catch {
      /* storage not available */
    }
    if (saved === "light" || saved === "dark") return applyTheme(saved);
    return applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  const toggle = () => {
    const next = applyTheme(theme === "dark" ? "light" : "dark");
    try {
      localStorage.setItem("tema", next);
    } catch {
      /* storage not available */
    }
    set(next);
  };
  return [theme, toggle];
}
export const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------- CSV export: semicolon and decimal comma in Italian, comma and decimal point in English,
// so the file opens directly in a spreadsheet set to the same language
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const it = getLang() === "it",
    sep = it ? ";" : ",";
  const cell = (v: string | number | null) =>
    v === null ? "" : typeof v === "number" ? (it ? String(v).replace(".", ",") : String(v)) : `"${v.replace(/"/g, '""')}"`;
  const text = [header.map(cell).join(sep), ...rows.map((r) => r.map(cell).join(sep))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
