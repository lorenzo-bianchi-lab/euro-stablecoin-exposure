# 08 - Own level and allocation by country

So far module 1 has used a level that is not its own: the ESM assumption. This report
tries three independent estimates of the value of dollar stablecoins held by euro area
residents (B1, B2, B3) and a data-based rule for allocation across countries (B4).

Sections 1 and 2 were committed **before** the results were calculated. At that point I
had seen chart B of the ECB box, because it is needed to define the bands, but I had
not calculated any total.

## 1. Criterion (set before the results)

- The **central** values of B1 (households variant), B2 and B3 are compared, in EUR
  billion.
- If at least two lie within a factor of 3 of each other, module 1 publishes its **own
  range** alongside the ESM assumption: from the lowest to the highest of the central
  values that agree.
- Otherwise module 1 publishes only the **minimum of B1** (households variant),
  declaring it as a floor.
- A route that does not produce a number counts as absent, not as disagreement.

## 2. Method, set before the results

### 2.1 B1 - Bottom-up, with the ECB survey

Source: box in the ECB Economic Bulletin 7/2026, chart B, panel b (distribution of
amounts among stablecoin holders, November 2025). The ECB does not publish the chart
data: the percentages of the nine bands are read from the image, by measuring the
height of the bars in pixels.

    total = units × share of holders × average amount × dollar share

| Element | Minimum | Central | Maximum |
|---|---|---|---|
| Amount for each band | lower end | midpoint | upper end |
| First band (up to EUR 99) | EUR 0 | EUR 50 | EUR 99 |
| Last band (EUR 10,000 or more) | EUR 10,000 | EUR 15,000 | EUR 20,000 |
| Dollar share | 60% | 70% | 79% |

- **Share of holders**: 5%, from the text of the box (August 2025).
- **Dollar share**: from the holder shares in the box (USDT 17%, USDC 12%, EURC
  10%, others less than 9%). Minimum: the "others" all non-dollar, 29/48. Maximum:
  all in dollars, 38/48. Central: half and half. These are shares of people used as
  shares of value: a declared approximation.
- **Units**, two variants: households in the 21 countries (Eurostat) and individuals
  aged 18 or over (Eurostat). The survey question concerns "you or a member of your
  household": the households variant is the one consistent with the question and is the
  one used in the criterion.
- The 11 survey countries are assumed to represent all 21.

### 2.2 B2 - Customer reserves at exchanges

    total = sum over exchanges of (USDT + USDC held for customers × share of
            euro area users)

- Reserves: the proof of reserves published by the exchanges, or the exchange
  transparency data aggregated by DefiLlama, if they can be reached free of charge.
- Share of euro area users: the best free indicator of users' origin that is actually
  downloadable. If none exists by country, route B2 does not produce a number, and this
  is stated.
- It measures only the stablecoins left in custody at exchanges, not those in
  self-custody wallets: it is by construction a partial estimate.

### 2.3 B3 - National data

- Italy: the OAM's quarterly statistics on crypto-asset service providers. If they give
  the value in stablecoins, that value is used. If they give only the total for
  crypto-assets, the share of stablecoins in the crypto market indicated by ECB Working
  Paper 3199 (about 10%) and the dollar share from B1 are applied.
- From the Italian figure to the euro area: divide by Italy's share of the area's
  crypto-asset owners (B4 data) or, if these are missing, by its share of the
  population.
- Similar sources are sought in the other countries; if they exist they are used in the
  same way and the dispersion is reported.

### 2.4 B4 - Rule R3 for allocation across countries

- The share of crypto-asset owners by country is sought: ECB SPACE survey,
  Eurobarometer, ESMA, national central banks.
- **If it exists for at least 15 of the 21 countries**, rule R3 is added to module 4:
  the outflow is distributed in proportion to the number of owners, i.e. share times
  population aged 18 or over. The missing countries are assigned the simple average of
  the available shares, and are marked.
