// Scenario model: the same formulas as modules 4 and 5 (src/module4_scenarios.py,
// src/module5_credit.py). Pure functions, with no access to the page: the test
// tests/model.test.ts compares them with the results of the Python scripts.

export type Rule = "R1" | "R2" | "R3";
export type DepositType = "T1" | "T2" | "T3";
export type CreditVariant = "uniforme" | "continua" | "soglia" | "basso" | "alto";

// Country, Coefficients, Level, LevelBand and Bank describe the data files (web/public/data); the
// other types are results computed here.
export interface Country {
  code: string;
  name: string;
  sight: number;
  householdSight: number;
  customerDeposits: number;
  wholesale: number;
  total: number;
  loans: number;
  pop: number;
  r3: number;
  ownerShare: number;
  ownersImputed: boolean;
  retailShare: number;
  highRetail: boolean;
  continuousWeight: number;
  rank: number;
  indicator: number;
  c1: number;
  c2: number;
  c3: number;
  usd: number;
  usdSource: string;
  quadrant: string;
}
export interface Coefficients {
  uniform: number;
  sd: number;
  low: number;
  high: number;
  lowCol4: number;
  highCol4: number;
}
export interface Scenario {
  importo: number;
  sostituzione: number;
  regola: Rule;
  depositi: DepositType;
  credito: CreditVariant;
}
export interface Row {
  code: string;
  nome: string;
  deflusso: number;
  persiVista: number;
  persiCategoria: number;
  persiClientela: number;
  effettoPp: number;
  aumentoIngrosso: number;
  credito: number;
  creditoPct: number;
  creditoBasso: number;
  creditoAlto: number;
}
export interface Totals {
  deflusso: number;
  persiVista: number;
  persiClientela: number;
  effettoPp: number;
  aumentoIngrosso: number;
  credito: number;
  creditoPct: number;
  creditoBasso: number;
  creditoAlto: number;
}

const base = (c: Country, t: DepositType) => (t === "T1" ? c.sight : t === "T2" ? c.householdSight : c.customerDeposits);

/** Outflow by country in EUR billion: amount × substitution, allocated with the chosen rule. */
export function allocate(countries: Country[], importoEur: number, sostituzione: number, regola: Rule, depositi: DepositType): number[] {
  const eur = importoEur * sostituzione;
  const w = countries.map((c) => (regola === "R1" ? base(c, depositi) : regola === "R2" ? c.pop : c.r3));
  const W = w.reduce((a, b) => a + b, 0);
  return countries.map((c, i) => Math.min((eur * w[i]) / W, base(c, depositi)));
}

/** Credit reduction in EUR billion, for one variant of the coefficients of ECB Working Paper 3199. */
export function creditLoss(c: Country, k: Coefficients, deflusso: number, variante: CreditVariant): number {
  const sd = (100 * deflusso) / c.total / k.sd; // outflow in standard deviations of deposits over total assets
  const basso = ((k.low * sd) / 100) * c.loans;
  const alto = ((k.high * sd) / 100) * c.loans;
  switch (variante) {
    case "uniforme":
      return k.uniform * deflusso;
    case "basso":
      return basso;
    case "alto":
      return alto;
    case "soglia":
      return c.highRetail ? alto : basso;
    case "continua":
      return basso + (alto - basso) * c.continuousWeight;
  }
}

export function compute(countries: Country[], k: Coefficients, s: Scenario): Row[] {
  const out = allocate(countries, s.importo, s.sostituzione, s.regola, s.depositi);
  return countries.map((c, i) => {
    const f = out[i];
    const daVista = s.depositi === "T3" ? (f * c.sight) / c.customerDeposits : f;
    const cr = creditLoss(c, k, f, s.credito);
    return {
      code: c.code,
      nome: c.name,
      deflusso: f,
      persiVista: daVista / c.sight,
      persiCategoria: f / base(c, s.depositi),
      persiClientela: f / c.customerDeposits,
      effettoPp: (100 * f) / c.total,
      aumentoIngrosso: f / c.wholesale,
      credito: cr,
      creditoPct: (100 * cr) / c.loans,
      creditoBasso: creditLoss(c, k, f, "basso"),
      creditoAlto: creditLoss(c, k, f, "alto"),
    };
  });
}

