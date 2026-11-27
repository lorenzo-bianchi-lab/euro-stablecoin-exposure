"""Downloads the flows of USDT and USDC from and to the addresses labelled as exchanges.

Labels: public lists of duneanalytics/spellbook, read from GitHub at a fixed version
(they are not committed to this repository). Flows: Transfer events read from public RPCs,
filtering by labelled address, in blocks of CHUNK.

For each work block it saves the aggregates by day, token, exchange and direction.
The script resumes from where it stopped.

Discarded method: proxy 3, flows to exchanges weighted by EUR share (reports/01_proxy3_test.md,
SPEC.md section 5). Its data are kept in data/archive/.

Inputs: Dune Spellbook address labels (GitHub, saved in data/archive/raw/labels/); public
Ethereum and Tron JSON-RPC endpoints.
Outputs: data/archive/raw/cex_flows_{eth,tron}.csv (working files), cex_flows_{eth,tron}_by_address.csv
and the daily tables cex_flows_{eth,tron}_daily.csv.

Usage: python src/cex_flows_fetch.py [eth|tron]
       python src/cex_flows_fetch.py compact   # regenerate only the daily tables
"""

from __future__ import annotations

import csv
import hashlib
import itertools
import re
import socket
import sys
import threading
import time
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import requests
import urllib3.util.connection

# On some networks the IPv6 connection to GitHub hangs: IPv4 is forced
urllib3.util.connection.allowed_gai_family = lambda: socket.AF_INET

START = int(datetime(2026, 10, 12, tzinfo=timezone.utc).timestamp())
END = int(datetime(2026, 11, 23, tzinfo=timezone.utc).timestamp())
TRANSFER = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
ZERO = "0x" + "0" * 64
RAW = Path(__file__).resolve().parents[1] / "data" / "archive" / "raw"  # discarded method: data kept in data/archive
LABEL_DIR = RAW / "labels"
SPELLBOOK = (
    "https://raw.githubusercontent.com/duneanalytics/spellbook/{sha}/dbt_subprojects/hourly_spellbook/models/_sector/cex/addresses/chains/{path}"
)
B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

CHAINS = {
    "eth": {
        "rpcs": ["https://rpc.mevblocker.io", "https://eth.drpc.org"],
        "tokens": {
            "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
            "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
        },
        "labels": ("9f61b0dd2bba5a8314d0f36eca1419da5d25ac97", "cex_evms_addresses.sql"),
        "chunk": 100,
        "step": 100,  # step == chunk: full census
        "workers": 4,
    },
    "tron": {
        "rpcs": ["https://tron-evm-rpc.publicnode.com", "https://tron-rpc.publicnode.com/jsonrpc"],
        "header_rpcs": ["https://api.trongrid.io/jsonrpc"],
        "tokens": {"0xa614f803b6fd780986a42c78ec9c7f77e6ded13c": "USDT"},
        "labels": ("447a87c9068b505a54233b6b4ebf879179832201", "tron/cex_tron_addresses.sql"),
        "chunk": 500,
        "step": 500,  # full census
        "workers": 3,
    },
}

session = requests.Session()
session.headers.update({"User-Agent": "research-script/0.1", "Content-Type": "application/json"})
_counter = itertools.count()


class TooManyResults(RuntimeError):
    """The node refuses the response because it exceeds the maximum number of logs."""


def rpc(urls, method, params, tries=8):
    last = None
    for attempt in range(tries):
        url = urls[next(_counter) % len(urls)]
        try:
            r = session.post(url, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=90)
            if r.status_code == 200:
                j = r.json()
                if j.get("result") is not None:
                    return j["result"]
                last = str(j.get("error", j))[:200]
                if any(k in last for k in ("10000", "more than", "too large")):
                    raise TooManyResults(last)
            else:
                last = f"HTTP {r.status_code} {r.text[:120]}"
        except TooManyResults:
            raise
        except Exception as exc:
            last = f"{type(exc).__name__}: {exc}"[:200]
        time.sleep(min(30, 0.5 * 2**attempt))
    raise RuntimeError(f"{method} failed after {tries} attempts: {last}")


