"""Scarica i volumi giornalieri delle coppie stablecoin/fiat dagli exchange (API pubbliche).

Per ogni coppia salva il volume giornaliero espresso in unità di stablecoin.
Le coppie sono quelle elencate dagli endpoint "markets" dei singoli exchange il
2026-11-23 (USDT o USDC contro una valuta fiat, in entrambi i versi).

Uso: python src/exchange_fetch.py
"""
from __future__ import annotations

import csv
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

START = datetime(2026, 10, 12, tzinfo=timezone.utc)
END = datetime(2026, 11, 23, tzinfo=timezone.utc)  # escluso
S, E = int(START.timestamp()), int(END.timestamp())
OUT = Path(__file__).resolve().parents[1] / "data" / "raw"

session = requests.Session()
session.headers.update({"User-Agent": "research-script/0.1"})


def get(url: str, **params):
    for attempt in range(4):
        r = session.get(url, params=params or None, timeout=30)
        if r.status_code == 429:
            time.sleep(5 * (attempt + 1))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError("HTTP 429 ripetuto")


def day(ts) -> str:
    ts = float(ts)
    if ts > 1e11:
        ts /= 1000
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")


def iso(d: datetime) -> str:
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")


# Ogni adattatore restituisce una lista di (giorno, volume_base, volume_quotato|None, chiusura).

def binance_like(base_url):
    def f(sym):
        rows = get(f"{base_url}/api/v3/klines", symbol=sym, interval="1d", startTime=S * 1000, endTime=E * 1000 - 1, limit=200)
        return [(day(r[0]), float(r[5]), float(r[7]), float(r[4])) for r in rows]
    return f


def kraken(sym):
    j = get("https://api.kraken.com/0/public/OHLC", pair=sym, interval=1440, since=S - 86400)
    if j.get("error"):
        raise RuntimeError(str(j["error"]))
    rows = next(v for k, v in j["result"].items() if k != "last")
    return [(day(r[0]), float(r[6]), None, float(r[4])) for r in rows]


def coinbase(sym):
    rows = get(f"https://api.exchange.coinbase.com/products/{sym}/candles", granularity=86400, start=iso(START), end=iso(END))
    return [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]


def bitstamp(sym):
    j = get(f"https://www.bitstamp.net/api/v2/ohlc/{sym}/", step=86400, limit=100, start=S, end=E - 1)
    return [(day(r["timestamp"]), float(r["volume"]), None, float(r["close"])) for r in j["data"]["ohlc"]]


def okx(sym):
    j = get("https://www.okx.com/api/v5/market/history-candles", instId=sym, bar="1Dutc", after=E * 1000, limit=100)
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[4])) for r in j["data"]]


def bybit(sym):
    j = get("https://api.bybit.com/v5/market/kline", category="spot", symbol=sym, interval="D", start=S * 1000, end=E * 1000 - 1, limit=200)
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[4])) for r in j["result"]["list"]]


def upbit_like(base_url):
    def f(sym):
        bithumb = "bithumb" in base_url
        # Bithumb vuole la data senza "T" e "Z" e chiude il giorno alle 00:00 KST
        rows = get(f"{base_url}/v1/candles/days", market=sym, count=60, to=END.strftime("%Y-%m-%d %H:%M:%S") if bithumb else iso(END))
        key = "candle_date_time_kst" if bithumb else "candle_date_time_utc"
        return [(r[key][:10], float(r["candle_acc_trade_volume"]), float(r["candle_acc_trade_price"]), float(r["trade_price"])) for r in rows]
    return f


def btcturk(sym):
    j = get("https://graph-api.btcturk.com/v1/klines/history", symbol=sym, resolution=1440, **{"from": S, "to": E - 1})
    return [(day(t), float(v), None, float(c)) for t, v, c in zip(j["t"], j["v"], j["c"])]


