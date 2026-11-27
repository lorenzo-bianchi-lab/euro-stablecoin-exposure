"""Module 5: from deposit outflows to credit, and the two-channel map.

Applies the coefficients of ECB Working Paper 3199 to the outflows of module 4, as defined
in reports/07_module5_credit.md (section 2). They are coefficients estimated on individual
banks applied to national aggregates: orders of magnitude, not forecasts.

Inputs: ECB Data Portal, BSI dataset (monthly loans and deposits of other financial
corporations, quarterly dollar liabilities), stored in data/raw/m5_bsi.csv; BIS locational
banking statistics via src/bis_lbs_probe.py (data/raw/bis_lbs_fx_liabilities_sample.csv);
data/raw/m3_bsi.csv, data/processed/m3_ranking_latest.csv and
data/processed/m4_scenarios_by_country.csv.
Outputs: data/processed/m5_retail_share.csv, m5_credit_by_country.csv, m5_credit_euro_area.csv,
m5_two_channel_map.csv, m5_summary.json; figure reports/figures/07_two_channel_map.png.

Usage: python src/module5_credit.py            # download the additional series and recompute
       python src/module5_credit.py --offline  # recompute from the files already downloaded
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

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, FIG = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "reports" / "figures"
STORE = RAW / "m5_bsi.csv"
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
# NAMES are the country names stored in the data files (column "nome"): they stay as they are.
# NAMES_EN are English names for figures and descriptions only.
NAMES_EN = {
    "AT": "Austria",
    "BE": "Belgium",
    "BG": "Bulgaria",
    "CY": "Cyprus",
    "DE": "Germany",
    "EE": "Estonia",
    "ES": "Spain",
    "FI": "Finland",
    "FR": "France",
    "GR": "Greece",
    "HR": "Croatia",
    "IE": "Ireland",
    "IT": "Italy",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "LV": "Latvia",
    "MT": "Malta",
    "NL": "Netherlands",
    "PT": "Portugal",
    "SI": "Slovenia",
    "SK": "Slovakia",
}

# Coefficients of ECB Working Paper 3199 (see the table in report 07, section 1)
RULE_UNIFORM = 0.5  # 100 bn of retail deposits -> about 50 bn of loans (section 3.2)
SD_DEPOSITS_PP = 0.8  # one standard deviation of sight deposits over total assets, in points
COEF = {"col3": {"basso": 0.441, "alto": 3.089}, "col4": {"basso": 0.342, "alto": 4.173}}  # table 1, in absolute value
RETAIL_PERCENTILE = 75

MONTHLY = {
    "prestiti_fam": "M..N.A.A20.A.1.U2.2250.Z01.E",
    "prestiti_imp": "M..N.A.A20.A.1.U2.2240.Z01.E",
    "dep_ofi": "M..N.A.L20.A.1.U2.2210.Z01.E",
    "dep_icpf": "M..N.A.L20.A.1.U2.2220.Z01.E",
}
QUARTERLY_USD = {
    "usd_dep_ifm_area": "Q..N.A.L20.A.1.U2.1000.USD.E",
    "usd_dep_non_ifm_area": "Q..N.A.L20.A.1.U2.2000.USD.E",
    "usd_dep_ifm_estero": "Q..N.A.L20.A.1.U4.1000.USD.E",
    "usd_dep_non_ifm_estero": "Q..N.A.L20.A.1.U4.2000.USD.E",
    "usd_titoli": "Q..N.A.L40.A.1.Z5.0000.USD.E",
}


def fetch_all() -> pd.DataFrame:
    frames = []
    for name, key in {**MONTHLY, **QUARTERLY_USD}.items():
        params = {"format": "csvdata", "detail": "dataonly", "startPeriod": "2015-01"}
        for attempt in range(4):
            r = requests.get(API + key, params=params, timeout=180)
            if r.status_code in (200, 404):
                break
            time.sleep(5 * (attempt + 1))
        r.raise_for_status()
        d = pd.read_csv(io.StringIO(r.text), dtype={"TIME_PERIOD": str})
        d = d[d.REF_AREA.isin(EURO_AREA) & d.OBS_VALUE.notna()][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]]
        d.insert(0, "serie", name)
        frames.append(d)
        print(f"{name}: {d.REF_AREA.nunique()} countries, up to {d.TIME_PERIOD.max()}", flush=True)
        time.sleep(1)
    out = pd.concat(frames, ignore_index=True).rename(columns={"REF_AREA": "paese", "TIME_PERIOD": "periodo", "OBS_VALUE": "milioni_eur"})
    out.to_csv(STORE, index=False)
    import bis_lbs_probe  # also updates the BIS series used for the dollar axis

    bis_lbs_probe.main()
    return out


def quarter_end_month(q: str) -> str:
    return f"{q[:4]}-{int(q[-1]) * 3:02d}"


def continuous_weight(quota: pd.Series, threshold: float) -> tuple[pd.Series, float, float]:
    """Weight between 0 and 1 to interpolate between the low and the high coefficient on the retail share.

    Anchors: the median retail share of the countries below the threshold (weight 0) and the
    median of those above (weight 1). Definition set in SPEC before the calculation.
    """
    q_low, q_high = float(quota[quota <= threshold].median()), float(quota[quota > threshold].median())
    return ((quota - q_low) / (q_high - q_low)).clip(0, 1), q_low, q_high


def credit_effects(flows: pd.DataFrame, bal: pd.DataFrame, high: set[str]) -> pd.DataFrame:
    """Credit reduction by country, for each scenario and allocation rule."""
    f = flows.join(bal[["totale", "prestiti", "peso_continuo"]], on="paese")
    out = f[["scenario", "regola_paesi", "paese", "nome", "importo_mld_usd", "deflusso_mld"]].copy()
    out["prestiti_mld"] = f.prestiti
    out["quota_retail_alta"] = f.paese.isin(high)
    shock_sd = 100 * f.deflusso_mld / f.totale / SD_DEPOSITS_PP  # outflow in standard deviations
    out["uniforme_mld"] = RULE_UNIFORM * f.deflusso_mld
    for col, c in COEF.items():
        suffix = "" if col == "col3" else "_col4"
        low_pct, high_pct = c["basso"] * shock_sd, c["alto"] * shock_sd
        out[f"basso_mld{suffix}"] = low_pct / 100 * f.prestiti
        out[f"alto_mld{suffix}"] = high_pct / 100 * f.prestiti
        out[f"soglia_mld{suffix}"] = np.where(out.quota_retail_alta, out[f"alto_mld{suffix}"], out[f"basso_mld{suffix}"])
        out[f"continua_mld{suffix}"] = out[f"basso_mld{suffix}"] + (out[f"alto_mld{suffix}"] - out[f"basso_mld{suffix}"]) * f.peso_continuo.to_numpy()
    for k in ("uniforme", "basso", "alto", "soglia", "continua"):
        out[f"{k}_pct_prestiti"] = 100 * out[f"{k}_mld"] / f.prestiti
    return out


def main() -> None:
    offline = "--offline" in sys.argv
    long = pd.read_csv(STORE, dtype={"periodo": str}) if offline else fetch_all()
    m3 = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    month = m3.mese.max()
    b3 = m3[m3.mese == month].pivot(index="paese", columns="serie", values="milioni_eur") / 1000
    mm = long[long.serie.isin(MONTHLY)]
    b5 = mm[mm.periodo == month].pivot(index="paese", columns="serie", values="milioni_eur") / 1000
    bal = pd.DataFrame(
        {
            "totale": b3.totale,
            "vista": b3.vista_fam + b3.vista_imp,
            "dep_fam": b3.dep_fam,
            "prestiti": b5.prestiti_fam + b5.prestiti_imp,
            "prestiti_fam": b5.prestiti_fam,
            "prestiti_imp": b5.prestiti_imp,
            "dep_non_bancari": b5.dep_ofi + b5.dep_icpf,
        }
    )
    bal["quota_retail"] = bal.dep_fam / (bal.dep_fam + bal.dep_non_bancari)
    bal["prestiti_su_passivo"] = bal.prestiti / bal.totale
    threshold = float(np.percentile(bal.quota_retail, RETAIL_PERCENTILE))
    high = set(bal.index[bal.quota_retail > threshold])
    bal["quota_retail_alta"] = bal.index.isin(high)
    bal["peso_continuo"], q_low, q_high = continuous_weight(bal.quota_retail, threshold)
    bal["coefficiente_continuo"] = COEF["col3"]["basso"] + (COEF["col3"]["alto"] - COEF["col3"]["basso"]) * bal.peso_continuo
    bal.insert(0, "nome", [NAMES[k] for k in bal.index])
    bal.round(6).sort_values("quota_retail", ascending=False).to_csv(PROC / "m5_retail_share.csv")

    # 1. Credit reduction
    flows = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
    flows = flows[flows.regola_depositi == "T1"]
    credit = credit_effects(flows, bal, high)
    credit.round(6).to_csv(PROC / "m5_credit_by_country.csv", index=False)
    ea = (
        credit.groupby(["scenario", "regola_paesi"])
        .agg(
            importo_mld_usd=("importo_mld_usd", "first"),
            deflusso_mld=("deflusso_mld", "sum"),
            prestiti_mld=("prestiti_mld", "sum"),
            **{f"{k}_mld": (f"{k}_mld", "sum") for k in ("uniforme", "basso", "alto", "soglia", "continua")},
            soglia_mld_col4=("soglia_mld_col4", "sum"),
            basso_mld_col4=("basso_mld_col4", "sum"),
            alto_mld_col4=("alto_mld_col4", "sum"),
        )
        .reset_index()
    )
    for k in ("uniforme", "basso", "alto", "soglia", "continua"):
        ea[f"{k}_pct_prestiti"] = 100 * ea[f"{k}_mld"] / ea.prestiti_mld
        ea[f"{k}_per_euro_di_deflusso"] = ea[f"{k}_mld"] / ea.deflusso_mld
    ea.round(6).to_csv(PROC / "m5_credit_euro_area.csv", index=False)

    # 2. Two-channel map
    rank = pd.read_csv(PROC / "m3_ranking_latest.csv", index_col=0)
    bis = pd.read_csv(RAW / "bis_lbs_fx_liabilities_sample.csv")
    q = bis.trimestre.max()
    bq = bis[bis.trimestre == q].pivot(index="paese", columns="serie", values="milioni_usd")
    usd_bis = (bq.passivo_usd / bq.passivo_totale).rename("usd_bri")
    qq = long[long.serie.isin(QUARTERLY_USD)]
    q_bsi = qq.periodo.max()
    cur = qq[qq.periodo == q_bsi].pivot(index="paese", columns="serie", values="milioni_eur").reindex(EURO_AREA)
    tot_q = m3[(m3.mese == quarter_end_month(q_bsi)) & (m3.serie == "totale")].set_index("paese").milioni_eur
    usd_bsi = (cur.sum(axis=1, min_count=1) / tot_q).rename("usd_bsi")
    usd_bsi_area = (cur[["usd_dep_ifm_area", "usd_dep_non_ifm_area"]].sum(axis=1, min_count=1) / tot_q).rename("usd_bsi_solo_area")
    mp = pd.DataFrame({"nome": pd.Series(NAMES), "depositi_a_vista": rank.C1}).join([usd_bis, usd_bsi, usd_bsi_area])
    mp["componenti_bsi_disponibili"] = cur.notna().sum(axis=1)
    mp["fonte_dollari"] = np.where(mp.usd_bri.notna(), "BRI", "BSI trimestrale")
    mp["dollari"] = mp.usd_bri.fillna(mp.usd_bsi)
    both = mp.dropna(subset=["usd_bri", "usd_bsi"])
    complete = both[both.componenti_bsi_disponibili == len(QUARTERLY_USD)]
    ratio = float((complete.usd_bsi / complete.usd_bri).median()) if len(complete) else float("nan")
    med_x, med_y = float(mp.depositi_a_vista.median()), float(mp.dollari.median())

    def quadrant(x, y, mx, my):
        return ("A" if y <= my else "B") if x > mx else ("C" if y > my else "D")

    mp["quadrante"] = [quadrant(x, y, med_x, med_y) for x, y in zip(mp.depositi_a_vista, mp.dollari, strict=True)]
    # Sensitivity: BSI values of the eight countries brought to the BIS scale with the observed median ratio
    mp["dollari_riscalati"] = mp.usd_bri.fillna(mp.usd_bsi / ratio if ratio and not np.isnan(ratio) else mp.usd_bsi)
    med_y2 = float(mp.dollari_riscalati.median())
    mp["quadrante_riscalato"] = [quadrant(x, y, med_x, med_y2) for x, y in zip(mp.depositi_a_vista, mp.dollari_riscalati, strict=True)]
    mp["quota_retail_alta"] = mp.index.isin(high)
    mp.round(6).sort_values(["quadrante", "depositi_a_vista"], ascending=[True, False]).to_csv(PROC / "m5_two_channel_map.csv")

    def top(scenario: str, rule: str, col: str, n: int = 5) -> list[dict]:
        sel = credit[(credit.scenario == scenario) & (credit.regola_paesi == rule)].sort_values(col, ascending=False).head(n)
        return [
            {
                "paese": r.paese,
                "nome": r.nome,
                "soglia_mld": float(r.soglia_mld),
                "soglia_pct_prestiti": float(r.soglia_pct_prestiti),
                "uniforme_mld": float(r.uniforme_mld),
                "uniforme_pct_prestiti": float(r.uniforme_pct_prestiti),
                "continua_mld": float(r.continua_mld),
                "continua_pct_prestiti": float(r.continua_pct_prestiti),
                "basso_mld": float(r.basso_mld),
                "alto_mld": float(r.alto_mld),
            }
            for r in sel.itertuples()
        ]

    scen = [s for s in credit.scenario.unique()]
    summary = {
        "mese_bilanci": month,
        "avvertenza": "Coefficients estimated on individual banks (ECB WP 3199) applied to national aggregates: orders of magnitude, not forecasts.",
        "coefficienti": {"regola_uniforme": RULE_UNIFORM, "deviazione_standard_pp": SD_DEPOSITS_PP, **COEF},
        "valore_in_evidenza": "uniform rule (0.5 euro of loans per euro of deposits), with the range between the low and the high coefficient",
        "variante_continua": {
            "ancoraggio_basso": q_low,
            "ancoraggio_alto": q_high,
            "definizione": (
                "coefficient interpolated linearly on the retail share between the medians of the two groups, bounded between low and high"
            ),
        },
        "soglia_quota_retail": {
            "percentile": RETAIL_PERCENTILE,
            "valore": threshold,
            "paesi_sopra": sorted(high),
            "quota_retail_area": float(bal.dep_fam.sum() / (bal.dep_fam.sum() + bal.dep_non_bancari.sum())),
        },
        "prestiti_area_mld": float(bal.prestiti.sum()),
        "prestiti_su_passivo_area": float(bal.prestiti.sum() / bal.totale.sum()),
        "area_euro_R1": ea[ea.regola_paesi == "R1"].set_index("scenario").drop(columns="regola_paesi").to_dict("index"),
        "primi_cinque_per_mld": {s: top(s, "R1", "uniforme_mld") for s in scen},
        "primi_cinque_per_pct": {s: top(s, "R1", "uniforme_pct_prestiti") for s in scen},
        "primi_cinque_per_pct_continua": {s: top(s, "R1", "continua_pct_prestiti") for s in scen},
        "mappa": {
            "trimestre_bri": q,
            "trimestre_bsi": q_bsi,
            "mediana_depositi_a_vista": med_x,
            "mediana_dollari": med_y,
            "quadranti": {k: sorted(mp.index[mp.quadrante == k]) for k in "ABCD"},
            "quadranti_riscalati": {k: sorted(mp.index[mp.quadrante_riscalato == k]) for k in "ABCD"},
            "paesi_che_cambiano_con_riscalatura": sorted(mp.index[mp.quadrante != mp.quadrante_riscalato]),
            "confronto_fonti": {
                "paesi_con_entrambe": int(len(both)),
                "paesi_con_bsi_completo": int(len(complete)),
                "rapporto_mediano_bsi_su_bri": ratio,
                "correlazione_di_rango": float(complete.usd_bsi.rank().corr(complete.usd_bri.rank())) if len(complete) > 2 else None,
            },
            "paesi_fonte_bsi": sorted(mp.index[mp.fonte_dollari != "BRI"]),
            "correlazione_di_rango_assi": float(mp.depositi_a_vista.rank().corr(mp.dollari.rank())),
        },
    }
    (PROC / "m5_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    plot(mp, med_x, med_y)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def plot(mp: pd.DataFrame, med_x: float, med_y: float) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue, orange = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6", "#eb6834"
    fig, ax = plt.subplots(figsize=(8.4, 6.2), facecolor=surface)
    ax.set_facecolor(surface)
    ax.axvline(med_x * 100, color=muted, lw=0.8, ls=(0, (3, 3)))
    ax.axhline(med_y * 100, color=muted, lw=0.8, ls=(0, (3, 3)))
    for src, color, marker, label in (("BRI", blue, "o", "dollars: BIS source"), ("BSI trimestrale", orange, "s", "dollars: quarterly BSI source")):
        d = mp[mp.fonte_dollari == src]
        ax.scatter(
            d.depositi_a_vista * 100, d.dollari * 100, color=color, marker=marker, s=52, edgecolor=surface, linewidth=1.5, label=label, zorder=3
        )
    for k, r in mp.iterrows():
        ax.annotate(k, (r.depositi_a_vista * 100, r.dollari * 100), xytext=(5, 4), textcoords="offset points", fontsize=8, color=muted)
    xmax, ymax = ax.get_xlim()[1], ax.get_ylim()[1]
    for text, x, y, ha, va in (
        ("A  high deposits, low dollars", xmax, ax.get_ylim()[0], "right", "bottom"),
        ("B  high deposits, high dollars", xmax, ymax, "right", "top"),
        ("C  low deposits, high dollars", ax.get_xlim()[0], ymax, "left", "top"),
        ("D  low deposits, low dollars", ax.get_xlim()[0], ax.get_ylim()[0], "left", "bottom"),
    ):
        ax.annotate(
            text,
            (x, y),
            xytext=(-6 if ha == "right" else 6, -6 if va == "top" else 6),
            textcoords="offset points",
            ha=ha,
            va=va,
            fontsize=9,
            color=ink,
        )
    ax.set_xlabel("Sight deposits of households and firms over liabilities (%)", color=muted, fontsize=9)
    ax.set_ylabel("Dollar liabilities over liabilities (%)", color=muted, fontsize=9)
    ax.tick_params(colors=muted, labelsize=9, length=0)
    ax.grid(color=grid, lw=0.8)
    ax.set_axisbelow(True)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(grid)
    ax.legend(frameon=False, fontsize=9, labelcolor=muted, loc="center right")
    ax.set_title("Two-channel map: sight deposits and dollar funding", loc="left", fontsize=12, color=ink)
    fig.tight_layout()
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / "07_two_channel_map.png", dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
