import { ArrowRight, X } from "lucide-react";
import { EuroMap, INSET_CODES, type MapValue } from "../components/EuroMap";
import { Card, DataTable, Hero, Kpi, Note, ScenarioPanel, Select } from "../components/ui";
import { country, month, nf, t } from "../i18n";
import type { Country, Row, Scenario, Totals } from "../lib/model";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { describe, useResults } from "./shared";

type Ind = { scen: boolean; get: (c: Country, r: Row) => number; digits: number; area?: (tot: Totals) => number };
const INDICATORS: Record<string, Ind> = {
  effettoPp: { scen: true, get: (_, r) => r.effettoPp, digits: 2, area: (x) => x.effettoPp },
  persiVista: { scen: true, get: (_, r) => 100 * r.persiVista, digits: 2, area: (x) => 100 * x.persiVista },
  aumentoIngrosso: { scen: true, get: (_, r) => 100 * r.aumentoIngrosso, digits: 1, area: (x) => 100 * x.aumentoIngrosso },
  creditoPct: { scen: true, get: (_, r) => r.creditoPct, digits: 2, area: (x) => x.creditoPct },
  deflusso: { scen: true, get: (_, r) => r.deflusso, digits: 2, area: (x) => x.deflusso },
  c1: { scen: false, get: (c) => 100 * c.c1, digits: 1 },
  quotaRetail: { scen: false, get: (c) => 100 * c.quotaRetail, digits: 1 },
  usd: { scen: false, get: (c) => 100 * c.usd, digits: 1 },
  quotaPossessori: { scen: false, get: (c) => 100 * c.quotaPossessori, digits: 1 },
};
/** Indicatori mostrati nel pannello del paese selezionato, oltre a quello colorato sulla mappa. */
const SIDE = ["effettoPp", "creditoPct", "c1", "usd"];

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export default function MapEurope({ data, scenario }: { data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const key = route.params.get("ind") && INDICATORS[route.params.get("ind")!] ? route.params.get("ind")! : "effettoPp";
  const ind = INDICATORS[key];
  const { rows, tot } = useResults(sim, scenario);
  const valueOf = (k: string, i: number) => INDICATORS[k].get(sim.paesi[i], rows[i]);
  const values: MapValue[] = sim.paesi.map((c, i) => ({ code: c.code, value: valueOf(key, i) }));
  const ranked = [...values].sort((a, b) => b.value - a.value);
  const top = ranked[0], low = ranked[ranked.length - 1], n = values.length;
  const med = median(values.map((v) => v.value));
  const area = ind.area?.(tot);
  const byCode = Object.fromEntries(values.map((v) => [v.code, v.value]));
  const selParam = route.params.get("sel");
  // senza scelta nell'indirizzo è selezionato il paese con il valore più alto; "none" è la deselezione esplicita
  const sel = selParam === "none" ? null : selParam && selParam in byCode ? selParam : ranked[0]?.code ?? null;
  const select = (code: string) => route.setParams({ sel: code });
  const label = t(`map.ind.${key}`), unit = t(`map.unit.${key}`);
  const f = (x: number, d = ind.digits) => nf(x, d);
  const summary = describe(scenario, sim.cambioUsdPerEur);
  const heroText = ind.scen
    ? t("map.hero.scen", { c: country(top.code), v: f(top.value), area: f(area ?? 0), med: f(med), low: country(low.code), lv: f(low.value) })
    : t("map.hero.struct", { c: country(top.code), v: f(top.value), med: f(med), low: country(low.code), lv: f(low.value), n });
  const alt = t("map.alt", { ind: label, c: country(top.code), v: f(top.value), low: country(low.code), lv: f(low.value), u: unit });
  const selIdx = sel ? sim.paesi.findIndex((c) => c.code === sel) : -1;
  const others = SIDE.filter((k) => k !== key).slice(0, 3);

  return (
    <>
      <Hero label={t("map.hero.label", { ind: label })} value={f(top.value)} range={t("map.hero.range", { c: country(top.code), u: unit })} text={heroText}>
        <div className="kpis" style={{ marginBottom: 0 }}>
          {area !== undefined && <Kpi label={key === "deflusso" ? t("map.kpi.total") : t("map.kpi.area")} value={f(area)} />}
          <Kpi label={t("map.kpi.median", { n })} value={f(med)} />
          <Kpi label={t("map.kpi.low")} value={f(low.value)} sub={country(low.code)} />
        </div>
      </Hero>
      <div className="split">
        <div className="stack">
          <aside className="panel" aria-label={t("map.indicator")}>
            <div className="panel-head"><h2>{t("map.indicator")}</h2></div>
            <div className="controls">
              <Select id="ind" label={t("map.color")} value={key} options={Object.keys(INDICATORS).map((k) => [k, t(`map.ind.${k}`)])} onChange={(v) => route.setParams({ ind: v })} />
            </div>
            <p className="muted tiny" style={{ margin: "var(--space-3) 0 0" }}>
              {ind.scen ? t("map.scenario", { s: summary }) : t("map.static")}
            </p>
          </aside>
          <ScenarioPanel title={ind.scen ? t("map.linked") : t("map.linkedOff")} summary={summary} scenario={scenario} set={route.setParams} presets={sim.predefiniti} fx={sim.cambioUsdPerEur} />
        </div>
        <div>
          <Card>
            <EuroMap title={label} unit={unit} source={t("src.map", { m: month(sim.meseBilanci) })} values={values} digits={ind.digits} height={460}
              selected={sel} onSelect={select} alt={alt} />
            <div className="insets" aria-label={t("map.insets")}>
              {INSET_CODES.map((code) => (
                <div className="inset" key={code}>
                  <EuroMap inset={code} title={country(code)} unit={f(byCode[code])} values={values} digits={ind.digits} height={110} selected={sel} onSelect={select}
                    alt={t("map.insetAlt", { c: country(code), v: f(byCode[code]), u: unit })} />
                </div>))}
            </div>
            <Note id={ind.scen ? "note.map.scen" : "note.map.struct"} />
          </Card>
          <div className="grid2">
            <Card title={sel ? country(sel) : t("map.sel.title")}
              actions={sel ? <button className="btn small" onClick={() => route.setParams({ sel: "none" })}><X className="icon" aria-hidden="true" />{t("map.sel.clear")}</button> : undefined}>
              {sel && selIdx >= 0 ? (
                <div aria-live="polite">
                  <div className="kpis">
                    <Kpi label={label} value={f(byCode[sel])} range={unit} sub={t("map.sel.rank", { r: ranked.findIndex((v) => v.code === sel) + 1, n })} />
                  </div>
                  <dl className="facts">
                    {others.map((k) => (
                      <div key={k} style={{ display: "contents" }}>
                        <dt>{t(`map.ind.${k}`)}</dt>
                        <dd>{nf(valueOf(k, selIdx), INDICATORS[k].digits)} <span className="muted tiny">{t(`map.unit.${k}`)}</span></dd>
                      </div>))}
                  </dl>
                  <a className="btn primary" style={{ marginTop: "var(--space-4)" }} href={route.href(`country/${sel}`, { sel: null })}>
                    {t("map.sel.open")}<ArrowRight className="icon" aria-hidden="true" />
                  </a>
                </div>
              ) : <p className="muted" style={{ margin: 0 }}>{t("map.sel.none")}</p>}
            </Card>
            <Card title={t("map.values")}>
              <DataTable compact columns={[{ key: "nome", label: t("col.country"), value: (r: MapValue) => country(r.code), format: (r) => (r.code === sel ? <strong>{country(r.code)}</strong> : country(r.code)) },
                { key: "value", label: unit, numeric: true, value: (r) => r.value, format: (r) => f(r.value) }]}
                rows={values} csvName={`map_${key}.csv`} initialSort={{ key: "value", dir: -1 }} onRow={(r) => select(r.code)} />
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
