# 04 - Module 3: ranking of countries by bank funding structure

Module 3 of [SPEC.md](../SPEC.md) asks for a ranking of the 21 euro area countries by
the structural exposure of bank funding to deposit substitution by stablecoins, with the
components that explain each country's position.

Sections 1 and 2 were committed **before** any share or ranking was calculated. At that
point I knew only: the absolute values for three countries in the latest month (from the
check in report 02) and the share of dollar liabilities for the 13 BIS countries, which
enters here only in one variant.

## 1. Composition table (SPEC criteria a and b)

Source: ECB Data Portal, BSI dataset, end-of-month stocks in EUR millions, monetary
financial institutions excluding the European System of Central Banks.

Aggregate liabilities break down into six items:

    total liabilities = deposits of euro area residents + money market fund shares
                      + debt securities issued + capital and reserves
                      + liabilities to non-euro area residents + other liabilities

Deposits of euro area residents are in turn broken down by counterparty. The shares in
the table, all as a ratio to total liabilities, are:

| Item | Formula with BSI codes |
|---|---|
| Sight deposits, households | `L21` sector 2250 |
| Other deposits, households | `L20` sector 2250 minus `L21` sector 2250 |
| Sight deposits, firms | `L21` sector 2240 |
| Other deposits, firms | `L20` sector 2240 minus `L21` sector 2240 |
| Other deposits of non-MFIs | `L20` sector 2300 minus households minus firms |
| Central government deposits | `L20` sector 0000 minus sector 2300 minus sector 1000 |
| Deposits from MFIs (interbank, including the central bank) | `L20` sector 1000 |
| Money market fund shares | `L30` |
| Debt securities issued | `L40` |
| Capital and reserves | `L60` |
| External liabilities | `LXG` |
| Other liabilities | `L70` |
| Residual | total `T00` minus the sum of the items |

Declared tolerance: the residual must stay within 0.5% of total liabilities in absolute
value. Where it does not, the report explains why, country by country.

## 2. Indicator and ranking (SPEC criterion c), set before the data

### 2.1 What it must measure

The reference mechanism is that of ECB Working Paper 3199: funds move from retail
deposits to stablecoins, the bank has to replace them with wholesale funding, and its
capacity to intermediate suffers. A banking system is structurally more exposed the more
its funding consists of the type of deposits that can migrate, the less those deposits
are fixed-term, and the more its funding depends on them relative to wholesale channels.

### 2.2 Three components

| Component | Formula | Why | Direction |
|---|---|---|---|
| C1 - Amount at stake | (sight deposits of households + sight deposits of firms) / total liabilities | This is the funding that can move without notice and without penalties to a payment instrument | higher = more exposed |
| C2 - Mobility | sight deposits of households and firms / total deposits of households and firms | For the same amount of deposits, sight deposits are less stable than term deposits | higher = more exposed |
| C3 - Dependence | total deposits of households and firms / (total deposits of households and firms + debt securities issued + deposits from MFIs) | A system funded almost only by customer deposits has fewer wholesale channels already active to replace them | higher = more exposed |

### 2.3 Main indicator

Each month, each component is standardised across the countries with data in that month
(value minus mean, divided by the standard deviation). The indicator is:

    I = 0.50 × z(C1) + 0.25 × z(C2) + 0.25 × z(C3)

C1 carries half the weight because it measures directly how much funding is of the type
that can migrate; C2 and C3 qualify how fast that loss would be and how hard it would be
to offset, and share the other half. The ranking orders countries by decreasing I.
The indicator is relative: it says who is more exposed than the others in that month,
not by how much in absolute terms. For developments over time, the three components,
which are shares, should be read.

### 2.4 Alternative weightings

