import { useEffect, useState, useSyncExternalStore } from "react";
import type { CreditVariant, DepositType, Rule, Scenario } from "./model";

// ---------- numeri e date in formato italiano
export const nf = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || Number.isNaN(x) ? "n.d." : x.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const pct = (x: number | null | undefined, d = 1) => (x === null || x === undefined || Number.isNaN(x) ? "n.d." : nf(100 * x, d) + "%");
export const signed = (x: number | null | undefined, d = 1) => (x === null || x === undefined ? "n.d." : (x > 0 ? "+" : "") + nf(x, d));
const MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
export const giorno = (iso?: string | null) => {
  if (!iso) return "n.d.";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MESI[Number(m) - 1]} ${y}`;
};
export const mese = (ym?: string | null) => (ym ? `${MESI[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}` : "n.d.");

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

// ---------- indirizzi: #/sezione/argomento?parametri. Lo scenario vive nei parametri, quindi ogni indirizzo è condivisibile.
function parse(hash: string) {
  const [path, query = ""] = hash.replace(/^#\/?/, "").split("?");
  return { parts: path.split("/").filter(Boolean), params: new URLSearchParams(query) };
}
const subscribe = (cb: () => void) => { window.addEventListener("hashchange", cb); return () => window.removeEventListener("hashchange", cb); };
export function useRoute() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  const { parts, params } = parse(hash);
  const href = (path: string, extra?: Record<string, string | number | null>) => {
    const p = new URLSearchParams(params);
    if (extra) for (const [k, v] of Object.entries(extra)) v === null ? p.delete(k) : p.set(k, String(v));
    const q = p.toString();
    return `#/${path}${q ? "?" + q : ""}`;
  };
  const setParams = (extra: Record<string, string | number | null>, replace = true) => {
    const url = href(parts.join("/") || "panoramica", extra);
    if (replace) { window.history.replaceState(null, "", url); window.dispatchEvent(new HashChangeEvent("hashchange")); }
    else window.location.hash = url;
  };
  return { section: parts[0] || "panoramica", arg: parts[1] ?? null, params, href, setParams };
}

const RULES: Rule[] = ["R1", "R2", "R3"], DEPOSITS: DepositType[] = ["T1", "T2", "T3"];
export const CREDIT_VARIANTS: CreditVariant[] = ["uniforme", "continua", "soglia", "basso", "alto"];
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

// ---------- esportazione CSV (separatore punto e virgola, decimali con la virgola: si apre direttamente in un foglio di calcolo italiano)
export function downloadCsv(filename: string, header: string[], rows: (string | number | null)[][]) {
  const cell = (v: string | number | null) => (v === null ? "" : typeof v === "number" ? String(v).replace(".", ",") : `"${v.replace(/"/g, '""')}"`);
  const text = [header.map(cell).join(";"), ...rows.map((r) => r.map(cell).join(";"))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const RULE_LABELS: Record<Rule, string> = {
  R1: "R1 - in proporzione ai depositi", R2: "R2 - pro capite", R3: "R3 - per possessori di cripto-attività",
};
export const DEPOSIT_LABELS: Record<DepositType, string> = {
  T1: "T1 - a vista di famiglie e imprese", T2: "T2 - a vista delle sole famiglie", T3: "T3 - tutti i depositi di famiglie e imprese",
};
export const CREDIT_LABELS: Record<CreditVariant, string> = {
  uniforme: "Uniforme: 0,5 € di prestiti per € di depositi", continua: "Continua: coefficiente interpolato sulla quota retail",
  soglia: "A soglia: alto sopra il 75° percentile", basso: "Coefficiente basso per tutti", alto: "Coefficiente alto per tutti",
};
