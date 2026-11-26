"""Scarica i volumi giornalieri delle coppie stablecoin/fiat dagli exchange (API pubbliche).

Per ogni coppia salva il volume giornaliero espresso in unità di stablecoin.
Le coppie sono quelle elencate dagli endpoint "markets" dei singoli exchange il
2026-11-23 (USDT o USDC contro una valuta fiat, in entrambi i versi).

Ogni adattatore accetta una finestra qualsiasi e pagina le richieste quando l'API
limita il numero di candele per chiamata.

Uso: python src/exchange_fetch.py                      # finestra del test H1
     python src/exchange_fetch.py 2024-12-09 2026-11-23 nome_file
"""
from __future__ import annotations

import csv
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

H1_START = datetime(2026, 10, 12, tzinfo=timezone.utc)
H1_END = datetime(2026, 11, 23, tzinfo=timezone.utc)  # escluso
OUT = Path(__file__).resolve().parents[1] / "data" / "archive" / "raw"  # standalone runs (test H1) write to the archive; module 2 uses collect()
DAY = 86400

session = requests.Session()
session.headers.update({"User-Agent": "research-script/0.1"})


def get(url: str, **params):
    for attempt in range(5):
        r = session.get(url, params=params or None, timeout=40)
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


def iso(ts: int) -> str:
    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def secs(x) -> float:
    x = float(x)
    return x / 1000 if x > 1e11 else x


# Ogni adattatore riceve (simbolo, inizio, fine) in secondi Unix, con fine esclusa, e
# restituisce una lista di (giorno, volume_base, volume_quotato|None, chiusura).

def binance_like(base_url):
    def f(sym, s, e):
        out, cur = [], s
        while cur < e:
            rows = get(f"{base_url}/api/v3/klines", symbol=sym, interval="1d", startTime=cur * 1000, endTime=e * 1000 - 1, limit=1000)
            out += [(day(r[0]), float(r[5]), float(r[7]), float(r[4])) for r in rows]
            if len(rows) < 1000:
                break
            cur = int(rows[-1][0] / 1000) + DAY
        return out
    return f


def kraken(sym, s, e):
    # Kraken restituisce al massimo le ultime 720 candele giornaliere, qualunque sia "since"
    j = get("https://api.kraken.com/0/public/OHLC", pair=sym, interval=1440, since=s - DAY)
    if j.get("error"):
        raise RuntimeError(str(j["error"]))
    rows = next(v for k, v in j["result"].items() if k != "last")
    return [(day(r[0]), float(r[6]), None, float(r[4])) for r in rows]


def coinbase(sym, s, e):
    out = []
    for a in range(s, e, 300 * DAY):  # massimo 300 candele per chiamata
        b = min(a + 300 * DAY, e)
        rows = get(f"https://api.exchange.coinbase.com/products/{sym}/candles", granularity=DAY, start=iso(a), end=iso(b - 1))
        out += [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]
        time.sleep(0.2)
    return out


def bitstamp(sym, s, e):
    # l'API restituisce le ultime 1000 candele prima di "end": si pagina all'indietro
    out, end = [], e - 1
    while True:
        rows = get(f"https://www.bitstamp.net/api/v2/ohlc/{sym}/", step=DAY, limit=1000, end=end)["data"]["ohlc"]
        if not rows:
            break
        out += [(day(r["timestamp"]), float(r["volume"]), None, float(r["close"])) for r in rows]
        oldest = min(int(r["timestamp"]) for r in rows)
        if len(rows) < 1000 or oldest <= s:
            break
        end = oldest - 1
    return out


def okx(sym, s, e):
    out, cursor = [], e * 1000
    while True:
        rows = get("https://www.okx.com/api/v5/market/history-candles", instId=sym, bar="1Dutc", after=cursor, limit=100)["data"]
        if not rows:
            break
        out += [(day(r[0]), float(r[5]), float(r[6]), float(r[4])) for r in rows]
        cursor = min(int(r[0]) for r in rows)
        if cursor <= s * 1000:
            break
        time.sleep(0.15)
    return out


def bybit(sym, s, e):
    out, end = [], e * 1000 - 1
    while True:
        rows = get("https://api.bybit.com/v5/market/kline", category="spot", symbol=sym, interval="D", start=s * 1000, end=end, limit=1000)["result"]["list"]
        out += [(day(r[0]), float(r[5]), float(r[6]), float(r[4])) for r in rows]
        if len(rows) < 1000:
            break
        end = min(int(r[0]) for r in rows) - 1
    return out


