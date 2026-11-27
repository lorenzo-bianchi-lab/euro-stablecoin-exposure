"""Module 1: level of dollar stablecoins attributable to the euro area, from external sources.

Applies the shares assumed by ESM Working Paper 79 (7.5% and 15%) to the current circulation,
as defined in reports/06_module1_level.md (section 2). It is not an estimate.

Inputs: DefiLlama stablecoin API (circulation of USDT, USDC and all dollar stablecoins),
CoinGecko (cross-check of the circulation), ECB Data Portal EXR (reference exchange rate),
Eurostat lfst_hhnhtych (households); stored in data/raw/m1_circulation_daily.csv and
data/raw/m1_inputs.json. Also reads data/raw/m3_bsi.csv (sight deposits of module 3).
Outputs: data/processed/m1_level.json, data/processed/m1_monthly_series.csv and the figure
reports/figures/06_level.png.

Usage: python src/module1_level.py            # download the data and recompute
       python src/module1_level.py --offline  # recompute from the files already downloaded
"""

from __future__ import annotations

import io
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, FIG = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "reports" / "figures"
CIRC, AUX = RAW / "m1_circulation_daily.csv", RAW / "m1_inputs.json"
LLAMA = "https://stablecoins.llama.fi"
SHARE_BASE, SHARE_HIGH = 0.075, 0.15  # ESM Working Paper 79, section 5.1
ESM_Q3_2025 = {"data": "2025-09-30", "circolazione_mld_usd": 248.0, "livello_mld_usd": 19.0}
ECB_SURVEY = {"quota_consumatori": 0.05, "mese": "2025-08", "quota_detentori_oltre_10k": 0.10, "mese_importi": "2025-11", "soglia_eur": 10_000}
START = "2023-01-01"
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()
HEAD = {"User-Agent": "research-script/0.1"}


def get_json(url: str, **params):
    r = requests.get(url, params=params or None, headers=HEAD, timeout=90)
    r.raise_for_status()
    return r.json()


def chart(stablecoin_id: str | None) -> pd.Series:
    data = get_json(f"{LLAMA}/stablecoincharts/all", **({"stablecoin": stablecoin_id} if stablecoin_id else {}))
    s = pd.Series(
        {datetime.fromtimestamp(int(p["date"]), timezone.utc).strftime("%Y-%m-%d"): p["totalCirculating"].get("peggedUSD") for p in data}, dtype=float
    )
    return s[~s.index.duplicated(keep="last")] / 1e9


def download() -> tuple[pd.DataFrame, dict]:
    assets = get_json(f"{LLAMA}/stablecoins", includePrices="true")["peggedAssets"]
    ids = {a["gecko_id"]: a["id"] for a in assets if a.get("gecko_id") in ("tether", "usd-coin")}
    circ = pd.DataFrame({"usd_tutte": chart(None), "usdt": chart(ids["tether"]), "usdc": chart(ids["usd-coin"])})
    circ = circ[circ.index >= START].dropna(subset=["usd_tutte"])
    circ.index.name = "data"

    cg = {x["id"]: x for x in get_json("https://api.coingecko.com/api/v3/coins/markets", vs_currency="usd", ids="tether,usd-coin")}
    r = requests.get(
        "https://data-api.ecb.europa.eu/service/data/EXR/D.USD.EUR.SP00.A",
        params={"startPeriod": START, "format": "csvdata", "detail": "dataonly"},
        timeout=90,
    )
    r.raise_for_status()
    fx = pd.read_csv(io.StringIO(r.text)).set_index("TIME_PERIOD").OBS_VALUE

    geo = [("EL" if c == "GR" else c) for c in EURO_AREA]
    j = get_json(
        "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/lfst_hhnhtych",
        **{"format": "JSON", "agechild": "TOTAL", "n_child": "TOTAL", "phhcomp": "TOTAL", "unit": "THS_HH", "sinceTimePeriod": "2023", "geo": geo},
    )
    gi, ti = j["dimension"]["geo"]["category"]["index"], j["dimension"]["time"]["category"]["index"]
    hh = {}
    for year in sorted(ti, reverse=True):  # most recent year with all 21 countries
        vals = {g: j["value"].get(str(gi[g] * len(ti) + ti[year])) for g in gi}
        if all(v is not None for v in vals.values()) and len(vals) == len(EURO_AREA):
            hh = {"anno": year, "famiglie_migliaia": float(sum(vals.values())), "paesi": len(vals)}
            break
    aux = {
        "scaricato_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "coingecko": {
            "usdt": cg["tether"]["circulating_supply"] / 1e9,
            "usdc": cg["usd-coin"]["circulating_supply"] / 1e9,
            "aggiornato": cg["tether"]["last_updated"],
        },
        "cambio": {str(k): float(v) for k, v in fx.items()},
        "famiglie": hh,
    }
    circ = circ.round(6)  # same rounded values with and without network, so the results coincide
    circ.to_csv(CIRC)  # written only here, after all downloads have succeeded
    AUX.write_text(json.dumps(aux, indent=1))
    return circ, aux