| Variant | Definition | What it tests |
|---|---|---|
| A1 - Equal weights | one third each | Whether the double weight of C1 decides the order |
| A2 - Amount only | C1 only | How much C2 and C3 add |
| A3 - Households only | C1 and C2 calculated with household deposits only, same weights | Whether firms change the order |
| A4 - Ranks | weighted average of ranks instead of standardised values, same weights | Whether a few extreme values decide the order |
| A5 - With currency channel | 0.40 C1 + 0.20 C2 + 0.20 C3 + 0.20 C4, where C4 = dollar liabilities / total liabilities (BIS) | Whether dollar funding, which WP 3199 identifies as a distinct channel, changes the order. Only 13 countries, latest available quarter |

Stability measures reported for each variant: Spearman rank correlation with the main
ranking, number of countries that move by more than three positions, countries in common
among the top five.

### 2.5 What the ranking is not

It orders countries by funding structure. It is not a probability that deposits will
leave, it is not a judgement on the soundness of banks, and it does not take account of
liquidity, excess capital or access to refinancing.

## 3. Results

Calculated on 2026-11-24 on September 2026 data, the latest month published.

### 3.1 The ranking

| Rank | Country | Indicator | C1 amount (%) | C2 mobility (%) | C3 dependence (%) | Sight deposits (EUR bn) | Share of the area (%) | Position across variants |
|---|---|---|---|---|---|---|---|---|
| 1 | Slovenia | +1.40 | 59.0 | 84.2 | 90.8 | 36 | 0.4 | 1-1 |
| 2 | Latvia | +1.03 | 50.3 | 74.8 | 95.2 | 17 | 0.2 | 2-6 |
| 3 | Bulgaria | +1.02 | 51.5 | 76.0 | 89.5 | 65 | 0.8 | 2-5 |
| 4 | Malta | +0.94 | 45.6 | 82.3 | 89.9 | 22 | 0.3 | 2-6 |
| 5 | Croatia | +0.92 | 48.6 | 75.7 | 89.9 | 49 | 0.6 | 3-5 |
| 6 | Greece | +0.83 | 47.8 | 77.1 | 82.4 | 174 | 2.1 | 4-6 |
| 7 | Lithuania | +0.62 | 37.4 | 78.2 | 90.9 | 41 | 0.5 | 6-9 |
| 8 | Cyprus | +0.53 | 40.6 | 66.4 | 90.7 | 31 | 0.4 | 7-10 |
| 9 | Slovakia | +0.38 | 39.4 | 71.1 | 75.7 | 55 | 0.7 | 8-10 |
| 10 | Spain | +0.35 | 36.2 | 82.8 | 67.0 | 1,255 | 15.3 | 9-10 |
| 11 | Estonia | +0.17 | 35.4 | 59.9 | 83.6 | 18 | 0.2 | 11-11 |
| 12 | Italy | 0.00 | 30.7 | 73.8 | 64.8 | 1,296 | 15.8 | 12-12 |
| 13 | Portugal | -0.34 | 28.1 | 47.7 | 77.3 | 138 | 1.7 | 13-14 |
| 14 | Austria | -0.44 | 25.5 | 63.3 | 56.3 | 274 | 3.4 | 13-15 |
| 15 | Germany | -0.52 | 21.4 | 65.4 | 57.3 | 2,566 | 31.4 | 15-16 |
| 16 | Ireland | -0.65 | 11.0 | 83.3 | 50.8 | 231 | 2.8 | 14-19 |
| 17 | Finland | -0.81 | 18.0 | 69.6 | 38.2 | 122 | 1.5 | 16-17 |
| 18 | Belgium | -1.11 | 14.1 | 33.6 | 70.0 | 210 | 2.6 | 17-18 |
| 19 | Netherlands | -1.31 | 11.4 | 32.8 | 61.8 | 367 | 4.5 | 18-20 |
| 20 | Luxembourg | -1.35 | 4.9 | 65.9 | 33.6 | 87 | 1.1 | 19-21 |
| 21 | France | -1.66 | 8.5 | 39.1 | 34.3 | 1,126 | 13.8 | 20-21 |

"Sight deposits" are those of households and firms together; "share of the area" is
their portion of the EUR 8,180 billion of the 21 countries. The last column gives the
country's best and worst position across the main indicator and variants A1-A4.