def get_logs(cfg, start, end, topics):
    """eth_getLogs that halves the block range if the node refuses the response because it is too large."""
    try:
        return rpc(
            cfg["rpcs"], "eth_getLogs", [{"fromBlock": hex(start), "toBlock": hex(end), "address": list(cfg["tokens"]), "topics": topics}], tries=10
        )
    except TooManyResults:
        if start == end:
            raise
        mid = (start + end) // 2
        return get_logs(cfg, start, mid, topics) + get_logs(cfg, mid + 1, end, topics)


def block_ts(urls, n):
    return int(rpc(urls, "eth_getBlockByNumber", [hex(n), False])["timestamp"], 16)


def first_block_at(urls, ts):
    hi = int(rpc(urls, "eth_blockNumber", []), 16)
    lo = max(1, hi - 3_000_000)
    while lo < hi:
        mid = (lo + hi) // 2
        if block_ts(urls, mid) < ts:
            lo = mid + 1
        else:
            hi = mid
    return lo


def tron_to_hex(addr: str) -> str:
    n = 0
    for ch in addr:
        n = n * 58 + B58.index(ch)
    raw = n.to_bytes(25, "big")
    body, check = raw[:21], raw[21:]
    if body[0] != 0x41 or hashlib.sha256(hashlib.sha256(body).digest()).digest()[:4] != check:
        raise ValueError(f"invalid Tron address: {addr}")
    return "0x" + body[1:].hex()


def load_labels(chain: str) -> dict[str, str]:
    """Returns {lowercase hexadecimal address: exchange name}."""
    sha, path = CHAINS[chain]["labels"]
    LABEL_DIR.mkdir(parents=True, exist_ok=True)
    local = LABEL_DIR / f"{sha[:10]}_{Path(path).name}"
    if not local.exists():
        r = requests.get(SPELLBOOK.format(sha=sha, path=path), timeout=60)
        r.raise_for_status()
        local.write_text(r.text)
    text = local.read_text()
    if chain == "tron":
        pairs = re.findall(r"\(\s*'tron'\s*,\s*'(T[1-9A-HJ-NP-Za-km-z]{33})'\s*,\s*'([^']*)'", text)
        return {tron_to_hex(a): name for a, name in pairs}
    pairs = re.findall(r"\(\s*(0x[0-9a-fA-F]{40})\s*,\s*'([^']*)'", text)
    return {a.lower(): name for a, name in pairs}


