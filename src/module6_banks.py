"""Module 6: individual euro area banks, with the data of the EBA 2025 transparency exercise.

Definitions and criteria are in SPEC.md (module 6), written before the results. For each
bank: retail share as in ECB Working Paper 3199, position relative to the 75th percentile
among banks, wholesale funding, effect of a scenario on deposits and credit with the high
and low coefficients applied bank by bank; then re-aggregation by country, comparison with
module 5 and coverage.

These are public bank-level data, at the highest level of consolidation, as at 30 June 2025:
they are not confidential supervisory data and the ordering is not a judgement on soundness.

Inputs: EBA 2025 transparency exercise, full database (CSV files and TR_Metadata.xlsx), reduced
to data/raw/eba_te2025_extract.csv and data/raw/eba_te2025_banks.csv; ECB Data Portal CBD2
(consolidated total assets, data/raw/m6_cbd2_total_assets.csv); data/raw/m3_bsi.csv,
data/raw/m4_inputs.json, data/processed/level_own.json, m5_credit_by_country.csv and m5_summary.json.
Outputs: data/processed/m6_banks.csv, m6_by_country.csv and m6_summary.json.

Usage: python src/module6_banks.py             # recompute from the extract already present (download it if missing)
       python src/module6_banks.py --download  # download the EBA files again and rebuild the extract
       python src/module6_banks.py --offline   # download nothing
"""

from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests

import module4_scenarios as m4
from module5_credit import COEF, EURO_AREA, NAMES, RETAIL_PERCENTILE, SD_DEPOSITS_PP

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
FULL = RAW / "eba_te2025"  # full files, not committed (the largest is 123 MB)
EXTRACT, BANKS, CBD = RAW / "eba_te2025_extract.csv", RAW / "eba_te2025_banks.csv", RAW / "m6_cbd2_total_assets.csv"
EBA = "https://www.eba.europa.eu/assets/TE2025/Full_database/883401/"
PERIOD, PERIOD_MONTH, PERIOD_QUARTER = "202506", "2025-06", "2025-Q2"
US_COUNTRY = "43"  # EBA code of the United States (TR_Metadata, Country sheet)
MIN_BANKS, MIN_COUNTRIES = 50, 15  # sufficiency criterion (SPEC)
CBD_KEY = "Q..W0.67._Z._Z.A.A.A0000._X.ALL.CA._Z.LE._T.EUR"  # consolidated total assets of all banks in the country

# EBA counterparty sector -> Exposure code (dimension filter on the items)
SECTORS = {"central_bank": "101", "government": "102", "bank": "201", "other_financial": "202", "firm": "301", "household": "401"}
# data/processed/m6_summary.json keeps its Italian keys: columns of m6_by_country.csv -> keys of that file
BY_COUNTRY_JSON = {
    "country": "paese",
    "name": "nome",
    "banks": "banche",
    "high_retail_share_banks": "banche_alta_quota_retail",
    "sample_total_assets": "totale_attivo_campione",
    "sample_outflow": "deflusso_campione",
    "sample_credit": "credito_campione",
    "sample_loans": "prestiti_campione",
    "bsi_total_assets": "totale_attivo_bsi",
    "coverage_bsi": "copertura_su_bsi",
    "consolidated_total_assets": "totale_attivo_consolidato",
    "coverage_consolidated": "copertura_su_consolidato",
    "m6_credit_per_euro": "m6_credito_per_euro",
    "m6_credit_pct_loans": "m6_credito_pct_prestiti",
    "m5_high_retail_share": "m5_quota_retail_alta",
    "country_outflow": "deflusso_paese",
    "m6_credit_scaled_to_country": "m6_credito_riportato_al_paese",
    "m5_soglia_bn": "m5_soglia_mld",
    "m5_continua_bn": "m5_continua_mld",
    "m5_uniforme_bn": "m5_uniforme_mld",
}


