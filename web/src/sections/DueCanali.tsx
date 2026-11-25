import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Loading, Note } from "../components/ui";
import type { Scenario } from "../lib/model";
import type { AppData, Channels } from "../lib/types";
import { mese, nf, pct, useJson, useRoute } from "../lib/util";
import { useResults } from "./shared";

export function DueCanali({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { data: ch, error } = useJson<Channels>("canali.json");
  const { rows } = useResults(sim, scenario);
  const sel = route.params.get("q");
  if (!ch) return <Loading error={error} />;
  const pts = sim.paesi.map((c, i) => ({ ...c, r: rows[i] }));
  const open = (code: string) => { window.location.hash = route.href(`paese/${code}`); };
  return (
    <>
      <Card>
        <Chart title="Depositi a vista e raccolta in dollari" unit="orizzontale: depositi a vista sul passivo (%); verticale: passività in dollari sul passivo (%)"
          source={`BCE (BSI), ${mese(ch.dati_al.bilanci)}; BRI e BSI trimestrale, ${ch.dati_al.dollari}`} height={460} deps={[sel, rows]}
          onClick={(p) => { const d = p.data as { code?: string } | undefined; if (d?.code) open(d.code); }}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 },
            tooltip: { ...tooltipStyle(p), trigger: "item", formatter: (x: { data: { nome: string; value: number[]; q: string; fonte: string; cr: number } }) =>
              `<b>${x.data.nome}</b> · quadrante ${x.data.q}<br>Depositi a vista: ${nf(x.data.value[0], 1)}%<br>Passività in dollari: ${nf(x.data.value[1], 1)}% (${x.data.fonte})<br>Nello scenario: credito in meno ${nf(x.data.cr, 2)}% dei prestiti` },
            xAxis: { type: "value", name: "Depositi a vista sul passivo", nameLocation: "middle", nameGap: 26, ...axisStyle(p), axisLabel: pctLabel(p) },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: (["BRI", "BSI trimestrale"] as const).map((fonte, k) => ({
              name: `dollari: fonte ${fonte}`, type: "scatter", symbol: k === 0 ? "circle" : "rect", symbolSize: 13,
              itemStyle: { color: p.series[k], borderColor: p.panel, borderWidth: 1.5 },
              label: { show: true, formatter: (x: { data: { code: string } }) => x.data.code, position: "right", color: p.ink2, fontSize: 10 }, labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
              data: pts.filter((c) => c.fonteUsd === fonte).map((c) => ({ value: [+(100 * c.c1).toFixed(2), +(100 * c.usd).toFixed(2)], code: c.code, nome: c.nome, q: c.quadrante, fonte: c.fonteUsd, cr: c.r.creditoPct,
                itemStyle: sel && sel !== c.quadrante ? { opacity: 0.25 } : undefined })),
              markLine: k === 0 ? { silent: true, symbol: "none", lineStyle: { color: p.ink2, type: "dashed" }, label: { show: false },
                data: [{ xAxis: +(100 * ch.mediane.c1).toFixed(2) }, { yAxis: +(100 * ch.mediane.usd).toFixed(2) }] } : undefined,
            })),
          })} />
        <Note>{ch.avvertenza} Le linee tratteggiate sono le mediane dei 21 paesi. Per otto paesi la misura in dollari viene dal BSI trimestrale, che in mediana vale il {pct(ch.confrontoFonti.rapporto_mediano_bsi_su_bri, 0)} di quella BRI: riportandola alla stessa scala cambierebbero quadrante {ch.cambianoConRiscalatura.map((c) => sim.paesi.find((x) => x.code === c)?.nome).join(" e ")}.</Note>
      </Card>

      <Card title="I quattro quadranti">
        <p className="muted tiny">Seleziona un quadrante per evidenziarlo nel grafico. Correlazione di rango tra i due assi: {nf(ch.correlazioneDiRango, 2)}: chi è esposto su un canale tende a non esserlo sull'altro.</p>
        <div className="grid2" style={{ marginBottom: 0 }}>
          {ch.quadranti.map((q) => (
            <button key={q.id} className={`quad ${sel === q.id ? "active" : ""}`} onClick={() => route.setParams({ q: sel === q.id ? null : q.id })} aria-pressed={sel === q.id}>
              <strong>{q.id} · {q.titolo}</strong> <span className="tag">{q.canale}</span>
              <p className="tiny" style={{ margin: "6px 0" }}>{pts.filter((c) => c.quadrante === q.id).sort((a, b) => b.c1 - a.c1).map((c) => c.nome).join(", ") || "nessun paese"}</p>
              <p className="tiny muted" style={{ margin: 0 }}>{q.implicazione}</p>
            </button>))}
        </div>
      </Card>

      <Card title="Paesi">
        <DataTable csvName="mappa_due_canali.csv" rows={pts} initialSort={{ key: "c1", dir: -1 }} onRow={(r) => open(r.code)} columns={[
          { key: "nome", label: "Paese", value: (r) => r.nome }, { key: "q", label: "Quadrante", value: (r) => r.quadrante },
          { key: "c1", label: "Depositi a vista sul passivo", numeric: true, value: (r) => r.c1, format: (r) => pct(r.c1) },
          { key: "usd", label: "Passività in dollari", numeric: true, value: (r) => r.usd, format: (r) => pct(r.usd) },
          { key: "fonte", label: "Fonte dei dollari", value: (r) => r.fonteUsd },
          { key: "retail", label: "Quota retail", numeric: true, value: (r) => r.quotaRetail, format: (r) => pct(r.quotaRetail) },
          { key: "cr", label: "Credito in meno nello scenario (% prestiti)", numeric: true, value: (r) => r.r.creditoPct, format: (r) => nf(r.r.creditoPct, 2) + "%" },
        ]} />
      </Card>
    </>
  );
}
