import { useEffect, useState, type ReactNode } from "react";
import { Download, Printer } from "lucide-react";
import { Card, DataTable, Hero, Kpi, Note, ScenarioControls, Segmented, SimpleTable } from "../components/ui";
import { bn, country, day, month, nf, pct, signed, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { downloadCsv, readScenario, useRoute } from "../lib/util";
import { describe, resultColumns, useResults } from "./shared";

type Results = ReturnType<typeof useResults>;

export default function Compare({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim, meta } = data;
  const route = useRoute();
  const b = readScenario(route.params, Number(sim.livello.massimo.toFixed(2)), "b_");
  const A = useResults(sim, scenario), B = useResults(sim, b);
  const [mode, setMode] = useState<"a" | "ab">(route.params.get("rep") === "ab" ? "ab" : "a");
  useEffect(() => { const off = () => document.body.classList.remove("print-report"); window.addEventListener("afterprint", off); return () => window.removeEventListener("afterprint", off); }, []);
  const fx = sim.cambioUsdPerEur;

  // tabella A e B per l'area euro
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

  // risultato principale: differenza tra B e A
  const dDep = B.tot.deflusso - A.tot.deflusso, dCred = B.tot.credito - A.tot.credito;
  const sbn = (x: number) => (x > 0 ? "+" : x < 0 ? "−" : "") + bn(Math.abs(x));
  const dir = Math.abs(dDep) < 0.05 && Math.abs(dCred) < 0.05 ? "same" : dDep >= 0 ? "up" : "down";

  // rapporto: sintesi per l'area euro, con le fasce sotto il valore
  const band = (v: [number, number], f: (x: number) => string) => t("fmt.band", { a: f(v[0]), b: f(v[1]) });
  const cell = (v: string, r?: string): ReactNode => (r ? <>{v}<br /><span className="muted">{r}</span></> : v);
  const summary = (R: Results): [string, number, ReactNode][] => [
    [t("cmp.row.outflow"), R.tot.deflusso, cell(bn(R.tot.deflusso), band(R.band.deflusso, (x) => nf(x, 1)))],
    [t("col.sightLost"), R.tot.persiVista, cell(pct(R.tot.persiVista, 2), band(R.band.persiVista, (x) => pct(x, 2)))],
    [t("col.fundingEffect"), R.tot.effettoPp, cell(nf(R.tot.effettoPp, 2))],
    [t("col.wholesale"), R.tot.aumentoIngrosso, cell(pct(R.tot.aumentoIngrosso, 2))],
    [t("rep.row.credit"), R.tot.credito, cell(bn(R.tot.credito), band(R.band.credito, (x) => nf(x, 1)))],
    [t("col.creditPct"), R.tot.creditoPct, cell(nf(R.tot.creditoPct, 2) + "%")],
  ];
  const sumA = summary(A), sumB = summary(B);
  const params = (s: Scenario): string[] => [
    `${bn(s.importo)} (${bn(s.importo * fx, 1, "usd")})`, `${Math.round(s.sostituzione * 100)}%`, t(`rule.${s.regola}`), t(`dep.${s.depositi}`), t(`credit.${s.credito}`),
  ];
  const paramLabels = [t("sc.amount"), t("sc.substitution"), t("sc.rule"), t("sc.deposits"), t("sc.credit")];
  const cols = resultColumns(sim).slice(0, 7);
  const sortedA = [...A.rows].sort((x, y) => y.effettoPp - x.effettoPp);
  const sortedAB = [...countries].sort((x, y) => y.a.effettoPp - x.a.effettoPp);
  const single = mode === "a";
  const item = { marginBottom: "var(--space-1)" };
  const tight = { marginTop: "var(--space-4)" };
  const pick = (m: "a" | "ab") => { setMode(m); route.setParams({ rep: m === "ab" ? "ab" : null }); };

  const head = (
    <header className="report-head">
      <span className="title">{t("app.title")}</span>
      <span className="meta">{t("rep.meta.data", { u: day(meta.aggiornamento.eseguitoIl ?? meta.generato_il) })}<br />{t("rep.meta.balance", { m: month(sim.meseBilanci) })}<br />{t("rep.meta.generated", { d: day(new Date().toISOString()) })}</span>
    </header>
  );
  const foot = (n: number) => <footer className="report-foot" style={{ marginTop: "var(--space-3)" }}><span>{t("app.disclaimer")}</span><span>{t("rep.page", { n, of: 2 })}</span></footer>;

  return (
    <>
      <div className="grid2 no-print">
        <section className="panel" aria-label={t("cmp.a")}><div className="panel-head"><h2>{t("cmp.a")}</h2></div>
          <ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={fx} compact /></section>
        <section className="panel" aria-label={t("cmp.b")}><div className="panel-head"><h2>{t("cmp.b")}</h2></div>
          <ScenarioControls scenario={b} set={route.setParams} presets={sim.predefiniti} fx={fx} prefix="b_" compact /></section>
      </div>

      <Hero label={t("cmp.hero.label")} value={sbn(dDep)} range={t("cmp.hero.range", { a: bn(A.tot.deflusso), b: bn(B.tot.deflusso) })}
        text={t(`cmp.hero.text.${dir}`, { b: bn(B.tot.deflusso), d: bn(Math.abs(dDep)), r: delta(A.tot.deflusso, B.tot.deflusso), ca: bn(A.tot.credito), cb: bn(B.tot.credito), dc: bn(Math.abs(dCred)) })}>
        <div className="kpis" style={{ marginBottom: 0 }}>
          <Kpi label={t("cmp.kpi.credit")} value={sbn(dCred)} sub={t("cmp.kpi.credit.sub", { a: nf(A.tot.creditoPct, 2) + "%", b: nf(B.tot.creditoPct, 2) + "%" })} />
          <Kpi label={t("cmp.kpi.sight")} value={t("fmt.points", { n: signed(100 * (B.tot.persiVista - A.tot.persiVista), 2) })} sub={t("cmp.kpi.ab", { a: pct(A.tot.persiVista, 2), b: pct(B.tot.persiVista, 2) })} />
          <Kpi label={t("cmp.kpi.effect")} value={t("fmt.points", { n: signed(B.tot.effettoPp - A.tot.effettoPp, 2) })} sub={t("cmp.kpi.ab", { a: nf(A.tot.effettoPp, 2), b: nf(B.tot.effettoPp, 2) })} />
        </div>
      </Hero>

      <Card title={t("cmp.area")} actions={<button className="btn small no-print" onClick={() => downloadCsv("comparison_euro_area.csv", [t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.diff")], lines.map(([l, a, bb]) => [l, a, bb, bb - a]))}><Download className="icon" aria-hidden="true" />{t("ui.csv")}</button>}>
        <SimpleTable numeric={[1, 2, 3]} head={[t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.bVsA")]} rows={lines.map(([l, a, bb, f]) => [l, f(a), f(bb), delta(a, bb)])} />
        <p className="muted tiny">A: {describe(scenario, fx)}.<br />B: {describe(b, fx)}.</p>
        <Note id="note.flow" />
        <Note id="note.credit" />
      </Card>

      <Card title={t("cmp.byCountry")}>
        <DataTable csvName="comparison_by_country.csv" rows={countries} compact initialSort={{ key: "ea", dir: -1 }} columns={[
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

      <section className="card report" data-mode={mode} aria-label={t(mode === "a" ? "rep.title.a" : "rep.title.ab")}>
        <div className="no-print row" style={{ justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
          <Segmented label={t("rep.modeLabel")} value={mode} onChange={pick} options={[["a", t("rep.mode.a")], ["ab", t("rep.mode.ab")]]} />
          <button className="btn small primary" id="print-report" onClick={() => { document.body.classList.add("print-report"); window.print(); }}><Printer className="icon" aria-hidden="true" />{t("rep.print")}</button>
        </div>

        <div className="report-page">
          {head}
          <h2 style={{ marginBottom: "var(--space-2)" }}>{t(mode === "a" ? "rep.title.a" : "rep.title.ab")}</h2>
          <p className="muted tiny">{t("rep.subtitle")}</p>

          <h3 style={tight}>{t(single ? "rep.scenario" : "rep.scenarios")}</h3>
          {mode === "a" ? (
            <dl className="facts" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 3fr)" }}>{paramLabels.map((l, i) => [<dt key={`t${i}`}>{l}</dt>, <dd key={`d${i}`}>{params(scenario)[i]}</dd>])}</dl>
          ) : (
            <SimpleTable compact head={[t("rep.param"), t("cmp.colA"), t("cmp.colB")]} rows={paramLabels.map((l, i) => [l, params(scenario)[i], params(b)[i]])} />
          )}

          <h3 style={tight}>{t("rep.area")}</h3>
          {mode === "a" ? (
            <SimpleTable compact numeric={[1]} head={[t("col.quantity"), t("col.value")]} rows={sumA.map(([l, , v]) => [l, v])} />
          ) : (
            <SimpleTable compact numeric={[1, 2, 3]} head={[t("col.quantity"), t("cmp.colA"), t("cmp.colB"), t("cmp.bVsA")]}
              rows={sumA.map(([l, a, v], i) => [l, v, sumB[i][2], delta(a, sumB[i][1])])} />
          )}

          <h3 style={tight}>{t("rep.howToRead")}</h3>
          <ul className="plain tiny">
            <li style={item}>{t("note.band.d", { a: nf(sim.livello.minimo, 1), b: nf(sim.livello.massimo, 1), c: nf(sim.livello.centrale, 1) })}</li>
            <li style={item}>{t("note.flow.d")}</li>
            <li style={item}>{t("note.credit.d")}</li>
          </ul>
          <p className="muted tiny">{t("rep.sources", { fx: nf(fx, 4), d: day(sim.dataCambio) })}</p>
          {foot(1)}
        </div>

        <div className="report-page">
          {head}
          <h3 style={{ marginTop: 0 }}>{t("rep.byCountry")}</h3>
          <p className="muted tiny">{t(single ? "rep.order.a" : "rep.order.ab", { n: A.rows.length })}</p>
          {mode === "a" ? (
            <div className="table-wrap"><table className="compact">
              <thead><tr>{cols.map((c) => <th key={c.key} className={c.numeric ? "num" : ""}>{c.label}</th>)}</tr></thead>
              <tbody>{sortedA.map((r) => <tr key={r.code}>{cols.map((c) => <td key={c.key} className={c.numeric ? "num" : ""}>{c.format ? c.format(r) : c.value(r)}</td>)}</tr>)}</tbody>
            </table></div>
          ) : (
            <div className="table-wrap"><table className="compact">
              <thead><tr><th>{t("col.country")}</th>{["outflow", "effect", "credit"].flatMap((k) => ["A", "B"].map((s) => <th key={k + s} className="num">{t(`cmp.col.${k}`, { s })}</th>))}</tr></thead>
              <tbody>{sortedAB.map((r) => (
                <tr key={r.code}><td>{country(r.code)}</td><td className="num">{nf(r.a.deflusso, 2)}</td><td className="num">{nf(r.b.deflusso, 2)}</td><td className="num">{nf(r.a.effettoPp, 2)}</td><td className="num">{nf(r.b.effettoPp, 2)}</td>
                  <td className="num">{nf(r.a.creditoPct, 2)}%</td><td className="num">{nf(r.b.creditoPct, 2)}%</td></tr>))}</tbody>
            </table></div>
          )}
          {mode === "a" && <p className="muted tiny">{t("rep.flag", { r: "R", x: t("col.aboveThreshold") })}</p>}
          {foot(2)}
        </div>
      </section>
    </>
  );
}