- R3 is compared with R1 (pro rata to deposits) and R2 (per capita) in scenario S2:
  rank correlation and the countries that change most.
- R3 allocates an assumed total. It is not an estimate of holdings by country: owning
  crypto-assets is not the same as owning stablecoins.

## 3. Results

Calculated on 2026-11-25.

### 3.1 Verdict

| Estimate | Central value (EUR bn) | Outcome |
|---|---|---|
| B1 - Bottom-up, ECB survey (households) | **15.4** | calculated |
| B2 - Customer reserves at exchanges | no number | route failed |
| B3 - National data (Italy) | **0.9** | calculated |

B1 and B3 are a factor of 17 apart, well beyond the factor of 3 allowed, and B2 is
missing. **The criterion is not met: module 1 publishes as its own only the minimum of
B1, EUR 8.9 billion**, alongside the ESM assumption. It does not publish its own range.

One thing should be said even though it does not enter the criterion: the central value
of B1 (15.4) is less than 10% away from the ESM level at the end of November 2025 (EUR
16.9 billion). The ESM is not one of the three estimates to be compared, and the
criterion has not been changed; but the two sources that start from the euro area, the
ECB survey and the ESM assumption, point to the same order of magnitude.

### 3.2 B1 - Bottom-up, with the ECB survey

Percentages read from chart B, panel b (reading error about 0.1 points; the sum is 99.4
and is rescaled to 100):

| Amount band | Holders |
|---|---|
| up to EUR 99 | 19.9% |
| EUR 100-299 | 17.2% |
| EUR 300-599 | 14.5% |
| EUR 600-999 | 10.1% |
| EUR 1,000-1,499 | 6.9% |
| EUR 1,500-2,499 | 5.1% |
| EUR 2,500-4,999 | 8.9% |
| EUR 5,000-9,999 | 7.6% |
| EUR 10,000 or more | 9.3% |

Average amount per holder: EUR 1,810 at the minimum, 2,693 at the centre, 3,576 at the
maximum.

| Variant | Holders | Minimum (EUR bn) | Central (EUR bn) | Maximum (EUR bn) |
|---|---|---|---|---|
| **Households** (163.5 million, 5% hold) | 8.2 million | **8.9** | **15.4** | **23.1** |
| Individuals aged 18 or over (296.4 million) | 14.8 million | 16.2 | 27.9 | 42.0 |

These are amounts in dollar stablecoins, i.e. after the correction for the dollar share
(60%, 70%, 79%). Without the correction, for all stablecoins, the households variant
gives 14.8 - 22.0 - 29.2.

Two things weigh more than the others:

- **The last band accounts for 52% of the central total.** 9.3% of holders have EUR
  10,000 or more, and it is not known how much more: between the assumption of EUR
  10,000 and that of EUR 20,000 per head, the total changes by a third.
- **The choice between households and individuals doubles the result.** The question
  is put to one person but concerns the household; the households variant is the
  consistent one, while the individuals variant counts the same household several times.

### 3.3 B2 - Customer reserves at exchanges: route failed

**Reason, in two lines**: customer balances in USDT and USDC are public for some
exchanges, but there is no free, downloadable indicator of users' country of origin.
Without it the reserves cannot be attributed to the euro area.

What could be read:

| Exchange | Date | USDT (USD bn) | USDC (USD bn) | Verification |
|---|---|---|---|---|
| Binance | 12 Nov 2026 | 24.3 | 5.6 | read at source |
| KuCoin | 31 Oct 2026 | 0.8 | 0.1 | read at source |
| OKX | 1 Nov 2026 | 8.0 | 1.8 | from the search, not rechecked |
| Bybit | 27 Oct 2026 | 3.3 | 0.1 | from the search, not rechecked |
| Bitget | 12 Nov 2026 | 0.8 | 0.2 | from the search, not rechecked |
| Gate | 18 Oct 2026 | 0.8 | n.a. | from the search, not rechecked |

