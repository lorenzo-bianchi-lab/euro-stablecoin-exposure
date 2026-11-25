import { useMemo } from "react";
import { band, compute, totals, type Row, type Scenario } from "../lib/model";
import type { SimData } from "../lib/types";
import { CREDIT_LABELS, DEPOSIT_LABELS, RULE_LABELS, nf, pct } from "../lib/util";
import type { Column } from "../components/ui";

/** Risultati dello scenario, ricalcolati nel browser con le formule dei moduli 4 e 5. */
export function useResults(sim: SimData, s: Scenario) {
  return useMemo(() => {
    const rows = compute(sim.paesi, sim.coefficienti, s);
    return { rows, tot: totals(sim.paesi, rows), band: band(sim.paesi, sim.coefficienti, s, sim.livello, sim.incertezza.sostituzioneMinima, sim.incertezza.sostituzioneMassima) };
  }, [sim, s.importo, s.sostituzione, s.regola, s.depositi, s.credito]);
}

export const describe = (s: Scenario, fx: number) =>
  `${nf(s.importo, 1)} mld € (${nf(s.importo * fx, 1)} mld $), sostituzione ${Math.round(s.sostituzione * 100)}%, ${RULE_LABELS[s.regola]}, ${DEPOSIT_LABELS[s.depositi]}, credito: ${CREDIT_LABELS[s.credito].split(":")[0].toLowerCase()}`;

export const resultColumns = (sim: SimData): Column<Row>[] => {
  const flag = Object.fromEntries(sim.paesi.map((c) => [c.code, c.retailAlta]));
  return [
    { key: "nome", label: "Paese", value: (r) => r.nome, format: (r) => <>{r.nome}{flag[r.code] && <span className="tag" title="Sopra la soglia di quota retail">R</span>}</> },
    { key: "deflusso", label: "Deflusso (mld €)", numeric: true, value: (r) => r.deflusso, format: (r) => nf(r.deflusso, 2) },
    { key: "persiVista", label: "Depositi a vista persi", numeric: true, value: (r) => r.persiVista, format: (r) => pct(r.persiVista, 2) },
    { key: "effettoPp", label: "Effetto sulla raccolta (punti del passivo)", numeric: true, value: (r) => r.effettoPp, format: (r) => nf(r.effettoPp, 2) },
    { key: "aumentoIngrosso", label: "Raccolta all'ingrosso in più", numeric: true, value: (r) => r.aumentoIngrosso, format: (r) => pct(r.aumentoIngrosso, 1) },
    { key: "credito", label: "Credito in meno (mld €)", numeric: true, value: (r) => r.credito, format: (r) => nf(r.credito, 2) },
    { key: "creditoPct", label: "Credito in meno (% dei prestiti)", numeric: true, value: (r) => r.creditoPct, format: (r) => nf(r.creditoPct, 2) + "%" },
    { key: "creditoBasso", label: "Credito, coeff. basso (mld €)", numeric: true, value: (r) => r.creditoBasso, format: (r) => nf(r.creditoBasso, 2) },
    { key: "creditoAlto", label: "Credito, coeff. alto (mld €)", numeric: true, value: (r) => r.creditoAlto, format: (r) => nf(r.creditoAlto, 2) },
  ];
};

export const CREDIT_NOTE = "Il credito in meno applica coefficienti del Working Paper BCE 3199, stimati su singole banche, ad aggregati nazionali: ordini di grandezza, non previsioni. Effetto cumulato su 24 mesi.";
export const FLOW_NOTE = "Il deflusso assume che le stablecoin siano state comprate con depositi bancari nella quota scelta, e che la ripartizione tra paesi segua la regola scelta: l'adozione per paese non è osservata.";
