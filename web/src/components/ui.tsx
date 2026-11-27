import { useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Download, Info, RotateCw, SlidersHorizontal } from "lucide-react";
import { bn, locale, t } from "../i18n";
import type { Scenario } from "../lib/model";
import { CREDIT_VARIANTS, DEPOSIT_IDS, RULE_IDS, downloadCsv } from "../lib/util";

export const Card = ({ title, children, actions, id }: { title?: string; children: ReactNode; actions?: ReactNode; id?: string }) => (
  <section className="card" id={id}>
    {(title || actions) && (
      <header className="card-head">
        {title && <h2>{title}</h2>}
        {actions}
      </header>
    )}
    {children}
  </section>
);

/** The main result of a section: a large number, its range and a sentence. On the right, if needed, a chart or other indicators. */
export const Hero = ({ label, value, range, text, children }: { label: string; value: string; range?: string; text?: ReactNode; children?: ReactNode }) => (
  <section className={children ? "hero" : "hero single"} aria-label={label}>
    <div>
      <div className="hero-label">{label}</div>
      <div className="hero-value">
        <span key={value} className="changed">
          {value}
        </span>
      </div>
      {range && <div className="hero-range">{range}</div>}
      {text && <p className="hero-text">{text}</p>}
    </div>
    {children && <div className="hero-side">{children}</div>}
  </section>
);

type Vars = Record<string, string | number>;
/**
 * Caveat on the limits, next to the numbers it refers to: one line always visible
 * (key id.s) and the full text, which opens with "details" (key id.d). It goes below the chart or
 * the table it refers to. The style is neutral; `active` (yellow) is reserved for a flag in progress.
 */
export const Note = ({ id, vars, active = false }: { id: string; vars?: Vars; active?: boolean }) => (
  <details className={active ? "note active" : "note"}>
    <summary>
      <span className="note-i" aria-hidden="true">
        <Info />
      </span>
      <span className="note-s">{t(`${id}.s`, vars)}</span>
      <span className="note-more">{t("note.details")}</span>
    </summary>
    <p>{t(`${id}.d`, vars)}</p>
  </details>
);

/** Secondary indicator. When the value changes it appears with a short transition. */
export const Kpi = ({ label, value, sub, range }: { label: string; value: string; sub?: string; range?: string }) => (
  <div className="kpi">
    <div className="kpi-label">{label}</div>
    <div className="kpi-value">
      <span key={value} className="changed">
        {value}
      </span>
    </div>
    {range && <div className="kpi-range">{range}</div>}
    {sub && <div className="kpi-sub">{sub}</div>}
  </div>
);

/** Loading state (placeholders in place of the content) or error state (message and a button to reload). */
export const Loading = ({ error }: { error?: string | null }) =>
  error ? (
    <div className="alert" role="alert">
      <span>
        <strong>{t("ui.error")}</strong> {t("ui.dataUnavailable")}: {error}
      </span>
      <button className="btn small" onClick={() => window.location.reload()}>
        <RotateCw className="icon" aria-hidden="true" />
        {t("ui.retry")}
      </button>
    </div>
  ) : (
    <div className="skeleton" data-loading="" role="status" aria-label={t("ui.loading")}>
      <span />
      <span />
      <span />
    </div>
  );

export interface Column<T> {
  key: string;
  label: string;
  value: (r: T) => string | number | null;
  format?: (r: T) => ReactNode;
  numeric?: boolean;
  wrap?: boolean;
}

/**
 * Sortable table with CSV download. If it does not fit the page it scrolls internally, with the first
 * column fixed. With `pageSize` it shows one page at a time; the CSV always contains every row.
 */
