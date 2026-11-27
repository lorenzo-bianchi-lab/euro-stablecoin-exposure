# 12 - Refinements, English, individual banks

Date: 2026-11-25 (prompt 6). Criteria and definitions are in `SPEC.md`, committed before
the results (commit `a5b6b33`). Before they were written, only the availability of the
EBA data was checked.

Application: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/

## 1. Refinements

| # | Refinement | Status | How it is done |
|---|---|---|---|
| 1 | Wide tables | Done | Headers wrap: at 1280 pixels none of the 23 tables has clipped columns, in English and in Italian. Below that width the table scrolls inside its own container and the first column stays fixed. The browser test checks this in every section: it measures the width of the content, scrolls the table and checks that the first cell does not move |
| 2 | Notices | Done | The notice on the sources is a line with a dot in the sidebar, which leads to "Method and data", where the detail is. Each section caveat is a line with "details" that opens the full text. There are 33 caveats across the eleven pages: none was removed, and caveats were added for the single exchange rate, for Bybit and for the banks |
| 3 | Bybit out of the index | Done | Section 2 |
| 4 | A single ESM value | Done | The whole programme converts with a single exchange rate: the most recent ECB reference rate at the date of the circulation (1.0935 dollars per euro, 25 November 2026). Module 4 reads it from module 1. The ESM assumption is EUR 16.7 billion everywhere; the exchange rate is stated in the Overview, in the Level estimate and in "Method and data". A test checks that the four places where it appears coincide |
| 5 | Insets on the map | Done | Three enlarged insets below the map for Luxembourg, Malta and Cyprus, with the same colour and the value written; a click opens the country sheet |
| 6 | Printable report A and B | Done | In the "Compare and export" section the user chooses between the report on scenario A and the report on the comparison; the choice stays in the address (`rep=ab`). In print only the report remains |
| 7 | Code split by section | Done | One file per section, plus React, the chart library and one language. Opening "Method and data" downloads 193 kB of code; opening the Overview 802 kB, of which 617 is the chart library. Before, it was a single 850 kB file for any page |

Consequence of the single exchange rate: scenarios defined in dollars are worth about 4%
more in euro than before (USD 143 billion is EUR 130.8 billion, not 125.9). Reports 05
and 07 remain snapshots with the end-September exchange rate.

## 2. Change in the index without Bybit

Bybit was removed from the panel for all series and for the whole history. Its data
already downloaded remain in the raw archive, unused. The panel goes from 25 to 24
exchanges (22 in the long index). The measure was defined before the calculation: the
difference between the index without and with Bybit over the 102 weeks of the main index,
in percentage points.

| Series | Mean difference | Maximum difference | Last common week (16 November 2026) |
|---|---|---|---|
| USDT | -0.40 | 4.50 (week of 1 June 2026) | -1.76 |
| USDT without Coinbase | -0.43 | 4.68 | -1.89 |
| USDC | -0.12 | 0.97 (week of 8 June 2026) | -0.58 |
| USDC without Coinbase | -0.15 | 1.19 | -0.80 |

- Bybit accounted for 0.5% of volumes on average, 4.3% at most and 1.8% in the last
  week. The effect on the index is larger than its weight because its volumes are almost
  all against the euro.
- The last value of USDT goes from 11.9% to 10.2%; that of USDC from 54.9% to 54.3%.
- The status of one flag out of 200 changes: USDT, week of 27 July 2026, from "none" to
  "to be checked".
- The index without Bybit is lower, so its level is not comparable with that of reports
  03 and 09. The direction is the same.

## 3. Module 6: individual banks

### 3.1 Data found

The latest EBA transparency exercise is the 2025 one, published on 4 December 2025: four
dates, the last on 30 June 2025, 119 banks from 25 countries, at the highest level of
consolidation. The full database can be downloaded free of charge, in CSV, without a key.
The 2026 exercise has not been published yet, and the EBA writes that it is assessing
whether to continue the exercise now that the Pillar 3 Data Hub exists.

| Item required | Present | Where |
|---|---|---|
| Deposits of households and firms | Yes | Liabilities by instrument and counterparty sector |
| Of which sight | Yes | Same table: current accounts and overnight deposits |
| Deposits from banks | Yes | Same table, credit institutions |
| Securities issued | Yes | Same table |
| Total assets | Yes | Assets table |
| Loans to households and firms | Yes | Non-performing exposures table, gross value by sector |
| Dollar exposures | **No** | No currency breakdown anywhere in the exercise |

In place of dollar exposures the application reports credit exposures to US
counterparties, which are a different quantity: they concern the country of the debtor,
not the currency, and the EBA publishes them only when the United States is among the
bank's top ten countries (42 banks out of 85).

