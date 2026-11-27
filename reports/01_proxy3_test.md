# 01 - Test of proxy 3: flows to exchanges weighted by euro share

The H1 test ([00_h1_feasibility_test.md](00_h1_feasibility_test.md)) left one usable proxy (proxy 1,
EUR share of stablecoin/fiat volumes: 24.3%) and one to be discarded (proxy 2, on-chain
hours). Neither measures residence. Here a third method is tried, based on exchange
addresses.

As for the H1 test, sections 1 and 2 were committed **before** the flows were
downloaded: the git history shows this. The EUR shares by exchange, by contrast, were
already known, because they are a result of proxy 1.

## 1. Criterion (set before the results)

Outcome **RANGE** if all three conditions hold:

1. coverage of at least 30%;
2. total proxy 3 between 5% and 30%;
3. each of the six weekly values within ±25% of their mean.

Outcome **TREND ONLY** if even one condition fails. In the first case module 1 will
give a range; in the second an index over time, without a level.

## 2. Pre-registered method

Period: 2026-10-12 - 2026-11-22, six weeks from Monday to Sunday (UTC).

### 2.1 Labels

Public lists from the GitHub repository `duneanalytics/spellbook` (the same ones that
feed Dune's `cex.addresses` table), read without an API key:

- `cex_evms_addresses.sql`: 4,957 addresses of 328 exchanges and custody services;
- `cex_tron_addresses.sql`: 149 addresses of 33 exchanges.

These are operational exchange addresses (hot and cold wallets), not the deposit
addresses of individual customers. Deposits are counted when the exchange collects
them into its own wallet.

### 2.2 Flows

- `Transfer` events of USDT and USDC on Ethereum and of USDT on Tron, read from public
  RPCs filtering by labelled address. On Ethereum a full census is carried out. On
  Tron the census is carried out if the free endpoints allow it; otherwise a declared
  systematic sample is used or, if not even that is feasible, Tron is left out and this
  is stated.
- **Inflow** of an exchange: transfer to one of its addresses. **Outflow**: transfer
  from one of its addresses.
- Excluded: internal transfers (sender and recipient belonging to the same exchange)
  and minting and burning (zero address).
- **Flow** of an exchange = inflows + outflows, in dollars, USDT and USDC together.

### 2.3 EUR share by exchange

From proxy 1 (`data/raw/exchange_daily_volumes.csv`): volume against EUR divided by
volume against all fiat currencies, USDT and USDC together, over the whole window. It
is defined only for the 25 exchanges in the proxy 1 panel, matched to the labels by
name:

Binance, Binance.US (label "Binance US"), Kraken, Coinbase (labels "Coinbase" and
"Coinbase Prime"), Bitstamp, OKX, Bybit, Upbit, Bithumb, Coinone, Korbit, BtcTurk,
Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate (label "Gate.io"), Bitget,
MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso.

### 2.4 Proxy 3 and coverage

- **Proxy 3** = sum(flow × EUR share) / sum(flow), over the exchanges for which the
  EUR share is defined. Calculated in total, by token and for each of the six weeks.
  The EUR share of each exchange is held fixed: weekly changes reflect only the
  composition of flows.
- **Coverage** = flows of exchanges with a defined EUR share divided by flows of all
  addresses labelled as exchanges. The true total of flows to exchanges is not
  observable: the set of all labels is the best free approximation, and it
  underestimates the total.
- The verdict uses total proxy 3, total coverage and the six weekly values.

### 2.5 Sensitivity variants (they do not change the verdict)

- Labelled exchanges without fiat pairs counted with an EUR share of zero (lower bound).
- Inflows only; outflows only.
- Token-specific EUR share instead of the overall one.
- By network (Ethereum, Tron).
- Without the "Coinbase Prime" labels.
- Exclusion of one exchange at a time.

### 2.6 Weak assumption declared at the outset

The method assumes that an exchange's on-chain flows are split across currencies in
the same way as its stablecoin/fiat trading volumes. There is no reason why this should
be true: an exchange that lists only euro pairs receives a 100% share even if those
pairs are a tiny fraction of its activity, and most stablecoins are traded against
other crypto-assets, not against fiat currencies.

## 3. Results

Run on 2026-11-23/24. All figures are reproduced with `src/proxy3_cex_flows.py`
starting from the daily tables in `data/raw/cex_flows_*_daily.csv`.

### 3.1 Verdict

| Condition | Threshold | Value | Outcome |
|---|---|---|---|
| Coverage | at least 30% | 91.0% | holds |
| Total proxy 3 | between 5% and 30% | **38.4%** | **does not hold** |
| Weekly variation | within ±25% of the mean | from -14.9% to +19.1% | holds |

**Verdict: TREND ONLY.** Proxy 3 exceeds the 30% ceiling, so module 1 cannot use it
to set a level.

Two caveats go beyond the criterion and are explained in sections 3.5 and 4:

- the 91% coverage is measured on the set of labelled addresses, which, however, does
  not contain the active addresses of Kraken or of the Korean exchanges;
- the trend is also contaminated: the rise from 33% to 46% over the six weeks depends
  entirely on the collapse in Binance's labelled flows at the end of October.

### 3.2 Label sources and coverage

| | Ethereum | Tron |
|---|---|---|
| Label source | `cex_evms_addresses.sql`, Dune Spellbook on GitHub | `cex_tron_addresses.sql`, Dune Spellbook on GitHub |
| Last update of the file | 2026-01-28 | 2026-10-19 |
| Labelled addresses | 4,957 (328 names) | 149 (33 names) |
| Addresses with flows in the period | 319 | 34 |
| Flows read from | Public RPCs MEV Blocker and dRPC | Public RPCs PublicNode |
| Type of collection | full census | full census |
| Gross labelled flows | USD 271.6 bn | USD 87.9 bn |
| Coverage (pre-registered definition) | 88.6% | 98.6% |
| Labelled flows as a share of the total value transferred on-chain | about 11% | about 8% |

In total: 13.9 million transfers, USD 359.5 billion of gross labelled flows, of which
327.2 billion (91.0%) to exchanges with a defined EUR share. A further 84.5 billion are
internal transfers within the same exchange, which are excluded. No API key was needed
and no block was lost.

The last row of the table uses as its denominator the total value estimated from the
block sample of the H1 test: it is a rough estimate, useful only as an order of
magnitude.

Coverage by week ranges from 84.3% to 93.9%. By token: 92.4% on USDT, 88.8% on USDC.

### 3.3 Proxy 3

| | Proxy 3 | Coverage |
|---|---|---|
| **Total** | **38.4%** | 91.0% |
| USDT | 29.6% | 92.4% |
| USDC | 52.9% | 88.8% |
| Ethereum (USDT and USDC) | 41.6% | 88.6% |
| Tron (USDT) | 29.7% | 98.6% |

| Week (Monday) | Proxy 3 | Deviation from the mean (38.9%) | Gross flows (USD bn) |
|---|---|---|---|
| 12 October | 33.5% | -13.9% | 51.9 |
| 19 October | 33.1% | -14.9% | 54.8 |
| 26 October | 35.3% | -9.1% | 72.6 |
| 2 November | 40.0% | +3.0% | 53.5 |
| 9 November | 45.0% | +15.7% | 40.6 |
| 16 November | 46.3% | +19.1% | 53.8 |

Where the 38.4% comes from: the ten exchanges with the largest labelled flows.

| Exchange | Gross flows (USD bn) | Share of labelled flows | EUR share (proxy 1) | Contribution to proxy 3 (points) | Fiat volume / flows |
|---|---|---|---|---|---|
| Coinbase | 106.5 | 29.6% | 59.3% | 19.3 | 4.7% |
| Binance | 81.6 | 22.7% | 10.9% | 2.7 | 10.0% |
| Bitfinex | 38.2 | 10.6% | 2.3% | 0.3 | 5.8% |
| OKX | 35.5 | 9.9% | 46.4% | 5.0 | 8.4% |
| Bybit | 25.5 | 7.1% | 90.9% | 7.1 | 1.5% |
| Gate | 11.3 | 3.1% | 0.0% | 0.0 | 0.0% |
| KuCoin | 9.4 | 2.6% | 100.0% | 2.9 | 0.4% |
| MEXC | 4.4 | 1.2% | 29.4% | 0.4 | 2.0% |
| Bitso | 4.1 | 1.2% | 0.0% | 0.0 | 7.2% |
| Bitstamp | 3.0 | 0.8% | 36.2% | 0.3 | 73.0% |

The last column shows how much the exchange's stablecoin/fiat pairs weigh relative to
its on-chain flows: it is the base on which the applied EUR share rests. Full table in
`data/processed/proxy3_by_exchange.csv`.

Sensitivity variants (they do not change the verdict):

| Variant | Proxy 3 |
|---|---|
| Exchanges without fiat pairs counted at a zero share | 35.0% |
| Inflows only | 38.4% |
| Outflows only | 38.5% |
| Token-specific EUR share | 44.4% |
| Without the "Coinbase Prime" labels | 36.8% |
| Without Coinbase (minimum among single exclusions) | 28.4% |
| Without Binance (maximum among single exclusions) | 47.6% |

### 3.4 Comparison with proxy 1 and with the benchmarks

| Measure | Total | USDT | USDC |
|---|---|---|---|
| Proxy 1 - EUR share of stablecoin/fiat volumes | 24.3% | 11.9% | 50.4% |
| Proxy 3 - flows weighted by EUR share | 38.4% | 29.6% | 52.9% |

- Proxy 3 is not independent of proxy 1: it uses the same EUR shares by exchange and
  changes only the weights, from fiat volumes to on-chain flows. The 14-point
  difference comes entirely from the weights: Kraken (EUR share 29%, 40% of fiat
  volumes) has zero weight in the labelled flows, while Coinbase (59%) and Bybit (91%)
  weigh much more.
- Compared with the benchmarks of the H1 test ([00_h1_feasibility_test.md](00_h1_feasibility_test.md), section 3.5),
  proxy 3 is above the EUR share of crypto trading (9% - 12%), above the only
  stablecoin-specific figure (Chainalysis 2024: 24%), above the share of Europe in the
  broad sense in flows (IMF: 21%) and well above the supply shares referring to the euro area
  or to Western Europe (5.1% - 15%). It matches the Bruegel/Artemis time-zone estimate (38%), but the two
  measures have nothing in common and the match should not be read as confirmation.

### 3.5 Why neither the level nor the trend is reliable

- **Coinbase alone accounts for half of the result** (19.3 points out of 38.4). Its EUR
  share of 59% is an artefact: on Coinbase, USDC is converted into dollars at par,
  outside the order book, so the dollar volumes are missing and the euro appears
  dominant.
- **The highest shares rest on minimal bases.** Bybit (91%) and KuCoin (100%) list
  almost only euro pairs among fiat currencies, but those pairs account for 1.5% and
  0.4% of their respective on-chain flows.
- **Large exchanges are missing.** Kraken has 254 labelled addresses, only three of
  them active, and flows of USD 148 in six weeks. Upbit, Bithumb, Korbit and Coinone
  together do not reach 0.3 billion. The most likely explanation is that the labels are
  old relative to the wallets in use today; it was not possible to verify this.
- **The trend is an effect of the labels.** Binance's labelled flows fall from about
  3.4 billion a day to less than 1 from 30 October, on both networks, and its share
  drops from 39% to 6-8% of flows. Excluding Binance, proxy 3 is flat: between 45.8%
  and 49.3% in all weeks. The observed rise therefore does not describe a real change
  but, in all likelihood, a rotation of wallets not yet recorded in the lists.

## 4. Limitations

The main ones:

1. **The basic assumption does not stand up to the data.** The method assumes that an
   exchange's on-chain flows are split across currencies in the same way as its
   stablecoin/fiat volumes. For almost all large exchanges those volumes are less than
   10% of flows, and the EUR share depends on which pairs the exchange lists more than
   on who its customers are.
2. **The true coverage is not known.** The 91% is calculated on the labelled set, which
   is incomplete and dated (Ethereum file last updated in January 2026). Labelled flows
   are about one tenth of the value transferred on-chain and there is no way, with free
   data, of knowing how much of the rest involves exchanges.
3. **The result depends on a few names and a few labels.** Removing a single exchange,
   proxy 3 ranges from 28% to 48%; ten addresses explain almost two thirds of flows. An
   error or a delay on a single label moves the result by several points.
4. **It does not measure residence.** Like proxies 1 and 2, it weights activity in euro,
   not holdings of euro area residents.

Other limitations:

- The labelled addresses are operational wallets. Customer deposits are counted only
  when the exchange collects them, and part of the flows is movement between exchanges,
  custodians and market makers, not customer activity.
- Only Ethereum and Tron are covered; Solana, BNB Chain and layer-2 networks are missing.
- The labels have not been independently verified.
- Six weeks are too few to judge stability.

## 5. What could not be done

- **Labelling Kraken and the Korean exchanges**: the free lists do not contain their
  active addresses. A Dune key would not solve the problem, because Dune's
  `cex.addresses` table is built on these same lists. More up-to-date labels would be
  needed (Arkham, Nansen, Etherscan), which are paid or require an account.
- **Measuring coverage on the true total of flows to exchanges**: that total is not
  observable without a complete set of labels.
- **Verifying the cause of the Binance drop**: wallet rotation is the most likely
  hypothesis, but it has not been confirmed.
- **Identifying customer deposit addresses**: this requires analysing the collection
  transactions of each exchange, which is beyond the scope of a feasibility test.
- **Covering other networks**: not included.
- **Using Dune**: it was not needed; labels and flows were obtained without a key.

## 6. Pointers for module 1

- Do not use proxy 3 either for the level or, as things stand, for the trend.
- The most solid index over time among those tried remains proxy 1 (EUR share of
  stablecoin/fiat volumes), which over the six weeks fluctuates only between 22.4% and
  25.2%. It should be kept separate for USDT and USDC.
- If an address-based method is to be attempted again, the first step is to obtain
  up-to-date labels and to check their continuity exchange by exchange before
  aggregating.

## 7. Reproducibility

```bash
.venv/bin/python src/cex_flows_fetch.py     # census of flows, about 30 minutes
.venv/bin/python src/proxy3_cex_flows.py    # proxy 3, coverage and verdict
```

The labels are downloaded from GitHub at a fixed version (commit `9f61b0dd2b` for
Ethereum, `447a87c906` for Tron) and are not included in this repository, because they
are distributed by Dune under the Business Source License.

---

**What this adds to the final programme**: the finding that Coinbase's EUR share is an
artefact, which gives rise to the "without Coinbase" variant of the module 2 index; the
census of USDT and USDC flows of 121 exchanges on Ethereum and Tron, reusable as context
data; and the reasoned exclusion of methods based on free labels.
