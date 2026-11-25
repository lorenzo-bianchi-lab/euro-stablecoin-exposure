import { useMemo } from "react";
import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Kpi, Loading, Note, Select } from "../components/ui";
import { compute, type Scenario } from "../lib/model";
import type { AppData, Channels, CountryFile } from "../lib/types";
import { mese, nf, pct, useJson, useRoute } from "../lib/util";
import { CREDIT_NOTE, describe } from "./shared";

const GRUPPI: [string, string[]][] = [
  ["Depositi a vista di famiglie e imprese", ["vista_famiglie", "vista_imprese"]],
  ["Altri depositi di famiglie e imprese", ["altri_dep_famiglie", "altri_dep_imprese"]],
  ["Altri depositi (finanziari, governo)", ["altri_dep_non_ifm", "dep_governo_centrale"]],
  ["Depositi da banche (IFM)", ["dep_da_ifm"]], ["Titoli di debito emessi", ["titoli_di_debito"]],
  ["Passività verso l'estero", ["passivita_estere"]], ["Capitale e riserve", ["capitale_e_riserve"]], ["Altro", ["altre_passivita", "fondi_monetari"]],
];

export function SchedaPaese({ data, scenario, code }: { data: AppData; scenario: Scenario; code: string }) {
  const { sim } = data;
  const route = useRoute();
  const country = sim.paesi.find((c) => c.code === code) ?? sim.paesi.find((c) => c.code === "IT")!;
  const { data: file, error } = useJson<CountryFile>(`paesi/${country.code}.json`);
  const { data: canali } = useJson<Channels>("canali.json");
  const effetti = useMemo(() => sim.predefiniti.map((p) => {
    const r = compute(sim.paesi, sim.coefficienti, { ...scenario, importo: p.eur }).find((x) => x.code === country.code)!;
    return { ...r, nome: p.nome, importo: p.eur };
  }), [sim, scenario.sostituzione, scenario.regola, scenario.depositi, scenario.credito, country.code]);
  const quad = canali?.quadranti.find((q) => q.id === country.quadrante);
  const src = "BCE, bilanci bancari (BSI)";
  return (
    <>
      <Card>
        <div className="controls">
          <Select id="paese" label="Paese" value={country.code} options={sim.paesi.map((c) => [c.code, c.nome])} onChange={(v) => { window.location.hash = route.href(`paese/${v}`); }} />
        </div>
        <div className="kpis">
          <Kpi label="Posizione in classifica" value={`${country.posizione}° su ${sim.paesi.length}`} sub={`indicatore ${nf(country.indicatore, 2)}`} />
          <Kpi label="Depositi a vista sul passivo (C1)" value={pct(country.c1)} sub={`${nf(country.vista, 0)} mld € su ${nf(country.totale, 0)}`} />
          <Kpi label="Quota a vista dei depositi (C2)" value={pct(country.c2)} />
          <Kpi label="Dipendenza dai depositi (C3)" value={pct(country.c3)} />
          <Kpi label="Passività in dollari" value={pct(country.usd)} sub={`fonte ${country.fonteUsd}`} />
          <Kpi label="Possessori di cripto-attività" value={pct(country.quotaPossessori)} sub={country.possessoriImputati ? "valore imputato: media dell'area" : "indagine SPACE 2024"} />
        </div>
        <Note>La posizione ordina la struttura della raccolta rispetto agli altri paesi: non è una probabilità di deflusso né un giudizio sulla solidità delle banche. Dati nazionali aggregati: dentro il paese le banche sono diverse.</Note>
      </Card>

      {!file ? <Loading error={error} /> : (
        <>
          <Card>
            <Chart title={`Composizione della raccolta, ${country.nome}`} unit="percentuale del totale del passivo, dati mensili" source={`${src}, dal ${mese(file.composizione.mesi[0])} al ${mese(file.composizione.mesi[file.composizione.mesi.length - 1])}`} height={380} deps={[file]}
              option={(p) => ({
                grid: grid({ top: 70 }), legend: { ...legendStyle(p), top: 0, type: "scroll" },
                tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                xAxis: { type: "category", data: file.composizione.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                yAxis: { type: "value", max: 100, ...axisStyle(p), axisLabel: pctLabel(p) },
                series: GRUPPI.map(([name, keys], i) => ({
                  name, type: "line", stack: "passivo", symbol: "none", lineStyle: { width: 0.5, color: p.panel }, areaStyle: { color: p.series[i], opacity: 1 }, itemStyle: { color: p.series[i] },
                  data: file.composizione.mesi.map((_, j) => +(100 * keys.reduce((a, k) => a + (file.composizione.voci[k]?.[j] ?? 0), 0)).toFixed(2)),
                })),
              })} />
          </Card>
          <div className="grid2">
            <Card>
              <Chart title="Posizione in classifica nel tempo" unit="1 = più esposto; tra i paesi con dati in quel mese" source={src} height={280} deps={[file]}
                option={(p) => ({
                  grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", formatter: (x: { axisValue: string; value: number; dataIndex: number }[]) => `${mese(x[0].axisValue)}<br>posizione ${x[0].value} su ${file.indicatore.paesi[x[0].dataIndex]}` },
                  xAxis: { type: "category", data: file.indicatore.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                  yAxis: { type: "value", inverse: true, min: 1, max: 21, interval: 5, ...axisStyle(p) },
                  series: [{ type: "line", step: "end", symbol: "none", lineStyle: { width: 2, color: p.series[0] }, data: file.indicatore.posizione }],
                })} />
            </Card>
            <Card>
              <Chart title="Componenti dell'indicatore" unit="percentuale; C1 quantità, C2 mobilità, C3 dipendenza" source={src} height={280} deps={[file]}
                option={(p) => ({
                  grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                  xAxis: { type: "category", data: file.indicatore.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
                  yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
                  series: ([["C1 depositi a vista sul passivo", "c1"], ["C2 quota a vista dei depositi", "c2"], ["C3 dipendenza dai depositi", "c3"]] as const).map(([name, k], i) => ({
                    name, type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[i] }, data: file.indicatore[k].map((v) => +(100 * v).toFixed(2)) })),
                })} />
            </Card>
          </div>
        </>
      )}

      <Card title={`Effetto di ogni scenario su ${country.nome}`}>
        <p className="muted tiny">Stesse scelte del simulatore per ripartizione, depositi, sostituzione e credito: {describe(scenario, sim.cambioUsdPerEur).split(", ").slice(1).join(", ")}.</p>
        <DataTable csvName={`scenari_${country.code}.csv`} rows={effetti} initialSort={{ key: "importo", dir: 1 }} columns={[
          { key: "nome", label: "Scenario", value: (r) => r.nome },
          { key: "importo", label: "Importo nell'area (mld €)", numeric: true, value: (r) => r.importo, format: (r) => nf(r.importo, 1) },
          { key: "deflusso", label: "Deflusso (mld €)", numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 2) },
          { key: "persiVista", label: "Depositi a vista persi", numeric: true, value: (r) => r.persiVista, format: (r) => pct(r.persiVista, 2) },
          { key: "effettoPp", label: "Effetto sulla raccolta (punti)", numeric: true, value: (r) => r.effettoPp, format: (r) => nf(r.effettoPp, 2) },
          { key: "aumentoIngrosso", label: "Raccolta all'ingrosso in più", numeric: true, value: (r) => r.aumentoIngrosso, format: (r) => pct(r.aumentoIngrosso, 1) },
          { key: "credito", label: "Credito in meno (mld €)", numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 2) },
          { key: "creditoPct", label: "Credito in meno (% prestiti)", numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 2) + "%" },
        ]} />
        <Note>{CREDIT_NOTE}</Note>
      </Card>

      <Card title={`Quadrante ${country.quadrante}${quad ? ": " + quad.titolo.toLowerCase() : ""}`}>
        {quad && <p>{quad.implicazione}</p>}
        <p className="muted tiny">Quota retail dei depositi: {pct(country.quotaRetail)}{country.retailAlta ? ", sopra la soglia del 75° percentile" : ""}. Coefficiente della variante continua: peso {nf(country.pesoContinuo, 2)} tra basso e alto.</p>
        <a className="btn small" href={route.href("canali")}>Apri la mappa a due canali</a>
      </Card>
    </>
  );
}
