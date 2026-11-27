"""Checks the availability of bank liabilities in foreign currency by country (BIS).

Source: BIS locational banking statistics (LBS), public API with no key. It is the alternative
to the ECB BSI series, which do not publish the currency breakdown. Quarterly frequency,
amounts in USD million.

Input: BIS statistics API (WS_LBS_D_PUB dataflow).
Outputs: data/processed/bis_lbs_coverage.csv, data/processed/bis_lbs_coverage_by_country.csv
and data/raw/bis_lbs_fx_liabilities_sample.csv (used by modules 3 and 5; module 5 runs this
script when it downloads).

Usage: python src/bis_lbs_probe.py
"""

from __future__ import annotations

import io
import time
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
API = "https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/1.0/"
SAMPLE_START = "2015-Q1"
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()

# Key: FREQ.L_MEASURE.L_POSITION.L_INSTR.L_DENOM.L_CURR_TYPE.L_PARENT_CTY.L_REP_BANK_TYPE.L_REP_CTY.L_CP_SECTOR.L_CP_COUNTRY.L_POS_TYPE
# Stocks (S), liabilities (L), all instruments (A), all banks, all counterparties (5J),
# cross-border and local positions together (A). Reporting country left open.
SERIES = [
    ("passivo_totale", "Total liabilities, all currencies", "Q.S.L.A.TO1.A.5J.A..A.5J.A"),
    ("passivo_valuta_nazionale", "Liabilities in domestic currency (euro)", "Q.S.L.A.TO1.D.5J.A..A.5J.A"),
    ("passivo_valuta_estera", "Liabilities in foreign currency, total", "Q.S.L.A.TO1.F.5J.A..A.5J.A"),
    ("passivo_usd", "Liabilities in US dollars", "Q.S.L.A.USD.F.5J.A..A.5J.A"),
]


def fetch(key: str) -> pd.DataFrame:
    for attempt in range(4):
        r = requests.get(API + key, params={"format": "csv"}, timeout=180)
        if r.status_code == 200:
            return pd.read_csv(io.StringIO(r.text), low_memory=False)
        if r.status_code == 404:
            return pd.DataFrame()
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"BIS API does not respond for {key}: HTTP {r.status_code}")


def main() -> None:
    coverage, detail, sample = [], [], []
    for name, label, key in SERIES:
        d = fetch(key)
        if not d.empty:
            d = d[d.L_REP_CTY.isin(EURO_AREA) & d.OBS_VALUE.notna()]
        if d.empty:
            coverage.append({"serie": name, "descrizione": label, "codice": key.replace("..A.5J.A", ".{paese}.A.5J.A"), "paesi_area_euro": 0})
            continue
        per = d.groupby("L_REP_CTY").TIME_PERIOD.agg(["min", "max", "count"])
        coverage.append(
            {
                "serie": name,
                "descrizione": label,
                "codice": key.replace("..A.5J.A", ".{paese}.A.5J.A"),
                "paesi_area_euro": len(per),
                "paesi": " ".join(per.index),
                "mancanti": " ".join(c for c in EURO_AREA if c not in per.index),
                "inizio_piu_antico": per["min"].min(),
                "inizio_piu_recente": per["min"].max(),
                "ultimo_dato": per["max"].max(),
                "paesi_aggiornati_all_ultimo_dato": int((per["max"] == per["max"].max()).sum()),
            }
        )
        for area, row in per.iterrows():
            detail.append({"serie": name, "paese": area, "inizio": row["min"], "fine": row["max"], "osservazioni": int(row["count"])})
        s = d[d.TIME_PERIOD >= SAMPLE_START][["L_REP_CTY", "TIME_PERIOD", "OBS_VALUE"]].copy()
        s.insert(0, "serie", name)
        sample.append(s)
        print(f"{name}: {len(per)} countries, {per['min'].min()} - {per['max'].max()}", flush=True)
        time.sleep(1)
    pd.DataFrame(coverage).to_csv(PROC / "bis_lbs_coverage.csv", index=False)
    pd.DataFrame(detail).to_csv(PROC / "bis_lbs_coverage_by_country.csv", index=False)
    out = pd.concat(sample, ignore_index=True).rename(columns={"L_REP_CTY": "paese", "TIME_PERIOD": "trimestre", "OBS_VALUE": "milioni_usd"})
    out.to_csv(RAW / "bis_lbs_fx_liabilities_sample.csv", index=False)
    print(f"sample: {len(out)} observations from {SAMPLE_START}")


if __name__ == "__main__":
    main()
