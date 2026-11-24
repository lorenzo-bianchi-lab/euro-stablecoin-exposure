"""Verifica la disponibilità delle passività bancarie in valuta estera per paese (BRI).

Fonte: statistiche bancarie territoriali della BRI (Locational Banking Statistics),
API pubblica senza chiave. È l'alternativa alle serie BSI della BCE, che non pubblicano
la scomposizione per valuta. Frequenza trimestrale, importi in milioni di dollari.

Uso: python src/bis_lbs_probe.py
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

# Chiave: FREQ.L_MEASURE.L_POSITION.L_INSTR.L_DENOM.L_CURR_TYPE.L_PARENT_CTY.L_REP_BANK_TYPE.L_REP_CTY.L_CP_SECTOR.L_CP_COUNTRY.L_POS_TYPE
# Consistenze (S), passività (L), tutti gli strumenti (A), tutte le banche, tutte le
# controparti (5J), posizioni transfrontaliere e locali insieme (A). Paese dichiarante libero.
SERIES = [
    ("passivo_totale", "Passività totali, tutte le valute", "Q.S.L.A.TO1.A.5J.A..A.5J.A"),
    ("passivo_valuta_nazionale", "Passività in valuta nazionale (euro)", "Q.S.L.A.TO1.D.5J.A..A.5J.A"),
    ("passivo_valuta_estera", "Passività in valuta estera, totale", "Q.S.L.A.TO1.F.5J.A..A.5J.A"),
    ("passivo_usd", "Passività in dollari", "Q.S.L.A.USD.F.5J.A..A.5J.A"),
]


def fetch(key: str) -> pd.DataFrame:
    for attempt in range(4):
        r = requests.get(API + key, params={"format": "csv"}, timeout=180)
        if r.status_code == 200:
            return pd.read_csv(io.StringIO(r.text), low_memory=False)
        if r.status_code == 404:
            return pd.DataFrame()
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"API BRI non risponde per {key}: HTTP {r.status_code}")


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
        coverage.append({
            "serie": name, "descrizione": label, "codice": key.replace("..A.5J.A", ".{paese}.A.5J.A"),
            "paesi_area_euro": len(per), "paesi": " ".join(per.index),
            "mancanti": " ".join(c for c in EURO_AREA if c not in per.index),
            "inizio_piu_antico": per["min"].min(), "inizio_piu_recente": per["min"].max(),
            "ultimo_dato": per["max"].max(), "paesi_aggiornati_all_ultimo_dato": int((per["max"] == per["max"].max()).sum()),
        })
        for area, row in per.iterrows():
            detail.append({"serie": name, "paese": area, "inizio": row["min"], "fine": row["max"], "osservazioni": int(row["count"])})
        s = d[d.TIME_PERIOD >= SAMPLE_START][["L_REP_CTY", "TIME_PERIOD", "OBS_VALUE"]].copy()
        s.insert(0, "serie", name)
        sample.append(s)
        print(f"{name}: {len(per)} paesi, {per['min'].min()} - {per['max'].max()}", flush=True)
        time.sleep(1)
    pd.DataFrame(coverage).to_csv(PROC / "bis_lbs_coverage.csv", index=False)
    pd.DataFrame(detail).to_csv(PROC / "bis_lbs_coverage_by_country.csv", index=False)
    out = pd.concat(sample, ignore_index=True).rename(columns={"L_REP_CTY": "paese", "TIME_PERIOD": "trimestre", "OBS_VALUE": "milioni_usd"})
    out.to_csv(RAW / "bis_lbs_fx_liabilities_sample.csv", index=False)
    print(f"campione: {len(out)} osservazioni dal {SAMPLE_START}")


if __name__ == "__main__":
    main()
