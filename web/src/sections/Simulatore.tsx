import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Kpi, Note, ScenarioControls } from "../components/ui";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { mese, nf, pct, useRoute } from "../lib/util";
import { CREDIT_NOTE, FLOW_NOTE, resultColumns, useResults } from "./shared";

export function Simulatore({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { rows, tot, band } = useResults(sim, scenario);
  const byEffect = [...rows].sort((a, b) => b.effettoPp - a.effettoPp);
  const src = `calcolo su BCE, bilanci bancari (BSI), ${mese(sim.meseBilanci)}; coefficienti del Working Paper BCE 3199`;
  return (
    <>
      <Card title="Scenario">
        <ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} />
        <p className="muted tiny" style={{ marginTop: 10 }}>L'indirizzo di questa pagina contiene lo scenario: si può copiare e condividere.</p>
      </Card>

      <Card title="Risultato per l'area euro">
        <div className="kpis">
          <Kpi label="Depositi da sostituire" value={`${nf(tot.deflusso, 1)} mld €`} range={`fascia ${nf(band.deflusso[0], 1)} - ${nf(band.deflusso[1], 1)}`} sub={`${nf(tot.effettoPp, 2)} punti del passivo`} />
          <Kpi label="Depositi a vista persi" value={pct(tot.persiVista, tot.persiVista < 0.01 ? 2 : 1)} range={`fascia ${pct(band.persiVista[0], 2)} - ${pct(band.persiVista[1], 2)}`} sub="famiglie e imprese" />
          <Kpi label="Raccolta all'ingrosso in più" value={`+${pct(tot.aumentoIngrosso, tot.aumentoIngrosso < 0.01 ? 2 : 1)}`} sub="rispetto a quella esistente" />
          <Kpi label="Credito in meno, 24 mesi" value={`${nf(tot.credito, 1)} mld €`} range={`fascia ${nf(band.credito[0], 1)} - ${nf(band.credito[1], 1)}`} sub={`${nf(tot.creditoPct, 2)}% dei prestiti a famiglie e imprese`} />
        </div>
        <Note>La fascia combina tre incertezze: il livello (l'importo scalato come l'intervallo della stima, da {nf(sim.livello.minimo, 1)} a {nf(sim.livello.massimo, 1)} su un centro di {nf(sim.livello.centrale, 1)}), la quota finanziata con depositi (dal 50% al 100%) e, per il credito, i coefficienti basso e alto. Non è un intervallo di confidenza. {FLOW_NOTE}</Note>
      </Card>

      <div className="grid2">
        <Card>
          <Chart title="Effetto sulla raccolta per paese" unit="punti percentuali del passivo" source={src} height={420} deps={[rows]}
            onClick={(p) => { const r = rows.find((x) => x.nome === p.name); if (r) window.location.hash = route.href(`paese/${r.code}`); }}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 2) + " punti" },
              xAxis: { type: "value", ...axisStyle(p) },
              yAxis: { type: "category", inverse: true, data: byEffect.map((r) => r.nome), ...axisStyle(p), splitLine: { show: false } },
              series: [{ type: "bar", data: byEffect.map((r) => +r.effettoPp.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 14 }],
            })} />
        </Card>
        <Card>
          <Chart title="Credito in meno per paese" unit="percentuale dei prestiti a famiglie e imprese; variante scelta e coefficienti basso e alto" source={src} height={420} deps={[rows]}
            option={(p) => ({
              grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 },
              tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 2) + "%" },
              xAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
              yAxis: { type: "category", inverse: true, data: byEffect.map((r) => r.nome), ...axisStyle(p), splitLine: { show: false } },
              series: [
                { name: "variante scelta", type: "bar", data: byEffect.map((r) => +r.creditoPct.toFixed(4)), itemStyle: { color: p.series[0], borderRadius: [0, 4, 4, 0] }, barMaxWidth: 12 },
                { name: "coefficiente basso", type: "scatter", symbol: "rect", symbolSize: [3, 14], data: byEffect.map((r, i) => [+(100 * r.creditoBasso / sim.paesi.find((c) => c.code === r.code)!.prestiti).toFixed(4), i]), itemStyle: { color: p.ink2 } },
                { name: "coefficiente alto", type: "scatter", symbol: "diamond", symbolSize: 9, data: byEffect.map((r, i) => [+(100 * r.creditoAlto / sim.paesi.find((c) => c.code === r.code)!.prestiti).toFixed(4), i]), itemStyle: { color: p.series[1] } },
              ],
            })} />
          <Note>{CREDIT_NOTE}</Note>
        </Card>
      </div>

      <Card title="Tutti i paesi">
        <p className="muted tiny"><span className="tag">R</span> paesi sopra la soglia di quota retail ({pct(sim.sogliaRetail, 1)}), a cui la variante a soglia applica il coefficiente alto. Clic su una riga per aprire la scheda del paese.</p>
        <DataTable columns={resultColumns(sim)} rows={rows} csvName="scenario_per_paese.csv" initialSort={{ key: "effettoPp", dir: -1 }}
          onRow={(r) => { window.location.hash = route.href(`paese/${r.code}`); }}
          footer={["Area euro", nf(tot.deflusso, 2), pct(tot.persiVista, 2), nf(tot.effettoPp, 2), pct(tot.aumentoIngrosso, 1), nf(tot.credito, 2), nf(tot.creditoPct, 2) + "%", nf(tot.creditoBasso, 2), nf(tot.creditoAlto, 2)]} />
      </Card>
    </>
  );
}
