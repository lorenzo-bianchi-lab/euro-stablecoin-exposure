"""Proxy 1: quota EUR dei volumi stablecoin/fiat sugli exchange.

Legge i CSV prodotti da exchange_fetch.py e coingecko_snapshot.py e calcola la stima
centrale, l'intervallo e i controlli di robustezza definiti nel metodo pre-registrato
(reports/00_h1_feasibility_test.md, sezione 2.1).

Uso: python src/proxy1_exchange.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "archive" / "raw", ROOT / "data" / "archive" / "processed"  # discarded method: data kept in data/archive


def eur_share(df: pd.DataFrame, col: str = "volume_stable") -> float:
    total = df[col].sum()
    return float(df.loc[df.fiat == "EUR", col].sum() / total) if total else float("nan")


def main() -> None:
    d = pd.read_csv(RAW / "exchange_daily_volumes.csv", parse_dates=["date"])
    d["week"] = d.date.dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")

    central = eur_share(d)
    weekly = d.groupby("week").apply(eur_share, include_groups=False)
    by_token = d.groupby("stable").apply(eur_share, include_groups=False)

    by_fiat = d.groupby("fiat").volume_stable.sum().sort_values(ascending=False)
    fiat_tab = pd.DataFrame({"volume_stable": by_fiat, "share": by_fiat / by_fiat.sum()})
    fiat_tok = d.pivot_table(index="fiat", columns="stable", values="volume_stable", aggfunc="sum").fillna(0)
    fiat_tab = fiat_tab.join(fiat_tok)
    fiat_tab.to_csv(PROC / "proxy1_volume_by_fiat.csv")

    by_ex = d.pivot_table(index="exchange", columns="fiat", values="volume_stable", aggfunc="sum").fillna(0)
    ex_tab = pd.DataFrame({"volume_stable": by_ex.sum(axis=1), "eur_volume": by_ex.get("EUR", 0)})
    ex_tab["share_of_panel"] = ex_tab.volume_stable / ex_tab.volume_stable.sum()
    ex_tab["leave_one_out_eur_share"] = [eur_share(d[d.exchange != ex]) for ex in ex_tab.index]
    ex_tab.sort_values("volume_stable", ascending=False).to_csv(PROC / "proxy1_volume_by_exchange.csv")

    weekly.rename("eur_share").to_csv(PROC / "proxy1_weekly_eur_share.csv")

    out = {
        "window": [d.date.min().strftime("%Y-%m-%d"), d.date.max().strftime("%Y-%m-%d")],
        "n_exchanges": int(d.exchange.nunique()),
        "n_pairs": int(d.groupby(["exchange", "symbol"]).ngroups),
        "total_volume_stable": float(d.volume_stable.sum()),
        "central": central,
        "weekly": weekly.to_dict(),
        "by_token": by_token.to_dict(),
        "eur_share_excl_usd": eur_share(d[d.fiat != "USD"]),
        "leave_one_out_min": float(ex_tab.leave_one_out_eur_share.min()),
        "leave_one_out_max": float(ex_tab.leave_one_out_eur_share.max()),
    }
    candidates = [central, *weekly.tolist(), *by_token.tolist()]

    snap_path = RAW / "coingecko_fiat_tickers_snapshot.csv"
    if snap_path.exists():
        s = pd.read_csv(snap_path)
        clean = s[~s.is_anomaly & ~s.is_stale]
        out["coingecko"] = {
            "n_tickers": int(len(clean)),
            "n_exchanges": int(clean.exchange.nunique()),
            "n_excluded_anomaly_or_stale": int(len(s) - len(clean)),
            "total_volume_usd_24h": float(clean.volume_usd_24h.sum()),
            "eur_share": eur_share(clean, "volume_usd_24h"),
            "eur_share_incl_flagged": eur_share(s, "volume_usd_24h"),
            "timestamp_min": str(clean.ticker_timestamp.min()),
            "timestamp_max": str(clean.ticker_timestamp.max()),
        }
        cg_fiat = clean.groupby("fiat").volume_usd_24h.sum().sort_values(ascending=False)
        pd.DataFrame({"volume_usd_24h": cg_fiat, "share": cg_fiat / cg_fiat.sum()}).to_csv(PROC / "proxy1_coingecko_by_fiat.csv")
        clean.groupby("exchange").volume_usd_24h.sum().sort_values(ascending=False).to_csv(PROC / "proxy1_coingecko_by_exchange.csv")
        candidates.append(out["coingecko"]["eur_share"])
    out["interval"] = [min(candidates), max(candidates)]

    (PROC / "proxy1_summary.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    print(fiat_tab.head(15).to_string())
    print(ex_tab.sort_values("volume_stable", ascending=False).to_string())


if __name__ == "__main__":
    main()
