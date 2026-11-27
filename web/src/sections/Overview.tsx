import { ArrowRight } from "lucide-react";
import { Chart, barLabel, grid, tooltipStyle } from "../components/Chart";
import { Card, Hero, Kpi, Note, Select, SimpleTable } from "../components/ui";
import { bn, country, day, month, nf, pct, signed, t } from "../i18n";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { SERIES_IDS, flagKey } from "./shared";

/** Overview: the estimated level highlighted, then flags, data dates and the funding ranking. No new calculation: only the values of overview.json. */
export default function Overview({ data }: { data: AppData }) {
  const { overview: o, meta, sim } = data;
  const route = useRoute();
  const attive = SERIES_IDS.filter((k) => ["signal", "check"].includes(flagKey(o.indice[k]?.stato)));
  const top = [...o.classifica].sort((a, b) => a.posizione - b.posizione);
  const sorted = [...top].sort((a, b) => b.c1 - a.c1);
  const hi = sorted[0],
    lo = sorted[sorted.length - 1];
  const openCountry = (code: string) => {
    if (code) window.location.hash = route.href(`country/${code}`);
  };
  const link = (id: string, label: string) => (
    <a className="btn small" href={route.href(id)}>
      {label}
      <ArrowRight className="icon" aria-hidden="true" />
    </a>
  );
  return (
    <>
      <Hero
        label={t("ov.kpi.level")}
        value={bn(o.livello.centrale)}
        range={t("ov.kpi.level.range", { a: nf(o.livello.minimo, 1), b: nf(o.livello.massimo, 1) })}
        text={t("ov.hero.text", { x: bn(o.livello.estremoSuperiore), n: top.length })}
      >
        <div className="kpis" style={{ gridTemplateColumns: "minmax(0, 1fr)", marginBottom: 0 }}>
          <Kpi label={t("ov.kpi.esm")} value={bn(o.livello.esmBase)} sub={t("ov.kpi.esm.sub", { x: bn(o.livello.esmAlto) })} />
          <Kpi
            label={t("ov.kpi.outflow")}
            value={bn(o.scenarioCentrale.deflusso)}
            sub={t("ov.kpi.outflow.sub", { x: pct(o.scenarioCentrale.depositiAVistaPersi, 2) })}
          />
          <Kpi
            label={t("ov.kpi.credit")}
            value={bn(o.scenarioCentrale.creditoUniforme)}
            range={t("ov.kpi.credit.range", { a: nf(o.scenarioCentrale.creditoBasso, 1), b: nf(o.scenarioCentrale.creditoAlto, 1) })}
            sub={t("ov.kpi.credit.sub", { x: nf(o.scenarioCentrale.creditoPct, 2) })}
          />
        </div>
      </Hero>
      <div style={{ marginTop: "calc(-1 * var(--space-3))", marginBottom: "var(--space-5)" }}>
        <Note id="note.level" />
        <Note id="note.credit" />
        <p className="muted tiny" style={{ margin: "var(--space-2) 0 var(--space-3)" }}>
          {t("ov.fx", { fx: nf(sim.cambioUsdPerEur, 4), d: day(sim.dataCambio) })}
        </p>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          {link("simulator", t("ov.openSimulator"))}
          {link("level", t("ov.howLevel"))}
          {link("banks", t("ov.openBanks"))}
        </div>
      </div>

      <div className="grid2 top">
        <Card title={t("ov.flags")} actions={link("monitor", t("ov.openMonitor"))}>
          {attive.length === 0 ? (
            <p>{t("ov.flags.none")}</p>
          ) : (
            <ul className="plain flagged" id="active-flags" style={{ marginTop: 0 }}>
              {attive.map((k) => (
                <li key={k}>
                  <strong>{t(`series.${k}.short`)}</strong>{" "}
                  <span className={`badge accent state ${flagKey(o.indice[k].stato)}`}>{t(`flag.${flagKey(o.indice[k].stato)}`)}</span>{" "}
                  <span className="muted">{t("ov.flags.gaps", { q: signed(o.indice[k].scarto_quota, 1), v: signed(o.indice[k].scarto_volume, 1) })}</span>
                </li>
              ))}
            </ul>
          )}
          <SimpleTable
            compact
            numeric={[1, 2]}
            head={[t("col.series"), t("col.eurShare"), t("col.change"), t("col.state")]}
            rows={SERIES_IDS.map((k) => {
              const f = flagKey(o.indice[k].stato);
              return [
                t(`series.${k}.short`),
                pct(o.indice[k].valore),
                signed(o.indice[k].variazione, 1),
                <span className={`state ${f}`}>{t(`flag.${f}`)}</span>,
              ];
            })}
          />
          <Note id="note.flag" />
        </Card>
        <Card title={t("ov.dates")} actions={link("method", t("ov.sources"))}>
          <dl className="facts" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
            <dt>{t("ov.dates.balance")}</dt>
            <dd>{month(o.dati_al.bilanci)}</dd>
            <dt>{t("ov.dates.index")}</dt>
            <dd>{t("fmt.weekOf", { d: day(o.dati_al.settimana) })}</dd>
            <dt>{t("ov.dates.supply")}</dt>
            <dd>{day(o.dati_al.circolazione)}</dd>
            <dt>{t("ov.dates.fx")}</dt>
            <dd>{t("ov.dates.fx.value", { d: day(sim.dataCambio), fx: nf(sim.cambioUsdPerEur, 4) })}</dd>
            <dt>{t("ov.dates.update")}</dt>
            <dd>{day(meta.aggiornamento.eseguitoIl ?? meta.generato_il)}</dd>
          </dl>
        </Card>
      </div>

      <Card title={t("ov.exposed")}>
        <Chart
          title={t("ov.chart.title")}
          unit={t("ov.chart.unit")}
          source={t("src.bsi", { m: month(o.dati_al.bilanci) })}
          height={Math.max(320, top.length * 24 + 24)}
          alt={t("ov.chart.alt", { n: top.length, hi: country(hi.code), a: pct(hi.c1), lo: country(lo.code), b: pct(lo.c1) })}
          deps={[top]}
          onClick={(p) => {
            const name = p.name ?? (p as { value?: unknown }).value;
            const c = top.find((x) => country(x.code) === name);
            if (c) openCountry(c.code);
          }}
          option={(p) => ({
            grid: grid({ left: 12, right: 48 }),
            tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 1) + "%" },
            yAxis: {
              type: "category",
              inverse: true,
              data: top.map((c) => country(c.code)),
              axisLine: { show: false },
              axisTick: { show: false },
              axisLabel: {
                color: p.ink2,
                fontSize: 12,
                interval: 0,
                formatter: (v: string, i: number) => t("ov.chart.rank", { n: top[i]?.posizione ?? i + 1, c: v }),
              },
              triggerEvent: true,
            },
            xAxis: { type: "value", show: false, max: (v: { max: number }) => v.max * 1.08 },
            series: [
              {
                type: "bar",
                data: top.map((c) => +(100 * c.c1).toFixed(2)),
                itemStyle: { color: p.series[0], borderRadius: [0, 3, 3, 0] },
                barMaxWidth: 16,
                cursor: "pointer",
                label: barLabel(p, (v) => nf(v, 1) + "%"),
              },
            ],
          })}
        />
        <div style={{ maxWidth: "var(--panel-width)", margin: "var(--space-3) 0" }}>
          <Select
            id="ov-country"
            label={t("ov.pick")}
            value=""
            options={[["", t("ov.pick.none")], ...top.map((c): [string, string] => [c.code, country(c.code)])]}
            onChange={openCountry}
          />
        </div>
        <Note id="note.ranking" />
      </Card>
    </>
  );
}
