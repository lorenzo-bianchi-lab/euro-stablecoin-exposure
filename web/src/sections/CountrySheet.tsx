import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Chart, axisStyle, lines, pctLabel, tooltipStyle, usePalette, type Palette } from "../components/Chart";
import { Card, DataTable, Hero, Kpi, Loading, Note, Select } from "../components/ui";
import { bn, country, locale, month, nf, pct, t } from "../i18n";
import { compute, type Scenario } from "../lib/model";
import type { AppData, CountryFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { describeChoices } from "./shared";

// Groups of liabilities, from bottom to top: sight deposits of households and firms are at the base, in the main colour.
const GROUPS: [string, string[]][] = [
  ["sightHhNfc", ["household_sight_deposits", "firm_sight_deposits"]],
  ["otherHhNfc", ["household_other_deposits", "firm_other_deposits"]],
  ["otherDeposits", ["other_non_mfi_deposits", "central_government_deposits"]],
  ["fromBanks", ["deposits_from_mfis"]],
  ["debt", ["debt_securities"]],
  ["external", ["external_liabilities"]],
  ["capital", ["capital_and_reserves"]],
  ["other", ["other_liabilities", "money_market_funds"]],
];
/** Colour and opacity of each group: solid blue for sight deposits, light blue for the other deposits, progressively lighter greys for the rest. */
const groupStyle = (p: Palette, i: number): { color: string; opacity: number } =>
  [
    { color: p.primary, opacity: 1 },
    { color: p.series[2], opacity: 0.85 },
    { color: p.series[2], opacity: 0.5 },
    { color: p.series[3], opacity: 0.85 },
    { color: p.series[3], opacity: 0.65 },
    { color: p.series[3], opacity: 0.45 },
    { color: p.series[3], opacity: 0.28 },
    { color: p.series[3], opacity: 0.14 },
  ][i];

const xAxis = (p: Palette, mesi: string[]) => ({ type: "category", data: mesi, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } });
const argmax = (xs: number[]) => xs.reduce((b, v, i) => (v > xs[b] ? i : b), 0);
const argmin = (xs: number[]) => xs.reduce((b, v, i) => (v < xs[b] ? i : b), 0);