export function DataTable<T>({
  columns,
  rows,
  csvName,
  initialSort,
  footer,
  onRow,
  pageSize,
  compact,
  selected,
}: {
  columns: Column<T>[];
  rows: T[];
  csvName: string;
  initialSort?: { key: string; dir: 1 | -1 };
  footer?: ReactNode[];
  onRow?: (r: T) => void;
  pageSize?: number;
  compact?: boolean;
  /** row to highlight as selected */
  selected?: (r: T) => boolean;
}) {
  const [sort, setSort] = useState(initialSort ?? { key: columns[0].key, dir: 1 as 1 | -1 });
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort.key) ?? columns[0];
    return [...rows].sort((a, b) => {
      const x = col.value(a),
        y = col.value(b);
      if (typeof x === "number" && typeof y === "number") return sort.dir * (x - y);
      if (x === null || y === null) return x === y ? 0 : x === null ? 1 : -1;
      return sort.dir * String(x).localeCompare(String(y), locale());
    });
  }, [rows, columns, sort]);
  // a new number of rows or a new order goes back to the first page (state adjusted during render, not in an effect)
  const [pageKey, setPageKey] = useState({ n: rows.length, key: sort.key, dir: sort.dir });
  if (pageKey.n !== rows.length || pageKey.key !== sort.key || pageKey.dir !== sort.dir) {
    setPageKey({ n: rows.length, key: sort.key, dir: sort.dir });
    setPage(0);
  }
  const size = pageSize ?? sorted.length,
    pages = Math.max(1, Math.ceil(sorted.length / Math.max(1, size)));
  const current = Math.min(page, pages - 1),
    shown = pageSize ? sorted.slice(current * size, current * size + size) : sorted;
  const click = (key: string, numeric?: boolean) => setSort((s) => (s.key === key ? { key, dir: -s.dir as 1 | -1 } : { key, dir: numeric ? -1 : 1 }));
  const cls = (c?: Column<T>) => [c?.numeric ? "num" : "", c?.wrap ? "wrap" : ""].join(" ").trim();
  return (
    <div>
      <div className="table-wrap" tabIndex={0} role="region" aria-label={csvName.replace(/\.csv$/, "").replace(/_/g, " ")}>
        <table className={compact ? "compact" : undefined}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cls(c)} aria-sort={sort.key === c.key ? (sort.dir < 0 ? "descending" : "ascending") : undefined}>
                  <button onClick={() => click(c.key, c.numeric)}>
                    {c.label}
                    {sort.key === c.key ? (sort.dir < 0 ? " ▼" : " ▲") : ""}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr
                key={i}
                onClick={onRow ? () => onRow(r) : undefined}
                onKeyDown={
                  onRow
                    ? (e) => {
                        if (e.key === "Enter") onRow(r);
                      }
                    : undefined
                }
                tabIndex={onRow ? 0 : undefined}
                className={[onRow ? "clickable" : "", selected?.(r) ? "selected" : ""].join(" ").trim()}
                aria-selected={selected ? selected(r) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cls(c)}>
                    {c.format ? c.format(r) : c.value(r)}
                  </td>
                ))}
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="text muted">
                  {t("ui.noRows")}
                </td>
              </tr>
            )}
          </tbody>
          {footer && (
            <tfoot>
              <tr>
                {footer.map((f, i) => (
                  <td key={i} className={cls(columns[i])}>
                    {f}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="table-foot no-print">
        <button
          className="btn small"
          onClick={() =>
            downloadCsv(
              csvName,
              columns.map((c) => c.label),
              sorted.map((r) => columns.map((c) => c.value(r))),
            )
          }
        >
          <Download className="icon" aria-hidden="true" />
          {t("ui.csv")}
        </button>
        {pageSize && sorted.length > size && (
          <div className="pager">
            <span aria-live="polite">{t("ui.pager", { a: current * size + 1, b: Math.min(sorted.length, current * size + size), n: sorted.length })}</span>
            <button className="btn small icon-only" data-page="prev" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label={t("ui.prev")}>
              <ChevronLeft className="icon" aria-hidden="true" />
            </button>
            <button
              className="btn small icon-only"
              data-page="next"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
              aria-label={t("ui.next")}
            >
              <ChevronRight className="icon" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Simple table, with the same internally scrolling container as DataTable. */
export const SimpleTable = ({ head, rows, numeric = [], compact }: { head?: ReactNode[]; rows: ReactNode[][]; numeric?: number[]; compact?: boolean }) => (
  <div className="table-wrap">
    <table className={compact ? "compact" : undefined}>
      {head && (
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} className={numeric.includes(i) ? "num" : ""}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((r, j) => (
          <tr key={j}>
            {r.map((c, i) => (
              <td key={i} className={numeric.includes(i) ? "num" : "text"}>
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const Select = <T extends string>({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  id: string;
}) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  </div>
);

export const Slider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  id,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: string;
  id: string;
}) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <div className="slider-value">{display}</div>
    <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={display} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

/** Choice among a few alternatives, as side-by-side buttons. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) => (
  <div className="segmented" role="group" aria-label={label}>
    {options.map(([v, l]) => (
      <button key={v} className="btn small" aria-pressed={v === value} onClick={() => onChange(v)}>
        {l}
      </button>
    ))}
  </div>
);

type ScenarioProps = {
  scenario: Scenario;
  set: (p: Record<string, string | number | null>) => void;
  presets: { id: string; eur: number }[];
  fx: number;
  prefix?: string;
  compact?: boolean;
};
/** Scenario controls: they write to the address, so the scenario is kept across sections and can be shared. */
export function ScenarioControls({ scenario, set, presets, fx, prefix = "", compact = false }: ScenarioProps) {
  const k = (name: string) => prefix + name;
  return (
    <div>
      <div className="controls">
        <Slider
          id={k("imp")}
          label={t("sc.amount")}
          value={Math.min(scenario.importo, 600)}
          min={0}
          max={600}
          step={0.5}
          onChange={(v) => set({ [k("imp")]: v })}
          display={`${bn(scenario.importo)} · ${bn(scenario.importo * fx, 1, "usd")}`}
        />
        <Slider
          id={k("sost")}
          label={t("sc.substitution")}
          value={Math.round(scenario.sostituzione * 100)}
          min={0}
          max={100}
          step={5}
          onChange={(v) => set({ [k("sost")]: v })}
          display={`${Math.round(scenario.sostituzione * 100)}%`}
        />
        <Select
          id={k("reg")}
          label={t("sc.rule")}
          value={scenario.regola}
          options={RULE_IDS.map((r) => [r, t(`rule.${r}`)])}
          onChange={(v) => set({ [k("reg")]: v })}
        />
        <Select
          id={k("dep")}
          label={t("sc.deposits")}
          value={scenario.depositi}
          options={DEPOSIT_IDS.map((d) => [d, t(`dep.${d}`)])}
          onChange={(v) => set({ [k("dep")]: v })}
        />
        <Select
          id={k("cred")}
          label={t("sc.credit")}
          value={scenario.credito}
          options={CREDIT_VARIANTS.map((v) => [v, t(`credit.${v}`)])}
          onChange={(v) => set({ [k("cred")]: v })}
        />
      </div>
      {!compact && (
        <div className="presets" aria-label={t("sc.presets")}>
          {presets.map((p) => (
            <button
              key={p.id}
              className="btn small"
              aria-pressed={Math.abs(p.eur - scenario.importo) < 0.05}
              onClick={() => set({ [k("imp")]: Number(p.eur.toFixed(2)) })}
            >
              <span>{t(`preset.${p.id}`)}</span>
              <span className="num">{bn(p.eur)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Fixed scenario panel: it stays on the left while the results scroll (inside `.split`).
 * On narrow screens it collapses and shows the scenario in one line.
 */
export function ScenarioPanel({ title, summary, ...props }: ScenarioProps & { title?: string; summary: string }) {
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  return (
    <aside className="panel" data-open={open} aria-label={title ?? t("sc.panel")}>
      <div className="panel-head">
        <h2>{title ?? t("sc.panel")}</h2>
        <button className="btn small panel-toggle" aria-expanded={open} onClick={() => setOpen(!open)}>
          <SlidersHorizontal className="icon" aria-hidden="true" />
          {t(open ? "sc.hide" : "sc.edit")}
        </button>
      </div>
      <p className="panel-summary">{summary}</p>
      <div className="panel-body">
        <ScenarioControls {...props} />
      </div>
    </aside>
  );
}
