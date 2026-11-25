import { useMemo, useState } from "react";
import { Chart, pctLabel, axisStyle, grid, legendStyle, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Kpi, Loading, Note, Select, SimpleTable } from "../components/ui";
import { bn, country, day, locale, month, nf, pct, t } from "../i18n";
import { bankBase, bankEffects, compute, creditLoss, type Bank, type BankRow, type Scenario } from "../lib/model";
import type { AppData, Banks as BanksFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { describe, describeChoices, useResults } from "./shared";

type Line = Bank & BankRow & { ingrosso: number; vista: number };
const wholesale = (b: Bank) => (b.depBanche + b.titoli) / b.attivo;

export default function Banks({ data, scenario, lei }: { data: AppData; scenario: Scenario; lei: string | null }) {
  const { sim } = data;
  const route = useRoute();
  const { data: f, error } = useJson<BanksFile>("banche.json");
  const { rows } = useResults(sim, scenario);
  const [query, setQuery] = useState("");
  const lost = useMemo(() => Object.fromEntries(rows.map((r) => [r.code, r.persiCategoria])), [rows]);
  const lines: Line[] = useMemo(() => {
    if (!f) return [];
    const e = bankEffects(f.banche, lost, sim.coefficienti, scenario.depositi);
    return f.banche.map((b, i) => ({ ...b, ...e[i], ingrosso: wholesale(b), vista: (b.vistaFam + b.vistaImp) / b.attivo }));
  }, [f, lost, sim, scenario.depositi]);
  if (!f) return <Loading error={error} />;
  const fx = sim.cambioUsdPerEur;
  const one = lei ? lines.find((b) => b.lei === lei) : undefined;
  if (one) return <BankSheet b={one} f={f} data={data} scenario={scenario} />;

  const bc = route.params.get("bc"), cls = route.params.get("cls");
  const shown = lines.filter((b) => (!bc || b.paese === bc) && (!cls || (cls === "high") === b.retailAlta) && (!query || b.nome.toLowerCase().includes(query.toLowerCase())));
  const open = (id: string) => { window.location.hash = route.href(`banks/${id}`); };
  const withBanks = f.paesi.filter((c) => c.banche > 0);
  const options: [string, string][] = [["", t("bk.allCountries")], ...withBanks.map((c) => [c.code, `${country(c.code)} (${c.banche})`] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], locale()))];
  // per paese: credito per euro di deflusso, banca per banca, contro le varianti del modulo 5 sugli aggregati nazionali
  const byCountry = f.paesi.map((c) => {
    const bs = lines.filter((b) => b.paese === c.code), out = bs.reduce((a, b) => a + b.deflusso, 0);
    const cc = sim.paesi.find((x) => x.code === c.code)!, r = rows.find((x) => x.code === c.code)!;
    const m5 = (v: "basso" | "alto" | "soglia" | "continua") => (r.deflusso ? creditLoss(cc, sim.coefficienti, r.deflusso, v) / r.deflusso : null);
    return { ...c, m6: out ? bs.reduce((a, b) => a + b.credito, 0) / out : null, soglia: m5("soglia"), continua: m5("continua"), basso: m5("basso"), alto: m5("alto") };
  });
  const coveredOut = byCountry.reduce((a, c) => a + (c.m6 === null ? 0 : rows.find((x) => x.code === c.code)!.deflusso), 0);
  const area = (k: "m6" | "soglia" | "continua") => (coveredOut ? byCountry.reduce((a, c) => a + (c.m6 === null ? 0 : (c[k] ?? 0) * rows.find((x) => x.code === c.code)!.deflusso), 0) / coveredOut : null);
  const src = t("bk.src", { d: day(f.dati_al.banche) });
  return (
    <>
      <Card title={t("bk.sample")}>
        <div className="kpis">
          <Kpi label={t("bk.kpi.banks")} value={String(f.criterio.complete)} sub={t("bk.kpi.banks.sub", { n: f.criterio.nelCampione, c: f.criterio.paesi })} />
          <Kpi label={t("bk.kpi.threshold")} value={pct(f.soglia)} sub={t("bk.kpi.threshold.sub", { n: f.banchesSopra, m: pct(f.mediana), c: pct(f.sogliaPaesi) })} />
          <Kpi label={t("bk.kpi.coverage")} value={pct(f.copertura.bsi, 0)} sub={t("bk.kpi.coverage.sub", { x: pct(f.copertura.consolidato, 0), a: bn(f.copertura.attivo, 0) })} />
          <Kpi label={t("bk.kpi.perEuro")} value={nf(area("m6"), 2)} sub={t("bk.kpi.perEuro.sub", { s: nf(area("soglia"), 2), c: nf(area("continua"), 2), u: nf(sim.coefficienti.uniforme, 2) })} />
        </div>
        <Note id="note.banks.public" vars={{ d: day(f.dati_al.banche), m: month(f.dati_al.bilanciPaese) }} />
        <Note id="note.banks.scenario" />
        <p className="muted tiny">{t("map.scenario", { s: describe(scenario, fx) })} <a href={route.href("simulator")}>{t("bk.change")}</a></p>
      </Card>

      <Card>
        <Chart title={t("bk.chart.title")} unit={t("bk.chart.unit")} source={src} height={440} deps={[shown, bc, cls, query]} onClick={(p) => { const d = p.data as { lei?: string } | undefined; if (d?.lei) open(d.lei); }}
          option={(p) => ({
            grid: grid({ top: 34 }), legend: { ...legendStyle(p), top: 0 },
            tooltip: { ...tooltipStyle(p), trigger: "item", formatter: (x: { data: { nome: string; paese: string; value: number[]; ta: number; cr: number } }) =>
              t("bk.tip", { n: x.data.nome, c: country(x.data.paese), x: nf(x.data.value[0], 1), y: nf(x.data.value[1], 1), ta: bn(x.data.ta, 0), cr: nf(x.data.cr, 2) }) },
            xAxis: { type: "value", name: t("col.retailShare"), nameLocation: "middle", nameGap: 26, min: 0, max: 100, ...axisStyle(p), axisLabel: pctLabel(p) },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: [false, true].map((high, k) => ({
              name: t(high ? "bk.class.high" : "bk.class.low"), type: "scatter", itemStyle: { color: p.series[k], opacity: 0.8, borderColor: p.panel, borderWidth: 1 },
              symbolSize: (v: number[]) => Math.max(6, Math.sqrt(v[2]) * 1.3),
              data: shown.filter((b) => b.retailAlta === high).map((b) => ({ value: [+(100 * b.quotaRetail).toFixed(2), +(100 * b.ingrosso).toFixed(2), b.attivo], lei: b.lei, nome: b.nome, paese: b.paese, ta: b.attivo, cr: b.creditoPct })),
              markLine: k === 0 ? { silent: true, symbol: "none", lineStyle: { color: p.ink2, type: "dashed" }, label: { show: false }, data: [{ xAxis: +(100 * f.soglia).toFixed(2) }] } : undefined,
            })),
          })} />
        <p className="muted tiny">{t("bk.chart.help", { x: pct(f.soglia) })}</p>
      </Card>

      <Card title={t("bk.table", { n: shown.length })}>
        <div className="controls" style={{ marginBottom: 10 }}>
          <Select id="bc" label={t("col.country")} value={bc ?? ""} options={options} onChange={(v) => route.setParams({ bc: v || null })} />
          <Select id="cls" label={t("bk.class")} value={cls ?? ""} options={[["", t("bk.class.all")], ["high", t("bk.class.high")], ["low", t("bk.class.low")]]} onChange={(v) => route.setParams({ cls: v || null })} />
          <div className="field"><label htmlFor="bq">{t("bk.search")}</label><input id="bq" type="search" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        </div>
        <DataTable csvName="banks.csv" rows={shown} initialSort={{ key: "attivo", dir: -1 }} onRow={(r) => open(r.lei)} columns={[
          { key: "nome", label: t("col.bank"), wrap: true, value: (r) => r.nome, format: (r) => <>{r.nome}{r.retailAlta && <span className="tag" title={t("bk.class.high")}>R</span>}</> },
          { key: "paese", label: t("col.country"), value: (r) => r.paese },
          { key: "attivo", label: t("col.totalAssets"), numeric: true, value: (r) => r.attivo, format: (r) => nf(r.attivo, 0) },
          { key: "quotaRetail", label: t("col.retailShare"), numeric: true, value: (r) => r.quotaRetail, format: (r) => pct(r.quotaRetail) },
          { key: "ingrosso", label: t("col.wholesaleTa"), numeric: true, value: (r) => r.ingrosso, format: (r) => pct(r.ingrosso) },
          { key: "vista", label: t("col.sightTa"), numeric: true, value: (r) => r.vista, format: (r) => pct(r.vista) },
          { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 3) },
          { key: "deflussoPp", label: t("col.outflowTa"), numeric: true, value: (r) => r.deflussoPp, format: (r) => nf(r.deflussoPp, 3) },
          { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 3) },
          { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 3) + "%" },
          { key: "usa", label: t("col.us"), numeric: true, value: (r) => r.usa, format: (r) => (r.usa === null ? "–" : pct(r.usa)) },
        ]} />
        <p className="muted tiny"><span className="tag">R</span> {t("bk.tagR", { x: pct(f.soglia) })}</p>
        <Note id="note.banks.usd" vars={{ n: f.copertura.conUsa }} />
      </Card>

      <Card title={t("bk.byCountry")}>
        <DataTable csvName="banks_by_country.csv" rows={byCountry} initialSort={{ key: "banche", dir: -1 }} columns={[
          { key: "nome", label: t("col.country"), value: (r) => country(r.code) },
          { key: "banche", label: t("col.banks"), numeric: true, value: (r) => r.banche }, { key: "alte", label: t("col.banksHigh"), numeric: true, value: (r) => r.alte },
          { key: "cb", label: t("col.coverageBsi"), numeric: true, value: (r) => r.coperturaBsi, format: (r) => (r.coperturaBsi === null ? "–" : pct(r.coperturaBsi, 0)) },
          { key: "cc", label: t("col.coverageCons"), numeric: true, value: (r) => r.coperturaConsolidato, format: (r) => (r.coperturaConsolidato === null ? "–" : pct(r.coperturaConsolidato, 0)) },
          { key: "m6", label: t("col.perEuroBanks"), numeric: true, value: (r) => r.m6, format: (r) => (r.m6 === null ? "–" : nf(r.m6, 2)) },
          { key: "soglia", label: t("col.perEuroThreshold"), numeric: true, value: (r) => r.soglia, format: (r) => nf(r.soglia, 2) },
          { key: "continua", label: t("col.perEuroContinuous"), numeric: true, value: (r) => r.continua, format: (r) => nf(r.continua, 2) },
          { key: "basso", label: t("col.perEuroLow"), numeric: true, value: (r) => r.basso, format: (r) => nf(r.basso, 2) },
          { key: "alto", label: t("col.perEuroHigh"), numeric: true, value: (r) => r.alto, format: (r) => nf(r.alto, 2) },
        ]} />
        <Note id="note.banks.coverage" vars={{ list: f.criterio.paesiSenzaBanche.map(country).join(", ") }} />
        <Note id="note.banks.compare" />
        <p className="muted tiny">{t("bk.excluded", { n: f.criterio.escluse.length, list: f.criterio.escluse.map((b) => b.nome).join("; ") })}</p>
      </Card>
    </>
  );
}

