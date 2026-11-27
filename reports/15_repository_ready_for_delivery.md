# 15 - Repository ready for delivery

Date: 2026-11-27 (prompt 9). No calculation and no result changed; the commit history
was not rewritten. Criteria in `SPEC.md` ("Repository ready for delivery").

- Application: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/
- Repository: https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure
- Release: https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure/releases/tag/v1.1

## 1. Status of each point

| # | Item | Status | How |
|---|---|---|---|
| 1 | Framing | Done | README, home and About pages, footer, methodological note, repository description, `CITATION.cff` and SPEC describe an independent university project (ESCP Business School). The statements that the project was made for, or addressed to, the ECB were removed from SPEC (sections 0 and 1). The footer reads "Independent university project (ESCP Business School). Not affiliated with any institution whose data it uses." The ECB remains only as a source of data and as the author of Working Paper 3199 and of the publications cited |
| 2 | Account | Done | Remote moved to `lorenzo-bianchi-lab` and push checked. Every link in the repository, the application and the note points to the new account. GitHub Pages serves the application at the new address (HTTP 200); the old address no longer responds (404) |
| 3 | Licence and author | Done | `LICENSE` (MIT, copyright Lorenzo Bianchi), `CITATION.cff` with Lorenzo Bianchi as the only author; Lorenzo Bianchi as the only author in README, About page and note. Placeholders for author names removed everywhere, also from SPEC and from the reports. `DATA_SOURCES.md` gives, for every dataset and service (53 rows), the provider, what the project does with it and where it is kept, the terms of use and the attribution; each terms page was opened on the provider's site on 27 November 2026, and the pages that could not be read are marked as not checked |
| 4 | Language | Done | SPEC, the 15 earlier reports, the summary (`SUMMARY.md`, still produced by `src/summary.py`), comments and docstrings of the 21 Python modules and of the application, chart labels, workflow names ("Tests", "Weekly update"), the automatic commit message ("Automatic data update (date, complete)"), file and folder names. `RELEASE_NOTES.md` is now `CHANGELOG.md`. The application keeps English as default and Italian as an option |
| 4a | Keys of the data layer | Renamed | 227 Italian keys of the JSON files the application reads are now English (data-layer schema 3.0.0). A script renamed the keys of the previous files and compared them with the new ones: equal in all 30 files apart from `schema` and the generation time. All tests passed |
| 4b | CSV column names | Renamed | 511 header cells in 38 CSV files of `data/raw` and `data/processed`, with every script that reads or writes them, including the download paths of the weekly update. File bodies are byte-identical; the data layer and `SUMMARY.md` unchanged apart from run times. All tests passed, and the first weekly update on GitHub after the change succeeded |
| 5 | Repository settings | Done | Description "Dollar stablecoins and euro area banks: estimated holdings, deposit and credit scenarios by country and by bank, weekly monitor. Independent university project (ESCP Business School)."; website: the application; 14 topics (stablecoins, monetary-policy, banking, euro-area, data-visualization, financial-stability, bank-deposits, open-data, usdt, usdc, echarts, python, react, typescript). Releases v1.0 and v1.1 visible |
| 6 | README | Done | Home page screenshot (light theme) and badges for tests, version, licence and weekly update at the top; three small screenshots (simulator, map, banks); "Key findings" with six results at the data of 27 November 2026 |
| 7 | Continuous checks | Done | `.github/workflows/ci.yml` ("Tests"), on every push and pull request: Python formatting and static checks, TypeScript formatting, lint and type checks, Python tests, application tests, build, browser tests; the browser test results are kept as an artifact |
| 8 | Clean-up | Done | `reports/figures/app/before` and `after` deleted (they remain at tag `v1.0`); new compressed set in `reports/figures/app/screenshots/`: 13 pages at 1280 px in both themes, four at 390 px, four README images; 6.7 MB against 12 MB before. No empty folders. Data of the discarded methods moved to `data/archive/` with a README; the eight scripts that read them point there |
| 9 | Code quality | Done | Python: Ruff 0.17.6 (formatter; rules E, F, W, I, B, no exception), pinned in `requirements-dev.txt`, configured in `pyproject.toml`. TypeScript: Prettier 3.10.1, ESLint 10.15.0 with typescript-eslint and the React hooks rules, `tsc`. All run in the workflow. Every module in `src/` opens with an English header: purpose, inputs, outputs, usage |
| 10 | Final check and version 1.1 | Done | Repository cloned from GitHub into an empty folder and the README commands run in order: environment and pinned dependencies, `npm ci`, development server, static server on `docs/`, data update from the sources (191 seconds), offline recomputation, note, build, every test and check, screenshots. Everything succeeded at the first attempt. Every link in the README responds. Tag `v1.1` and GitHub release with the notes from `CHANGELOG.md` and the methodological note attached |

