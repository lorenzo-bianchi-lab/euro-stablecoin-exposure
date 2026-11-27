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
SECTORS = {"banche_centrali": "101", "governo": "102", "banche": "201", "altre_fin": "202", "imprese": "301", "famiglie": "401"}


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
    pd.DataFrame([r for r in rows if r[2]], columns=["paese", "nome_paese", "lei", "nome"]).to_csv(BANKS, index=False)


def fetch_cbd() -> None:
    r = requests.get(
        "https://data-api.ecb.europa.eu/service/data/CBD2/" + CBD_KEY,
        params={"format": "csvdata", "detail": "dataonly", "startPeriod": PERIOD_QUARTER, "endPeriod": PERIOD_QUARTER},
        timeout=120,
    )
    r.raise_for_status()
    d = pd.read_csv(io.StringIO(r.text))
    d = d[d.REF_AREA.isin(EURO_AREA)][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].rename(
        columns={"REF_AREA": "paese", "TIME_PERIOD": "trimestre", "OBS_VALUE": "migliaia_eur"}
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
        "totale_attivo": pick("2521010"),
        "totale_passivo": pick("2521214"),
        "patrimonio": pick("2521216"),
        "titoli_emessi": pick("2521215", Financial_instruments="40"),
        "derivati_passivi": pick("2521215", Financial_instruments="12"),
        "prestiti_fam": pick("2520605", Exposure="401"),
        "prestiti_imp": pick("2520605", Exposure="301"),
        "prestiti_totali": pick("2520603"),
        "esposizione_usa": pick("2520502", Country=US_COUNTRY),
        "esposizione_totale": pick("2520502", Country="0"),
    }
    for name, code in SECTORS.items():
        cols[f"dep_{name}"] = pick("2521215", Exposure=code, Financial_instruments="30")
        cols[f"vista_{name}"] = pick("2521215", Exposure=code, Financial_instruments="31")
    b = pd.DataFrame(cols)
    b.insert(0, "paese", x.groupby("LEI_Code").NSA.first())
    b.insert(1, "nome", names.nome.reindex(b.index))
    b = b[b.paese.isin(EURO_AREA) & b.nome.notna()].copy()
    b.index.name = "lei"
    return b


