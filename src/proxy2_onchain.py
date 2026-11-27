"""Proxy 2: "European hours" share of the on-chain transfers of USDT and USDC.

Reads the block samples produced by onchain_fetch.py and applies the pre-registered method
(reports/00_h1_feasibility_test.md, section 2.2): UTC hourly profile, decomposition into three
time bands with non-negative least squares (method A) and simple 08:00-16:00 UTC partition
(method B).

Discarded method: on Ethereum most activity has no daily cycle and the European time band
also covers other regions (SPEC.md section 5). Its data are kept in data/archive/.

Inputs: data/archive/raw/onchain_block_samples_*.csv.
Outputs: data/archive/processed/proxy2_decomposition.csv, proxy2_hourly_profiles.csv,
proxy2_summary.json; figure reports/figures/00_hourly_profiles.png.

Usage: python src/proxy2_onchain.py
"""

from __future__ import annotations

import itertools
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "archive" / "raw", ROOT / "data" / "archive" / "processed"  # discarded method: data kept in data/archive
FIG = ROOT / "reports" / "figures"
START = datetime(2026, 10, 12, tzinfo=timezone.utc)
END = datetime(2026, 11, 23, tzinfo=timezone.utc)
ZONES = {"asia": "Asia/Shanghai", "europe": "Europe/Berlin", "americas": "America/New_York"}
METRICS = {"n": "transfers", "n_retail": "retail transfers (USD 1-10,000)", "value": "value transferred"}
SERIES = [("eth", "USDT"), ("eth", "USDC"), ("tron", "USDT")]


def templates(dates: list) -> np.ndarray:
    """24x3 matrix: share of days in which the UTC hour falls within 09:00-18:00 local time."""
    t = np.zeros((24, len(ZONES)))
    for d in dates:
        for h in range(24):
            moment = datetime(d.year, d.month, d.day, h, tzinfo=timezone.utc)
            for k, zone in enumerate(ZONES.values()):
                if 9 <= moment.astimezone(ZoneInfo(zone)).hour < 18:
                    t[h, k] += 1
    return t / len(dates)


