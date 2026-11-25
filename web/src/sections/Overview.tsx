import { Chart, pctLabel, axisStyle, grid, tooltipStyle } from "../components/Chart";
import { Card, Kpi, Note, SimpleTable } from "../components/ui";
import { bn, country, day, month, nf, pct, signed, t } from "../i18n";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { SERIES_IDS, flagKey } from "./shared";

export default function Overview({ data }: { data: AppData }) {
  const { overview: o, meta, sim } = data;
  const route = useRoute();
  const attive = SERIES_IDS.filter((k) => ["signal", "check"].includes(flagKey(o.indice[k]?.stato)));
  const top = [...o.classifica].sort((a, b) => a.posizione - b.posizione);
  return (
    <>
      <Card title={t("ov.kpis")}>
        <div className="kpis">
          <Kpi label={t("ov.kpi.level")} value={bn(o.livello.centrale)} range={t("ov.kpi.level.range", { a: nf(o.livello.minimo, 1), b: nf(o.livello.massimo, 1) })} sub={t("ov.kpi.level.sub", { x: nf(o.livello.estremoSuperiore, 1) })} />
          <Kpi label={t("ov.kpi.esm")} value={bn(o.livello.esmBase)} sub={t("ov.kpi.esm.sub", { x: nf(o.livello.esmAlto, 1) })} />
          <Kpi label={t("ov.kpi.outflow")} value={bn(o.scenarioCentrale.deflusso)} sub={t("ov.kpi.outflow.sub", { x: pct(o.scenarioCentrale.depositiAVistaPersi, 2) })} />
          <Kpi label={t("ov.kpi.credit")} value={bn(o.scenarioCentrale.creditoUniforme)} range={t("ov.kpi.credit.range", { a: nf(o.scenarioCentrale.creditoBasso, 1), b: nf(o.scenarioCentrale.creditoAlto, 1) })} sub={t("ov.kpi.credit.sub", { x: nf(o.scenarioCentrale.creditoPct, 2) })} />
        </div>
        <Note id="note.level" />
        <Note id="note.credit" />
        <p className="muted tiny">{t("ov.fx", { fx: nf(sim.cambioUsdPerEur, 4), d: day(sim.dataCambio) })}</p>
        <p><a className="btn small" href={route.href("simulator")}>{t("ov.openSimulator")}</a> <a className="btn small" href={route.href("level")}>{t("ov.howLevel")}</a> <a className="btn small" href={route.href("banks")}>{t("ov.openBanks")}</a></p>
      </Card>

      <div className="grid2">
        <Card title={t("ov.flags")}>
          {attive.length === 0 ? <p>{t("ov.flags.none")}</p> : (
            <ul className="plain">{attive.map((k) => (
              <li key={k}><span className={`state ${flagKey(o.indice[k].stato)}`}>{t(`series.${k}.short`)}: {t(`flag.${flagKey(o.indice[k].stato)}`)}</span>. {t("ov.flags.gaps", { q: signed(o.indice[k].scarto_quota, 1), v: signed(o.indice[k].scarto_volume, 1) })}</li>))}
            </ul>)}
          <SimpleTable numeric={[1, 2]} head={[t("col.series"), t("col.eurShare"), t("col.change"), t("col.state")]}
            rows={SERIES_IDS.map((k) => [t(`series.${k}.short`), pct(o.indice[k].valore), signed(o.indice[k].variazione, 1), t(`flag.${flagKey(o.indice[k].stato)}`)])} />
          <Note id="note.flag" />
          <a className="btn small" href={route.href("monitor")}>{t("ov.openMonitor")}</a>
        </Card>
        <Card title={t("ov.dates")}>
          <SimpleTable rows={[
            [t("ov.dates.balance"), month(o.dati_al.bilanci)],
            [t("ov.dates.index"), t("fmt.weekOf", { d: day(o.dati_al.settimana) })],
            [t("ov.dates.supply"), day(o.dati_al.circolazione)],
            [t("ov.dates.fx"), t("ov.dates.fx.value", { d: day(sim.dataCambio), fx: nf(sim.cambioUsdPerEur, 4) })],
            [t("ov.dates.update"), day(meta.aggiornamento.eseguitoIl ?? meta.generato_il)],
          ]} />
          <a className="btn small" href={route.href("method")}>{t("ov.sources")}</a>
        </Card>
      </div>

      <Card title={t("ov.exposed")}>
        <Chart title={t("ov.chart.title")} unit={t("ov.chart.unit")} source={t("src.bsi", { m: month(o.dati_al.bilanci) })} height={300}
          onClick={(p) => { const c = top.find((x) => country(x.code) === p.name); if (c) window.location.hash = route.href(`country/${c.code}`); }}
          option={(p) => ({
            grid: grid({ bottom: 4 }), tooltip: { ...tooltipStyle(p), trigger: "axis", valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "category", data: top.map((c) => country(c.code)), ...axisStyle(p), axisLabel: { color: p.ink2, fontSize: 10, rotate: 55, interval: 0 }, splitLine: { show: false } },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: [{ type: "bar", data: top.map((c) => +(100 * c.c1).toFixed(2)), itemStyle: { color: p.series[0], borderRadius: [4, 4, 0, 0] }, barMaxWidth: 22 }],
          })} />
        <Note id="note.ranking" />
      </Card>
    </>
  );
}
