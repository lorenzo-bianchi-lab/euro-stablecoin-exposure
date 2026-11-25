import { Chart, pctLabel, axisStyle, grid, tooltipStyle } from "../components/Chart";
import { Card, Kpi, Note } from "../components/ui";
import type { AppData } from "../lib/types";
import { giorno, mese, nf, pct, signed, useRoute } from "../lib/util";
import { CREDIT_NOTE } from "./shared";

const SERIE: [string, string][] = [["usdt", "USDT"], ["usdt_senza_coinbase", "USDT senza Coinbase"], ["usdc", "USDC"], ["usdc_senza_coinbase", "USDC senza Coinbase"]];

export function Panoramica({ data }: { data: AppData }) {
  const { overview: o, meta, sim } = data;
  const route = useRoute();
  const attive = SERIE.filter(([k]) => ["segnale", "da verificare"].includes(o.indice[k]?.stato ?? ""));
  const top = [...o.classifica].sort((a, b) => a.posizione - b.posizione);
  return (
    <>
      <Card title="Indicatori chiave">
        <div className="kpis">
          <Kpi label="Stablecoin in dollari detenute nell'area euro" value={`${nf(o.livello.centrale, 1)} mld €`} range={`intervallo ${nf(o.livello.minimo, 1)} - ${nf(o.livello.massimo, 1)}`} sub={`estremo superiore dichiarato ${nf(o.livello.estremoSuperiore, 1)}`} />
          <Kpi label="Confronto: ipotesi ESM" value={`${nf(o.livello.esmBase, 1)} mld €`} sub={`con quota 15%: ${nf(o.livello.esmAlto, 1)}`} />
          <Kpi label="Depositi da sostituire al livello centrale" value={`${nf(o.scenarioCentrale.deflusso, 1)} mld €`} sub={`${pct(o.scenarioCentrale.depositiAVistaPersi, 2)} dei depositi a vista dell'area`} />
          <Kpi label="Credito in meno, 24 mesi" value={`${nf(o.scenarioCentrale.creditoUniforme, 1)} mld €`} range={`da ${nf(o.scenarioCentrale.creditoBasso, 1)} a ${nf(o.scenarioCentrale.creditoAlto, 1)}`} sub={`${nf(o.scenarioCentrale.creditoPct, 2)}% dei prestiti`} />
        </div>
        <Note>Il livello è una stima da un'indagine BCE su 11 paesi, estesa a 21 con ipotesi dichiarate: non è una misura. {CREDIT_NOTE}</Note>
        <p><a className="btn small" href={route.href("simulatore")}>Apri il simulatore</a> <a className="btn small" href={route.href("livello")}>Come è stimato il livello</a></p>
      </Card>

      <div className="grid2">
        <Card title="Segnalazioni attive">
          {attive.length === 0 ? <p>Nessuna segnalazione sull'indice settimanale.</p> : (
            <ul className="plain">{attive.map(([k, l]) => (
              <li key={k}><span className={`state ${o.indice[k].stato}`}>{l}: {o.indice[k].stato}</span>. Scarto della quota {signed(o.indice[k].scarto_quota, 1)}, del volume {signed(o.indice[k].scarto_volume, 1)}.</li>))}
            </ul>)}
          {meta.fontiNonAggiornate.length > 0 && <p className="state">Fonti non aggiornate: {meta.fontiNonAggiornate.join("; ")}.</p>}
          <div className="table-wrap"><table>
            <thead><tr><th>Serie</th><th className="num">Quota EUR</th><th className="num">Variazione</th><th>Stato</th></tr></thead>
            <tbody>{SERIE.map(([k, l]) => (
              <tr key={k}><td>{l}</td><td className="num">{pct(o.indice[k].valore)}</td><td className="num">{signed(o.indice[k].variazione, 1)}</td><td>{o.indice[k].stato ?? "n.d."}</td></tr>))}
            </tbody></table></div>
          <Note>La segnalazione marca valori insoliti dell'indice. Il test pre-registrato sul contenuto predittivo per i depositi ha dato esito "{o.testPredittivo}": non è un segnale anticipatore.</Note>
          <a className="btn small" href={route.href("monitor")}>Apri il monitor settimanale</a>
        </Card>
        <Card title="Data dei dati">
          <div className="table-wrap"><table><tbody>
            <tr><td>Bilanci bancari</td><td>{mese(o.dati_al.bilanci)}</td></tr>
            <tr><td>Indice settimanale</td><td>settimana del {giorno(o.dati_al.settimana)}</td></tr>
            <tr><td>Circolazione di USDT e USDC</td><td>{giorno(o.dati_al.circolazione)}</td></tr>
            <tr><td>Cambio di riferimento BCE</td><td>{giorno(sim.dataCambio)}: {nf(sim.cambioUsdPerEur, 4)} $ per €</td></tr>
            <tr><td>Ultimo aggiornamento</td><td>{giorno(meta.aggiornamento.eseguitoIl ?? meta.generato_il)}</td></tr>
          </tbody></table></div>
          <a className="btn small" href={route.href("metodo")}>Fonti e stato dell'aggiornamento</a>
        </Card>
      </div>

      <Card title="Dove la raccolta è più esposta">
        <Chart title="Depositi a vista di famiglie e imprese sul totale del passivo" unit="percentuale, paesi in ordine di classifica" source={`BCE, bilanci bancari (BSI), ${mese(o.dati_al.bilanci)}`} height={300}
          onClick={(p) => { const c = top.find((x) => x.nome === p.name); if (c) window.location.hash = route.href(`paese/${c.code}`); }}
          option={(p) => ({
            grid: grid({ bottom: 4 }), tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "category", data: top.map((c) => c.nome), ...axisStyle(p), axisLabel: { color: p.ink2, fontSize: 10, rotate: 55, interval: 0 }, splitLine: { show: false } },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: [{ type: "bar", data: top.map((c) => +(100 * c.c1).toFixed(2)), itemStyle: { color: p.series[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 }],
          })} />
        <Note>La classifica ordina la struttura della raccolta, non la probabilità che i depositi escano. Clic su un paese per aprire la scheda.</Note>
      </Card>
    </>
  );
}