def nnls(x: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Non-negative least squares for a few regressors: tries all subsets."""
    best, best_sse = np.zeros(x.shape[1]), float(y @ y)
    for r in range(1, x.shape[1] + 1):
        for cols in itertools.combinations(range(x.shape[1]), r):
            beta, *_ = np.linalg.lstsq(x[:, cols], y, rcond=None)
            if (beta < 0).any():
                continue
            sse = float(((y - x[:, cols] @ beta) ** 2).sum())
            if sse < best_sse - 1e-15:
                best_sse = sse
                best = np.zeros(x.shape[1])
                best[list(cols)] = beta
    return best


def decompose(profile: np.ndarray, tmpl: np.ndarray) -> dict:
    x = np.column_stack([np.ones(24), tmpl])
    beta = nnls(x, profile)
    regional = beta[1:] * tmpl.sum(axis=0)  # mass attributed to each time band
    total = regional.sum()
    fit = x @ beta
    sst = float(((profile - profile.mean()) ** 2).sum())
    return {
        "asia": float(regional[0] / total) if total else float("nan"),
        "europe": float(regional[1] / total) if total else float("nan"),
        "americas": float(regional[2] / total) if total else float("nan"),
        "flat_share": float(beta[0] * 24),
        "r2": float(1 - ((profile - fit) ** 2).sum() / sst) if sst else float("nan"),
        "europe_band_08_16": float(profile[8:16].sum()),
    }


def hourly_profile(df: pd.DataFrame, metric: str) -> np.ndarray:
    sums = df.groupby("hour")[metric].sum().reindex(range(24), fill_value=0).to_numpy(dtype=float)
    return sums / sums.sum()


def main() -> None:
    frames = [pd.read_csv(p) for p in sorted(RAW.glob("onchain_block_samples_*.csv"))]
    d = pd.concat(frames, ignore_index=True).drop_duplicates(["chain", "token", "block"])
    d = d[(d.timestamp >= START.timestamp()) & (d.timestamp < END.timestamp())].copy()
    ts = pd.to_datetime(d.timestamp, unit="s", utc=True)
    d["hour"], d["date"], d["weekday"] = ts.dt.hour, ts.dt.date, ts.dt.day_of_week < 5

    all_dates = [START.date() + timedelta(days=i) for i in range((END - START).days)]
    # "feriali" (weekdays) and "tutti" (all days) are codes stored in the output files
    day_sets = {"feriali": [x for x in all_dates if x.weekday() < 5], "tutti": all_dates}
    tmpl = {name: templates(dates) for name, dates in day_sets.items()}

    rows, profiles, coverage = [], {}, []
    for chain, token in SERIES:
        s = d[(d.chain == chain) & (d.token == token)]
        if s.empty:
            continue
        coverage.append(
            {
                "chain": chain,
                "token": token,
                "blocks": int(len(s)),
                "transfers_sampled": int(s.n.sum()),
                "days": int(s.date.nunique()),
                "first": str(s.date.min()),
                "last": str(s.date.max()),
            }
        )
        for day_name in day_sets:
            sub = s[s.weekday] if day_name == "feriali" else s
            for metric in METRICS:
                prof = hourly_profile(sub, metric)
                profiles[(chain, token, day_name, metric)] = prof
                rows.append({"chain": chain, "token": token, "days": day_name, "metric": metric, **decompose(prof, tmpl[day_name])})
    res = pd.DataFrame(rows)
    res.to_csv(PROC / "proxy2_decomposition.csv", index=False)
    pd.DataFrame({"|".join(k): v for k, v in profiles.items()}).rename_axis("hour_utc").to_csv(PROC / "proxy2_hourly_profiles.csv")

    main_rows = res[(res.days == "feriali") & (res.metric == "n")]
    central = float(main_rows.europe.mean())
    candidates = pd.concat([res.europe, res.europe_band_08_16]).dropna()

    # Sampling uncertainty of the central estimate: resampling of the weekdays (information only)
    rng = np.random.default_rng(20261123)
    wk = d[d.weekday]
    by_day = {
        key: g.groupby(["date", "hour"]).n.sum().unstack(fill_value=0).reindex(columns=range(24), fill_value=0)
        for key, g in wk.groupby(["chain", "token"])
    }
    boot = []
    days = np.array(day_sets["feriali"])
    for _ in range(1000):
        pick = rng.choice(days, size=len(days), replace=True)
        t = templates(list(pick))
        vals = []
        for key in SERIES:
            if key in by_day:
                sums = by_day[key].reindex(pick, fill_value=0).sum(axis=0).to_numpy(dtype=float)
                vals.append(decompose(sums / sums.sum(), t)["europe"])
        boot.append(np.mean(vals))

    out = {
        "window": [START.strftime("%Y-%m-%d"), (END - timedelta(days=1)).strftime("%Y-%m-%d")],
        "coverage": coverage,
        "central": central,
        "central_by_series": {f"{r.chain}-{r.token}": r.europe for r in main_rows.itertuples()},
        "central_bootstrap_p2.5_p97.5": [float(np.nanpercentile(boot, 2.5)), float(np.nanpercentile(boot, 97.5))],
        "interval": [float(candidates.min()), float(candidates.max())],
        "interval_main_metric_only": [
            float(pd.concat([res[res.metric == "n"].europe, res[res.metric == "n"].europe_band_08_16]).min()),
            float(pd.concat([res[res.metric == "n"].europe, res[res.metric == "n"].europe_band_08_16]).max()),
        ],
    }
    (PROC / "proxy2_summary.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))
    print(res.round(3).to_string(index=False))
    plot(profiles, [k for k in SERIES if (k[0], k[1], "feriali", "n") in profiles])


def plot(profiles: dict, series: list) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6"
    names = {"eth": "Ethereum", "tron": "Tron"}
    fig, axes = plt.subplots(1, len(series), figsize=(4.2 * len(series), 3.6), sharey=True, facecolor=surface)
    for ax, (chain, token) in zip(np.atleast_1d(axes), series, strict=True):
        prof = profiles[(chain, token, "feriali", "n")] * 100
        ax.set_facecolor(surface)
        ax.axvspan(8, 16, color="#efeeea", zorder=0)
        ax.axhline(100 / 24, color=muted, lw=0.8, ls=(0, (3, 3)), zorder=1)
        ax.step(np.arange(25), np.append(prof, prof[-1]), where="post", color=blue, lw=2, zorder=3)
        ax.set_title(f"{token} on {names[chain]}", loc="left", fontsize=11, color=ink)
        ax.set_xlim(0, 24)
        ax.set_xticks(range(0, 25, 4))
        ax.set_xlabel("UTC hour", color=muted, fontsize=9)
        ax.tick_params(colors=muted, labelsize=9, length=0)
        ax.grid(axis="y", color=grid, lw=0.8)
        for side in ("top", "right", "left"):
            ax.spines[side].set_visible(False)
        ax.spines["bottom"].set_color(grid)
        ax.text(12, ax.get_ylim()[0], "", ha="center")
    first = np.atleast_1d(axes)[0]
    first.set_ylabel("Share of transfers in the hour (%)", color=muted, fontsize=9)
    low = min(a.get_ylim()[0] for a in np.atleast_1d(axes))
    for ax in np.atleast_1d(axes):
        ax.text(12, low, "Europe band\n08-16 UTC", ha="center", va="bottom", fontsize=8, color=muted)
    first.text(0.3, 100 / 24, "flat profile (4.17%)", va="bottom", fontsize=8, color=muted)
    fig.suptitle("Hourly profile of transfers, weekdays, 12 Oct - 22 Nov 2026", x=0.01, ha="left", fontsize=12, color=ink)
    fig.tight_layout(rect=(0, 0, 1, 0.94))
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / "00_hourly_profiles.png", dpi=160, facecolor=surface)


if __name__ == "__main__":
    main()