def download(name: str, force: bool = False) -> Path:
    FULL.mkdir(parents=True, exist_ok=True)
    path = FULL / name
    if path.exists() and not force:
        return path
    with requests.get(EBA + name, timeout=600, stream=True) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return path


def build_extract(force: bool = False) -> None:
    """Keeps only the rows used from the full files: same content, no value modified."""
    oth = pd.read_csv(download("tr_oth.csv", force), dtype=str)
    cre = pd.read_csv(download("tr_cre.csv", force), dtype=str)
    oth = oth[(oth.Period == PERIOD) & oth.Item.isin(["2521010", "2521214", "2521215", "2521216"])]
    oth = oth.assign(Country="0", Portfolio="0")[
        ["LEI_Code", "NSA", "Period", "Item", "Label", "Exposure", "Financial_instruments", "Country", "Portfolio", "Amount", "Sheet"]
    ]
    cre = cre[cre.Period == PERIOD]
    npe = cre[(cre.Sheet == "NPE") & cre.Item.isin(["2520603", "2520605"]) & (cre.Perf_Status == "0")]
    exp = cre[(cre.Item == "2520502") & (cre.Status == "0") & cre.Country.isin(["0", US_COUNTRY])]
    cre = pd.concat([npe, exp]).assign(Financial_instruments="0")[oth.columns]
    pd.concat([oth, cre]).sort_values(["LEI_Code", "Sheet", "Item", "Exposure", "Financial_instruments", "Country", "Portfolio"]).to_csv(
        EXTRACT, index=False
    )

    import openpyxl

    wb = openpyxl.load_workbook(download("TR_Metadata.xlsx", force), read_only=True)
    rows = [r[:4] for r in wb["List of Institutions"].iter_rows(values_only=True)][2:]
    pd.DataFrame([r for r in rows if r[2]], columns=["country", "country_name", "lei", "name"]).to_csv(BANKS, index=False)


def fetch_cbd() -> None:
    r = requests.get(
        "https://data-api.ecb.europa.eu/service/data/CBD2/" + CBD_KEY,
        params={"format": "csvdata", "detail": "dataonly", "startPeriod": PERIOD_QUARTER, "endPeriod": PERIOD_QUARTER},
        timeout=120,
    )
    r.raise_for_status()
    d = pd.read_csv(io.StringIO(r.text))
    d = d[d.REF_AREA.isin(EURO_AREA)][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].rename(
        columns={"REF_AREA": "country", "TIME_PERIOD": "quarter", "OBS_VALUE": "eur_thousand"}
    )
    d.to_csv(CBD, index=False)


def load_banks() -> pd.DataFrame:
    """One row per euro area bank, amounts in EUR billion."""
    x = pd.read_csv(EXTRACT, dtype=str)
    x["Amount"] = pd.to_numeric(x.Amount, errors="coerce") / 1000  # from millions to billions
    names = pd.read_csv(BANKS).set_index("lei")

    def pick(item: str, **dims) -> pd.Series:
        sel = x[x.Item == item]
        for k, v in dims.items():
            sel = sel[sel[k] == v]
        return sel.groupby("LEI_Code").Amount.sum(min_count=1)

    cols = {
        "total_assets": pick("2521010"),
        "total_liabilities": pick("2521214"),
        "equity": pick("2521216"),
        "debt_securities": pick("2521215", Financial_instruments="40"),
        "derivative_liabilities": pick("2521215", Financial_instruments="12"),
        "household_loans": pick("2520605", Exposure="401"),
        "firm_loans": pick("2520605", Exposure="301"),
        "total_loans": pick("2520603"),
        "us_exposure": pick("2520502", Country=US_COUNTRY),
        "total_exposure": pick("2520502", Country="0"),
    }
    for name, code in SECTORS.items():
        cols[f"{name}_deposits"] = pick("2521215", Exposure=code, Financial_instruments="30")
        cols[f"{name}_sight_deposits"] = pick("2521215", Exposure=code, Financial_instruments="31")
    b = pd.DataFrame(cols)
    b.insert(0, "country", x.groupby("LEI_Code").NSA.first())
    b.insert(1, "name", names["name"].reindex(b.index))
    b = b[b.country.isin(EURO_AREA) & b["name"].notna()].copy()
    b.index.name = "lei"
    return b


