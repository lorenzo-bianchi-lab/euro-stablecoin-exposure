# Changelog

All notable changes to Euro Stablecoin Exposure Monitor. Versions are tagged in git
(`v1.0`, `v1.1`) and published as GitHub releases. No version so far has changed a
calculation or a result: the figures change only with the weekly data update.

## Version 1.1 (27 November 2026)

Repository ready for delivery. No calculation and no result changes.

**Identity**
- Described everywhere as an independent university project (ESCP Business School);
  new footer: "Independent university project (ESCP Business School). Not affiliated
  with any institution whose data it uses."
- Sole author Lorenzo Bianchi, in the README, the About page, the methodological note
  and `CITATION.cff`.
- Code released under the MIT licence (`LICENSE`).
- `DATA_SOURCES.md`: source, terms of use and attribution of every dataset. The map now
  credits "© EuroGeographics for the administrative boundaries".
- Repository, application and links moved to the GitHub account `lorenzo-bianchi-lab`:
  https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/

**Language**
- The whole repository is in English: SPEC, reports, summary (`SINTESI.md` is now
  `SUMMARY.md`), code comments and docstrings, workflow names, automatic commit
  messages, file and folder names. Release notes became this changelog.
- The JSON files of the data layer have English names (for example `simulatore.json` is
  now `simulator.json`, `paesi/` is now `countries/`) and English keys (data-layer schema
  3.0.0: `banche` is now `banks`, `generato_il` is now `generated_on`, and so on; the
  values are identical). Identifiers that appear in shareable addresses keep their
  names, so links made with version 1.0 still open the same scenario. The application
  keeps English as default and Italian as an option.
- The CSV files in `data/raw` and `data/processed` have English column names (for
  example `paese` is now `country`, `deflusso_mld` is now `outflow_bn`); the values are
  byte-identical. Extracts stored as the provider publishes them and the archived data
  keep their names.

**Checks**
- New workflow "Tests" on every push and pull request: Python formatting and static
  checks (Ruff), TypeScript formatting (Prettier), static checks (ESLint) and type
  checks, Python tests, application tests, build and browser tests.
- Every module in `src/` opens with an English header describing it.

**Repository**
- README with screenshots, status badges and a "Key findings" section.
- A current, compressed set of screenshots in `reports/figures/app/screenshots/`; the
  screenshots taken before and after the redesign of version 1.0 remain in the git
  history at tag `v1.0`.
- Data of the methods discarded at the start moved to `data/archive/`, with a README.

## Version 1.0 (26 November 2026)

First complete version of Euro Stablecoin Exposure Monitor.

**The application**
- Twelve pages in English and Italian: home, overview, simulator, map of Europe, country
  sheet, banks, two-channel map, weekly monitor, level estimate, compare and export,
  method and data, about.
- Scenario calculations run in the browser and are tested against the Python modules;
  every address is shareable and keeps scenario and language.
- A guided tour in five steps, a printable two-page report, CSV download of every table,
  light and dark theme, usable from 390 px.
- A methodological note in English (PDF, two pages) with sources, formulas and limits.

**The engine**
- Six modules: level (ESM assumption and own bottom-up estimate), weekly index of trading
  against the euro, exposure ranking of 21 countries, scenarios, credit and two-channel
  map, individual banks from the EBA transparency exercise.
- One command updates everything; a weekly automatic update keeps the last valid data
  when a source does not respond and flags it.

**Quality**
- 22 Python tests, 42 application tests (calculations, translations, colour contrast)
  and a browser test over 13 pages in both languages and themes: console errors,
  overflow, tables, contrast of rendered text, keyboard, reduced motion, mobile
  navigation, complete drawing of every chart also with the tab in the background.
- Verified from a clean clone following only the README.

**Changes since the previous state (prompt 8)**
- The address without a section opens the home page.
- Charts are drawn completely at once: no entrance animation, so a background tab, a
  print or a capture never shows a half-drawn chart.
- The map opens with the highest-value country selected.
- Caveats sit under the chart or table they refer to, in a neutral style; only an active
  flag is yellow.

**Known limits**
- The author's name and the licence of the code were still to be filled in (added in
  version 1.1).
- The level is a survey-based estimate, not a measurement; credit figures are orders of
  magnitude. The full list is in the README and in "Method and data".
- The first scheduled (Monday) run of the automatic update has not yet been observed;
  the README explains how to check it.
