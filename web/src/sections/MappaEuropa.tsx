import { useEffect, useState } from "react";
import { Chart, echarts, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Note, ScenarioControls, Select } from "../components/ui";
import type { Country, Row, Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { fetchJson, mese, nf, useRoute } from "../lib/util";
import { FLOW_NOTE, describe, useResults } from "./shared";

type Ind = { label: string; unit: string; scen: boolean; get: (c: Country, r: Row) => number; digits: number };
const INDICATORI: Record<string, Ind> = {
  effettoPp: { label: "Scenario: effetto sulla raccolta", unit: "punti percentuali del passivo", scen: true, get: (_, r) => r.effettoPp, digits: 2 },
  persiVista: { label: "Scenario: depositi a vista persi", unit: "percentuale dei depositi a vista", scen: true, get: (_, r) => 100 * r.persiVista, digits: 2 },
  aumentoIngrosso: { label: "Scenario: raccolta all'ingrosso in più", unit: "percentuale della raccolta all'ingrosso esistente", scen: true, get: (_, r) => 100 * r.aumentoIngrosso, digits: 1 },
  creditoPct: { label: "Scenario: credito in meno", unit: "percentuale dei prestiti a famiglie e imprese", scen: true, get: (_, r) => r.creditoPct, digits: 2 },
  deflusso: { label: "Scenario: deflusso", unit: "miliardi di euro", scen: true, get: (_, r) => r.deflusso, digits: 2 },
  c1: { label: "Struttura: depositi a vista sul passivo", unit: "percentuale del passivo", scen: false, get: (c) => 100 * c.c1, digits: 1 },
  quotaRetail: { label: "Struttura: quota retail dei depositi", unit: "percentuale", scen: false, get: (c) => 100 * c.quotaRetail, digits: 1 },
  usd: { label: "Struttura: passività in dollari", unit: "percentuale del passivo", scen: false, get: (c) => 100 * c.usd, digits: 1 },
  quotaPossessori: { label: "Possessori di cripto-attività", unit: "percentuale degli adulti", scen: false, get: (c) => 100 * c.quotaPossessori, digits: 1 },
};

export function MappaEuropa({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const key = route.params.get("ind") && INDICATORI[route.params.get("ind")!] ? route.params.get("ind")! : "effettoPp";
  const ind = INDICATORI[key];
  const { rows } = useResults(sim, scenario);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchJson<{ features: unknown[] }>("geo/europa.geo.json").then((g) => { echarts.registerMap("europa", g as never); setReady(true); }).catch((e) => setError(String(e.message ?? e)));
  }, []);
  const values = sim.paesi.map((c, i) => ({ code: c.code, nome: c.nome, value: ind.get(c, rows[i]) }));
  const max = Math.max(...values.map((v) => v.value)), min = Math.min(...values.map((v) => v.value));
  const open = (name?: string) => { const c = sim.paesi.find((x) => x.nome === name); if (c) window.location.hash = route.href(`paese/${c.code}`); };
  return (
    <>
      <Card title="Indicatore">
        <div className="controls">
          <Select id="ind" label="Cosa colorare" value={key} options={Object.entries(INDICATORI).map(([k, v]) => [k, v.label])} onChange={(v) => route.setParams({ ind: v })} />
        </div>
        {ind.scen && <p className="muted tiny" style={{ marginTop: 8 }}>Scenario del simulatore: {describe(scenario, sim.cambioUsdPerEur)}.</p>}
      </Card>
      <div className="grid2">
        <Card>
          {error ? <Note>Confini dei paesi non disponibili ({error}). La tabella a fianco contiene gli stessi valori.</Note> : !ready ? <p className="muted">Caricamento della mappa…</p> : (
            <Chart title={ind.label} unit={ind.unit} source={`calcolo su BCE (BSI), ${mese(sim.meseBilanci)}; confini Eurostat GISCO`} height={520} deps={[key, rows, ready]}
              onClick={(p) => open(p.name)}
              option={(p) => ({
                tooltip: { ...tooltipStyle(p), trigger: "item", formatter: (x: { name: string; value: number }) => (Number.isFinite(x.value) ? `<b>${x.name}</b><br>${nf(x.value, ind.digits)}` : `${x.name}: fuori dall'area euro`) },
                visualMap: { min: Math.min(0, min), max: max || 1, calculable: false, orient: "horizontal", left: "center", bottom: 0, itemWidth: 12, itemHeight: 140,
                             inRange: { color: p.ramp }, textStyle: { color: p.ink2, fontSize: 11 }, formatter: (v: number) => nf(v, ind.digits) },
                series: [{ type: "map", map: "europa", nameProperty: "name", roam: false, aspectScale: 0.64, layoutCenter: ["50%", "46%"], layoutSize: "118%",
                           itemStyle: { areaColor: p.grid, borderColor: p.panel, borderWidth: 0.8 }, emphasis: { label: { show: false }, itemStyle: { areaColor: p.series[1] } }, select: { disabled: true },
                           label: { show: false }, data: values.map((v) => ({ name: v.nome, value: +v.value.toFixed(4) })) }],
              })} />)}
          <Note>{ind.scen ? FLOW_NOTE : "Indicatore strutturale: non dipende dallo scenario."} I paesi in grigio non fanno parte dell'area euro. Clic su un paese per aprire la scheda.</Note>
        </Card>
        <Card title="Valori">
          <DataTable columns={[{ key: "nome", label: "Paese", value: (r: typeof values[number]) => r.nome }, { key: "value", label: ind.unit, numeric: true, value: (r) => r.value, format: (r) => nf(r.value, ind.digits) }]}
            rows={values} csvName={`mappa_${key}.csv`} initialSort={{ key: "value", dir: -1 }} onRow={(r) => open(r.nome)} />
        </Card>
      </div>
      <Card title="Scenario collegato"><ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} /></Card>
    </>
  );
}