- Total: USD 45.8 billion, of which 30.8 verified at source. This is about 19% of the
  circulation of USDT and USDC.
- Kraken publishes only coverage ratios, without amounts. Coinbase does not publish
  balances by token. These are two of the most used exchanges in Europe.
- Users' origin: Similarweb's free page gives the top five countries by traffic, can be
  read only from a browser and stopped responding after two sites. For binance.com no
  euro area country is in the top five (the fifth is Turkey, with 4.4%); for
  bitvavo.com over 90% of the traffic comes from the euro area. The Similarweb and
  Cloudflare Radar APIs require access.

The figure remains useful as an order of magnitude: all the customers of these six
exchanges, worldwide, hold USD 46 billion of USDT and USDC in custody.

### 3.4 B3 - National data

**Italy, OAM** (third quarter of 2025, the last data collection before the transition to
MiCAR): 1,245,082 customers with crypto-assets worth EUR 2.16 billion, at 85 of the 125
registered service providers. No breakdown by type of crypto-asset.

| Step | Value |
|---|---|
| Crypto-assets of Italian customers | EUR 2.16 bn |
| Stablecoin share applied (WP 3199) | 10% → EUR 0.22 bn |
| Dollar share (central) | 70% → EUR 0.15 bn |
| Italy's share of the area's owners (SPACE 2024) | 16.7% |
| **Euro area, central** | **EUR 0.90 bn** (from 0.78 to 1.02) |

**Netherlands, DNB** (end of June 2026): households hold EUR 3.2 billion of
crypto-assets at Dutch providers, and stablecoins are **less than 1%** of this. It is a
measurement, not an assumption. Scaled up to the euro area it gives a ceiling of EUR
0.72 billion; and if the Dutch share also applied to Italy, the Italian estimate would
fall from 0.90 to 0.09.

In the other countries the search found no official statistics on the value held
(Austria publishes only the share of households with crypto-assets).

**Why B3 is seventeen times lower than B1.** It measures something else: the
crypto-assets held at service providers registered in the country. It leaves out the
foreign exchanges, through which most stablecoin trading passes, and self-custody
wallets. Indeed, the Dutch figure shows that stablecoins are almost absent at national
providers. B3 does not contradict B1: it shows that the available national statistics
do not see stablecoins.

### 3.5 B4 - Rule R3: it exists, and has been added

**Source**: ECB, SPACE 2024 survey, chart 41: share of adults who own crypto-assets, by
country. It covers **20 of the 21 countries**; Bulgaria, which joined the area in 2026,
is missing and is assigned the simple average (10.8%). The threshold of 15 countries is
exceeded. The area average reconstructed with these weights is 8.9%, against the 8.8%
published by the ECB.

ESM high 2030 scenario (USD 300 billion), effect on funding in points of liabilities:

| Country | Crypto-asset owners | R1 pro rata to deposits | R2 per capita | R3 by owners |
|---|---|---|---|---|
| Bulgaria | 10.8% (imputed) | 1.66 | 3.74 | 4.57 |
| Slovenia | 15.2% | 1.91 | 2.58 | 4.41 |
| Croatia | 12.6% | 1.57 | 2.85 | 4.08 |
| Latvia | 7.7% | 1.63 | 4.08 | 3.51 |
| Slovakia | 10.8% | 1.27 | 2.85 | 3.42 |
| Greece | 13.7% | 1.54 | 2.09 | 3.29 |
| Lithuania | 13.1% | 1.21 | 1.94 | 2.86 |
| Portugal | 12.0% | 0.91 | 1.71 | 2.37 |
| Estonia | 7.4% | 1.14 | 2.01 | 1.64 |
| Cyprus | 13.1% | 1.31 | 0.95 | 1.40 |
| Spain | 9.4% | 1.17 | 1.04 | 1.13 |
| Malta | 10.5% | 1.47 | 0.86 | 1.05 |
| Italy | 8.8% | 0.99 | 1.03 | 1.05 |
| Austria | 13.0% | 0.82 | 0.63 | 0.92 |
| Belgium | 11.9% | 0.46 | 0.59 | 0.77 |
| Finland | 11.2% | 0.58 | 0.61 | 0.77 |
| France | 9.3% | 0.27 | 0.38 | 0.39 |
| Germany | 5.9% | 0.69 | 0.51 | 0.34 |
| Ireland | 13.1% | 0.35 | 0.19 | 0.26 |
| Netherlands | 5.5% | 0.37 | 0.41 | 0.26 |
| Luxembourg | 11.9% | 0.16 | 0.03 | 0.04 |