Sufficiency criterion set in advance (at least 50 euro area banks with all items, in at
least 15 countries): **met**. There are 99 banks headquartered in the euro area; 85 have
all items and are located in 18 countries. There was no need to switch to the aggregate
supervisory statistics by business model. Of the 14 excluded, 12 do not have the June
2025 balance sheet items in the database (among them J.P. Morgan SE, Goldman Sachs Bank
Europe, Barclays Bank Ireland, Banque et Caisse d'Epargne de l'Etat), and 2 have no
household deposits, so their retail share is not defined (SFIL, Bpifrance). No bank in
the exercise is headquartered in Bulgaria, Croatia or Slovakia.

The repository contains only the rows used (`data/raw/eba_te2025_extract.csv`, 1 MB):
the full credit risk file is 123 MB. `src/module6_banks.py --download` downloads it
again and rebuilds the extract.

### 3.2 Retail share and threshold

Retail share = household deposits / (household deposits + deposits of financial
corporations other than banks), as in ECB Working Paper 3199. Across the 85 banks the
median is 85.0% and the 75th percentile is **94.4%**: 21 banks are above it. Across
countries (module 5) the threshold was 92.4%.

### 3.3 Coverage

Total assets of the sample: EUR 25,397 billion. This is 61% of the assets of the
monetary financial institutions resident in the area (BSI, June 2025) and 69% of the
consolidated assets of all banks (ECB consolidated banking data, second quarter of 2025).

| Country | Banks | Of which high retail share | Coverage, resident MFIs | Coverage, consolidated |
|---|---|---|---|---|
| Germany | 17 | 1 | 40% | 47% |
| Italy | 12 | 1 | 66% | 84% |
| Spain | 10 | 4 | 121% | 89% |
| France | 8 | 1 | 74% | 91% |
| Netherlands | 6 | 1 | 80% | 82% |
| Austria | 5 | 2 | 38% | 30% |
| Belgium | 4 | 2 | 44% | 44% |
| Greece | 4 | 3 | 101% | 94% |
| Finland | 3 | 0 | 105% | 83% |
| Ireland | 3 | 1 | 26% | 60% |
| Portugal | 3 | 2 | 56% | 53% |
| Lithuania | 2 | 1 | 39% | 40% |
| Malta | 2 | 1 | 47% | 43% |
| Slovenia | 2 | 1 | 68% | 58% |
| Cyprus | 1 | 0 | 37% | 39% |
| Estonia | 1 | 0 | 20% | 16% |
| Latvia | 1 | 0 | 17% | 8% |
| Luxembourg | 1 | 0 | 2% | 3% |
| Bulgaria, Croatia, Slovakia | 0 | - | - | - |

The ratio exceeds 100% where groups have large foreign subsidiaries (Santander, BBVA,
Nordea): the numerator is the consolidated group, the denominator only the resident
banks. It should be read as an order of magnitude.

### 3.4 Comparison with module 5

Control scenario: central level (EUR 15.4 billion), rule R1, sight deposits of
households and firms, full substitution. Each bank loses the same share of deposits as
its country; the coefficient is the high one (3.089) for banks above the threshold and
the low one (0.441) for the others. In the 18 countries covered the outflow is 15.0
billion.

| Calculation | Loan reduction (EUR bn) | Per euro of outflow |
|---|---|---|
| **Module 6, bank by bank** | **6.7** | **0.45** |
| Module 5, uniform rule | 7.5 | 0.50 |
| Module 5, continuous variant | 3.7 | 0.25 |
| Module 5, threshold variant | 2.7 | 0.18 |
| Module 5, low coefficient | 2.5 | 0.17 |
| Module 5, high coefficient | 17.7 | 1.18 |

- Applied bank by bank, the coefficients give 0.45 euro of loans per euro of outflow:
  close to the uniform rule of 0.5 that the paper indicates for banks as a whole, and two
  and a half times the cross-country threshold variant. This confirms the choice made in
  prompt 5 to highlight the uniform rule.
- The cross-country threshold variant underestimates because it classifies entire
  systems: the five countries above the national threshold are small, while banks with a
  high retail share are also found in the large countries (four in Spain, three in
  Greece, two each in Austria, Belgium and Portugal).
- Where the two calculations diverge most: Ireland (0.95 bank by bank against 0.05 with
  the threshold), because the deposits of non-bank intermediaries that lower the national
  retail share are not held by the commercial banks of the sample; Lithuania in the
  opposite direction (0.26 against 1.37), because the country is above the threshold but
  the high-retail-share bank in the sample has few loans.
- The bank-by-bank value covers only the banks in the sample and, by construction, does
  not depend on the scenario amount: it depends on the type of deposit chosen.

