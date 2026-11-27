"""Checks which bank balance sheet series (BSI dataset) can be downloaded from the ECB Data Portal.

For each candidate series of module 3 it queries the public API (no key) with the country
left open, measures coverage and period for the euro area countries and saves a sample.
It does not build any index.

Input: ECB Data Portal, BSI dataset (public API, no key).
Outputs: data/processed/ecb_bsi_coverage.csv, data/processed/ecb_bsi_coverage_by_country.csv
and data/raw/ecb_bsi_sample.csv.

Usage: python src/ecb_bsi_probe.py
"""

from __future__ import annotations

import io
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
API = "https://data-api.ecb.europa.eu/service/data/BSI/"
SAMPLE_START = "2015-01"

# 21 euro area countries (Croatia since 2023, Bulgaria since 2026)
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()

# BSI key: FREQ.REF_AREA.ADJUSTMENT.BS_REP_SECTOR.BS_ITEM.MATURITY_ORIG.DATA_TYPE.COUNT_AREA.BS_COUNT_SECTOR.CURRENCY_TRANS.BS_SUFFIX
# The country (REF_AREA) is left empty to get all countries in one call.
SERIES = [
    ("dep_vista_famiglie", "Sight deposits, households", "M..N.A.L21.A.1.U2.2250.Z01.E"),
    ("dep_vista_imprese", "Sight deposits, non-financial corporations", "M..N.A.L21.A.1.U2.2240.Z01.E"),
    ("dep_tot_famiglie", "Total deposits, households", "M..N.A.L20.A.1.U2.2250.Z01.E"),
    ("dep_tot_imprese", "Total deposits, non-financial corporations", "M..N.A.L20.A.1.U2.2240.Z01.E"),
    ("dep_tot_non_ifm", "Total deposits, non-MFIs excluding central government", "M..N.A.L20.A.1.U2.2300.Z01.E"),
    ("dep_ifm", "Deposits from euro area MFIs (interbank, includes the central bank)", "M..N.A.L20.A.1.U2.1000.Z01.E"),
    ("dep_banche", "Deposits from other euro area banks (excluding the central bank)", "M..N.A.L20.A.1.U2.1210.Z01.E"),
    ("titoli_debito", "Debt securities issued, total", "M..N.A.L40.A.1.U2.0000.Z01.E"),
    ("titoli_debito_oltre_2a", "Debt securities issued, over 2 years", "M..N.A.L40.H.1.Z5.0000.Z01.E"),
    ("passivita_estere", "Liabilities to non-residents of the euro area", "M..N.A.LXG.A.1.U4.0000.Z01.E"),
    ("capitale_riserve", "Capital and reserves", "M..N.A.L60.X.1.Z5.0000.Z01.E"),
    ("totale_passivo", "Total assets/liabilities", "M..N.A.T00.A.1.Z5.0000.Z01.E"),
    (
        "dep_vista_non_euro_ofi",
        "Sight deposits in currencies other than the euro, other financial intermediaries (S.125)",
        "M..N.A.L21.A.1.U2.227A.Z06.E",
    ),
]


def fetch(key: str) -> pd.DataFrame:
    for attempt in range(4):
        r = requests.get(API + key, params={"format": "csvdata", "detail": "dataonly"}, timeout=120)
        if r.status_code == 200:
            return pd.read_csv(io.StringIO(r.text), dtype={"TIME_PERIOD": str})
        if r.status_code == 404:  # no series with this key
            return pd.DataFrame()
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"ECB Data Portal does not respond for {key}: HTTP {r.status_code}")


def main() -> None:
    coverage, sample = [], []
    for name, label, key in SERIES:
        d = fetch(key)
        if d.empty:
            coverage.append(
                {
                    "series": name,
                    "description": label,
                    "code": "BSI." + key.replace("..", ".{paese}.", 1),
                    "euro_area_countries": 0,
                    "countries": "",
                    "missing": " ".join(EURO_AREA),
                }
            )
            continue
        d = d[d.REF_AREA.isin(EURO_AREA) & d.OBS_VALUE.notna()]
        per = d.groupby("REF_AREA").TIME_PERIOD.agg(["min", "max", "count"])
        latest = per["max"].max()
        coverage.append(
            {
                "series": name,
                "description": label,
                "code": "BSI." + key.replace("..", ".{paese}.", 1),
                "euro_area_countries": len(per),
                "countries": " ".join(per.index),
                "missing": " ".join(c for c in EURO_AREA if c not in per.index),
                "earliest_start": per["min"].min(),
                "latest_start": per["min"].max(),
                "latest_start_country": per["min"].idxmax(),
                "last_observation": latest,
                "countries_at_last_observation": int((per["max"] == latest).sum()),
                "observations": int(per["count"].sum()),
            }
        )
        s = d[d.TIME_PERIOD >= SAMPLE_START][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].copy()
        s.insert(0, "series", name)
        sample.append(s)
        for area, row in per.iterrows():
            coverage_detail.append({"series": name, "country": area, "start": row["min"], "end": row["max"], "observations": int(row["count"])})
        print(f"{name}: {len(per)} countries, {per['min'].min()} - {latest}", flush=True)
        time.sleep(1)
    pd.DataFrame(coverage).to_csv(PROC / "ecb_bsi_coverage.csv", index=False)
    pd.DataFrame(coverage_detail).to_csv(PROC / "ecb_bsi_coverage_by_country.csv", index=False)
    out = pd.concat(sample, ignore_index=True).rename(columns={"REF_AREA": "country", "TIME_PERIOD": "month", "OBS_VALUE": "eur_mn"})
    out.to_csv(RAW / "ecb_bsi_sample.csv", index=False)
    print(f"sample: {len(out)} observations from {SAMPLE_START}")


coverage_detail: list[dict] = []

if __name__ == "__main__":
    main()
