"""Proxy 3: flussi on-chain verso exchange pesati per la quota EUR di ciascun exchange.

Applica il metodo pre-registrato in reports/01_proxy3_test.md (sezione 2) ai file
prodotti da cex_flows_fetch.py e ai volumi della proxy 1.

Uso: python src/proxy3_cex_flows.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "archive" / "raw", ROOT / "data" / "archive" / "processed"  # discarded method: data kept in data/archive

# Nome nel pannello della proxy 1 -> etichette corrispondenti nelle liste Dune
PANEL_TO_LABELS = {
    "Binance": ["Binance"], "Binance.US": ["Binance US"], "Kraken": ["Kraken"],
    "Coinbase": ["Coinbase", "Coinbase Prime"], "Bitstamp": ["Bitstamp"], "OKX": ["OKX"],
    "Bybit": ["Bybit"], "Upbit": ["Upbit"], "Bithumb": ["Bithumb"], "Coinone": ["Coinone"],
    "Korbit": ["Korbit"], "BtcTurk": ["BtcTurk"], "Bitvavo": ["Bitvavo"], "Bitfinex": ["Bitfinex"],
    "Gemini": ["Gemini"], "Crypto.com": ["Crypto.com"], "KuCoin": ["KuCoin"], "Gate": ["Gate.io"],
    "Bitget": ["Bitget"], "MEXC": ["MEXC"], "WhiteBIT": ["WhiteBIT"], "Indodax": ["Indodax"],
    "CoinDCX": ["CoinDCX"], "BTC Markets": ["BTC Markets"], "Bitso": ["Bitso"],
}
LABEL_TO_PANEL = {lab: panel for panel, labs in PANEL_TO_LABELS.items() for lab in labs}


def eur_shares() -> tuple[pd.Series, pd.Series, pd.Series]:
    v = pd.read_csv(RAW / "exchange_daily_volumes.csv")
    tot = v.groupby("exchange").volume_stable.sum()
    eur = v[v.fiat == "EUR"].groupby("exchange").volume_stable.sum().reindex(tot.index, fill_value=0)
    tot_t = v.groupby(["exchange", "stable"]).volume_stable.sum()
    eur_t = v[v.fiat == "EUR"].groupby(["exchange", "stable"]).volume_stable.sum().reindex(tot_t.index, fill_value=0)
    return eur / tot, eur_t / tot_t, tot


def weighted(df: pd.DataFrame, share_col: str = "eur_share") -> float:
    d = df.dropna(subset=[share_col])
    return float((d.value * d[share_col]).sum() / d.value.sum()) if d.value.sum() else float("nan")


def coverage(df: pd.DataFrame) -> float:
    return float(df.loc[df.eur_share.notna(), "value"].sum() / df.value.sum()) if df.value.sum() else float("nan")


def main() -> None:
    share, share_tok, fiat_vol = eur_shares()
    frames = []
    for chain in ("eth", "tron"):
        p = RAW / f"cex_flows_{chain}_daily.csv"
        if p.exists():
            frames.append(pd.read_csv(p).assign(chain=chain))
    raw = pd.concat(frames, ignore_index=True)
    internal = raw[raw.direction == "internal"].value.sum()
    f = raw[raw.direction.isin(["in", "out"])].copy()
    f = f[(f.date >= "2026-10-12") & (f.date <= "2026-11-22")]
    f["panel"] = f.exchange.map(LABEL_TO_PANEL)
    f["eur_share"] = f.panel.map(share)
    f["eur_share_token"] = [share_tok.get((p, t), float("nan")) if isinstance(p, str) else float("nan")
                            for p, t in zip(f.panel, f.token)]
    f["week"] = pd.to_datetime(f.date).dt.to_period("W-SUN").dt.start_time.dt.strftime("%Y-%m-%d")

    total = weighted(f)
    weekly = f.groupby("week").apply(weighted, include_groups=False)
    weekly_cov = f.groupby("week").apply(coverage, include_groups=False)
    by_token = f.groupby("token").apply(weighted, include_groups=False)
    by_token_cov = f.groupby("token").apply(coverage, include_groups=False)
    by_chain = f.groupby("chain").apply(weighted, include_groups=False)
    by_chain_cov = f.groupby("chain").apply(coverage, include_groups=False)
    by_chain_token = f.groupby(["chain", "token"]).apply(weighted, include_groups=False)
    cov = coverage(f)

    mean_w = float(weekly.mean())
    dev = (weekly / mean_w - 1)
    cond = {
        "coverage_ge_30pct": bool(cov >= 0.30),
        "proxy3_between_5_and_30pct": bool(0.05 <= total <= 0.30),
        "weekly_within_25pct_of_mean": bool((dev.abs() <= 0.25).all()),
    }
    verdict = "INTERVALLO" if all(cond.values()) else "SOLO ANDAMENTO"

    # Tabella per exchange (entità del pannello, oppure etichetta se fuori pannello)
    f["entity"] = f.panel.fillna(f.exchange)
    ex = f.pivot_table(index="entity", columns="direction", values="value", aggfunc="sum").fillna(0)
    ex["gross"] = ex.get("in", 0) + ex.get("out", 0)
    for chain in f.chain.unique():
        ex[f"gross_{chain}"] = f[f.chain == chain].groupby("entity").value.sum().reindex(ex.index, fill_value=0)
    for tok in f.token.unique():
        ex[f"gross_{tok}"] = f[f.token == tok].groupby("entity").value.sum().reindex(ex.index, fill_value=0)
    ex["in_panel"] = ex.index.isin(PANEL_TO_LABELS)
    ex["eur_share"] = ex.index.map(share)
    ex["fiat_volume_proxy1"] = ex.index.map(fiat_vol)
    ex["fiat_volume_over_gross_flow"] = ex.fiat_volume_proxy1 / ex.gross
    ex["share_of_labelled_flows"] = ex.gross / ex.gross.sum()
    ex["contribution_to_proxy3"] = (ex.gross * ex.eur_share) / ex.loc[ex.eur_share.notna(), "gross"].sum()
    ex = ex.sort_values("gross", ascending=False)
    ex.to_csv(PROC / "proxy3_by_exchange.csv")

    defined = f.dropna(subset=["eur_share"])
    loo = {e: weighted(defined[defined.panel != e]) for e in defined.panel.unique()}
    sens = {
        "unmatched_exchanges_at_zero": float((defined.value * defined.eur_share).sum() / f.value.sum()),
        "inflows_only": weighted(f[f.direction == "in"]),
        "outflows_only": weighted(f[f.direction == "out"]),
        "token_specific_eur_share": weighted(f, "eur_share_token"),
        "without_coinbase_prime": weighted(f[f.exchange != "Coinbase Prime"]),
        "leave_one_out_min": [min(loo, key=loo.get), min(loo.values())],
        "leave_one_out_max": [max(loo, key=loo.get), max(loo.values())],
    }

    pd.DataFrame({"proxy3": weekly, "coverage": weekly_cov, "deviation_from_mean": dev,
                  "gross_flow_defined": defined.groupby("week").value.sum(),
                  "gross_flow_all_labelled": f.groupby("week").value.sum()}).to_csv(PROC / "proxy3_weekly.csv")

    # Contesto: quanto pesano i flussi etichettati sul totale trasferito on-chain (stima dal campione di blocchi)
    context = {}
    for chain, factor in (("eth", 50), ("tron", 200)):
        p = RAW / f"onchain_block_samples_{chain}.csv"
        if p.exists() and (f.chain == chain).any():
            est_total = pd.read_csv(p).value.sum() * factor
            context[chain] = {"labelled_gross_flow": float(f[f.chain == chain].value.sum()),
                              "estimated_total_transfer_value": float(est_total),
                              "ratio": float(f[f.chain == chain].value.sum() / est_total)}

    out = {
        "window": ["2026-10-12", "2026-11-22"],
        "proxy3_total": total,
        "coverage_total": cov,
        "proxy3_by_token": by_token.to_dict(), "coverage_by_token": by_token_cov.to_dict(),
        "proxy3_by_chain": by_chain.to_dict(), "coverage_by_chain": by_chain_cov.to_dict(),
        "proxy3_by_chain_token": {f"{c}-{t}": v for (c, t), v in by_chain_token.items()},
        "proxy3_weekly": weekly.to_dict(), "coverage_weekly": weekly_cov.to_dict(),
        "weekly_mean": mean_w, "weekly_deviation_from_mean": dev.to_dict(),
        "conditions": cond, "verdict": verdict,
        "sensitivity": sens,
        "gross_flow_all_labelled": float(f.value.sum()),
        "gross_flow_defined": float(defined.value.sum()),
        "internal_transfers_excluded": float(internal),
        "n_transfers": int(f.n.sum()),
        "n_labelled_entities_with_flows": int(f.exchange.nunique()),
        "n_panel_exchanges_with_flows": int(defined.panel.nunique()),
        "panel_exchanges_without_flows": sorted(set(PANEL_TO_LABELS) - set(defined.panel.unique())),
        "labelled_flows_vs_total_onchain": context,
    }
    (PROC / "proxy3_summary.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    cols = ["in", "out", "gross", "eur_share", "share_of_labelled_flows", "contribution_to_proxy3", "fiat_volume_over_gross_flow"]
    print(ex[cols].head(30).round(4).to_string())


if __name__ == "__main__":
    main()
