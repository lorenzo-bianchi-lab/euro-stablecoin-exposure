# Report 11 - From the engine to the programme: corrections, data layer, application

Date: 2026-11-25. Method and completion criteria are in `SPEC.md` (sections
"Corrections to the engine" and "Data layer and application"), committed before this
report (commit `66ba8d6`).

Application: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/

## 1. Corrections to the engine

### 1.1 Reference level

The programme's reference level is now its own bottom-up estimate (B1, households
variant). The ESM assumption is the comparison; the individuals variant is the declared
upper extreme.

| | EUR bn |
|---|---|
| Minimum | 8.9 |
| **Centre** | **15.4** |
| Maximum | 23.1 |
| Declared upper extreme (individuals) | 42.0 |
| Comparison: ESM assumption, 7.5% and 15% share | 16.7 and 33.4 |

**This choice was made after the results.** The criterion set in report 08 required
at least two of the three approaches to agree within a factor of 3: this did not happen,
and the criterion provided for publishing only the minimum. The criterion and its outcome
remain on record; the decision to use the interval anyway is noted in SPEC and
in the application, next to the number. Readers must know that the interval is not a
measurement and is not confirmed by a second source.

### 1.2 Credit

The headline value is the uniform rule of ECB Working Paper 3199 (EUR 0.5 of
loans per euro of deposits), with the interval between the low and high coefficients. The
threshold variant remains as a sensitivity. The continuous variant is added, defined in
SPEC before it was computed: the coefficient is interpolated on the country's retail share
between two anchor points (82.4% and 94.9%), with no jump.

Euro area, rule R1, sight deposits of households and firms, full substitution:

| Scenario | Deposits to be replaced (EUR bn) | Credit reduction, uniform (EUR bn) | Low - high interval | Continuous | Threshold |
|---|---|---|---|---|---|
| Own estimate, centre | 15.4 | 7.7 | 2.6 - 18.4 | 4.3 | 3.4 |
| ESM high 2030 | 264.2 | 132.1 | 45.2 - 316.3 | 74.1 | 58.2 |

The interval is wide: there is a factor of 7 between the low and high coefficients. These
are orders of magnitude, not forecasts: coefficients estimated on individual banks,
applied to national aggregates.

### 1.3 Reproducibility

Library versions pinned in `requirements.txt`. The reproducibility test no longer
compares file hashes: it compares the values, column by column, and tolerates
one unit in the last decimal place written. A second test checks that the tolerance
does not let larger differences through.

## 2. Data layer

`src/export_app_data.py`, run by `run_all.py` after the modules, writes to
`web/public/data/` only the files that the application reads:

| File | Section that uses it |
|---|---|
| `overview.json` | Overview |
| `simulator.json` | Simulator, Map of Europe, Country sheet, Two-channel map, Compare and export |
| `countries/XX.json` (21 files) | Country sheet: composition since 2003 and position over time |
| `channels.json` | Two-channel map |
| `monitor.json` | Weekly monitor |
| `level.json` | Level estimate |
| `method.json` | Method and data (sources, limitations and discarded methods read from `SPEC.md`) |
| `meta.json` | Status of each source, outcome of the last update, warning |
| `geo/europe.geo.json` | Borders from Eurostat GISCO (Countries 2024, 1:20 million) |

Each file carries the schema version (1.0.0), the generation date, the data date, a
description and the meaning of the fields; the summary is in `web/public/data/README.md`,
which is generated. In total 29 data files, about 1 MB.

**A source that fails.** The module that uses that source fails without touching its
previous results; the others carry on. `meta.json` marks the source as "last valid
data" and the application shows a warning at the top of every page and the status of
each source in the "Method and data" section.

## 3. Application

React, Vite, TypeScript and ECharts, as proposed. A static site with no server, compiled
into `docs/` and served by GitHub Pages.

| # | Section | Status | What it does |
|---|---|---|---|
| 1 | Overview | Complete | Key indicators with interval, active flags, data date, ranking |
| 2 | Simulator | Complete | Amount, substitution, R1/R2/R3, deposit type, credit variant; uncertainty range; two charts by country and a table |
| 3 | Map of Europe | Complete | Choropleth with a choice of indicator, linked to the scenario; clicking a country opens its sheet |
| 4 | Country sheet | Complete | Composition of funding since 2003, position over time, components, effect of each scenario, quadrant |
| 5 | Two-channel map | Complete | Sight deposits against dollar funding, four selectable quadrants, table |
| 6 | Weekly monitor | Complete | Four series, absolute volumes, flags, long history, choice of period |
| 7 | Level estimate | Complete | Bands of the ECB survey, editable assumptions, comparison with the ESM over time |
| 8 | Compare and export | Complete | Two scenarios side by side, CSV of every table, printable report |
| 9 | Method and data | Complete | Sources with status and date, coefficients with their origin, limitations, discarded methods |

Throughout the application: side navigation (at the top below 860 pixels), light and
dark theme, addresses that preserve the scenario (for example
`#/simulatore?imp=300&sost=50&reg=R3&dep=T2&cred=continua`), every chart with title,
unit, source and values on mouse-over, caveats next to the numbers they
refer to. Screenshots of every section, at 1280 and at 390 pixels, are in
`reports/figures/app/`. (These screenshots were replaced in prompt 9 by the current set in
`reports/figures/app/screenshots/`; the earlier ones remain in the git history at tag
`v1.0`.)

### The simulator's uncertainty range

It combines three uncertainties, in both directions:

- the level: the chosen amount is scaled like the interval of the estimate (8.9 and 23.1
  around a centre of 15.4);
- the share funded with bank deposits: from 50% to 100%;
- for credit, the low and high coefficients.

