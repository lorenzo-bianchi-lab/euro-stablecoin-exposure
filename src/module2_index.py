"""Modulo 2: indice settimanale della quota EUR dei volumi stablecoin/fiat.

Aggiorna l'archivio cumulativo dei volumi giornalieri e calcola le serie definite in
reports/03_modulo2_indice.md (sezione 2): USDT e USDC, con e senza Coinbase, su due
finestre (principale dal 2024-12-09, lunga dal 2023-01-02 senza Kraken e Gemini).

Uso: python src/module2_index.py            # aggiorna l'archivio (ultime settimane) e ricalcola
     python src/module2_index.py --full     # riscarica tutta la finestra e confronta con l'archivio
     python src/module2_index.py --offline  # ricalcola dall'archivio senza scaricare nulla
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

import exchange_fetch

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, FIG = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "reports" / "figures"
STORE = RAW / "m2_daily_volumes.csv"
LONG_START = datetime(2023, 1, 2, tzinfo=timezone.utc)   # lunedì
MAIN_START = "2024-12-09"                                 # prima settimana intera coperta da Kraken
LONG_EXCLUDED = ["Kraken", "Gemini"]
KEYS = ["exchange", "symbol", "date"]
SERIES = {  # nome -> (stablecoin oppure None per entrambe, exchange esclusi)
    "usdt": ("USDT", []), "usdt_senza_coinbase": ("USDT", ["Coinbase"]),
    "usdc": ("USDC", []), "usdc_senza_coinbase": ("USDC", ["Coinbase"]),
    "totale": (None, []),
}


def last_closed_week_end(now: datetime | None = None) -> datetime:
    """Lunedì 00:00 UTC della settimana in corso: fine (esclusa) dell'ultima settimana completa."""
    now = now or datetime.now(timezone.utc)
    monday = now - timedelta(days=now.weekday())
    return monday.replace(hour=0, minute=0, second=0, microsecond=0)


def update_store(end: datetime, full: bool) -> dict:
    """Scarica i volumi e li unisce all'archivio senza sovrascrivere i giorni già presenti."""
    old = pd.read_csv(STORE) if STORE.exists() else pd.DataFrame(columns=["exchange", "symbol", "stable", "fiat", "date", "volume_stable"])
    if full or old.empty:
        start = LONG_START
    else:  # si riscaricano le ultime quattro settimane archiviate per confronto, più quelle nuove
        last = datetime.strptime(old.date.max(), "%Y-%m-%d").replace(tzinfo=timezone.utc)
        start = max(LONG_START, last - timedelta(days=27 + last.weekday()))
    rows, log = exchange_fetch.collect(start, end, verbose=False)
    new = pd.DataFrame(rows, columns=["exchange", "symbol", "stable", "fiat", "date", "volume_stable"])
    pd.DataFrame(log, columns=["exchange", "symbol", "stable", "fiat", "status", "days", "first_day", "last_day", "detail"]).to_csv(
        PROC / "m2_last_fetch_log.csv", index=False)

    both = old.merge(new, on=KEYS, suffixes=("_archivio", "_nuovo"))
    diff = (both.volume_stable_nuovo - both.volume_stable_archivio).abs()
    rel = diff / both.volume_stable_archivio.abs().clip(lower=1)
    both["differenza_relativa"] = rel
    revised = both[(rel > 0.001) & (diff > 100)]
    revised[KEYS + ["volume_stable_archivio", "volume_stable_nuovo", "differenza_relativa"]].to_csv(PROC / "m2_revisions.csv", index=False)

    added = new.merge(old[KEYS], on=KEYS, how="left", indicator=True)
    added = added[added._merge == "left_only"].drop(columns="_merge")
    store = pd.concat([old, added], ignore_index=True).sort_values(KEYS)
    store.to_csv(STORE, index=False)
    new.to_csv(PROC / "m2_last_fetch.csv.tmp", index=False)
    return {"fetched_from": start.strftime("%Y-%m-%d"), "fetched_to_excl": end.strftime("%Y-%m-%d"),
            "rows_fetched": len(new), "rows_compared": len(both), "rows_revised": len(revised),
            "max_relative_revision": float(rel.max()) if len(rel) else 0.0, "rows_added": len(added),
            "pairs_ok": sum(1 for r in log if r[4] == "ok"), "pairs_error": [f"{r[0]} {r[1]}" for r in log if r[4] == "errore"]}