![Ranking](figures/04_ranking.png)

### 3.2 How to read it: three groups

- **At the top, small systems funded almost entirely by sight deposits.** In Slovenia
  59% of banks' liabilities consist of sight deposits of households and firms, and
  91% of funding from customers and markets is deposits. Latvia, Bulgaria, Malta,
  Croatia and Greece follow, all with C1 between 46% and 52%.
- **In the middle, Spain and Italy.** They are in tenth and twelfth place, but they
  matter much more: on their own they hold 31% of the area's sight deposits.
- **At the bottom, the systems that fund themselves on markets and from abroad.** In
  France, Luxembourg, the Netherlands and Belgium customer sight deposits are between 5%
  and 14% of liabilities.

**The ranking says where the structure is most exposed, not where the money is.** The
top nine countries together hold 6% of the area's sight deposits; Germany, Italy, Spain
and France hold 76%. An analyst looking at the stability of an individual national
system should read the first column; one looking at the area aggregate should read the
last two.

### 3.3 What lies behind each position

Composition of liabilities in September 2026, as a percentage of the total. Full table
for all months in `data/processed/m3_composition.csv`.

| Country | Sight deposits of households and firms | Other deposits of households and firms | Other deposits (financial, government) | Deposits from banks | Securities issued | External liabilities | Capital | Other |
|---|---|---|---|---|---|---|---|---|
| Slovenia | 59.0 | 11.1 | 4.2 | 1.9 | 5.1 | 1.7 | 13.5 | 3.4 |
| Latvia | 50.3 | 16.9 | 8.1 | 1.8 | 1.5 | 7.7 | 11.8 | 1.8 |
| Bulgaria | 51.5 | 16.3 | 3.9 | 6.1 | 1.8 | 3.2 | 14.0 | 3.2 |
| Malta | 45.6 | 9.8 | 10.4 | 3.3 | 2.9 | 15.2 | 10.9 | 2.0 |
| Croatia | 48.6 | 15.6 | 10.4 | 3.7 | 3.5 | 2.9 | 11.6 | 3.8 |
| Greece | 47.8 | 14.2 | 6.2 | 5.7 | 7.6 | 4.4 | 10.5 | 3.7 |
| Lithuania | 37.4 | 10.4 | 7.5 | 2.8 | 2.0 | 7.1 | 7.8 | 24.9 |
| Cyprus | 40.6 | 20.6 | 11.7 | 4.8 | 1.5 | 7.5 | 10.6 | 2.8 |
| Slovakia | 39.4 | 16.0 | 7.0 | 5.6 | 12.2 | 3.9 | 12.4 | 3.5 |
| Spain | 36.2 | 7.5 | 13.3 | 12.1 | 9.4 | 5.9 | 8.3 | 7.2 |
| Estonia | 35.4 | 23.7 | 8.7 | 3.9 | 7.7 | 6.9 | 11.7 | 2.0 |
| Italy | 30.7 | 10.9 | 10.6 | 14.6 | 8.0 | 1.8 | 9.8 | 13.6 |
| Portugal | 28.1 | 30.8 | 6.4 | 11.8 | 5.5 | 3.1 | 10.1 | 4.1 |
| Austria | 25.5 | 14.8 | 7.3 | 12.9 | 18.4 | 3.2 | 11.2 | 6.8 |
| Germany | 21.4 | 11.3 | 7.9 | 12.5 | 11.9 | 8.5 | 6.6 | 19.8 |
| Ireland | 11.0 | 2.2 | 6.2 | 10.8 | 2.0 | 43.2 | 4.5 | 20.1 |
| Finland | 18.0 | 7.9 | 8.1 | 12.8 | 29.1 | 9.3 | 6.4 | 8.3 |
| Belgium | 14.1 | 27.9 | 7.2 | 10.2 | 7.8 | 22.2 | 6.2 | 4.5 |
| Netherlands | 11.4 | 23.3 | 8.5 | 9.3 | 12.2 | 15.9 | 5.9 | 13.6 |
| Luxembourg | 4.9 | 2.5 | 18.1 | 12.0 | 2.6 | 41.1 | 4.5 | 14.3 |
| France | 8.5 | 13.2 | 6.2 | 28.8 | 12.6 | 12.6 | 6.3 | 11.9 |

