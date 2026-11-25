import { useEffect, useState } from "react";
import { MapChart } from "echarts/charts";
import { GeoComponent, VisualMapComponent } from "echarts/components";
import { Chart, echarts, tooltipStyle, type Palette } from "../components/Chart";
import { Card, DataTable, Note, ScenarioControls, Select } from "../components/ui";
import { country, month, nf, t } from "../i18n";
import type { Country, Row, Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { fetchJson, useRoute } from "../lib/util";
import { describe, useResults } from "./shared";

echarts.use([MapChart, GeoComponent, VisualMapComponent]);

type Ind = { scen: boolean; get: (c: Country, r: Row) => number; digits: number };
const INDICATORS: Record<string, Ind> = {
  effettoPp: { scen: true, get: (_, r) => r.effettoPp, digits: 2 },
  persiVista: { scen: true, get: (_, r) => 100 * r.persiVista, digits: 2 },
  aumentoIngrosso: { scen: true, get: (_, r) => 100 * r.aumentoIngrosso, digits: 1 },
  creditoPct: { scen: true, get: (_, r) => r.creditoPct, digits: 2 },
  deflusso: { scen: true, get: (_, r) => r.deflusso, digits: 2 },
  c1: { scen: false, get: (c) => 100 * c.c1, digits: 1 },
  quotaRetail: { scen: false, get: (c) => 100 * c.quotaRetail, digits: 1 },
  usd: { scen: false, get: (c) => 100 * c.usd, digits: 1 },
  quotaPossessori: { scen: false, get: (c) => 100 * c.quotaPossessori, digits: 1 },
};
// Paesi troppo piccoli per leggersi sulla mappa: riquadri ingranditi, [ovest, nord], [est, sud] in gradi
const INSETS: [string, [[number, number], [number, number]]][] = [
  ["LU", [[5.2, 50.45], [7.0, 49.2]]], ["MT", [[13.9, 36.25], [14.9, 35.65]]], ["CY", [[31.9, 35.85], [34.8, 34.4]]],
];
type Geo = { features: { properties: { code: string } }[] };

export default function MapEurope({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const key = route.params.get("ind") && INDICATORS[route.params.get("ind")!] ? route.params.get("ind")! : "effettoPp";
  const ind = INDICATORS[key];
  const { rows } = useResults(sim, scenario);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchJson<Geo>("geo/europa.geo.json").then((g) => {
      echarts.registerMap("europa", g as never);
      // una copia della mappa per ogni riquadro: ECharts dà a ogni nome di mappa un proprio sistema di coordinate
      for (const [code] of INSETS) echarts.registerMap(`europa-${code}`, g as never);
      setReady(true);
    }).catch((e) => setError(String(e.message ?? e)));
  }, []);
  const values = sim.paesi.map((c, i) => ({ code: c.code, value: ind.get(c, rows[i]) }));
  const byCode = Object.fromEntries(values.map((v) => [v.code, v.value]));
  const max = Math.max(...values.map((v) => v.value)), min = Math.min(...values.map((v) => v.value));
  const open = (code?: string) => { if (code && code in byCode) window.location.hash = route.href(`country/${code}`); };
  const label = t(`map.ind.${key}`), unit = t(`map.unit.${key}`);
  const tooltip = (p: Palette) => ({ ...tooltipStyle(p), trigger: "item", formatter: (x: { name: string; value: number }) => (x.name in byCode ? `<b>${country(x.name)}</b><br>${nf(x.value, ind.digits)}` : t("map.outside")) });
  const visualMap = (p: Palette, show: boolean) => ({ show, min: Math.min(0, min), max: max || 1, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 12, itemHeight: 140,
    inRange: { color: p.ramp }, textStyle: { color: p.ink2, fontSize: 11 }, formatter: (v: number) => nf(v, ind.digits) });
  const series = (p: Palette, map: string, extra: object) => ({ type: "map", map, nameProperty: "code", roam: false, aspectScale: 0.64,
    itemStyle: { areaColor: p.grid, borderColor: p.panel, borderWidth: 0.8 }, emphasis: { label: { show: false }, itemStyle: { areaColor: p.series[1] } }, select: { disabled: true },
    label: { show: false }, data: values.map((v) => ({ name: v.code, value: +v.value.toFixed(4) })), ...extra });
  return (
    <>
      <Card title={t("map.indicator")}>
        <div className="controls">
          <Select id="ind" label={t("map.color")} value={key} options={Object.keys(INDICATORS).map((k) => [k, t(`map.ind.${k}`)])} onChange={(v) => route.setParams({ ind: v })} />
        </div>
        {ind.scen && <p className="muted tiny" style={{ marginTop: 8 }}>{t("map.scenario", { s: describe(scenario, sim.cambioUsdPerEur) })}</p>}
      </Card>
      <div className="grid2">
        <Card>
          {error ? <p className="alert">{t("map.noBorders", { e: error })}</p> : !ready ? <p className="muted" data-loading="">{t("map.loading")}</p> : (
            <>
              <Chart title={label} unit={unit} source={t("src.map", { m: month(sim.meseBilanci) })} height={500} deps={[key, rows, ready]} onClick={(p) => open(p.name)}
                option={(p) => ({ tooltip: tooltip(p), visualMap: visualMap(p, true), series: [series(p, "europa", { layoutCenter: ["50%", "46%"], layoutSize: "118%" })] })} />
              <div className="insets" aria-label={t("map.insets")}>
                {INSETS.map(([code, box]) => (
                  <div className="inset" key={code}>
                    <Chart bare title={country(code)} unit={nf(byCode[code], ind.digits)} height={110} deps={[key, rows, ready]} onClick={(p) => open(p.name)}
                      option={(p) => ({ tooltip: tooltip(p), visualMap: visualMap(p, false), series: [series(p, `europa-${code}`, { boundingCoords: box, left: 6, right: 6, top: 6, bottom: 6 })] })} />
                  </div>))}
              </div>
            </>)}
          <Note id={ind.scen ? "note.map.scen" : "note.map.struct"} />
        </Card>
        <Card title={t("map.values")}>
          <DataTable columns={[{ key: "nome", label: t("col.country"), value: (r: typeof values[number]) => country(r.code) }, { key: "value", label: unit, numeric: true, value: (r) => r.value, format: (r) => nf(r.value, ind.digits) }]}
            rows={values} csvName={`map_${key}.csv`} initialSort={{ key: "value", dir: -1 }} onRow={(r) => open(r.code)} />
        </Card>
      </div>
      <Card title={t("map.linked")}><ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} /></Card>
    </>
  );
}
