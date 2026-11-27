# SPEC - euro-stablecoin-exposure

Reference document of the project. It is to be re-read at the start of every work
session, before writing code or reports. Every change to the objective, modules or
criteria goes through here and is recorded in the log at the end.

Last updated: 2026-11-27 (prompt 9).

## 0. Non-negotiable objective

The final product is a useful, powerful and innovative programme, not a collection of
cautious reports. **It is a complete web application**, not a summary page: static,
without a server, published on GitHub Pages, with all scenario calculations run in the
browser. At this stage what matters is that it works: clean but essential graphics.

- Every module must produce a result an analyst can use: a number, a ranking, a
  scenario.
- Stating the limits is mandatory, but it does not replace the result.
- If a method fails, an alternative is proposed and tried at once.
- Every report ends with the line "What this adds to the final programme".

This section prevails over the others when in doubt about how far to go. It does not
prevail over section 4 or over the rule of not inventing data: a useful result is a true
result, with its scope stated.

## 1. Objective

University project (ESCP Business School, economics and finance). Reference: ECB Working
Paper No 3199, "Stablecoins and monetary policy transmission" (March 2026).

Initial objective, **abandoned**: estimate how much of the dollar stablecoins (USDT,
USDC) is held by euro area residents. Tests 00 and 01 showed that it cannot be estimated
with free data.

Current objective: build a descriptive tool that, given a level of adoption of dollar
stablecoins taken from external sources or assumed, shows

- how stablecoin activity against the euro moves over time relative to other currencies;
- which national banking systems of the euro area have funding more exposed to deposit
  substitution;
- how much each country's funding would change under different levels of adoption.

## 2. The modules

### Module 1 - Level (from external sources, not estimated)

- **Result for the analyst**: a number. The value in dollars and in euro of the dollar
  stablecoins attributable to the euro area according to the external assumptions,
  updated to current circulation (world circulation × 7.5% in the baseline scenario,
  × 15% in the high scenario), alongside the diffusion among consumers.
- **What it does**: reports the external references on the level of adoption in the
  euro area, with the exact definition of each, and applies them to current
  circulation. It does not estimate shares of its own.
- **Sources**: box in the ECB Economic Bulletin 7/2026 (5% of consumers report holding
  stablecoins, August 2025, CES survey in 11 countries); ESM Working Paper 79 (7.5% of
  the circulation of dollar stablecoins assumed to be held by euro area households,
  USD 19 billion in the third quarter of 2025; 15% in the high scenario).
- **Caveat**: the two figures do not measure the same thing. The ECB one is a diffusion
  among consumers, the ESM one is a calibration assumption. Neither is a measure of the
  value held.
- **Complete when**: (a) there is a table with, for each reference, value, quantity
  measured, period, sample, page and link, and every value has been re-read against the
  original (done in `reports/02_benchmarks_and_module3_data.md`, part A); (b) a script
  downloads the current circulation of USDT and USDC from a verified free source and
  produces the level in the two scenarios, with its date; (c) the result is labelled as
  the application of an external assumption, not as an estimate.
- **Status**: completed on 2026-11-24 (`reports/06_module1_level.md`,
  `src/module1_level.py`). The base to which the shares are applied is USDT plus USDC,
  the same as the ESM's (verified: 247.8 against 248 billion at 30 September 2025).
  Circulation from DefiLlama, checked against CoinGecko. The level feeds module 4.

### Module 2 - Trend (weekly index)

- **Result for the analyst**: a number per week and its change. Four time series that
  can be updated with one command, plus the latest value and the deviation from the
  mean.
- **What it does**: weekly index of the EUR share of stablecoin/fiat spot volumes on
  centralised exchanges (formerly proxy 1). Four series: USDT and USDC, each with and
  without Coinbase.
- **Why without Coinbase**: on Coinbase, USDC is converted into dollars outside the
  order book, so its EUR share is inflated.
- **Sources**: public daily candles from 24 exchanges (`src/exchange_fetch.py`); there
  were 25 until 2026-11-25, when Bybit was excluded for the whole history.
- **Complete when**: (a) a script produces the four weekly series for the whole history
  that the free APIs return, with the actual period stated; (b) for each week it is
  recorded which exchanges contributed; (c) the exchange panel is fixed, or every entry
  and exit is documented; (d) a second run reproduces the same values for the weeks
  already closed; (e) the report states that the index measures trading in euro, not
  holdings or residence.
- **Status**: completed on 2026-11-24 (`reports/03_module2_weekly_index.md`,
  `src/module2_index.py`). Main index over 102 weeks from 2024-12-09; long index over
  203 weeks from 2023-01-02 without Kraken and Gemini. The history grows with each
  weekly update.
- **Known limit**: the panel contains only the pairs listed on 2026-11-23; those
  delisted earlier are missing from the history.

### Module 3 - Vulnerability (structure of bank funding by country)

- **Result for the analyst**: a ranking. The euro area countries ordered by the
  structural exposure of their funding to deposit substitution, with the components that
  explain each country's position and its evolution over time.
