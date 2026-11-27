# 13 - Design and identity

Date: 2026-11-26 (prompt 7). No calculation changed in this prompt: the modules, the data
layer and the application model are those of prompt 6, and the files in `data/` and
`web/public/data/` were not touched. Criteria in `SPEC.md`, committed before the work
(commit `88f4130`) together with the "before" screenshots.

Application: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/

## 1. Visual system

Everything is defined in a single file, `web/src/styles/tokens.css`. The components
(`base.css`) and the charts (`components/Chart.tsx`) read those values and define no
others.

| Item | Choice |
|---|---|
| Name | Euro Stablecoin Exposure Monitor. Original mark (three bars in an open circle); no logo, colour or brand of any institution |
| Primary colour | Deep blue `#163b6e` (dark theme: `#9bbcf0`) |
| Single accent | Copper `#a8481f` (dark theme: `#f0a070`): flags, selection, compared series |
| Backgrounds and text | Page `#f5f6f8`, white cards, text `#0f1b2d`; dark theme with its own values (`#0b1320`, `#121c2c`, `#e9eef5`), not an inversion |
| Headings | Source Serif 4 |
| Text and numbers | Inter, with tabular figures |
| Scale | Spacing in multiples of 4 px, three radii, three shadows, focus ring in the accent colour |
| Chart series | Six colours in a fixed order; each series also has its own stroke and shape |
| Map | Five classes of blue from light to dark, legend with the end values written |
| Grids and labels | Light grids; labels written at the end of lines and next to bars instead of legends, where there is room |

The fonts are local files (SIL Open Font License), the icons are Lucide (ISC licence). At
the bottom of every page: "University project, not affiliated with the ECB" (in Italian:
"Progetto universitario, non affiliato alla BCE") (replaced in prompt 9 by: Independent
university project (ESCP Business School). Not affiliated with any institution whose
data it uses.)

## 2. How it was done

First the visual system, the common components, the page frame, the home page and the
About page. Then ten agents in parallel, one per section, each allowed to touch only the
file of its own section and its own two translation files, and required to build in a
folder of its own and to look at its own screenshots. To make this possible, the texts
were split into one file per section (`web/src/i18n/en/`, `it/`). Finally the
harmonisation: requests from the agents brought into the common files, and corrections
arising from the review of the screenshots.

## 3. Status of the pages

| Page | Status | Highlighted result and main changes |
|---|---|---|
| Home (new) | Complete | One sentence on what the programme does; three results whose sentences are templates filled with the current data (level, most exposed countries by channel, high scenario); preview map; six entry points to the tools |
| About (new) | Complete (author added in prompt 9) | Purpose, independence from institutions, author (Lorenzo Bianchi, added in prompt 9), sources with attribution, software and licences |
| Overview | Complete | Estimated level with the three indicators beside it; ranking as horizontal bars with the value written |
| Simulator | Complete | Scenario panel fixed on the left; deposits to be replaced highlighted; full-width table |
| Map of Europe | Complete | Lambert equal-area projection, five classes with a readable legend, selected country with an accent border and a panel of its values, then a button for the country sheet |
| Country sheet | Complete | Position in the ranking with a sentence saying what determines it; funding as stacked areas with sight deposits emphasised |
| Banks | Complete | Credit per euro of outflow highlighted; classes distinguished by shape; compact nine-column table with twenty rows per page; bank sheet |
| Two-channel map | Complete | Correlation between the channels highlighted; sources distinguished by shape; quadrant names in the corners of the chart |
| Weekly monitor | Complete | Latest EUR share with its change and status in words; lines with direct labels; paginated tables |
| Level estimate | Complete | Assumptions in a fixed panel; estimate with the formula and the current values; bars with the value written |
| Compare and export | Complete | Difference between B and A highlighted; two-page A4 report with header, data date, scenario and page number |
| Method and data | Complete | Status of the latest update highlighted; in-page table of contents; statuses written as labels; long tables paginated |

Common to all: side navigation in groups with icons; below 1024 pixels a top bar, a
bottom bar with four items and a full-screen menu; loading states (skeletons) and error
states (message and button); short transitions when values change.

## 4. Checks

