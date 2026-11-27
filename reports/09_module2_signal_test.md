# 09 - Module 2: predictive content and flagging rule

The module 2 index describes trading in euro. This report checks whether it says anything
in advance about bank deposits, and adds an explicit flagging rule to it.

Sections 1 and 2 were committed **before** the test was run.

## 1. Question and criterion (set before the results)

**Question**: do monthly changes in the volumes of stablecoins traded against the euro
help to predict the change in euro area households' sight deposits, compared with a model
that uses only the lags of deposits?

**Criterion**: the answer is yes only if both conditions hold in the main
specification:

1. in sample, the volume lag is significant at 5%;
2. out of sample, the mean squared forecast error of the model with volumes is lower
   than that of the model with lags only.

In any other case the answer is no, and it is reported as such. The result is published
even if null.

## 2. Method, set before the results

### 2.1 Data

- **Deposits**: households' sight deposits, sum of the 21 countries (BSI `L21`, sector
  2250), end-of-month stocks, not seasonally adjusted. Last month: September 2026.
- **Volumes**: monthly sum of the volumes of USDT and USDC traded against the euro, in
  stablecoin units, from the module 2 archive. The long panel (without Kraken and
  Gemini) is used because it starts in January 2023; with Kraken there would be 21 months.
- **Sample**: from February 2023 to September 2026, 44 monthly changes.

### 2.2 Main specification

    y(t) = monthly percentage change in households' sight deposits
    x(t) = monthly percentage change in volumes against the euro   (log differences)

    base model:      y(t) = a + b·y(t-1) + error
    extended model:  y(t) = a + b·y(t-1) + c·x(t-1) + error

- Condition 1: test on c with heteroskedasticity-robust standard errors.
- Condition 2: one-month-ahead forecasts with an expanding window over the last 12 months;
  ratio between the mean squared errors of the two models.

### 2.3 Variants (reported, they do not decide the outcome)

- Two lags for both variables.
- Twelve-month changes instead of monthly changes, to neutralise seasonality.
- In place of volumes: the EUR share (index), the volumes of USDT only and of USDC only.
- There are seven tests: with a 5% threshold, the probability that at least one turns out
  significant by chance is about one third. For this reason only the main specification
  decides.

### 2.4 Limitations known at the outset

- 44 observations are few: the test has little power, so a null outcome does not
  prove that the link does not exist.