- **What it does**: describes, for each of the 21 euro area countries and for each
  month, how the funding of banks is composed: sight and total deposits of households
  and firms, interbank deposits, debt securities issued, external liabilities, capital.
  It adds, for the countries covered, the share of liabilities in foreign currency and
  in dollars.
- **Sources**: ECB Data Portal, BSI dataset, 12 confirmed series
  (`src/ecb_bsi_probe.py`); BIS locational banking statistics for foreign-currency
  liabilities (`src/bis_lbs_probe.py`). List in
  `reports/02_benchmarks_and_module3_data.md`, part B.
- **Known limit**: foreign-currency liabilities are quarterly and cover 13 countries out
  of 21 (BG, EE, HR, LT, LV, MT, SI and SK are missing, as they do not report to the
  BIS).
- **Status**: completed on 2026-11-24 (`reports/04_module3_ranking.md`,
  `src/module3_ranking.py`). Indicator: 0.50 z(C1) + 0.25 z(C2) + 0.25 z(C3), with
  C1 = sight deposits of households and firms over liabilities, C2 = sight share of
  customer deposits, C3 = reliance on deposits relative to wholesale funding. Dollar
  funding remains a second map, not a component.
- **Complete when**: (a) there is a country-by-month table with the composition shares
  of funding, calculated with formulas written in the report; (b) the shares add up to
  total liabilities within a stated tolerance, or the gap is explained; (c) the ranking
  is produced by an indicator whose components and weights are written and justified
  before looking at the order of countries, and is accompanied by at least one
  alternative weighting to show how stable the order is; (d) the report states that the
  ranking orders funding structure, not the probability of outflow.

### Module 4 - Scenarios (effect on funding by country)

- **Result for the analyst**: a scenario. For each level of adoption, the change in each
  country's funding in EUR billion and in percentage points, and how much wholesale
  funding would be needed to offset it.
- **What it does**: an accounting calculation of how much each country's funding would
  change for different levels of adoption, using the levels of module 1 as starting
  points and the structure of module 3 as the base.
- **Complete when**: (a) each scenario is defined by explicit parameters written before
  the results are calculated; (b) the rule by which the outflow is allocated across
  countries and across deposit types is stated, with at least one alternative rule for
  comparison; (c) the results are presented as a mechanical exercise, with the
  sensitivity to the parameters; (d) the code reproduces the tables in the report.
- **Status**: completed on 2026-11-24 (`reports/05_module4_scenarios.md`,
  `src/module4_scenarios.py`). ESM scenarios from USD 19 to 600 billion; allocation
  across countries pro rata to sight deposits (R1) or per capita (R2); the script also
  accepts any amount, which will be the level produced by module 1.

### Module 5 - Credit and transmission (added on 2026-11-25)

- **Result for the analyst**: a number and a map. For each scenario and country of
  module 4, the credit reduction to households and firms in billions and in per cent,
  with a range; and the position of each country on two channels, sight deposits and
  dollar funding, with what each quadrant implies for transmission.
- **What it does**: applies to the outflows of module 4 the coefficients published in
  ECB Working Paper 3199, transcribed and verified against the original. It estimates
  nothing of its own.
- **Mandatory caveat**: these are coefficients estimated on individual banks and applied
  to national aggregates. They give orders of magnitude, not forecasts.
- **Complete when**: (a) the coefficients are in a table with the section and table of
  origin, verified against the PDF; (b) thresholds and application rules are written
  before the results (`reports/07_module5_credit.md`, section 2); (c) for each scenario
  and country there is a credit reduction with a range, a threshold variant and a
  uniform variant; (d) the two-channel map covers the 21 countries or states which are
  missing and why.
- **Status**: completed on 2026-11-25 (`reports/07_module5_credit.md`,
  `src/module5_credit.py`). Retail share threshold: 75th percentile across countries
  (92.4%), five countries above. Map: 13 countries with BIS data, 8 with the quarterly
  currency breakdown of the BSI.

### Extensions of modules 1, 2 and 4 (added on 2026-11-25)

- **Module 1, own level**: three independent estimates of the value held by residents
  (B1 bottom-up from the ECB survey; B2 from exchanges' customer reserves; B3 from
  national data). Criterion set in advance: if at least two of the three central
  estimates lie within a factor of 3, module 1 publishes a range of its own alongside
  the ESM assumption; otherwise it publishes the minimum of B1. Method in
  `reports/08_own_level_estimate.md`. **Outcome of 2026-11-25: criterion not met.**
  B1 = EUR 15.4 billion, B3 = 0.9, B2 without a number. Module 1 publishes as its own
  only the minimum of B1, EUR 8.9 billion, alongside the ESM assumption.
- **Module 4, rule R3**: allocation across countries based on the share of crypto-asset
  owners, if a survey gives it for at least 15 euro area countries. **Outcome: added.**
  ECB SPACE 2024 survey, 20 countries out of 21 (Bulgaria imputed).