| Check | Outcome |
|---|---|
| Python tests | 22 out of 22, unchanged |
| Application calculations against the scripts | 20 out of 20, unchanged |
| Translations | 12 out of 12: they now read the files by section, and check that no key is in two files |
| Contrast on the tokens (new) | 10 out of 10: text at least 4.5:1 on every background on which it appears, graphic elements and series at least 3:1, in both themes |
| Contrast on the rendered text (new) | 0 texts below the threshold in 13 pages, light and dark theme |
| Browser, 13 pages in both languages | 0 console errors; 0 px of overflow at 390 px; 0 clipped tables out of 25 at 1280 px; 34 caveats, all closed at start-up; 19 charts, all with alternative text; footer line at the bottom of every page |
| Keyboard | The first Tab leads to "Skip to content"; on five pages all the elements reached (up to 45 per page) have a visible focus |
| Reduced motion | With the preference active: no animation in the components or in the charts |
| Mobile navigation | Bottom bar, menu with the twelve items, closing with Esc |
| Printable report | Two A4 pages in the PDF generated by the test, with the header on both |
| Sharing | Title, description, icon and preview image present |

Changes to the existing tests, made necessary by the redesign: the list of pages includes
the two new ones; the simulator outflow is read from the highlighted result and not from
the first indicator; banks are counted from the declared total, because the table is
paginated; the keyboard test opens a new page for each section; the Home and About pages
are exempt from the requirement to have caveats; the translations test reads the files
by section. No check was removed.

### Page weight

Bytes downloaded when the page is the first one opened (uncompressed; compressed in
brackets).

| Page | Before | After |
|---|---|---|
| Home | - | 1,114 kB (433) |
| Overview | 827 kB (274) | 907 kB (365) |
| Simulator | 827 kB (274) | 906 kB (365) |
| Map of Europe | 950 kB (314) | 1,116 kB (433) |
| Banks | 870 kB (288) | 951 kB (379) |
| Weekly monitor | 876 kB (286) | 956 kB (376) |
| Compare and export | 225 kB (73) | 374 kB (185) |
| Method and data | 232 kB (77) | 381 kB (188) |
| About | - | 362 kB (181) |

The pages are heavier: about 90 kB more each, compressed. Almost all of it comes from the
two fonts (97 kB, not compressible) and from the texts in the two structures. The chart
library registers only bars, lines and points (550 kB); the map modules (88 kB) are
downloaded only by the two pages that have a map. Pages without charts do not download
the library. The full figures are in `reports/figures/app/page_weight_before_redesign.json` and
`page_weight_after_redesign.json`.

### Screenshots

`reports/figures/app/before` (44) and `after` (52): every page at 1280 and 390 pixels,
light and dark theme. (These screenshots were replaced in prompt 9 by the current set in
`reports/figures/app/screenshots/`; the earlier ones remain in the git history at tag
`v1.0`.) I looked at all of them: at 1280 pixels in the light theme one by one; in the
dark theme the map and the two-channel map one by one and the other pages side by side
at reduced size; at 390 pixels light and dark side by side.

Corrected during the review:
- on the map the country with the minimum value fell outside the classes because of
  rounding and appeared as "outside the euro area";
- the lightest class of the map was almost the same as the grey of the countries outside
  the area;
- two chart series had the same luminance in the dark theme;
- in the full-page capture the mobile bar appeared halfway down the page.

## 5. What did not succeed, and limits

- **Heavier pages**, as above.
- **Report footer**: it follows the content and is not fixed at the bottom of the sheet.
  Fixing it pushed the report to three pages.
- **Virtual scrolling**: not done; long tables use pagination.
- **Map by keyboard**: the map cannot be navigated with the keyboard. The same country
  can be selected from the table of values, which is reachable.
- **Two-channel map**: the labels of France, Ireland and the Netherlands partly overlap,
  because the points almost coincide.
- **Author and code licence**: added in prompt 9 (author Lorenzo Bianchi, MIT licence).
  **Terms of use of the sources**: reported in general form; they should be reread on
  the website of each source before a final publication.
- **"Source with problems" status** in Method and data: not checked on screen, because
  today all the sources are updated.
- **Scheduled Monday run**: not yet observed. The run started manually after the
  redesign failed the first time on a single check (the closing of the mobile menu,
  because of a timing issue on GitHub's servers) and published nothing, as intended when
  a test fails. After the menu and the test were corrected, it succeeded in all steps.

---

**What this adds to the final programme**: the same tool now has a name, a home page
that states the three results with the day's data and a presentation that an analyst can
read and print, with contrast, keyboard use and printing verified by the tests.
