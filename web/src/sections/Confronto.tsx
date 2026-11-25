import { useEffect } from "react";
import { Card, DataTable, Note, ScenarioControls } from "../components/ui";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { downloadCsv, giorno, mese, nf, pct, readScenario, useRoute } from "../lib/util";
import { CREDIT_NOTE, FLOW_NOTE, describe, resultColumns, useResults } from "./shared";

export function Confronto({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim, meta } = data;
  const route = useRoute();
  const b = readScenario(route.params, Number(sim.livello.massimo.toFixed(2)), "b_");
  const A = useResults(sim, scenario), B = useResults(sim, b);
  useEffect(() => { const off = () => document.body.classList.remove("print-report"); window.addEventListener("afterprint", off); return () => window.removeEventListener("afterprint", off); }, []);
  const righe: [string, number, number, (v: number) => string][] = [
    ["Depositi da sostituire (mld €)", A.tot.deflusso, B.tot.deflusso, (v) => nf(v, 1)],
    ["Depositi a vista persi", A.tot.persiVista, B.tot.persiVista, (v) => pct(v, 2)],
    ["Effetto sulla raccolta (punti del passivo)", A.tot.effettoPp, B.tot.effettoPp, (v) => nf(v, 2)],
    ["Raccolta all'ingrosso in più", A.tot.aumentoIngrosso, B.tot.aumentoIngrosso, (v) => pct(v, 2)],
    ["Credito in meno (mld €)", A.tot.credito, B.tot.credito, (v) => nf(v, 1)],
    ["Credito in meno (% dei prestiti)", A.tot.creditoPct, B.tot.creditoPct, (v) => nf(v, 2) + "%"],
    ["Credito, coefficiente basso (mld €)", A.tot.creditoBasso, B.tot.creditoBasso, (v) => nf(v, 1)],
    ["Credito, coefficiente alto (mld €)", A.tot.creditoAlto, B.tot.creditoAlto, (v) => nf(v, 1)],
  ];
  const paesi = A.rows.map((r, i) => ({ nome: r.nome, a: r, b: B.rows[i] }));
  return (
    <>
      <div className="grid2 no-print">
        <Card title="Scenario A (quello del simulatore)"><ScenarioControls scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} compact /></Card>
        <Card title="Scenario B"><ScenarioControls scenario={b} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} prefix="b_" compact /></Card>
      </div>

      <Card title="Area euro: A e B affiancati" actions={<button className="btn small no-print" onClick={() => downloadCsv("confronto_area_euro.csv", ["Grandezza", "Scenario A", "Scenario B", "Differenza B - A"], righe.map(([l, a, bb]) => [l, a, bb, bb - a]))}>Scarica CSV</button>}>
        <div className="table-wrap"><table>
          <thead><tr><th>Grandezza</th><th className="num">Scenario A</th><th className="num">Scenario B</th><th className="num">B rispetto ad A</th></tr></thead>
          <tbody>{righe.map(([l, a, bb, f]) => <tr key={l}><td>{l}</td><td className="num">{f(a)}</td><td className="num">{f(bb)}</td><td className="num">{a ? `${bb >= a ? "+" : ""}${nf(100 * (bb / a - 1), 0)}%` : "n.d."}</td></tr>)}</tbody>
        </table></div>
        <p className="muted tiny">A: {describe(scenario, sim.cambioUsdPerEur)}.<br />B: {describe(b, sim.cambioUsdPerEur)}.</p>
        <Note>{FLOW_NOTE} {CREDIT_NOTE}</Note>
      </Card>

      <Card title="Per paese: A e B affiancati">
        <DataTable csvName="confronto_per_paese.csv" rows={paesi} initialSort={{ key: "ea", dir: -1 }} columns={[
          { key: "nome", label: "Paese", value: (r) => r.nome },
          { key: "da", label: "Deflusso A (mld €)", numeric: true, value: (r) => r.a.deflusso, format: (r) => nf(r.a.deflusso, 2) },
          { key: "db", label: "Deflusso B (mld €)", numeric: true, value: (r) => r.b.deflusso, format: (r) => nf(r.b.deflusso, 2) },
          { key: "ea", label: "Effetto A (punti)", numeric: true, value: (r) => r.a.effettoPp, format: (r) => nf(r.a.effettoPp, 2) },
          { key: "eb", label: "Effetto B (punti)", numeric: true, value: (r) => r.b.effettoPp, format: (r) => nf(r.b.effettoPp, 2) },
          { key: "ca", label: "Credito A (% prestiti)", numeric: true, value: (r) => r.a.creditoPct, format: (r) => nf(r.a.creditoPct, 2) + "%" },
          { key: "cb", label: "Credito B (% prestiti)", numeric: true, value: (r) => r.b.creditoPct, format: (r) => nf(r.b.creditoPct, 2) + "%" },
          { key: "ia", label: "Ingrosso A", numeric: true, value: (r) => r.a.aumentoIngrosso, format: (r) => pct(r.a.aumentoIngrosso, 1) },
          { key: "ib", label: "Ingrosso B", numeric: true, value: (r) => r.b.aumentoIngrosso, format: (r) => pct(r.b.aumentoIngrosso, 1) },
        ]} />
      </Card>

      <section className="card report">
        <header className="card-head"><h2>Rapporto dello scenario A</h2>
          <button className="btn small no-print" onClick={() => { document.body.classList.add("print-report"); window.print(); }}>Stampa o salva in PDF</button></header>
        <p><strong>Stablecoin in dollari e banche dell'area euro.</strong> Rapporto generato il {giorno(new Date().toISOString())}. Bilanci di {mese(sim.meseBilanci)}; dati aggiornati il {giorno(meta.aggiornamento.eseguitoIl ?? meta.generato_il)}.</p>
        <p><strong>Scenario:</strong> {describe(scenario, sim.cambioUsdPerEur)}.</p>
        <div className="table-wrap"><table><tbody>
          <tr><td>Depositi da sostituire</td><td className="num">{nf(A.tot.deflusso, 1)} mld € (fascia {nf(A.band.deflusso[0], 1)} - {nf(A.band.deflusso[1], 1)})</td></tr>
          <tr><td>Depositi a vista persi</td><td className="num">{pct(A.tot.persiVista, 2)} (fascia {pct(A.band.persiVista[0], 2)} - {pct(A.band.persiVista[1], 2)})</td></tr>
          <tr><td>Effetto sulla raccolta</td><td className="num">{nf(A.tot.effettoPp, 2)} punti del passivo</td></tr>
          <tr><td>Raccolta all'ingrosso in più</td><td className="num">{pct(A.tot.aumentoIngrosso, 2)}</td></tr>
          <tr><td>Credito in meno, 24 mesi</td><td className="num">{nf(A.tot.credito, 1)} mld €, {nf(A.tot.creditoPct, 2)}% dei prestiti (fascia {nf(A.band.credito[0], 1)} - {nf(A.band.credito[1], 1)})</td></tr>
        </tbody></table></div>
        <h3>Per paese</h3>
        <div className="table-wrap"><table>
          <thead><tr>{resultColumns(sim).slice(0, 7).map((c) => <th key={c.key} className={c.numeric ? "num" : ""}>{c.label}</th>)}</tr></thead>
          <tbody>{[...A.rows].sort((x, y) => y.effettoPp - x.effettoPp).map((r) => <tr key={r.code}>{resultColumns(sim).slice(0, 7).map((c) => <td key={c.key} className={c.numeric ? "num" : ""}>{c.format ? c.format(r) : c.value(r)}</td>)}</tr>)}</tbody>
        </table></div>
        <h3>Come leggere questi numeri</h3>
        <ul className="plain">
          <li>La fascia combina l'intervallo della stima del livello, una sostituzione dal 50% al 100% e, per il credito, i coefficienti basso e alto. Non è un intervallo di confidenza.</li>
          <li>{FLOW_NOTE}</li>
          <li>{CREDIT_NOTE}</li>
          <li>Fonti: BCE (bilanci bancari, indagine sui consumatori, Working Paper 3199), ESM Working Paper 79, Eurostat. Metodo e limiti: {route.href("metodo").replace("#", "sezione ")}.</li>
        </ul>
      </section>
    </>
  );
}