- **Module 2, link and flag**: pre-registered test of the predictive content of
  stablecoin volumes against the euro for households' sight deposits, reported even if
  null; explicit flagging rule on the index. Method in
  `reports/09_module2_signal_test.md`. **Outcome: null test** (p = 0.31; no
  out-of-sample improvement). The index remains descriptive; the flagging rule is
  active.

### Dashboard and tests (added on 2026-11-25)

- **Dashboard**: a single HTML page (`docs/index.html`), generated by
  `src/dashboard.py`, without a server and without external dependencies, published with
  GitHub Pages. Slider for the amount held, choice of the allocation rule and of the
  substitution rate; for each country it shows the outflow, the wholesale funding needed
  and the credit reduction; it shows the two-channel map and the weekly index.
- **Automated tests** (`tests/`): balance sheets adding up, linearity of the scenarios,
  sum of the allocations, reproducibility without a network.
- **Complete when**: the dashboard recalculates in the browser the same numbers as the
  scripts for at least one control scenario, and all tests pass.
- **Status**: completed on 2026-11-25 (`reports/10_dashboard_and_tests.md`), then
  replaced the same day by the application described below, at the same address.

### Corrections to the engine (2026-11-25, prompt 5)

- **Reference level.** The reference level of the programme is the own bottom-up
  estimate (B1, households variant): EUR 15.4 billion, range 8.9 - 23.1. The ESM
  assumption becomes the comparison. The individuals variant is the declared upper
  extreme. **This is a decision taken after seeing the results**: the criterion set in
  report 08 was not met and provided for publishing only the minimum. The criterion is
  not rewritten: it stays on record, with its outcome, and the decision to override it
  is recorded here and in the log.
- **Credit.** The headline value is the uniform rule of ECB Working Paper 3199 (EUR 0.5
  of loans per euro of deposits), with the range between the low and the high
  coefficient. The threshold variant remains as a sensitivity. A **continuous variant**
  is added, defined before it was calculated:

      coefficient(q) = low + (high - low) × t,   t = (q - qL) / (qH - qL), bounded between 0 and 1

  where q is the country's retail share, qL the median retail share of the countries
  below the 75th percentile threshold and qH the median of those above. The two groups
  of the paper become the two anchor points, with interpolation in between and no jump.
- **Reproducibility.** Library versions pinned in `requirements.txt`; the
  reproducibility test compares the values with a tolerance on the last decimal digit.
- **Status**: applied on 2026-11-25 (`reports/11_application.md`). The numbers in
  reports 07 and 08 remain snapshots from before the corrections.

### Data layer and application (2026-11-25, prompt 5)

- **Data layer**: `src/export_app_data.py` exports all results to versioned and
  documented JSON files, one per section, in `web/public/data/`, each with the date of
  its data; `meta.json` reports the status of each source. The application reads only
  those files. The boundaries of the 21 countries come from Eurostat GISCO.
- **Automatic update**: a GitHub Action runs the update every Monday, regenerates the
  data and republishes. If a source fails, the last valid data are kept and the
  application flags it.
- **Application** (`web/`, published from `docs/`): React, Vite, TypeScript, ECharts.
  Side navigation, shareable addresses that preserve the scenario, light and dark theme,
  usable from 390 pixels. Nine sections (ten from prompt 6, with "Banks"; from prompt 6
  in English and Italian, and with the texts outside the data files): Overview,
  Simulator, Map of Europe, Country sheet, Two-channel map, Weekly monitor, Level
  estimate, Compare and export, Method and data.
- **Complete when**: (a) every section works and shows, next to the numbers, the caveats
  that concern them; (b) the application's calculations match the Python scripts on at
  least three scenarios for each rule; (c) every section loads without errors in the
  console; (d) no horizontal overflow at 390 pixels; (e) there is a screenshot of every
  section in `reports/figures/app/`.
- The single-page dashboard of 2026-11-25 (`src/dashboard.py`) is replaced by the
  application.
- **Status**: application completed and published on 2026-11-25
  (`reports/11_application.md`), criteria (a) to (e) met. Address:
  https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/
  The automatic update (`.github/workflows/weekly-update.yml`) has been running since
  2026-11-25: the first run, started by hand, succeeded in all steps. Bybit does not
  respond from GitHub's servers (403): the new weeks calculated there come out without
  Bybit, which accounts for 0.9% of volumes (1.8% in the last week); the application
  marks the source "partly updated" and shows a notice at the top of every page.

### Refinements, language and module 6 (2026-11-25, prompt 6)

Criteria and definitions written before the results were calculated. Before writing
them, only the availability of the EBA data was checked (which files, which items, how
many banks).

- **Bybit out of the module 2 index.** Bybit does not respond from GitHub's servers, so
  the automatic run and the local run gave different indices. Bybit leaves the panel for
  all series and for the whole history; its data already downloaded remain in the raw
  archive, unused. The panel goes to 24 exchanges (22 in the long index). The change is
  measured as follows, whatever the outcome: for each of the four series, over the weeks
  of the main index in which Bybit has data, the difference between the index without
  and with Bybit in percentage points (mean, maximum in absolute value, last common
  week), and the number of weeks in which the status of the flag changes. The exclusion
  does not depend on the result.
