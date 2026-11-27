import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Hero, Kpi, Loading, Note } from "../components/ui";
import { country, listing, month, nf, pct, quarter, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData, Channels as ChannelsFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { useResults } from "./shared";

/** The quadrants in the order they appear in the chart: C (dollars) and B at the top, D and A (deposits) at the bottom. */
const LAYOUT = ["C", "B", "D", "A"] as const;
/** Corner of the chart where the name of each quadrant is written, chosen where there are no points. */
const CORNER: Record<string, string> = { C: "insideTopRight", B: "insideTopRight", D: "insideBottomLeft", A: "insideTopRight" };

export default function Channels({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const { data: ch, error } = useJson<ChannelsFile>("channels.json");
  const { rows } = useResults(sim, scenario);
  const sel = route.params.get("q");
  if (!ch) return <Loading error={error} />;
  const pts = sim.paesi.map((c, i) => ({ ...c, r: rows[i] }));
  const open = (code: string) => {
    window.location.hash = route.href(`country/${code}`);
  };
  const inQuad = (q: string) => pts.filter((c) => c.quadrante === q).sort((a, b) => b.c1 - a.c1);
  const count = (q: string) => inQuad(q).length;
  const r = ch.correlazioneDiRango;
  const mx = 100 * ch.mediane.c1,
    my = 100 * ch.mediane.usd;
  // axes: a margin on the right leaves room for the quadrant names without covering the points
  const xMax = Math.ceil((100 * Math.max(...pts.map((c) => c.c1)) + 8) / 10) * 10;
  const yMax = Math.ceil((100 * Math.max(...pts.map((c) => c.usd)) + 1) / 5) * 5;
  const box: Record<string, [[number, number], [number, number]]> = {
    A: [
      [mx, 0],
      [xMax, my],
    ],
    B: [
      [mx, my],
      [xMax, yMax],
    ],
    C: [
      [0, my],
      [mx, yMax],
    ],
    D: [
      [0, 0],
      [mx, my],
    ],
  };
  const byC1 = [...pts].sort((a, b) => b.c1 - a.c1),
    byUsd = [...pts].sort((a, b) => b.usd - a.usd);
  const relation = r <= -0.3 ? "neg" : r >= 0.3 ? "pos" : "none";
  const alt = t("ch.alt", {
    n: pts.length,
    xHi: country(byC1[0].code),
    xHiV: pct(byC1[0].c1),
    xLo: country(byC1[byC1.length - 1].code),
    xLoV: pct(byC1[byC1.length - 1].c1),
    yHi: country(byUsd[0].code),
    yHiV: pct(byUsd[0].usd),
    r: nf(r, 2),
  });

  return (
    <>
      <Hero
        label={t("ch.hero.label")}
        value={nf(r, 2)}
        range={t("ch.hero.range", { n: pts.length, one: count("A") + count("C"), both: count("B"), none: count("D") })}
        text={t(`ch.hero.text.${relation}`, { a: count("A"), c: count("C") })}
      >
        <div className="hero-label" style={{ marginBottom: "var(--space-3)" }}>
          {t("ch.hero.side")}
        </div>
        <div className="kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", marginBottom: 0 }}>
          {LAYOUT.map((q) => (
            <Kpi key={q} label={`${q} · ${t(`quad.${q}.title`)}`} value={nf(count(q), 0)} sub={t(`quad.${q}.channel`)} />
          ))}
        </div>
      </Hero>

      <Card>
        <Chart
          title={t("ch.chart.title")}
          unit={t("ch.chart.unit")}
          source={t("ch.chart.src", { m: month(ch.dati_al.bilanci), q: quarter(ch.dati_al.dollari) })}
          height={480}
          deps={[sel, rows, ch]}
          alt={alt}
          onClick={(p) => {
            const d = p.data as { code?: string } | undefined;
            if (d?.code) open(d.code);
          }}
          option={(p) => ({
            grid: grid({ top: p.narrow ? 62 : 40, left: 24, bottom: 26 }),
            legend: { ...legendStyle(p), top: 0, left: 0 },
            tooltip: {
              ...tooltipStyle(p),
              trigger: "item",
              formatter: (x: { data: { code?: string; value: number[]; q: string; fonte: string; cr: number } }) =>
                x.data?.code
                  ? t("ch.tip", {
                      c: country(x.data.code),
                      q: x.data.q,
                      x: nf(x.data.value[0], 1),
                      y: nf(x.data.value[1], 1),
                      s: t(`usdSource.${x.data.fonte}`),
                      cr: nf(x.data.cr, 2),
                    })
                  : "",
            },
            xAxis: { type: "value", min: 0, max: xMax, name: t("ch.axis.x"), nameLocation: "middle", nameGap: 28, ...axisStyle(p), axisLabel: pctLabel(p) },
            yAxis: { type: "value", min: 0, max: yMax, name: t("ch.axis.y"), nameLocation: "middle", nameGap: 38, ...axisStyle(p), axisLabel: pctLabel(p) },
            series: (["BRI", "BSI"] as const).map((fonte, k) => ({
              name: t("ch.legend", { s: t(`usdSource.${fonte}`) }),
              type: "scatter",
              symbol: k === 0 ? "circle" : "rect",
              symbolSize: k === 0 ? 12 : 11,
              itemStyle: { color: p.series[k === 0 ? 0 : 2], borderColor: p.panel, borderWidth: 1.5 },
              label: { show: true, formatter: (x: { data: { code: string } }) => x.data.code, position: "right", distance: 4, color: p.ink2, fontSize: 10 },
              labelLayout: { hideOverlap: false, moveOverlap: "shiftY" },
              data: pts
                .filter((c) => c.fonteUsd === fonte)
                .map((c) => {
                  const dim = sel && sel !== c.quadrante;
                  return {
                    value: [+(100 * c.c1).toFixed(2), +(100 * c.usd).toFixed(2)],
                    code: c.code,
                    q: c.quadrante,
                    fonte: c.fonteUsd,
                    cr: c.r.creditoPct,
                    itemStyle: dim ? { opacity: 0.2 } : undefined,
                    label: dim ? { opacity: 0.35 } : undefined,
                  };
                }),
              markLine:
                k === 0
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: { color: p.ink2, type: "dashed", width: 1 },
                      label: { show: false },
                      data: [{ xAxis: +mx.toFixed(2) }, { yAxis: +my.toFixed(2) }],
                    }
                  : undefined,
              // quadrant names in the corners: areas without fill, except the selected one
              markArea:
                k === 0
                  ? {
                      silent: true,
                      data: LAYOUT.map((q) => [
                        {
                          xAxis: box[q][0][0],
                          yAxis: box[q][0][1],
                          itemStyle: { color: sel === q ? p.band : "transparent", opacity: sel === q ? 0.45 : 1 },
                          label: {
                            show: true,
                            position: CORNER[q],
                            distance: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            color: sel === q ? p.accent : p.ink2,
                            formatter: p.narrow ? q : `${q} · ${t(`quad.${q}.title`)}`,
                          },
                        },
                        { xAxis: box[q][1][0], yAxis: box[q][1][1] },
                      ]),
                    }
                  : undefined,
            })),
          })}
        />
        <Note
          id="note.channels"
          vars={{ r: pct(ch.confrontoFonti.rapporto_mediano_bsi_su_bri, 0), list: ch.cambianoConRiscalatura.map(country).join(t("fmt.and")) }}
        />
      </Card>

      <Card title={t("ch.quadrants")}>
        <p className="muted tiny">{t("ch.quadrants.help")}</p>
        <div className="grid2" style={{ marginBottom: 0, gap: "var(--space-3)" }}>
          {LAYOUT.map((q) => {
            const list = inQuad(q);
            return (
              <button
                key={q}
                className={`quad ${sel === q ? "active" : ""}`}
                onClick={() => route.setParams({ q: sel === q ? null : q })}
                aria-pressed={sel === q}
                style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}
              >
                <span className="row" style={{ gap: "var(--space-2)", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>
                    {q} · {t(`quad.${q}.title`)}
                  </strong>
                  <span className="tag" style={{ marginLeft: 0 }}>
                    {t(`quad.${q}.channel`)}
                  </span>
                </span>
                <span className="tiny" style={{ display: "block", margin: "var(--space-2) 0" }}>
                  <strong className="num">{t(list.length === 1 ? "ch.quad.one" : "ch.quad.count", { n: list.length })}</strong>
                  {list.length > 0 && ": "}
                  {list.length ? listing(list.map((c) => country(c.code))) : t("ch.noCountry")}
                </span>
                <span className="tiny muted" style={{ display: "block" }}>
                  {t(`quad.${q}.text`)}
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title={t("ch.countries")}>
        <DataTable
          csvName="two_channel_map.csv"
          rows={pts}
          initialSort={{ key: "c1", dir: -1 }}
          onRow={(r) => open(r.code)}
          columns={[
            { key: "nome", label: t("col.country"), value: (r) => country(r.code) },
            { key: "q", label: t("col.quadrant"), value: (r) => r.quadrante },
            { key: "c1", label: t("col.sightOnLiab"), numeric: true, value: (r) => r.c1, format: (r) => pct(r.c1) },
            { key: "usd", label: t("col.usdLiab"), numeric: true, value: (r) => r.usd, format: (r) => pct(r.usd) },
            { key: "fonte", label: t("col.usdSource"), value: (r) => t(`usdSource.${r.fonteUsd}`) },
            { key: "retail", label: t("col.retailShare"), numeric: true, value: (r) => r.quotaRetail, format: (r) => pct(r.quotaRetail) },
            { key: "cr", label: t("col.creditScenario"), numeric: true, value: (r) => r.r.creditoPct, format: (r) => nf(r.r.creditoPct, 2) + "%" },
          ]}
        />
      </Card>
    </>
  );
}