def upbit_like(base_url):
    bithumb = "bithumb" in base_url
    key = "candle_date_time_kst" if bithumb else "candle_date_time_utc"

    def f(sym, s, e):
        # Bithumb vuole la data senza "T" e "Z" e chiude il giorno alle 00:00 KST
        out, to = [], datetime.fromtimestamp(e, timezone.utc).strftime("%Y-%m-%d %H:%M:%S") if bithumb else iso(e)
        first_day = day(s)
        while True:
            rows = get(f"{base_url}/v1/candles/days", market=sym, count=200, to=to)
            if not rows:
                break
            out += [(r[key][:10], float(r["candle_acc_trade_volume"]), float(r["candle_acc_trade_price"]), float(r["trade_price"])) for r in rows]
            oldest = min(r[key] for r in rows)
            if len(rows) < 200 or oldest[:10] <= first_day:
                break
            to = oldest.replace("T", " ") if bithumb else oldest + "Z"
            time.sleep(0.2)
        return out
    return f


def btcturk(sym, s, e):
    j = get("https://graph-api.btcturk.com/v1/klines/history", symbol=sym, resolution=1440, **{"from": s, "to": e - 1})
    return [(day(t), float(v), None, float(c)) for t, v, c in zip(j.get("t", []), j.get("v", []), j.get("c", []))]


def bitvavo(sym, s, e):
    # "end" esclude la candela che inizia in quell'istante: si chiede un giorno in più e si filtra dopo
    rows = get(f"https://api.bitvavo.com/v2/{sym}/candles", interval="1d", start=s * 1000, end=(e + DAY) * 1000, limit=1440)
    return [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]


def bitfinex(sym, s, e):
    rows = get(f"https://api-pub.bitfinex.com/v2/candles/trade:1D:{sym}/hist", start=s * 1000, end=e * 1000 - 1, limit=10000)
    return [(day(r[0]), float(r[5]), None, float(r[2])) for r in rows]


def gemini(sym, s, e):
    # l'API restituisce una finestra fissa di candele giornaliere, senza parametri di data
    rows = get(f"https://api.gemini.com/v2/candles/{sym}/1day")
    return [(day(r[0]), float(r[5]), None, float(r[4])) for r in rows]


def cryptocom(sym, s, e):
    out, end = [], e * 1000 - 1
    while True:
        rows = get("https://api.crypto.com/exchange/v1/public/get-candlestick", instrument_name=sym, timeframe="1D", count=300, end_ts=end)["result"]["data"]
        if not rows:
            break
        out += [(day(r["t"]), float(r["v"]), None, float(r["c"])) for r in rows]
        oldest = min(int(r["t"]) for r in rows)
        if len(rows) < 300 or oldest <= s * 1000:
            break
        end = oldest - 1
    return out


def kucoin(sym, s, e):
    rows = get("https://api.kucoin.com/api/v1/market/candles", type="1day", symbol=sym, startAt=s, endAt=e)["data"]
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[2])) for r in rows]


def gate(sym, s, e):
    # al massimo 1000 candele per chiamata; le finestre troppo vecchie vengono rifiutate e saltate
    out = []
    for a in range(s, e, 900 * DAY):
        try:
            rows = get("https://api.gateio.ws/api/v4/spot/candlesticks", currency_pair=sym, interval="1d",
                       **{"from": a, "to": min(a + 900 * DAY, e) - 1})
        except requests.HTTPError:
            continue
        out += [(day(r[0]), float(r[6]), float(r[1]), float(r[2])) for r in rows]
    return out


def mexc(sym, s, e):
    # MEXC risponde solo a finestre brevi: si procede a blocchi di 400 giorni
    out = []
    for a in range(s, e, 400 * DAY):
        rows = get("https://api.mexc.com/api/v3/klines", symbol=sym, interval="1d", startTime=a * 1000,
                   endTime=min(a + 400 * DAY, e) * 1000 - 1, limit=1000)
        out += [(day(r[0]), float(r[5]), float(r[7]), float(r[4])) for r in rows]
        time.sleep(0.15)
    return out


def bitget(sym, s, e):
    out, end = [], e * 1000
    while True:
        rows = get("https://api.bitget.com/api/v2/spot/market/history-candles", symbol=sym, granularity="1Dutc", endTime=end, limit=200)["data"]
        if not rows:
            break
        out += [(day(r[0]), float(r[5]), float(r[7]), float(r[4])) for r in rows]
        oldest = min(int(r[0]) for r in rows)
        if len(rows) < 200 or oldest <= s * 1000:
            break
        end = oldest
        time.sleep(0.15)
    return out


def whitebit(sym, s, e):
    rows = get("https://whitebit.com/api/v1/public/kline", market=sym, interval="1d", start=s, end=e - 1, limit=1440)["result"]
    return [(day(r[0]), float(r[5]), float(r[6]), float(r[2])) for r in rows]


def coinone(sym, s, e):
    out, ts = [], e * 1000
    while True:
        j = get(f"https://api.coinone.co.kr/public/v2/chart/KRW/{sym}", interval="1d", size=500, timestamp=ts)
        rows = j.get("chart", [])
        if not rows:
            break
        out += [(day(r["timestamp"]), float(r["target_volume"]), float(r["quote_volume"]), float(r["close"])) for r in rows]
        oldest = min(int(r["timestamp"]) for r in rows)
        if j.get("is_last") or oldest <= s * 1000:
            break
        ts = oldest - 1
    return out