- **A single exchange rate.** The whole programme converts dollars and euro with a
  single exchange rate: the most recent ECB reference rate at the date of the
  circulation (module 1). Module 4 reads it from module 1. The ESM assumption thus has a
  single value everywhere.
- **Application, refinements.** Complete when: (a) at 1280 pixels no table has columns
  cut off, and below that width scrolling is internal to the table with the first
  column fixed, verified by a test in every section; (b) the notice on the sources is an
  indicator in the sidebar with the detail in "Method and data", and every section
  caveat is one line with the full text expandable, without removing any; (c) the map
  has enlarged insets for Malta, Luxembourg and Cyprus; (d) the printable report also
  exists for the comparison between two scenarios; (e) the code is split by section and
  start-up loads only the section that is open.
- **Language.** English as the main language, Italian selectable, the choice kept in the
  address (`lang=it`). All texts are in separate translation files (`web/src/i18n/`;
  for the texts that come from this document, `src/i18n/`). Numbers and dates follow
  the language. A test checks that no untranslated strings remain.
- **Status**: all applied on 2026-11-25 (`reports/12_refinements_language_banks.md`).
  Without Bybit the index is on average 0.40 points lower for USDT and 0.12 for USDC
  (maximum 4.5 points, week of 1 June 2026; last week -1.76 and -0.58); the status of
  one flag changes. Single exchange rate: USD 1.0935 per euro; the ESM assumption is
  EUR 16.7 billion everywhere. The application has ten sections, with "Banks".

### Module 6 - Individual banks (added on 2026-11-25, prompt 6)

- **Result for the analyst**: a ranking and a scenario for each bank. For each euro area
  bank included in the EBA transparency exercise: retail share, position relative to
  the 75th percentile across banks, wholesale funding, and the effect of the simulator
  scenario on deposits and credit.
- **Source**: EBA, 2025 transparency exercise (published on 4 December 2025, the latest
  available), full database in CSV, free. Data as at 30 June 2025, at the highest level
  of consolidation. These are public bank-level data, not confidential supervisory data.
- **Sufficiency criterion, set in advance**: the EBA data are sufficient if, among the
  banks headquartered in the 21 euro area countries, at least 50 have all the necessary
  items (deposits of households, firms, other financial corporations and banks;
  securities issued; total assets; loans to households and firms) and they cover at
  least 15 countries. Otherwise the ECB's aggregate supervisory statistics by business
  model are used instead, and the application section shows business models instead of
  banks.
- **Definitions** (the same as in module 5, brought to bank level):
  - retail share = household deposits / (household deposits + deposits of financial
    corporations other than banks), as in ECB Working Paper 3199;
  - high retail share = above the 75th percentile of the retail share among the euro
    area banks in the sample, unweighted;
  - wholesale funding = deposits from banks plus debt securities issued, over total
    assets;
  - scenario: each bank loses the same share of deposits that the scenario assigns to
    its country (bank outflow = share lost in the country × the bank's deposits in the
    chosen category: sight deposits of households and firms, sight deposits of
    households, or all deposits);
  - credit: outflow in standard deviations = 100 × outflow / total assets / 0.8;
    credit reduction = coefficient × standard deviations / 100 × loans to households and
    firms, with the high coefficient (3.089) above the threshold and the low one (0.441)
    below.
- **Comparison with module 5**, defined in advance: for each country, the credit
  reduction per euro of outflow calculated bank by bank (sum of the credit reductions /
  sum of the outflows of the country's banks) against the module 5 variants (low, high,
  threshold, continuous, uniform). Control scenario: central level, rule R1, sight
  deposits of households and firms, full substitution.
- **Coverage**: for each country, total assets of the sample banks over total assets of
  the country's monetary financial institutions (BSI, June 2025). The perimeters differ
  (consolidated group with its foreign subsidiaries against unconsolidated residents):
  the ratio can exceed 100% and is to be read as an order of magnitude. If the ECB's
  consolidated banking data can be downloaded, the ratio to consolidated total assets is
  added.
- **Dollar exposures**: the EBA exercise has no currency breakdown. Credit exposures to
  US counterparties are reported instead, if present; they are not the same thing.
- **Mandatory caveats**: public bank-level data, not supervisory data; the ordering is
  not a judgement on soundness; consolidated balance sheets that include activities
  outside the euro area; a data date different from that of the national balance
  sheets.
- **Status**: completed on 2026-11-25 (`reports/12_refinements_language_banks.md`,
  `src/module6_banks.py`). Sufficiency criterion met: 85 banks with all items out of 99,
  in 18 countries (Bulgaria, Croatia and Slovakia are missing). Retail share threshold
  across banks 94.4%, 21 banks above. Coverage: 61% of the assets of resident banks,
  69% of consolidated assets. In the countries covered, the coefficients applied bank by
  bank give EUR 0.45 of credit reduction per euro of outflow, against 0.18 for the
  threshold variant of module 5, 0.25 for the continuous one and 0.50 for the uniform
  rule. No dollar exposures in the data. The continuous variant by bank is not
  calculated: the anchors across banks were not defined before the results.

