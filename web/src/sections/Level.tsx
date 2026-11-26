import { ArrowRight, RotateCcw } from "lucide-react";
import { Chart, axisStyle, barLabel, grid, lines, tooltipStyle } from "../components/Chart";
import { Card, Hero, Kpi, Loading, Note, Select, Slider } from "../components/ui";
import { bn, day, nf, pct, t } from "../i18n";
import { levelEstimate, type LevelCase } from "../lib/model";
import type { AppData, LevelFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";

export default function Level({ data }: { data: AppData }) {
  const route = useRoute();
  const { data: lv, error } = useJson<LevelFile>("level.json");
  if (!lv) return <Loading error={error} />;
  const g = (k: string) => route.params.get(k);
  const clamp = (v: string | null, d: number, lo: number, hi: number) => { const x = v === null ? NaN : Number(v); return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d; };
  const unit = g("uni") === "individui" ? "individui" : "famiglie";
  const kase: LevelCase = g("caso") === "minimo" || g("caso") === "massimo" ? (g("caso") as LevelCase) : "centrale";
  const lastBand = clamp(g("ult"), lv.fasce[lv.fasce.length - 1][kase], 10000, 50000);
  const usd = clamp(g("usd"), +(100 * lv.quotaDollari[kase]).toFixed(1), 40, 100) / 100;
  const holders = clamp(g("det"), 100 * lv.quotaDetentori, 1, 10) / 100;
  const estimate = levelEstimate(lv.fasce, lv.unita[unit], holders, usd, kase, lastBand);
  // importo medio per detentore implicito nella stima: serve solo a scrivere la formula con i valori correnti
  const average = (estimate * 1e9) / (lv.unita[unit] * holders * usd);
  const r = lv.riferimento;
  const hh = unit === "famiglie";

  // confronto: prima la stima scelta, poi i riferimenti del programma, infine le ipotesi ESM
  type Kind = "chosen" | "ref" | "esm";
  const compare: { label: string; value: number; kind: Kind }[] = [
    { label: t("lv.cmp.chosen"), value: estimate, kind: "chosen" },
    { label: t("lv.cmp.min"), value: r.minimo_mld_eur, kind: "ref" },
    { label: t("lv.cmp.centre"), value: r.centrale_mld_eur, kind: "ref" },
    { label: t("lv.cmp.max"), value: r.massimo_mld_eur, kind: "ref" },
    { label: t("lv.cmp.upper"), value: r.estremo_superiore_dichiarato_mld_eur, kind: "ref" },
    { label: t("lv.cmp.esm75"), value: lv.esm.baseEur, kind: "esm" },
    { label: t("lv.cmp.esm15"), value: lv.esm.altoEur, kind: "esm" },
  ];
  const tot = lv.fasce.reduce((a, b) => a + b.percentuale, 0);
  const shares = lv.fasce.map((f) => +(100 * f.percentuale / tot).toFixed(2));
  const bandLabel = (i: number) => (i === 0 ? t("lv.band.first", { b: nf(lv.fasce[0].massimo, 0) }) : i === lv.fasce.length - 1 ? t("lv.band.last", { a: nf(lv.fasce[i].minimo, 0) }) : t("lv.band.mid", { a: nf(lv.fasce[i].minimo, 0), b: nf(lv.fasce[i].massimo, 0) }));
  const topBand = shares.indexOf(Math.max(...shares));
  const months = lv.esm.serie.mesi, last = months.length - 1;
  const reset = () => route.setParams({ uni: null, caso: null, ult: null, usd: null, det: null });

  return (
    <>
      <div className="split">
        <aside className="panel" aria-label={t("lv.assumptions")}>
          <div className="panel-head"><h2>{t("lv.assumptions")}</h2></div>
          <div className="controls">
            <Select id="uni" label={t("lv.unit")} value={unit} options={[["famiglie", t("lv.unit.hh", { x: nf(lv.unita.famiglie / 1e6, 1) })], ["individui", t("lv.unit.ind", { x: nf(lv.unita.individui / 1e6, 1) })]]} onChange={(v) => route.setParams({ uni: v })} />
            <Select id="caso" label={t("lv.case")} value={kase} options={[["minimo", t("lv.case.min")], ["centrale", t("lv.case.mid")], ["massimo", t("lv.case.max")]]} onChange={(v) => route.setParams({ caso: v, ult: null, usd: null })} />
            <Slider id="ult" label={t("lv.lastBand")} value={lastBand} min={10000} max={50000} step={1000} onChange={(v) => route.setParams({ ult: v })} display={t("lv.eur", { x: nf(lastBand, 0) })} />
            <Slider id="usd" label={t("lv.usdShare")} value={Math.round(usd * 100)} min={40} max={100} step={1} onChange={(v) => route.setParams({ usd: v })} display={pct(usd, 0)} />
            <Slider id="det" label={t("lv.holders")} value={+(holders * 100).toFixed(1)} min={1} max={10} step={0.5} onChange={(v) => route.setParams({ det: v })} display={pct(holders, 1)} />
          </div>
          <button className="btn small" style={{ marginTop: "var(--space-2)" }} onClick={reset}><RotateCcw className="icon" aria-hidden="true" />{t("lv.reset")}</button>
        </aside>

        <div>
          <Hero label={t("lv.hero.label")} value={bn(estimate)} range={t(hh ? "lv.kpi.chosen.hh" : "lv.kpi.chosen.ind", { x: nf(lv.unita[unit] * holders / 1e6, 1) })}
            text={<>
              <span className="num">{t(hh ? "lv.formula.hh" : "lv.formula.ind", { u: nf(lv.unita[unit] / 1e6, 1), h: pct(holders, 1), m: nf(average, 0), d: pct(usd, 0), x: bn(estimate) })}</span>
              <span style={{ display: "block", marginTop: "var(--space-3)" }}>
                <a className="btn primary" href={route.href("simulator", { imp: Number(estimate.toFixed(2)) })}>{t("lv.use")}<ArrowRight className="icon" aria-hidden="true" /></a>
              </span>
            </>}>
            <div className="kpis" style={{ gridTemplateColumns: "minmax(0, 1fr)", margin: 0 }}>
              <Kpi label={t("lv.kpi.ref")} value={bn(r.centrale_mld_eur)} range={t("fmt.band", { a: nf(r.minimo_mld_eur, 1), b: nf(r.massimo_mld_eur, 1) })} sub={t("lv.kpi.ref.sub", { x: nf(r.estremo_superiore_dichiarato_mld_eur, 1) })} />
              <Kpi label={t("lv.kpi.esm")} value={bn(lv.esm.baseEur)} sub={t("lv.kpi.esm.sub", { x: nf(lv.esm.altoEur, 1), d: day(lv.esm.data) })} />
            </div>
          </Hero>
          <div style={{ marginTop: "calc(-1 * var(--space-3))", marginBottom: "var(--space-5)" }}>
            <Note id="note.levelFormula" />
            <p className="muted tiny" style={{ margin: "var(--space-2) 0 0" }}>{t("ov.fx", { fx: nf(data.sim.cambioUsdPerEur, 4), d: day(data.sim.dataCambio) })}</p>
          </div>

          <Card>
            <Chart title={t("lv.chart.cmp")} unit={t("unit.bnEur")} source={t("lv.chart.cmp.src")} height={300} deps={[estimate, lv]}
              alt={t("lv.alt.cmp", { x: bn(estimate), c: bn(r.centrale_mld_eur), a: nf(r.minimo_mld_eur, 1), b: nf(r.massimo_mld_eur, 1), e: bn(lv.esm.baseEur), h: bn(lv.esm.altoEur) })}
              option={(p) => ({
                grid: grid({ left: 14, right: 56 }), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => bn(v) },
                xAxis: { type: "value", ...axisStyle(p), axisLabel: { show: false } },
                yAxis: { type: "category", inverse: true, data: compare.map((c) => c.label), ...axisStyle(p), splitLine: { show: false },
                  axisLabel: { color: p.ink2, fontSize: 11, formatter: (v: string) => (v === compare[0].label ? `{b|${v}}` : v), rich: { b: { color: p.ink, fontWeight: 600, fontSize: 11 } } } },
                series: [{ type: "bar", barMaxWidth: 16, label: barLabel(p, (v) => nf(v, 1)),
                  data: compare.map((c) => ({ value: +c.value.toFixed(2), itemStyle: { color: c.kind === "chosen" ? p.accent : c.kind === "esm" ? p.ink2 : p.series[0], borderRadius: [0, 3, 3, 0] },
                    label: c.kind === "chosen" ? { fontWeight: 600, color: p.ink } : undefined })) }],
              })} />
            <p className="muted tiny">{t("lv.cmp.key")}</p>
            <Note id="note.units" />
          </Card>

          <Card>
            <Chart title={t("lv.chart.bands")} unit={t("lv.chart.bands.unit")} source={t("lv.chart.bands.src")} height={300} deps={[lv]}
              alt={t("lv.alt.bands", { top: bandLabel(topBand), x: nf(shares[topBand], 1), last: bandLabel(shares.length - 1), y: nf(shares[shares.length - 1], 1) })}
              option={(p) => ({
                grid: grid({ left: 14, right: 48 }), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 1) + "%" },
                xAxis: { type: "value", ...axisStyle(p), axisLabel: { show: false } },
                yAxis: { type: "category", inverse: true, data: lv.fasce.map((_, i) => bandLabel(i)), ...axisStyle(p), splitLine: { show: false } },
                series: [{ type: "bar", data: shares, label: barLabel(p, (v) => nf(v, 1) + "%"), itemStyle: { color: p.series[0], borderRadius: [0, 3, 3, 0] }, barMaxWidth: 16 }],
              })} />
            <Note id="note.chartB" />
          </Card>
        </div>
      </div>

      <Card>
        <Chart title={t("lv.chart.esm")} unit={t("lv.chart.esm.unit")} source={t("lv.chart.esm.src")} height={300} deps={[lv]}
          alt={t("lv.alt.esm", { a: months[0], b: months[last], x: bn(lv.esm.serie.base[0]), y: bn(lv.esm.serie.base[last]), lo: nf(r.minimo_mld_eur, 1), hi: nf(r.massimo_mld_eur, 1) })}
          option={(p) => {
            const l = lines(p, [
              { name: t("lv.legend.esm75"), data: lv.esm.serie.base, index: 0,
                extra: { markArea: { silent: true, itemStyle: { color: p.band, opacity: 0.8 }, label: { color: p.ink2, fontSize: 10, position: "insideTopLeft" },
                  data: [[{ yAxis: +r.minimo_mld_eur.toFixed(2), name: t("lv.legend.own", { a: nf(r.minimo_mld_eur, 1), b: nf(r.massimo_mld_eur, 1) }) }, { yAxis: +r.massimo_mld_eur.toFixed(2) }]] } } },
              { name: t("lv.legend.esm15"), data: lv.esm.serie.alto, index: 2 },
            ]);
            return {
              ...l, tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => bn(v) },
              xAxis: { type: "category", data: months, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
              yAxis: { type: "value", min: 0, ...axisStyle(p) },
            };
          }} />
        <Note id="note.esm" />
      </Card>

      <Card title={t("lv.other")}>
        <ul className="plain">
          <li><strong>{t("lv.b2.title")}</strong> {t("lv.b2.text", { x: nf(lv.altreStrade.b2.saldiClientiMldUsd, 1) })}</li>
          <li><strong>{t("lv.b3.title", { x: nf(lv.altreStrade.b3.centrale, 1) })}</strong> {t("lv.b3.text")}</li>
        </ul>
        <Note id={lv.criterioSoddisfatto ? "note.criterionMet" : "note.criterion"} />
        <p className="muted tiny" style={{ margin: "var(--space-2) 0 0" }}>{t("lv.central", { x: pct(data.overview.scenarioCentrale.depositiAVistaPersi, 2) })}</p>
      </Card>
    </>
  );
}
