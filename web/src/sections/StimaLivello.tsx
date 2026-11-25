import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, Kpi, Loading, Note, Select, Slider } from "../components/ui";
import { levelEstimate, type LevelCase } from "../lib/model";
import type { AppData, LevelFile } from "../lib/types";
import { giorno, nf, pct, useJson, useRoute } from "../lib/util";

export function StimaLivello({ data }: { data: AppData }) {
  const route = useRoute();
  const { data: lv, error } = useJson<LevelFile>("livello.json");
  if (!lv) return <Loading error={error} />;
  const g = (k: string) => route.params.get(k);
  const clamp = (v: string | null, d: number, lo: number, hi: number) => { const x = v === null ? NaN : Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const unita = g("uni") === "individui" ? "individui" : "famiglie";
  const caso: LevelCase = g("caso") === "minimo" || g("caso") === "massimo" ? (g("caso") as LevelCase) : "centrale";
  const ultima = clamp(g("ult"), lv.fasce[lv.fasce.length - 1][caso], 10000, 50000);
  const usd = clamp(g("usd"), +(100 * lv.quotaDollari[caso]).toFixed(1), 40, 100) / 100;
  const det = clamp(g("det"), 100 * lv.quotaDetentori, 1, 10) / 100;
  const stima = levelEstimate(lv.fasce, lv.unita[unita], det, usd, caso, ultima);
  const r = lv.riferimento;
  const confronto: [string, number][] = [["Stima con le ipotesi scelte", stima], ["Riferimento, minimo", r.minimo_mld_eur], ["Riferimento, centro", r.centrale_mld_eur],
    ["Riferimento, massimo", r.massimo_mld_eur], ["Estremo superiore (individui)", r.estremo_superiore_dichiarato_mld_eur], ["Ipotesi ESM, quota 7,5%", lv.esm.baseEur], ["Ipotesi ESM, quota 15%", lv.esm.altoEur]];
  const tot = lv.fasce.reduce((a, b) => a + b.percentuale, 0);
  return (
    <>
      <Card title="Stima dal basso">
        <div className="kpis">
          <Kpi label="Con le ipotesi scelte" value={`${nf(stima, 1)} mld €`} sub={`${nf(lv.unita[unita] * det / 1e6, 1)} milioni di ${unita === "famiglie" ? "famiglie" : "persone"} detentrici`} />
          <Kpi label="Livello di riferimento del programma" value={`${nf(r.centrale_mld_eur, 1)} mld €`} range={`intervallo ${nf(r.minimo_mld_eur, 1)} - ${nf(r.massimo_mld_eur, 1)}`} sub={`estremo superiore dichiarato ${nf(r.estremo_superiore_dichiarato_mld_eur, 1)}`} />
          <Kpi label="Confronto: ipotesi ESM" value={`${nf(lv.esm.baseEur, 1)} mld €`} sub={`quota 15%: ${nf(lv.esm.altoEur, 1)}; circolazione del ${giorno(lv.esm.data)}`} />
        </div>
        <Note>{lv.avvertenza} La formula: unità × quota di detentori × importo medio × quota in dollari.</Note>
        <a className="btn small" href={route.href("simulatore", { imp: Number(stima.toFixed(2)) })}>Usa questa stima nel simulatore</a>
      </Card>

      <Card title="Ipotesi modificabili">
        <div className="controls">
          <Select id="uni" label="Unità" value={unita} options={[["famiglie", `Famiglie (${nf(lv.unita.famiglie / 1e6, 1)} milioni)`], ["individui", `Individui di 18 anni o più (${nf(lv.unita.individui / 1e6, 1)} milioni)`]]} onChange={(v) => route.setParams({ uni: v })} />
          <Select id="caso" label="Importo di ogni fascia" value={caso} options={[["minimo", "Estremo inferiore"], ["centrale", "Punto medio"], ["massimo", "Estremo superiore"]]} onChange={(v) => route.setParams({ caso: v, ult: null, usd: null })} />
          <Slider id="ult" label="Importo medio dell'ultima fascia (10.000 € o più)" value={ultima} min={10000} max={50000} step={1000} onChange={(v) => route.setParams({ ult: v })} display={`${nf(ultima, 0)} €`} />
          <Slider id="usd" label="Quota in dollari delle stablecoin detenute" value={Math.round(usd * 100)} min={40} max={100} step={1} onChange={(v) => route.setParams({ usd: v })} display={pct(usd, 0)} />
          <Slider id="det" label="Quota che detiene stablecoin" value={+(det * 100).toFixed(1)} min={1} max={10} step={0.5} onChange={(v) => route.setParams({ det: v })} display={pct(det, 1)} />
        </div>
        <Note>La domanda dell'indagine riguarda "lei o un membro della sua famiglia": la variante famiglie è quella coerente. La variante individui conta più volte la stessa famiglia ed è riportata come estremo superiore. La quota in dollari viene da quote di persone, usate come quote di valore.</Note>
      </Card>

      <div className="grid2">
        <Card>
          <Chart title="Detentori di stablecoin per fascia di importo" unit="percentuale dei detentori" source={`BCE, Bollettino economico 7/2026, grafico B riquadro b (${lv.dati_al.indagine}); valori misurati sull'immagine`} height={320} deps={[lv]}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
              xAxis: { type: "category", data: lv.fasce.map((f) => f.fascia), ...axisStyle(p), axisLabel: { color: p.ink2, fontSize: 10, rotate: 40, interval: 0 }, splitLine: { show: false } },
              yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
              series: [{ type: "bar", data: lv.fasce.map((f) => +(100 * f.percentuale / tot).toFixed(2)), itemStyle: { color: p.series[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 28 }],
            })} />
          <Note>La BCE non pubblica i dati del grafico: le percentuali sono misurate sull'immagine, con un errore di circa 0,1 punti. L'ultima fascia è aperta e vale circa metà del totale.</Note>
        </Card>
        <Card>
          <Chart title="Confronto tra stime" unit="miliardi di euro" source="calcolo su indagine BCE (CES) ed Eurostat; ESM Working Paper 79; DefiLlama" height={320} deps={[stima, lv]}
            option={(p) => ({
              grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 1) + " mld €" },
              xAxis: { type: "value", ...axisStyle(p) },
              yAxis: { type: "category", inverse: true, data: confronto.map((c) => c[0]), ...axisStyle(p), splitLine: { show: false } },
              series: [{ type: "bar", barMaxWidth: 16, data: confronto.map(([, v], i) => ({ value: +v.toFixed(2), itemStyle: { color: i === 0 ? p.series[1] : i >= 5 ? p.ink2 : p.series[0], borderRadius: [0, 4, 4, 0] } })) }],
            })} />
        </Card>
      </div>

      <Card>
        <Chart title="Ipotesi ESM nel tempo e livello di riferimento" unit="miliardi di euro, fine mese" source="DefiLlama (circolazione di USDT e USDC) × quote ESM; cambio BCE" height={300} deps={[lv]}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + " mld €" },
            xAxis: { type: "category", data: lv.esm.serie.mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", min: 0, ...axisStyle(p) },
            series: [
              { name: "ESM, quota 7,5%", type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[0] }, data: lv.esm.serie.base,
                markArea: { silent: true, itemStyle: { color: p.soft, opacity: 0.6 }, data: [[{ yAxis: +r.minimo_mld_eur.toFixed(2), name: "stima propria" }, { yAxis: +r.massimo_mld_eur.toFixed(2) }]], label: { color: p.ink2, fontSize: 10, position: "insideTopLeft" } } },
              { name: "ESM, quota 15%", type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[1] }, data: lv.esm.serie.alto },
            ],
          })} />
        <Note>La serie ESM replica la circolazione mondiale e il cambio: la quota è costante, quindi non contiene informazione sull'area euro in sé. La fascia colorata è l'intervallo della stima propria, che si riferisce a novembre 2025.</Note>
      </Card>

      <Card title="Le altre strade tentate">
        <ul className="plain">
          <li><strong>Riserve dei clienti degli exchange: {lv.altreStrade.b2.esito}.</strong> {lv.altreStrade.b2.motivo} I saldi letti valgono {nf(lv.altreStrade.b2.saldiClientiMldUsd, 1)} miliardi di dollari per tutti i clienti nel mondo.</li>
          <li><strong>Dati nazionali: {nf(lv.altreStrade.b3.centrale, 1)} miliardi di euro.</strong> Misurano solo le cripto-attività presso prestatori registrati nel paese; restano fuori exchange esteri e portafogli propri. {lv.altreStrade.b3.ipotesi}.</li>
        </ul>
        <Note>{lv.criterio.nota} Esito del criterio originale: "{lv.criterio.esito}".</Note>
        <p className="muted tiny">Sostituzione dei depositi a vista dell'area al livello centrale: {pct(data.overview.scenarioCentrale.depositiAVistaPersi, 2)}.</p>
      </Card>
    </>
  );
}