## 4. The "Banks" section

Complete, under the "Banks" item of the menu (`#/banks`).

- **Sample**: banks included, threshold, coverage, credit per euro of outflow against
  module 5, recalculated in the browser on the simulator scenario.
- **Chart**: retail share against wholesale funding (deposits from banks plus securities
  issued, over total assets), size by total assets, colour by class, line at the
  threshold. A click opens the bank sheet.
- **Table**: 85 banks, sortable on every column, filterable by country and by class,
  with search by name; outflow and credit reduction in the scenario; CSV download. The
  filters stay in the address.
- **By country**: coverage and comparison with the module 5 variants.
- **Bank sheet** (`#/banks/<LEI>`): six indicators, composition of funding, effect of
  each predefined scenario, balance sheet items.
- Caveats in every block: public bank-level data, not supervisory data; the ordering is
  not a judgement on soundness; consolidated balance sheets that include activities
  outside the euro area; dates different from those of the national balance sheets;
  adoption by bank not observed.

## 5. Language

- English at start-up, Italian from the button in the sidebar. The choice is kept in the
  address (`lang=it`) and persists when the section changes.
- 587 texts per language in `web/src/i18n/en.json` and `it.json`; the 117 texts that
  come from SPEC.md (sources, limits, discarded methods) are translated in
  `src/i18n/spec_en.json` (replaced in prompt 9 by `src/i18n/spec_it.json`, since
  SPEC.md is now in English). No text remains in the component code. The data files
  contain only numbers and codes.
- Numbers, dates, currency symbol and CSV separators follow the language ("€15.4 bn" and
  "15,4 mld €"; "25 November 2026" and "25 novembre 2026").
- The section names in the addresses are also in English; the old Italian addresses
  still work.

## 6. Checks

| Check | Outcome |
|---|---|
| Python tests (`tests/`) | 22 out of 22: reconciliation, scenarios, data layer, single exchange rate, SPEC translations, Bybit out of the index, module 6, reproducibility without network |
| Application calculations against the scripts (`npm test`) | 20 out of 20: nine country scenarios, three bank scenarios on 85 banks, six variants of the level estimate |
| Translations (`npm test`) | 11 out of 11: same keys and same placeholders in the two languages, every key used exists, none unused, no text in the components |
| Browser (`npm run e2e`), eleven pages | 0 console errors; 0 pixels of overflow at 390 pixels; 0 clipped tables out of 23 at 1280 pixels, in both languages; 15 tables scroll at 390 pixels, all with the first column fixed; no missing key and no word from the other language |
| Browser, behaviour | Scenario in the address, dark theme, language switch and back, old Italian address, one-line caveat that expands, source indicator, three insets on the map, report A and B in print, bank filter and bank sheet, files downloaded at start-up: all passed |

The screenshots of the pages, at 1280 and 390 pixels, are in `reports/figures/app/`,
with the outcome in `browser_test_results.json`.

## 7. What did not succeed, and limits

- **Dollar exposures by bank**: they do not exist in the EBA data. Exposures to US
  counterparties replace them only in part and for half of the banks.
- **Three countries without banks** (Bulgaria, Croatia, Slovakia) and coverage below 20%
  in Estonia, Latvia and Luxembourg: there module 6 says nothing or almost nothing.
- **Different dates**: banks at 30 June 2025, national balance sheets at September 2026.
  Module 6 does not update itself: it will do so when, and if, the EBA publishes a new
  exercise.
- **Consolidated perimeter**: a group's deposits include those raised outside the euro
  area, and the scenario treats them as if they were all in the country of the head
  office.
- **Continuous variant by bank**: not calculated. The anchors across banks had not been
  defined in advance, and defining them after seeing the results would have broken the
  rule. The credit variant chosen in the simulator does not apply to the banks.
- **Texts still in Italian**: SPEC.md, the reports, the description of the data files and
  the error messages of the modules. The application marks them as such.
- **Chart library**: it remains a single 617 kB file (205 compressed), downloaded by the
  first section that has a chart.
- **Names of countries outside the euro area**: the map shows only "outside the euro
  area", without a name.
- **Scheduled Monday run**: not yet observed. The run started manually after these
  changes succeeded in all steps and gave the same index as the local run, week by week
  (maximum difference 0.0 points over 102 weeks), with no partly updated sources.
- **Old data in the browser cache**: after publication the browser showed the previous
  data files together with the new application for a few minutes. Corrected: the
  application always asks the server whether the files have changed.

---

**What this adds to the final programme**: the same scenario can now be read down to the
individual bank, and it shows that the coefficients applied bank by bank give almost the
uniform rule; the application is in English, with the same index and exchange rate in
every run.