def bitvavo(sym):
    rows = get(f"https://api.bitvavo.com/v2/{sym}/candles", interval="1d", start=S * 1000, end=E * 1000 - 1)
    return [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]


def bitfinex(sym):
    rows = get(f"https://api-pub.bitfinex.com/v2/candles/trade:1D:{sym}/hist", start=S * 1000, end=E * 1000 - 1, limit=200)
    return [(day(r[0]), float(r[5]), None, float(r[2])) for r in rows]


def gemini(sym):
    rows = get(f"https://api.gemini.com/v2/candles/{sym}/1day")
    return [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]


def cryptocom(sym):
    j = get("https://api.crypto.com/exchange/v1/public/get-candlestick", instrument_name=sym, timeframe="1D", count=120)
    return [(day(r["t"]), float(r["v"]), None, float(r["c"])) for r in j["result"]["data"]]


def kucoin(sym):
    j = get("https://api.kucoin.com/api/v1/market/candles", type="1day", symbol=sym, startAt=S, endAt=E)
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[2])) for r in j["data"]]


def gate(sym):
    rows = get("https://api.gateio.ws/api/v4/spot/candlesticks", currency_pair=sym, interval="1d", **{"from": S, "to": E - 1})
    return [(day(r[0]), float(r[6]), float(r[1]), float(r[2])) for r in rows]


def bitget(sym):
    j = get("https://api.bitget.com/api/v2/spot/market/history-candles", symbol=sym, granularity="1Dutc", endTime=E * 1000, limit=100)
    return [(day(r[0]), float(r[5]), float(r[7]), float(r[4])) for r in j["data"]]


def whitebit(sym):
    j = get("https://whitebit.com/api/v1/public/kline", market=sym, interval="1d", start=S, end=E - 1, limit=200)
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[2])) for r in j["result"]]


def coinone(sym):
    j = get(f"https://api.coinone.co.kr/public/v2/chart/KRW/{sym}", interval="1d", size=60)
    return [(day(r["timestamp"]), float(r["target_volume"]), float(r["quote_volume"]), float(r["close"])) for r in j["chart"]]


def korbit(sym):
    j = get("https://api.korbit.co.kr/v2/candles", symbol=sym, interval="1D", limit=60, end=E * 1000)
    # le candele Korbit iniziano alle 00:00 KST (15:00 UTC del giorno prima): si usa la data KST
    return [(day(int(r["timestamp"]) / 1000 + 9 * 3600), float(r["volume"]), None, float(r["close"])) for r in j["data"]]


def indodax(sym):
    rows = get("https://indodax.com/tradingview/history_v2", symbol=sym, tf="1D", **{"from": S, "to": E - 1})
    return [(day(r["Time"]), float(r["Volume"]), None, float(r["Close"])) for r in rows]


def coindcx(sym):
    rows = get("https://public.coindcx.com/market_data/candles", pair=sym, interval="1d", limit=60)
    return [(day(r["time"]), float(r["volume"]), None, float(r["close"])) for r in rows]


def btcmarkets(sym):
    rows = get(f"https://api.btcmarkets.net/v3/markets/{sym}/candles", timeWindow="1d", **{"from": iso(START), "to": iso(END)})
    return [(r[0][:10], float(r[5]), None, float(r[4])) for r in rows]


def bitso(sym):
    j = get("https://api.bitso.com/v3/ohlc", book=sym, time_bucket=86400, start=S * 1000, end=E * 1000)
    # i giorni Bitso iniziano alle 06:00 UTC: si attribuisce il giorno di inizio
    return [(day(r["bucket_start_time"]), float(r["volume"]), None, float(r["last_rate"])) for r in j["payload"]]


def mexc(sym):
    return binance_like("https://api.mexc.com")(sym)


# (exchange, adattatore, [(simbolo, stablecoin, fiat, stablecoin_è_base)])
def p(sym, stable, fiat, base=True):
    return (sym, stable, fiat, base)


