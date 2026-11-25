import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Loading, Note, Select } from "../components/ui";
import type { Monitor } from "../lib/types";
import { giorno, nf, pct, signed, useJson, useRoute } from "../lib/util";

const NOMI: Record<string, string> = { usdt: "USDT, tutti gli exchange", usdt_senza_coinbase: "USDT senza Coinbase", usdc: "USDC, tutti gli exchange", usdc_senza_coinbase: "USDC senza Coinbase" };
const PERIODI: [string, string][] = [["13", "Ultime 13 settimane"], ["26", "Ultime 26 settimane"], ["52", "Ultime 52 settimane"], ["tutto", "Tutto l'indice principale"], ["lungo", "Storico lungo dal 2023 (senza Kraken e Gemini)"]];
const TOKEN: [string, string][] = [["usdt", "USDT"], ["usdc", "USDC"], ["tutte", "Tutte e quattro le serie"]];

export function MonitorSettimanale() {
  const route = useRoute();
  const { data: m, error } = useJson<Monitor>("monitor.json");
  if (!m) return <Loading error={error} />;
  const tok = TOKEN.some(([k]) => k === route.params.get("tok")) ? route.params.get("tok")! : "usdt";
  const per = PERIODI.some(([k]) => k === route.params.get("per")) ? route.params.get("per")! : "52";
  const base = per === "lungo" ? m.lungo : m.principale;
  const n = base.settimane.length, from = per === "lungo" || per === "tutto" ? 0 : Math.max(0, n - Number(per));
  const weeks = base.settimane.slice(from);
  const keys = tok === "tutte" ? m.serie : [tok, `${tok}_senza_coinbase`];
  const vols = tok === "usdc" ? [["volEurUsdc", "USDC contro euro"]] : tok === "usdt" ? [["volEurUsdt", "USDT contro euro"]] : [["volEurUsdt", "USDT contro euro"], ["volEurUsdc", "USDC contro euro"]];
  const fonte = per === "lungo" ? "volumi giornalieri di 23 exchange (senza Kraken e Gemini)" : "volumi giornalieri di 25 exchange";
  const ultima = m.serie.map((s) => { const f = m.segnalazioni[s], i = f.settimane.length - 1; return { serie: s, quota: f.quota[i], volume: f.volumeEur[i], sq: f.scartoQuota[i], sv: f.scartoVolume[i], stato: f.stato[i] }; });
  const eventi = m.serie.flatMap((s) => m.segnalazioni[s].settimane.map((w, i) => ({ serie: s, settimana: w, stato: m.segnalazioni[s].stato[i], sq: m.segnalazioni[s].scartoQuota[i], sv: m.segnalazioni[s].scartoVolume[i] })))
    .filter((e) => e.stato === "segnale" || e.stato === "da verificare");
  const conteggio = (s: string, stato: string) => m.segnalazioni[s].stato.filter((x) => x === stato).length;
  return (
    <>
      <Card>
        <div className="controls">
          <Select id="tok" label="Serie" value={tok} options={TOKEN} onChange={(v) => route.setParams({ tok: v })} />
          <Select id="per" label="Periodo" value={per} options={PERIODI} onChange={(v) => route.setParams({ per: v })} />
        </div>
        <Note>{m.avvertenza} Ultima settimana: {giorno(m.dati_al.ultimaSettimana)}.{per === "lungo" ? " Lo storico lungo è confrontabile per direzione, non per livello, con l'indice principale." : ""}</Note>
        {m.fontiMancanti && m.fontiMancanti.coppie.length > 0 && (
          <Note>{m.fontiMancanti.exchange.join(", ")} non ha risposto all'ultimo scarico ({m.fontiMancanti.coppie.length} coppie, {pct(m.fontiMancanti.quotaVolume)} dei volumi).
            I suoi dati arrivano al {giorno(m.fontiMancanti.datiFinoAl)}: le settimane successive sono calcolate senza, e la quota EUR può risultare leggermente più bassa.</Note>
        )}
      </Card>

      <Card>
        <Chart title="Quota EUR dei volumi stablecoin/fiat" unit="percentuale dei volumi contro tutte le valute fiat, dati settimanali" source={fonte} height={340} deps={[tok, per, m]}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0, type: "scroll" }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "category", data: weeks, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", min: 0, ...axisStyle(p), axisLabel: pctLabel(p) },
            series: keys.map((k, i) => ({ name: NOMI[k], type: "line", symbol: "none", lineStyle: { width: 2 }, itemStyle: { color: p.series[i] }, data: (base[k] as number[]).slice(from).map((v) => +(100 * v).toFixed(2)) })),
          })} />
      </Card>
      <Card>
        <Chart title="Volumi contro euro in valore assoluto" unit="miliardi di unità di stablecoin (circa dollari) a settimana" source={fonte} height={280} deps={[tok, per, m]}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 }, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 2) + " mld" },
            xAxis: { type: "category", data: weeks, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", ...axisStyle(p) },
            series: vols.map(([k, name], i) => ({ name, type: "bar", stack: "v", itemStyle: { color: p.series[tok === "usdc" ? 2 : i === 0 ? 0 : 2] }, data: (base[k] as number[]).slice(from) })),
          })} />
        <Note>L'indice è una quota: si muove anche quando si muovono le altre valute. Prima di interpretare una variazione va guardato il volume contro euro.</Note>
      </Card>

      <div className="grid2">
        <Card title="Stato delle segnalazioni, ultima settimana">
          <div className="table-wrap"><table>
            <thead><tr><th>Serie</th><th className="num">Quota EUR</th><th className="num">Scarto quota</th><th className="num">Scarto volume</th><th>Stato</th></tr></thead>
            <tbody>{ultima.map((u) => (
              <tr key={u.serie}><td>{NOMI[u.serie]}</td><td className="num">{pct(u.quota)}</td><td className="num">{signed(u.sq, 1)}</td><td className="num">{signed(u.sv, 1)}</td><td className={`state ${u.stato}`}>{u.stato}</td></tr>))}
            </tbody></table></div>
          <p className="muted tiny">Regola: {m.regola}. "Da verificare" quando solo uno dei due scarti supera 2.</p>
          <Note>Test pre-registrato sul contenuto predittivo per i depositi a vista delle famiglie: esito "{m.testPredittivo.risposta}" (p = {nf(m.testPredittivo.pValue, 2)}, {m.testPredittivo.osservazioni} mesi). La segnalazione non anticipa i deflussi.</Note>
        </Card>
        <Card title="Storico delle segnalazioni">
          <div className="table-wrap"><table>
            <thead><tr><th>Serie</th><th className="num">Segnale</th><th className="num">Da verificare</th><th className="num">Nessuno</th></tr></thead>
            <tbody>{m.serie.map((s) => <tr key={s}><td>{NOMI[s]}</td><td className="num">{conteggio(s, "segnale")}</td><td className="num">{conteggio(s, "da verificare")}</td><td className="num">{conteggio(s, "nessuno")}</td></tr>)}</tbody>
          </table></div>
          {Object.keys(m.settimaneTrattenute).length > 0 && <p className="state">Settimane non pubblicate perché incomplete: {Object.keys(m.settimaneTrattenute).join(", ")}.</p>}
        </Card>
      </div>
      <Card title="Settimane segnalate">
        <DataTable csvName="segnalazioni.csv" rows={eventi} initialSort={{ key: "settimana", dir: -1 }} columns={[
          { key: "settimana", label: "Settimana", value: (r) => r.settimana }, { key: "serie", label: "Serie", value: (r) => NOMI[r.serie] },
          { key: "stato", label: "Stato", value: (r) => r.stato },
          { key: "sq", label: "Scarto della quota", numeric: true, value: (r) => r.sq, format: (r) => signed(r.sq, 1) },
          { key: "sv", label: "Scarto del volume", numeric: true, value: (r) => r.sv, format: (r) => signed(r.sv, 1) },
        ]} />
      </Card>
      <Card title="Dati dell'indice">
        <DataTable csvName={`indice_${per}.csv`} rows={weeks.map((w, i) => ({ w, i: from + i }))} initialSort={{ key: "w", dir: -1 }} columns={[
          { key: "w", label: "Settimana", value: (r) => r.w },
          ...m.serie.map((s) => ({ key: s, label: NOMI[s], numeric: true, value: (r: { i: number }) => (base[s] as number[])[r.i], format: (r: { i: number }) => pct((base[s] as number[])[r.i]) })),
          { key: "ve1", label: "USDT contro EUR (mld)", numeric: true, value: (r) => (base.volEurUsdt as number[])[r.i], format: (r) => nf((base.volEurUsdt as number[])[r.i], 2) },
          { key: "ve2", label: "USDC contro EUR (mld)", numeric: true, value: (r) => (base.volEurUsdc as number[])[r.i], format: (r) => nf((base.volEurUsdc as number[])[r.i], 2) },
        ]} />
      </Card>
    </>
  );
}
