// Scenario model: the same formulas as modules 4 and 5 (src/module4_scenarios.py,
// src/module5_credit.py). Pure functions, with no access to the page: the test
// tests/model.test.ts compares them with the results of the Python scripts.

export type Rule = "R1" | "R2" | "R3";
export type DepositType = "T1" | "T2" | "T3";
export type CreditVariant = "uniforme" | "continua" | "soglia" | "basso" | "alto";

export interface Country {
  code: string;
  nome: string;
  vista: number;
  vistaFam: number;
  clientela: number;
  ingrosso: number;
  totale: number;
  prestiti: number;
  pop: number;
  r3: number;
  quotaPossessori: number;
  possessoriImputati: boolean;
  quotaRetail: number;
  retailAlta: boolean;
  pesoContinuo: number;
  posizione: number;
  indicatore: number;
  c1: number;
  c2: number;
  c3: number;
  usd: number;
  fonteUsd: string;
  quadrante: string;
}
export interface Coefficients {
  uniforme: number;
  sd: number;
  basso: number;
  alto: number;
  bassoCol4: number;
  altoCol4: number;
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

const base = (c: Country, t: DepositType) => (t === "T1" ? c.vista : t === "T2" ? c.vistaFam : c.clientela);

/** Outflow by country in EUR billion: amount × substitution, allocated with the chosen rule. */
export function allocate(countries: Country[], importoEur: number, sostituzione: number, regola: Rule, depositi: DepositType): number[] {
  const eur = importoEur * sostituzione;
  const w = countries.map((c) => (regola === "R1" ? base(c, depositi) : regola === "R2" ? c.pop : c.r3));
  const W = w.reduce((a, b) => a + b, 0);
  return countries.map((c, i) => Math.min((eur * w[i]) / W, base(c, depositi)));
}

/** Credit reduction in EUR billion, for one variant of the coefficients of ECB Working Paper 3199. */
export function creditLoss(c: Country, k: Coefficients, deflusso: number, variante: CreditVariant): number {
  const sd = (100 * deflusso) / c.totale / k.sd; // outflow in standard deviations of deposits over total assets
  const basso = ((k.basso * sd) / 100) * c.prestiti;
  const alto = ((k.alto * sd) / 100) * c.prestiti;
  switch (variante) {
    case "uniforme":
      return k.uniforme * deflusso;
    case "basso":
      return basso;
    case "alto":
      return alto;
    case "soglia":
      return c.retailAlta ? alto : basso;
    case "continua":
      return basso + (alto - basso) * c.pesoContinuo;
  }
}

export function compute(countries: Country[], k: Coefficients, s: Scenario): Row[] {
  const out = allocate(countries, s.importo, s.sostituzione, s.regola, s.depositi);
  return countries.map((c, i) => {
    const f = out[i];
    const daVista = s.depositi === "T3" ? (f * c.vista) / c.clientela : f;
    const cr = creditLoss(c, k, f, s.credito);
    return {
      code: c.code,
      nome: c.nome,
      deflusso: f,
      persiVista: daVista / c.vista,
      persiCategoria: f / base(c, s.depositi),
      persiClientela: f / c.clientela,
      effettoPp: (100 * f) / c.totale,
      aumentoIngrosso: f / c.ingrosso,
      credito: cr,
      creditoPct: (100 * cr) / c.prestiti,
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
  const vistaPersa = rows.reduce((a, r, i) => a + r.persiVista * countries[i].vista, 0);
  return {
    deflusso,
    persiVista: vistaPersa / sum((c) => c.vista),
    persiClientela: deflusso / sum((c) => c.clientela),
    effettoPp: (100 * deflusso) / sum((c) => c.totale),
    aumentoIngrosso: deflusso / sum((c) => c.ingrosso),
    credito,
    creditoPct: (100 * credito) / sum((c) => c.prestiti),
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
  minimo: number;
  centrale: number;
  massimo: number;
  estremoSuperiore: number;
}

/**
 * Uncertainty range of the scenario. It combines three sources:
 *  - the level: the chosen amount is scaled like the interval of the estimate (minimum/centre, maximum/centre);
 *  - the substitution: from 50% to 100% of the funds comes from bank deposits;
 *  - the credit: low coefficient at the lower end, high coefficient at the upper end.
 */
export function band(countries: Country[], k: Coefficients, s: Scenario, level: Level, sostMin = 0.5, sostMax = 1.0): Band {
  const lo = compute(countries, k, { ...s, importo: (s.importo * level.minimo) / level.centrale, sostituzione: sostMin, credito: "basso" });
  const hi = compute(countries, k, { ...s, importo: (s.importo * level.massimo) / level.centrale, sostituzione: sostMax, credito: "alto" });
  const tl = totals(countries, lo),
    th = totals(countries, hi);
  return { deflusso: [tl.deflusso, th.deflusso], credito: [tl.credito, th.credito], persiVista: [tl.persiVista, th.persiVista] };
}

export interface LevelBand {
  minimo: number;
  centrale: number;
  massimo: number;
  percentuale: number;
}
export type LevelCase = "minimo" | "centrale" | "massimo";

/** Bottom-up estimate of the level, in EUR billion (src/level_own.py, function b1). */
export function levelEstimate(bands: LevelBand[], unita: number, quotaDetentori: number, quotaDollari: number, caso: LevelCase, ultimaFascia?: number): number {
  const tot = bands.reduce((a, b) => a + b.percentuale, 0);
  const media = bands.reduce((a, b, i) => a + (i === bands.length - 1 && ultimaFascia !== undefined ? ultimaFascia : b[caso]) * b.percentuale, 0) / tot;
  return (unita * quotaDetentori * media * quotaDollari) / 1e9;
}

// ---------- module 6: individual banks (src/module6_banks.py)
export interface Bank {
  lei: string;
  nome: string;
  paese: string;
  attivo: number;
  depFam: number;
  vistaFam: number;
  depImp: number;
  vistaImp: number;
  depAltreFin: number;
  depBanche: number;
  titoli: number;
  prestiti: number;
  quotaRetail: number;
  retailAlta: boolean;
  rango: number;
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
export const bankBase = (b: Bank, t: DepositType) => (t === "T1" ? b.vistaFam + b.vistaImp : t === "T2" ? b.vistaFam : b.depFam + b.depImp);

/**
 * Effect of the scenario bank by bank: each bank loses the same share of deposits as its country
 * (quotaPersa[paese] = Row.persiCategoria). The coefficient is the high one for banks above the
 * retail-share threshold across banks, the low one for the others.
 */
export function bankEffects(banks: Bank[], quotaPersa: Record<string, number>, k: Coefficients, depositi: DepositType): BankRow[] {
  return banks.map((b) => {
    const deflusso = (quotaPersa[b.paese] ?? 0) * bankBase(b, depositi);
    const sd = (100 * deflusso) / b.attivo / k.sd;
    const basso = ((k.basso * sd) / 100) * b.prestiti,
      alto = ((k.alto * sd) / 100) * b.prestiti;
    const credito = b.retailAlta ? alto : basso;
    return {
      lei: b.lei,
      deflusso,
      deflussoPp: (100 * deflusso) / b.attivo,
      credito,
      creditoPct: b.prestiti ? (100 * credito) / b.prestiti : 0,
      creditoBasso: basso,
      creditoAlto: alto,
      creditoUniforme: k.uniforme * deflusso,
    };
  });
}
