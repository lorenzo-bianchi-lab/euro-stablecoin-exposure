"""Verifica quali serie di bilancio bancario (dataset BSI) sono scaricabili dall'ECB Data Portal.

Per ogni serie candidata del modulo 3 interroga l'API pubblica (senza chiave) con il
paese lasciato libero, misura copertura e periodo per i paesi dell'area euro e salva un
campione. Non costruisce alcun indice.

Uso: python src/ecb_bsi_probe.py
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

# 21 paesi dell'area euro (Croazia dal 2023, Bulgaria dal 2026)
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()

# Chiave BSI: FREQ.REF_AREA.ADJUSTMENT.BS_REP_SECTOR.BS_ITEM.MATURITY_ORIG.DATA_TYPE.COUNT_AREA.BS_COUNT_SECTOR.CURRENCY_TRANS.BS_SUFFIX
# Il paese (REF_AREA) è lasciato vuoto per ottenere tutti i paesi in una chiamata.
SERIES = [
    ("dep_vista_famiglie", "Depositi a vista, famiglie", "M..N.A.L21.A.1.U2.2250.Z01.E"),
    ("dep_vista_imprese", "Depositi a vista, società non finanziarie", "M..N.A.L21.A.1.U2.2240.Z01.E"),
    ("dep_tot_famiglie", "Depositi totali, famiglie", "M..N.A.L20.A.1.U2.2250.Z01.E"),
    ("dep_tot_imprese", "Depositi totali, società non finanziarie", "M..N.A.L20.A.1.U2.2240.Z01.E"),
    ("dep_tot_non_ifm", "Depositi totali, non-IFM escluso governo centrale", "M..N.A.L20.A.1.U2.2300.Z01.E"),
    ("dep_ifm", "Depositi da IFM dell'area euro (interbancario, include la banca centrale)", "M..N.A.L20.A.1.U2.1000.Z01.E"),
    ("dep_banche", "Depositi da altre banche dell'area euro (esclusa la banca centrale)", "M..N.A.L20.A.1.U2.1210.Z01.E"),
    ("titoli_debito", "Titoli di debito emessi, totale", "M..N.A.L40.A.1.U2.0000.Z01.E"),
    ("titoli_debito_oltre_2a", "Titoli di debito emessi, oltre 2 anni", "M..N.A.L40.H.1.Z5.0000.Z01.E"),
    ("passivita_estere", "Passività verso non residenti dell'area euro", "M..N.A.LXG.A.1.U4.0000.Z01.E"),
    ("capitale_riserve", "Capitale e riserve", "M..N.A.L60.X.1.Z5.0000.Z01.E"),
    ("totale_passivo", "Totale attivo/passivo", "M..N.A.T00.A.1.Z5.0000.Z01.E"),
    ("dep_vista_non_euro_ofi", "Depositi a vista in valute diverse dall'euro, altri intermediari finanziari (S.125)", "M..N.A.L21.A.1.U2.227A.Z06.E"),
]


def fetch(key: str) -> pd.DataFrame:
    for attempt in range(4):
        r = requests.get(API + key, params={"format": "csvdata", "detail": "dataonly"}, timeout=120)
        if r.status_code == 200:
            return pd.read_csv(io.StringIO(r.text), dtype={"TIME_PERIOD": str})
        if r.status_code == 404:  # nessuna serie con questa chiave
            return pd.DataFrame()
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"ECB Data Portal non risponde per {key}: HTTP {r.status_code}")


def main() -> None:
    coverage, sample = [], []
    for name, label, key in SERIES:
        d = fetch(key)
        if d.empty:
            coverage.append({"serie": name, "descrizione": label, "codice": "BSI." + key.replace("..", ".{paese}.", 1),
                             "paesi_area_euro": 0, "paesi": "", "mancanti": " ".join(EURO_AREA)})
            continue
        d = d[d.REF_AREA.isin(EURO_AREA) & d.OBS_VALUE.notna()]
        per = d.groupby("REF_AREA").TIME_PERIOD.agg(["min", "max", "count"])
        latest = per["max"].max()
        coverage.append({
            "serie": name, "descrizione": label, "codice": "BSI." + key.replace("..", ".{paese}.", 1),
            "paesi_area_euro": len(per), "paesi": " ".join(per.index),
            "mancanti": " ".join(c for c in EURO_AREA if c not in per.index),
            "inizio_piu_antico": per["min"].min(), "inizio_piu_recente": per["min"].max(),
            "paese_inizio_piu_recente": per["min"].idxmax(), "ultimo_dato": latest,
            "paesi_aggiornati_all_ultimo_dato": int((per["max"] == latest).sum()),
            "osservazioni": int(per["count"].sum()),
        })
        s = d[d.TIME_PERIOD >= SAMPLE_START][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].copy()
        s.insert(0, "serie", name)
        sample.append(s)
        for area, row in per.iterrows():
            coverage_detail.append({"serie": name, "paese": area, "inizio": row["min"], "fine": row["max"], "osservazioni": int(row["count"])})
        print(f"{name}: {len(per)} paesi, {per['min'].min()} - {latest}", flush=True)
        time.sleep(1)
    pd.DataFrame(coverage).to_csv(PROC / "ecb_bsi_coverage.csv", index=False)
    pd.DataFrame(coverage_detail).to_csv(PROC / "ecb_bsi_coverage_by_country.csv", index=False)
    out = pd.concat(sample, ignore_index=True).rename(columns={"REF_AREA": "paese", "TIME_PERIOD": "mese", "OBS_VALUE": "milioni_eur"})
    out.to_csv(RAW / "ecb_bsi_sample.csv", index=False)
    print(f"campione: {len(out)} osservazioni dal {SAMPLE_START}")


coverage_detail: list[dict] = []

if __name__ == "__main__":
    main()