def indicators(b: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    need = [
        "totale_attivo",
        "dep_famiglie",
        "dep_imprese",
        "dep_altre_fin",
        "dep_banche",
        "vista_famiglie",
        "vista_imprese",
        "titoli_emessi",
        "prestiti_fam",
        "prestiti_imp",
    ]
    b["dati_completi"] = b[need].notna().all(axis=1) & (b.totale_attivo > 0) & ((b.dep_famiglie + b.dep_altre_fin) > 0)
    b["quota_retail"] = b.dep_famiglie / (b.dep_famiglie + b.dep_altre_fin)
    threshold = float(np.percentile(b.quota_retail[b.dati_completi], RETAIL_PERCENTILE))
    b["quota_retail_alta"] = b.quota_retail > threshold
    b["vista"] = b.vista_famiglie + b.vista_imprese  # T1
    b["clientela"] = b.dep_famiglie + b.dep_imprese  # T3
    b["prestiti"] = b.prestiti_fam + b.prestiti_imp
    b["ingrosso"] = b.dep_banche + b.titoli_emessi
    b["ingrosso_su_attivo"] = b.ingrosso / b.totale_attivo
    b["vista_su_attivo"] = b.vista / b.totale_attivo
    b["depositi_clientela_su_attivo"] = b.clientela / b.totale_attivo
    b["prestiti_su_attivo"] = b.prestiti / b.totale_attivo
    b["usa_su_esposizioni"] = b.esposizione_usa / b.esposizione_totale  # empty if the United States is not among the top ten countries
    b["rango_quota_retail"] = b.quota_retail.rank(ascending=False, method="min")
    return b, threshold


def bank_effects(b: pd.DataFrame, lost_share: pd.Series, base: str = "vista") -> pd.DataFrame:
    """Effect of a scenario bank by bank: the same share of deposits lost as in the bank's own country."""
    out = pd.DataFrame(index=b.index)
    out["deflusso"] = b.paese.map(lost_share) * b[base]
    sd = 100 * out.deflusso / b.totale_attivo / SD_DEPOSITS_PP
    out["credito_basso"] = COEF["col3"]["basso"] * sd / 100 * b.prestiti
    out["credito_alto"] = COEF["col3"]["alto"] * sd / 100 * b.prestiti
    out["credito"] = np.where(b.quota_retail_alta, out.credito_alto, out.credito_basso)
    out["credito_pct_prestiti"] = 100 * out.credito / b.prestiti
    out["deflusso_su_attivo_pp"] = 100 * out.deflusso / b.totale_attivo
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
    ok = b[b.dati_completi].copy()
    sufficient = len(ok) >= MIN_BANKS and ok.paese.nunique() >= MIN_COUNTRIES

    # Control scenario: central level, R1, sight deposits of households and firms, full substitution
    bal, month = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
    alloc = m4.allocate(bal, ref["centrale_mld_eur"], "R1", "T1", pd.Series(inp["popolazione"], dtype=float))
    lost = alloc.deflusso_mld / bal.vista
    eff = bank_effects(ok, lost)
    ok = ok.join(eff)
    cols = [
        "paese",
        "nome",
        "totale_attivo",
        "dep_famiglie",
        "vista_famiglie",
        "dep_imprese",
        "vista_imprese",
        "dep_altre_fin",
        "dep_banche",
        "dep_banche_centrali",
        "dep_governo",
        "titoli_emessi",
        "prestiti_fam",
        "prestiti_imp",
        "esposizione_usa",
        "esposizione_totale",
        "quota_retail",
        "quota_retail_alta",
        "rango_quota_retail",
        "vista",
        "clientela",
        "prestiti",
        "ingrosso",
        "ingrosso_su_attivo",
        "vista_su_attivo",
        "depositi_clientela_su_attivo",
        "prestiti_su_attivo",
        "usa_su_esposizioni",
        "deflusso",
        "deflusso_su_attivo_pp",
        "credito",
        "credito_basso",
        "credito_alto",
        "credito_pct_prestiti",
    ]
    ok[cols].round(6).sort_values("quota_retail", ascending=False).to_csv(PROC / "m6_banks.csv")

    # By country: coverage and comparison with module 5
    m3 = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    bsi = m3[(m3.mese == PERIOD_MONTH) & (m3.serie == "totale")].set_index("paese").milioni_eur / 1000
    cbd = (pd.read_csv(CBD).set_index("paese").migliaia_eur / 1e6) if CBD.exists() else pd.Series(dtype=float)
    m5 = pd.read_csv(PROC / "m5_credit_by_country.csv")
    m5 = m5[(m5.scenario == "P_centrale") & (m5.regola_paesi == "R1")].set_index("paese")
    g = ok.groupby("paese")
    c = pd.DataFrame(
        {
            "banche": g.size(),
            "banche_alta_quota_retail": g.quota_retail_alta.sum(),
            "totale_attivo_campione": g.totale_attivo.sum(),
            "deflusso_campione": g.deflusso.sum(),
            "credito_campione": g.credito.sum(),
            "prestiti_campione": g.prestiti.sum(),
        }
    ).reindex(EURO_AREA)
    c.insert(0, "nome", [NAMES[k] for k in c.index])
    c["banche"] = c.banche.fillna(0).astype(int)
    c["totale_attivo_bsi"] = bsi.reindex(c.index)
    c["copertura_su_bsi"] = c.totale_attivo_campione / c.totale_attivo_bsi
    c["totale_attivo_consolidato"] = cbd.reindex(c.index)
    c["copertura_su_consolidato"] = c.totale_attivo_campione / c.totale_attivo_consolidato
    c["m6_credito_per_euro"] = c.credito_campione / c.deflusso_campione
    c["m6_credito_pct_prestiti"] = 100 * c.credito_campione / c.prestiti_campione
    for k in ("basso", "alto", "soglia", "continua", "uniforme"):
        c[f"m5_{k}_per_euro"] = m5[f"{k}_mld"] / m5.deflusso_mld
    c["m5_quota_retail_alta"] = m5.quota_retail_alta.reindex(c.index)
    c["deflusso_paese"] = m5.deflusso_mld
    c["m6_credito_riportato_al_paese"] = c.m6_credito_per_euro * c.deflusso_paese  # credit per euro of the banks × outflow of the country
    c["m5_soglia_mld"], c["m5_continua_mld"], c["m5_uniforme_mld"] = m5.soglia_mld, m5.continua_mld, m5.uniforme_mld
    c.round(6).to_csv(PROC / "m6_by_country.csv")

    cov = c[c.banche > 0]
    area = {
        "deflusso_paesi_coperti": float(cov.deflusso_paese.sum()),
        "m6": float(cov.m6_credito_riportato_al_paese.sum()),
        "m5_soglia": float(cov.m5_soglia_mld.sum()),
        "m5_continua": float(cov.m5_continua_mld.sum()),
        "m5_uniforme": float(cov.m5_uniforme_mld.sum()),
        "m5_basso": float((cov.m5_basso_per_euro * cov.deflusso_paese).sum()),
        "m5_alto": float((cov.m5_alto_per_euro * cov.deflusso_paese).sum()),
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
            "paesi_coperti": int(ok.paese.nunique()),
            "soddisfatto": bool(sufficient),
            "paesi_senza_banche": sorted(set(EURO_AREA) - set(ok.paese)),
            "banche_escluse": [{"lei": k, "nome": r.nome, "paese": r.paese} for k, r in b[~b.dati_completi].iterrows()],
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
            "banche_sopra": int(ok.quota_retail_alta.sum()),
            "mediana": float(ok.quota_retail.median()),
            "soglia_tra_paesi_modulo5": json.loads((PROC / "m5_summary.json").read_text())["soglia_quota_retail"]["valore"],
        },
        "campione": {
            "totale_attivo_mld": float(ok.totale_attivo.sum()),
            "copertura_area_su_bsi": float(c.totale_attivo_campione.sum() / c.totale_attivo_bsi.sum()),
            "copertura_area_su_consolidato": float(c.totale_attivo_campione.sum() / c.totale_attivo_consolidato.sum())
            if c.totale_attivo_consolidato.notna().any()
            else None,
            "banche_con_esposizione_usa": int(ok.esposizione_usa.notna().sum()),
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
        "per_paese": c.reset_index().rename(columns={"index": "paese"}).replace({np.nan: None}).to_dict("records"),
        "prime_dieci_per_credito_pct": [
            {"lei": k, "nome": r.nome, "paese": r.paese, "quota_retail": float(r.quota_retail), "credito_pct_prestiti": float(r.credito_pct_prestiti)}
            for k, r in ok.sort_values("credito_pct_prestiti", ascending=False).head(10).iterrows()
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