def eur_share(df: pd.DataFrame) -> float:
    total = df.volume_stable.sum()
    return float(df.loc[df.fiat == "EUR", "volume_stable"].sum() / total) if total else float("nan")


def weekly_index(d: pd.DataFrame, excluded: list[str] | None = None) -> pd.DataFrame:
    excluded = excluded or []
    cols = {}
    for name, (stable, drop) in SERIES.items():
        sub = d[~d.exchange.isin(excluded + drop)]
        if stable:
            sub = sub[sub.stable == stable]
        cols[name] = sub.groupby("week").apply(eur_share, include_groups=False)
    out = pd.DataFrame(cols)
    base = d[~d.exchange.isin(excluded)]
    out["exchange_attivi"] = base.groupby("week").exchange.nunique()
    out["volume_fiat_mld"] = base.groupby("week").volume_stable.sum() / 1e9
    # volumi contro EUR in valore assoluto: servono a capire se l'indice si muove per l'euro o per le altre valute
    for tok in ("USDT", "USDC"):
        sel = base[base.stable == tok]
        out[f"volume_eur_{tok.lower()}_mld"] = sel[sel.fiat == "EUR"].groupby("week").volume_stable.sum() / 1e9
        out[f"volume_fiat_{tok.lower()}_mld"] = sel.groupby("week").volume_stable.sum() / 1e9
    return out


def stats(series: pd.Series) -> dict:
    s = series.dropna()
    last52 = s.iloc[-52:]
    sd = float(last52.std(ddof=1))
    return {
        "ultima_settimana": s.index[-1], "valore": float(s.iloc[-1]),
        "variazione_pp": float((s.iloc[-1] - s.iloc[-2]) * 100),
        "media_4_settimane": float(s.iloc[-4:].mean()),
        "media_52_settimane": float(last52.mean()), "dev_std_52_settimane": sd,
        "scarto_standardizzato": float((s.iloc[-1] - last52.mean()) / sd) if sd else float("nan"),
        "minimo": float(s.min()), "settimana_minimo": s.idxmin(), "massimo": float(s.max()), "settimana_massimo": s.idxmax(),
        "prima_settimana": s.index[0], "numero_settimane": int(len(s)),
        "variazione_dall_inizio_pp": float((s.iloc[-1] - s.iloc[0]) * 100),
        "media_prime_13_settimane": float(s.iloc[:13].mean()), "media_ultime_13_settimane": float(s.iloc[-13:].mean()),
    }


