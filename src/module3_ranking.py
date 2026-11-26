"""Modulo 3: struttura della raccolta bancaria per paese e classifica di esposizione.

Applica il metodo pre-registrato in reports/04_module3_ranking.md (sezioni 1 e 2):
tabella di composizione del passivo, tre componenti, indicatore principale e cinque
pesature alternative.

Uso: python src/module3_ranking.py            # scarica le serie BCE e ricalcola
     python src/module3_ranking.py --offline  # ricalcola dai file già scaricati
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
STORE = RAW / "m3_bsi.csv"
API = "https://data-api.ecb.europa.eu/service/data/BSI/"
EURO_AREA = "AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK".split()
NAMES = {"AT": "Austria", "BE": "Belgio", "BG": "Bulgaria", "CY": "Cipro", "DE": "Germania", "EE": "Estonia", "ES": "Spagna",
         "FI": "Finlandia", "FR": "Francia", "GR": "Grecia", "HR": "Croazia", "IE": "Irlanda", "IT": "Italia", "LT": "Lituania",
         "LU": "Lussemburgo", "LV": "Lettonia", "MT": "Malta", "NL": "Paesi Bassi", "PT": "Portogallo", "SI": "Slovenia", "SK": "Slovacchia"}
TOLERANCE = 0.005

# nome -> chiave BSI con il paese lasciato libero.
# Le quote di fondi monetari sono quelle detenute da residenti dell'area euro (U2): quelle
# detenute da non residenti sono già dentro le passività verso l'estero.
SERIES = {
    "vista_fam": "M..N.A.L21.A.1.U2.2250.Z01.E", "vista_imp": "M..N.A.L21.A.1.U2.2240.Z01.E",
    "dep_fam": "M..N.A.L20.A.1.U2.2250.Z01.E", "dep_imp": "M..N.A.L20.A.1.U2.2240.Z01.E",
    "dep_non_ifm": "M..N.A.L20.A.1.U2.2300.Z01.E", "dep_ifm": "M..N.A.L20.A.1.U2.1000.Z01.E",
    "dep_tutti": "M..N.A.L20.A.1.U2.0000.Z01.E", "fondi_monetari": "M..N.A.L30.A.1.U2.0000.Z01.E",
    "titoli": "M..N.A.L40.A.1.U2.0000.Z01.E", "capitale": "M..N.A.L60.X.1.Z5.0000.Z01.E",
    "estero": "M..N.A.LXG.A.1.U4.0000.Z01.E", "altre": "M..N.A.L70.X.1.Z5.0000.Z01.E",
    "totale": "M..N.A.T00.A.1.Z5.0000.Z01.E",
}
WEIGHTS = {"C1": 0.50, "C2": 0.25, "C3": 0.25}


def fetch_all() -> pd.DataFrame:
    frames = []
    for name, key in SERIES.items():
        for attempt in range(4):
            r = requests.get(API + key, params={"format": "csvdata", "detail": "dataonly"}, timeout=180)
            if r.status_code in (200, 404):
                break
            time.sleep(5 * (attempt + 1))
        if r.status_code != 200:
            print(f"{name}: nessuna serie (HTTP {r.status_code})", flush=True)
            continue
        d = pd.read_csv(io.StringIO(r.text), dtype={"TIME_PERIOD": str})
        d = d[d.REF_AREA.isin(EURO_AREA) & d.OBS_VALUE.notna()][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]]
        d.insert(0, "serie", name)
        frames.append(d)
        print(f"{name}: {d.REF_AREA.nunique()} paesi, {d.TIME_PERIOD.min()} - {d.TIME_PERIOD.max()}", flush=True)
        time.sleep(1)
    out = pd.concat(frames, ignore_index=True).rename(columns={"REF_AREA": "paese", "TIME_PERIOD": "mese", "OBS_VALUE": "milioni_eur"})
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
    return {"paesi": int(len(common)), "spearman": spearman(m, a),
            "paesi_spostati_piu_di_3_posizioni": int(((m - a).abs() > 3).sum()),
            "spostamento_massimo": int((m - a).abs().max()),
            "primi_cinque_in_comune": int(len(set(m.nsmallest(top).index) & set(a.nsmallest(top).index)))}


def main() -> None:
    long = pd.read_csv(STORE, dtype={"mese": str}) if "--offline" in sys.argv else fetch_all()
    w = long.pivot_table(index=["paese", "mese"], columns="serie", values="milioni_eur")

    # 1. Tabella di composizione (quote sul totale del passivo)
    comp = pd.DataFrame(index=w.index)
    comp["vista_famiglie"] = w.vista_fam
    comp["altri_dep_famiglie"] = w.dep_fam - w.vista_fam
    comp["vista_imprese"] = w.vista_imp
    comp["altri_dep_imprese"] = w.dep_imp - w.vista_imp
    comp["altri_dep_non_ifm"] = w.dep_non_ifm - w.dep_fam - w.dep_imp
    comp["dep_governo_centrale"] = w.dep_tutti - w.dep_non_ifm - w.dep_ifm
    comp["dep_da_ifm"] = w.dep_ifm
    comp["fondi_monetari"] = w.fondi_monetari.fillna(0) if "fondi_monetari" in w else 0.0
    comp["titoli_di_debito"] = w.titoli
    comp["capitale_e_riserve"] = w.capitale
    comp["passivita_estere"] = w.estero
    comp["altre_passivita"] = w.altre
    comp = comp.dropna(subset=["vista_famiglie", "dep_da_ifm", "titoli_di_debito", "altre_passivita"])
    total = w.totale.reindex(comp.index)
    comp["scarto"] = total - comp.sum(axis=1)
    shares = comp.div(total, axis=0)
    shares.insert(0, "totale_passivo_mln", total)
    shares.round(6).to_csv(PROC / "m3_composition.csv")

    gap = shares.scarto.abs()
    out_of_tol = shares[gap > TOLERANCE]
    gap_by_country = shares.scarto.groupby("paese").agg(["min", "max", lambda s: (s.abs() > TOLERANCE).mean()])
    gap_by_country.columns = ["scarto_min", "scarto_max", "quota_mesi_fuori_tolleranza"]

    # 2. Componenti e indicatore
    c = pd.DataFrame(index=w.index)
    c["C1"] = (w.vista_fam + w.vista_imp) / w.totale
    c["C2"] = (w.vista_fam + w.vista_imp) / (w.dep_fam + w.dep_imp)
    c["C3"] = (w.dep_fam + w.dep_imp) / (w.dep_fam + w.dep_imp + w.titoli + w.dep_ifm)
    c["C1_famiglie"] = w.vista_fam / w.totale
    c["C1_imprese"] = w.vista_imp / w.totale
    c["C2_famiglie"] = w.vista_fam / w.dep_fam
    c = c.dropna(subset=["C1", "C2", "C3"])
    by_month = c.groupby("mese")
    for k in ("C1", "C2", "C3", "C1_famiglie", "C2_famiglie"):
        c["z_" + k] = by_month[k].transform(z)
        c["r_" + k] = by_month[k].rank(ascending=False)
    c["indicatore"] = sum(wt * c["z_" + k] for k, wt in WEIGHTS.items())
    c["A1_pesi_uguali"] = (c.z_C1 + c.z_C2 + c.z_C3) / 3
    c["A2_solo_quantita"] = c.z_C1
    c["A3_solo_famiglie"] = 0.50 * c.z_C1_famiglie + 0.25 * c.z_C2_famiglie + 0.25 * c.z_C3
    c["A4_ranghi"] = -(0.50 * c.r_C1 + 0.25 * c.r_C2 + 0.25 * c.r_C3)  # segno invertito: più alto = più esposto
    variants = ["indicatore", "A1_pesi_uguali", "A2_solo_quantita", "A3_solo_famiglie", "A4_ranghi"]
    for v in variants:
        c["pos_" + v] = c.groupby("mese")[v].rank(ascending=False, method="min").astype(int)
    c["paesi_nel_mese"] = c.groupby("mese").C1.transform("size")
    c.round(6).to_csv(PROC / "m3_index.csv")

    latest = c.index.get_level_values("mese").max()
    now = c.xs(latest, level="mese").sort_values("pos_indicatore")
    now.insert(0, "nome", [NAMES[k] for k in now.index])

    def month_back(years: int) -> str:
        y, m = latest.split("-")
        return f"{int(y) - years}-{m}"

    # 3. Evoluzione: componenti e posizione a 1, 5 e 10 anni
    evo = {}
    for label, years in (("1_anno", 1), ("5_anni", 5), ("10_anni", 10)):
        mm = month_back(years)
        if mm in c.index.get_level_values("mese"):
            past = c.xs(mm, level="mese")
            now[f"C1_{label}_fa"] = past.C1.reindex(now.index)
            now[f"pos_{label}_fa"] = past.pos_indicatore.reindex(now.index)
            evo[label] = {"mese": mm, "paesi": int(len(past))}

    # 4. Variante A5 con la raccolta in dollari (BRI, 13 paesi, ultimo trimestre)
    a5 = {}
    bis_path = RAW / "bis_lbs_fx_liabilities_sample.csv"
    if bis_path.exists():
        b = pd.read_csv(bis_path)
        q = b.trimestre.max()
        bq = b[b.trimestre == q].pivot(index="paese", columns="serie", values="milioni_usd")
        month = f"{q[:4]}-{int(q[-1]) * 3:02d}"
        if month in c.index.get_level_values("mese"):
            sub = c.xs(month, level="mese").loc[lambda x: x.index.isin(bq.index), ["C1", "C2", "C3"]].copy()
            sub["C4"] = (bq.passivo_usd / bq.passivo_totale).reindex(sub.index)
            sub["quota_valuta_estera"] = (bq.passivo_valuta_estera / bq.passivo_totale).reindex(sub.index)
            for k in ("C1", "C2", "C3", "C4"):
                sub["z_" + k] = z(sub[k])
            sub["base_13_paesi"] = 0.50 * sub.z_C1 + 0.25 * sub.z_C2 + 0.25 * sub.z_C3
            sub["A5_con_canale_valutario"] = 0.40 * sub.z_C1 + 0.20 * sub.z_C2 + 0.20 * sub.z_C3 + 0.20 * sub.z_C4
            sub["pos_base"] = sub.base_13_paesi.rank(ascending=False).astype(int)
            sub["pos_A5"] = sub.A5_con_canale_valutario.rank(ascending=False).astype(int)
            sub.insert(0, "nome", [NAMES[k] for k in sub.index])
            sub.sort_values("pos_A5").round(6).to_csv(PROC / "m3_variant_usd_funding.csv")
            a5 = {"trimestre": q, "mese_bsi": month, **stability(sub.pos_base, sub.pos_A5),
                  "classifica": sub.sort_values("pos_A5").index.tolist()}

    # Posta in gioco in valore assoluto: depositi a vista di famiglie e imprese in miliardi di euro
    stake = (w.vista_fam + w.vista_imp).xs(latest, level="mese").reindex(now.index) / 1000
    now["vista_mld_eur"] = stake
    now["quota_dei_depositi_a_vista_dell_area"] = stake / stake.sum()
    stab = {v: stability(now.pos_indicatore, now["pos_" + v]) for v in variants[1:]}
    rank_range = now[["pos_" + v for v in variants]].agg(["min", "max"], axis=1)
    now["pos_min"], now["pos_max"] = rank_range["min"], rank_range["max"]
    now.round(6).to_csv(PROC / "m3_ranking_latest.csv")

    # Stabilità nel tempo: correlazione di rango tra la classifica di oggi e quelle passate
    time_stab = {}
    for label in evo:
        col = f"pos_{label}_fa"
        ok = now[col].notna()
        time_stab[label] = {"paesi": int(ok.sum()), "spearman": spearman(now.loc[ok, "pos_indicatore"], now.loc[ok, col])}

    summary = {
        "ultimo_mese": latest, "paesi": int(len(now)), "primo_mese": c.index.get_level_values("mese").min(),
        "classifica": [{"posizione": int(r.pos_indicatore), "paese": k, "nome": r.nome, "indicatore": float(r.indicatore),
                        "C1": float(r.C1), "C2": float(r.C2), "C3": float(r.C3),
                        "posizione_min_tra_varianti": int(r.pos_min), "posizione_max_tra_varianti": int(r.pos_max)}
                       for k, r in now.iterrows()],
        "stabilita_varianti": stab, "variante_A5": a5, "evoluzione": evo, "stabilita_nel_tempo": time_stab,
        "correlazioni_tra_componenti": now[["C1", "C2", "C3"]].corr().round(3).to_dict(),
        "composizione": {
            "righe": int(len(shares)), "tolleranza": TOLERANCE,
            "righe_fuori_tolleranza": int(len(out_of_tol)), "quota_fuori_tolleranza": float(len(out_of_tol) / len(shares)),
            "scarto_massimo_assoluto": float(gap.max()),
            "scarto_ultimo_mese_max": float(shares.xs(latest, level="mese").scarto.abs().max()),
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
    d = now.sort_values("indicatore")
    fig, ax = plt.subplots(figsize=(7.5, 6.6), facecolor=surface)
    _style(ax, surface, grid, muted)
    ax.barh(d.nome, d.indicatore, color=blue, height=0.62)
    ax.axvline(0, color=muted, lw=0.8)
    ax.grid(axis="x", color=grid, lw=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Indicatore (scarti dalla media dell'area euro, in deviazioni standard)", color=muted, fontsize=9)
    ax.set_title(f"Esposizione strutturale della raccolta bancaria, {latest}", loc="left", fontsize=12, color=ink)
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
    d = now.dropna(subset=["C1_10_anni_fa"]).sort_values("C1")
    fig, ax = plt.subplots(figsize=(7.5, 6.6), facecolor=surface)
    _style(ax, surface, grid, muted)
    y = np.arange(len(d))
    ax.hlines(y, d.C1_10_anni_fa * 100, d.C1 * 100, color=grid, lw=2, zorder=1)
    ax.scatter(d.C1_10_anni_fa * 100, y, color=light, s=46, zorder=2, label=evo["10_anni"]["mese"], edgecolor=surface, linewidth=1.5)
    ax.scatter(d.C1 * 100, y, color=dark, s=46, zorder=3, label=latest, edgecolor=surface, linewidth=1.5)
    ax.set_yticks(y)
    ax.set_yticklabels(d.nome)
    ax.grid(axis="x", color=grid, lw=0.8)
    ax.set_axisbelow(True)
    ax.set_xlabel("Depositi a vista di famiglie e imprese sul totale del passivo (%)", color=muted, fontsize=9)
    ax.set_title("Quantità in gioco (C1): dieci anni fa e oggi", loc="left", fontsize=12, color=ink)
    ax.legend(frameon=False, fontsize=9, labelcolor=muted, loc="lower right")
    fig.tight_layout()
    fig.savefig(FIG / "04_c1_over_time.png", dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
