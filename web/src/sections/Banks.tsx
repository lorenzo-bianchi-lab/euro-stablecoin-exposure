import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Chart, SYMBOLS, axisStyle, barLabel, grid, legendStyle, pctLabel, tooltipStyle } from "../components/Chart";
import { Card, DataTable, Hero, Kpi, Loading, Note, Select, SimpleTable } from "../components/ui";
import { bn, country, day, locale, month, nf, pct, t } from "../i18n";
import { bankBase, bankEffects, compute, creditLoss, type Bank, type BankRow, type Scenario } from "../lib/model";
import type { AppData, Banks as BanksFile } from "../lib/types";
import { useJson, useRoute } from "../lib/util";
import { describe, describeChoices, useResults } from "./shared";

type Line = Bank & BankRow & { ingrosso: number; vista: number };
const wholesale = (b: Bank) => (b.bankDeposits + b.debtSecurities) / b.assets;
/** Position of one value relative to another, compared at the decimals shown. */
const rel = (a: number | null, b: number | null) => {
  const x = Number(nf(a, 2).replace(/[^\d-]/g, "")),
    y = Number(nf(b, 2).replace(/[^\d-]/g, ""));
  return t(`bk.rel.${x > y ? "above" : x < y ? "below" : "same"}`);
};

export default function Banks({ data, scenario, lei }: { data: AppData; scenario: Scenario; lei: string | null }) {
  const { sim } = data;
  const route = useRoute();
  const { data: f, error } = useJson<BanksFile>("banks.json");
  const { rows } = useResults(sim, scenario);
  const [query, setQuery] = useState("");
  const lost = useMemo(() => Object.fromEntries(rows.map((r) => [r.code, r.persiCategoria])), [rows]);
  const lines: Line[] = useMemo(() => {
    if (!f) return [];
    const e = bankEffects(f.banks, lost, sim.coefficients, scenario.depositi);
    return f.banks.map((b, i) => ({ ...b, ...e[i], ingrosso: wholesale(b), vista: (b.householdSight + b.firmSight) / b.assets }));
  }, [f, lost, sim, scenario.depositi]);
  if (!f) return <Loading error={error} />;
  const fx = sim.usdPerEur;
  const one = lei ? lines.find((b) => b.lei === lei) : undefined;
  if (one) return <BankSheet b={one} f={f} data={data} scenario={scenario} />;

  const bc = route.params.get("bc"),
    cls = route.params.get("cls");
  const shown = lines.filter(
    (b) => (!bc || b.country === bc) && (!cls || (cls === "high") === b.highRetail) && (!query || b.name.toLowerCase().includes(query.toLowerCase())),
  );
  const open = (id: string) => {
    window.location.hash = route.href(`banks/${id}`);
  };
  const withBanks = f.countries.filter((c) => c.banks > 0);
  const options: [string, string][] = [
    ["", t("bk.allCountries")],
    ...withBanks.map((c) => [c.code, `${country(c.code)} (${c.banks})`] as [string, string]).sort((a, b) => a[1].localeCompare(b[1], locale())),
  ];
  // by country: credit per euro of outflow, bank by bank, against the module 5 variants on national aggregates
  const byCountry = f.countries.map((c) => {
    const bs = lines.filter((b) => b.country === c.code),
      out = bs.reduce((a, b) => a + b.deflusso, 0);
    const cc = sim.countries.find((x) => x.code === c.code)!,
      r = rows.find((x) => x.code === c.code)!;
    const m5 = (v: "basso" | "alto" | "soglia" | "continua") => (r.deflusso ? creditLoss(cc, sim.coefficients, r.deflusso, v) / r.deflusso : null);
    return {
      ...c,
      m6: out ? bs.reduce((a, b) => a + b.credito, 0) / out : null,
      soglia: m5("soglia"),
      continua: m5("continua"),
      basso: m5("basso"),
      alto: m5("alto"),
    };
  });
  const coveredOut = byCountry.reduce((a, c) => a + (c.m6 === null ? 0 : rows.find((x) => x.code === c.code)!.deflusso), 0);
  const area = (k: "m6" | "soglia" | "continua") =>
    coveredOut ? byCountry.reduce((a, c) => a + (c.m6 === null ? 0 : (c[k] ?? 0) * rows.find((x) => x.code === c.code)!.deflusso), 0) / coveredOut : null;
  const m6 = area("m6"),
    soglia = area("soglia"),
    continua = area("continua"),
    uniforme = sim.coefficients.uniform;
  const covered = byCountry.filter((c) => c.m6 !== null).length;
  const src = t("bk.src", { d: day(f.data_as_of.banks) });

  // alternative text of the chart: range of the retail share and the bank with the most wholesale funding
  const byRetail = [...shown].sort((a, b) => a.retailShare - b.retailShare),
    topW = [...shown].sort((a, b) => b.ingrosso - a.ingrosso)[0];
  const alt = shown.length
    ? t("bk.chart.alt", {
        n: shown.length,
        a: pct(byRetail[0].retailShare),
        b: pct(byRetail[byRetail.length - 1].retailShare),
        h: shown.filter((b) => b.highRetail).length,
        x: pct(f.threshold),
        w: topW.name,
        y: pct(topW.ingrosso),
      })
    : t("ui.noRows");

  return (
    <>
      <Hero
        label={t("bk.hero.label")}
        value={nf(m6, 2)}
        range={t("bk.hero.range", { n: covered })}
        text={t("bk.hero.text", {
          rs: rel(m6, soglia),
          s: nf(soglia, 2),
          rc: rel(m6, continua),
          c: nf(continua, 2),
          ru: rel(m6, uniforme),
          u: nf(uniforme, 2),
        })}
      >
        <div className="kpis" style={{ marginBottom: 0 }}>
          <Kpi
            label={t("bk.kpi.banks")}
            value={String(f.criterion.complete)}
            sub={t("bk.kpi.banks.sub", { n: f.criterion.inSample, c: f.criterion.countries })}
          />
          <Kpi
            label={t("bk.kpi.threshold")}
            value={pct(f.threshold)}
            sub={t("bk.kpi.threshold.sub", { n: f.banksAbove, m: pct(f.median), c: pct(f.countryThreshold) })}
          />
          <Kpi
            label={t("bk.kpi.coverage")}
            value={pct(f.coverage.bsi, 0)}
            sub={t("bk.kpi.coverage.sub", { x: pct(f.coverage.consolidated, 0), a: bn(f.coverage.assets, 0) })}
          />
        </div>
      </Hero>
      <div style={{ marginBottom: "var(--space-5)" }}>
        <p className="muted tiny" style={{ marginTop: "var(--space-2)" }}>
          {t("bk.scenario", { s: describe(scenario, fx) })} <a href={route.href("simulator")}>{t("bk.change")}</a>
        </p>
      </div>

      <Card>
        <Chart
          title={t("bk.chart.title")}
          unit={t("bk.chart.unit")}
          source={src}
          height={420}
          alt={alt}
          deps={[shown, bc, cls, query, alt]}
          onClick={(p) => {
            const d = p.data as { lei?: string } | undefined;
            if (d?.lei) open(d.lei);
          }}
          option={(p) => ({
            grid: grid({ top: 34, right: 24 }),
            legend: { ...legendStyle(p), top: 0, left: 0 },
            tooltip: {
              ...tooltipStyle(p),
              trigger: "item",
              formatter: (x: { data: { nome: string; paese: string; value: number[]; ta: number; cr: number } }) =>
                t("bk.tip", {
                  n: x.data.nome,
                  c: country(x.data.paese),
                  x: nf(x.data.value[0], 1),
                  y: nf(x.data.value[1], 1),
                  ta: bn(x.data.ta, 0),
                  cr: nf(x.data.cr, 2),
                }),
            },
            xAxis: {
              type: "value",
              name: t("col.retailShare"),
              nameLocation: "middle",
              nameGap: 26,
              min: 0,
              max: 100,
              ...axisStyle(p),
              axisLabel: pctLabel(p),
            },
            yAxis: { type: "value", ...axisStyle(p), axisLabel: pctLabel(p) },
            series: [false, true].map((high, k) => ({
              name: t(high ? "bk.class.high" : "bk.class.low"),
              type: "scatter",
              symbol: SYMBOLS[high ? 2 : 0],
              itemStyle: { color: high ? p.accent : p.series[0], opacity: 0.75, borderColor: p.panel, borderWidth: 1 },
              symbolSize: (v: number[]) => Math.max(7, Math.sqrt(v[2]) * 1.2),
              data: shown
                .filter((b) => b.highRetail === high)
                .map((b) => ({
                  value: [+(100 * b.retailShare).toFixed(2), +(100 * b.ingrosso).toFixed(2), b.assets],
                  lei: b.lei,
                  nome: b.name,
                  paese: b.country,
                  ta: b.assets,
                  cr: b.creditoPct,
                })),
              markLine:
                k === 0
                  ? {
                      silent: true,
                      symbol: "none",
                      lineStyle: { color: p.ink2, type: "dashed" },
                      label: { show: true, position: "insideEndTop", color: p.ink2, fontSize: 11, formatter: t("bk.chart.threshold", { x: pct(f.threshold) }) },
                      data: [{ xAxis: +(100 * f.threshold).toFixed(2) }],
                    }
                  : undefined,
            })),
          })}
        />
        <p className="muted tiny" style={{ marginBottom: 0 }}>
          {t("bk.chart.help", { x: pct(f.threshold) })}
        </p>
      </Card>

      <section className="card" id="banks-table" data-total={shown.length}>
        <header className="card-head">
          <h2>{t("bk.table", { n: shown.length })}</h2>
        </header>
        <div className="controls" style={{ marginBottom: "var(--space-3)" }}>
          <Select id="bc" label={t("col.country")} value={bc ?? ""} options={options} onChange={(v) => route.setParams({ bc: v || null })} />
          <Select
            id="cls"
            label={t("bk.class")}
            value={cls ?? ""}
            options={[
              ["", t("bk.class.all")],
              ["high", t("bk.class.high")],
              ["low", t("bk.class.low")],
            ]}
            onChange={(v) => route.setParams({ cls: v || null })}
          />
          <div className="field">
            <label htmlFor="bq">{t("bk.search")}</label>
            <input id="bq" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <DataTable
          compact
          pageSize={20}
          csvName="banks.csv"
          rows={shown}
          initialSort={{ key: "attivo", dir: -1 }}
          onRow={(r) => open(r.lei)}
          columns={[
            {
              key: "nome",
              label: t("col.bank"),
              wrap: true,
              value: (r) => r.name,
              format: (r) => (
                <>
                  {r.name}
                  {r.highRetail && (
                    <span className="tag" title={t("bk.class.high")}>
                      {t("bk.tag")}
                    </span>
                  )}
                </>
              ),
            },
            { key: "paese", label: t("bk.col.country"), value: (r) => r.country },
            { key: "attivo", label: t("col.totalAssets"), numeric: true, value: (r) => r.assets, format: (r) => nf(r.assets, 0) },
            { key: "quotaRetail", label: t("bk.col.retail"), numeric: true, value: (r) => r.retailShare, format: (r) => pct(r.retailShare) },
            { key: "ingrosso", label: t("bk.col.wholesale"), numeric: true, value: (r) => r.ingrosso, format: (r) => pct(r.ingrosso) },
            { key: "vista", label: t("bk.col.sight"), numeric: true, value: (r) => r.vista, format: (r) => pct(r.vista) },
            { key: "deflusso", label: t("bk.col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 3) },
            { key: "creditoPct", label: t("bk.col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 3) + "%" },
            { key: "usa", label: t("bk.col.us"), numeric: true, value: (r) => r.usa, format: (r) => (r.usa === null ? "–" : pct(r.usa)) },
          ]}
        />
        <p className="muted tiny">
          <span className="tag" style={{ marginLeft: 0 }}>
            {t("bk.tag")}
          </span>{" "}
          {t("bk.tagR", { x: pct(f.threshold) })}
        </p>
        <Note id="note.banks.public" vars={{ d: day(f.data_as_of.banks), m: month(f.data_as_of.countryBalanceSheets) }} />
        <Note id="note.banks.scenario" />
        <Note id="note.banks.usd" vars={{ n: f.coverage.withUsa }} />
      </section>

      <Card title={t("bk.byCountry")}>
        <DataTable
          compact
          csvName="banks_by_country.csv"
          rows={byCountry}
          initialSort={{ key: "banche", dir: -1 }}
          columns={[
            { key: "nome", label: t("col.country"), value: (r) => country(r.code) },
            { key: "banche", label: t("col.banks"), numeric: true, value: (r) => r.banks },
            { key: "alte", label: t("col.banksHigh"), numeric: true, value: (r) => r.highRetailBanks },
            {
              key: "cb",
              label: t("col.coverageBsi"),
              numeric: true,
              value: (r) => r.coverageBsi,
              format: (r) => (r.coverageBsi === null ? "–" : pct(r.coverageBsi, 0)),
            },
            {
              key: "cc",
              label: t("col.coverageCons"),
              numeric: true,
              value: (r) => r.coverageConsolidated,
              format: (r) => (r.coverageConsolidated === null ? "–" : pct(r.coverageConsolidated, 0)),
            },
            {
              key: "m6",
              label: t("col.perEuroBanks"),
              numeric: true,
              value: (r) => r.m6,
              format: (r) => (r.m6 === null ? "–" : <strong>{nf(r.m6, 2)}</strong>),
            },
            { key: "soglia", label: t("col.perEuroThreshold"), numeric: true, value: (r) => r.soglia, format: (r) => nf(r.soglia, 2) },
            { key: "continua", label: t("col.perEuroContinuous"), numeric: true, value: (r) => r.continua, format: (r) => nf(r.continua, 2) },
            { key: "basso", label: t("col.perEuroLow"), numeric: true, value: (r) => r.basso, format: (r) => nf(r.basso, 2) },
            { key: "alto", label: t("col.perEuroHigh"), numeric: true, value: (r) => r.alto, format: (r) => nf(r.alto, 2) },
          ]}
        />
        <Note id="note.banks.coverage" vars={{ list: f.criterion.countriesWithoutBanks.map(country).join(", ") }} />
        <Note id="note.banks.compare" />
        <p className="muted tiny" style={{ marginTop: "var(--space-3)", marginBottom: 0 }}>
          {t("bk.excluded", { n: f.criterion.excluded.length, list: f.criterion.excluded.map((b) => b.name).join("; ") })}
        </p>
      </Card>
    </>
  );
}

function BankSheet({ b, f, data, scenario }: { b: Line; f: BanksFile; data: AppData; scenario: Scenario }) {
  const { sim } = data;
  const route = useRoute();
  // every preset scenario, plus the simulator's one at the top
  const { importo, sostituzione, regola, depositi, credito } = scenario;
  const effects = useMemo(
    () =>
      [{ id: "current", eur: importo }, ...sim.presets].map((p) => {
        const r = compute(sim.countries, sim.coefficients, { importo: p.eur, sostituzione, regola, depositi, credito }).find((x) => x.code === b.country)!;
        return { id: p.id, importo: p.eur, quota: r.persiCategoria, ...bankEffects([b], { [b.country]: r.persiCategoria }, sim.coefficients, depositi)[0] };
      }),
    [sim, importo, sostituzione, regola, depositi, credito, b],
  );
  const other = b.assets - (b.householdDeposits + b.firmDeposits + b.otherFinancialDeposits + b.bankDeposits + b.debtSecurities);
  const parts: [string, number][] = [
    ["sightHh", b.householdSight],
    ["otherHh", b.householdDeposits - b.householdSight],
    ["sightNfc", b.firmSight],
    ["otherNfc", b.firmDeposits - b.firmSight],
    ["ofc", b.otherFinancialDeposits],
    ["banks", b.bankDeposits],
    ["debt", b.debtSecurities],
    ["rest", other],
  ];
  const share = parts.map(([, v]) => +((100 * v) / b.assets).toFixed(2));
  const big = share.indexOf(Math.max(...share));
  const chartAlt = t("bk.sheet.chart.alt", {
    k: t(`bk.part.${parts[big][0]}`),
    v: nf(share[big], 1),
    d: nf(
      share.slice(0, 4).reduce((a, x) => a + x, 0),
      1,
    ),
    w: nf(
      share.slice(4, 7).reduce((a, x) => a + x, 0),
      1,
    ),
  });
  const cinfo = f.countries.find((c) => c.code === b.country);
  const src = t("bk.src", { d: day(f.data_as_of.banks) });
  const k = b.highRetail ? sim.coefficients.high : sim.coefficients.low;
  return (
    <>
      <Card
        title={b.name}
        actions={
          <a className="btn small" href={route.href("banks")}>
            <ArrowLeft className="icon" aria-hidden="true" />
            {t("bk.back")}
          </a>
        }
      >
        <p className="muted tiny" style={{ margin: 0 }}>
          {t("bk.sheet.meta", { c: country(b.country), lei: b.lei, s: src })}
        </p>
      </Card>

      <Hero
        label={t("col.retailShare")}
        value={pct(b.retailShare)}
        range={t("bk.sheet.hero.range", {
          a: t(b.highRetail ? "bk.sheet.above" : "bk.sheet.below", { x: pct(f.threshold) }),
          r: t("bk.sheet.rank", { n: b.rank, tot: f.banks.length }),
        })}
        text={t(b.highRetail ? "bk.sheet.coef.high" : "bk.sheet.coef.low", { k: nf(k, 3) })}
      >
        <div className="kpis" style={{ marginBottom: 0 }}>
          <Kpi
            label={t("bk.sheet.assets")}
            value={bn(b.assets, 1)}
            sub={cinfo?.sampleAssets ? t("bk.sheet.share", { x: pct(b.assets / cinfo.sampleAssets, 0), c: country(b.country) }) : undefined}
          />
          <Kpi label={t("col.wholesaleTa")} value={pct(b.ingrosso)} sub={t("bk.sheet.wholesale", { a: bn(b.bankDeposits, 1), b: bn(b.debtSecurities, 1) })} />
          <Kpi label={t("col.sightTa")} value={pct(b.vista)} sub={t("bk.sheet.sight", { x: bn(bankBase(b, "T1"), 1) })} />
          <Kpi label={t("bk.sheet.loans")} value={bn(b.loans, 1)} sub={t("bk.sheet.loans.sub", { x: pct(b.loans / b.assets, 0) })} />
          <Kpi label={t("col.us")} value={b.usa === null ? "–" : pct(b.usa)} sub={t(b.usa === null ? "bk.sheet.us.none" : "bk.sheet.us.sub")} />
        </div>
      </Hero>

      <Card>
        <Chart
          title={t("bk.sheet.chart")}
          unit={t("bk.sheet.chart.unit")}
          source={src}
          height={300}
          alt={chartAlt}
          deps={[b.lei]}
          option={(p) => ({
            grid: grid({ left: 16, right: 56 }),
            tooltip: { ...tooltipStyle(p), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => nf(v, 1) + "%" },
            xAxis: { type: "value", ...axisStyle(p), axisLabel: { show: false }, splitLine: { show: false } },
            yAxis: {
              type: "category",
              inverse: true,
              data: parts.map(([key]) => t(`bk.part.${key}`)),
              ...axisStyle(p),
              axisLabel: { color: p.ink2, fontSize: 11 },
              splitLine: { show: false },
            },
            series: [
              {
                type: "bar",
                barMaxWidth: 16,
                label: barLabel(p, (v) => nf(v, 1) + "%"),
                data: share.map((v, i) => ({
                  value: v,
                  itemStyle: { color: i < 4 ? p.series[0] : i < 7 ? p.series[2] : p.series[3], borderRadius: [0, 3, 3, 0] },
                })),
              },
            ],
          })}
        />
        <p className="muted tiny">{t("bk.sheet.chart.help")}</p>
        <Note id="note.banks.public" vars={{ d: day(f.data_as_of.banks), m: month(f.data_as_of.countryBalanceSheets) }} />
      </Card>

      <Card title={t("bk.sheet.effects")}>
        <p className="muted tiny">
          {t("bk.effects.same", { s: describeChoices(scenario) })} <a href={route.href("simulator")}>{t("bk.change")}</a>
        </p>
        <DataTable
          compact
          csvName={`bank_${b.lei}.csv`}
          rows={effects}
          initialSort={{ key: "importo", dir: 1 }}
          columns={[
            {
              key: "nome",
              label: t("col.scenario"),
              value: (r) => (r.id === "current" ? t("bk.sheet.current") : t(`preset.${r.id}`)),
              format: (r) => (r.id === "current" ? <strong>{t("bk.sheet.current")}</strong> : t(`preset.${r.id}`)),
            },
            { key: "importo", label: t("col.amount"), numeric: true, value: (r) => r.importo, format: (r) => nf(r.importo, 1) },
            { key: "quota", label: t("col.shareLost"), numeric: true, value: (r) => r.quota, format: (r) => pct(r.quota, 2) },
            { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 3) },
            { key: "deflussoPp", label: t("col.outflowTa"), numeric: true, value: (r) => r.deflussoPp, format: (r) => nf(r.deflussoPp, 3) },
            { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 3) },
            { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 3) + "%" },
            { key: "creditoUniforme", label: t("col.creditUniform"), numeric: true, value: (r) => r.creditoUniforme, format: (r) => nf(r.creditoUniforme, 3) },
          ]}
        />
        <Note id="note.banks.scenario" />
        <Note id="note.credit" />
      </Card>

      <Card title={t("bk.sheet.items")}>
        <SimpleTable
          compact
          head={[t("col.quantity"), t("col.value")]}
          numeric={[1]}
          rows={[
            [t("bk.part.sightHh"), bn(b.householdSight, 2)],
            [t("bk.sheet.depHh"), bn(b.householdDeposits, 2)],
            [t("bk.part.sightNfc"), bn(b.firmSight, 2)],
            [t("bk.sheet.depNfc"), bn(b.firmDeposits, 2)],
            [t("bk.part.ofc"), bn(b.otherFinancialDeposits, 2)],
            [t("bk.part.banks"), bn(b.bankDeposits, 2)],
            [t("bk.part.debt"), bn(b.debtSecurities, 2)],
            [t("bk.sheet.loans"), bn(b.loans, 2)],
            [t("bk.sheet.assets"), bn(b.assets, 2)],
          ]}
        />
      </Card>
    </>
  );
}
