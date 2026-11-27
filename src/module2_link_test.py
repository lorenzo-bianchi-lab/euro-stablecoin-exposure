"""Module 2, pre-registered test: do stablecoin volumes against the euro anticipate deposits?

Method and criterion in reports/09_module2_signal_test.md (sections 1 and 2). Compares a model
with only the lags of households' sight deposits with one that adds the lag of the volumes,
in sample and out of sample. The result is reported even if null.

Inputs: data/raw/m3_bsi.csv (households' sight deposits) and data/raw/m2_daily_volumes.csv.
Outputs: data/processed/m2_link_test.json and data/processed/m2_link_test_data.csv.

Usage: python src/module2_link_test.py
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
LONG_EXCLUDED = ["Kraken", "Gemini"]
OOS_MONTHS = 12


def t_pvalue(t: float, df: int) -> float:
    """Two-sided p-value of Student's t, by numerical integration of the density."""
    x = np.linspace(0, abs(t), 20001)
    pdf = math.gamma((df + 1) / 2) / (math.sqrt(df * math.pi) * math.gamma(df / 2)) * (1 + x**2 / df) ** (-(df + 1) / 2)
    inside = float(((pdf[1:] + pdf[:-1]) / 2 * np.diff(x)).sum())
    return max(0.0, 1 - 2 * inside)


