import { Chart, axisStyle, barLabel, grid, legendStyle, pctLabel, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Hero, Kpi, Note, ScenarioPanel } from "../components/ui";
import { bn, country, month, nf, pct, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { describe, resultColumns, useResults } from "./shared";

export default function Simulator({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { rows, tot, band } = useResults(sim, scenario);
  const byEffect = [...rows].sort((a, b) => b.effettoPp - a.effettoPp);
  const byCredit = [...rows].sort((a, b) => b.creditoPct - a.creditoPct);
  const loans = Object.fromEntries(sim.paesi.map((c) => [c.code, c.prestiti]));
  const src = t("src.calc", { m: month(sim.meseBilanci) });
  const open = (name?: string) => { const r = rows.find((x) => country(x.code) === name); if (r) window.location.hash = route.href(`country/${r.code}`); };
  const range = (a: number, b: number) => t("fmt.band", { a: bn(a), b: bn(b) });
  const first = byEffect[0], last = byEffect[byEffect.length - 1];
  const cFirst = byCredit[0], cLast = byCredit[byCredit.length - 1];
  return (
    <>
      <div className="split">
        <ScenarioPanel scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} summary={describe(scenario, sim.cambioUsdPerEur)} />
        <div>
          <Hero label={t("sim.kpi.outflow")} value={bn(tot.deflusso)} range={range(band.deflusso[0], band.deflusso[1])}
            text={t("sim.hero.text", { x: nf(tot.effettoPp, 2), eur: bn(scenario.importo), sub: Math.round(scenario.sostituzione * 100) })}>
            <div className="kpis" style={{ gridTemplateColumns: "minmax(0, 1fr)", margin: 0 }}>
              <Kpi label={t("sim.kpi.sight")} value={pct(tot.persiVista, tot.persiVista < 0.01 ? 2 : 1)} range={t("fmt.band", { a: pct(band.persiVista[0], 2), b: pct(band.persiVista[1], 2) })} sub={t("sim.kpi.sight.sub")} />
              <Kpi label={t("sim.kpi.wholesale")} value={`+${pct(tot.aumentoIngrosso, tot.aumentoIngrosso < 0.01 ? 2 : 1)}`} sub={t("sim.kpi.wholesale.sub")} />
              <Kpi label={t("sim.kpi.credit")} value={bn(tot.credito)} range={range(band.credito[0], band.credito[1])} sub={t("sim.kpi.credit.sub", { x: nf(tot.creditoPct, 2) })} />
            </div>
          </Hero>
          <div style={{ marginTop: "calc(-1 * var(--space-3))", marginBottom: "var(--space-5)" }}>
            <Note id="note.band" vars={{ a: nf(sim.livello.minimo, 1), b: nf(sim.livello.massimo, 1), c: nf(sim.livello.centrale, 1) }} />
            <p className="muted tiny" style={{ margin: "var(--space-2) 0 0" }}>{t("sim.share")}</p>
          </div>

          <Card>
            <Chart title={t("sim.chart.effect")} unit={t("sim.chart.effect.unit")} source={src} note={t("sim.chart.click")} height={460} deps={[rows]} onClick={(p) => open(p.name)}
              alt={t("sim.alt.effect", { a: country(first.code), av: nf(first.effettoPp, 2), b: country(last.code), bv: nf(last.effettoPp, 2) })}
              option={(p) => ({
                grid: grid({ right: 44 }), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => t("fmt.points", { n: nf(v, 2) }) },
                xAxis: { type: "value", ...axisStyle(p), axisLabel: { show: false }, splitLine: { show: false } },
                yAxis: { type: "category", inverse: true, data: byEffect.map((r) => country(r.code)), ...axisStyle(p), splitLine: { show: false } },
                series: [{ type: "bar", data: byEffect.map((r) => +r.effettoPp.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 3, 3, 0] }, barMaxWidth: 13,
                  label: barLabel(p, (v) => nf(v, 2)), cursor: "pointer" }],
              })} />
            <Note id="note.flow" />
          </Card>

          <Card>
            <Chart title={t("sim.chart.credit")} unit={t("sim.chart.credit.unit")} source={src} note={t("sim.chart.click")} height={480} deps={[rows]} onClick={(p) => open(p.name)}
              alt={t("sim.alt.credit", { a: country(cFirst.code), av: nf(cFirst.creditoPct, 2), b: country(cLast.code), bv: nf(cLast.creditoPct, 2) })}
              option={(p) => ({
                grid: grid({ top: p.narrow ? 58 : 34 }), legend: { ...legendStyle(p), top: 0, left: 0 },
                tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 2) + "%" },
                xAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
                yAxis: { type: "category", inverse: true, data: byCredit.map((r) => country(r.code)), ...axisStyle(p), splitLine: { show: false } },
                series: [
                  { name: t("sim.legend.chosen"), type: "bar", data: byCredit.map((r) => +r.creditoPct.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 3, 3, 0] }, barMaxWidth: 12 },
                  { name: t("sim.legend.low"), type: "scatter", symbol: "rect", symbolSize: [3, 14], z: 3, data: byCredit.map((r, i) => [+(100 * r.creditoBasso / loans[r.code]).toFixed(4), i]), itemStyle: { color: p.ink } },
                  { name: t("sim.legend.high"), type: "scatter", symbol: "diamond", symbolSize: 10, z: 3, data: byCredit.map((r, i) => [+(100 * r.creditoAlto / loans[r.code]).toFixed(4), i]), itemStyle: { color: p.accent } },
                ],
              })} />
            <Note id="note.credit" />
          </Card>
        </div>
      </div>

      <Card title={t("sim.all")}>
        <p className="muted tiny"><span className="tag" style={{ marginLeft: 0 }}>R</span> {t("sim.tagR", { x: pct(sim.sogliaRetail, 1) })}</p>
        <DataTable columns={resultColumns(sim)} rows={rows} csvName="scenario_by_country.csv" initialSort={{ key: "effettoPp", dir: -1 }} compact
          onRow={(r) => { window.location.hash = route.href(`country/${r.code}`); }}
          footer={[t("col.euroArea"), nf(tot.deflusso, 2), pct(tot.persiVista, 2), nf(tot.effettoPp, 2), pct(tot.aumentoIngrosso, 1), nf(tot.credito, 2), nf(tot.creditoPct, 2) + "%", nf(tot.creditoBasso, 2), nf(tot.creditoAlto, 2)]} />
      </Card>
    </>
  );
}
