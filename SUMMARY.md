# Summary - euro area exposure to dollar stablecoins

Page generated on 27 November 2026 by `src/summary.py`. Do not edit it by hand: it is regenerated with
`.venv/bin/python src/run_all.py`. Interactive version: [application](https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/).

The programme estimates a range for the dollar stablecoins held by euro area residents, not
a measurement: it starts from an ECB survey and from stated assumptions. It then shows how
activity in euro moves, which banking systems have the most exposed funding and how much
each adoption level would weigh on deposits and credit, country by country.

## 1. Level: EUR 15.4 billion, range 8.9 - 23.1

Own bottom-up estimate: euro area households × share holding stablecoins × average amount
held × dollar share, from the ECB consumer survey. The programme estimates a range.

| | EUR billion | What it represents |
|---|---|---|
| Minimum | 8.9 | Prudent assumptions on amounts and dollar share |
| **Centre** | **15.4** | Reference level of the programme |
| Maximum | 23.1 | High assumptions on amounts and dollar share |
| Declared upper extreme | 42.0 | Individuals variant: counts the same household more than once |
| Comparison: ESM assumption, 7.5% share | 16.6 | Share assumed by the ESM × circulation of USDT and USDC on 27 November 2026 (USD 243.0 bn) |
| Comparison: ESM assumption, 15% share | 33.3 | As above, double share |

The survey covers 11 countries and is described as experimental by the ECB; the extension to 21 countries is an assumption.
The two other routes attempted (exchange reserves, national data) do not confirm the estimate: the
criterion set in report 08 would have published only the minimum. The choice of the range as the
reference was made on 25 November 2026, after the results, and is recorded in the log of SPEC.md.

## 2. Trend: EUR share of stablecoin/fiat volumes, week 16-22 November 2026

| Series | Last week | Change (points) | 52-week mean | Share deviation | Volume deviation | Status |
|---|---|---|---|---|---|---|
| USDT | 10.2% | -1.2 | 13.5% | -1.2 | -0.1 | none |
| USDT without Coinbase | 9.0% | -1.0 | 13.2% | -1.5 | -0.5 | none |
| USDC | 54.3% | +1.8 | 48.7% | +0.7 | +2.4 | to be checked |
| USDC without Coinbase | 47.7% | +2.2 | 44.7% | +0.4 | +1.8 | none |

To watch: USDC (to be checked). A deviation above 2 only in volume or only in share usually indicates
a movement of the other currencies, not of the euro.
The index measures trading in euro on 24 exchanges, not holdings or residence. Test of the predictive
content for households' sight deposits: outcome **no** (p = 0.35, 44 months).
Bybit is out of the index for the whole history. Without it, the index changes on average by -0.40 points for USDT
and -0.12 for USDC; in the last common week by -1.76 and -0.58.

## 3. Vulnerability: ranking of bank funding, October 2026

Countries ordered by structural exposure to deposit substitution.

| Position | Country | Sight deposits over liabilities | Sight deposits (EUR bn) | Share of the area |
|---|---|---|---|---|
| 1 | Slovenia | 58.5% | 36 | 0.4% |
| 2 | Bulgaria | 51.9% | 66 | 0.8% |
| 3 | Latvia | 50.7% | 17 | 0.2% |
| 4 | Malta | 45.8% | 22 | 0.3% |
| 5 | Croatia | 48.6% | 49 | 0.6% |
| ... | | | | |
| 10 | Spain | 35.1% | 1,232 | 15.1% |
| ... | | | | |
| 12 | Italy | 30.9% | 1,298 | 15.9% |
| ... | | | | |
| 15 | Germany | 22.3% | 2,584 | 31.7% |
| ... | | | | |
| 19 | Netherlands | 11.5% | 366 | 4.5% |
| 20 | Luxembourg | 4.8% | 87 | 1.1% |
| 21 | France | 8.3% | 1,108 | 13.6% |

The top five hold 2.3% of the area's sight deposits;
Germany, Italy, Spain and France hold 76%.
The ranking orders the funding structure, not the probability that deposits leave.

## 4. Scenarios: how much each level weighs on funding, balance sheets of October 2026

