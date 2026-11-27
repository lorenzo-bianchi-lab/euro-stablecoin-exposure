# 02 - Verification of the benchmarks and feasibility of module 3

After tests [00](00_h1_feasibility_test.md) and [01](01_proxy3_test.md) the project was redefined
into four modules (see [SPEC.md](../SPEC.md)). This document carries out two preliminary
checks: that the external figures used as a level really exist in the original
documents, and that the banking data for module 3 can be downloaded for free.

Run on 2026-11-24.

## Part A - Benchmarks verified against the originals

Each figure below has been re-read in the original document, which was downloaded and
searched as text. The "Where" column gives the exact location. Page numbers are those
printed on the document; the page of the PDF file is given in brackets where it differs.

### A.1 The two sources for module 1

**ECB, Economic Bulletin No 7/2026, box "Who holds stablecoins? New evidence on
euro area consumer holdings"** (Born, Evrard, Georgarakos, Kenny, Lambert, Meyer, Pairan,
Zannier). [Original text](https://www.ecb.europa.eu/press/economic-bulletin/focus/2026/html/ecb.ebbox202607_08~f4ddf0117c.en.html).

| Figure | What exactly it measures | Period | Sample | Where |
|---|---|---|---|---|
| 5% | Share of consumers who report that they or a member of their household own stablecoins | August 2025 | Thematic module of the ECB CES survey, 11 largest euro area countries, population-weighted data | Text preceding Chart B; Chart B, panel a |
| 13% (9.8% in November 2024) | Share of consumers who own crypto-assets | August 2025 | as above | as above |
| "more than a third" | Stablecoin holders as a share of all crypto-asset holders | August 2025 | as above | as above |
| USDT 17%, USDC 12%, EURC 10% | Share of consumers with crypto-assets who hold each stablecoin (multiple answers) | August 2025 | 1,286 respondents who own crypto-assets | Text preceding Chart C; Chart C, panel a |
| about 10% | Stablecoin holders with at least EUR 10,000 invested (estimate) | November 2025 | November CES thematic module | Text preceding Chart B; Chart B, panel b |

What the box does **not** contain:

- an overall euro amount of stablecoins held by euro area consumers;
- a euro area share of global stablecoin supply;
- the total sample size (only that of the 1,286 crypto-asset holders appears);
- the average portfolio share in numerical form: it is shown only in Chart C, panel b.

The 5% is therefore a **prevalence** (how many people), not a **level** (how much
value). The ECB itself describes the data as "experimental".

**ESM Working Paper 79, "Global stablecoins in 2030: a European perspective"**
(Bindseil, Meuwissen, Mondini, Rohár), 2026. [Original PDF](https://www.esm.europa.eu/system/files/document/2026-10/WP%2079.pdf),
81 pages.

| Figure | What exactly it measures | Period | Sample | Where |
|---|---|---|---|---|
| 7.5% | Share of the global circulation of dollar stablecoins that the authors **assume** to be held by euro area households, equal to USD 19 billion | third quarter of 2025 (total circulation 248 billion) | None: it is a calibration assumption of the baseline scenario | Section 5.1, pp. 47-48 (PDF 49-50); Table 5-1, p. 47; notes to Table 4-3, p. 44 |
| 15% | Same share in sensitivity scenario D | projection to 2030 | None: assumption | Section 5.1, p. 48; Table 5-1 |
| 25% and 67.5% | Shares assumed for the United States and the rest of the world | third quarter of 2025 | None: assumption | Section 5.1, p. 48 |
| USD 600 billion | 15% of a circulation of 4,000 billion, scenario D | projection to 2030 | None: assumption | Section 5.2, p. 56 (PDF 58) |

The authors justify the 7.5% by discounting the estimates of Reuter (2025), whose
"Europe" includes Russia, Ukraine, Turkey and the United Kingdom. The circulation to
which they apply the share is the sum of USDT and USDC (174 + 74 billion, section
4.4.1, p. 39), which they assume to represent all dollar stablecoins: a clarification
added after module 1 ([report 06](06_module1_level.md), section 3.2). It is not an
empirical estimate and it has no confidence interval.

**Consequence for module 1**: the two sources measure different things and neither is
a measure of the level. The ECB gives a prevalence among consumers; the ESM gives a
declared assumption. Module 1 can report them as external references, but cannot
present them as an estimate.

### A.2 The other figures cited in report 00

| Source | Figure | What exactly it measures | Period | Sample | Where |
|---|---|---|---|---|---|
| [ESMA, "Crypto assets: Market structures and EU relevance"](https://www.esma.europa.eu/sites/default/files/2024-04/ESMA50-524821-3153_risk_article_crypto_assets_market_structures_and_eu_relevance.pdf), 2024 | about 10% | Euro share of trading volumes between fiat currencies and crypto-assets; dollar and won together about 80% | December 2020 - December 2023, 3-month moving average | Kaiko data; exchanges not listed | p. 7 and Chart 5 |
| [Kaiko, "The State of the European Crypto Market 2025-2026"](https://resources.kaiko.com/hubfs/Research/The%20State%20of%20the%20European%20Crypto%20Market%20-%202025%20-%202026%20Trends%20in%20Trading%20Activity.pdf), May 2026 | 9.03% (7.5% in 2024) | Euro share of global crypto-fiat volume; dollar 54.94%, won 27.61% | first quarter of 2026 | Not specified in the passage | Part 1, p. 2 (PDF 3) |
| [Chainalysis, "Inside Western Europe's $2 Trillion Crypto Economy"](https://www.chainalysis.com/blog/western-europe-crypto-adoption-2026/), 9 November 2026 | 11.8% | Share of euro trading in crypto volume against the 33 main fiat currencies | "end of the study period" (report period: July 2025 - June 2026) | Not specified | Article text |
| same page | 5.1% (from 3.4%) | Western Europe share of global stablecoin balances | July 2025 - June 2026 | Countries included not listed in the text read | Summary and article text |
| [Chainalysis, "2024 Western Europe Crypto Adoption"](https://www.chainalysis.com/blog/2024-western-europe-crypto-adoption/), 23 October 2024 | 24% (6% for bitcoin) | Euro share of stablecoin purchases traded against fiat currencies, from order book data | not declared | Not declared | Article text |
| [IMF WP/25/141, Reuter, "Decrypting Crypto"](https://www.elibrary.imf.org/view/journals/001/2025/141/article-A001-en.xml), 2025 | 21.4% | USDC and USDT flows attributed to "Europe": 167 + 167 = 334 billion out of 1,561 across the five regions. The percentage is calculated here from the table | 2024 | Ethereum, BNB Smart Chain, Optimism, Arbitrum, Base, Linea; 138 million transactions for 2,019 billion | Table 6 |
| [Bruegel Policy Brief 09/2026](https://www.bruegel.org/policy-brief/new-strategy-contain-stablecoin-risks-european-union), 2026 | 38% | "Europe-based" stablecoin transactions as a share of the global total, attributed by time zone | fourth quarter of 2025 | Artemis data; networks and time zones not specified | Paragraph preceding Figure 3; Figure 3b |

Outcome of the check:

- All the figures in report 00 were found in the originals. None was removed.
- The Kaiko entry, previously marked "second-hand", is now verified on the original
  PDF. I found no confirmation that the figure excludes stablecoin/euro pairs, so that
  clarification should be removed.
- The IMF working paper cannot be downloaded from imf.org (HTTP 403): it was read in
  the full-text version on the IMF eLibrary.
- [ECB Working Paper 3199](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3199~ad552b59ec.en.pdf)
  ("Stablecoins and monetary policy transmission", Altavilla, Boucinha, Burlon, Adalid,
  Fortes, Maruhn) was opened: title, authors and abstract match. An automated search of
  the text of the 46 pages finds no euro area share of stablecoins. A full reading was
  not carried out.

Caveat corrected with respect to report 00: there, the ECB's 5% was placed alongside
the supply shares (7.5% - 15%) as if they measured the same thing. They do not: the 5%
is the share of consumers who own stablecoins.

## Part B - Feasibility of module 3

Source: ECB Data Portal, BSI (Balance Sheet Items) dataset, public API without a key
(`https://data-api.ecb.europa.eu/service/data/BSI/...`). All series are end-of-month
stocks in millions of euro, not seasonally adjusted, referring to monetary financial
institutions (MFIs) excluding the European System of Central Banks.

In the codes, `{paese}` is the two-letter ISO country code. The 21 euro area countries
are: AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK.

| Quantity required | Series code | Countries covered | Period available |
|---|---|---|---|
| Sight deposits, households | `BSI.M.{paese}.N.A.L21.A.1.U2.2250.Z01.E` | 21 of 21 | 2003-01 - 2026-09 |
| Sight deposits, non-financial corporations | `BSI.M.{paese}.N.A.L21.A.1.U2.2240.Z01.E` | 21 of 21 | 2003-01 - 2026-09 |
| Total deposits, households | `BSI.M.{paese}.N.A.L20.A.1.U2.2250.Z01.E` | 21 of 21 | 2003-01 - 2026-09 |
| Total deposits, non-financial corporations | `BSI.M.{paese}.N.A.L20.A.1.U2.2240.Z01.E` | 21 of 21 | 2003-01 - 2026-09 |
| Total deposits, non-MFIs excluding central government | `BSI.M.{paese}.N.A.L20.A.1.U2.2300.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Interbank deposits: from euro area MFIs, central bank included | `BSI.M.{paese}.N.A.L20.A.1.U2.1000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Interbank deposits: from other banks, central bank excluded | `BSI.M.{paese}.N.A.L20.A.1.U2.1210.Z01.E` | 20 of 21 (FR missing) | 2014-12 - 2026-09 |
| Debt securities issued, total | `BSI.M.{paese}.N.A.L40.A.1.U2.0000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Debt securities issued, over 2 years | `BSI.M.{paese}.N.A.L40.H.1.Z5.0000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Liabilities to non-euro area residents | `BSI.M.{paese}.N.A.LXG.A.1.U4.0000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Capital and reserves | `BSI.M.{paese}.N.A.L60.X.1.Z5.0000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| Total liabilities | `BSI.M.{paese}.N.A.T00.A.1.Z5.0000.Z01.E` | 21 of 21 | 1997-09 - 2026-09 |
| **Foreign currency liabilities** | **not available in the BSI dataset; obtained from the BIS, see below** | | |
| the only BSI fragment: non-euro sight deposits of other financial intermediaries | `BSI.M.{paese}.N.A.L21.A.1.U2.227A.Z06.E` | 21 of 21 | 2022-01 - 2026-09 |

Notes on coverage:

- The start date shown is the earliest. Countries that joined later start later:
  Greece 1998-03, Slovenia 2004-01, Lithuania 2004-06, Malta 2005-01, Cyprus 2005-11,
  Slovakia 2006-01, Estonia 2008-01, Latvia 2010-09, Croatia 2010-12, Bulgaria 2022-01.
  Details in `data/processed/ecb_bsi_coverage_by_country.csv`.
- All series run to September 2026 for all the countries covered.
- The "MFI" counterpart sector (code 1000) includes the central bank, so it also
  contains refinancing from the Eurosystem. The variant without the central bank
  (code 1210) starts only in 2014-12 and does not exist for France.
- The deposits are those of euro area residents (code `U2`), not only of residents of
  the country; a domestic variant (`U6`) also exists.

**Foreign currency liabilities: failed method and alternative tried.** In the BSI
dataset the breakdown by currency (`EUR`, `Z06` = all except the euro) exists only for
loans and for the deposits of three financial subsectors (S.125, S.126, S.127), from
2022. It does not exist for the deposits of households and firms, for securities issued
or for total liabilities.

The alternative works: the BIS Locational Banking Statistics, public API without a key
(`https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/1.0/...`), publish the
liabilities of banks resident in each country by currency. Amounts in millions of
dollars, end-of-quarter stocks, all counterparties and all instruments.

| Quantity | BIS series code | Countries covered | Period available |
|---|---|---|---|
| Total liabilities, all currencies | `Q.S.L.A.TO1.A.5J.A.{paese}.A.5J.A` | 13 of 21 | 1977-Q4 - 2026-Q2 |
| Liabilities in domestic currency (euro) | `Q.S.L.A.TO1.D.5J.A.{paese}.A.5J.A` | 13 of 21 | 1977-Q4 - 2026-Q2 |
| Foreign currency liabilities, total | `Q.S.L.A.TO1.F.5J.A.{paese}.A.5J.A` | 13 of 21 | 1977-Q4 - 2026-Q2 |
| Liabilities in dollars | `Q.S.L.A.USD.F.5J.A.{paese}.A.5J.A` | 13 of 21 | 1977-Q4 - 2026-Q2 |

- Countries covered: AT BE CY DE ES FI FR GR IE IT LU NL PT. Missing: BG EE HR LT LV MT
  SI SK, which do not report to the BIS.
- The start date is the earliest. The dollar series starts later for some countries:
  Netherlands 2014-Q4, Austria 2013-Q4, Spain 2012-Q2, Portugal 2009-Q3, Cyprus 2008-Q4,
  France and Italy 2007-Q3. Details in `data/processed/bis_lbs_coverage_by_country.csv`.
- The frequency is quarterly, not monthly as required.
- For Austria and Finland, domestic and foreign currency do not add up to the total:
  part of the liabilities is not attributed to a currency.

A first result that can already be read, second quarter of 2026: share of bank
liabilities in dollars in the total, by country.

| Country | Total liabilities (USD bn) | In foreign currency | In dollars |
|---|---|---|---|
| Luxembourg | 1,104 | 38.8% | 27.2% |
| France | 15,522 | 21.6% | 14.9% |
| Ireland | 1,178 | 20.9% | 14.8% |
| Netherlands | 2,862 | 19.8% | 14.3% |
| Cyprus | 73 | 12.7% | 10.4% |
| Germany | 11,630 | 13.5% | 9.4% |
| Spain | 3,386 | 12.1% | 9.4% |
| Finland | 800 | 20.5% | 9.3% |
| Belgium | 1,660 | 14.6% | 8.2% |
| Greece | 316 | 6.1% | 5.4% |
| Austria | 1,171 | 6.3% | 4.2% |
| Italy | 4,785 | 3.6% | 2.8% |
| Portugal | 565 | 2.2% | 2.0% |

This table is a direct reading of the BIS data, not the module 3 index. It shows which
banking systems already fund themselves in dollars today, which is the channel
identified by ECB Working Paper 3199 for foreign-currency stablecoins.

**Saved samples**:

- `data/raw/ecb_bsi_sample.csv`: 35,580 observations, the 13 ECB series, all the
  countries covered, from 2015-01 to 2026-09. Regenerated with `python src/ecb_bsi_probe.py`.
- `data/raw/bis_lbs_fx_liabilities_sample.csv`: 2,392 observations, the 4 BIS series,
  13 countries, from 2015-Q1 to 2026-Q2. Regenerated with `python src/bis_lbs_probe.py`.

The vulnerability index has not been built.

## What could not be done

- **Obtaining foreign currency liabilities at monthly frequency and for all 21
  countries**: the source found (BIS) is quarterly and covers 13 countries. For the
  other eight I do not yet have a source; the ECB consolidated banking data are the
  next source to try.
- **Downloading the IMF working paper from imf.org**: the site returns HTTP 403 to
  automated requests. Read from the IMF eLibrary, which provides the full text.
- **Confirming the exact publication date** of the ECB box and of the ESM working
  paper: the pages read do not show it in a readable form. The box belongs to issue
  7/2026; the ESM file is in the October 2026 folder.
- **Reading ECB Working Paper 3199 in full**: title, authors and abstract were checked,
  plus an automated search of the text.
- **Verifying definitions that the originals do not give**: the countries included in
  Chainalysis's "Western Europe", the exchanges covered by Kaiko, the networks and time
  zones used by Bruegel/Artemis, the period of the 2024 Chainalysis figure.

---

**What this adds to the final programme**: the module 1 reference levels re-read
against the originals (5% of consumers; 7.5% - 15% of circulation, i.e. USD 19 billion
in the third quarter of 2025), the 12 ECB series and the 4 BIS series that can already
be downloaded with a script for module 3, and a first usable ranking: the share of bank
liabilities in dollars by country.