def main() -> None:
    args = set(sys.argv[1:])
    end = last_closed_week_end()
    fetch_info = {"modalita": "offline"} if "--offline" in args else update_store(end, full="--full" in args)
    if "--offline" not in args:
        fetch_info["modalita"] = "completa" if "--full" in args else "incrementale"

    d = pd.read_csv(STORE)
    d = d[d.date < end.strftime("%Y-%m-%d")].copy()
    d["week"] = pd.to_datetime(d.date).dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")

    main_d = d[d.week >= MAIN_START]
    idx_main = weekly_index(main_d)
    idx_long = weekly_index(d, LONG_EXCLUDED)
    weeks_main = sorted(main_d.week.unique())
    present = main_d.groupby("exchange").week.nunique()
    constant = sorted(present[present == len(weeks_main)].index)
    idx_const = weekly_index(main_d[main_d.exchange.isin(constant)])

    # Registro di partecipazione: giorni con dati e volumi per exchange e settimana
    part = d.groupby(["week", "exchange"]).agg(giorni=("date", "nunique"), coppie=("symbol", "nunique"), volume=("volume_stable", "sum")).reset_index()
    part["volume_eur"] = d[d.fiat == "EUR"].groupby(["week", "exchange"]).volume_stable.sum().reindex(pd.MultiIndex.from_frame(part[["week", "exchange"]])).fillna(0).to_numpy()
    part["quota_del_volume_settimanale"] = part.volume / part.groupby("week").volume.transform("sum")
    part.round(6).to_csv(PROC / "m2_exchange_participation.csv", index=False)
    all_weeks = sorted(d.week.unique())
    changes = part.groupby("exchange").agg(prima_settimana=("week", "min"), ultima_settimana=("week", "max"), settimane=("week", "nunique"),
                                           settimane_incomplete=("giorni", lambda g: int((g < 7).sum()))).reset_index()
    changes["settimane_mancanti_in_mezzo"] = [
        len([w for w in all_weeks if r.prima_settimana <= w <= r.ultima_settimana]) - r.settimane for r in changes.itertuples()]
    changes["nel_pannello_costante"] = changes.exchange.isin(constant)
    changes.to_csv(PROC / "m2_panel_changes.csv", index=False)
    pair_changes = d.groupby(["exchange", "symbol", "stable", "fiat"]).agg(primo_giorno=("date", "min"), ultimo_giorno=("date", "max"), giorni=("date", "nunique")).reset_index()
    pair_changes.to_csv(PROC / "m2_pair_coverage.csv", index=False)

    # Riproducibilità: confronto con l'indice salvato dall'esecuzione precedente
    names = [n for n in SERIES]
    repro = {}
    prev_path = PROC / "m2_weekly_index.csv"
    if prev_path.exists():
        prev = pd.read_csv(prev_path, index_col=0)
        common = prev.index.intersection(idx_main.index)
        repro["settimane_confrontate_con_esecuzione_precedente"] = int(len(common))
        repro["differenza_massima_pp"] = float((idx_main.loc[common, names].round(6) - prev.loc[common, names]).abs().max().max() * 100)
    tmp = PROC / "m2_last_fetch.csv.tmp"
    if tmp.exists() and "--full" in args:  # indice ricalcolato con i soli dati appena riscaricati
        fresh = pd.read_csv(tmp)
        fresh = fresh[fresh.date < end.strftime("%Y-%m-%d")]
        fresh["week"] = pd.to_datetime(fresh.date).dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")
        idx_fresh = weekly_index(fresh[fresh.week >= MAIN_START])
        common = idx_fresh.index.intersection(idx_main.index)
        gap = (idx_fresh.loc[common, names] - idx_main.loc[common, names]).abs() * 100
        repro["solo_dati_riscaricati"] = {"settimane": int(len(common)), "differenza_massima_pp": float(gap.max().max()),
                                          "settimane_con_differenza_oltre_0_01_pp": int((gap.max(axis=1) > 0.01).sum())}

    idx_main.round(6).to_csv(PROC / "m2_weekly_index.csv")
    idx_long.round(6).to_csv(PROC / "m2_weekly_index_long.csv")
    idx_const.round(6).to_csv(PROC / "m2_weekly_index_constant_panel.csv")

    overlap = idx_long.loc[idx_long.index >= MAIN_START, names] - idx_main[names]
    big = part[(part.week >= MAIN_START) & (part.giorni < 7) & (part.quota_del_volume_settimanale > 0.01)]
    summary = {
        "calcolato_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "scarico": fetch_info,
        "riproducibilita": repro,
        "indice_principale": {"prima_settimana": weeks_main[0], "ultima_settimana": weeks_main[-1], "settimane": len(weeks_main),
                              "serie": {n: stats(idx_main[n]) for n in names}},
        "indice_lungo": {"esclusi": LONG_EXCLUDED, "prima_settimana": idx_long.index[0], "settimane": int(len(idx_long)),
                         "serie": {n: stats(idx_long[n]) for n in names},
                         "differenza_media_con_principale_pp": {n: float(overlap[n].mean() * 100) for n in names},
                         "correlazione_con_principale": {n: float(idx_long.loc[idx_long.index >= MAIN_START, n].corr(idx_main[n])) for n in names}},
        "pannello_costante": {"exchange": constant, "numero": len(constant),
                              "differenza_massima_assoluta_pp": {n: float((idx_const[n] - idx_main[n]).abs().max() * 100) for n in names},
                              "differenza_media_pp": {n: float((idx_const[n] - idx_main[n]).mean() * 100) for n in names}},
        "exchange_attivi_min_max": [int(idx_main.exchange_attivi.min()), int(idx_main.exchange_attivi.max())],
        "settimane_con_exchange_rilevante_incompleto": big[["week", "exchange", "giorni"]].to_dict("records"),
        "coinbase_quota_volume": {
            tok: float(main_d[(main_d.exchange == "Coinbase") & (main_d.stable == tok)].volume_stable.sum() / main_d[main_d.stable == tok].volume_stable.sum())
            for tok in ("USDT", "USDC")},
    }
    (PROC / "m2_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    if tmp.exists():
        tmp.unlink()
    plot(idx_main, "03_indice_principale.png", "Quota EUR dei volumi stablecoin/fiat, indice principale (25 exchange)")
    plot(idx_long, "03_indice_lungo.png", "Quota EUR dei volumi stablecoin/fiat, indice lungo (senza Kraken e Gemini)")
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def plot(idx: pd.DataFrame, filename: str, title: str) -> None:
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.dates as mdates
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue, orange = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6", "#eb6834"
    x = pd.to_datetime(idx.index)
    fig, axes = plt.subplots(1, 2, figsize=(11.5, 4.0), facecolor=surface)
    for ax, tok in zip(axes, ("usdt", "usdc")):
        ax.set_facecolor(surface)
        ends = []
        for col, color, label in ((tok, blue, "tutti gli exchange"), (f"{tok}_senza_coinbase", orange, "senza Coinbase")):
            y = idx[col] * 100
            ax.plot(x, y, color=color, lw=2, label=label)
            ends.append(float(y.iloc[-1]))
        ax.set_title(tok.upper(), loc="left", fontsize=11, color=ink)
        ax.set_ylim(bottom=0)
        span = ax.get_ylim()[1]
        # etichette dei valori finali: si distanziano se le due linee arrivano vicine
        pos = list(ends)
        if abs(pos[0] - pos[1]) < span * 0.06:
            hi, lo = (0, 1) if pos[0] >= pos[1] else (1, 0)
            mid = (pos[0] + pos[1]) / 2
            pos[hi], pos[lo] = mid + span * 0.03, mid - span * 0.03
        for value, at in zip(ends, pos):
            ax.annotate(f"{value:.1f}%".replace(".", ","), (x[-1], at), xytext=(6, 0), textcoords="offset points",
                        va="center", fontsize=8, color=muted)
        ax.set_ylabel("Quota EUR (%)", color=muted, fontsize=9)
        ax.tick_params(colors=muted, labelsize=9, length=0)
        ax.grid(axis="y", color=grid, lw=0.8)
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%y"))
        ax.xaxis.set_major_locator(mdates.MonthLocator(bymonth=(1, 4, 7, 10) if len(idx) < 130 else (1, 7)))
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(grid)
        ax.set_xlim(x[0], x[-1] + pd.Timedelta(days=int(len(idx) * 7 * 0.09)))
    handles, labels = axes[0].get_legend_handles_labels()
    fig.legend(handles, labels, frameon=False, fontsize=9, labelcolor=muted, loc="upper right", ncol=2, bbox_to_anchor=(0.99, 0.985))
    fig.suptitle(title, x=0.01, ha="left", fontsize=12, color=ink)
    fig.tight_layout(rect=(0, 0, 1, 0.93))
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / filename, dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
