import { useMemo } from "react";
import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Kpi, Loading, Note, Select } from "../components/ui";
import { bn, country, locale, month, nf, pct, t } from "../i18n";
import { compute, type Scenario } from "../lib/model";
import type { AppData, CountryFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { describeChoices } from "./shared";

const GROUPS: [string, string[]][] = [
  ["sightHhNfc", ["vista_famiglie", "vista_imprese"]], ["otherHhNfc", ["altri_dep_famiglie", "altri_dep_imprese"]],
  ["otherDeposits", ["altri_dep_non_ifm", "dep_governo_centrale"]], ["fromBanks", ["dep_da_ifm"]], ["debt", ["titoli_di_debito"]],
  ["external", ["passivita_estere"]], ["capital", ["capitale_e_riserve"]], ["other", ["altre_passivita", "fondi_monetari"]],
];

export default function CountrySheet({ data, scenario, code }: { data: AppData; scenario: Scenario; code: string }) {
  const { sim } = data;
  const route = useRoute();
  const c = sim.paesi.find((x) => x.code === code) ?? sim.paesi.find((x) => x.code === "IT")!;
  const name = country(c.code);
  const { data: file, error } = useJson<CountryFile>(`paesi/${c.code}.json`);
  const effects = useMemo(() => sim.predefiniti.map((p) => {
    const r = compute(sim.paesi, sim.coefficienti, { ...scenario, importo: p.eur }).find((x) => x.code === c.code)!;
    return { ...r, id: p.id, importo: p.eur };
  }), [sim, scenario.sostituzione, scenario.regola, scenario.depositi, scenario.credito, c.code]);
  const options = [...sim.paesi].map((x) => [x.code, country(x.code)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], locale()));
  const src = t("src.bsiPlain");
  return (
    <>
      <Card>
        <div className="controls">
          <Select id="paese" label={t("col.country")} value={c.code} options={options} onChange={(v) => { window.location.hash = route.href(`country/${v}`); }} />
        </div>
        <div className="kpis">
          <Kpi label={t("cs.kpi.rank")} value={t("cs.kpi.rank.value", { n: c.posizione, tot: sim.paesi.length })} sub={t("cs.kpi.rank.sub", { x: nf(c.indicatore, 2) })} />
          <Kpi label={t("cs.kpi.c1")} value={pct(c.c1)} sub={t("cs.kpi.c1.sub", { a: bn(c.vista, 0), b: nf(c.totale, 0) })} />
          <Kpi label={t("cs.kpi.c2")} value={pct(c.c2)} />
          <Kpi label={t("cs.kpi.c3")} value={pct(c.c3)} />
          <Kpi label={t("cs.kpi.usd")} value={pct(c.usd)} sub={t("cs.kpi.usd.sub", { s: t(`usdSource.${c.fonteUsd}`) })} />
          <Kpi label={t("cs.kpi.owners")} value={pct(c.quotaPossessori)} sub={t(c.possessoriImputati ? "cs.kpi.owners.imputed" : "cs.kpi.owners.survey")} />
        </div>
        <Note id="note.country" />
      </Card>

      {!file ? <Loading error={error} /> : (
        <>
          <Card>
            <Chart title={t("cs.chart.composition", { c: name })} unit={t("cs.chart.composition.unit")} source={t("cs.chart.composition.src", { a: month(file.composizione.mesi[0]), b: month(file.composizione.mesi[file.composizione.mesi.length - 1]) })} height={380} deps={[file]}
              option={(p) => ({
                grid: grid({ top: 70 }), legend: { ...legendStyle(p), top: 0, type: "scroll" },
                tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                xAxis: { type: "category", data: file.composizione.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                yAxis: { type: "value", max: 100, ...axisStyle(p), axisLabel: pctLabel(p) },
                series: GROUPS.map(([id, keys], i) => ({
                  name: t(`cs.group.${id}`), type: "line", stack: "passivo", symbol: "none", lineStyle: { width: 0.5, color: p.panel }, areaStyle: { color: p.series[i], opacity: 1 }, itemStyle: { color: p.series[i] },
                  data: file.composizione.mesi.map((_, j) => +(100 * keys.reduce((a, k) => a + (file.composizione.voci[k]?.[j] ?? 0), 0)).toFixed(2)),
                })),
              })} />
          </Card>
          <div className="grid2">
            <Card>
              <Chart title={t("cs.chart.rank")} unit={t("cs.chart.rank.unit")} source={src} height={280} deps={[file]}
                option={(p) => ({
                  grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", formatter: (x: { axisValue: string; value: number; dataIndex: number }[]) => `${month(x[0].axisValue)}<br>${t("cs.chart.rank.tip", { n: x[0].value, tot: file.indicatore.paesi[x[0].dataIndex] })}` },
                  xAxis: { type: "category", data: file.indicatore.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                  yAxis: { type: "value", inverse: true, min: 1, max: 21, interval: 5, ...axisStyle(p) },
                  series: [{ type: "line", step: "end", symbol: "none", lineStyle: { width: 2, color: p.series[0] }, data: file.indicatore.posizione }],
                })} />
            </Card>
            <Card>
              <Chart title={t("cs.chart.components")} unit={t("cs.chart.components.unit")} source={src} height={280} deps={[file]}
                option={(p) => ({
                  grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                  xAxis: { type: "category", data: file.indicatore.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                  yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
                  series: (["c1", "c2", "c3"] as const).map((k, i) => ({
                    name: t(`cs.legend.${k}`), type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[i] }, data: file.indicatore[k].map((v) => +(100 * v).toFixed(2)) })),
                })} />
            </Card>
          </div>
        </>
      )}

      <Card title={t("cs.effects", { c: name })}>
        <p className="muted tiny">{t("cs.effects.same", { s: describeChoices(scenario) })}</p>
        <DataTable csvName={`scenarios_${c.code}.csv`} rows={effects} initialSort={{ key: "importo", dir: 1 }} columns={[
          { key: "nome", label: t("col.scenario"), value: (r) => t(`preset.${r.id}`) },
          { key: "importo", label: t("col.amount"), numeric: true, value: (r) => r.importo, format: (r) => nf(r.importo, 1) },
          { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 2) },
          { key: "persiVista", label: t("col.sightLost"), numeric: true, value: (r) => r.persiVista, format: (r) => pct(r.persiVista, 2) },
          { key: "effettoPp", label: t("col.fundingEffect"), numeric: true, value: (r) => r.effettoPp, format: (r) => nf(r.effettoPp, 2) },
          { key: "aumentoIngrosso", label: t("col.wholesale"), numeric: true, value: (r) => r.aumentoIngrosso, format: (r) => pct(r.aumentoIngrosso, 1) },
          { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 2) },
          { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 2) + "%" },
        ]} />
        <Note id="note.credit" />
      </Card>

      <Card title={t("cs.quadrant", { q: c.quadrante, title: t(`quad.${c.quadrante}.title`) })}>
        <p>{t(`quad.${c.quadrante}.text`)}</p>
        <p className="muted tiny">{t(c.retailAlta ? "cs.retail.high" : "cs.retail", { x: pct(c.quotaRetail), w: nf(c.pesoContinuo, 2) })}</p>
        <a className="btn small" href={route.href("channels")}>{t("cs.openChannels")}</a> <a className="btn small" href={route.href("banks", { bc: c.code })}>{t("cs.openBanks")}</a>
      </Card>
    </>
  );
}
