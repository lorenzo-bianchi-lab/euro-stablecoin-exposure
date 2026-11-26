import { Chart, axisStyle, legendStyle, lines, pctLabel, seriesColor, tooltipStyle, grid } from "../components/Chart";
import { Card, DataTable, Hero, Loading, Note, Segmented, Select, SimpleTable } from "../components/ui";
import { day, nf, pct, signed, t } from "../i18n";
import type { Monitor as MonitorFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { flagKey } from "./shared";

const PERIODS = ["13", "26", "52", "all", "long"], TOKENS = ["usdt", "usdc", "all"];

/** Settimana del massimo e del minimo di una serie (valori nulli esclusi). */
function extremes(weeks: string[], xs: (number | null)[]) {
  let hi = -1, lo = -1;
  xs.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) return;
    if (hi < 0 || v > (xs[hi] as number)) hi = i;
    if (lo < 0 || v < (xs[lo] as number)) lo = i;
  });
  return hi < 0 ? null : { max: xs[hi] as number, wMax: weeks[hi], min: xs[lo] as number, wMin: weeks[lo] };
}

export default function Monitor() {
  const route = useRoute();
  const { data: m, error } = useJson<MonitorFile>("monitor.json");
  if (!m) return <Loading error={error} />;
  const old = (v: string | null) => ({ tutto: "all", lungo: "long", tutte: "all" }[v ?? ""] ?? v ?? ""); // nomi usati negli indirizzi prima della versione in inglese
  const tok = TOKENS.includes(old(route.params.get("tok"))) ? old(route.params.get("tok")) : "usdt";
  const per = PERIODS.includes(old(route.params.get("per"))) ? old(route.params.get("per")) : "52";
  const base = per === "long" ? m.lungo : m.principale;
  const n = base.settimane.length, from = per === "long" || per === "all" ? 0 : Math.max(0, n - Number(per));
  const weeks = base.settimane.slice(from);
  const keys = tok === "all" ? m.serie : [tok, `${tok}_senza_coinbase`];
  const vols = tok === "usdc" ? ["volEurUsdc"] : tok === "usdt" ? ["volEurUsdt"] : ["volEurUsdt", "volEurUsdc"];
  const src = per === "long" ? t("mo.src.long", { n: m.pannello.exchange_indice_lungo, ex: m.pannello.esclusi_indice_lungo.join(t("fmt.and")) }) : t("mo.src.main", { n: m.pannello.exchange });
  const last = m.serie.map((s) => { const f = m.segnalazioni[s], i = f.settimane.length - 1; return { serie: s, quota: f.quota[i], sq: f.scartoQuota[i], sv: f.scartoVolume[i], stato: f.stato[i] }; });
  const events = m.serie.flatMap((s) => m.segnalazioni[s].settimane.map((w, i) => ({ serie: s, settimana: w, stato: m.segnalazioni[s].stato[i], sq: m.segnalazioni[s].scartoQuota[i], sv: m.segnalazioni[s].scartoVolume[i] })))
    .filter((e) => ["signal", "check"].includes(flagKey(e.stato)));
  const count = (s: string, key: string) => m.segnalazioni[s].stato.filter((x) => flagKey(x) === key).length;
  const ex = m.effettoEsclusione, d = ex.differenza_pp;

  // risultato principale: la serie scelta (con "tutte" si mostra USDT)
  const heroKey = tok === "usdc" ? "usdc" : "usdt";
  const st = m.statistiche[heroKey] as Record<string, number | string>;
  const heroLast = last.find((u) => u.serie === heroKey)!;
  const heroFlag = flagKey(heroLast.stato);
  const state = (u: { stato: string }) => <span className={`state ${flagKey(u.stato)}`}>{t(`flag.${flagKey(u.stato)}`)}</span>;

  // testi alternativi dei grafici, dai dati mostrati
  const shareData = keys.map((k) => (base[k] as (number | null)[]).slice(from).map((v) => (v === null || v === undefined ? null : +(100 * v).toFixed(2))));
  const e0 = extremes(weeks, shareData[0]);
  const shareAlt = e0 ? t("mo.alt.share", { s: t(`series.${keys[0]}.short`), max: nf(e0.max, 1) + "%", wMax: day(e0.wMax), min: nf(e0.min, 1) + "%", wMin: day(e0.wMin), n: weeks.length }) : "";
  const volTotal = weeks.map((_, i) => vols.reduce((acc, k) => acc + ((base[k] as (number | null)[])[from + i] ?? 0), 0));
  const ev = extremes(weeks, volTotal);
  const volAlt = ev ? t("mo.alt.vol", { max: t("fmt.bnPlain", { n: nf(ev.max, 2) }), wMax: day(ev.wMax), min: t("fmt.bnPlain", { n: nf(ev.min, 2) }), wMin: day(ev.wMin) }) : "";

  return (
    <>
      <Hero label={t("mo.hero.label", { s: t(`series.${heroKey}.short`), d: day(String(st.ultima_settimana)) })} value={pct(Number(st.valore))}
        range={t("mo.hero.range", { chg: signed(Number(st.variazione_pp), 1), avg: pct(Number(st.media_52_settimane)) })}
        text={t(`mo.hero.state.${heroFlag}`, { sq: signed(heroLast.sq, 1), sv: signed(heroLast.sv, 1) })}>
        <p className="muted tiny" style={{ marginBottom: "var(--space-2)" }}>{t("mo.hero.side")}</p>
        <SimpleTable compact numeric={[1]} head={[t("col.series"), t("col.eurShare"), t("col.state")]}
          rows={last.map((u) => [t(`series.${u.serie}.short`), pct(u.quota), state(u)])} />
      </Hero>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <Note id="note.monitor" />
        {d && <Note id="note.excluded" vars={{ ex: ex.esclusi.join(", "), usdt: signed(d.usdt.media, 2), usdc: signed(d.usdc.media, 2), max: nf(d.usdt.massima_assoluta, 1), w: day(d.usdt.settimana_della_massima), n: ex.segnalazioni_cambiate ?? 0 }} />}
        {m.fontiMancanti && m.fontiMancanti.coppie.length > 0 && (
          <Note id="note.missing" vars={{ ex: m.fontiMancanti.exchange.join(", "), n: m.fontiMancanti.coppie.length, x: pct(m.fontiMancanti.quotaVolume), d: day(m.fontiMancanti.datiFinoAl) }} />)}
      </div>

      <Card>
        <div className="controls no-print" style={{ marginBottom: "var(--space-2)" }}>
          <div className="field">
            <span className="field-label" aria-hidden="true">{t("mo.series")}</span>
            <Segmented label={t("mo.series")} value={tok} options={TOKENS.map((k) => [k, t(`mo.tok.${k}`)])} onChange={(v) => route.setParams({ tok: v })} />
          </div>
          <Select id="per" label={t("mo.period")} value={per} options={PERIODS.map((k) => [k, t(`mo.per.${k}`)])} onChange={(v) => route.setParams({ per: v })} />
        </div>
        <p className="muted tiny" style={{ marginBottom: "var(--space-4)" }}>{t("mo.lastWeek", { d: day(m.dati_al.ultimaSettimana) })}</p>
        <Chart title={t("mo.chart.share")} unit={t("mo.chart.share.unit")} source={src} height={340} alt={shareAlt} deps={[tok, per, m]}
          option={(p) => ({
            ...lines(p, keys.map((k, i) => ({ name: t(`series.${k}.short`), data: shareData[i], index: m.serie.indexOf(k) }))),
            tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "category", data: weeks, boundaryGap: false, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", min: 0, ...axisStyle(p), axisLabel: pctLabel(p) },
          })} />
        {per === "long" && <Note id="note.long" />}
      </Card>

      <Card>
        <Chart title={t("mo.chart.vol")} unit={t("mo.chart.vol.unit")} source={src} height={260} alt={volAlt} deps={[tok, per, m]}
          option={(p) => ({
            grid: grid({ top: vols.length > 1 ? 34 : 16 }), legend: vols.length > 1 ? { ...legendStyle(p), top: 0, left: 0 } : { show: false },
            tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => t("fmt.bnPlain", { n: nf(v, 2) }) },
            xAxis: { type: "category", data: weeks, ...axisStyle(p), splitLine: { show: false } },
            yAxis: { type: "value", ...axisStyle(p) },
            series: vols.map((k) => ({ name: t(`mo.vol.${k}`), type: "bar", stack: "v", barMaxWidth: 18, itemStyle: { color: seriesColor(p, k === "volEurUsdc" ? 2 : 0) }, data: (base[k] as number[]).slice(from) })),
          })} />
        <Note id="note.share" />
      </Card>

      <div className="grid2 top">
        <Card title={t("mo.flags.last")}>
          <SimpleTable compact numeric={[1, 2, 3]} head={[t("col.series"), t("col.eurShare"), t("mo.col.gapShare"), t("mo.col.gapVolume"), t("col.state")]}
            rows={last.map((u) => [t(`series.${u.serie}.short`), pct(u.quota), signed(u.sq, 1), signed(u.sv, 1), state(u)])} />
          <p className="muted tiny">{t("mo.rule")}</p>
          <Note id="note.linktest" vars={{ p: nf(m.testPredittivo.pValue, 2), n: m.testPredittivo.osservazioni }} />
        </Card>
        <Card title={t("mo.flags.history")}>
          <SimpleTable compact numeric={[1, 2, 3]} head={[t("col.series"), t("flag.signal"), t("flag.check"), t("flag.none")]}
            rows={m.serie.map((s) => [t(`series.${s}.short`), count(s, "signal"), count(s, "check"), count(s, "none")])} />
          {Object.keys(m.settimaneTrattenute).length > 0 && <p className="state signal">{t("mo.held", { w: Object.keys(m.settimaneTrattenute).join(", ") })}</p>}
        </Card>
      </div>
      <Card title={t("mo.flagged")}>
        <DataTable csvName="flags.csv" rows={events} compact pageSize={12} initialSort={{ key: "settimana", dir: -1 }} columns={[
          { key: "settimana", label: t("col.week"), value: (r) => r.settimana }, { key: "serie", label: t("col.series"), value: (r) => t(`series.${r.serie}`) },
          { key: "stato", label: t("col.state"), value: (r) => t(`flag.${flagKey(r.stato)}`), format: (r) => state(r) },
          { key: "sq", label: t("col.gapShare"), numeric: true, value: (r) => r.sq, format: (r) => signed(r.sq, 1) },
          { key: "sv", label: t("col.gapVolume"), numeric: true, value: (r) => r.sv, format: (r) => signed(r.sv, 1) },
        ]} />
      </Card>
      <Card title={t("mo.data")}>
        <DataTable csvName={`index_${per}.csv`} rows={weeks.map((w, i) => ({ w, i: from + i }))} compact pageSize={26} initialSort={{ key: "w", dir: -1 }} columns={[
          { key: "w", label: t("col.week"), value: (r) => r.w },
          ...m.serie.map((s) => ({ key: s, label: t(`series.${s}.short`), numeric: true, value: (r: { i: number }) => (base[s] as number[])[r.i], format: (r: { i: number }) => pct((base[s] as number[])[r.i]) })),
          { key: "ve1", label: t("mo.col.usdtEur"), numeric: true, value: (r) => (base.volEurUsdt as number[])[r.i], format: (r) => nf((base.volEurUsdt as number[])[r.i], 2) },
          { key: "ve2", label: t("mo.col.usdcEur"), numeric: true, value: (r) => (base.volEurUsdc as number[])[r.i], format: (r) => nf((base.volEurUsdc as number[])[r.i], 2) },
        ]} />
      </Card>
    </>
  );
}