### Design and identity (2026-11-26, prompt 7)

No calculation changes in this prompt: modules, data layer and application model remain
those of prompt 6, and all existing tests must stay green. Only the presentation
changes. Criteria written before the work.

- **Name**: "Euro Stablecoin Exposure Monitor". No logo, colour or brand of the ECB or
  of other institutions. At the bottom of every page: "University project, not
  affiliated with the ECB" (replaced in prompt 9 by: Independent university project
  (ESCP Business School). Not affiliated with any institution whose data it uses.)
- **Graphic system in a single file** (`web/src/styles/tokens.css`): colours, typography
  (one typeface for headings, one for text and numbers, tabular figures), spacing,
  radii, shadows, states. Direction: institutional, sober, deep blue with a single
  accent colour; a dark theme of the same standard. A single theme for the charts, read
  from the same tokens: palette for series, sequential palette for the map, light grids,
  direct labels instead of legends where possible; series are also distinguished by
  stroke or shape, not only by colour.
- **New pages**: a home page with a sentence on what the programme does, three results
  generated from the current data (estimated level, most exposed countries for each
  channel, effect of the high scenario), a preview map and entry points to the tools;
  an "About" page with purpose, author, sources and licences.
- **Sections**: one main result highlighted in each section; scenario controls in a
  stable panel; banks table with pagination; map with an equal-area projection, a class
  legend and the selected country highlighted; two-page printable report with header,
  data date and scenario; dedicated mobile navigation.
- **Complete when**: (a) all prompt 6 tests pass, with only the changes made necessary
  by the new pages and by pagination, listed in the report; (b) an automated check
  verifies AA contrast (4.5:1 for text, 3:1 for large text and graphic elements) on the
  tokens of both themes and on the text rendered in every page; (c) every page can be
  used from the keyboard with visible focus, every chart has an alternative text, and
  with the reduced-motion preference there are no animations; (d) there are before and
  after screenshots of every section at 1280 and 390 pixels in both themes
  (`reports/figures/app/before`, `after`), and every "after" screenshot has been looked
  at; (e) the page weight is reported before and after. (These screenshots were
  replaced in prompt 9 by the current set in `reports/figures/app/screenshots/`; the
  earlier ones remain in the git history at tag `v1.0`.)
- **Status**: completed on 2026-11-26 (`reports/13_design_and_identity.md`). Criteria
  (a) to (e) met. Deep blue `#163b6e` with copper accent `#a8481f`; Source Serif 4 for
  headings, Inter for text and numbers. Twelve pages: the ten sections, the home page
  and About. The sections were redesigned by ten agents in parallel, one per section,
  then harmonised. The pages weigh about 90 kB more compressed, because of the fonts.
  The author and the code licence were added in prompt 9: author Lorenzo Bianchi, MIT
  licence.

### Closing and version 1.0 (2026-11-26, prompt 8)

No calculation changes and all tests stay green. Criteria written before the work.

- **Corrections**: (1) the address without a section opens the home page; (2) the first
  drawing of every chart is complete and immediate, without animation, even with the
  tab in the background, in print or in a capture, and a test compares, for every page,
  the points drawn with the data points after three seconds, with the tab visible and
  not visible; (3) the map opens with the country with the highest value already
  selected; (4) the caveats sit below the chart or table they refer to, in a neutral
  style, and only an active flag stays yellow, without removing any; (5) the About page
  shows the author, course and university (completed in prompt 9: author Lorenzo
  Bianchi, MIT licence).
- **Completion**: (6) a guided tour in five steps (home page, simulator, map, banks,
  monitor), which can be started from the home page and skipped; (7) a README in
  English and a two-page methodological note in English, downloadable from "Method and
  data"; (8) a complete run from a clean clone following only the README; (9)
  verification of the scheduled update, or written instructions for doing it; (10) a
  version 1.0 tag with release notes.
- **Status**: completed on 2026-11-26 (`reports/14_closing.md`). Points 1 to 8 and 10
  done; the clean clone succeeded without corrections. Point 9: no scheduled run has
  started yet, because the workflow has existed since 25 November; the first available
  Monday is 30 November 2026 and the README says how to check it. Version 1.0 tagged
  (`v1.0`).

### Repository ready for delivery (2026-11-27, prompt 9)

No calculation and no result changes; all tests stay green; the commit history is not
rewritten. Criteria written before the work.

- **Identity**: (1) the project is described everywhere as an independent university
  project (ESCP Business School), with no statement that it is made for, addressed to or
  intended for the ECB; the ECB appears only as a source of data or as the author of
  Working Paper 3199; footer "Independent university project (ESCP Business School). Not
  affiliated with any institution whose data it uses."; (2) every link points to the
  GitHub account `lorenzo-bianchi-lab`; (3) sole author Lorenzo Bianchi, code under the
  MIT licence (`LICENSE`, `CITATION.cff`), and `DATA_SOURCES.md` with source, terms of
  use and attribution of every dataset, checked on the providers' sites.