On point 9: the static checks found no error in the results. The fixes were of form
(long lines, `zip` without `strict`, unused variables) and, in the application, three
state resets moved out of effects. The results are the same: the application tests
compare the calculations in the browser with the Python modules, and they pass.

## 2. Checks

| Check | Outcome |
|---|---|
| Python tests | 22 out of 22 |
| Application tests (`npm test`) | 42 out of 42 |
| Formatting and static checks (Ruff, Prettier, ESLint, `tsc`) | No finding |
| Browser, 13 pages in both languages and both themes | All checks passed; points drawn equal to data points on every chart, with the tab visible and in the background |
| "Tests" workflow on GitHub | Passed on its first run (5 minutes); passed again after moving the GitHub actions to their Node 24 versions, which removed the only warning |
| "Weekly update" workflow on GitHub, started by hand | Passed twice after the renames (data from the sources, tests, note, build, browser tests, publication), the second time on the Node 24 versions of the actions; each run committed "Automatic data update (2026-11-27, complete)" |
| Clean clone following only the README | Succeeded without corrections: 22 Python tests, 42 application tests, static checks, build and browser tests |
| Links in the README | 26 out of 26 respond (HTTP 200): the application and its sections, the note, badges, workflows, release and every file linked on GitHub; the two local addresses (`localhost:5173` and `localhost:8000`) responded in the clean clone |

## 3. Italian names kept, and why

- **Shareable addresses.** URL parameters (`imp, sost, reg, dep, cred, b_*, uni, caso,
  ult, usd, det, ind, sel, bc, cls, q, tok, per, rep, lang, tour`) and the values they
  take: scenario ids (`S0_oggi`, `P_minimo`, `P_centrale`, `P_massimo`, `M1_oggi_base`,
  `M1_oggi_alto`, `ESM_oggi`, `S1_base_2030`, `S2_alto_2030`,
  `S3_alto_2030_quota_doppia`), credit variants (`uniforme`, `continua`, `soglia`,
  `basso`, `alto`), level bands (`minimo`, `centrale`, `massimo`), units (`famiglie`,
  `individui`), series ids (`usdt_senza_coinbase`, `usdc_senza_coinbase`) and the old
  Italian section names, which still open the right page. Renaming them would break the
  links made with version 1.0. Where these ids are keys of the data layer or part of a
  CSV column name (`S0_oggi|R1|outflow_bn`), they keep their name.
- **Step names** of the update (`modulo1` to `modulo6`, `livello_proprio`,
  `test_modulo2`), used as keys in `meta.json` and as translation ids.
- **Keys of the intermediate files** `data/processed/*.json`, read only by the Python
  modules: neither data layer nor CSV columns.
- **Values compared by the code**: flag states ("segnale", "da verificare", "nessuno",
  "storico insufficiente"), the run mode "senza rete", statuses of sources and
  downloads, the Italian country names stored in the tables, "BSI trimestrale", the BSI
  series ids, the descriptions in the coverage tables of the two probes.
- **Internal names** of the application code (for example the fields of the model
  results), the keys of the test fixtures, and the browser storage key of the theme
  (renaming it would reset the theme saved by users).
- **`data/archive/`**: frozen data of the discarded methods, including the Italian
  outcome labels of tests H1 and proxy 3 stored in their JSON files.

## 4. What could not be done, and limits

- **Scheduled update**: still not observable. The first Monday on which it can start by
  itself is 30 November 2026; the README says how to check it.
- **History**: commit messages before prompt 9 remain in Italian, because the history is
  not rewritten.
- **Terms not read.** The terms pages of Coinbase, Bitvavo, Bitfinex, Indodax, BTC
  Markets, Bitso, Bybit and OAM refused automated access or showed no text; those of
  Bitstamp, Binance.US, Upbit, Bithumb and BtcTurk were read only in part. They are
  marked in `DATA_SOURCES.md` and have to be opened in a browser.
- **Points to review.** `DATA_SOURCES.md` closes with 13 points where the terms read
  restrict storage, redistribution, derived indexes or commercial use: above all the
  daily volumes per exchange pair stored in the public repository, which several
  exchanges' terms do not allow to republish, the DefiLlama series (personal,
  non-commercial licence) and the GISCO boundaries (non-commercial use only). They are
  decisions for the author, so nothing was removed: removing a file now would not
  remove it from the history, which is not rewritten.

---

**What this adds to the final programme**: it makes it deliverable. A reader finds one
author, one licence, one language and the terms of every source; every push is checked
by the same tests that guard the weekly update; and version 1.1 was rebuilt from a clean
clone following only the README.
