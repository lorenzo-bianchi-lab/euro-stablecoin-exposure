"""Test H1: applies the pre-registered decision criterion to the central estimates of proxies 1 and 2.

Discarded method: estimating the euro area share as a level (tests 00 and 01, SPEC.md
section 5). Its data are kept in data/archive/; nothing in the current programme reads them.

Inputs: data/archive/processed/proxy1_summary.json and proxy2_summary.json.
Output: data/archive/processed/h1_decision.json (R and outcome: GO, GO WITH RESERVATIONS or NO-GO).

Usage: python src/h1_decision.py
"""

from __future__ import annotations

import json
from pathlib import Path

PROC = Path(__file__).resolve().parents[1] / "data" / "archive" / "processed"  # discarded method: data kept in data/archive


def verdict(r: float) -> str:
    if r <= 2:
        return "GO"
    if r <= 4:
        return "GO WITH RESERVATIONS"
    return "NO-GO"


def main() -> None:
    p1 = json.loads((PROC / "proxy1_summary.json").read_text())
    p2 = json.loads((PROC / "proxy2_summary.json").read_text())
    c1, c2 = p1["central"], p2["central"]
    r = max(c1, c2) / min(c1, c2)
    # Information only: the extreme values of R compatible with the two intervals
    lo1, hi1 = p1["interval"]
    lo2, hi2 = p2["interval"]
    overlap = max(lo1, lo2) <= min(hi1, hi2)
    r_max = max(hi1 / lo2, hi2 / lo1) if min(lo1, lo2) > 0 else float("inf")
    out = {
        "proxy1_central": c1,
        "proxy1_interval": [lo1, hi1],
        "proxy2_central": c2,
        "proxy2_interval": [lo2, hi2],
        "R": r,
        "verdict": verdict(r),
        "intervals_overlap": overlap,
        "R_min_from_intervals": 1.0 if overlap else max(lo1, lo2) / min(hi1, hi2),
        "R_max_from_intervals": r_max,
    }
    (PROC / "h1_decision.json").write_text(json.dumps(out, indent=2))
    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
