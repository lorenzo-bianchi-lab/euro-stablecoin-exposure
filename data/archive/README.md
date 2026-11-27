# Archived data of discarded methods

The files in this folder belong to methods that were tried at the start of the project and
then discarded. They are kept so that the preliminary reports can be reproduced; nothing
in the current programme (`src/run_all.py`, the application) reads them. Why each method
was discarded is in `SPEC.md`, section 5, and in the reports cited below.

The scripts that produce and read these files are still in `src/`; their paths point here.

## raw/

| File | Method | Produced by | Report |
|---|---|---|---|
| `exchange_daily_volumes.csv`, `exchange_fetch_log.csv` | Proxy 1: EUR share of exchange volumes, used as a level (test H1, window of the test) | `src/exchange_fetch.py` run on its own | `reports/00_h1_feasibility_test.md` |
| `coingecko_fiat_tickers_snapshot.csv` | Proxy 1 cross-check with a 24-hour CoinGecko snapshot | `src/coingecko_snapshot.py` | `reports/00_h1_feasibility_test.md` |
| `onchain_block_samples_eth.csv`, `onchain_block_samples_tron.csv` | Proxy 2: hourly profile of on-chain transfers | `src/onchain_fetch.py` | `reports/00_h1_feasibility_test.md` |
| `cex_flows_eth_daily.csv`, `cex_flows_tron_daily.csv` | Proxy 3: flows to exchange addresses weighted by EUR share | `src/cex_flows_fetch.py` | `reports/01_proxy3_test.md` |

Not committed (listed in `.gitignore`): the block-level working files
`cex_flows_eth.csv`, `cex_flows_tron.csv`, `cex_flows_*_by_address.csv`, and the address
labels in `labels/` (Dune Spellbook, downloaded by `src/cex_flows_fetch.py`).

## processed/

| File | Content | Produced by |
|---|---|---|
| `proxy1_*.csv`, `proxy1_summary.json` | Proxy 1 tables and summary | `src/proxy1_exchange.py` |
| `proxy2_*.csv`, `proxy2_summary.json` | Proxy 2 decomposition and hourly profiles | `src/proxy2_onchain.py` |
| `proxy3_*.csv`, `proxy3_summary.json` | Proxy 3 flows by exchange and week | `src/proxy3_cex_flows.py` |
| `h1_decision.json` | Outcome of test H1 (GO WITH RESERVATIONS, R = 2.16) | `src/h1_decision.py` |

The weekly index of module 2 is the surviving form of proxy 1: it uses its own store,
`data/raw/m2_daily_volumes.csv`, and does not read anything here.