"Other" adds together other liabilities and money market fund shares held by euro area
residents. Some examples of how to read the table: Portugal is mid-table because it has
a lot of deposits, but more than half of them are fixed-term; Finland is near the bottom
because 29% of its liabilities are securities issued; Ireland's deposits are almost all
sight deposits, but they weigh little in liabilities dominated by external liabilities.

### 3.4 How stable the order is

| Variant | Rank correlation with the main ranking | Countries moving by more than 3 positions | Largest shift | Top five in common |
|---|---|---|---|---|
| A1 - Equal weights | 0.99 | 0 | 2 | 5 of 5 |
| A2 - Amount only | 0.98 | 0 | 3 | 4 of 5 |
| A3 - Households only | 0.97 | 1 | 4 | 4 of 5 |
| A4 - Ranks | 0.99 | 0 | 2 | 5 of 5 |
| A5 - With currency channel (13 countries) | 0.94 | 0 | 3 | 4 of 5 |

The order does not depend on the weights chosen. Slovenia is first in all variants;
Italy and Estonia never change position; the largest shift is Latvia's, which falls from
second to sixth place when only households are considered, because a significant part of
its sight deposits belongs to firms. The three components are correlated with one
another (C1 and C3: 0.88), which explains the stability: they measure aspects of the
same funding model.

### 3.5 Developments over time

![C1 over time](figures/04_c1_over_time.png)

- **The amount at stake has grown almost everywhere.** Summing across countries, sight
  deposits of households and firms rose from 15.6% to 18.2% of liabilities between
  September 2016 and September 2026, and from 54.5% to 59.3% of customer deposits. The
  increase is much stronger at the top of the ranking: Slovenia from 36% to 59%, Greece
  from 19% to 48%, Cyprus from 13% to 41%, Croatia from 23% to 49%.
- **The order is stable over one year and changes over ten.** The rank correlation with
  today's ranking is 1.00 at one year, 0.92 at five years and 0.75 at ten.
- **Who rose and who fell in ten years**: Cyprus from 16th to 8th place, Greece
  from 11th to 6th, Slovenia from 5th to 1st; Estonia from 2nd to 11th, Lithuania from
  1st to 7th, Slovakia from 3rd to 9th, Germany from 10th to 15th.

The monthly series of the indicator, components and position for each country since 2003
is in `data/processed/m3_index.csv`.

### 3.6 The second channel: dollar funding

ECB Working Paper 3199 identifies a distinct channel for foreign-currency stablecoins:
banks' dependence on wholesale funding in foreign currency. For the 13 countries covered
by the BIS, as at the second quarter of 2026:

| Country | Position without currency channel | Position with currency channel (A5) | C4: dollar liabilities (%) |
|---|---|---|---|
| Greece | 1 | 1 | 5.4 |
| Cyprus | 2 | 2 | 10.4 |
| Spain | 3 | 3 | 9.4 |
| Italy | 4 | 4 | 2.8 |
| Germany | 7 | 5 | 9.4 |
| Portugal | 5 | 6 | 2.0 |
| Ireland | 8 | 7 | 14.8 |
| Austria | 6 | 8 | 4.2 |
| Luxembourg | 12 | 9 | 27.2 |
| Finland | 9 | 10 | 9.3 |
| Belgium | 10 | 11 | 8.2 |
| Netherlands | 11 | 12 | 14.3 |
| France | 13 | 13 | 14.9 |

**The two channels point to different countries.** Across the 13 countries the rank
correlation between the amount of sight deposits (C1) and the share of dollar
liabilities (C4) is -0.66: those most exposed to the substitution of retail deposits are
less dependent on dollar funding, and vice versa. Luxembourg, France, Ireland and the
Netherlands are at the bottom of the main ranking and at the top of the dollar funding
ranking. Combining the two channels into a single number makes them offset each other;
for this reason A5 remains a variant and the two should be read as two separate maps.

