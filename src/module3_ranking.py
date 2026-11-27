"""Module 3: structure of bank funding by country and exposure ranking.

Applies the method pre-registered in reports/04_module3_ranking.md (sections 1 and 2):
composition table of liabilities, three components, main indicator and five alternative
weightings.

Inputs: ECB Data Portal, BSI dataset (13 monthly series for the 21 euro area countries),
stored in data/raw/m3_bsi.csv; data/raw/bis_lbs_fx_liabilities_sample.csv for variant A5.
Outputs: data/processed/m3_composition.csv, m3_index.csv, m3_ranking_latest.csv,
m3_variant_usd_funding.csv, m3_summary.json; figures reports/figures/04_ranking.png and
04_c1_over_time.png.

Usage: python src/module3_ranking.py            # download the ECB series and recompute
       python src/module3_ranking.py --offline  # recompute from the files already downloaded
"""

from __future__ import annotations

import io
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from module5_credit import NAMES_EN

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, FIG = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "reports" / "figures"
STORE = RAW / "m3_bsi.csv"
API = "https://data-api.ecb.europa.eu/service/data/BSI/"
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()
NAMES = {
    "AT": "Austria",
    "BE": "Belgio",
    "BG": "Bulgaria",
    "CY": "Cipro",
    "DE": "Germania",
    "EE": "Estonia",
    "ES": "Spagna",
    "FI": "Finlandia",
    "FR": "Francia",
    "GR": "Grecia",
    "HR": "Croazia",
    "IE": "Irlanda",
    "IT": "Italia",
    "LT": "Lituania",
    "LU": "Lussemburgo",
    "LV": "Lettonia",
    "MT": "Malta",
    "NL": "Paesi Bassi",
    "PT": "Portogallo",
    "SI": "Slovenia",
    "SK": "Slovacchia",
}
TOLERANCE = 0.005

# name -> BSI key with the country left open.
# The money market fund shares are those held by euro area residents (U2): those held by
# non-residents are already included in the external liabilities.
SERIES = {
    "vista_fam": "M..N.A.L21.A.1.U2.2250.Z01.E",
    "vista_imp": "M..N.A.L21.A.1.U2.2240.Z01.E",
    "dep_fam": "M..N.A.L20.A.1.U2.2250.Z01.E",
    "dep_imp": "M..N.A.L20.A.1.U2.2240.Z01.E",
    "dep_non_ifm": "M..N.A.L20.A.1.U2.2300.Z01.E",
    "dep_ifm": "M..N.A.L20.A.1.U2.1000.Z01.E",
    "dep_tutti": "M..N.A.L20.A.1.U2.0000.Z01.E",
    "fondi_monetari": "M..N.A.L30.A.1.U2.0000.Z01.E",
    "titoli": "M..N.A.L40.A.1.U2.0000.Z01.E",
    "capitale": "M..N.A.L60.X.1.Z5.0000.Z01.E",
    "estero": "M..N.A.LXG.A.1.U4.0000.Z01.E",
    "altre": "M..N.A.L70.X.1.Z5.0000.Z01.E",
    "totale": "M..N.A.T00.A.1.Z5.0000.Z01.E",
}
WEIGHTS = {"C1": 0.50, "C2": 0.25, "C3": 0.25}
# data/processed/m3_summary.json keeps its Italian keys: names of the alternative weightings in that
# file, and the column suffix of each past date (C1_1_year_ago, rank_1_year_ago, ...) by its key there
VARIANT_KEYS = {
    "A1_equal_weights": "A1_pesi_uguali",
    "A2_quantity_only": "A2_solo_quantita",
    "A3_households_only": "A3_solo_famiglie",
    "A4_ranks": "A4_ranghi",
}
AGO = {"1_anno": "1_year_ago", "5_anni": "5_years_ago", "10_anni": "10_years_ago"}


