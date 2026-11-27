import type { Bank, Coefficients, Country, Level, LevelBand } from "./model";

// Shape of the data files (web/public/data, written by src/export_app_data.py). Objects keyed by an id
// that can appear in an address keep that id as key: series (usdt_senza_coinbase), level case
// (minimo, centrale, massimo), counting unit (famiglie, individui), credit variant (uniforme, ...).
export interface Preset {
  id: string;
  eur: number;
}
export interface SimData {
  data_as_of: Record<string, string>;
  usdPerEur: number;
  exchangeRateDate: string;
  balanceSheetMonth: string;
  countries: Country[];
  presets: Preset[];
  coefficients: Coefficients;
  retailThreshold: number;
  anchors: { low_anchor: number; high_anchor: number };
  level: Level;
  uncertainty: { minSubstitution: number; maxSubstitution: number };
  medians: { c1: number; usd: number };
}
export interface SourceDetail {
  message?: string;
  exchange?: number;
  noResponse?: string[];
  volumeShare?: number;
  dataUntil?: string;
  neverAvailable?: string[];
  heldWeeks?: string[];
}
export interface Source {
  id: string;
  module: string;
  dateType: string;
  dataAsOf: string;
  status: string;
  detail: SourceDetail;
}
export interface Meta {
  generated_on: string;
  update: { ranOn: string | null; mode: string | null; modules: Record<string, { outcome: string; seconds?: number; message?: string }> };
  sources: Source[];
  staleSources: string[];
  partialSources: string[];
  file: string[];
  mapAvailable: boolean;
}
export interface FlagState {
  status?: string;
  share_deviation?: number;
  volume_deviation?: number;
  eur_share?: number;
  volume_eur_bn?: number;
  value: number;
  change: number;
}
export interface Overview {
  data_as_of: { balanceSheets: string; week: string; circulation: string };
  level: Level & { esmBase: number; esmHigh: number };
  centralScenario: {
    outflow: number;
    sightDepositsLost: number;
    wholesaleIncrease: number;
    creditUniform: number;
    creditLow: number;
    creditHigh: number;
    creditPct: number;
  };
  index: Record<string, FlagState>;
  ranking: { code: string; rank: number; c1: number }[];
  areaSightDeposits: number;
  areaLoans: number;
  predictiveTest: string;
}
export interface CountryFile {
  code: string;
  composition: { months: string[]; total: number[]; items: Record<string, number[]> };
  indicator: { months: string[]; value: number[]; rank: number[]; countries: number[]; c1: number[]; c2: number[]; c3: number[] };
}
export interface Channels {
  medians: { c1: number; usd: number };
  rankCorrelation: number;
  sourceComparison: { countries_with_both: number; countries_with_full_bsi: number; median_ratio_bsi_to_bis: number; rank_correlation: number };
  changeWithRescaling: string[];
  quadrants: string[];
  data_as_of: { balanceSheets: string; dollars: string };
}
export interface WeeklySeries {
  weeks: string[];
  [k: string]: number[] | string[];
}
export interface FlagSeries {
  weeks: string[];
  share: number[];
  volumeEur: number[];
  shareDeviation: (number | null)[];
  volumeDeviation: (number | null)[];
  status: string[];
}
export interface ExclusionEffect {
  excluded: string[];
  weeks_compared: number;
  first_week?: string;
  last_week?: string;
  volume_share_of_excluded?: { mean: number; max: number; last_week: number };
  difference_pp?: Record<string, { mean: number; max_abs: number; week_of_max: string; last_week: number }>;
  flags_changed?: number;
}
export interface Monitor {
  data_as_of: { lastWeek: string };
  series: string[];
  main: WeeklySeries;
  long: WeeklySeries;
  flags: Record<string, FlagSeries>;
  statistics: Record<string, Record<string, number | string>>;
  panel: { exchange: number; exchange_long_index: number; excluded: string[]; excluded_long_index: string[] };
  exclusionEffect: ExclusionEffect;
  heldWeeks: Record<string, { missing_exchanges: string[]; missing_volume_share: number }>;
  missingSources?: { exchange: string[]; pairs: string[]; neverAvailable: string[]; volumeShare: number; dataUntil: string | null } | null;
  predictiveTest: { answer: string; pValue: number; observations: number; rmseRatio: number };
}
export interface LevelFile {
  data_as_of: { survey: string; circulation: string };
  bands: LevelBand[];
  holderShare: number;
  dollarShare: { minimo: number; centrale: number; massimo: number };
  units: { famiglie: number; individui: number };
  reference: { min_bn_eur: number; central_bn_eur: number; max_bn_eur: number; declared_upper_bound_bn_eur: number };
  esm: { date: string; baseEur: number; highEur: number; series: { months: string[]; base: number[]; high: number[] } };
  otherRoutes: { b2: { customerBalancesBnUsd: number | null }; b3: { central: number | null } };
  criterionMet: boolean;
}
export interface BiTable {
  columns: string[];
  rows: string[][];
}
export interface Method {
  sources: Record<string, BiTable>;
  limits: Record<string, string[]>;
  discardedMethods: Record<string, BiTable>;
  repo: string;
}
export interface BankCountry {
  code: string;
  banks: number;
  highRetailBanks: number;
  sampleAssets: number | null;
  coverageBsi: number | null;
  coverageConsolidated: number | null;
  m6PerEuro: number | null;
  m5: Record<string, number | null>;
  m5HighRetail: boolean;
}
export interface Banks {
  data_as_of: { banks: string; countryBalanceSheets: string };
  banks: Bank[];
  countries: BankCountry[];
  threshold: number;
  median: number;
  countryThreshold: number;
  banksAbove: number;
  criterion: {
    inSample: number;
    complete: number;
    countries: number;
    met: boolean;
    countriesWithoutBanks: string[];
    excluded: { lei: string; name: string; country: string }[];
  };
  coverage: { bsi: number; consolidated: number | null; assets: number; withUsa: number };
  comparison: Record<string, number>;
}
export interface AppData {
  sim: SimData;
  meta: Meta;
  overview: Overview;
}