def run(chain: str) -> None:
    cfg = CHAINS[chain]
    labels = load_labels(chain)
    topic_of = {"0x" + "0" * 24 + a[2:]: name for a, name in labels.items()}
    topics = sorted(topic_of)
    hdr = cfg.get("header_rpcs", cfg["rpcs"])
    b0, b1 = first_block_at(hdr, START), first_block_at(hdr, END)
    ts0, ts1 = block_ts(hdr, b0), block_ts(hdr, b1)
    sec_per_block = (ts1 - ts0) / (b1 - b0)

    path = RAW / f"cex_flows_{chain}.csv"
    done = set()
    if path.exists():
        with path.open() as f:
            done = {int(r["chunk"]) for r in csv.DictReader(f) if r["exchange"] == "_done"}
    starts = [s for s in range(b0, b1, cfg["step"])]
    todo = [s for s in starts if s not in done]
    print(
        f"[{chain}] {len(labels)} addresses, blocks {b0}-{b1}, jobs {len(starts)}, to do {len(todo)}, "
        f"sampled fraction {cfg['chunk'] / cfg['step']:.3f}",
        flush=True,
    )

    by_address = defaultdict(lambda: [0.0, 0])  # (address, exchange, token, direction) -> value, n
    lock = threading.Lock()
    fails = 0
    new = not path.exists()
    f = path.open("a", newline="")
    w = csv.writer(f)
    if new:
        w.writerow(["chunk", "date", "token", "exchange", "direction", "value", "n"])

    def work(start):
        nonlocal fails
        end = min(start + cfg["chunk"], b1) - 1
        agg = defaultdict(lambda: [0.0, 0])
        local_addr = defaultdict(lambda: [0.0, 0])
        try:
            for direction, tp in (("in", [TRANSFER, None, topics]), ("out", [TRANSFER, topics])):
                logs = get_logs(cfg, start, end, tp)
                for lg in logs:
                    tok = cfg["tokens"].get(lg["address"].lower())
                    if tok is None or len(lg["topics"]) < 3:
                        continue
                    src, dst = lg["topics"][1].lower(), lg["topics"][2].lower()
                    if src == ZERO or dst == ZERO:
                        continue
                    ex_src, ex_dst = topic_of.get(src), topic_of.get(dst)
                    value = int(lg["data"], 16) / 1e6 if lg["data"] not in ("0x", "") else 0.0
                    if lg.get("blockTimestamp"):
                        ts = int(lg["blockTimestamp"], 16)
                        ts = ts // 1000 if ts > 10_000_000_000 else ts
                    else:
                        ts = ts0 + (int(lg["blockNumber"], 16) - b0) * sec_per_block
                    date = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")
                    if ex_src is not None and ex_src == ex_dst:
                        if direction == "in":  # internal transfers appear in both queries
                            a = agg[(date, tok, ex_src, "internal")]
                            a[0] += value
                            a[1] += 1
                        continue
                    ex, addr = (ex_dst, dst) if direction == "in" else (ex_src, src)
                    a = agg[(date, tok, ex, direction)]
                    a[0] += value
                    a[1] += 1
                    b = local_addr[("0x" + addr[26:], ex, tok, direction)]
                    b[0] += value
                    b[1] += 1
        except Exception as exc:
            with lock:
                fails += 1
                print(f"[{chain}] blocks from {start} skipped: {exc}", flush=True)
            return
        with lock:
            for (date, tok, ex, direction), (value, n) in agg.items():
                w.writerow([start, date, tok, ex, direction, round(value, 2), n])
            w.writerow([start, "", "", "_done", "", 0, 0])
            for key, (value, n) in local_addr.items():
                by_address[key][0] += value
                by_address[key][1] += n

    with ThreadPoolExecutor(cfg["workers"]) as ex:
        for i, _ in enumerate(ex.map(work, todo), 1):
            if i % 200 == 0:
                f.flush()
                print(f"[{chain}] {i}/{len(todo)} (failed {fails})", flush=True)
    f.close()
    if not done:  # the detail by address is complete only if the download happened in a single run
        with (RAW / f"cex_flows_{chain}_by_address.csv").open("w", newline="") as g:
            wa = csv.writer(g)
            wa.writerow(["address", "exchange", "token", "direction", "value", "n"])
            for (addr, exch, tok, direction), (value, n) in sorted(by_address.items(), key=lambda kv: -kv[1][0]):
                wa.writerow([addr, exch, tok, direction, round(value, 2), n])
    print(f"[{chain}] finished, failed {fails}", flush=True)
    if not fails:
        compact(chain)


def compact(chain: str) -> None:
    """Reduces the working file (one row per work block) to a daily table to commit."""
    agg = defaultdict(lambda: [0.0, 0])
    with (RAW / f"cex_flows_{chain}.csv").open() as f:
        for r in csv.DictReader(f):
            if r["exchange"] != "_done":
                a = agg[(r["date"], r["token"], r["exchange"], r["direction"])]
                a[0] += float(r["value"])
                a[1] += int(r["n"])
    with (RAW / f"cex_flows_{chain}_daily.csv").open("w", newline="") as g:
        w = csv.writer(g)
        w.writerow(["date", "token", "exchange", "direction", "value", "n"])
        for key in sorted(agg):
            w.writerow([*key, round(agg[key][0], 2), agg[key][1]])


if __name__ == "__main__":
    args = sys.argv[1:] or ["eth", "tron"]
    if args[0] == "compact":
        for c in args[1:] or ["eth", "tron"]:
            compact(c)
    else:
        for c in args:
            run(c)