def indicators(b: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    need = [
        "total_assets",
        "household_deposits",
        "firm_deposits",
        "other_financial_deposits",
        "bank_deposits",
        "household_sight_deposits",
        "firm_sight_deposits",
        "debt_securities",
        "household_loans",
        "firm_loans",
    ]
    b["complete_data"] = b[need].notna().all(axis=1) & (b.total_assets > 0) & ((b.household_deposits + b.other_financial_deposits) > 0)
    b["retail_share"] = b.household_deposits / (b.household_deposits + b.other_financial_deposits)
    threshold = float(np.percentile(b.retail_share[b.complete_data], RETAIL_PERCENTILE))
    b["high_retail_share"] = b.retail_share > threshold
    b["sight_deposits"] = b.household_sight_deposits + b.firm_sight_deposits  # T1
    b["customer_deposits"] = b.household_deposits + b.firm_deposits  # T3
    b["loans"] = b.household_loans + b.firm_loans
    b["wholesale_funding"] = b.bank_deposits + b.debt_securities
    b["wholesale_funding_to_assets"] = b.wholesale_funding / b.total_assets
    b["sight_deposits_to_assets"] = b.sight_deposits / b.total_assets
    b["customer_deposits_to_assets"] = b.customer_deposits / b.total_assets
    b["loans_to_assets"] = b.loans / b.total_assets
    b["us_share_of_exposures"] = b.us_exposure / b.total_exposure  # empty if the United States is not among the top ten countries
    b["retail_share_rank"] = b.retail_share.rank(ascending=False, method="min")
    return b, threshold


def bank_effects(b: pd.DataFrame, lost_share: pd.Series, base: str = "sight_deposits") -> pd.DataFrame:
    """Effect of a scenario bank by bank: the same share of deposits lost as in the bank's own country."""
    out = pd.DataFrame(index=b.index)
    out["outflow"] = b.country.map(lost_share) * b[base]
    sd = 100 * out.outflow / b.total_assets / SD_DEPOSITS_PP
    out["credit_low"] = COEF["col3"]["basso"] * sd / 100 * b.loans
    out["credit_high"] = COEF["col3"]["alto"] * sd / 100 * b.loans
    out["credit"] = np.where(b.high_retail_share, out.credit_high, out.credit_low)
    out["credit_pct_loans"] = 100 * out.credit / b.loans
    out["outflow_to_assets_pp"] = 100 * out.outflow / b.total_assets
    return out


def main() -> None:
    args = set(sys.argv[1:])
    offline = "--offline" in args
    if "--download" in args or (not offline and not (EXTRACT.exists() and BANKS.exists())):
        build_extract("--download" in args)
    if not offline and ("--download" in args or not CBD.exists()):
        try:
            fetch_cbd()
        except Exception as exc:  # the coverage on consolidated data is an addition: without it, the BSI coverage remains
            print(f"ECB consolidated banking data not downloaded: {exc}")

    b, threshold = indicators(load_banks())
    ok = b[b.complete_data].copy()
    sufficient = len(ok) >= MIN_BANKS and ok.country.nunique() >= MIN_COUNTRIES

    # Control scenario: central level, R1, sight deposits of households and firms, full substitution
    bal, month = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
    alloc = m4.allocate(bal, ref["centrale_mld_eur"], "R1", "T1", pd.Series(inp["popolazione"], dtype=float))
    lost = alloc.outflow_bn / bal.vista
    eff = bank_effects(ok, lost)
    ok = ok.join(eff)
    cols = [
        "country",
        "name",
        "total_assets",
        "household_deposits",
        "household_sight_deposits",
        "firm_deposits",
        "firm_sight_deposits",
        "other_financial_deposits",
        "bank_deposits",
        "central_bank_deposits",
        "government_deposits",
        "debt_securities",
        "household_loans",
        "firm_loans",
        "us_exposure",
        "total_exposure",
        "retail_share",
        "high_retail_share",
        "retail_share_rank",
        "sight_deposits",
        "customer_deposits",
        "loans",
        "wholesale_funding",
        "wholesale_funding_to_assets",
        "sight_deposits_to_assets",
        "customer_deposits_to_assets",
        "loans_to_assets",
        "us_share_of_exposures",
        "outflow",
        "outflow_to_assets_pp",
        "credit",
        "credit_low",
        "credit_high",
        "credit_pct_loans",
    ]
    ok[cols].round(6).sort_values("retail_share", ascending=False).to_csv(PROC / "m6_banks.csv")

    # By country: coverage and comparison with module 5
    m3 = pd.read_csv(RAW / "m3_bsi.csv", dtype={"month": str})
    bsi = m3[(m3.month == PERIOD_MONTH) & (m3.series == "totale")].set_index("country").eur_mn / 1000
    cbd = (pd.read_csv(CBD).set_index("country").eur_thousand / 1e6) if CBD.exists() else pd.Series(dtype=float)
    m5 = pd.read_csv(PROC / "m5_credit_by_country.csv")
    m5 = m5[(m5.scenario == "P_centrale") & (m5.country_rule == "R1")].set_index("country")
    g = ok.groupby("country")
    c = pd.DataFrame(
        {
            "banks": g.size(),
            "high_retail_share_banks": g.high_retail_share.sum(),
            "sample_total_assets": g.total_assets.sum(),
            "sample_outflow": g.outflow.sum(),
            "sample_credit": g.credit.sum(),
            "sample_loans": g.loans.sum(),
        }
    ).reindex(EURO_AREA)
    c.insert(0, "name", [NAMES[k] for k in c.index])
    c["banks"] = c.banks.fillna(0).astype(int)
    c["bsi_total_assets"] = bsi.reindex(c.index)
    c["coverage_bsi"] = c.sample_total_assets / c.bsi_total_assets
    c["consolidated_total_assets"] = cbd.reindex(c.index)
    c["coverage_consolidated"] = c.sample_total_assets / c.consolidated_total_assets
    c["m6_credit_per_euro"] = c.sample_credit / c.sample_outflow
    c["m6_credit_pct_loans"] = 100 * c.sample_credit / c.sample_loans
    for k in ("basso", "alto", "soglia", "continua", "uniforme"):
        c[f"m5_{k}_per_euro"] = m5[f"{k}_bn"] / m5.outflow_bn
    c["m5_high_retail_share"] = m5.high_retail_share.reindex(c.index)
    c["country_outflow"] = m5.outflow_bn
    c["m6_credit_scaled_to_country"] = c.m6_credit_per_euro * c.country_outflow  # credit per euro of the banks × outflow of the country
    c["m5_soglia_bn"], c["m5_continua_bn"], c["m5_uniforme_bn"] = m5.soglia_bn, m5.continua_bn, m5.uniforme_bn
    c.round(6).to_csv(PROC / "m6_by_country.csv")

    cov = c[c.banks > 0]
    area = {
        "deflusso_paesi_coperti": float(cov.country_outflow.sum()),
        "m6": float(cov.m6_credit_scaled_to_country.sum()),
        "m5_soglia": float(cov.m5_soglia_bn.sum()),
        "m5_continua": float(cov.m5_continua_bn.sum()),
        "m5_uniforme": float(cov.m5_uniforme_bn.sum()),
        "m5_basso": float((cov.m5_basso_per_euro * cov.country_outflow).sum()),
        "m5_alto": float((cov.m5_alto_per_euro * cov.country_outflow).sum()),
    }
    area["m6_per_euro"] = area["m6"] / area["deflusso_paesi_coperti"]
    summary = {
        "fonte": "EBA, 2025 transparency exercise (published on 4 December 2025), full database",
        "data_dei_dati": "2025-06-30",
        "avvertenza": (
            "Public bank-level data at the highest level of consolidation: they are not confidential "
            "supervisory data and the ordering is not a judgement on soundness."
        ),
        "criterio_di_sufficienza": {
            "banche_minime": MIN_BANKS,
            "paesi_minimi": MIN_COUNTRIES,
            "banche_area_euro_nel_campione": int(len(b)),
            "banche_con_dati_completi": int(len(ok)),
            "paesi_coperti": int(ok.country.nunique()),
            "soddisfatto": bool(sufficient),
            "paesi_senza_banche": sorted(set(EURO_AREA) - set(ok.country)),
            "banche_escluse": [{"lei": k, "nome": r["name"], "paese": r.country} for k, r in b[~b.complete_data].iterrows()],
        },
        "voci_trovate": {
            "depositi_famiglie_e_imprese": True,
            "di_cui_a_vista": True,
            "depositi_da_banche": True,
            "titoli_emessi": True,
            "totale_attivo": True,
            "prestiti_a_famiglie_e_imprese": True,
            "esposizioni_in_dollari": False,
            "nota_dollari": (
                "No breakdown by currency. The original credit exposures to US counterparties are reported, "
                "published only when the United States is among the bank's top ten countries."
            ),
        },
        "soglia_quota_retail": {
            "percentile": RETAIL_PERCENTILE,
            "valore": threshold,
            "banche_sopra": int(ok.high_retail_share.sum()),
            "mediana": float(ok.retail_share.median()),
            "soglia_tra_paesi_modulo5": json.loads((PROC / "m5_summary.json").read_text())["soglia_quota_retail"]["valore"],
        },
        "campione": {
            "totale_attivo_mld": float(ok.total_assets.sum()),
            "copertura_area_su_bsi": float(c.sample_total_assets.sum() / c.bsi_total_assets.sum()),
            "copertura_area_su_consolidato": float(c.sample_total_assets.sum() / c.consolidated_total_assets.sum())
            if c.consolidated_total_assets.notna().any()
            else None,
            "banche_con_esposizione_usa": int(ok.us_exposure.notna().sum()),
            "mese_bsi": PERIOD_MONTH,
            "trimestre_consolidato": PERIOD_QUARTER if CBD.exists() else None,
        },
        "scenario_di_controllo": {
            "importo_mld_eur": ref["centrale_mld_eur"],
            "regola_paesi": "R1",
            "regola_depositi": "T1",
            "sostituzione": 1.0,
            "mese_bilanci_paese": month,
        },
        "confronto_modulo5_paesi_coperti": area,
        "per_paese": c.reset_index().rename(columns={"index": "paese", **BY_COUNTRY_JSON}).replace({np.nan: None}).to_dict("records"),
        "prime_dieci_per_credito_pct": [
            {
                "lei": k,
                "nome": r["name"],
                "paese": r.country,
                "quota_retail": float(r.retail_share),
                "credito_pct_prestiti": float(r.credit_pct_loans),
            }
            for k, r in ok.sort_values("credit_pct_loans", ascending=False).head(10).iterrows()
        ],
    }
    (PROC / "m6_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(
        json.dumps(
            {k: summary[k] for k in ("criterio_di_sufficienza", "soglia_quota_retail", "campione", "confronto_modulo5_paesi_coperti")},
            indent=1,
            ensure_ascii=False,
        )
    )
    if not sufficient:
        sys.exit("sufficiency criterion not met: the aggregate supervisory statistics are needed")


if __name__ == "__main__":
    main()
