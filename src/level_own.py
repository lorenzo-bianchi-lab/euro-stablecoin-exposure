"""Livello proprio: stime indipendenti del valore detenuto dai residenti dell'area euro.

Metodo e criterio in reports/08_livello_proprio.md (sezioni 1 e 2).
B1: dal basso, con la distribuzione degli importi dell'indagine BCE (grafico B, riquadro b).
B2 e B3: lette da data/raw/level_own_inputs.json, dove ogni cifra esterna è annotata con
la fonte; se una strada non ha prodotto un numero, lì è scritto il motivo.

Uso: python src/level_own.py            # scarica popolazione e famiglie, poi calcola
     python src/level_own.py --offline
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
INPUTS, POP = RAW / "level_own_inputs.json", RAW / "level_own_population.json"
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()
EUROSTAT = "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/"

# Grafico B, riquadro b del riquadro BCE (Bollettino economico 7/2026): percentuale di detentori
# di stablecoin per fascia di importo. La BCE non pubblica i dati: le altezze sono misurate
# sull'immagine originale (asse da 0 a 25 su 266 pixel; errore di lettura circa 0,1 punti).
BANDS = [  # (etichetta, minimo, centrale, massimo, percentuale letta)
    ("fino a 99 €", 0, 50, 99, 19.92), ("100-299 €", 100, 199.5, 299, 17.20), ("300-599 €", 300, 449.5, 599, 14.47),
    ("600-999 €", 600, 799.5, 999, 10.06), ("1.000-1.499 €", 1000, 1249.5, 1499, 6.86), ("1.500-2.499 €", 1500, 1999.5, 2499, 5.08),
    ("2.500-4.999 €", 2500, 3749.5, 4999, 8.93), ("5.000-9.999 €", 5000, 7499.5, 9999, 7.61), ("10.000 € o più", 10000, 15000, 20000, 9.30),
]
HOLDER_SHARE = 0.05                                   # testo del riquadro, agosto 2025
USD_SHARE = {"minimo": 29 / 48, "centrale": 33.5 / 48, "massimo": 38 / 48}  # USDT 17, USDC 12, EURC 10, altre < 9
FACTOR = 3.0


def fetch_population() -> dict:
    geo = [("EL" if c == "GR" else c) for c in EURO_AREA]

    def eurostat(dataset: str, **dims) -> tuple[dict, dict, dict]:
        r = requests.get(EUROSTAT + dataset, params={"format": "JSON", "sinceTimePeriod": "2024", "geo": geo, **dims}, timeout=90)
        r.raise_for_status()
        j = r.json()
        return j, j["dimension"]["geo"]["category"]["index"], j["dimension"]["time"]["category"]["index"]

    def by_country(j, gi, ti, year, extra=1, offset=0):
        return {("GR" if g == "EL" else g): j["value"].get(str((offset * len(gi) + gi[g]) * len(ti) + ti[year])) for g in gi}

    j, gi, ti = eurostat("demo_pjan", sex="T", age="TOTAL")
    year = max(ti)
    total = by_country(j, gi, ti, year)
    ages = ["Y_LT1"] + [f"Y{k}" for k in range(1, 18)]
    j, gi, ti = eurostat("demo_pjan", sex="T", age=ages)
    ai = j["dimension"]["age"]["category"]["index"]
    size = j["size"]  # ordine delle dimensioni: freq, unit, age, sex, geo, time
    dims = j["id"]
    minors = {c: 0.0 for c in EURO_AREA}
    for a in ai:
        for g in gi:
            pos = 0
            for name, n in zip(dims, size):
                idx = {"age": ai[a], "geo": gi[g], "time": ti[year]}.get(name, 0)
                pos = pos * n + idx
            v = j["value"].get(str(pos))
            if v is None:
                raise RuntimeError(f"popolazione mancante per {g} età {a}")
            minors["GR" if g == "EL" else g] += v
    adults = {c: total[c] - minors[c] for c in EURO_AREA}
    j, gi, ti = eurostat("lfst_hhnhtych", agechild="TOTAL", n_child="TOTAL", phhcomp="TOTAL", unit="THS_HH")
    hh = {}
    for y in sorted(ti, reverse=True):
        vals = by_country(j, gi, ti, y)
        if all(v is not None for v in vals.values()):
            hh = {"anno": y, "per_paese_migliaia": vals}
            break
    out = {"anno_popolazione": year, "popolazione": total, "adulti_18_piu": adults, "famiglie": hh}
    POP.write_text(json.dumps(out, indent=1))
    return out


def b1(pop: dict) -> dict:
    tot_pct = sum(b[4] for b in BANDS)
    mean = {k: sum(b[i] * b[4] for b in BANDS) / tot_pct for k, i in (("minimo", 1), ("centrale", 2), ("massimo", 3))}
    units = {"famiglie": sum(pop["famiglie"]["per_paese_migliaia"].values()) * 1000, "individui": sum(pop["adulti_18_piu"].values())}
    res = {"somma_percentuali_lette": tot_pct, "importo_medio_per_detentore_eur": mean,
           "quota_ultima_fascia_sul_totale_centrale": BANDS[-1][2] * BANDS[-1][4] / tot_pct / mean["centrale"], "unita": units}
    for variant, n in units.items():
        holders = n * HOLDER_SHARE
        res[variant] = {"detentori": holders,
                        **{f"{k}_mld_eur": holders * mean[k] * USD_SHARE[k] / 1e9 for k in mean},
                        **{f"{k}_tutte_le_stablecoin_mld_eur": holders * mean[k] / 1e9 for k in mean}}
    return res


def main() -> None:
    pop = json.loads(POP.read_text()) if "--offline" in sys.argv else fetch_population()
    ext = json.loads(INPUTS.read_text()) if INPUTS.exists() else {}
    r1 = b1(pop)
    centrals = {"B1": r1["famiglie"]["centrale_mld_eur"]}
    for key in ("B2", "B3"):
        v = ext.get(key, {}).get("centrale_mld_eur")
        if v is not None:
            centrals[key] = float(v)
    names = sorted(centrals)
    pairs = [(a, b, max(centrals[a], centrals[b]) / min(centrals[a], centrals[b])) for i, a in enumerate(names) for b in names[i + 1:]]
    agree = sorted({x for a, b, f in pairs if f <= FACTOR for x in (a, b)})
    if agree:
        verdict = {"esito": "intervallo proprio", "stime_concordi": agree,
                   "intervallo_mld_eur": [min(centrals[k] for k in agree), max(centrals[k] for k in agree)]}
    else:
        verdict = {"esito": "solo minimo di B1", "minimo_mld_eur": r1["famiglie"]["minimo_mld_eur"]}
    out = {
        "avvertenza": "Triangolazione di fonti indirette, non una misura delle detenzioni dei residenti.",
        "B1": r1, "B2": ext.get("B2", {"esito": "non calcolata"}), "B3": ext.get("B3", {"esito": "non calcolata"}),
        "valori_centrali_mld_eur": centrals, "confronti": [{"coppia": f"{a}-{b}", "fattore": f} for a, b, f in pairs],
        "fattore_massimo_ammesso": FACTOR, "verdetto": verdict,
        "parametri": {"quota_detentori": HOLDER_SHARE, "quota_in_dollari": USD_SHARE,
                      "fasce": [{"fascia": b[0], "minimo": b[1], "centrale": b[2], "massimo": b[3], "percentuale": b[4]} for b in BANDS]},
    }
    (PROC / "level_own.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
