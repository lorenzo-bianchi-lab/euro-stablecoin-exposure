import { useMemo, useState, type ReactNode } from "react";
import type { Scenario } from "../lib/model";
import { CREDIT_LABELS, CREDIT_VARIANTS, DEPOSIT_LABELS, RULE_LABELS, downloadCsv, nf } from "../lib/util";

export const Card = ({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) => (
  <section className="card">
    {(title || actions) && <header className="card-head">{title && <h2>{title}</h2>}{actions}</header>}
    {children}
  </section>
);

/** Avvertenza sui limiti, da mettere accanto ai numeri a cui si riferisce. */
export const Note = ({ children }: { children: ReactNode }) => <p className="note"><span aria-hidden="true">!</span><span>{children}</span></p>;

export const Kpi = ({ label, value, sub, range }: { label: string; value: string; sub?: string; range?: string }) => (
  <div className="kpi">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">{value}</div>
    {range && <div className="kpi-range">{range}</div>}
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

export const Loading = ({ error }: { error?: string | null }) =>
  error ? <p className="note"><span aria-hidden="true">!</span><span>Dati non disponibili: {error}</span></p> : <p className="muted">Caricamento dei dati…</p>;

export interface Column<T> { key: string; label: string; value: (r: T) => string | number | null; format?: (r: T) => ReactNode; numeric?: boolean }

/** Tabella ordinabile con download CSV. */
export function DataTable<T>({ columns, rows, csvName, initialSort, footer, onRow }: {
  columns: Column<T>[]; rows: T[]; csvName: string; initialSort?: { key: string; dir: 1 | -1 }; footer?: ReactNode[]; onRow?: (r: T) => void;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 1 as 1 | -1 });
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    return [...rows].sort((a, b) => {
      const x = col.value(a), y = col.value(b);
      if (typeof x === "number" && typeof y === "number") return sort.dir * (x - y);
      return sort.dir * String(x ?? "").localeCompare(String(y ?? ""), "it");
    });
  }, [rows, columns, sort]);
  const click = (key: string, numeric?: boolean) => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: numeric ? -1 : 1 }));
  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((c) => (
            <th key={c.key} className={c.numeric ? "num" : ""} aria-sort={sort.key === c.key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
              <button onClick={() => click(c.key, c.numeric)}>{c.label}{sort.key === c.key ? (sort.dir < 0 ? " ▼" : " ▲") : ""}</button>
            </th>))}</tr></thead>
          <tbody>{sorted.map((r, i) => (
            <tr key={i} onClick={onRow ? () => onRow(r) : undefined} className={onRow ? "clickable" : ""}>
              {columns.map((c) => <td key={c.key} className={c.numeric ? "num" : ""}>{c.format ? c.format(r) : c.value(r)}</td>)}
            </tr>))}</tbody>
          {footer && <tfoot><tr>{footer.map((f, i) => <td key={i} className={columns[i]?.numeric ? "num" : ""}>{f}</td>)}</tr></tfoot>}
        </table>
      </div>
      <button className="btn small" onClick={() => downloadCsv(csvName, columns.map((c) => c.label), sorted.map((r) => columns.map((c) => c.value(r))))}>Scarica CSV</button>
    </div>
  );
}

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
  scenario: Scenario; set: (p: Record<string, string | number | null>) => void; presets: { id: string; nome: string; eur: number }[]; fx: number; prefix?: string; compact?: boolean;
}) {
  const k = (name: string) => prefix + name;
  return (
    <div>
      <div className="controls">
        <Slider id={k("imp")} label="Stablecoin in dollari detenute nell'area euro" value={Math.min(scenario.importo, 600)} min={0} max={600} step={0.5}
          onChange={(v) => set({ [k("imp")]: v })} display={`${nf(scenario.importo, 1)} mld € · ${nf(scenario.importo * fx, 1)} mld $`} />
        <Slider id={k("sost")} label="Quota finanziata con depositi bancari" value={Math.round(scenario.sostituzione * 100)} min={0} max={100} step={5}
          onChange={(v) => set({ [k("sost")]: v })} display={`${Math.round(scenario.sostituzione * 100)}%`} />
        <Select id={k("reg")} label="Ripartizione tra paesi" value={scenario.regola} options={Object.entries(RULE_LABELS) as never} onChange={(v) => set({ [k("reg")]: v })} />
        <Select id={k("dep")} label="Depositi da cui esce il denaro" value={scenario.depositi} options={Object.entries(DEPOSIT_LABELS) as never} onChange={(v) => set({ [k("dep")]: v })} />
        <Select id={k("cred")} label="Dal deflusso al credito" value={scenario.credito} options={CREDIT_VARIANTS.map((v) => [v, CREDIT_LABELS[v]])} onChange={(v) => set({ [k("cred")]: v })} />
      </div>
      {!compact && (
        <div className="presets" aria-label="Livelli predefiniti">
          {presets.map((p) => <button key={p.id} className={`btn small ${Math.abs(p.eur - scenario.importo) < 0.05 ? "active" : ""}`} onClick={() => set({ [k("imp")]: Number(p.eur.toFixed(2)) })}>{p.nome}: {nf(p.eur, 1)}</button>)}
        </div>
      )}
    </div>
  );
}
