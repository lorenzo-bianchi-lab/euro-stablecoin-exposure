"""24-hour snapshot of the CoinGecko tickers of USDT and USDC against fiat currencies.

The public API without a key returns 100 tickers per page, sorted by volume.
The script goes through the pages until the volume of the last ticker falls below MIN_USD
and keeps only the tickers whose other leg is a fiat currency.

Discarded method: the CoinGecko snapshot as a time series (the free API only returns the last
24 hours) and proxy 1 used as a level (reports/00_h1_feasibility_test.md, SPEC.md section 5).
Its data are kept in data/archive/.

Input: CoinGecko public API (/coins/{id}/tickers); optional key COINGECKO_API_KEY from the environment.
Output: data/archive/raw/coingecko_fiat_tickers_snapshot.csv.

Usage: python src/coingecko_snapshot.py
"""

from __future__ import annotations

import csv
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

FIAT = set(
    "USD EUR GBP TRY BRL KRW JPY AUD CAD CHF MXN ARS PLN RON UAH ZAR CZK COP INR IDR THB PHP VND NGN RUB AED "
    "SGD HKD SEK NOK DKK HUF KZT GEL BGN NZD ILS SAR MYR PEN CLP BHD KES".split()
)
COINS = {"tether": "USDT", "usd-coin": "USDC"}
MIN_USD = 100_000
MAX_PAGES = 150
OUT = Path(__file__).resolve().parents[1] / "data" / "archive" / "raw"  # discarded method: data kept in data/archive


def main() -> None:
    headers = {"User-Agent": "research-script/0.1"}
    key = os.environ.get("COINGECKO_API_KEY")  # optional, read only from the environment
    if key:
        headers["x-cg-demo-api-key"] = key
    rows = []
    for coin, stable in COINS.items():
        for page in range(1, MAX_PAGES + 1):
            for attempt in range(8):
                r = requests.get(
                    f"https://api.coingecko.com/api/v3/coins/{coin}/tickers",
                    params={"order": "volume_desc", "page": page},
                    headers=headers,
                    timeout=30,
                )
                if r.status_code == 200:
                    break
                time.sleep(20 * (attempt + 1))
            else:
                raise RuntimeError(f"CoinGecko does not respond (HTTP {r.status_code}) on page {page} of {coin}")
            tickers = r.json().get("tickers", [])
            if not tickers:
                break
            for t in tickers:
                base, target = t["base"].upper(), t["target"].upper()
                fiat = target if (base == stable and target in FIAT) else base if (target == stable and base in FIAT) else None
                if fiat:
                    rows.append(
                        [
                            stable,
                            fiat,
                            t["market"]["name"],
                            base,
                            target,
                            round(t["converted_volume"]["usd"] or 0, 2),
                            t["is_anomaly"],
                            t["is_stale"],
                            t["timestamp"],
                        ]
                    )
            last = tickers[-1]["converted_volume"]["usd"] or 0
            print(coin, "page", page, "last volume", round(last), "fiat tickers so far", len(rows), flush=True)
            if last < MIN_USD:
                break
            time.sleep(6)
    with (OUT / "coingecko_fiat_tickers_snapshot.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["stable", "fiat", "exchange", "base", "target", "volume_usd_24h", "is_anomaly", "is_stale", "ticker_timestamp"])
        w.writerows(rows)
    print("snapshot saved", datetime.now(timezone.utc).isoformat(timespec="seconds"), len(rows), "tickers")


if __name__ == "__main__":
    main()