| Scenario | Stablecoins held (USD bn) | Deposits to replace (EUR bn) | Sight deposits lost | Additional wholesale funding | Credit reduction (EUR bn) |
|---|---|---|---|---|---|
| Own estimate, minimum | 9.8 | 8.9 | 0.11% | 0.07% | 4.5 (from 1.5 to 10.8) |
| **Own estimate, centre** | 16.8 | 15.4 | 0.19% | 0.12% | 7.7 (from 2.7 to 18.6) |
| Own estimate, maximum | 25.4 | 23.1 | 0.28% | 0.18% | 11.6 (from 4.0 to 28.0) |
| Comparison: ESM assumption today (7.5%) | 18.2 | 16.6 | 0.20% | 0.13% | 8.3 (from 2.9 to 20.1) |
| ESM base 2030 | 143 | 130.5 | 1.6% | 1.0% | 65.3 (from 22.5 to 157.9) |
| ESM high 2030 | 300 | 273.8 | 3.4% | 2.2% | 136.9 (from 47.3 to 331.3) |
| ESM high 2030, 15% share | 600 | 547.6 | 6.7% | 4.4% | 273.8 (from 94.6 to 662.6) |

For the area to lose 5% of its sight deposits, USD 447 billion of stablecoins held by residents would
be needed, 27 times the centre of the own estimate.
In the ESM high scenario the required increase in wholesale funding is highest in
Latvia (+39%), Lithuania (+27%), Slovenia (+25%) and lowest in France (+0.7%).
It is an accounting calculation with full deposit substitution, not a forecast. The credit reduction
applies coefficients from ECB Working Paper 3199, estimated on individual banks, to national aggregates:
the first value is the uniform rule (0.5 euro of loans per euro of deposits), in brackets the
range between the low and the high coefficient. Continuous and threshold variants are in the application.

## 5. Two-channel map

| Quadrant | Countries |
|---|---|
| A - high deposits, low dollars | Slovenia, Bulgaria, Latvia, Croatia, Malta, Slovakia, Lithuania |
| B - both high | Greece, Cyprus, Spain |
| C - low deposits, high dollars | Germany, Finland, Belgium, Netherlands, Ireland, France, Luxembourg |
| D - both low | Estonia, Italy, Portugal, Austria |

In quadrant A the risk is the loss of deposits and credit; in C it is the weaker grip of domestic
monetary policy on banks already funded in dollars.

## 6. Individual banks (EBA 2025 transparency exercise)

85 euro area banks with all items, out of 99 in the exercise, in 18 countries out of 21;
data as at 30 June 2025. They cover 61% of the assets of resident banks and 69% of consolidated assets.
Retail share threshold among banks: 94.4% (21 banks above); among countries it was 92.0%.

| Credit reduction at the central level, covered countries | EUR billion | Per euro of outflow |
|---|---|---|
| **Module 6, bank-by-bank coefficients** | 6.7 | 0.45 |
| Module 5, uniform rule | 7.5 | 0.50 |
| Module 5, continuous variant | 3.6 | 0.24 |
| Module 5, threshold variant | 2.8 | 0.18 |
| Module 5, low coefficient | 2.6 | 0.17 |
| Module 5, high coefficient | 17.9 | 1.19 |

Public bank-level data, not supervisory data: the ordering of banks is not a judgement on their soundness.

## What this page does not say

- It does not measure how many stablecoins euro area residents hold: it estimates a range from a survey and stated assumptions.
- It does not estimate causal effects: the credit reduction applies published coefficients, as an order of magnitude.
- It is not an early warning system: the flag marks unusual values, it does not anticipate deposits.

## Data and update

| Module | Data as at | Last run | Details |
|---|---|---|---|
| 1 - Level | 27 November 2026 | succeeded | [06_module1_level.md](reports/06_module1_level.md) |
| 2 - Trend | week 16-22 November 2026 | succeeded | [03_module2_weekly_index.md](reports/03_module2_weekly_index.md) |
| 3 - Vulnerability | October 2026 | succeeded | [04_module3_ranking.md](reports/04_module3_ranking.md) |
| 4 - Scenarios | balance sheets of October 2026 | succeeded | [05_module4_scenarios.md](reports/05_module4_scenarios.md) |
| 5 - Credit and transmission | balance sheets of October 2026 | succeeded | [07_module5_credit.md](reports/07_module5_credit.md) |
| 6 - Individual banks | 30 June 2025 | succeeded | [12_refinements_language_banks.md](reports/12_refinements_language_banks.md) |

Last full update: 27 November 2026, mode: online.
Definitions, sources, limits and discarded methods: [SPEC.md](SPEC.md).

---

**What this adds to the final programme**: the results of all modules on a single page, always
aligned with the data because it is generated by the code and not written by hand.