def fetch_all() -> pd.DataFrame:
    frames = []
    for name, key in SERIES.items():
        for attempt in range(4):
            r = requests.get(API + key, params={"format": "csvdata", "detail": "dataonly"}, timeout=180)
            if r.status_code in (200, 404):
                break
            time.sleep(5 * (attempt + 1))
        if r.status_code != 200:
            print(f"{name}: no series (HTTP {r.status_code})", flush=True)
            continue
        d = pd.read_csv(io.StringIO(r.text), dtype={"TIME_PERIOD": str})
        d = d[d.REF_AREA.isin(EURO_AREA) & d.OBS_VALUE.notna()][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]]
        d.insert(0, "series", name)
        frames.append(d)
        print(f"{name}: {d.REF_AREA.nunique()} countries, {d.TIME_PERIOD.min()} - {d.TIME_PERIOD.max()}", flush=True)
        time.sleep(1)
    out = pd.concat(frames, ignore_index=True).rename(columns={"REF_AREA": "country", "TIME_PERIOD": "month", "OBS_VALUE": "eur_mn"})
    out.to_csv(STORE, index=False)
    return out


def z(s: pd.Series) -> pd.Series:
    sd = s.std(ddof=0)
    return (s - s.mean()) / sd if sd else s * 0


def spearman(a: pd.Series, b: pd.Series) -> float:
    return float(a.rank().corr(b.rank()))


def stability(main_rank: pd.Series, alt_rank: pd.Series) -> dict:
    common = main_rank.index.intersection(alt_rank.index)
    m = main_rank.loc[common].rank()
    a = alt_rank.loc[common].rank()
    top = min(5, len(common))
    return {
        "paesi": int(len(common)),
        "spearman": spearman(m, a),
        "paesi_spostati_piu_di_3_posizioni": int(((m - a).abs() > 3).sum()),
        "spostamento_massimo": int((m - a).abs().max()),
        "primi_cinque_in_comune": int(len(set(m.nsmallest(top).index) & set(a.nsmallest(top).index))),
    }


