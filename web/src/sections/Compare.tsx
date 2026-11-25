import { useEffect, useState } from "react";
import { Card, DataTable, Note, ScenarioControls, SimpleTable } from "../components/ui";
import { bn, country, day, month, nf, pct, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { downloadCsv, readScenario, useRoute } from "../lib/util";
import { describe, resultColumns, useResults } from "./shared";

export default function Compare({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim, meta } = data;
  const route = useRoute();
  const b = readScenario(route.params, Number(sim.livello.massimo.toFixed(2)), "b_");
  const A = useResults(sim, scenario), B = useResults(sim, b);
  const [mode, setMode] = useState<"a" | "ab">(route.params.get("rep") === "ab" ? "ab" : "a");
  useEffect(() => { const off = () => document.body.classList.remove("print-report"); window.addEventListener("afterprint", off); return () => window.removeEventListener("afterprint", off); }, []);
  const lines: [string, number, number, (v: number) => string][] = [
    [t("cmp.row.outflow"), A.tot.deflusso, B.tot.deflusso, (v) => nf(v, 1)],
    [t("col.sightLost"), A.tot.persiVista, B.tot.persiVista, (v) => pct(v, 2)],
    [t("col.fundingEffect"), A.tot.effettoPp, B.tot.effettoPp, (v) => nf(v, 2)],
    [t("col.wholesale"), A.tot.aumentoIngrosso, B.tot.aumentoIngrosso, (v) => pct(v, 2)],
    [t("col.credit"), A.tot.credito, B.tot.credito, (v) => nf(v, 1)],
    [t("col.creditPct"), A.tot.creditoPct, B.tot.creditoPct, (v) => nf(v, 2) + "%"],
    [t("col.creditLow"), A.tot.creditoBasso, B.tot.creditoBasso, (v) => nf(v, 1)],
    [t("col.creditHigh"), A.tot.creditoAlto, B.tot.creditoAlto, (v) => nf(v, 1)],
  ];
  const delta = (a: number, bb: number) => (a ? `${bb >= a ? "+" : ""}${nf(100 * (bb / a - 1), 0)}%` : t("fmt.na"));
  const countries = A.rows.map((r, i) => ({ code: r.code, a: r, b: B.rows[i] }));
  const sortedA = [...A.rows].sort((x, y) => y.effettoPp - x.effettoPp);
  const cols = resultColumns(sim).slice(0, 7);
  const fx = sim.cambioUsdPerEur;
  const band = (v: [number, number], f: (x: number) => string) => t("fmt.band", { a: f(v[0]), b: f(v[1]) });
  const summary = (R: typeof A): [string, string][] => [
    [t("sim.kpi.outflow"), `${bn(R.tot.deflusso)} (${band(R.band.deflusso, (x) => nf(x, 1))})`],
    [t("col.sightLost"), `${pct(R.tot.persiVista, 2)} (${band(R.band.persiVista, (x) => pct(x, 2))})`],
    [t("col.fundingEffect"), nf(R.tot.effettoPp, 2)],
    [t("col.wholesale"), pct(R.tot.aumentoIngrosso, 2)],
    [t("sim.kpi.credit"), `${bn(R.tot.credito)}, ${t("sim.kpi.credit.sub", { x: nf(R.tot.creditoPct, 2) })} (${band(R.band.credito, (x) => nf(x, 1))})`],
  ];
  return (
    <>
      <div className="grid2 no-print">
        <Card title={t("cmp.a")}><ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={fx} compact /></Card>
        <Card title={t("cmp.b")}><ScenarioControls scenario={b} set={route.setParams} presets={sim.predefiniti} fx={fx} prefix="b_" compact /></Card>
      </div>

      <Card title={t("cmp.area")} actions={<button className="btn small no-print" onClick={() => downloadCsv("comparison_euro_area.csv", [t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.diff")], lines.map(([l, a, bb]) => [l, a, bb, bb - a]))}>{t("ui.csv")}</button>}>
        <SimpleTable numeric={[1, 2, 3]} head={[t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.bVsA")]} rows={lines.map(([l, a, bb, f]) => [l, f(a), f(bb), delta(a, bb)])} />
        <p className="muted tiny">A: {describe(scenario, fx)}.<br />B: {describe(b, fx)}.</p>
        <Note id="note.flow" />
        <Note id="note.credit" />
      </Card>

      <Card title={t("cmp.byCountry")}>
        <DataTable csvName="comparison_by_country.csv" rows={countries} initialSort={{ key: "ea", dir: -1 }} columns={[
          { key: "nome", label: t("col.country"), value: (r) => country(r.code) },
          { key: "da", label: t("cmp.col.outflow", { s: "A" }), numeric: true, value: (r) => r.a.deflusso, format: (r) => nf(r.a.deflusso, 2) },
          { key: "db", label: t("cmp.col.outflow", { s: "B" }), numeric: true, value: (r) => r.b.deflusso, format: (r) => nf(r.b.deflusso, 2) },
          { key: "ea", label: t("cmp.col.effect", { s: "A" }), numeric: true, value: (r) => r.a.effettoPp, format: (r) => nf(r.a.effettoPp, 2) },
          { key: "eb", label: t("cmp.col.effect", { s: "B" }), numeric: true, value: (r) => r.b.effettoPp, format: (r) => nf(r.b.effettoPp, 2) },
          { key: "ca", label: t("cmp.col.credit", { s: "A" }), numeric: true, value: (r) => r.a.creditoPct, format: (r) => nf(r.a.creditoPct, 2) + "%" },
          { key: "cb", label: t("cmp.col.credit", { s: "B" }), numeric: true, value: (r) => r.b.creditoPct, format: (r) => nf(r.b.creditoPct, 2) + "%" },
          { key: "ia", label: t("cmp.col.wholesale", { s: "A" }), numeric: true, value: (r) => r.a.aumentoIngrosso, format: (r) => pct(r.a.aumentoIngrosso, 1) },
          { key: "ib", label: t("cmp.col.wholesale", { s: "B" }), numeric: true, value: (r) => r.b.aumentoIngrosso, format: (r) => pct(r.b.aumentoIngrosso, 1) },
        ]} />
      </Card>

      <section className="card report" data-mode={mode}>
        <header className="card-head"><h2>{t(mode === "a" ? "rep.title.a" : "rep.title.ab")}</h2>
          <span className="no-print row">
            <button className={`btn small ${mode === "a" ? "active" : ""}`} aria-pressed={mode === "a"} onClick={() => { setMode("a"); route.setParams({ rep: null }); }}>{t("rep.mode.a")}</button>
            <button className={`btn small ${mode === "ab" ? "active" : ""}`} aria-pressed={mode === "ab"} onClick={() => { setMode("ab"); route.setParams({ rep: "ab" }); }}>{t("rep.mode.ab")}</button>
            <button className="btn small" id="print-report" onClick={() => { document.body.classList.add("print-report"); window.print(); }}>{t("rep.print")}</button>
          </span></header>
        <p><strong>{t("app.title")}.</strong> {t("rep.generated", { d: day(new Date().toISOString()), m: month(sim.meseBilanci), u: day(meta.aggiornamento.eseguitoIl ?? meta.generato_il) })}</p>
        {mode === "a" ? (
          <>
            <p><strong>{t("rep.scenario")}:</strong> {describe(scenario, fx)}.</p>
            <SimpleTable numeric={[1]} rows={summary(A)} />
            <h3>{t("rep.byCountry")}</h3>
            <div className="table-wrap"><table>
              <thead><tr>{cols.map((c) => <th key={c.key} className={c.numeric ? "num" : ""}>{c.label}</th>)}</tr></thead>
              <tbody>{sortedA.map((r) => <tr key={r.code}>{cols.map((c) => <td key={c.key} className={c.numeric ? "num" : ""}>{c.format ? c.format(r) : c.value(r)}</td>)}</tr>)}</tbody>
            </table></div>
          </>
        ) : (
          <>
            <p><strong>{t("cmp.colA")}:</strong> {describe(scenario, fx)}.<br /><strong>{t("cmp.colB")}:</strong> {describe(b, fx)}.</p>
            <SimpleTable numeric={[1, 2]} head={[t("col.quantity"), t("cmp.colA"), t("cmp.colB")]} rows={summary(A).map(([l, v], i) => [l, v, summary(B)[i][1]])} />
            <SimpleTable numeric={[1, 2, 3]} head={[t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.bVsA")]} rows={lines.map(([l, a, bb, f]) => [l, f(a), f(bb), delta(a, bb)])} />
            <h3>{t("rep.byCountry")}</h3>
            <div className="table-wrap"><table>
              <thead><tr><th>{t("col.country")}</th>{["outflow", "effect", "credit"].flatMap((k) => ["A", "B"].map((s) => <th key={k + s} className="num">{t(`cmp.col.${k}`, { s })}</th>))}</tr></thead>
              <tbody>{[...countries].sort((x, y) => y.a.effettoPp - x.a.effettoPp).map((r) => (
                <tr key={r.code}><td>{country(r.code)}</td><td className="num">{nf(r.a.deflusso, 2)}</td><td className="num">{nf(r.b.deflusso, 2)}</td><td className="num">{nf(r.a.effettoPp, 2)}</td><td className="num">{nf(r.b.effettoPp, 2)}</td>
                  <td className="num">{nf(r.a.creditoPct, 2)}%</td><td className="num">{nf(r.b.creditoPct, 2)}%</td></tr>))}</tbody>
            </table></div>
          </>
        )}
        <h3>{t("rep.howToRead")}</h3>
        <ul className="plain">
          <li>{t("note.band.d", { a: nf(sim.livello.minimo, 1), b: nf(sim.livello.massimo, 1), c: nf(sim.livello.centrale, 1) })}</li>
          <li>{t("note.flow.d")}</li>
          <li>{t("note.credit.d")}</li>
          <li>{t("rep.sources", { fx: nf(fx, 4), d: day(sim.dataCambio) })}</li>
        </ul>
      </section>
    </>
  );
}