def korbit(sym, s, e):
    # le candele Korbit iniziano alle 00:00 KST (15:00 UTC del giorno prima): si usa la data KST
    out, end = [], e * 1000
    while True:
        rows = get("https://api.korbit.co.kr/v2/candles", symbol=sym, interval="1D", limit=200, end=end)["data"]
        if not rows:
            break
        out += [(day(int(r["timestamp"]) / 1000 + 9 * 3600), float(r["volume"]), None, float(r["close"])) for r in rows]
        oldest = min(int(r["timestamp"]) for r in rows)
        if len(rows) < 200 or oldest <= s * 1000:
            break
        end = oldest - 1
    return out


def indodax(sym, s, e):
    rows = get("https://indodax.com/tradingview/history_v2", symbol=sym, tf="1D", **{"from": s, "to": e - 1})
    return [(day(r["Time"]), float(r["Volume"]), None, float(r["Close"])) for r in rows]


def coindcx(sym, s, e):
    rows = get("https://public.coindcx.com/market_data/candles", pair=sym, interval="1d", limit=1000)
    return [(day(r["time"]), float(r["volume"]), None, float(r["close"])) for r in rows]


def btcmarkets(sym, s, e):
    rows = get(f"https://api.btcmarkets.net/v3/markets/{sym}/candles", timeWindow="1d", limit=1000, **{"from": iso(s), "to": iso(e)})
    return [(r[0][:10], float(r[5]), None, float(r[4])) for r in rows]


def bitso(sym, s, e):
    j = get("https://api.bitso.com/v3/ohlc", book=sym, time_bucket=DAY, start=s * 1000, end=e * 1000)
    # i giorni Bitso iniziano alle 06:00 UTC: si attribuisce il giorno di inizio
    return [(day(r["bucket_start_time"]), float(r["volume"]), None, float(r["last_rate"])) for r in j["payload"]]


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
    # Bybit è fuori dal pannello dal 2026-11-25 (SPEC, prompt 6): non risponde dai server di GitHub,
    # quindi esecuzione locale e automatica davano indici diversi. Coppie: USDTEUR, USDCEUR, USDTUSD, USDTPLN, USDTAED.
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


def collect(start: datetime, end: datetime, verbose: bool = True) -> tuple[list[list], list[list]]:
    """Scarica tutte le coppie del pannello nella finestra [start, end). Restituisce righe e registro."""
    s, e = int(start.timestamp()), int(end.timestamp())
    lo, hi = start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d")
    rows, log = [], []
    for exch, fn, pairs in PANEL:
        for sym, stable, fiat, is_base in pairs:
            try:
                candles = fn(sym, s, e)
            except Exception as exc:
                log.append([exch, sym, stable, fiat, "errore", 0, "", "", f"{type(exc).__name__}: {exc}"[:160]])
                continue
            by_day = {}
            for d, vbase, vquote, close in candles:
                if lo <= d < hi:
                    by_day[d] = vbase if is_base else (vquote if vquote is not None else vbase * close)
            rows += [[exch, sym, stable, fiat, d, round(v, 2)] for d, v in sorted(by_day.items())]
            log.append([exch, sym, stable, fiat, "ok" if by_day else "nessun dato nella finestra", len(by_day),
                        min(by_day, default=""), max(by_day, default=""), ""])
            time.sleep(0.25)
        if verbose:
            print(exch, "fatto", flush=True)
    return rows, log


def save(rows: list[list], log: list[list], name: str) -> None:
    with (OUT / f"{name}.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["exchange", "symbol", "stable", "fiat", "date", "volume_stable"])
        w.writerows(rows)
    with (OUT / f"{name}_log.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["exchange", "symbol", "stable", "fiat", "status", "days", "first_day", "last_day", "detail"])
        w.writerows(log)


def main() -> None:
    if len(sys.argv) >= 3:
        start = datetime.strptime(sys.argv[1], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(sys.argv[2], "%Y-%m-%d").replace(tzinfo=timezone.utc)
        name = sys.argv[3] if len(sys.argv) > 3 else f"exchange_daily_volumes_{sys.argv[1]}_{sys.argv[2]}"
    else:  # finestra e nomi di file del test H1
        start, end, name = H1_START, H1_END, "exchange_daily_volumes"
    rows, log = collect(start, end)
    save(rows, log, name)
    if name == "exchange_daily_volumes":  # il test H1 legge il registro con questo nome
        (OUT / "exchange_daily_volumes_log.csv").replace(OUT / "exchange_fetch_log.csv")
    print(f"{len(rows)} righe; coppie ok {sum(1 for r in log if r[4] == 'ok')}/{len(log)}")


if __name__ == "__main__":
    main()
