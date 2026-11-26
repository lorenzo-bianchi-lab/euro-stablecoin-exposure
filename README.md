# Euro Stablecoin Exposure Monitor

A web application that estimates how many dollar stablecoins (USDT, USDC) euro area
residents hold and shows what each level of adoption would mean for bank deposits,
wholesale funding and credit, country by country and bank by bank.

University project (ESCP Business School, economics and finance), addressed to analysts
at the European Central Bank. **It is not affiliated with the ECB** or with any other
institution whose data it uses.

- **Application**: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/
- **Methodological note** (PDF, two pages): https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/methodological-note.pdf
- **Specification and decision log**: [SPEC.md](SPEC.md) (in Italian)
- **Reports**, one per test and module: [reports/](reports/) (in Italian)
- **Release notes**: [RELEASE_NOTES.md](RELEASE_NOTES.md)

## What it does

1. **Level.** Estimates a range for the dollar stablecoins held in the euro area (centre
   about EUR 15 billion) from an ECB consumer survey, with every assumption adjustable,
   and compares it with the ESM assumption.
2. **Exposure.** Ranks the 21 national banking systems by how exposed their funding is to
   a substitution of deposits, and places each on two channels: sight deposits and
   dollar funding.
3. **Scenarios.** For any amount held, computes by country the deposits to be replaced,
   the extra wholesale funding and the reduction in credit, with a range. All scenario
   calculations run in the browser.
4. **Banks.** Applies the same scenario to 85 euro area banks from the public EBA
   transparency exercise.
5. **Monitor.** Tracks the weekly share of stablecoin trading against the euro on 24
   exchanges, with a rule that flags unusual weeks.
6. **Export.** Compares two scenarios, downloads every table as CSV and prints a
   two-page report.

The reference is ECB Working Paper No 3199, "Stablecoins and monetary policy
transmission" (March 2026). Scenarios are assumptions, not forecasts.

## Open it

Open the link above. No account, no installation; it works from a phone (390 px) up.

- English by default; **Italiano** in the side bar. The choice is kept in the address
  (`?lang=it`), like the scenario, so any page can be shared as a link.
- Light and dark theme follow the system; the side bar has a switch.
- **Guided tour**: "Take the guided tour" on the home page. Five steps, also usable as a
  script for a demo:
  1. *Home*: the three results at the latest data.
  2. *Simulator*: pick the preset "ESM high 2030" and read deposits and credit.
  3. *Map of Europe*: the same scenario by country; the top country is already selected.
  4. *Banks*: the scenario down to the single bank; open a bank's sheet.
  5. *Weekly monitor*: the index of trading against the euro and its flags.

## Run it locally

Tested with Python 3.14, Node.js 24 and Google Chrome (Chrome is needed only for the
browser tests, the screenshots and the PDF note).

```bash
git clone https://github.com/sqsw5ryvdh-netizen/euro-stablecoin-exposure.git
cd euro-stablecoin-exposure
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt     # pinned versions
cd web
npm ci
npm run dev                                   # the application at http://localhost:5173
```

The repository already contains the data and the built application (`docs/`), so the
application also opens from any static server without building:
`python3 -m http.server -d docs 8000`, then http://localhost:8000.

## Update the data

```bash
.venv/bin/python src/run_all.py               # all modules from the sources, about 5 minutes, no API keys
.venv/bin/python src/run_all.py --offline     # recompute from the data already downloaded
cd web
npm run note                                  # methodological note with the new figures
npm run build                                 # application into ../docs
```

`run_all.py` runs the modules in order, then writes the one-page summary
([SINTESI.md](SINTESI.md), in Italian) and the JSON files the application reads
(`web/public/data/`). If a source does not respond, the module that uses it fails, its
previous results are kept, the others go on, and the application flags the source in the
side bar and in "Method and data".

