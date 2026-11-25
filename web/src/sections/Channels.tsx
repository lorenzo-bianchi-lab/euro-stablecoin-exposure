import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Loading, Note } from "../components/ui";
import { country, month, nf, pct, quarter, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData, Channels as ChannelsFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { useResults } from "./shared";

export default function Channels({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { data: ch, error } = useJson<ChannelsFile>("canali.json");
  const { rows } = useResults(sim, scenario);
  const sel = route.params.get("q");
  if (!ch) return <Loading error={error} />;
  const pts = sim.paesi.map((c, i) => ({ ...c, r: rows[i] }));
  const open = (code: string) => { window.location.hash = route.href(`country/${code}`); };
  return (
    <>
      <Card>
        <Chart title={t("ch.chart.title")} unit={t("ch.chart.unit")} source={t("ch.chart.src", { m: month(ch.dati_al.bilanci), q: quarter(ch.dati_al.dollari) })} height={460} deps={[sel, rows]}
          onClick={(p) => { const d = p.data as { code?: string } | undefined; if (d?.code) open(d.code); }}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 },
            tooltip: { ...tooltipStyle(p), trigger: "item", formatter: (x: { data: { code: string; value: number[]; q: string; fonte: string; cr: number } }) =>
              t("ch.tip", { c: country(x.data.code), q: x.data.q, x: nf(x.data.value[0], 1), y: nf(x.data.value[1], 1), s: t(`usdSource.${x.data.fonte}`), cr: nf(x.data.cr, 2) }) },
            xAxis: { type: "value", name: t("ch.axis.x"), nameLocation: "middle", nameGap: 26, ...axisStyle(p), axisLabel: pctLabel(p) },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: (["BRI", "BSI"] as const).map((fonte, k) => ({
              name: t("ch.legend", { s: t(`usdSource.${fonte}`) }), type: "scatter", symbol: k === 0 ? "circle" : "rect", symbolSize: 13,
              itemStyle: { color: p.series[k], borderColor: p.panel, borderWidth: 1.5 },
              label: { show: true, formatter: (x: { data: { code: string } }) => x.data.code, position: "right", color: p.ink2, fontSize: 10 }, labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
              data: pts.filter((c) => c.fonteUsd === fonte).map((c) => ({ value: [+(100 * c.c1).toFixed(2), +(100 * c.usd).toFixed(2)], code: c.code, q: c.quadrante, fonte: c.fonteUsd, cr: c.r.creditoPct,
                itemStyle: sel && sel !== c.quadrante ? { opacity: 0.25 } : undefined })),
              markLine: k === 0 ? { silent: true, symbol: "none", lineStyle: { color: p.ink2, type: "dashed" }, label: { show: false },
                data: [{ xAxis: +(100 * ch.mediane.c1).toFixed(2) }, { yAxis: +(100 * ch.mediane.usd).toFixed(2) }] } : undefined,
            })),
          })} />
        <Note id="note.channels" vars={{ r: pct(ch.confrontoFonti.rapporto_mediano_bsi_su_bri, 0), list: ch.cambianoConRiscalatura.map(country).join(t("fmt.and")) }} />
      </Card>

      <Card title={t("ch.quadrants")}>
        <p className="muted tiny">{t("ch.quadrants.help", { r: nf(ch.correlazioneDiRango, 2) })}</p>
        <div className="grid2" style={{ marginBottom: 0 }}>
          {ch.quadranti.map((q) => (
            <button key={q} className={`quad ${sel === q ? "active" : ""}`} onClick={() => route.setParams({ q: sel === q ? null : q })} aria-pressed={sel === q}>
              <strong>{q} · {t(`quad.${q}.title`)}</strong> <span className="tag">{t(`quad.${q}.channel`)}</span>
              <p className="tiny" style={{ margin: "6px 0" }}>{pts.filter((c) => c.quadrante === q).sort((a, b) => b.c1 - a.c1).map((c) => country(c.code)).join(", ") || t("ch.noCountry")}</p>
              <p className="tiny muted" style={{ margin: 0 }}>{t(`quad.${q}.text`)}</p>
            </button>))}
        </div>
      </Card>

      <Card title={t("ch.countries")}>
        <DataTable csvName="two_channel_map.csv" rows={pts} initialSort={{ key: "c1", dir: -1 }} onRow={(r) => open(r.code)} columns={[
          { key: "nome", label: t("col.country"), value: (r) => country(r.code) }, { key: "q", label: t("col.quadrant"), value: (r) => r.quadrante },
          { key: "c1", label: t("col.sightOnLiab"), numeric: true, value: (r) => r.c1, format: (r) => pct(r.c1) },
          { key: "usd", label: t("col.usdLiab"), numeric: true, value: (r) => r.usd, format: (r) => pct(r.usd) },
          { key: "fonte", label: t("col.usdSource"), value: (r) => t(`usdSource.${r.fonteUsd}`) },
          { key: "retail", label: t("col.retailShare"), numeric: true, value: (r) => r.quotaRetail, format: (r) => pct(r.quotaRetail) },
          { key: "cr", label: t("col.creditScenario"), numeric: true, value: (r) => r.r.creditoPct, format: (r) => nf(r.r.creditoPct, 2) + "%" },
        ]} />
      </Card>
    </>
  );
}