- **Language**: (4) the whole repository in English: SPEC, summary (`SUMMARY.md`),
  reports, code comments and docstrings, workflow names, automatic commit messages, file
  and folder names; release notes become `CHANGELOG.md`. Italian keys of the data layer
  and Italian CSV column names are renamed only if every test still passes afterwards,
  otherwise they are kept and listed. The application keeps English as default and
  Italian as an option.
- **Presentation and checks**: (5) repository description, website and topics on
  GitHub; (6) README with a home page screenshot, status badges, three small screenshots
  and a "Key findings" section; (7) a workflow that runs the Python tests, the
  application tests, the build and the browser tests on every push and pull request;
  (8) old screenshots removed and a current, compressed set generated (every page at
  1280 px in both themes, four at 390 px), the data of discarded methods moved to
  `data/archive/` with a README; (9) formatter and static checks for Python and
  TypeScript, run in the workflow, and an English header for every module in `src/`;
  (10) a run from a clean clone following only the README, every README link
  responding, version 1.1 tagged.

### Update and summary

A single command updates the modules in the right order and regenerates the summary page
and the application data:

    .venv/bin/python src/run_all.py

- Order: module 3, module 1, module 2, own level, module 4, module 5, module 6, module 2
  test, summary, application data. About five minutes. Module 6 uses the EBA extract
  already in the repository and downloads nothing, unless `--download` is given. The
  application is rebuilt with `npm run build` in `web/`.
- `SUMMARY.md` is generated by `src/summary.py` from the files in `data/processed`: it
  is not edited by hand.
- If a source does not respond, the corresponding module fails without touching the
  existing data, the others carry on, the summary indicates which data are the previous
  ones, and the command exits with an error code.
- The numbered reports are snapshots at the date stated. The files in `data/processed`
  and the summary reflect the latest update.

## 3. Confirmed data sources

| Source | Use | Access | Status |
|---|---|---|---|
| Public APIs of 24 exchanges (Binance, Kraken, Coinbase, Bitstamp, OKX, Upbit, Bithumb, Coinone, Korbit, BtcTurk, Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate, Bitget, MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso, Binance.US) | Module 2 | Free, no key | Confirmed. History: from 2023 or earlier for 17 exchanges; Kraken only from 2024-12 (last 720 candles). Bybit excluded since 2026-11-25: it does not respond from GitHub's servers |
| CoinGecko, 24-hour tickers | Coverage check for module 2 | Free, no key, snapshot only | Confirmed |
| ECB Data Portal, BSI dataset | Module 3 | Free, no key | Confirmed: 12 series, 21 countries (20 for deposits from other banks), monthly, up to 2026-09 |
| DefiLlama, stablecoin API | Module 1: USDT, USDC and total supply in circulation | Free, no key | Confirmed; matches CoinGecko within 0.4% |
| CoinGecko, `circulating_supply` | Module 1: cross-check | Free, no key | Confirmed |
| Eurostat, households (`lfst_hhnhtych`) | Module 1: consistency check | Free, no key | Confirmed: 21 countries, 2025 |
| ECB Data Portal, quarterly BSI by currency | Module 5: dollar liabilities of the eight countries without BIS data | Free, no key | Confirmed: residents' dollar deposits for 21 countries; other components for 16-17 |
| ECB, SPACE 2024 survey, chart data | Rule R3: crypto-asset owners by country | Public file | Verified: 20 countries out of 21 |
| ECB, Economic Bulletin 7/2026, Chart B panel b | Own level estimate B1 | Image only | Percentages measured on the image |
| OAM (Italy) and DNB (Netherlands) | Own level estimate B3 | Public documents | Verified; OAM does not single out stablecoins |
| Exchanges' proof of reserves | Own level estimate B2 | Binance and KuCoin readable by script | Balances read; unusable without the users' country of origin |
| Eurostat, population by age and households | Own level estimate and rule R3 | Free, no key | Confirmed |
| Eurostat GISCO, country boundaries (Countries 2024, 1:20 million) | Application: map of Europe | Free, no key; © EuroGeographics for the administrative boundaries | Confirmed |
| EBA, 2025 EU-wide transparency exercise, full database | Module 6: balance sheets of individual banks | Free, no key; CSV files | Confirmed: 99 euro area banks, 85 with all items, 18 countries; data as at 30 June 2025. No currency breakdown |
| ECB Data Portal, consolidated banking data (CBD2) | Module 6: sample coverage | Free, no key | Confirmed: consolidated total assets by country, quarterly |
| BIS, locational banking statistics (LBS) | Module 3: foreign-currency and dollar liabilities | Free, no key | Confirmed: 4 series, 13 countries out of 21, quarterly, up to 2026-Q2 |
| ECB Data Portal, reference exchange rate (EXR) | Module 4: conversion of dollar amounts | Free, no key | Confirmed |
| Eurostat, population on 1 January (`demo_pjan`) | Module 4: per-capita allocation | Free, no key | Confirmed: 21 countries, 2025 |
| ECB, Economic Bulletin 7/2026, box on stablecoins | Module 1 | Public web page | Verified against the original |
| ESM Working Paper 79 | Modules 1 and 4 | Public PDF | Verified against the original |
| ESMA, Kaiko, Chainalysis, IMF WP/25/141, Bruegel PB 09/2026 | Comparison | Public | Verified against the originals |
| Public Ethereum and Tron RPCs; Dune Spellbook labels | Tests 00 and 01 only | Free, no key | No longer used |