**Automatic update.** A GitHub Action ([aggiornamento.yml](.github/workflows/aggiornamento.yml))
does all of the above every Monday at 06:00 UTC, runs every test and publishes. If a test
fails nothing is published and the site stays as it was.

**How to check that the scheduled run started by itself.** Scheduled runs can start
late, and GitHub disables schedules after 60 days without repository activity.

- On GitHub: *Actions* → *Aggiornamento settimanale*; a scheduled run shows the event
  `schedule` (manual ones show `workflow_dispatch`).
- From a terminal: `gh run list --workflow aggiornamento.yml --event schedule --limit 5`
- In the repository: a commit by `github-actions[bot]` titled
  "Aggiornamento automatico dei dati (date, completo)" on that Monday.
- In the application: "Data updated on ..." in the side bar shows that Monday.

To start a run by hand: `gh workflow run aggiornamento.yml`, or *Run workflow* on the
same page.

## Tests

```bash
.venv/bin/python -m unittest discover -s tests -v   # balance sheets, scenarios, data layer, banks, reproducibility
cd web
npm test            # the application's calculations against the Python modules; translations; colour contrast
npm run build
npm run e2e         # every page in the browser: both languages, both themes, 1280 and 390 px
npm run shots       # screenshots of every page (optional)
```

The browser test checks, among other things, that no page logs an error, that every
chart is completely drawn after three seconds (also with the tab in the background),
that text meets AA contrast, that every page works from the keyboard and that the
printable report is two pages.

## Repository structure

| Path | Content |
|---|---|
| `src/` | Python modules: `module1_level.py` to `module6_banks.py`, `level_own.py`, `run_all.py`, `summary.py`, `export_app_data.py` |
| `data/raw/` | Data as downloaded from the sources (for the EBA exercise, the rows used) |
| `data/processed/` | Tables and summaries produced by the modules |
| `web/` | The application: React, Vite, TypeScript, ECharts |
| `web/src/styles/tokens.css` | The design system: colours, type, spacing, chart palette, both themes |
| `web/src/i18n/` | Interface texts in English and Italian, one file per section |
| `web/public/data/` | The data layer: JSON files (numbers and codes) read by the application |
| `web/tests/` | Tests of the application, screenshots, methodological note |
| `docs/` | The built application, published with GitHub Pages |
| `reports/` | Reports in Italian; `reports/figures/app/` holds screenshots and test results |
| `tests/` | Python tests |
| `.github/workflows/` | The weekly automatic update |

No API keys are needed: every source is public and free. If keys are ever added they go
in `.env` (excluded from git; see `.env.example`).

## Limits

- **No measurement of residence.** Holdings by euro area residents are not observed.
  The level is a survey-based estimate from 11 countries extended to 21, and two other
  routes attempted did not confirm it.
- **No country-level adoption.** The allocation rules distribute a total; they do not
  measure national holdings.
- **No causal estimate.** Credit effects apply coefficients published in ECB Working
  Paper 3199, estimated on individual banks, to national aggregates and to consolidated
  banks: orders of magnitude, not forecasts.
- **No early warning.** The flagging rule marks unusual weeks; a pre-registered test
  found no predictive content for deposits.
- **Rankings describe funding structure**, not the probability of outflows nor the
  soundness of any banking system or bank.
- **Bank data** are public data on consolidated groups dated June 2025, with no currency
  breakdown; three countries have no bank in the sample.
- **Not covered**: over-the-counter and peer-to-peer trading, decentralised finance,
  stablecoins other than USDT and USDC, future adoption.

The full list, with the methods tried and discarded, is in [SPEC.md](SPEC.md) and in
"Method and data" in the application.

## Authors and licence

Authors: [NAMES TO BE INSERTED], economics and finance, ESCP Business School.
The licence of the code is to be chosen by the authors. Typefaces: Source Serif 4 and
Inter (SIL Open Font License 1.1); icons: Lucide (ISC); charts: Apache ECharts
(Apache 2.0). Country boundaries: Eurostat GISCO, © EuroGeographics.
