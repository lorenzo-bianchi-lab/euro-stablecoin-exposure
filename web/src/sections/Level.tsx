import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, Kpi, Loading, Note, Select, Slider } from "../components/ui";
import { bn, day, nf, pct, t } from "../i18n";
import { levelEstimate, type LevelCase } from "../lib/model";
import type { AppData, LevelFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";

export default function Level({ data }: { data: AppData }) {
  const route = useRoute();
  const { data: lv, error } = useJson<LevelFile>("livello.json");
  if (!lv) return <Loading error={error} />;
  const g = (k: string) => route.params.get(k);
  const clamp = (v: string | null, d: number, lo: number, hi: number) => { const x = v === null ? NaN : Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const unit = g("uni") === "individui" ? "individui" : "famiglie";
  const kase: LevelCase = g("caso") === "minimo" || g("caso") === "massimo" ? (g("caso") as LevelCase) : "centrale";
  const lastBand = clamp(g("ult"), lv.fasce[lv.fasce.length - 1][kase], 10000, 50000);
  const usd = clamp(g("usd"), +(100 * lv.quotaDollari[kase]).toFixed(1), 40, 100) / 100;
  const holders = clamp(g("det"), 100 * lv.quotaDetentori, 1, 10) / 100;
  const estimate = levelEstimate(lv.fasce, lv.unita[unit], holders, usd, kase, lastBand);
  const r = lv.riferimento;
  const compare: [string, number][] = [[t("lv.cmp.chosen"), estimate], [t("lv.cmp.min"), r.minimo_mld_eur], [t("lv.cmp.centre"), r.centrale_mld_eur],
    [t("lv.cmp.max"), r.massimo_mld_eur], [t("lv.cmp.upper"), r.estremo_superiore_dichiarato_mld_eur], [t("lv.cmp.esm75"), lv.esm.baseEur], [t("lv.cmp.esm15"), lv.esm.altoEur]];
  const tot = lv.fasce.reduce((a, b) => a + b.percentuale, 0);
  const bandLabel = (i: number) => (i === 0 ? t("lv.band.first", { b: nf(lv.fasce[0].massimo, 0) }) : i === lv.fasce.length - 1 ? t("lv.band.last", { a: nf(lv.fasce[i].minimo, 0) }) : t("lv.band.mid", { a: nf(lv.fasce[i].minimo, 0), b: nf(lv.fasce[i].massimo, 0) }));
  return (
    <>
      <Card title={t("lv.bottomUp")}>
        <div className="kpis">
          <Kpi label={t("lv.kpi.chosen")} value={bn(estimate)} sub={t(unit === "famiglie" ? "lv.kpi.chosen.hh" : "lv.kpi.chosen.ind", { x: nf(lv.unita[unit] * holders / 1e6, 1) })} />
          <Kpi label={t("lv.kpi.ref")} value={bn(r.centrale_mld_eur)} range={t("ov.kpi.level.range", { a: nf(r.minimo_mld_eur, 1), b: nf(r.massimo_mld_eur, 1) })} sub={t("ov.kpi.level.sub", { x: nf(r.estremo_superiore_dichiarato_mld_eur, 1) })} />
          <Kpi label={t("ov.kpi.esm")} value={bn(lv.esm.baseEur)} sub={t("lv.kpi.esm.sub", { x: nf(lv.esm.altoEur, 1), d: day(lv.esm.data) })} />
        </div>
        <Note id="note.levelFormula" />
        <p className="muted tiny">{t("ov.fx", { fx: nf(data.sim.cambioUsdPerEur, 4), d: day(data.sim.dataCambio) })}</p>
        <a className="btn small" href={route.href("simulator", { imp: Number(estimate.toFixed(2)) })}>{t("lv.use")}</a>
      </Card>

      <Card title={t("lv.assumptions")}>
        <div className="controls">
          <Select id="uni" label={t("lv.unit")} value={unit} options={[["famiglie", t("lv.unit.hh", { x: nf(lv.unita.famiglie / 1e6, 1) })], ["individui", t("lv.unit.ind", { x: nf(lv.unita.individui / 1e6, 1) })]]} onChange={(v) => route.setParams({ uni: v })} />
          <Select id="caso" label={t("lv.case")} value={kase} options={[["minimo", t("lv.case.min")], ["centrale", t("lv.case.mid")], ["massimo", t("lv.case.max")]]} onChange={(v) => route.setParams({ caso: v, ult: null, usd: null })} />
          <Slider id="ult" label={t("lv.lastBand")} value={lastBand} min={10000} max={50000} step={1000} onChange={(v) => route.setParams({ ult: v })} display={`${nf(lastBand, 0)} €`} />
          <Slider id="usd" label={t("lv.usdShare")} value={Math.round(usd * 100)} min={40} max={100} step={1} onChange={(v) => route.setParams({ usd: v })} display={pct(usd, 0)} />
          <Slider id="det" label={t("lv.holders")} value={+(holders * 100).toFixed(1)} min={1} max={10} step={0.5} onChange={(v) => route.setParams({ det: v })} display={pct(holders, 1)} />
        </div>
        <Note id="note.units" />
      </Card>

      <div className="grid2">
        <Card>
          <Chart title={t("lv.chart.bands")} unit={t("lv.chart.bands.unit")} source={t("lv.chart.bands.src")} height={320} deps={[lv]}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
              xAxis: { type: "category", data: lv.fasce.map((_, i) => bandLabel(i)), ...axisStyle(p), axisLabel: { color: p.ink2, fontSize: 10, rotate: 40, interval: 0 }, splitLine: { show: false } },
              yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
              series: [{ type: "bar", data: lv.fasce.map((f) => +(100 * f.percentuale / tot).toFixed(2)), itemStyle: { color: p.series[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 }],
            })} />
          <Note id="note.chartB" />
        </Card>
        <Card>
          <Chart title={t("lv.chart.cmp")} unit={t("unit.bnEur")} source={t("lv.chart.cmp.src")} height={320} deps={[estimate, lv]}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => bn(v) },
              xAxis: { type: "value", ...axisStyle(p) },
              yAxis: { type: "category", inverse: true, data: compare.map((c) => c[0]), ...axisStyle(p), splitLine: { show: false } },
              series: [{ type: "bar", barMaxWidth: 16, data: compare.map(([, v], i) => ({ value: +v.toFixed(2), itemStyle: { color: i === 0 ? p.series[1] : i >= 5 ? p.ink2 : p.series[0], borderRadius: [0, 4, 4, 0] } })) }],
            })} />
        </Card>
      </div>

      <Card>
        <Chart title={t("lv.chart.esm")} unit={t("lv.chart.esm.unit")} source={t("lv.chart.esm.src")} height={300} deps={[lv]}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => bn(v) },
            xAxis: { type: "category", data: lv.esm.serie.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", min: 0, ...axisStyle(p) },
            series: [
              { name: t("lv.legend.esm75"), type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[0] }, data: lv.esm.serie.base,
                markArea: { silent: true, itemStyle: { color: p.soft, opacity: 0.6 }, data: [[{ yAxis: +r.minimo_mld_eur.toFixed(2), name: t("lv.legend.own") }, { yAxis: +r.massimo_mld_eur.toFixed(2) }]], label: { color: p.ink2, fontSize: 10, position: "insideTopLeft" } } },
              { name: t("lv.legend.esm15"), type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[1] }, data: lv.esm.serie.alto },
            ],
          })} />
        <Note id="note.esm" />
      </Card>

      <Card title={t("lv.other")}>
        <ul className="plain">
          <li><strong>{t("lv.b2.title")}</strong> {t("lv.b2.text", { x: nf(lv.altreStrade.b2.saldiClientiMldUsd, 1) })}</li>
          <li><strong>{t("lv.b3.title", { x: nf(lv.altreStrade.b3.centrale, 1) })}</strong> {t("lv.b3.text")}</li>
        </ul>
        <Note id={lv.criterioSoddisfatto ? "note.criterionMet" : "note.criterion"} />
        <p className="muted tiny">{t("lv.central", { x: pct(data.overview.scenarioCentrale.depositiAVistaPersi, 2) })}</p>
      </Card>
    </>
  );
}
