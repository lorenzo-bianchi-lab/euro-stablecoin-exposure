"""Istantanea a 24 ore dei ticker CoinGecko per USDT e USDC contro valute fiat.

L'API pubblica senza chiave restituisce 100 ticker per pagina, ordinati per volume.
Lo script scorre le pagine finché il volume dell'ultimo ticker scende sotto MIN_USD
e tiene solo i ticker in cui l'altra gamba è una valuta fiat.

Uso: python src/coingecko_snapshot.py
"""
from __future__ import annotations

import csv
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

FIAT = set("USD EUR GBP TRY BRL KRW JPY AUD CAD CHF MXN ARS PLN RON UAH ZAR CZK COP INR IDR THB PHP VND NGN RUB AED SGD HKD SEK NOK DKK HUF KZT GEL BGN NZD ILS SAR MYR PEN CLP BHD KES".split())
COINS = {"tether": "USDT", "usd-coin": "USDC"}
MIN_USD = 100_000
MAX_PAGES = 150
OUT = Path(__file__).resolve().parents[1] / "data" / "archive" / "raw"  # discarded method: data kept in data/archive


def main() -> None:
    headers = {"User-Agent": "research-script/0.1"}
    key = os.environ.get("COINGECKO_API_KEY")  # facoltativa, letta solo dall'ambiente
    if key:
        headers["x-cg-demo-api-key"] = key
    rows = []
    for coin, stable in COINS.items():
        for page in range(1, MAX_PAGES + 1):
            for attempt in range(8):
                r = requests.get(f"https://api.coingecko.com/api/v3/coins/{coin}/tickers",
                                 params={"order": "volume_desc", "page": page}, headers=headers, timeout=30)
                if r.status_code == 200:
                    break
                time.sleep(20 * (attempt + 1))
            else:
                raise RuntimeError(f"CoinGecko non risponde (HTTP {r.status_code}) a pagina {page} di {coin}")
            tickers = r.json().get("tickers", [])
            if not tickers:
                break
            for t in tickers:
                base, target = t["base"].upper(), t["target"].upper()
                fiat = target if (base == stable and target in FIAT) else base if (target == stable and base in FIAT) else None
                if fiat:
                    rows.append([stable, fiat, t["market"]["name"], base, target,
                                 round(t["converted_volume"]["usd"] or 0, 2), t["is_anomaly"], t["is_stale"], t["timestamp"]])
            last = tickers[-1]["converted_volume"]["usd"] or 0
            print(coin, "pagina", page, "ultimo volume", round(last), "ticker fiat finora", len(rows), flush=True)
            if last < MIN_USD:
                break
            time.sleep(6)
    with (OUT / "coingecko_fiat_tickers_snapshot.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["stable", "fiat", "exchange", "base", "target", "volume_usd_24h", "is_anomaly", "is_stale", "ticker_timestamp"])
        w.writerows(rows)
    print("istantanea salvata", datetime.now(timezone.utc).isoformat(timespec="seconds"), len(rows), "ticker")


if __name__ == "__main__":
    main()
