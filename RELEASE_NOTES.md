# Release notes

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
- Authors' names and the licence of the code are still to be filled in.
- The level is a survey-based estimate, not a measurement; credit figures are orders of
  magnitude. The full list is in the README and in "Method and data".
- The first scheduled (Monday) run of the automatic update has not yet been observed;
  the README explains how to check it.