def main() -> None:
    long = pd.read_csv(STORE, dtype={"month": str}) if "--offline" in sys.argv else fetch_all()
    w = long.pivot_table(index=["country", "month"], columns="series", values="eur_mn")

    # 1. Composition table (shares of total liabilities)
    comp = pd.DataFrame(index=w.index)
    comp["household_sight_deposits"] = w.vista_fam
    comp["household_other_deposits"] = w.dep_fam - w.vista_fam
    comp["firm_sight_deposits"] = w.vista_imp
    comp["firm_other_deposits"] = w.dep_imp - w.vista_imp
    comp["other_non_mfi_deposits"] = w.dep_non_ifm - w.dep_fam - w.dep_imp
    comp["central_government_deposits"] = w.dep_tutti - w.dep_non_ifm - w.dep_ifm
    comp["deposits_from_mfis"] = w.dep_ifm
    comp["money_market_funds"] = w.fondi_monetari.fillna(0) if "fondi_monetari" in w else 0.0
    comp["debt_securities"] = w.titoli
    comp["capital_and_reserves"] = w.capitale
    comp["external_liabilities"] = w.estero
    comp["other_liabilities"] = w.altre
    comp = comp.dropna(subset=["household_sight_deposits", "deposits_from_mfis", "debt_securities", "other_liabilities"])
    total = w.totale.reindex(comp.index)
    comp["residual"] = total - comp.sum(axis=1)
    shares = comp.div(total, axis=0)
    shares.insert(0, "total_liabilities_mn", total)
    shares.round(6).to_csv(PROC / "m3_composition.csv")

    gap = shares.residual.abs()
    out_of_tol = shares[gap > TOLERANCE]
    gap_by_country = shares.residual.groupby("country").agg(["min", "max", lambda s: (s.abs() > TOLERANCE).mean()])
    gap_by_country.columns = ["scarto_min", "scarto_max", "quota_mesi_fuori_tolleranza"]

    # 2. Components and indicator
    c = pd.DataFrame(index=w.index)
    c["C1"] = (w.vista_fam + w.vista_imp) / w.totale
    c["C2"] = (w.vista_fam + w.vista_imp) / (w.dep_fam + w.dep_imp)
    c["C3"] = (w.dep_fam + w.dep_imp) / (w.dep_fam + w.dep_imp + w.titoli + w.dep_ifm)
    c["C1_households"] = w.vista_fam / w.totale
    c["C1_firms"] = w.vista_imp / w.totale
    c["C2_households"] = w.vista_fam / w.dep_fam
    c = c.dropna(subset=["C1", "C2", "C3"])
    by_month = c.groupby("month")
    for k in ("C1", "C2", "C3", "C1_households", "C2_households"):
        c["z_" + k] = by_month[k].transform(z)
        c["r_" + k] = by_month[k].rank(ascending=False)
    c["indicator"] = sum(wt * c["z_" + k] for k, wt in WEIGHTS.items())
    c["A1_equal_weights"] = (c.z_C1 + c.z_C2 + c.z_C3) / 3
    c["A2_quantity_only"] = c.z_C1
    c["A3_households_only"] = 0.50 * c.z_C1_households + 0.25 * c.z_C2_households + 0.25 * c.z_C3
    c["A4_ranks"] = -(0.50 * c.r_C1 + 0.25 * c.r_C2 + 0.25 * c.r_C3)  # sign reversed: higher = more exposed
    variants = ["indicator", "A1_equal_weights", "A2_quantity_only", "A3_households_only", "A4_ranks"]
    for v in variants:
        c["rank_" + v] = c.groupby("month")[v].rank(ascending=False, method="min").astype(int)
    c["countries_in_month"] = c.groupby("month").C1.transform("size")
    c.round(6).to_csv(PROC / "m3_index.csv")

    latest = c.index.get_level_values("month").max()
    now = c.xs(latest, level="month").sort_values("rank_indicator")
    now.insert(0, "name", [NAMES[k] for k in now.index])

    def month_back(years: int) -> str:
        y, m = latest.split("-")
        return f"{int(y) - years}-{m}"

    # 3. Evolution: components and position 1, 5 and 10 years ago
    evo = {}
    for label, years in (("1_anno", 1), ("5_anni", 5), ("10_anni", 10)):
        mm = month_back(years)
        if mm in c.index.get_level_values("month"):
            past = c.xs(mm, level="month")
            now[f"C1_{AGO[label]}"] = past.C1.reindex(now.index)
            now[f"rank_{AGO[label]}"] = past.rank_indicator.reindex(now.index)
            evo[label] = {"mese": mm, "paesi": int(len(past))}

    # 4. Variant A5 with dollar funding (BIS, 13 countries, last quarter)
    a5 = {}
    bis_path = RAW / "bis_lbs_fx_liabilities_sample.csv"
    if bis_path.exists():
        b = pd.read_csv(bis_path)
        q = b.quarter.max()
        bq = b[b.quarter == q].pivot(index="country", columns="series", values="usd_mn")
        month = f"{q[:4]}-{int(q[-1]) * 3:02d}"
        if month in c.index.get_level_values("month"):
            sub = c.xs(month, level="month").loc[lambda x: x.index.isin(bq.index), ["C1", "C2", "C3"]].copy()
            sub["C4"] = (bq.passivo_usd / bq.passivo_totale).reindex(sub.index)
            sub["foreign_currency_share"] = (bq.passivo_valuta_estera / bq.passivo_totale).reindex(sub.index)
            for k in ("C1", "C2", "C3", "C4"):
                sub["z_" + k] = z(sub[k])
            sub["base_13_countries"] = 0.50 * sub.z_C1 + 0.25 * sub.z_C2 + 0.25 * sub.z_C3
            sub["A5_with_currency_channel"] = 0.40 * sub.z_C1 + 0.20 * sub.z_C2 + 0.20 * sub.z_C3 + 0.20 * sub.z_C4
            sub["rank_base"] = sub.base_13_countries.rank(ascending=False).astype(int)
            sub["rank_A5"] = sub.A5_with_currency_channel.rank(ascending=False).astype(int)
            sub.insert(0, "name", [NAMES[k] for k in sub.index])
            sub.sort_values("rank_A5").round(6).to_csv(PROC / "m3_variant_usd_funding.csv")
            a5 = {"trimestre": q, "mese_bsi": month, **stability(sub.rank_base, sub.rank_A5), "classifica": sub.sort_values("rank_A5").index.tolist()}

    # Stake in absolute value: sight deposits of households and firms in EUR billion
    stake = (w.vista_fam + w.vista_imp).xs(latest, level="month").reindex(now.index) / 1000
    now["sight_deposits_bn_eur"] = stake
    now["area_sight_deposits_share"] = stake / stake.sum()
    stab = {VARIANT_KEYS[v]: stability(now.rank_indicator, now["rank_" + v]) for v in variants[1:]}
    rank_range = now[["rank_" + v for v in variants]].agg(["min", "max"], axis=1)
    now["rank_min"], now["rank_max"] = rank_range["min"], rank_range["max"]
    now.round(6).to_csv(PROC / "m3_ranking_latest.csv")

    # Stability over time: rank correlation between today's ranking and past ones
    time_stab = {}
    for label in evo:
        col = f"rank_{AGO[label]}"
        ok = now[col].notna()
        time_stab[label] = {"paesi": int(ok.sum()), "spearman": spearman(now.loc[ok, "rank_indicator"], now.loc[ok, col])}

    summary = {
        "ultimo_mese": latest,
        "paesi": int(len(now)),
        "primo_mese": c.index.get_level_values("month").min(),
        "classifica": [
            {
                "posizione": int(r.rank_indicator),
                "paese": k,
                "nome": r["name"],
                "indicatore": float(r.indicator),
                "C1": float(r.C1),
                "C2": float(r.C2),
                "C3": float(r.C3),
                "posizione_min_tra_varianti": int(r.rank_min),
                "posizione_max_tra_varianti": int(r.rank_max),
            }
            for k, r in now.iterrows()
        ],
        "stabilita_varianti": stab,
        "variante_A5": a5,
        "evoluzione": evo,
        "stabilita_nel_tempo": time_stab,
        "correlazioni_tra_componenti": now[["C1", "C2", "C3"]].corr().round(3).to_dict(),
        "composizione": {
            "righe": int(len(shares)),
            "tolleranza": TOLERANCE,
            "righe_fuori_tolleranza": int(len(out_of_tol)),
            "quota_fuori_tolleranza": float(len(out_of_tol) / len(shares)),
            "scarto_massimo_assoluto": float(gap.max()),
            "scarto_ultimo_mese_max": float(shares.xs(latest, level="month").residual.abs().max()),
            "paesi_con_mesi_fuori_tolleranza": gap_by_country[gap_by_country.quota_mesi_fuori_tolleranza > 0].round(5).to_dict("index"),
        },
        "media_area_ultimo_mese": {k: float(now[k].mean()) for k in ("C1", "C2", "C3")},
    }
    (PROC / "m3_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    plot_ranking(now, latest)
    plot_evolution(now, latest, evo)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def _style(ax, surface, grid, muted):
    ax.set_facecolor(surface)
    ax.tick_params(colors=muted, labelsize=9, length=0)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(grid)


def plot_ranking(now: pd.DataFrame, latest: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6"
    d = now.sort_values("indicator")
    fig, ax = plt.subplots(figsize=(7.5, 6.6), facecolor=surface)
    _style(ax, surface, grid, muted)
    ax.barh([NAMES_EN[k] for k in d.index], d.indicator, color=blue, height=0.62)
    ax.axvline(0, color=muted, lw=0.8)
    ax.grid(axis="x", color=grid, lw=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Indicator (deviations from the euro area mean, in standard deviations)", color=muted, fontsize=9)
    ax.set_title(f"Structural exposure of bank funding, {latest}", loc="left", fontsize=12, color=ink)
    fig.tight_layout()
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / "04_ranking.png", dpi=160, facecolor=surface)
    plt.close(fig)


def plot_evolution(now: pd.DataFrame, latest: str, evo: dict) -> None:
    if "10_anni" not in evo:
        return
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, dark, light = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#1c5cab", "#86b6ef"
    d = now.dropna(subset=["C1_10_years_ago"]).sort_values("C1")
    fig, ax = plt.subplots(figsize=(7.5, 6.6), facecolor=surface)
    _style(ax, surface, grid, muted)
    y = np.arange(len(d))
    ax.hlines(y, d.C1_10_years_ago * 100, d.C1 * 100, color=grid, lw=2, zorder=1)
    ax.scatter(d.C1_10_years_ago * 100, y, color=light, s=46, zorder=2, label=evo["10_anni"]["mese"], edgecolor=surface, linewidth=1.5)
    ax.scatter(d.C1 * 100, y, color=dark, s=46, zorder=3, label=latest, edgecolor=surface, linewidth=1.5)
    ax.set_yticks(y)
    ax.set_yticklabels([NAMES_EN[k] for k in d.index])
    ax.grid(axis="x", color=grid, lw=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Sight deposits of households and firms over total liabilities (%)", color=muted, fontsize=9)
    ax.set_title("Quantity at stake (C1): ten years ago and today", loc="left", fontsize=12, color=ink)
    ax.legend(frameon=False, fontsize=9, labelcolor=muted, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "04_c1_over_time.png", dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
