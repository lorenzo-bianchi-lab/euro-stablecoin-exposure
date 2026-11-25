import { useMemo, useState, type ReactNode } from "react";
import { bn, locale, t } from "../i18n";
import type { Scenario } from "../lib/model";
import { CREDIT_VARIANTS, DEPOSIT_IDS, RULE_IDS, downloadCsv } from "../lib/util";

export const Card = ({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) => (
  <section className="card">
    {(title || actions) && <header className="card-head">{title && <h2>{title}</h2>}{actions}</header>}
    {children}
  </section>
);

type Vars = Record<string, string | number>;
/**
 * Avvertenza sui limiti, accanto ai numeri a cui si riferisce: una riga sempre visibile
 * (chiave id.s) e il testo completo che si apre con "dettagli" (chiave id.d).
 */
export const Note = ({ id, vars }: { id: string; vars?: Vars }) => (
  <details className="note">
    <summary><span className="note-i" aria-hidden="true">!</span><span className="note-s">{t(`${id}.s`, vars)}</span><span className="note-more">{t("note.details")}</span></summary>
    <p>{t(`${id}.d`, vars)}</p>
  </details>
);

export const Kpi = ({ label, value, sub, range }: { label: string; value: string; sub?: string; range?: string }) => (
  <div className="kpi">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    {range && <div className="kpi-range">{range}</div>}
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

export const Loading = ({ error }: { error?: string | null }) =>
  error ? <p className="alert">{t("ui.dataUnavailable")}: {error}</p> : <p className="muted" data-loading="">{t("ui.loading")}</p>;

export interface Column<T> { key: string; label: string; value: (r: T) => string | number | null; format?: (r: T) => ReactNode; numeric?: boolean; wrap?: boolean }

/** Tabella ordinabile con download CSV. Se non entra nella pagina scorre al proprio interno, con la prima colonna fissa. */
export function DataTable<T>({ columns, rows, csvName, initialSort, footer, onRow }: {
  columns: Column<T>[]; rows: T[]; csvName: string; initialSort?: { key: string; dir: 1 | -1 }; footer?: ReactNode[]; onRow?: (r: T) => void;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 1 as 1 | -1 });
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    return [...rows].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (typeof x === "number" && typeof y === "number") return sort.dir * (x - y);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return sort.dir * String(x).localeCompare(String(y), locale());
    });
  }, [rows, columns, sort]);
  const click = (key: string, numeric?: boolean) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: numeric ? -1 : 1 }));
  const cls = (c?: Column<T>) => [c?.numeric ? "num" : "", c?.wrap ? "wrap" : ""].join(" ").trim();
  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((c) => (
            <th key={c.key} className={cls(c)} aria-sort={sort.key === c.key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
              <button onClick={() => click(c.key, c.numeric)}>{c.label}{sort.key === c.key ? (sort.dir < 0 ? " ▼" : " ▲") : ""}</button>
            </th>))}</tr></thead>
          <tbody>{sorted.map((r, i) => (
            <tr key={i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "clickable" : ""}>
              {columns.map((c) => <td key={c.key} className={cls(c)}>{c.format ? c.format(r) : c.value(r)}</td>)}
            </tr>))}</tbody>
          {footer && <tfoot><tr>{footer.map((f, i) => <td key={i} className={cls(columns[i])}>{f}</td>)}</tr></tfoot>}
        </table>
      </div>
      <button className="btn small no-print" onClick={() => downloadCsv(csvName, columns.map((c) => c.label), sorted.map((r) => columns.map((c) => c.value(r))))}>{t("ui.csv")}</button>
    </div>
  );
}

/** Tabella semplice, con lo stesso contenitore a scorrimento interno di DataTable. */
export const SimpleTable = ({ head, rows, numeric = [] }: { head?: ReactNode[]; rows: ReactNode[][]; numeric?: number[] }) => (
  <div className="table-wrap"><table>
    {head && <thead><tr>{head.map((h, i) => <th key={i} className={numeric.includes(i) ? "num" : ""}>{h}</th>)}</tr></thead>}
    <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, i) => <td key={i} className={numeric.includes(i) ? "num" : "text"}>{c}</td>)}</tr>)}</tbody>
  </table></div>
);

export const Select = <T extends string>({ label, value, options, onChange, id }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; id: string }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
  </div>
);

export const Slider = ({ label, value, min, max, step, onChange, display, id }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; display: string; id: string }) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="slider-value">{display}</div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

/** Comandi dello scenario: scrivono nell'indirizzo, quindi lo scenario si conserva tra le sezioni e si può condividere. */
export function ScenarioControls({ scenario, set, presets, fx, prefix = "", compact = false }: {
  scenario: Scenario; set: (p: Record<string, string | number | null>) => void; presets: { id: string; eur: number }[]; fx: number; prefix?: string; compact?: boolean;
}) {
  const k = (name: string) => prefix + name;
  return (
    <div>
      <div className="controls">
        <Slider id={k("imp")} label={t("sc.amount")} value={Math.min(scenario.importo, 600)} min={0} max={600} step={0.5}
          onChange={(v) => set({ [k("imp")]: v })} display={`${bn(scenario.importo)} · ${bn(scenario.importo * fx, 1, "usd")}`} />
        <Slider id={k("sost")} label={t("sc.substitution")} value={Math.round(scenario.sostituzione * 100)} min={0} max={100} step={5}
          onChange={(v) => set({ [k("sost")]: v })} display={`${Math.round(scenario.sostituzione * 100)}%`} />
        <Select id={k("reg")} label={t("sc.rule")} value={scenario.regola} options={RULE_IDS.map((r) => [r, t(`rule.${r}`)])} onChange={(v) => set({ [k("reg")]: v })} />
        <Select id={k("dep")} label={t("sc.deposits")} value={scenario.depositi} options={DEPOSIT_IDS.map((d) => [d, t(`dep.${d}`)])} onChange={(v) => set({ [k("dep")]: v })} />
        <Select id={k("cred")} label={t("sc.credit")} value={scenario.credito} options={CREDIT_VARIANTS.map((v) => [v, t(`credit.${v}`)])} onChange={(v) => set({ [k("cred")]: v })} />
      </div>
      {!compact && (
        <div className="presets" aria-label={t("sc.presets")}>
          {presets.map((p) => <button key={p.id} className={`btn small ${Math.abs(p.eur - scenario.importo) < 0.05 ? "active" : ""}`} onClick={() => set({ [k("imp")]: Number(p.eur.toFixed(2)) })}>{t(`preset.${p.id}`)}: {bn(p.eur)}</button>)}
        </div>
      )}
    </div>
  );
}