export default function CountrySheet({ data, scenario, code }: { data: AppData; scenario: Scenario; code: string }) {
  const { sim } = data;
  const route = useRoute();
  const palette = usePalette();
  const c = sim.countries.find((x) => x.code === code) ?? sim.countries.find((x) => x.code === "IT")!;
  const name = country(c.code);
  const tot = sim.countries.length;
  const { data: file, error } = useJson<CountryFile>(`countries/${c.code}.json`);
  // the presets replace the amount: the effects depend only on the other four choices
  const { sostituzione, regola, depositi, credito } = scenario;
  const effects = useMemo(
    () =>
      sim.presets.map((p) => {
        const r = compute(sim.countries, sim.coefficients, { importo: p.eur, sostituzione, regola, depositi, credito }).find((x) => x.code === c.code)!;
        return { ...r, id: p.id, importo: p.eur };
      }),
    [sim, sostituzione, regola, depositi, credito, c.code],
  );
  const options = [...sim.countries].map((x) => [x.code, country(x.code)] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], locale()));
  const src = t("src.bsiPlain");
  const q = c.quadrant,
    qTitle = t(`quad.${q}.title`);
  const gap = 100 * (c.c1 - sim.medians.c1);
  const quadrant = quadrantCard();

  // chart series, in percent
  const series = useMemo(() => {
    if (!file) return null;
    const comp = GROUPS.map(([, keys]) =>
      file.composition.months.map((_, j) => +(100 * keys.reduce((a, k) => a + (file.composition.items[k]?.[j] ?? 0), 0)).toFixed(2)),
    );
    const ind = (["c1", "c2", "c3"] as const).map((k) => file.indicator[k].map((v) => +(100 * v).toFixed(2)));
    return { comp, ind };
  }, [file]);

  return (
    <>
      <div className="row" style={{ marginBottom: "var(--space-4)" }}>
        <div style={{ flex: "1 1 auto", maxWidth: "var(--panel-width)" }}>
          <Select
            id="paese"
            label={t("col.country")}
            value={c.code}
            options={options}
            onChange={(v) => {
              window.location.hash = route.href(`country/${v}`);
            }}
          />
        </div>
      </div>

      <Hero
        label={t("cs.hero.label", { c: name })}
        value={t("cs.kpi.rank.value", { n: c.rank, tot })}
        range={t("cs.hero.range", { x: nf(c.indicator, 2), q, title: qTitle })}
        text={
          <>
            {t(gap >= 0 ? "cs.hero.above" : "cs.hero.below", { v: pct(c.c1), d: nf(Math.abs(gap), 1), m: pct(sim.medians.c1) })}{" "}
            {t("cs.hero.quad", { c: name, q, title: qTitle, u: pct(c.usd), m: pct(sim.medians.usd) })}
          </>
        }
      >
        <div className="kpis" style={{ marginBottom: "var(--space-2)" }}>
          <Kpi label={t("cs.kpi.c1")} value={pct(c.c1)} sub={t("cs.kpi.c1.sub", { a: bn(c.sight, 0), b: nf(c.total, 0) })} />
          <Kpi label={t("cs.kpi.c2")} value={pct(c.c2)} />
          <Kpi label={t("cs.kpi.c3")} value={pct(c.c3)} />
          <Kpi label={t("cs.kpi.usd")} value={pct(c.usd)} sub={t("cs.kpi.usd.sub", { s: t(`usdSource.${c.usdSource}`) })} />
          <Kpi label={t("cs.kpi.owners")} value={pct(c.ownerShare)} sub={t(c.ownersImputed ? "cs.kpi.owners.imputed" : "cs.kpi.owners.survey")} />
        </div>
      </Hero>

      {!file || !series ? (
        <Card>
          <Loading error={error} />
        </Card>
      ) : (
        (() => {
          const mesi = file.composition.months,
            last = mesi.length - 1,
            sight = series.comp[0];
          const pos = file.indicator.rank,
            im = file.indicator.months;
          const best = argmin(pos),
            worst = argmax(pos);
          const c1 = series.ind[0];
          return (
            <>
              <Card>
                <Chart
                  title={t("cs.chart.composition", { c: name })}
                  unit={t("cs.chart.composition.unit")}
                  height={360}
                  deps={[file, series]}
                  source={t("cs.chart.composition.src", { a: month(mesi[0]), b: month(mesi[last]) })}
                  alt={t("cs.alt.composition", {
                    a: month(mesi[0]),
                    va: nf(sight[0], 1),
                    b: month(mesi[last]),
                    vb: nf(sight[last], 1),
                    mx: nf(sight[argmax(sight)], 1),
                    mm: month(mesi[argmax(sight)]),
                  })}
                  option={(p) => ({
                    grid: { left: 4, right: 16, top: 12, bottom: 4, containLabel: true },
                    tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                    xAxis: xAxis(p, mesi),
                    yAxis: { type: "value", max: 100, ...axisStyle(p), axisLabel: pctLabel(p) },
                    series: GROUPS.map(([id], i) => {
                      const s = groupStyle(p, i);
                      return {
                        name: t(`cs.group.${id}`),
                        type: "line",
                        stack: "passivo",
                        symbol: "none",
                        lineStyle: { width: 0.5, color: p.panel },
                        areaStyle: { color: s.color, opacity: s.opacity },
                        itemStyle: { color: s.color, opacity: s.opacity },
                        emphasis: { disabled: true },
                        data: series.comp[i],
                      };
                    }),
                  })}
                />
                <ul className="legend" aria-label={t("cs.legend")}>
                  {GROUPS.map(([id], i) => {
                    const s = groupStyle(palette, i);
                    return (
                      <li key={id}>
                        <span className="swatch" style={{ background: s.color, opacity: s.opacity }} aria-hidden="true" />
                        {i === 0 ? <strong>{t(`cs.group.${id}`)}</strong> : t(`cs.group.${id}`)} <span className="num">{nf(series.comp[i][last], 1)}%</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Card>
                <Chart
                  title={t("cs.chart.components")}
                  unit={t("cs.chart.components.unit")}
                  source={src}
                  height={300}
                  deps={[file, series]}
                  alt={t("cs.alt.components", {
                    m: month(im[im.length - 1]),
                    c1: nf(c1[c1.length - 1], 1),
                    c2: nf(series.ind[1][c1.length - 1], 1),
                    c3: nf(series.ind[2][c1.length - 1], 1),
                    lo: nf(c1[argmin(c1)], 1),
                    lom: month(im[argmin(c1)]),
                    hi: nf(c1[argmax(c1)], 1),
                    him: month(im[argmax(c1)]),
                  })}
                  option={(p) => ({
                    ...lines(
                      p,
                      (["c1", "c2", "c3"] as const).map((k, i) => ({ name: t(`cs.legend.${k}`), data: series.ind[i] })),
                    ),
                    tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
                    xAxis: xAxis(p, im),
                    yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
                  })}
                />
              </Card>

              <div className="grid2 top">
                <Card>
                  <Chart
                    title={t("cs.chart.rank")}
                    unit={t("cs.chart.rank.unit")}
                    source={src}
                    height={260}
                    deps={[file]}
                    alt={t("cs.alt.rank", {
                      c: name,
                      n: pos[pos.length - 1],
                      tot: file.indicator.countries[pos.length - 1],
                      best: pos[best],
                      bm: month(im[best]),
                      worst: pos[worst],
                      wm: month(im[worst]),
                    })}
                    option={(p) => ({
                      ...lines(p, [{ name, data: pos, extra: { step: "end" } }]),
                      tooltip: {
                        ...tooltipStyle(p),
                        trigger: "axis",
                        formatter: (x: { axisValue: string; value: number; dataIndex: number }[]) =>
                          `${month(x[0].axisValue)}<br>${t("cs.chart.rank.tip", { n: x[0].value, tot: file.indicator.countries[x[0].dataIndex] })}`,
                      },
                      xAxis: xAxis(p, im),
                      yAxis: { type: "value", inverse: true, min: 1, max: tot, interval: 5, ...axisStyle(p) },
                    })}
                  />
                  <Note id="note.country" />
                </Card>
                {quadrant}
              </div>
            </>
          );
        })()
      )}

      <Card title={t("cs.effects", { c: name })}>
        <p className="muted tiny">{t("cs.effects.same", { s: describeChoices(scenario) })}</p>
        <DataTable
          csvName={`scenarios_${c.code}.csv`}
          rows={effects}
          compact
          initialSort={{ key: "importo", dir: 1 }}
          columns={[
            { key: "nome", label: t("col.scenario"), value: (r) => t(`preset.${r.id}`) },
            { key: "importo", label: t("col.amount"), numeric: true, value: (r) => r.importo, format: (r) => nf(r.importo, 1) },
            { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 2) },
            { key: "persiVista", label: t("col.sightLost"), numeric: true, value: (r) => r.persiVista, format: (r) => pct(r.persiVista, 2) },
            { key: "effettoPp", label: t("col.fundingEffect"), numeric: true, value: (r) => r.effettoPp, format: (r) => nf(r.effettoPp, 2) },
            { key: "aumentoIngrosso", label: t("col.wholesale"), numeric: true, value: (r) => r.aumentoIngrosso, format: (r) => pct(r.aumentoIngrosso, 1) },
            { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 2) },
            { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 2) + "%" },
          ]}
        />
        <Note id="note.credit" />
      </Card>

      {!file && quadrant}
    </>
  );

  function quadrantCard() {
    return (
      <Card title={t("cs.quadrant", { q, title: qTitle })}>
        <p style={{ marginBottom: "var(--space-3)" }}>
          <span className="badge primary">{t(`quad.${q}.channel`)}</span>
        </p>
        <p>{t(`quad.${q}.text`)}</p>
        <p className="muted tiny">{t(c.highRetail ? "cs.retail.high" : "cs.retail", { x: pct(c.retailShare), w: nf(c.continuousWeight, 2) })}</p>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <a className="btn small" href={route.href("channels")}>
            {t("cs.openChannels")}
            <ArrowRight className="icon" aria-hidden="true" />
          </a>
          <a className="btn small" href={route.href("banks", { bc: c.code })}>
            {t("cs.openBanks", { c: name })}
            <ArrowRight className="icon" aria-hidden="true" />
          </a>
        </div>
      </Card>
    );
  }
}