- **The order changes little**: rank correlation 0.92 with R1 and 0.97 with R2. Small
  deposit-funded systems remain at the top: Bulgaria, Slovenia, Croatia, Latvia,
  Slovakia.
- **The dispersion increases**: with R3, Bulgaria, Slovenia and Croatia would lose
  between 7.5% and 9% of their sight deposits, against a uniform 3.2% under R1.
- **Germany and the Netherlands move down**: they have the lowest owner shares in the
  area (5.9% and 5.5%). With R3 Germany receives 15% of the outflow, against 31% with R1.
- **On credit**: in the ESM high scenario the threshold variant gives a loan reduction
  of EUR 81.5 billion with R3, against 58.2 with R1 and 72.3 with R2, because R3 shifts
  the outflow towards the countries with the high coefficient.

R3 is now available in module 4, in module 5 and in the dashboard.

## 4. Limitations

- **B1 depends on a chart read off the image by machine, on an open-ended last band and
  on the choice between households and individuals.** The range 8.9 - 23.1 covers the
  first two uncertainties, not the third.
- **B1 extends to 21 countries a survey of 11**, which the ECB describes as
  experimental, and uses shares of people as shares of value for the dollar part.
- **B3 rests on a strong assumption** (stablecoins equal to 10% of crypto-assets) that
  the only measured figure, the Dutch one, contradicts.
- **B2 does not exist.** The programme has no estimate based on balances at exchanges.
- **R3 uses the ownership of crypto-assets, not of stablecoins**, surveyed in 2023-2024,
  and imputes Bulgaria. It allocates an assumed total: it does not estimate holdings by
  country.
- **The published minimum is not a measurement.** It is the lowest result of a
  triangulation in which only one route produced a plausible value.

## 5. What could not be done

- **B2**: there is no free, downloadable indicator of users' origin by country. Access
  to Similarweb or Cloudflare Radar would be needed.
- **Read the exact data of chart B**: the ECB does not publish them; the percentages are
  measured on the image.
- **Find national data on stablecoins beyond the Dutch figures**: the OAM does not
  distinguish them and has ended its data collection; for France, Germany, Spain and the
  others no official statistics on the value held came to light.
- **Recheck at source the balances of OKX, Bybit, Bitget and Gate**: their pages do not
  respond to automated requests. They are reported as read from the search.
- **Obtain the owner share for Bulgaria** in the SPACE survey: it exists in the 2023
  Eurobarometer, which however measures ownership over the past two years and was not
  mixed with SPACE.

## 6. How to use it

```bash
.venv/bin/python src/level_own.py            # recalculates B1, B3 and the verdict
.venv/bin/python src/module4_scenarios.py    # scenarios with R1, R2 and R3
```

The external figures for B2 and B3 are in `data/raw/level_own_inputs.json`, each with
its source and verification status; the SPACE shares are in
`data/raw/r3_crypto_ownership.json`.

---

**What this adds to the final programme**: a first own estimate of the level,
independent of the ESM (EUR 15.4 billion at the centre, 8.9 as the published minimum),
which falls within the same order of magnitude as the external assumption; evidence
that exchange reserves and national statistics are not enough today to confirm it; and
a third rule for allocation across countries, based on an ECB survey rather than on an
assumption.