Not available: bank liabilities in foreign currency at monthly frequency, and for eight
euro area countries at any frequency.

## 4. What the programme does NOT promise

Three commitments set on 2026-11-24 were redefined on 2026-11-25 at the user's explicit
request. They hold in the form below.

- **No measurement of residence.** The programme does not observe how many stablecoins
  euro area residents hold. It estimates a range (redefined on 2026-11-25, prompt 5):
  EUR 8.9 - 23.1 billion, centre 15.4, derived from the ECB consumer survey with stated
  assumptions. It is a survey-based estimate, not a measurement, and the two other
  routes attempted did not confirm it. It produces no country estimates: rule R3
  allocates a total, it does not measure national holdings.
- **No causal effect estimated by the programme.** Module 5 does not estimate the effect
  of stablecoins on credit and rates: it applies coefficients published in ECB Working
  Paper 3199, estimated on individual banks, to national aggregates. They are orders of
  magnitude.
- **No validated early warning.** The flagging rule of module 2 marks unusual values of
  the index. It is not a leading signal of outflows unless the pre-registered test shows
  predictive content; the test result is reported either way.
- No forecast of future adoption: the scenarios are assumptions.
- The module 3 ranking orders countries by funding structure. It is neither a
  probability that deposits leave nor a judgement on the soundness of banks.
- Module 6 uses public bank-level data, not confidential supervisory data. The ordering
  of banks describes their funding structure: it is neither a judgement on the soundness
  of any bank nor a forecast of outflows.
- No coverage of OTC, P2P, decentralised finance or networks other than those stated in
  each report.

## 5. Discarded methods

| Method | Where it was tried | Reason for discarding |
|---|---|---|
| Estimating the euro area share as a level | Tests 00 and 01 | No free proxy measures residence; estimates range from 24% to 52% against external benchmarks of 5% - 15% |
| Proxy 2: hourly profile of on-chain transfers | `reports/00_h1_feasibility_test.md` | On Ethereum 86% - 90% of activity has no daily cycle; the decomposition gives Asia zero weight; the European time band includes the United Kingdom, Africa, the Middle East, Turkey and Russia |
| Proxy 3: flows to exchanges weighted by EUR share | `reports/01_proxy3_test.md` | Result 38.4%, above the pre-registered ceiling of 30%; Coinbase accounts for half of the result because of an artefact; incomplete labels (Kraken and Korean exchanges missing); trend driven by the fall in Binance's labelled flows |
| Proxy 1 used as a level | `reports/00_h1_feasibility_test.md` | It measures the share of trading against the euro, not holdings; it ranges from 12% (USDT) to 50% (USDC). Still used only as a trend, in module 2 |
| Dune key to improve the labels | `reports/01_proxy3_test.md` | Dune's table uses the same public lists already tried |
| BSI dataset for foreign-currency liabilities | `reports/02_benchmarks_and_module3_data.md` | The currency breakdown is not published for deposits, securities and total liabilities. Replaced by the BIS statistics |
| ECB consolidated banking data for foreign-currency liabilities | `reports/07_module5_credit.md` | The dataset has a currency dimension but contains only the total. Replaced by the quarterly BSI |
| B2: exchanges' customer reserves allocated by country | `reports/08_own_level_estimate.md` | No free, downloadable indicator of the users' country of origin |
| B3 as a level estimate | `reports/08_own_level_estimate.md` | National statistics only see providers registered in the country: 17 times below the bottom-up estimate |
| Module 2 index as a leading indicator of deposits | `reports/09_module2_signal_test.md` | Pre-registered test null: p = 0.31, no out-of-sample improvement |
| Dollar exposures of individual banks from EBA data | `reports/12_refinements_language_banks.md` | The transparency exercise has no currency breakdown. Exposures to US counterparties are reported instead, which are a different quantity |
| CoinGecko snapshot as a time series | `reports/00_h1_feasibility_test.md` | The free API only returns the last 24 hours |

## 6. Working rules

- Do not invent or simulate data. If a source cannot be reached, say so in writing.
- Criterion and method are committed before looking at the results and are not changed
  afterwards.
- Every external figure must be re-read against the original, with page or section.
- API keys are kept only in `.env`, which is excluded from git. No data file over 50 MB.
- Small commits with clear messages, in English (from prompt 9); push at the end of
  every session. The commit history is not rewritten.
- Every report states its own limits and what could not be done.
- If a method fails, an alternative is proposed and tried in the same report: two lines
  on the reason, then on to the next route.
- Every report ends with the line "What this adds to the final programme".

## 7. Log

