"""Campiona gli eventi Transfer di USDT e USDC da RPC pubblici (Ethereum e Tron).

Campione sistematico: un blocco ogni STEP nella finestra pre-registrata. Per ogni
blocco campionato salva solo gli aggregati per token (conteggi e valore), non i log.
Lo script riprende da dove si era fermato se il CSV esiste già.

Uso: python src/onchain_fetch.py [eth|tron]
"""
from __future__ import annotations

import csv
import itertools
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import requests

START = int(datetime(2026, 10, 12, tzinfo=timezone.utc).timestamp())
END = int(datetime(2026, 11, 23, tzinfo=timezone.utc).timestamp())
TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
ZERO = "0x" + "0" * 64
OUT = Path(__file__).resolve().parents[1] / "data" / "raw"

CHAINS = {
    "eth": {
        "rpcs": ["https://eth.drpc.org", "https://rpc.mevblocker.io"],
        "tokens": {
            "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
        },
        "step": 50,
        "workers": 4,
    },
    "tron": {
        # TronGrid senza chiave limita a 3 richieste al secondo: si usano i nodi PublicNode
        "rpcs": ["https://tron-evm-rpc.publicnode.com", "https://tron-rpc.publicnode.com/jsonrpc"],
        # i nodi PublicNode non restituiscono le intestazioni dei blocchi vecchi: per quelle si usa TronGrid
        "header_rpcs": ["https://api.trongrid.io/jsonrpc"],
        # TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t in formato esadecimale
        "tokens": {"0xa614f803b6fd780986a42c78ec9c7f77e6ded13c": "USDT"},
        "step": 200,
        "workers": 2,
    },
}

session = requests.Session()
session.headers.update({"User-Agent": "research-script/0.1", "Content-Type": "application/json"})
_counter = itertools.count()


def rpc(urls: list[str], method: str, params: list, tries: int = 8):
    """Chiamata JSON-RPC con rotazione degli endpoint e attesa crescente sugli errori."""
    last = None
    for attempt in range(tries):
        url = urls[next(_counter) % len(urls)]
        try:
            r = session.post(url, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=40)
            if r.status_code == 200:
                j = r.json()
                if "result" in j and j["result"] is not None:
                    return j["result"]
                last = str(j.get("error", j))[:200]
            else:
                last = f"HTTP {r.status_code}"
        except Exception as exc:  # rete instabile: si ritenta
            last = f"{type(exc).__name__}: {exc}"[:200]
        time.sleep(min(30, 0.5 * 2**attempt))
    raise RuntimeError(f"{method} fallita dopo {tries} tentativi: {last}")


def block_ts(urls, n: int) -> int:
    return int(rpc(urls, "eth_getBlockByNumber", [hex(n), False])["timestamp"], 16)


def first_block_at(urls, ts: int) -> int:
    """Primo blocco con timestamp >= ts (ricerca binaria)."""
    hi = int(rpc(urls, "eth_blockNumber", []), 16)
    lo = max(1, hi - 3_000_000)
    while lo < hi:
        mid = (lo + hi) // 2
        if block_ts(urls, mid) < ts:
            lo = mid + 1
        else:
            hi = mid
    return lo


def sample_block(chain: str, cfg: dict, n: int) -> list[list]:
    logs = rpc(cfg["rpcs"], "eth_getLogs", [{
        "fromBlock": hex(n), "toBlock": hex(n),
        "address": list(cfg["tokens"]), "topics": [TRANSFER],
    }])
    ts = None
    agg = {tok: [0, 0, 0.0, 0] for tok in cfg["tokens"].values()}  # n, n_retail, value, n_mintburn
    for lg in logs:
        if ts is None and lg.get("blockTimestamp"):
            ts = int(lg["blockTimestamp"], 16)
        tok = cfg["tokens"].get(lg["address"].lower())
        if tok is None or len(lg["topics"]) < 3:
            continue
        value = int(lg["data"], 16) / 1e6 if lg["data"] not in ("0x", "") else 0.0
        a = agg[tok]
        if lg["topics"][1] == ZERO or lg["topics"][2] == ZERO:
            a[3] += 1
            continue
        a[0] += 1
        a[2] += value
        if 1 <= value <= 10_000:
            a[1] += 1
    if ts is None:
        ts = block_ts(cfg.get("header_rpcs", cfg["rpcs"]), n)
    if ts > 10_000_000_000:  # alcuni nodi Tron rispondono in millisecondi
        ts //= 1000
    return [[chain, tok, n, ts, a[0], a[1], round(a[2], 2), a[3]] for tok, a in agg.items()]


def run(chain: str) -> None:
    cfg = CHAINS[chain]
    path = OUT / f"onchain_block_samples_{chain}.csv"
    done = set()
    if path.exists():
        with path.open() as f:
            done = {int(row["block"]) for row in csv.DictReader(f)}
    hdr = cfg.get("header_rpcs", cfg["rpcs"])
    b0, b1 = first_block_at(hdr, START), first_block_at(hdr, END)
    todo = [n for n in range(b0, b1, cfg["step"]) if n not in done]
    print(f"[{chain}] blocchi {b0}-{b1}, campione {len(range(b0, b1, cfg['step']))}, da scaricare {len(todo)}", flush=True)
    lock = threading.Lock()
    new = not path.exists()
    with path.open("a", newline="") as f:
        w = csv.writer(f)
        if new:
            w.writerow(["chain", "token", "block", "timestamp", "n", "n_retail", "value", "n_mintburn"])
        fails = 0

        def work(n):
            nonlocal fails
            try:
                rows = sample_block(chain, cfg, n)
            except Exception as exc:
                with lock:
                    fails += 1
                    print(f"[{chain}] blocco {n} saltato: {exc}", flush=True)
                return
            with lock:
                w.writerows(rows)

        with ThreadPoolExecutor(cfg["workers"]) as ex:
            for i, _ in enumerate(ex.map(work, todo), 1):
                if i % 500 == 0:
                    f.flush()
                    print(f"[{chain}] {i}/{len(todo)} (falliti {fails})", flush=True)
    print(f"[{chain}] finito, falliti {fails}", flush=True)


if __name__ == "__main__":
    for c in sys.argv[1:] or ["eth", "tron"]:
        run(c)
