"""Own level estimate: independent estimates of the value held by euro area residents.

Method and criterion in reports/08_own_level_estimate.md (sections 1 and 2).
B1: bottom-up, with the distribution of amounts from the ECB survey (Chart B, panel b).
B2 and B3: read from data/raw/level_own_inputs.json, where every external figure is annotated
with its source; if a route did not produce a number, the reason is written there.

Inputs: Eurostat demo_pjan (population and adults) and lfst_hhnhtych (households), stored in
data/raw/level_own_population.json; data/raw/level_own_inputs.json;
data/raw/r3_crypto_ownership.json (SPACE survey, for B3).
Output: data/processed/level_own.json, with the reference level of the programme.

Usage: python src/level_own.py            # download population and households, then compute
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

# Chart B, panel b, of the ECB box (Economic Bulletin 7/2026): percentage of stablecoin holders
# by amount band. The ECB does not publish the data: the heights are measured on the original
# image (axis from 0 to 25 over 266 pixels; reading error about 0.1 points).
BANDS = [  # (label, minimum, central, maximum, percentage read)
    ("up to EUR 99", 0, 50, 99, 19.92),
    ("EUR 100-299", 100, 199.5, 299, 17.20),
    ("EUR 300-599", 300, 449.5, 599, 14.47),
    ("EUR 600-999", 600, 799.5, 999, 10.06),
    ("EUR 1,000-1,499", 1000, 1249.5, 1499, 6.86),
    ("EUR 1,500-2,499", 1500, 1999.5, 2499, 5.08),
    ("EUR 2,500-4,999", 2500, 3749.5, 4999, 8.93),
    ("EUR 5,000-9,999", 5000, 7499.5, 9999, 7.61),
    ("EUR 10,000 or more", 10000, 15000, 20000, 9.30),
]
HOLDER_SHARE = 0.05  # text of the box, August 2025
USD_SHARE = {"minimo": 29 / 48, "centrale": 33.5 / 48, "massimo": 38 / 48}  # USDT 17, USDC 12, EURC 10, others < 9
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
    size = j["size"]  # order of the dimensions: freq, unit, age, sex, geo, time
    dims = j["id"]
    minors = {c: 0.0 for c in EURO_AREA}
    for a in ai:
        for g in gi:
            pos = 0
            for name, n in zip(dims, size, strict=False):
                idx = {"age": ai[a], "geo": gi[g], "time": ti[year]}.get(name, 0)
                pos = pos * n + idx
            v = j["value"].get(str(pos))
            if v is None:
                raise RuntimeError(f"population missing for {g} age {a}")
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
    res = {
        "somma_percentuali_lette": tot_pct,
        "importo_medio_per_detentore_eur": mean,
        "quota_ultima_fascia_sul_totale_centrale": BANDS[-1][2] * BANDS[-1][4] / tot_pct / mean["centrale"],
        "unita": units,
    }
    for variant, n in units.items():
        holders = n * HOLDER_SHARE
        res[variant] = {
            "detentori": holders,
            **{f"{k}_mld_eur": holders * mean[k] * USD_SHARE[k] / 1e9 for k in mean},
            **{f"{k}_tutte_le_stablecoin_mld_eur": holders * mean[k] / 1e9 for k in mean},
        }
    return res


def owners_share(pop: dict) -> dict:
    """Share of each country in the crypto-asset owners of the area (SPACE survey × adults)."""
    src = RAW / "r3_crypto_ownership.json"
    if not src.exists():
        tot = sum(pop["popolazione"].values())
        return {c: pop["popolazione"][c] / tot for c in EURO_AREA}
    q = json.loads(src.read_text())["quote_percentuali"]
    mean = sum(q.values()) / len(q)
    owners = {c: q.get(c, mean) / 100 * pop["adulti_18_piu"][c] for c in EURO_AREA}
    tot = sum(owners.values())
    return {c: v / tot for c, v in owners.items()}


def b2(ext: dict) -> dict:
    """Customer reserves at exchanges: the total is readable, but there is no attribution by country."""
    d = dict(ext.get("B2", {"esito": "non calcolata"}))
    rows = d.get("saldi_dei_clienti_usd", [])
    if rows:
        tot = sum((r["usdt"] or 0) + (r["usdc"] or 0) for r in rows) / 1e9
        # "letto alla fonte" (read at the source) is a value in data/raw/level_own_inputs.json
        ver = sum((r["usdt"] or 0) + (r["usdc"] or 0) for r in rows if r["verifica"].startswith("letto alla fonte")) / 1e9
        d["totale_saldi_clienti_mld_usd"] = tot
        d["di_cui_verificati_alla_fonte_mld_usd"] = ver
    return d


def b3(ext: dict, pop: dict) -> dict:
    d = ext.get("B3")
    if not d:
        return {"esito": "non calcolata"}
    share = owners_share(pop)
    it, nl, st = d["italia"], d["paesi_bassi"], d["quota_stablecoin_sul_mercato_cripto"]["valore"]
    it_stable = it["controvalore_cripto_eur"] * st
    out = {
        "esito": "calcolata",
        "ipotesi": "OAM does not single out stablecoins: the 10% share of the crypto market (WP 3199) and the dollar share of B1 are applied",
        "quota_italia_sui_possessori_dell_area": share["IT"],
        "quota_paesi_bassi_sui_possessori_dell_area": share["NL"],
        "italia_stablecoin_stimate_mld_eur": it_stable / 1e9,
    }
    for k in ("minimo", "centrale", "massimo"):
        out[f"{k}_mld_eur"] = it_stable * USD_SHARE[k] / share["IT"] / 1e9
    nl_max = nl["controvalore_cripto_famiglie_eur"] * nl["quota_stablecoin_massima"]
    out["controllo_paesi_bassi"] = {
        "stablecoin_massime_mld_eur": nl_max / 1e9,
        "area_euro_massimo_implicito_mld_eur": nl_max * USD_SHARE["centrale"] / share["NL"] / 1e9,
        "nota": "DNB measures stablecoins (less than 1%); the figure gives a ceiling, not a central value",
    }
    out["italia_con_quota_olandese_mld_eur"] = (
        it["controvalore_cripto_eur"] * nl["quota_stablecoin_massima"] * USD_SHARE["centrale"] / share["IT"] / 1e9
    )
    out["fonti"] = d
    return out


def main() -> None:
    pop = json.loads(POP.read_text()) if "--offline" in sys.argv else fetch_population()
    ext = json.loads(INPUTS.read_text()) if INPUTS.exists() else {}
    r1, r2, r3 = b1(pop), b2(ext), b3(ext, pop)
    centrals = {"B1": r1["famiglie"]["centrale_mld_eur"]}
    for key, res in (("B2", r2), ("B3", r3)):
        v = res.get("centrale_mld_eur")
        if v is not None:
            centrals[key] = float(v)
    names = sorted(centrals)
    pairs = [(a, b, max(centrals[a], centrals[b]) / min(centrals[a], centrals[b])) for i, a in enumerate(names) for b in names[i + 1 :]]
    agree = sorted({x for a, b, f in pairs if f <= FACTOR for x in (a, b)})
    # the "esito" values ("intervallo proprio", "solo minimo di B1") are codes read by export_app_data.py
    if agree:
        verdict = {
            "esito": "intervallo proprio",
            "stime_concordi": agree,
            "intervallo_mld_eur": [min(centrals[k] for k in agree), max(centrals[k] for k in agree)],
        }
    else:
        verdict = {"esito": "solo minimo di B1", "minimo_mld_eur": r1["famiglie"]["minimo_mld_eur"]}
    fam, ind = r1["famiglie"], r1["individui"]
    reference = {
        "definizione": "Own bottom-up estimate (B1, households variant), from the ECB consumer survey",
        "minimo_mld_eur": fam["minimo_mld_eur"],
        "centrale_mld_eur": fam["centrale_mld_eur"],
        "massimo_mld_eur": fam["massimo_mld_eur"],
        "estremo_superiore_dichiarato_mld_eur": ind["massimo_mld_eur"],
        "nota_estremo_superiore": "Individuals variant, maximum: counts every adult of a holding household as a holder",
        "decisione": (
            "Reference level by decision of 2026-11-25 (prompt 5), taken after the results "
            "and overriding the criterion of report 08, which was not met."
        ),
    }
    out = {
        "avvertenza": "Survey-based estimate with stated assumptions, not a measurement of residents' holdings.",
        "livello_di_riferimento": reference,
        "B1": r1,
        "B2": r2,
        "B3": r3,
        "valori_centrali_mld_eur": centrals,
        "confronti": [{"coppia": f"{a}-{b}", "fattore": f} for a, b, f in pairs],
        "fattore_massimo_ammesso": FACTOR,
        "verdetto": verdict,
        "parametri": {
            "quota_detentori": HOLDER_SHARE,
            "quota_in_dollari": USD_SHARE,
            "fasce": [{"fascia": b[0], "minimo": b[1], "centrale": b[2], "massimo": b[3], "percentuale": b[4]} for b in BANDS],
        },
    }
    (PROC / "level_own.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
