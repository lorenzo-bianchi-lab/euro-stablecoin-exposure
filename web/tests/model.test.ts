// Il modello dell'applicazione deve dare gli stessi numeri degli script Python.
// I valori attesi sono generati da tests/make_app_fixtures.py con i moduli 4 e 5.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compute, levelEstimate, totals, type Coefficients, type Country, type CreditVariant, type LevelBand, type Scenario } from "../src/lib/model";

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), "utf-8"));
const sim = read("../public/data/simulatore.json") as { paesi: Country[]; coefficienti: Coefficients };
const livello = read("../public/data/livello.json") as { fasce: LevelBand[]; quotaDetentori: number; quotaDollari: Record<string, number>; unita: Record<string, number> };
const fx = read("./fixtures.json") as {
  casi: { scenario: Omit<Scenario, "credito">; paesi: Record<string, Record<string, number>>; totale: Record<string, number> }[];
  livello: Record<string, Record<string, number>>;
};
const VARIANTI: CreditVariant[] = ["uniforme", "basso", "alto", "soglia", "continua"];
// i dati esportati sono arrotondati a sei decimali: la tolleranza è sull'ultima cifra, in termini relativi
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-5 * Math.max(1, Math.abs(b)));

describe("scenari: applicazione e script Python coincidono", () => {
  it("ci sono almeno tre scenari per ogni regola", () => {
    for (const r of ["R1", "R2", "R3"]) expect(fx.casi.filter((c) => c.scenario.regola === r).length).toBeGreaterThanOrEqual(3);
  });
  for (const caso of fx.casi) {
    const s = caso.scenario;
    it(`${s.regola}, ${s.depositi}, ${s.importo.toFixed(1)} mld €, sostituzione ${s.sostituzione}`, () => {
      for (const v of VARIANTI) {
        const rows = compute(sim.paesi, sim.coefficienti, { ...s, credito: v });
        expect(rows.length).toBe(21);
        for (const r of rows) {
          const e = caso.paesi[r.code];
          close(r.deflusso, e.deflusso); close(r.persiVista, e.persiVista); close(r.persiClientela, e.persiClientela);
          close(r.effettoPp, e.effettoPp); close(r.aumentoIngrosso, e.aumentoIngrosso); close(r.credito, e[`credito_${v}`]);
        }
        const t = totals(sim.paesi, rows);
        close(t.deflusso, caso.totale.deflusso); close(t.credito, caso.totale[`credito_${v}`]);
      }
    });
  }
});

describe("stima del livello: applicazione e script Python coincidono", () => {
  for (const unita of ["famiglie", "individui"] as const) {
    for (const caso of ["minimo", "centrale", "massimo"] as const) {
      it(`${unita}, ${caso}`, () => {
        close(levelEstimate(livello.fasce, livello.unita[unita], livello.quotaDetentori, livello.quotaDollari[caso], caso), fx.livello[unita][caso]);
      });
    }
  }
});