- Volumes against the euro are a tiny fraction of deposits (about USD 1 billion a week
  against more than EUR 5,000 billion of households' sight deposits): a mechanical link
  would be surprising.
- The long panel excludes Kraken, which accounts for one third of recent volumes.

### 2.5 Flagging rule

For each of the four series, every week:

    share gap   = (EUR share - mean of the previous 52 weeks) / standard deviation
    volume gap  = (volume against EUR - mean of the previous 52 weeks) / standard deviation

The window is the 52 weeks preceding the observed week, which is excluded.

| Status | Condition |
|---|---|
| **Flag** | Both gaps above 2 in absolute value and with the same sign |
| **To be checked** | Only one of the two above 2, or both above 2 but with opposite signs |
| None | Otherwise |

The double requirement serves to distinguish a movement of the euro from a movement of the
other currencies, which shifts the share without any change in euro volumes. The rule
marks unusual values. If the test of section 1 is null, it should not be read as a
leading signal of deposit outflows.

The report gives the number of times the rule would have been triggered over the
available history.

## 3. Results

Computed on 2026-11-25.

### 3.1 Test outcome: no

**Monthly changes in the volumes of stablecoins against the euro do not help to predict
the change in households' sight deposits.** Neither of the two conditions is
met.

| | Main specification |
|---|---|
| Observations | 43, from March 2023 to September 2026 |
| Coefficient of the volume lag | 0.0049 (standard error 0.0048) |
| Significance (condition 1) | p = 0.31: not significant |
| Out-of-sample forecast error, with volumes relative to lags only (condition 2) | 1.009: no improvement |
| Out-of-sample forecasts | 12 |

The coefficient says that a 10% increase in volumes would be followed by a change in
deposits 0.05 points higher, an effect that is small and not distinguishable from zero.

### 3.2 Variants

| Variant | Observations | Significance | Ratio of out-of-sample errors | Does it help? |
|---|---|---|---|---|
| Two lags | 42 | p = 0.32 | 1.12 | no |
| Twelve-month changes | 32 | p = 0.16 | 0.96 | no |
| EUR share in place of volumes | 43 | p = 0.57 | 1.02 | no |
| USDT only | 43 | p = 0.50 | 1.03 | no |
| USDC only | 43 | p = 0.44 | 1.01 | no |

No variant is significant. In the twelve-month variant the out-of-sample error falls by
4%, but the coefficient is not significant and the observations overlap: this is not
enough.

### 3.3 Why the result is null, and what it does not prove

- **The quantities are not comparable in scale.** Volumes against the euro average
  USD 3 billion a month; households' sight deposits amount to EUR 5,526 billion. Even if
  every dollar traded were a deposit that had left, it would be 0.05%.
- **Volumes are much more volatile than deposits**: the standard deviation of monthly
  changes is 22% against 0.7%. The correlation in the same month is zero; with a one-month
  lag it is 0.15.
- **The test has little power.** With 43 observations a weak link would not be seen.
  The outcome says that there is no evidence in these data, not that the link does not exist.
- **The sample does not contain an episode of broad adoption.** ECB Working Paper 3199
  states explicitly that at current levels the aggregate effects are negligible:
  this result is consistent with it.

Consequence: the module 2 index remains a descriptive indicator of trading in euro.
It should not be presented as a leading indicator of deposits.

### 3.4 Flagging rule

The rule is active in `src/module2_index.py` and its outcomes are in
`data/processed/m2_flags.csv`. Last week (16-22 November 2026):

| Series | Share gap | Volume gap | Status |
|---|---|---|---|
| USDT | -0.7 | +0.5 | none |
| USDT without Coinbase | -1.0 | +0.2 | none |
| USDC | +0.7 | +2.6 | **to be checked** |
| USDC without Coinbase | +0.4 | +2.0 | none |

USDC is "to be checked" because volumes against the euro are unusually high (USD 1.6
billion in the week) while the share is normal: more USDC is being traded against
all currencies, not against the euro in particular. It is the fourth consecutive week.

History, over the 50 weeks for which the 52-week window is available (from December 2025):

| Series | Flag | To be checked | None |
|---|---|---|---|
| USDT | 0 | 1 | 49 |
| USDT without Coinbase | 0 | 0 | 50 |
| USDC | 0 | 12 | 38 |
| USDC without Coinbase | 0 | 7 | 43 |

- **The full flag has never been triggered.** In no week did share and volume
  move together beyond two standard deviations.
- **The USDC "to be checked" weeks in January-February 2026** are the episode already
  described in report 03: the share fell by more than two deviations while volumes against
  the euro were normal, because volumes against the won had increased. The rule
  correctly classifies them as a movement of the denominator, not of the euro.
- **The only case for USDT** is the week of 2 March 2026 (share +2.8, volume +1.7).

The rule does what it was designed to do: it distinguishes a movement of the euro from a
movement of the other currencies. Given the outcome of section 3.1, it is not a leading
signal of deposit outflows.

A clarification: the standardised gap reported in report 03 and in the summary
used a window that included the observed week. From now on the definition in this
document applies, with the 52 preceding weeks; the values change only slightly.

### 3.5 Criterion

| Condition | Outcome |
|---|---|
| 1. Volume lag significant at 5% in the main specification | No (p = 0.31) |
| 2. Lower out-of-sample error with volumes | No (ratio 1.009) |
| **Answer to the question** | **No** |

## 4. Limitations

- 43 monthly observations, three and a half years, no stress episode.
- Long panel without Kraken, which accounts for one third of recent volumes against fiat.
- Deposits not seasonally adjusted; the twelve-month variant reduces the sample to 32.
- Standard errors robust to heteroskedasticity but not to autocorrelation.
- The flagging rule has only 50 weeks of history: the frequency of "to be checked"
  for USDC (one week in four) suggests that the threshold of 2 is tight for
  such a volatile series.

## 5. What could not be done

- **Using the volumes with Kraken**: its history starts in December 2024 and would give 21 months.
- **Running the test by country**: volumes against the euro cannot be attributed to a country.
- **Validating the flagging rule on an event**: there are none in the sample.

## 6. How to use it

```bash
.venv/bin/python src/module2_link_test.py   # repeats the test on the updated data
.venv/bin/python src/module2_index.py       # updates the index and the flags
```

---

**What this adds to the final programme**: a useful negative result and a rule.
The weekly index does not anticipate households' sight deposits, so the programme
does not present it as such; and every week the index now comes with an explicit status
(flag, to be checked, none) that separates movements of the euro from those of the
other currencies.