### 3.7 Reconciliation of the composition table

- 5,387 country-month observations, from 2003 (later for countries that joined
  afterwards) to September 2026.
- The residual between total liabilities and the sum of the items is zero, up to
  numerical rounding, in all observations. None is outside the 0.5% tolerance.
- On the first run the residual was 35% for Ireland and 28% for Luxembourg.
  Cause: I had taken money market fund shares held by all holders, whereas those held by
  non-residents are already included in external liabilities. With only the
  shares held by euro area residents the table reconciles. The ranking does not use this
  item and has not changed.
- For Lithuania the money market fund shares series does not exist and is set to zero;
  the table still reconciles.

### 3.8 SPEC completion criteria

| Criterion | Status |
|---|---|
| (a) Country-by-month table with the composition shares and written formulas | Done: section 1 and `m3_composition.csv` |
| (b) The shares sum to the total within the tolerance, or the residual is explained | Done: zero residual after the correction described in 3.7 |
| (c) Indicator with components and weights set before the data, and alternative weightings | Done: section 2 committed first; five variants in 3.4 |
| (d) Stated that it orders structure, not the probability of outflow | Done: sections 2.5 and 4 |

## 4. Limits

- **It orders funding structure, not the probability that deposits will leave.** It
  does not consider available liquidity, excess capital, deposit insurance, the rates
  offered or access to central bank refinancing.
- **It is relative.** The indicator says who is more exposed than the others in that
  month. If all countries deteriorate together, it does not move: this is why the
  components, which are shares, should also be looked at.
- **The spread of stablecoins by country is not known.** The ranking says where a given
  loss of deposits would weigh most, not where the loss is most likely.
- **Country-level aggregate data.** Banks within each country differ; a national average
  can hide individual institutions that are very exposed or hardly exposed at all.
- **The deposits are those of euro area residents with banks in the country**, not only
  those of national residents. In financial centres the difference matters.
- **Deposits from MFIs include the central bank**, so Eurosystem refinancing enters C3
  as wholesale funding.
- **The currency channel covers 13 of the 21 countries** and is quarterly.
- **The direction of C3 is a choice.** Here a system with little wholesale funding is
  considered more exposed because it has fewer channels already active; the opposite can
  also be argued. Variant A2, which does not use C3, gives almost the same order.

## 5. What could not be done

- **The currency channel for the eight countries that do not report to the BIS**
  (Bulgaria, Estonia, Croatia, Lithuania, Latvia, Malta, Slovenia, Slovakia): they
  include six of the top seven in the ranking. The ECB's consolidated banking data are
  the next source to try.
- **Distinguishing insured from uninsured deposits**: the BSI dataset does not allow it.
- **Going below the national level**: this would require bank-level supervisory data,
  which are not public.

## 6. How to use it

```bash
.venv/bin/python src/module3_ranking.py            # downloads the ECB series and recalculates
.venv/bin/python src/module3_ranking.py --offline  # recalculates from the files already downloaded
```

| File | Contents |
|---|---|
| `data/processed/m3_ranking_latest.csv` | Ranking for the latest month with components, variants and comparison at 1, 5 and 10 years |
| `data/processed/m3_index.csv` | Indicator, components and position by country and month since 2003 |
| `data/processed/m3_composition.csv` | Composition of liabilities by country and month |
| `data/processed/m3_variant_usd_funding.csv` | Variant with dollar funding, 13 countries |
| `data/processed/m3_summary.json` | Ranking, stability and checks in a single file |

---

**What this adds to the final programme**: the ranking of the 21 euro area countries by
the structural exposure of their funding, stable across five different weightings, with
monthly series since 2003; the accounting basis for module 4 (EUR 8,180 billion of sight
deposits, broken down by country); and a non-obvious result: the retail deposit channel
and the dollar funding channel hit different countries.