def ols(y: np.ndarray, x: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Least squares with a heteroskedasticity-robust covariance matrix (HC1)."""
    n, k = x.shape
    xtx_inv = np.linalg.inv(x.T @ x)
    beta = xtx_inv @ x.T @ y
    e = y - x @ beta
    cov = xtx_inv @ (x.T * e**2) @ x @ xtx_inv * n / (n - k)
    return beta, cov


def design(y: pd.Series, x: pd.Series | None, lags: int) -> tuple[np.ndarray, np.ndarray, pd.Index]:
    cols = {"const": pd.Series(1.0, index=y.index)}
    for j in range(1, lags + 1):
        cols[f"y{j}"] = y.shift(j)
        if x is not None:
            cols[f"x{j}"] = x.shift(j)
    d = pd.DataFrame(cols).assign(y=y).dropna()
    names = [c for c in d.columns if c != "y"]
    return d.y.to_numpy(), d[names].to_numpy(), d.index


def evaluate(y: pd.Series, x: pd.Series, lags: int = 1) -> dict:
    yy, xx, idx = design(y, x, lags)
    beta, cov = ols(yy, xx)
    k = xx.shape[1]
    xpos = [i for i in range(k) if i >= 1 and (i - 1) % 2 == 1]  # columns of the lags of x
    b, v = beta[xpos], cov[np.ix_(xpos, xpos)]
    wald = float(b @ np.linalg.inv(v) @ b)
    if lags == 1:
        p = t_pvalue(float(b[0] / math.sqrt(v[0, 0])), len(yy) - k)
    else:  # chi-squared with 2 degrees of freedom: the tail has a closed form
        p = float(math.exp(-wald / 2)) if lags == 2 else float("nan")
    # Out of sample: expanding window, one-step-ahead forecasts over the last months
    y0, x0, idx0 = design(y, None, lags)
    common = idx.intersection(idx0)
    pos = {m: i for i, m in enumerate(idx)}
    pos0 = {m: i for i, m in enumerate(idx0)}
    err1, err0 = [], []
    for m in common[-OOS_MONTHS:]:
        i, i0 = pos[m], pos0[m]
        if i < k + 3 or i0 < 5:
            continue
        b1, _ = ols(yy[:i], xx[:i])
        b0, _ = ols(y0[:i0], x0[:i0])
        err1.append(yy[i] - xx[i] @ b1)
        err0.append(y0[i0] - x0[i0] @ b0)
    rmse1, rmse0 = float(np.sqrt(np.mean(np.square(err1)))), float(np.sqrt(np.mean(np.square(err0))))
    return {
        "osservazioni": int(len(yy)),
        "primo_mese": str(idx[0]),
        "ultimo_mese": str(idx[-1]),
        "ritardi": lags,
        "coefficienti_volumi": [float(z) for z in b],
        "errori_standard": [float(math.sqrt(z)) for z in np.diag(v)],
        "p_value": float(p),
        "significativo_5_per_cento": bool(p < 0.05),
        "previsioni_fuori_campione": int(len(err1)),
        "rmse_con_volumi": rmse1,
        "rmse_solo_ritardi": rmse0,
        "rapporto_rmse": rmse1 / rmse0,
        "migliora_fuori_campione": bool(rmse1 < rmse0),
        "aiuta_a_prevedere": bool(p < 0.05 and rmse1 < rmse0),
    }


def main() -> None:
    bsi = pd.read_csv(RAW / "m3_bsi.csv", dtype={"month": str})
    dep = bsi[bsi.series == "vista_fam"]
    n = dep.groupby("month").country.nunique()
    deposits = dep.groupby("month").eur_mn.sum()[n == n.max()] / 1000

    v = pd.read_csv(RAW / "m2_daily_volumes.csv")
    v = v[~v.exchange.isin(LONG_EXCLUDED)].copy()
    v["month"] = v.date.str[:7]
    days = v.groupby("month").date.nunique()
    full = days.index[days >= 28]
    eur = v[v.fiat == "EUR"]
    vol = eur.groupby("month").volume_stable.sum().reindex(full) / 1e9
    vol_usdt = eur[eur.stable == "USDT"].groupby("month").volume_stable.sum().reindex(full) / 1e9
    vol_usdc = eur[eur.stable == "USDC"].groupby("month").volume_stable.sum().reindex(full) / 1e9
    share = (eur.groupby("month").volume_stable.sum() / v.groupby("month").volume_stable.sum()).reindex(full)

    months = [m for m in full if m in deposits.index]

    def dl(s):
        return (100 * np.log(s.reindex(months)).diff()).dropna()

    y, x = dl(deposits), dl(vol)
    main_res = evaluate(y, x, 1)

    def yoy(s):
        return (100 * np.log(s.reindex(months)).diff(12)).dropna()

    variants = {
        "due_ritardi": evaluate(y, x, 2),
        "variazioni_a_dodici_mesi": evaluate(yoy(deposits), yoy(vol), 1),
        "quota_eur_al_posto_dei_volumi": evaluate(y, (100 * share.reindex(months).diff()).dropna(), 1),
        "solo_usdt": evaluate(y, dl(vol_usdt), 1),
        "solo_usdc": evaluate(y, dl(vol_usdc), 1),
    }

    out = {
        "domanda": (
            "Do the monthly changes in stablecoin volumes against the euro help to forecast "
            "the change in households' sight deposits compared with a model with lags only?"
        ),
        "risposta": "sì" if main_res["aiuta_a_prevedere"] else "no",  # codes "sì" (yes) and "no", kept as they are
        "principale": main_res,
        "varianti": variants,
        "varianti_significative": [k for k, r in variants.items() if r["significativo_5_per_cento"]],
        "dati": {
            "mesi": len(months),
            "primo_mese": months[0],
            "ultimo_mese": months[-1],
            "depositi_a_vista_famiglie_ultimo_mld_eur": float(deposits.reindex(months).iloc[-1]),
            "volume_mensile_medio_contro_eur_mld": float(vol.reindex(months).mean()),
            "dev_std_variazione_depositi_pp": float(y.std()),
            "dev_std_variazione_volumi_pp": float(x.std()),
            "correlazione_contemporanea": float(y.corr(x)),
            "correlazione_con_ritardo": float(y.corr(x.shift(1))),
        },
    }
    (PROC / "m2_link_test.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    pd.DataFrame(
        {
            "household_sight_deposits_bn_eur": deposits.reindex(months),
            "volumes_against_eur_bn": vol.reindex(months),
            "deposits_change_pp": y,
            "volumes_change_pp": x,
        }
    ).round(4).to_csv(PROC / "m2_link_test_data.csv")
    print(json.dumps(out, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