export function totals(countries: Country[], rows: Row[]): Totals {
  const sum = (f: (c: Country) => number) => countries.reduce((a, c) => a + f(c), 0);
  const add = (f: (r: Row) => number) => rows.reduce((a, r) => a + f(r), 0);
  const deflusso = add((r) => r.deflusso);
  const credito = add((r) => r.credito);
  const vistaPersa = rows.reduce((a, r, i) => a + r.persiVista * countries[i].sight, 0);
  return {
    deflusso,
    persiVista: vistaPersa / sum((c) => c.sight),
    persiClientela: deflusso / sum((c) => c.customerDeposits),
    effettoPp: (100 * deflusso) / sum((c) => c.total),
    aumentoIngrosso: deflusso / sum((c) => c.wholesale),
    credito,
    creditoPct: (100 * credito) / sum((c) => c.loans),
    creditoBasso: add((r) => r.creditoBasso),
    creditoAlto: add((r) => r.creditoAlto),
  };
}

export interface Band {
  deflusso: [number, number];
  credito: [number, number];
  persiVista: [number, number];
}
export interface Level {
  min: number;
  central: number;
  max: number;
  upperBound: number;
}

/**
 * Uncertainty range of the scenario. It combines three sources:
 *  - the level: the chosen amount is scaled like the interval of the estimate (minimum/centre, maximum/centre);
 *  - the substitution: from 50% to 100% of the funds comes from bank deposits;
 *  - the credit: low coefficient at the lower end, high coefficient at the upper end.
 */
export function band(countries: Country[], k: Coefficients, s: Scenario, level: Level, sostMin = 0.5, sostMax = 1.0): Band {
  const lo = compute(countries, k, { ...s, importo: (s.importo * level.min) / level.central, sostituzione: sostMin, credito: "basso" });
  const hi = compute(countries, k, { ...s, importo: (s.importo * level.max) / level.central, sostituzione: sostMax, credito: "alto" });
  const tl = totals(countries, lo),
    th = totals(countries, hi);
  return { deflusso: [tl.deflusso, th.deflusso], credito: [tl.credito, th.credito], persiVista: [tl.persiVista, th.persiVista] };
}

/** A band of amounts held: its bounds are keyed by the level case, the same ids as the address (caso=...). */
export interface LevelBand {
  minimo: number;
  centrale: number;
  massimo: number;
  percentage: number;
}
export type LevelCase = "minimo" | "centrale" | "massimo";

/** Bottom-up estimate of the level, in EUR billion (src/level_own.py, function b1). */
export function levelEstimate(bands: LevelBand[], unita: number, quotaDetentori: number, quotaDollari: number, caso: LevelCase, ultimaFascia?: number): number {
  const tot = bands.reduce((a, b) => a + b.percentage, 0);
  const media = bands.reduce((a, b, i) => a + (i === bands.length - 1 && ultimaFascia !== undefined ? ultimaFascia : b[caso]) * b.percentage, 0) / tot;
  return (unita * quotaDetentori * media * quotaDollari) / 1e9;
}

// ---------- module 6: individual banks (src/module6_banks.py)
export interface Bank {
  lei: string;
  name: string;
  country: string;
  assets: number;
  householdDeposits: number;
  householdSight: number;
  firmDeposits: number;
  firmSight: number;
  otherFinancialDeposits: number;
  bankDeposits: number;
  debtSecurities: number;
  loans: number;
  retailShare: number;
  highRetail: boolean;
  rank: number;
  usa: number | null;
}
export interface BankRow {
  lei: string;
  deflusso: number;
  deflussoPp: number;
  credito: number;
  creditoPct: number;
  creditoBasso: number;
  creditoAlto: number;
  creditoUniforme: number;
}

/** Deposits of the bank in the category hit by the scenario. */
export const bankBase = (b: Bank, t: DepositType) =>
  t === "T1" ? b.householdSight + b.firmSight : t === "T2" ? b.householdSight : b.householdDeposits + b.firmDeposits;

/**
 * Effect of the scenario bank by bank: each bank loses the same share of deposits as its country
 * (quotaPersa[country] = Row.persiCategoria). The coefficient is the high one for banks above the
 * retail-share threshold across banks, the low one for the others.
 */
export function bankEffects(banks: Bank[], quotaPersa: Record<string, number>, k: Coefficients, depositi: DepositType): BankRow[] {
  return banks.map((b) => {
    const deflusso = (quotaPersa[b.country] ?? 0) * bankBase(b, depositi);
    const sd = (100 * deflusso) / b.assets / k.sd;
    const basso = ((k.low * sd) / 100) * b.loans,
      alto = ((k.high * sd) / 100) * b.loans;
    const credito = b.highRetail ? alto : basso;
    return {
      lei: b.lei,
      deflusso,
      deflussoPp: (100 * deflusso) / b.assets,
      credito,
      creditoPct: b.loans ? (100 * credito) / b.loans : 0,
      creditoBasso: basso,
      creditoAlto: alto,
      creditoUniforme: k.uniform * deflusso,
    };
  });
}