PANEL = [
    ("Binance", binance_like("https://data-api.binance.vision"), [
        p("EURUSDT", "USDT", "EUR", False), p("EURUSDC", "USDC", "EUR", False),
        p("GBPUSDT", "USDT", "GBP", False), p("AUDUSDT", "USDT", "AUD", False), p("AUDUSDC", "USDC", "AUD", False),
        *[p(f"USDT{f}", "USDT", f) for f in "USD TRY BRL ARS MXN COP ZAR IDR THB AED KZT PLN RON CZK UAH NGN RUB".split()],
        *[p(f"USDC{f}", "USDC", f) for f in "USD TRY BRL ARS MXN IDR THB AED PLN RON CZK".split()],
    ]),
    ("Binance.US", binance_like("https://api.binance.us"), [p("USDTUSD", "USDT", "USD"), p("USDCUSD", "USDC", "USD")]),
    ("Kraken", kraken, [
        *[p(f"USDT{f}", "USDT", f) for f in "USD EUR GBP CHF CAD AUD JPY".split()],
        *[p(f"USDC{f}", "USDC", f) for f in "USD EUR GBP CHF CAD AUD".split()],
    ]),
    ("Coinbase", coinbase, [
        *[p(f"USDT-{f}", "USDT", f) for f in "USD EUR GBP".split()],
        *[p(f"USDC-{f}", "USDC", f) for f in "EUR GBP AUD BRL CAD INR SGD".split()],
    ]),
    ("Bitstamp", bitstamp, [p("usdtusd", "USDT", "USD"), p("usdteur", "USDT", "EUR"), p("usdcusd", "USDC", "USD"), p("usdceur", "USDC", "EUR")]),
    ("OKX", okx, [
        *[p(f"USDT-{f}", "USDT", f) for f in "USD EUR TRY BRL AUD AED SGD".split()],
        *[p(f"USDC-{f}", "USDC", f) for f in "EUR TRY BRL AUD AED SGD PLN".split()],
        p("RON-USDT", "USDT", "RON", False), p("RON-USDC", "USDC", "RON", False),
    ]),
    ("Bybit", bybit, [p("USDTEUR", "USDT", "EUR"), p("USDCEUR", "USDC", "EUR"), p("USDTUSD", "USDT", "USD"), p("USDTPLN", "USDT", "PLN"), p("USDTAED", "USDT", "AED")]),
    ("Upbit", upbit_like("https://api.upbit.com"), [p("KRW-USDT", "USDT", "KRW"), p("KRW-USDC", "USDC", "KRW")]),
    ("Bithumb", upbit_like("https://api.bithumb.com"), [p("KRW-USDT", "USDT", "KRW"), p("KRW-USDC", "USDC", "KRW")]),
    ("Coinone", coinone, [p("USDT", "USDT", "KRW"), p("USDC", "USDC", "KRW")]),
    ("Korbit", korbit, [p("usdt_krw", "USDT", "KRW"), p("usdc_krw", "USDC", "KRW")]),
    ("BtcTurk", btcturk, [p("USDTTRY", "USDT", "TRY"), p("USDCTRY", "USDC", "TRY")]),
    ("Bitvavo", bitvavo, [p("USDC-EUR", "USDC", "EUR")]),
    ("Bitfinex", bitfinex, [p("tUSTUSD", "USDT", "USD"), p("tUDCUSD", "USDC", "USD"), p("tEURUST", "USDT", "EUR", False), p("tGBPUST", "USDT", "GBP", False)]),
    ("Gemini", gemini, [p("usdtusd", "USDT", "USD"), p("usdcusd", "USDC", "USD"), p("eurusdc", "USDC", "EUR", False), p("audusdc", "USDC", "AUD", False)]),
    ("Crypto.com", cryptocom, [p("USDT_USD", "USDT", "USD"), p("EUR_USDT", "USDT", "EUR", False)]),
    ("KuCoin", kucoin, [p("USDT-EUR", "USDT", "EUR"), p("USDC-EUR", "USDC", "EUR")]),
    ("Gate", gate, [p("USDT_USD", "USDT", "USD"), p("CAD_USDT", "USDT", "CAD", False), p("RON_USDT", "USDT", "RON", False)]),
    ("Bitget", bitget, [
        p("USDTEUR", "USDT", "EUR"), p("USDCEUR", "USDC", "EUR"), p("USDTUSD", "USDT", "USD"), p("USDCUSD", "USDC", "USD"),
        p("USDTBRL", "USDT", "BRL"), p("USDTVND", "USDT", "VND"), p("RONUSDT", "USDT", "RON", False),
    ]),
    ("MEXC", mexc, [
        p("EURUSDT", "USDT", "EUR", False), p("USDCEUR", "USDC", "EUR"), p("USDUSDT", "USDT", "USD", False), p("USDUSDC", "USDC", "USD", False),
        p("BRLUSDT", "USDT", "BRL", False), p("USDTBRL", "USDT", "BRL"), p("USDCBRL", "USDC", "BRL"), p("ARSUSDT", "USDT", "ARS", False),
        p("COPUSDT", "USDT", "COP", False), p("MXNUSDT", "USDT", "MXN", False), p("PLNUSDT", "USDT", "PLN", False),
        p("PLNUSDC", "USDC", "PLN", False), p("RONUSDT", "USDT", "RON", False),
    ]),
    ("WhiteBIT", whitebit, [
        *[p(f"USDT_{f}", "USDT", f) for f in "USD EUR GBP CHF TRY PLN CZK UAH KZT".split()],
        *[p(f"USDC_{f}", "USDC", f) for f in "USD EUR GBP CHF TRY".split()],
        p("RON_USDT", "USDT", "RON", False),
    ]),
    ("Indodax", indodax, [p("USDTIDR", "USDT", "IDR"), p("USDCIDR", "USDC", "IDR")]),
    ("CoinDCX", coindcx, [p("I-USDT_INR", "USDT", "INR"), p("I-USDC_INR", "USDC", "INR")]),
    ("BTC Markets", btcmarkets, [p("USDT-AUD", "USDT", "AUD"), p("USDC-AUD", "USDC", "AUD")]),
    ("Bitso", bitso, [p("usdt_mxn", "USDT", "MXN"), p("usdt_brl", "USDT", "BRL"), p("usdt_ars", "USDT", "ARS"), p("usdt_cop", "USDT", "COP"), p("usd_usdt", "USDT", "USD", False)]),
]