def main() -> None:
    if "--offline" in sys.argv:
        circ, aux = pd.read_csv(CIRC, index_col="data"), json.loads(AUX.read_text())
    else:
        circ, aux = download()
    fx = pd.Series(aux["cambio"]).sort_index()

    def rate(day: str) -> tuple[str, float]:
        """ECB reference rate of the last business day up to the given date."""
        s = fx[fx.index <= day]
        return s.index[-1], float(s.iloc[-1])

    last_day = circ.index.max()
    now = circ.loc[last_day]
    fx_day, fx_now = rate(last_day)
    both = float(now.usdt + now.usdc)

    def level(circulation: float, usd_per_eur: float) -> dict:
        return {
            "base_mld_usd": circulation * SHARE_BASE,
            "alto_mld_usd": circulation * SHARE_HIGH,
            "base_mld_eur": circulation * SHARE_BASE / usd_per_eur,
            "alto_mld_eur": circulation * SHARE_HIGH / usd_per_eur,
        }

    # Month-end series and ratio to the sight deposits of the euro area (module 3)
    c = circ.copy()
    c["mese"] = c.index.str[:7]
    monthly = c.groupby("mese").tail(1).set_index("mese")
    monthly["data"] = c.groupby("mese").tail(1).index
    monthly["usd_per_eur"] = [rate(d)[1] for d in monthly.data]
    # Base consistent with the ESM: USDT + USDC. The ESM assumes they are the whole universe of
    # dollar stablecoins (WP 79, section 4.4.1): 174 + 74 = 248 billion in the third quarter of 2025.
    monthly["usdt_piu_usdc"] = monthly.usdt + monthly.usdc
    monthly["livello_base_mld_usd"] = monthly.usdt_piu_usdc * SHARE_BASE
    monthly["livello_alto_mld_usd"] = monthly.usdt_piu_usdc * SHARE_HIGH
    monthly["variante_tutte_base_mld_usd"] = monthly.usd_tutte * SHARE_BASE
    monthly["livello_base_mld_eur"] = monthly.livello_base_mld_usd / monthly.usd_per_eur
    monthly["livello_alto_mld_eur"] = monthly.livello_alto_mld_usd / monthly.usd_per_eur
    monthly["quota_usdt_usdc"] = monthly.usdt_piu_usdc / monthly.usd_tutte
    bsi = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    dep = bsi[bsi.serie.isin(["vista_fam", "vista_imp"])].groupby("mese").milioni_eur.sum() / 1000
    n_c = bsi[bsi.serie == "vista_fam"].groupby("mese").paese.nunique()
    monthly["depositi_a_vista_area_mld_eur"] = dep.reindex(monthly.index)
    monthly["paesi_nei_depositi"] = n_c.reindex(monthly.index)
    monthly["livello_base_su_depositi_a_vista"] = monthly.livello_base_mld_eur / monthly.depositi_a_vista_area_mld_eur
    monthly["livello_alto_su_depositi_a_vista"] = monthly.livello_alto_mld_eur / monthly.depositi_a_vista_area_mld_eur
    monthly.round(6).to_csv(PROC / "m1_monthly_series.csv")

    # Validation on the base used by the ESM
    esm_day = circ.index[circ.index <= ESM_Q3_2025["data"]].max()
    esm_all = float(circ.loc[esm_day, "usd_tutte"])
    esm_circ = float(circ.loc[esm_day, "usdt"] + circ.loc[esm_day, "usdc"])

    # Floor implied by the ECB survey
    hh = aux["famiglie"]
    floor_eur = (
        hh["famiglie_migliaia"] * 1000 * ECB_SURVEY["quota_consumatori"] * ECB_SURVEY["quota_detentori_oltre_10k"] * ECB_SURVEY["soglia_eur"] / 1e9
    )
    nov = monthly.loc[ECB_SURVEY["mese_importi"]] if ECB_SURVEY["mese_importi"] in monthly.index else None

    last_dep_month = monthly.depositi_a_vista_area_mld_eur.last_valid_index()
    out = {
        "calcolato_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "avvertenza": "Application of an external assumption (ESM Working Paper 79), not an estimate.",
        "data_circolazione": last_day,
        "circolazione_mld_usd": {
            "tutte_le_stablecoin_in_dollari": float(now.usd_tutte),
            "usdt": float(now.usdt),
            "usdc": float(now.usdc),
            "usdt_piu_usdc": both,
            "quota_usdt_usdc": both / float(now.usd_tutte),
        },
        "controllo_coingecko": {
            "usdt_mld": aux["coingecko"]["usdt"],
            "usdc_mld": aux["coingecko"]["usdc"],
            "aggiornato": aux["coingecko"]["aggiornato"],
            "differenza_usdt": float(now.usdt / aux["coingecko"]["usdt"] - 1),
            "differenza_usdc": float(now.usdc / aux["coingecko"]["usdc"] - 1),
        },
        "cambio": {"data": fx_day, "usd_per_eur": fx_now},
        "quote_esm": {"base": SHARE_BASE, "alto": SHARE_HIGH},
        "base_di_calcolo": "USDT + USDC, the same base as the ESM (WP 79, section 4.4.1)",
        "livello": level(both, fx_now),
        "variante_tutte_le_stablecoin_in_dollari": level(float(now.usd_tutte), fx_now),
        "convalida_esm": {
            "data": esm_day,
            "usdt_piu_usdc_defillama_mld_usd": esm_circ,
            "circolazione_esm_mld_usd": ESM_Q3_2025["circolazione_mld_usd"],
            "differenza": esm_circ / ESM_Q3_2025["circolazione_mld_usd"] - 1,
            "tutte_le_stablecoin_defillama_mld_usd": esm_all,
            "differenza_con_tutte": esm_all / ESM_Q3_2025["circolazione_mld_usd"] - 1,
            "livello_base_ricalcolato_mld_usd": esm_circ * SHARE_BASE,
            "livello_esm_mld_usd": ESM_Q3_2025["livello_mld_usd"],
            "crescita_circolazione_da_allora": both / esm_circ - 1,
        },
        "rapporto_con_i_depositi": {
            "mese_depositi": last_dep_month,
            "depositi_a_vista_area_mld_eur": float(monthly.loc[last_dep_month, "depositi_a_vista_area_mld_eur"]),
            "livello_base_su_depositi": float(monthly.loc[last_dep_month, "livello_base_su_depositi_a_vista"]),
            "livello_alto_su_depositi": float(monthly.loc[last_dep_month, "livello_alto_su_depositi_a_vista"]),
        },
        "diffusione_bce": ECB_SURVEY,
        "controllo_di_coerenza": {
            "famiglie_area_euro_migliaia": hh["famiglie_migliaia"],
            "anno_famiglie": hh["anno"],
            "famiglie_con_stablecoin_migliaia": hh["famiglie_migliaia"] * ECB_SURVEY["quota_consumatori"],
            "pavimento_mld_eur": floor_eur,
            "livello_base_fine_novembre_2025_mld_eur": None if nov is None else float(nov.livello_base_mld_eur),
            "livello_alto_fine_novembre_2025_mld_eur": None if nov is None else float(nov.livello_alto_mld_eur),
            "pavimento_su_livello_base": None if nov is None else float(floor_eur / nov.livello_base_mld_eur),
            "importo_medio_implicito_per_famiglia_detentrice_eur": None
            if nov is None
            else float(nov.livello_base_mld_eur * 1e9 / (hh["famiglie_migliaia"] * 1000 * ECB_SURVEY["quota_consumatori"])),
        },
        "serie": {
            "primo_mese": monthly.index[0],
            "ultimo_mese": monthly.index[-1],
            "mesi": int(len(monthly)),
            "livello_base_primo_mese_mld_usd": float(monthly.livello_base_mld_usd.iloc[0]),
            "livello_base_massimo_mld_usd": float(monthly.livello_base_mld_usd.max()),
            "mese_massimo": monthly.livello_base_mld_usd.idxmax(),
        },
    }
    (PROC / "m1_level.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    plot(monthly)
    print(json.dumps(out, indent=2, ensure_ascii=False))


def plot(monthly: pd.DataFrame) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue, light = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6", "#cde2fb"
    x = pd.to_datetime(monthly.data)
    fig, ax = plt.subplots(figsize=(8.2, 4.2), facecolor=surface)
    ax.set_facecolor(surface)
    ax.fill_between(x, monthly.livello_base_mld_eur, monthly.livello_alto_mld_eur, color=light, lw=0, label="between 7.5% share and 15% share")
    ax.plot(x, monthly.livello_base_mld_eur, color=blue, lw=2, label="base level (7.5% share)")
    ax.annotate(
        f"{monthly.livello_base_mld_eur.iloc[-1]:.1f}",
        (x.iloc[-1], monthly.livello_base_mld_eur.iloc[-1]),
        xytext=(6, 0),
        textcoords="offset points",
        va="center",
        fontsize=9,
        color=muted,
    )
    ax.annotate(
        f"{monthly.livello_alto_mld_eur.iloc[-1]:.1f}",
        (x.iloc[-1], monthly.livello_alto_mld_eur.iloc[-1]),
        xytext=(6, 0),
        textcoords="offset points",
        va="center",
        fontsize=9,
        color=muted,
    )
    ax.set_ylim(bottom=0)
    ax.set_ylabel("EUR billion", color=muted, fontsize=9)
    ax.tick_params(colors=muted, labelsize=9, length=0)
    ax.grid(axis="y", color=grid, lw=0.8)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%y"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(bymonth=(1, 7)))
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(grid)
    ax.set_xlim(x.iloc[0], x.iloc[-1] + pd.Timedelta(days=75))
    ax.legend(frameon=False, fontsize=9, labelcolor=muted, loc="upper left")
    ax.set_title("Dollar stablecoins attributed to the euro area under the ESM assumptions", loc="left", fontsize=12, color=ink)
    fig.tight_layout()
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / "06_level.png", dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