function BankSheet({ b, f, data, scenario }: { b: Line; f: BanksFile; data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  const effects = useMemo(() => sim.predefiniti.map((p) => {
    const r = compute(sim.paesi, sim.coefficienti, { ...scenario, importo: p.eur }).find((x) => x.code === b.paese)!;
    return { id: p.id, importo: p.eur, quota: r.persiCategoria, ...bankEffects([b], { [b.paese]: r.persiCategoria }, sim.coefficienti, scenario.depositi)[0] };
  }), [sim, scenario.sostituzione, scenario.regola, scenario.depositi, b.lei]);
  const other = b.attivo - (b.depFam + b.depImp + b.depAltreFin + b.depBanche + b.titoli);
  const parts: [string, number][] = [["sightHh", b.vistaFam], ["otherHh", b.depFam - b.vistaFam], ["sightNfc", b.vistaImp], ["otherNfc", b.depImp - b.vistaImp],
    ["ofc", b.depAltreFin], ["banks", b.depBanche], ["debt", b.titoli], ["rest", other]];
  const cinfo = f.paesi.find((c) => c.code === b.paese);
  return (
    <>
      <Card title={b.nome} actions={<a className="btn small" href={route.href("banks")}>{t("bk.back")}</a>}>
        <p className="muted tiny">{country(b.paese)} · LEI {b.lei} · {t("bk.src", { d: day(f.dati_al.banche) })}</p>
        <div className="kpis">
          <Kpi label={t("bk.sheet.assets")} value={bn(b.attivo, 1)} sub={cinfo?.attivoCampione ? t("bk.sheet.share", { x: pct(b.attivo / cinfo.attivoCampione, 0), c: country(b.paese) }) : undefined} />
          <Kpi label={t("col.retailShare")} value={pct(b.quotaRetail)} range={t(b.retailAlta ? "bk.sheet.above" : "bk.sheet.below", { x: pct(f.soglia) })} sub={t("bk.sheet.rank", { n: b.rango, tot: f.banche.length })} />
          <Kpi label={t("col.wholesaleTa")} value={pct(b.ingrosso)} sub={t("bk.sheet.wholesale", { a: bn(b.depBanche, 1), b: bn(b.titoli, 1) })} />
          <Kpi label={t("col.sightTa")} value={pct(b.vista)} sub={t("bk.sheet.sight", { x: bn(bankBase(b, "T1"), 1) })} />
          <Kpi label={t("bk.sheet.loans")} value={bn(b.prestiti, 1)} sub={t("bk.sheet.loans.sub", { x: pct(b.prestiti / b.attivo, 0) })} />
          <Kpi label={t("col.us")} value={b.usa === null ? "–" : pct(b.usa)} sub={t(b.usa === null ? "bk.sheet.us.none" : "bk.sheet.us.sub")} />
        </div>
        <Note id="note.banks.public" vars={{ d: day(f.dati_al.banche), m: month(f.dati_al.bilanciPaese) }} />
      </Card>

      <Card>
        <Chart title={t("bk.sheet.chart")} unit={t("bk.sheet.chart.unit")} source={t("bk.src", { d: day(f.dati_al.banche) })} height={300} deps={[b.lei]}
          option={(p) => ({
            grid: grid(), tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            yAxis: { type: "category", inverse: true, data: parts.map(([k]) => t(`bk.part.${k}`)), ...axisStyle(p), splitLine: { show: false } },
            series: [{ type: "bar", barMaxWidth: 16, data: parts.map(([, v], i) => ({ value: +(100 * v / b.attivo).toFixed(2), itemStyle: { color: i < 4 ? p.series[0] : i < 7 ? p.series[1] : p.ink2, borderRadius: [0, 4, 4, 0] } })) }],
          })} />
        <p className="muted tiny">{t("bk.sheet.chart.help")}</p>
      </Card>

      <Card title={t("bk.sheet.effects")}>
        <p className="muted tiny">{t("cs.effects.same", { s: describeChoices(scenario) })} {t(b.retailAlta ? "bk.sheet.coef.high" : "bk.sheet.coef.low", { k: nf(b.retailAlta ? sim.coefficienti.alto : sim.coefficienti.basso, 3) })}</p>
        <DataTable csvName={`bank_${b.lei}.csv`} rows={effects} initialSort={{ key: "importo", dir: 1 }} columns={[
          { key: "nome", label: t("col.scenario"), value: (r) => t(`preset.${r.id}`) },
          { key: "importo", label: t("col.amount"), numeric: true, value: (r) => r.importo, format: (r) => nf(r.importo, 1) },
          { key: "quota", label: t("col.shareLost"), numeric: true, value: (r) => r.quota, format: (r) => pct(r.quota, 2) },
          { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 3) },
          { key: "deflussoPp", label: t("col.outflowTa"), numeric: true, value: (r) => r.deflussoPp, format: (r) => nf(r.deflussoPp, 3) },
          { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 3) },
          { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 3) + "%" },
          { key: "creditoUniforme", label: t("col.creditUniform"), numeric: true, value: (r) => r.creditoUniforme, format: (r) => nf(r.creditoUniforme, 3) },
        ]} />
        <Note id="note.banks.scenario" />
        <Note id="note.credit" />
        <SimpleTable head={[t("col.quantity"), t("col.value")]} numeric={[1]} rows={[
          [t("bk.part.sightHh"), bn(b.vistaFam, 2)], [t("bk.sheet.depHh"), bn(b.depFam, 2)], [t("bk.part.sightNfc"), bn(b.vistaImp, 2)], [t("bk.sheet.depNfc"), bn(b.depImp, 2)],
          [t("bk.part.ofc"), bn(b.depAltreFin, 2)], [t("bk.part.banks"), bn(b.depBanche, 2)], [t("bk.part.debt"), bn(b.titoli, 2)], [t("bk.sheet.loans"), bn(b.prestiti, 2)]]} />
      </Card>
    </>
  );
}