def main() -> None:
    lo, hi = START.strftime("%Y-%m-%d"), END.strftime("%Y-%m-%d")
    rows, log = [], []
    for exch, fn, pairs in PANEL:
        for sym, stable, fiat, is_base in pairs:
            try:
                candles = fn(sym)
            except Exception as exc:
                log.append([exch, sym, stable, fiat, "errore", 0, f"{type(exc).__name__}: {exc}"[:160]])
                continue
            n = 0
            for d, vbase, vquote, close in candles:
                if not (lo <= d < hi):
                    continue
                vol = vbase if is_base else (vquote if vquote is not None else vbase * close)
                rows.append([exch, sym, stable, fiat, d, round(vol, 2)])
                n += 1
            log.append([exch, sym, stable, fiat, "ok" if n else "nessun dato nella finestra", n, ""])
            time.sleep(0.25)
        print(exch, "fatto", flush=True)
    with (OUT / "exchange_daily_volumes.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["exchange", "symbol", "stable", "fiat", "date", "volume_stable"])
        w.writerows(rows)
    with (OUT / "exchange_fetch_log.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["exchange", "symbol", "stable", "fiat", "status", "days", "detail"])
        w.writerows(log)
    print(f"{len(rows)} righe; coppie ok {sum(1 for r in log if r[4] == 'ok')}/{len(log)}")


if __name__ == "__main__":
    main()
