import { useMemo } from "react";
import { bn, country, nf, pct, t } from "../i18n";
import { band, compute, totals, type Row, type Scenario } from "../lib/model";
import type { SimData } from "../lib/types";
import type { Column } from "../components/ui";

/** Risultati dello scenario, ricalcolati nel browser con le formule dei moduli 4 e 5. */
export function useResults(sim: SimData, s: Scenario) {
  return useMemo(() => {
    const rows = compute(sim.paesi, sim.coefficienti, s);
    return { rows, tot: totals(sim.paesi, rows), band: band(sim.paesi, sim.coefficienti, s, sim.livello, sim.incertezza.sostituzioneMinima, sim.incertezza.sostituzioneMassima) };
  }, [sim, s.importo, s.sostituzione, s.regola, s.depositi, s.credito]);
}

const choices = (s: Scenario) => ({ sub: Math.round(s.sostituzione * 100), rule: t(`rule.${s.regola}`), dep: t(`dep.${s.depositi}`), credit: t(`credit.${s.credito}.short`) });
/** Lo scenario in una riga. */
export const describe = (s: Scenario, fx: number) => t("sc.describe", { eur: bn(s.importo), usd: bn(s.importo * fx, 1, "usd"), ...choices(s) });
/** Le scelte dello scenario senza l'importo. */
export const describeChoices = (s: Scenario) => t("sc.describeChoices", choices(s));

export const resultColumns = (sim: SimData): Column<Row>[] => {
  const flag = Object.fromEntries(sim.paesi.map((c) => [c.code, c.retailAlta]));
  return [
    { key: "nome", label: t("col.country"), value: (r) => country(r.code), format: (r) => <>{country(r.code)}{flag[r.code] && <span className="tag" title={t("col.aboveThreshold")}>R</span>}</> },
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
/** Stato di una segnalazione: il codice nei dati è in italiano, la classe CSS e la chiave di traduzione no. */
export const flagKey = (stato?: string) => ({ segnale: "signal", "da verificare": "check", nessuno: "none", "storico insufficiente": "short" }[stato ?? ""] ?? "na");