It is not a confidence interval: it is the set of results obtained by pushing
all the assumptions in the same direction. The application says so next to the range.

## 4. Verification

| Check | How | Outcome |
|---|---|---|
| The application's calculations match the scripts | `tests/make_app_fixtures.py` computes nine scenarios with modules 4 and 5 (three for each rule R1, R2, R3: different amounts, substitution and deposit types); `web/tests/model.test.ts` compares, for each country, outflow, deposits lost, effect on funding, wholesale funding and the five credit variants, plus the level estimate | 16 tests out of 16 |
| Every section loads without console errors | `web/tests/e2e.mjs`: Chrome, at 1280 and at 390 pixels | 9 sections out of 9, 0 errors |
| No horizontal overflow at 390 pixels | Same script: content width against window width | 0 pixels in all sections |
| The scenario is preserved in the address | Same script: opens an address with a scenario, reads controls and result, changes section | Passed |
| Tests of the engine and the data layer | `tests/test_program.py` | 13 tests out of 13 |

The first round of browser tests found a console error in the Overview: the site icon
was missing and the browser recorded a 404 response. The icon was added.

## 5. Automatic update

`.github/workflows/weekly-update.yml`: every Monday at 06:00 UTC, or manually. It runs
`run_all.py` and the Python tests (which include the comparison between application and
scripts), compiles the application, runs the browser tests, and only if they pass commits
data and application and asks GitHub Pages to republish. If a module fails, the update
continues with the last valid data; if the tests fail, nothing is
published.

**Status at 2026-11-25: running.** The first upload had been rejected by GitHub
because the access in use lacked the `workflow` permission; once the permission was
granted, the Action was uploaded and started manually.

First run ([run 45646686279](https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure/actions/runs/45646686279)), lasting 5 minutes:

| Step | Outcome |
|---|---|
| Data update | Complete: all modules succeeded, no source stopped |
| Tests of the calculations and the data layer | 13 of 13, including the comparison between application and scripts and reproducibility (on Linux, with data produced there) |
| Compilation of the application | Succeeded |
| Browser tests | 9 sections out of 9, 0 console errors, 0 pixels of overflow at 390 pixels |
| Publication | Automatic commit `0b711f2`, 67 files |
| Site rebuild | Requested and completed; the site shows the data of this run |

The case of a source that fails completely was checked locally: with module 2
marked as failed, `meta.json` carries the warning "Sources not updated in the last
run, shown with the last valid data" and the source with the date of its last data.

**One source does not respond from GitHub's servers: Bybit.** From GitHub's machines its
five pairs receive "403 Forbidden"; from the local computer they respond. Consequences:

- for the weeks already downloaded, the Bybit data in the repository remain;
- for the new weeks computed by the Action, Bybit will be missing. It weighs 0.9% of the
  index's total volumes in the last four weeks, but it is growing: 1.8% in the last one.
  The rule holds back a week when the missing exchanges weighed on average more
  than 2% in the four previous weeks: today Bybit is below that, so the week is
  published without it. Bybit lists mainly pairs against the euro (up to 2.5% of volumes
  against the euro), so the EUR share published by the Action will be slightly lower
  than that of a local run. If its average weight exceeds 2%, the new weeks
  will be held back and the index will stay at the last valid week, flagging this;
- the application flags it: the source is marked "partly updated", a warning appears
  at the top of every page and next to the charts of the Weekly monitor, and "Method and
  data" lists the pairs with no response. Pairs that have never returned data (Bitget
  RONUSDT) are listed separately and do not trigger the warning.

The block was not circumvented. Possible remedies, not applied: running the
update from a computer in Europe, or removing Bybit from the index for the whole
series, so that local and automatic runs coincide.

The scheduled Monday run has not yet been observed: so far the Action has only been
started manually. GitHub suspends scheduled runs after 60 days without activity in the
repository.

## 6. Technical choices

- **Hash addresses** (`#/section?parameters`). GitHub Pages does not rewrite
  addresses: with the hash, every address opens directly, without a server.
- **Compilation into `docs/` on the main branch.** It is the GitHub Pages configuration
  already in use: no repository setting to change.
- **A single module for the calculations** (`web/src/lib/model.ts`), with no dependencies
  on the interface: it is the one the tests compare with Python.
- **Data read at start-up, country sheets on demand.** Start-up loads three files; a
  country's time series are downloaded only when its sheet is opened.
- **Borders in the repository.** The map does not depend on GISCO at the time of use; the
  polygons are reduced to Europe and rounded to three decimals (about 100 metres).
- **Chrome already installed for the browser tests** (`playwright-core`), instead of
  downloading a dedicated browser.
- **CSV with semicolons and decimal commas**: the files open directly in an Italian
  spreadsheet.

## 7. Limitations and things not done

- The compiled application is a single JavaScript file of about 850 kB (280 kB compressed):
  it has not been split by section.
- The graphics are basic, as requested; no attention was given to aesthetics.
- The printable report covers scenario A, not the A-B comparison.
- Borders at the 1:20 million scale make Malta and Luxembourg very small on the map:
  their values can be read in the table alongside.
- The ESM assumption appears with two close values: EUR 16.7 billion in the Level
  estimate (current exchange rate) and 16.1 among the Simulator's preset levels (end-September
  exchange rate, the one used for the balance sheets). This is stated but may confuse.
- The browser tests check loading, console, width and addresses, not the
  visual correctness of each chart: that was checked by eye on the screenshots.

---

**What this adds to the final programme**: it turns the results of the modules into a
tool that an analyst opens from an address, without installing anything: they choose a
scenario, see the effect on deposits, funding and credit for each country with its
uncertainty range, compare it with another, export it and share it; and the data
update themselves every week.
