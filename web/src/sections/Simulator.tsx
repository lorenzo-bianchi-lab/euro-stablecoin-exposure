import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Kpi, Note, ScenarioControls } from "../components/ui";
import { bn, country, month, nf, pct, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { resultColumns, useResults } from "./shared";

export default function Simulator({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { rows, tot, band } = useResults(sim, scenario);
  const byEffect = [...rows].sort((a, b) => b.effettoPp - a.effettoPp);
  const loans = Object.fromEntries(sim.paesi.map((c) => [c.code, c.prestiti]));
  const src = t("src.calc", { m: month(sim.meseBilanci) });
  const open = (name?: string) => { const r = rows.find((x) => country(x.code) === name); if (r) window.location.hash = route.href(`country/${r.code}`); };
  return (
    <>
      <Card title={t("sim.scenario")}>
        <ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} />
        <p className="muted tiny" style={{ marginTop: 10 }}>{t("sim.share")}</p>
      </Card>

      <Card title={t("sim.result")}>
        <div className="kpis">
          <Kpi label={t("sim.kpi.outflow")} value={bn(tot.deflusso)} range={t("fmt.band", { a: nf(band.deflusso[0], 1), b: nf(band.deflusso[1], 1) })} sub={t("sim.kpi.outflow.sub", { x: nf(tot.effettoPp, 2) })} />
          <Kpi label={t("sim.kpi.sight")} value={pct(tot.persiVista, tot.persiVista < 0.01 ? 2 : 1)} range={t("fmt.band", { a: pct(band.persiVista[0], 2), b: pct(band.persiVista[1], 2) })} sub={t("sim.kpi.sight.sub")} />
          <Kpi label={t("sim.kpi.wholesale")} value={`+${pct(tot.aumentoIngrosso, tot.aumentoIngrosso < 0.01 ? 2 : 1)}`} sub={t("sim.kpi.wholesale.sub")} />
          <Kpi label={t("sim.kpi.credit")} value={bn(tot.credito)} range={t("fmt.band", { a: nf(band.credito[0], 1), b: nf(band.credito[1], 1) })} sub={t("sim.kpi.credit.sub", { x: nf(tot.creditoPct, 2) })} />
        </div>
        <Note id="note.band" vars={{ a: nf(sim.livello.minimo, 1), b: nf(sim.livello.massimo, 1), c: nf(sim.livello.centrale, 1) }} />
        <Note id="note.flow" />
      </Card>

      <div className="grid2">
        <Card>
          <Chart title={t("sim.chart.effect")} unit={t("sim.chart.effect.unit")} source={src} height={420} deps={[rows]} onClick={(p) => open(p.name)}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => t("fmt.points", { n: nf(v, 2) }) },
              xAxis: { type: "value", ...axisStyle(p) },
              yAxis: { type: "category", inverse: true, data: byEffect.map((r) => country(r.code)), ...axisStyle(p), splitLine: { show: false } },
              series: [{ type: "bar", data: byEffect.map((r) => +r.effettoPp.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 }],
            })} />
        </Card>
        <Card>
          <Chart title={t("sim.chart.credit")} unit={t("sim.chart.credit.unit")} source={src} height={420} deps={[rows]}
            option={(p) => ({
              grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 },
              tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 2) + "%" },
              xAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
              yAxis: { type: "category", inverse: true, data: byEffect.map((r) => country(r.code)), ...axisStyle(p), splitLine: { show: false } },
              series: [
                { name: t("sim.legend.chosen"), type: "bar", data: byEffect.map((r) => +r.creditoPct.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 12 },
                { name: t("sim.legend.low"), type: "scatter", symbol: "rect", symbolSize: [3, 14], data: byEffect.map((r, i) => [+(100 * r.creditoBasso / loans[r.code]).toFixed(4), i]), itemStyle: { color: p.ink2 } },
                { name: t("sim.legend.high"), type: "scatter", symbol: "diamond", symbolSize: 9, data: byEffect.map((r, i) => [+(100 * r.creditoAlto / loans[r.code]).toFixed(4), i]), itemStyle: { color: p.series[1] } },
              ],
            })} />
          <Note id="note.credit" />
        </Card>
      </div>

      <Card title={t("sim.all")}>
        <p className="muted tiny"><span className="tag">R</span> {t("sim.tagR", { x: pct(sim.sogliaRetail, 1) })}</p>
        <DataTable columns={resultColumns(sim)} rows={rows} csvName="scenario_by_country.csv" initialSort={{ key: "effettoPp", dir: -1 }}
          onRow={(r) => { window.location.hash = route.href(`country/${r.code}`); }}
          footer={[t("col.euroArea"), nf(tot.deflusso, 2), pct(tot.persiVista, 2), nf(tot.effettoPp, 2), pct(tot.aumentoIngrosso, 1), nf(tot.credito, 2), nf(tot.creditoPct, 2) + "%", nf(tot.creditoBasso, 2), nf(tot.creditoAlto, 2)]} />
      </Card>
    </>
  );
}
