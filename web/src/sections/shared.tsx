import { useMemo } from "react";
import { bn, country, nf, pct, t } from "../i18n";
import { band, compute, totals, type Row, type Scenario } from "../lib/model";
import type { SimData } from "../lib/types";
import type { Column } from "../components/ui";

/** Results of the scenario, recomputed in the browser with the formulas of modules 4 and 5. */
export function useResults(sim: SimData, s: Scenario) {
  // the scenario object is new at every render: the results depend only on its five values
  const { importo, sostituzione, regola, depositi, credito } = s;
  return useMemo(() => {
    const sc: Scenario = { importo, sostituzione, regola, depositi, credito };
    const rows = compute(sim.countries, sim.coefficients, sc);
    return {
      rows,
      tot: totals(sim.countries, rows),
      band: band(sim.countries, sim.coefficients, sc, sim.level, sim.uncertainty.minSubstitution, sim.uncertainty.maxSubstitution),
    };
  }, [sim, importo, sostituzione, regola, depositi, credito]);
}

const choices = (s: Scenario) => ({
  sub: Math.round(s.sostituzione * 100),
  rule: t(`rule.${s.regola}`),
  dep: t(`dep.${s.depositi}`),
  credit: t(`credit.${s.credito}.short`),
});
/** The scenario in one line. */
export const describe = (s: Scenario, fx: number) => t("sc.describe", { eur: bn(s.importo), usd: bn(s.importo * fx, 1, "usd"), ...choices(s) });
/** The choices of the scenario without the amount. */
export const describeChoices = (s: Scenario) => t("sc.describeChoices", choices(s));

export const resultColumns = (sim: SimData): Column<Row>[] => {
  const flag = Object.fromEntries(sim.countries.map((c) => [c.code, c.highRetail]));
  return [
    {
      key: "nome",
      label: t("col.country"),
      value: (r) => country(r.code),
      format: (r) => (
        <>
          {country(r.code)}
          {flag[r.code] && (
            <span className="tag" title={t("col.aboveThreshold")}>
              R
            </span>
          )}
        </>
      ),
    },
    { key: "deflusso", label: t("col.outflow"), numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 2) },
    { key: "persiVista", label: t("col.sightLost"), numeric: true, value: (r) => r.persiVista, format: (r) => pct(r.persiVista, 2) },
    { key: "effettoPp", label: t("col.fundingEffect"), numeric: true, value: (r) => r.effettoPp, format: (r) => nf(r.effettoPp, 2) },
    { key: "aumentoIngrosso", label: t("col.wholesale"), numeric: true, value: (r) => r.aumentoIngrosso, format: (r) => pct(r.aumentoIngrosso, 1) },
    { key: "credito", label: t("col.credit"), numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 2) },
    { key: "creditoPct", label: t("col.creditPct"), numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 2) + "%" },
    { key: "creditoBasso", label: t("col.creditLow"), numeric: true, value: (r) => r.creditoBasso, format: (r) => nf(r.creditoBasso, 2) },
    { key: "creditoAlto", label: t("col.creditHigh"), numeric: true, value: (r) => r.creditoAlto, format: (r) => nf(r.creditoAlto, 2) },
  ];
};

export const SERIES_IDS = ["usdt", "usdt_senza_coinbase", "usdc", "usdc_senza_coinbase"];
/** State of a flag: the code in the data is in Italian, the CSS class and the translation key are not. */
export const flagKey = (stato?: string) =>
  ({ segnale: "signal", "da verificare": "check", nessuno: "none", "storico insufficiente": "short" })[stato ?? ""] ?? "na";