| Date | Event |
|---|---|
| 2026-11-23 | H1 test (`reports/00_h1_feasibility_test.md`): R = 2.16, GO WITH RESERVATIONS |
| 2026-11-24 | Proxy 3 test (`reports/01_proxy3_test.md`): 38.4%, TREND ONLY; proxies 2 and 3 discarded |
| 2026-11-24 | Project redefined in four modules; benchmarks verified and ECB series confirmed (`reports/02_benchmarks_and_module3_data.md`) |
| 2026-11-24 | Section 0 added (non-negotiable objective); every module now has a stated result for the analyst; foreign-currency liabilities recovered from the BIS statistics |
| 2026-11-24 | Module 2 completed (`reports/03_module2_weekly_index.md`): weekly index in four series, reproducible |
| 2026-11-24 | Module 3 completed (`reports/04_module3_ranking.md`): ranking of the 21 countries, stable under five weightings |
| 2026-11-24 | Module 4 completed (`reports/05_module4_scenarios.md`): scenarios by country, thresholds and a tool that accepts any amount. Module 1 remains |
| 2026-11-24 | Module 1 completed (`reports/06_module1_level.md`): baseline level EUR 16.7 billion, high 33.4. All four modules are complete |
| 2026-11-24 | Added the single command `src/run_all.py` and the generated summary `SUMMARY.md` |
| 2026-11-25 | Added module 5 (credit and transmission), the own level, rule R3, the module 2 test and flag, the dashboard and the automated tests. Redefined the three non-promises of section 4 |
| 2026-11-25 | Module 5 completed; own level: criterion not met, minimum of B1 published; rule R3 added; module 2 test null; dashboard published and automated tests passed |
| 2026-11-25 | Prompt 5. Section 0: the final product is a complete web application. The reference level becomes the own estimate (15.4; 8.9 - 23.1), by a decision taken after the results and as an exception to the criterion of report 08, which stays on record. Credit: uniform rule as the headline value, continuous variant defined before the calculation. Added the JSON data layer, the automatic update and the application |
| 2026-11-25 | Application completed (`reports/11_application.md`): nine sections, data layer in 29 JSON files, calculations in the browser matching the scripts on nine scenarios, browser tests passed. Monday automatic update written |
| 2026-11-25 | Automatic update running: first run on GitHub successful (data, 13 tests, build, browser tests, publication). Bybit does not respond from GitHub's servers: noted in report 11 |
| 2026-11-25 | Prompt 6. Criteria set before the results: Bybit out of the index for the whole history, with the measurement of the change; a single exchange rate for the whole programme; refinements of the application; English as the main language; module 6 on individual banks with the data of the EBA 2025 transparency exercise (only availability checked: 119 banks, data as at 30 June 2025, no currency breakdown) |
| 2026-11-25 | Prompt 6 completed (`reports/12_refinements_language_banks.md`): seven refinements applied; index without Bybit (on average -0.40 points for USDT, -0.12 for USDC); single exchange rate; application in English and Italian with 587 texts per language; module 6 with 85 banks in 18 countries and the "Banks" section. Tests: 22 Python, 31 for the application, browser on eleven pages in both languages |
| 2026-11-25 | Automatic update started by hand after prompt 6: all steps successful on GitHub (data, 22 tests, build, browser tests, publication). Index calculated on GitHub and index calculated locally identical over 102 weeks; no source partly updated. The application now always asks the server whether the data files have changed, so as not to show old data after an update |
| 2026-11-26 | Prompt 7. Criteria set before the work: no calculation changes; name "Euro Stablecoin Exposure Monitor"; graphic system in a single file; home page and About page; redesign of the ten sections; contrast and accessibility checks. "Before" screenshots saved (44, in `reports/figures/app/before`) |
| 2026-11-26 | Prompt 7 completed (`reports/13_design_and_identity.md`): graphic system in `web/src/styles/tokens.css`, name "Euro Stablecoin Exposure Monitor", home page with three results generated from the data, About page, ten sections redesigned in parallel and harmonised, two-page printable report, mobile navigation. No calculation changed. Tests: 22 Python, 42 for the application (10 new on contrast), browser on 13 pages in both languages and both themes |
| 2026-11-26 | Automatic update started by hand after prompt 7. First run: a browser-test check failed (closing of the mobile menu, because of a timing issue on GitHub's servers), so no publication by the Action, as intended. Fixed the menu, which now closes immediately on click, and the test. Second run: all steps successful |
| 2026-11-26 | Prompt 8. Criteria set before the work: five corrections (address, first drawing of the charts, selection on the map, neutral caveats below charts and tables, About), guided tour, README and methodological note in English, clean clone, verification of the scheduled update, version 1.0 |
| 2026-11-26 | Prompt 8 completed (`reports/14_closing.md`) and version 1.0 tagged: home page as the default address; charts complete at the first drawing, with a test comparing drawn points and data points with the tab visible and in the background; map with an initial selection; 33 caveats in a neutral style below charts and tables; guided tour in five steps; README and methodological note in English; clean clone successful following only the README. Scheduled update to be verified on Monday 30 November 2026 |
| 2026-11-26 | Automatic update started by hand after version 1.0: all steps successful on GitHub, including the generation of the methodological note and the new checks on the charts |
