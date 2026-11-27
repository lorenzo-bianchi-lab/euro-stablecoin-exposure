# Data sources and terms of use

Every dataset used by Euro Stablecoin Exposure Monitor, with its provider, what the project
does with it, where it is kept, what the provider's terms say and the attribution used or
required. Euro Stablecoin Exposure Monitor is an independent university project (ESCP Business
School) by Lorenzo Bianchi.

- Repository: https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure (public)
- Application: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/
- The [MIT License](LICENSE) covers the **code** of this repository. It does not cover the data
  files: each dataset remains under its provider's terms, summarised below.
- Every terms page was opened on the provider's own website on **2026-11-27**, unless the row
  says otherwise. Terms are paraphrased, not quoted. Where a page could not be opened or read,
  the row says so and gives no summary of its content.
- This file reports what the terms say and where. It is not legal advice.

## What is stored and what is published

| Location | What it holds | Who can see it |
|---|---|---|
| `data/raw/` | Data as downloaded: ECB, BIS and Eurostat series values; the daily USDT and USDC supply in circulation from DefiLlama; the **daily volume of each exchange trading pair** (`m2_daily_volumes.csv`); the rows used from the EBA files (`eba_te2025_extract.csv`) and the list of EBA banks; small JSON files of inputs taken from publications, surveys and web pages | Anyone, in the public repository |
| `data/processed/` | Tables computed by the modules. Some keep exchange-level detail: `m2_exchange_participation.csv` (weekly volume and share of each exchange), `m2_pair_coverage.csv`, `m2_revisions.csv`, `m2_last_fetch_log.csv` | Anyone, in the public repository |
| `data/archive/` | Data of the discarded methods (tests 00 and 01): on-chain block samples, daily flows to labelled exchange addresses, a CoinGecko ticker snapshot, the exchange volumes of the proxy 1 test | Anyone, in the public repository |
| `web/public/data/` and its built copy `docs/data/` | The JSON files read by the application: aggregates and indicators by country, bank-level figures for 85 EBA banks, the weekly index, scenario inputs, and a simplified copy of the GISCO country boundaries (`geo/europe.geo.json`) | Anyone, in the repository and on the website |
| Not in the repository | The full EBA CSV files (`data/raw/eba_te2025/`, excluded by `.gitignore` and downloaded again by module 6); the Dune Spellbook label files (`data/archive/raw/labels/`, excluded); the per-block and per-address flow files of test 01 (excluded). Git history checked on 2026-11-27: none of these was ever committed | Local copies only |

The application publishes **no per-exchange or per-pair figures**. For market data it shows
the weekly share of stablecoin volume traded against the euro and the weekly aggregate volumes
of the whole panel, in four series (USDT and USDC, each with and without Coinbase). The only
exchange-specific values it publishes are the exchange names in the panel and, in the effect
of excluding Bybit, Bybit's share of panel volume. **The repository**, on the other hand,
stores the daily volumes per trading pair exactly as downloaded.

## 1. ECB Data Portal

Terms applying to all four datasets:

- **ESCB statistics reuse policy**:
  https://www.ecb.europa.eu/stats/ecb_statistics/governance_and_quality_framework/html/usage_policy.en.html.
  Public ESCB statistics may be reused free of charge, for commercial and non-commercial
  purposes. Conditions:
  - the source must be quoted (the page's example is "Source: ECB statistics.");
  - the statistics and their metadata must not be modified;
  - third-party data need the originator's prior permission;
  - users are not entitled to expect that series stay unchanged.
- **ECB "Disclaimer & copyright"**, linked from the footer of the Data Portal:
  https://www.ecb.europa.eu/services/disclaimer/html/index.en.html.
  Information from the site may be used freely, provided that:
  - it is reproduced accurately and the ECB is cited as the source;
  - any changes made by the user, such as growth rates or seasonal adjustment, are stated
    explicitly;
  - if it is included in a document that is sold, buyers are told it is available free of
    charge.

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| BSI, monthly balance sheet items of monetary financial institutions | ECB. https://data.ecb.europa.eu/data/datasets/BSI; API https://data-api.ecb.europa.eu/service/data/BSI/ | Modules 3 to 6: how the funding of the 21 national banking systems is composed, deposits and loans. Stored in `data/raw/m3_bsi.csv` (from 2003), `data/raw/m5_bsi.csv` (loans, deposits of other financial institutions and of insurers and pension funds) and `data/raw/ecb_bsi_sample.csv` (the series of the first BSI probe, from 2015). Published as shares, indicators and totals by country | ESCB reuse policy and ECB Disclaimer & copyright (both above) | "Source: ECB statistics (BSI)". For computed indicators the application already writes "calculation on ECB (BSI)" | Checked on 2026-11-27 |
| BSI, quarterly series by currency | ECB, same dataset (series with currency USD) | Module 5: dollar liabilities of the eight countries without BIS data. Stored in `data/raw/m5_bsi.csv` (series `usd_*`). Published in the two-channel map | As above | "Source: ECB statistics (BSI, quarterly, by currency)" | Checked on 2026-11-27 |
| EXR, euro foreign exchange reference rates | ECB. https://data.ecb.europa.eu/data/datasets/EXR; series `D.USD.EUR.SP00.A` | The single US dollar per euro rate used to convert dollar amounts. Stored in `data/raw/m1_inputs.json` (daily rates from 2023) and `data/raw/m4_inputs.json` (the rate used). Published as one rate and its date | As above | "Source: ECB euro foreign exchange reference rates" | Checked on 2026-11-27 |
| CBD2, consolidated banking data | ECB. https://data.ecb.europa.eu/data/datasets/CBD2 | Module 6: how much of each country's consolidated bank assets the EBA sample covers. Stored in `data/raw/m6_cbd2_total_assets.csv` (21 rows, 2025-Q2). Published as a coverage ratio | As above | "Source: ECB statistics (consolidated banking data)" | Checked on 2026-11-27 |

## 2. ECB publications used as inputs

The ECB "Disclaimer & copyright" page (above) also covers these documents. It makes one
exception: documents that carry their authors' names (it gives Working Papers and Occasional
Papers as examples) may be reproduced or republished in a different publication, in whole or
in part, only with the explicit prior written authorisation of the ECB or the authors.

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Economic Bulletin 7/2026, box "Who holds stablecoins? New evidence on euro area consumer holdings" (Born, Evrard, Georgarakos, Kenny, Lambert, Meyer, Pairan, Zannier) | ECB. https://www.ecb.europa.eu/press/economic-bulletin/focus/2026/html/ecb.ebbox202607_08~f4ddf0117c.en.html | Own level estimate B1. Uses the share of consumers holding stablecoins (5%, August 2025, Consumer Expectations Survey, 11 countries) and Chart B, panel b, the distribution of holders by amount. The ECB publishes no data file for the chart, so the nine percentages were **measured on the image**. They are stored in `src/level_own.py` (constant `BANDS`), not in a data file (`data/raw/level_own_inputs.json` holds the inputs of routes B2 and B3), and published in `level.json` (`bands`) | ECB Disclaimer & copyright, including the exception for documents carrying authors' names. The page offers no data for Chart B. Its source line credits the ECB Consumer Expectations Survey and ECB calculations | "Source: ECB, Economic Bulletin, Issue 7/2026, box on stablecoin holdings, Chart B, panel b (ECB Consumer Expectations Survey and ECB calculations); percentages measured on the published chart by the author" | Checked on 2026-11-27 |
| SPACE 2024 (Study on the payment attitudes of consumers in the euro area), chart data | ECB. https://www.ecb.europa.eu/stats/ecb_surveys/space/shared/pdf/ecb.space2024_charts.en.xlsx, sheet "Chart 41" | Rule R3: share of adults holding crypto-assets in 20 countries (Bulgaria imputed). Stored in `data/raw/r3_crypto_ownership.json`. The 2024 values were compared with the live file on 2026-11-27 and match. Published as allocation weights | ECB Disclaimer & copyright. The file itself carries no separate licence | "Source: ECB, SPACE 2024, chart data, Chart 41" | Checked on 2026-11-27 |
| Working Paper No 3199, "Stablecoins and monetary policy transmission" (Altavilla, Boucinha, Burlon, Adalid, Fortes, Maruhn, March 2026) | ECB. https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3199~ad552b59ec.en.pdf | Modules 5 and 6. The coefficients of Table 1 (columns 3 and 4) and the rule of about 0.5 euro of loans per euro of deposits are transcribed in `src/module5_credit.py`. The stablecoin share of the crypto market (about 10%) is in `data/raw/level_own_inputs.json`. The Table 1 values were compared with the PDF on 2026-11-27 and match. Published in `simulator.json` (`coefficients`) | The paper's imprint: © ECB 2026, all rights reserved; reproduction, publication or reprint in a different publication only with explicit written authorisation of the ECB or the authors. Its disclaimer says the views are the authors' and should not be reported as the ECB's | "Altavilla et al. (2026), ECB Working Paper No 3199, Table 1". Present as the authors' estimates, not as ECB views | Checked on 2026-11-27 |

## 3. Eurostat

Terms page: https://ec.europa.eu/eurostat/web/main/help/copyright-notice. Eurostat's
statistical data and metadata may be reused for commercial and non-commercial purposes,
provided that the source is acknowledged. The page refers to Commission Decision 2011/833/EU
and says no written licence is needed. Editorial content is under CC BY 4.0, and changes must
be indicated. The exceptions are third-party material, logos, and data for countries outside
the EU, EFTA and candidate countries, which may be reused only for non-commercial purposes.
All 21 countries used here are EU Member States, so that last exception does not arise. For
datasets the page suggests citing the dataset's DOI or link and the access date.

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Population on 1 January (`demo_pjan`) | Eurostat. https://ec.europa.eu/eurostat/databrowser/view/demo_pjan/default/table; API https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan | Rule R2 (per-capita allocation), 2025. Stored in `data/raw/m4_inputs.json` and `data/raw/level_own_population.json` (`popolazione`) | Eurostat copyright notice (above) | "Source: Eurostat (demo_pjan), accessed [date]" | Checked on 2026-11-27 |
| Population by age (`demo_pjan`, ages under 18) | Eurostat, same dataset | Own level estimate B1: adults aged 18 and over, by country, 2025. Stored in `data/raw/level_own_population.json` (`adulti_18_piu`) | As above | "Source: Eurostat (demo_pjan), accessed [date]; adults computed by the author" | Checked on 2026-11-27 |
| Households (`lfst_hhnhtych`) | Eurostat. https://ec.europa.eu/eurostat/databrowser/view/lfst_hhnhtych/default/table | Own level estimate (household variant) and module 1 consistency check, 2025, in thousands. Stored in `data/raw/level_own_population.json` and `data/raw/m1_inputs.json` (`famiglie`) | As above | "Source: Eurostat (lfst_hhnhtych), accessed [date]" | Checked on 2026-11-27 |

## 4. Eurostat GISCO

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Country boundaries, Countries 2024, 1:20 million | Eurostat GISCO. https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units/countries; file https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson | Maps of Europe in the application (home page and "Map of Europe"). A simplified copy, cut to Europe, is stored in `web/public/data/geo/europe.geo.json` and published in `docs/data/geo/europe.geo.json` | The download rules are on https://ec.europa.eu/eurostat/web/gisco/geodata/administrative-units (copyright section, which also applies to the countries datasets):<br>- the Commission grants a non-exclusive, non-transferable right to use and process the data, on condition that the data are **not used for commercial purposes** and the source is acknowledged;<br>- a copyright notice must be visible in any printed or electronic publication that uses the data, in the map legend and on the publication's introductory page;<br>- in languages other than English, French and German the notice is translated;<br>- commercial users are referred to EuroGeographics for a licence | "© EuroGeographics for the administrative boundaries". The Italian version of the application uses "© EuroGeographics per i confini amministrativi". The notice is in the caption under both maps (`src.map`), on the About page and in the README | Checked on 2026-11-27 |

## 5. BIS

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Locational banking statistics (LBS) | Bank for International Settlements. https://data.bis.org/topics/LBS; API https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/1.0/ | Modules 3 and 5: foreign-currency and dollar liabilities of banks, 13 countries, quarterly from 2015. Stored in `data/raw/bis_lbs_fx_liabilities_sample.csv` (4 series). Published as ratios in the two-channel map | Statistics terms on https://data.bis.org/help/legal:<br>- reproduction must cite the BIS as the source of the statistics;<br>- translations must say they are not official;<br>- use in a commercial product is allowed only if it brings no extra charge to users;<br>- no use may imply BIS endorsement or affiliation;<br>- other uses are not permitted;<br>- the APIs are provided as they are and may change or stop.<br>The general terms (https://www.bis.org/terms_conditions.htm, clause 2) allow non-commercial redistribution of BIS material and send Data Portal statistics to the terms above. https://www.bis.org/terms_statistics.htm refused automated access (HTTP 403) | "Source: BIS locational banking statistics" | Checked on 2026-11-27 |

## 6. EBA

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| 2025 EU-wide transparency exercise, full database | European Banking Authority. https://www.eba.europa.eu/risk-and-data-analysis/risk-analysis/eu-wide-transparency-exercise; files under https://www.eba.europa.eu/assets/TE2025/Full_database/883401/ | Module 6: balance sheets of individual banks, data at 30 June 2025. The repository stores only the rows used, `data/raw/eba_te2025_extract.csv`, and the bank list (country, LEI, name), `data/raw/eba_te2025_banks.csv`. The full files are not committed. Published: figures for 85 banks in `banks.json` | Legal notice, https://www.eba.europa.eu/legal-notice:<br>- EBA material may be reproduced without separate authorisation, provided that the source is acknowledged;<br>- the EBA name and logo are its exclusive property, and the logo may not be used without permission;<br>- third-party material needs its owner's permission.<br>The notice does not distinguish commercial use and does not mention the transparency data. The exercise page says it was discontinued from June 2025 and points to the Pillar 3 Data Hub | "Source: EBA, 2025 EU-wide transparency exercise". The application also states that these are public bank-level data, not supervisory data | Checked on 2026-11-27 |

## 7. ESM

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Working Paper 79, "Global stablecoins in 2030: a European perspective" (Bindseil, Meuwissen, Mondini, Rohár, 2026) | European Stability Mechanism. https://www.esm.europa.eu/system/files/document/2026-10/WP%2079.pdf | Modules 1 and 4. The assumption that the euro area holds 7.5% of dollar stablecoin circulation (15% in scenario D), equal to USD 19 billion out of 248 billion (section 5.1; pp. 46 and 49 to 50), is applied to current circulation as the comparison level. Kept as constants in `src/module1_level.py`; no ESM file is stored | The paper's imprint: © ESM 2026, all rights reserved; reproduction, publication or reprint in a different publication only with explicit written authorisation of the ESM. Its disclaimer says the views are the authors' and not the ESM's. The website terms (https://www.esm.europa.eu/terms-and-conditions-and-privacy-statement) forbid publishing, modifying, creating derivative works from or commercially exploiting site content without prior written authorisation, except as copyright law otherwise permits | "Bindseil et al. (2026), ESM Working Paper 79, section 5.1: assumption applied by the author". Present as the authors' assumption, not an ESM view | Checked on 2026-11-27 |

## 8. Stablecoin supply: DefiLlama and CoinGecko

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Stablecoins API: daily circulation of USDT, USDC and all dollar stablecoins | DefiLlama. API https://stablecoins.llama.fi; documentation https://api-docs.defillama.com/ | Module 1: current supply, which the level estimates are applied to. Stored in `data/raw/m1_circulation_daily.csv` (daily, from 2023-01-01) and `data/processed/m1_monthly_series.csv`. Published as the current amounts and the levels derived from them | Terms of Use, https://defillama.com/terms (effective 24 June 2025):<br>- clause 7: a revocable, non-exclusive licence for personal, non-commercial use;<br>- clause 8 forbids, without permission: republishing the data in any form, reselling it, mirroring the materials, and scraping or commercially exploiting the content;<br>- no attribution wording is prescribed;<br>- the stablecoin API is not mentioned specifically | "Source: DefiLlama" (no wording prescribed) | Checked on 2026-11-27 |
| CoinGecko API: circulating supply (`/coins/markets`) and 24-hour tickers (`/coins/{id}/tickers`) | CoinGecko. https://api.coingecko.com/api/v3/ | Cross-check of the DefiLlama supply. The two current values and their time stamp are stored in `data/raw/m1_inputs.json` (`coingecko`), overwritten at each run. The archived snapshot of 24-hour stablecoin/fiat tickers (23 November 2026, test 00) is stored in `data/archive/raw/coingecko_fiat_tickers_snapshot.csv`, with derived tables in `data/archive/processed/proxy1_coingecko_by_*.csv`. The application does not display CoinGecko data | API Terms of Service, https://www.coingecko.com/en/api_terms (version of 5 Sept 2025):<br>- the scope of the licence depends on the plan;<br>- caching is discouraged; cached data must be refreshed at least every 24 hours and deleted when access ends (6.1);<br>- copying, storing or deriving from the data is not allowed except as the terms expressly permit (6.2);<br>- API access or any part of it may not be redistributed or syndicated (4.1.6);<br>- "Powered by CoinGecko" must be displayed (4.3).<br>The page does not say how the terms apply to keyless public access. The attribution guide (https://brand.coingecko.com/resources/attribution-guide) offers "Data provided by CoinGecko" or "Source: CoinGecko", linked to coingecko.com and placed next to the data | "Data provided by CoinGecko", with a link, wherever CoinGecko data are shown. The About page currently names "DefiLlama and CoinGecko" without this wording | Checked on 2026-11-27 |

## 9. Market-data APIs of the exchanges (module 2)

Common to all rows:

- **Use**: daily candles of stablecoin/fiat pairs, downloaded without an API key, used for the
  weekly index of the share of stablecoin trading against the euro.
- **Stored in the repository**:
  - `data/raw/m2_daily_volumes.csv`: daily volume of every pair as downloaded, from 2023-01-02;
  - `data/processed/m2_exchange_participation.csv`: weekly volume and share of each exchange;
  - `data/processed/m2_pair_coverage.csv`, `m2_revisions.csv`, `m2_last_fetch_log.csv`;
  - archived: `data/archive/raw/exchange_daily_volumes.csv` and `exchange_fetch_log.csv`
    (proxy 1 test, 42 days), `data/archive/processed/proxy1_volume_by_*.csv`.
- **Published by the application**: the weekly aggregate shares and volumes only (see the top
  of this file).
- **Attribution used**: the About page says the data come from the public endpoints of 24
  exchanges, each under its provider's terms, and that only weekly aggregates are published.
  Suggested source line: "Source: public market-data APIs of 24 exchanges; calculation by the
  author". Binance asks for a specific credit on redistributed derivative works (row 1).

Only the terms of the exchange's own website are reported. A page that could not be read is
marked "Not checked" and given no summary. "Silent" means that the page read does not address
redistribution of market data.

| # | Exchange | Endpoint used | Terms page checked | What the terms say about reuse and redistribution of market data | Status |
|---|---|---|---|---|---|
| 1 | Binance | `https://data-api.binance.vision/api/v3/klines` | Binance Vision Dataset Terms v1.0 (26 August 2026): https://data.binance.vision/Binance_Vision-Terms_of_Use.pdf. The general terms, https://www.binance.com/en/terms, returned no readable text | - The datasets are licensed under CC BY-NC-SA 4.0 (3.1).<br>- Commercial use needs a separate written enterprise licence (3.4).<br>- Allowed non-commercial uses include academic research (4.1).<br>- Hosting or commercially exploiting the datasets or feeds derived from them is not allowed (4.3).<br>- Redistributed derivative works must credit "Binance Vision" and stay under CC BY-NC-SA 4.0 (4.5).<br>- Binance's endorsement may not be implied (8.2).<br>The scope is data.binance.vision "and associated endpoints" (2.1); the terms do not name `data-api.binance.vision` explicitly | Checked on 2026-11-27 (Vision terms); general terms not readable |
| 2 | Binance.US | `https://api.binance.us` (klines) | https://www.binance.us/institutions/market-history (checked); https://www.binance.us/terms-of-use (only the introduction readable; the full PDF returned HTTP 403) | Historical market data are subject to the Terms of Use. Without written consent the data may not be used commercially: trading services, data feed or streaming services, or sites and apps that profit from the data, including through advertising. Silent on non-commercial redistribution and attribution | Partly checked on 2026-11-27 |
| 3 | Kraken | `https://api.kraken.com/0/public/OHLC` | EEA terms (18 November 2026): https://www.kraken.com/legal/eea-terms; global terms: https://www.kraken.com/legal/global-terms | Kraken's content, which the EEA terms say includes pricing data, may be used only for approved purposes and for the user's own benefit (EEA 11.1). It may not be copied, distributed, sublicensed or made available to third parties; scraping and automated means are not allowed; third-party applications need prior written consent (EEA 11.5; global 8 and 9). No exception for the public API was found, and there is no attribution clause | Checked on 2026-11-27. The clauses were read through a summarising fetch tool; worth reading in full |
| 4 | Coinbase (Exchange) | `https://api.exchange.coinbase.com/products/{pair}/candles` | Documentation (checked): https://docs.cdp.coinbase.com/exchange/docs/welcome. Market Data Terms of Use: https://www.coinbase.com/legal/market_data (HTTP 403) | The documentation says that using the Exchange market data API means accepting the Market Data Terms of Use. That page could not be read | Not checked: page not reachable |
| 5 | Bitstamp | `https://www.bitstamp.net/api/v2/ohlc/` | https://www.bitstamp.net/api/, section on commercial use of exchange data (checked). https://www.bitstamp.net/terms-of-use/ returned no text | Companies that use the exchange data for their own commercial purposes must sign a Data License Agreement, which then allows redistribution and derived works. Silent on non-commercial use and attribution. The general terms were not read | Partly checked on 2026-11-27 |
| 6 | OKX | `https://www.okx.com/api/v5/market/history-candles` | OKX API Agreement (28 July 2026): https://www.okx.com/en-eu/help/okx-api-agreement | - Market data include data from public endpoints, with or without authentication (1.8), and candlestick endpoints are named (3.2(a)).<br>- The licence is for the user's own internal purposes (9.2), and market data may be used only for personal, non-commercial trading and account management (9.4).<br>- They may not be resold, redistributed, published or displayed to any third party, "commercial gain or otherwise", without OKX's prior written consent (9.4(a)).<br>- No aggregator or analytics platform may be built on them (9.4(b)).<br>- Public availability gives no right to redistribute, and the restrictions also bind people without an account.<br>No attribution clause | Checked on 2026-11-27 |
| 7 | Upbit | `https://api.upbit.com` (candles) | Comparison table of the Open API terms in force from 11 October 2023: https://static.upbit.com/terms/notices/openapi_terms_revision_202310.pdf; notice https://docs.upbit.com/kr/changelog/open_api_agreement_revision. https://upbit.com/open_api_agreement returned only its title | Copyright in all data provided through the Open API belongs to Dunamu, Upbit's operator, and they may not be used or modified without authorisation (art. 5). Open API programs may not be sold, distributed or licensed to others for payment (art. 6(3)). Silent on storage, display and attribution. A later revision listed in the changelog was not read | Partly checked on 2026-11-27 (2023 version) |
| 8 | Bithumb | `https://api.bithumb.com` (candles) | Service Terms (effective 19 July 2024): https://feed-content.bithumb.com/cms/ceebe340-b3b5-46c8-a41c-4fd71f582d0c.pdf. https://apidocs.bithumb.com/ links to no API terms | Copyright and intellectual property in the services belong to Bithumb (art. 11(2)). The services may not be used to offer similar services or for other commercial activity (11(3)). Bithumb may restrict users who use service information for profit, or copy or distribute it, without consent (14(2)(3)). Silent on attribution. A revision of 9 July 2025 could not be opened (HTTP 403) | Partly checked on 2026-11-27 |
| 9 | Coinone | `https://api.coinone.co.kr/public/v2/chart/KRW/...` | Open API terms (effective 7 May 2026): https://coinone.co.kr/terms/api | Prices and order books are part of the service (art. 5(1)(3)). Data obtained through the service, prices included, may not be transferred to others (art. 6(1)(4)). Data and content belong to the company and may not be used or altered without authorisation (art. 9). The terms are written for members with API keys. Silent on storage, display and attribution | Checked on 2026-11-27 |
| 10 | Korbit | `https://api.korbit.co.kr/v2/candles` | API documentation: https://docs.korbit.co.kr/index_en.html, which redirects to https://docs.digitalx.miraeasset.com/index_en.html | No API terms were found. The documentation says the public quotation APIs may be used by anyone without a key, within a rate limit. Silent on redistribution | Checked on 2026-11-27 (no terms found) |
| 11 | BtcTurk | `https://graph-api.btcturk.com/v1/klines/history` | User Framework Agreement, shown under "Terms Of Use" at https://sso.btcturk.com/register/. https://www.btcturk.com/ returned HTTP 403 | The agreement covers API connections (1.3(a), 3.1). Among prohibited conduct it lists storing, transmitting, using or selling platform data (2.5(o), whose full wording was not visible), and data feed or streaming services that use BtcTurk market data or profit from it (2.5(ö)). Intellectual property belongs to BtcTurk (3.1). Only part of the long text was read | Partly checked on 2026-11-27 |
| 12 | Bitvavo | `https://api.bitvavo.com/v2/` (candles) | https://bitvavo.com/en/developer-agreement and https://bitvavo.com/en/terms (HTTP 403) | Not read | Not checked: page not reachable |
| 13 | Bitfinex | `https://api-pub.bitfinex.com/v2/candles/trade:1D:...` | https://docs.bitfinex.com/docs/requirements-and-limitations (checked) names the API Terms of Service, https://www.bitfinex.com/legal/general/api-terms/. That page and the separate Market Data Terms, https://www.bitfinex.com/legal/general/market-data/, returned no text | The documentation says API use must comply with the API Terms of Service. Neither terms page could be read | Not checked: page not reachable |
| 14 | Gemini | `https://api.gemini.com/v2/candles/...` | API Agreement: https://www.gemini.com/legal/api-agreement; Market Data Agreement (12 October 2025): https://www.gemini.com/legal/market-data-agreement | - Market data are proprietary.<br>- They may be received, downloaded, stored and copied only for Permitted Use: personal or internal use, general information, and analysis of prices and markets.<br>- Redistribution to any party needs a Redistribution Agreement.<br>- Creating a benchmark, reference rate or index from the data is prohibited.<br>- Commercial use requires contacting Gemini.<br>- Authorised redistributors must credit "Data provided by Gemini" with a link | Checked on 2026-11-27 |
| 15 | Crypto.com Exchange | `https://api.crypto.com/exchange/v1/public/get-candlestick` | Exchange Terms and Conditions (Foris DAX Limited, 22 December 2025): https://static2.crypto.com/exchange/assets/documents/tnc.pdf. https://crypto.com/exchange/document/terms showed only its heading | - "Exchange Market Data" includes prices and quantities made available through any API.<br>- Without express written consent they may not be downloaded, copied, published or distributed (13.2(a)), commercialised (13.2(d), which also needs an agreement) or extracted automatically (13.2(e)).<br>- They may not be redistributed or displayed, and no derivative works may be made, indexes and benchmarks included, "whether internal or otherwise" (13.3(a)(ii)).<br>No attribution clause. Whether EU users contract with another Crypto.com entity was not checked | Checked on 2026-11-27 |
| 16 | KuCoin | `https://api.kucoin.com/api/v1/market/candles` | Terms of Use (29 October 2026): https://www.kucoin.com/legal/terms-of-use; no separate API terms found | Platform content belongs to KuCoin or its rights holders (art. 89). Copying, publishing or distributing it needs written consent (art. 90). Scraping, systematic extraction to build databases, resale and commercial use need written permission (art. 91). Silent on API market data specifically | Checked on 2026-11-27 |
| 17 | Gate | `https://api.gateio.ws/api/v4/spot/candlesticks` | User Agreement (22 July 2026): https://www.gate.com/user-agreement; no separate API terms found | The API is part of the Services (1.1). Gate's intellectual property is licensed only for non-commercial or personal use (16.2). The Services may not be used for resale or commercial purposes (10.1(d)), and unauthorised API use and data scraping are prohibited (2.11). Silent on redistribution of market data | Checked on 2026-11-27 |
| 18 | Bitget | `https://api.bitget.com/api/v2/spot/market/history-candles` | Terms of Use (4 November 2026): https://www.bitget.com/support/articles/360014944032 | Bitget's intellectual property is licensed for non-commercial personal or internal business use (10.1). Commercial use needs written agreement (11.1(ii)). Copying, downloading, storing, transmitting or publishing Bitget's intellectual property, or creating derivative works, is not allowed (11.1(xii)). Silent on market data specifically | Checked on 2026-11-27 |
| 19 | MEXC | `https://api.mexc.com/api/v3/klines` | User Agreement (12 November 2026): https://www.mexc.com/terms; API risk notice: https://www.mexc.com/support/articles/16940754707737 | Without written consent, MEXC data may not be used commercially: trading services, data feed or streaming services, or sites and apps that charge for or profit from MEXC market data (17(d)). Copying, downloading, storing, redistributing or creating derivative works needs prior written consent (17(e)). Crawlers and bots are not allowed (17(f)(i)). Intellectual property, databases included, belongs to MEXC (39). No attribution clause | Checked on 2026-11-27 |
| 20 | WhiteBIT | `https://whitebit.com/api/v1/public/kline` | API terms and conditions (undated): https://whitebit.com/terms/api, linked from https://docs.whitebit.com/platform/overview | The licence is to access and make personal use of the API. It excludes commercial use, any collection and use of prices, derivative use, and data mining. The API and related data may not be copied or exploited commercially without WhiteBIT's express written consent | Checked on 2026-11-27 |
| 21 | Indodax | `https://indodax.com/tradingview/history_v2` | https://indodax.com/terms and the help-centre terms page (both HTTP 403). The official API documentation on GitHub (https://github.com/btcid/indodax-official-api-docs) states no terms or licence | Not read | Not checked: page not reachable |
| 22 | CoinDCX | `https://public.coindcx.com/market_data/candles` | API License Terms and Conditions (undated): https://docs.coindcx.com | The licence is restricted, revocable and cannot be sublicensed (2.1). The user may not redistribute, display or disseminate the market data to any third party, including charts, analytics or research derived from them (2.3(c)). CoinDCX keeps ownership of the market data (4.1) | Checked on 2026-11-27 |
| 23 | BTC Markets | `https://api.btcmarkets.net/v3/markets/{pair}/candles` | https://docs.btcmarkets.net/, https://www.btcmarkets.net/terms-and-conditions and https://www.btcmarkets.net/terms-of-service (all HTTP 403) | Not read | Not checked: page not reachable |
| 24 | Bitso | `https://api.bitso.com/v3/ohlc` | https://bitso.com/terms (no text: the page is built in the browser); the support-centre terms FAQ (HTTP 403); https://docs.bitso.com/bitso-api/docs/general-concepts (no terms) | Not read | Not checked: page not reachable |
| - | Bybit (used until 25 November 2026; its data stay in `data/raw/m2_daily_volumes.csv`, unused) | `https://api.bybit.com/v5/market/kline` | https://www.bybit.com/en/help-center/article/API-Terms and https://bybit.nl/en/help-center/article/API-Terms (timed out) | Not read | Not checked: page not reachable |

## 10. Archived, discarded methods (`data/archive/`)

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| Public Ethereum RPC endpoints | dRPC (`https://eth.drpc.org`) and MEV Blocker (`https://rpc.mevblocker.io`) | Tests 00 and 01 (proxies 2 and 3): USDT and USDC transfer events. Stored: `data/archive/raw/onchain_block_samples_eth.csv` (block samples) and `cex_flows_eth_daily.csv` (daily flows by exchange label), plus derived tables in `data/archive/processed/`. The per-chunk and per-address files are not committed | dRPC, https://drpc.org/terms-of-use (14 January 2025): use is personal unless the user represents an entity (1.3); automated collection of information from the website and use of website data for competing purposes are not allowed (1.8). Silent on reuse of blockchain data obtained through the RPC. MEV Blocker's site links its "Terms of Use" to consensys.io, which redirects to https://metamask.com/terms-of-use (Consensys Software Inc., June 2026). That page mentions MEV Blocker only for bid splitting and has no RPC terms. It limits copying of its own content to permitted use (7.2) and forbids distributing that content (7.3(a)). Silent on blockchain data. Whether it governs `rpc.mevblocker.io` is not stated | None prescribed. The data are public Ethereum records: "Source: Ethereum blockchain, via public RPC endpoints (dRPC, MEV Blocker)" | Checked on 2026-11-27 (MEV Blocker: applicability unclear) |
| Public Tron RPC endpoints | PublicNode by Allnodes (`https://tron-evm-rpc.publicnode.com`, `https://tron-rpc.publicnode.com/jsonrpc`) and TronGrid (`https://api.trongrid.io/jsonrpc`) | Same tests, on Tron. Stored: `data/archive/raw/onchain_block_samples_tron.csv` and `cex_flows_tron_daily.csv` | PublicNode, https://www.publicnode.com/terms (Allnodes Inc., undated): automated access is allowed; blockchain data are not the provider's content and may be used and displayed in the user's own applications; access or data may not be resold as a standalone product without written consent. Silent on republishing raw data beyond that. TronGrid has no specific terms found. The general terms of the TRON developer site, https://developers.tron.network/page/terms-of-use (TRON Foundation; revision date in the text 21 September 2018), ask users to respect any limits on dissemination of materials and say nothing on reuse of blockchain data | None prescribed. "Source: Tron blockchain, via public RPC endpoints (PublicNode, TronGrid)" | Checked on 2026-11-27 |
| Dune Spellbook address labels | Dune Analytics AS. https://github.com/duneanalytics/spellbook (`cex_evms_addresses.sql`, `cex_tron_addresses.sql`, pinned commits 9f61b0d and 447a87c) | Test 01 (proxy 3): labels of exchange addresses. Downloaded to `data/archive/raw/labels/`, which is excluded by `.gitignore`; git history shows they were never committed. Flows aggregated by label are committed (`cex_flows_*_daily.csv`, `data/archive/processed/proxy3_*`) | LICENSE at commit 9f61b0d and on `main`: Business Source License 1.1, licensed work Spellbook 3.0.0, licensor Dune Analytics AS:<br>- copying, modifying, creating derivative works, redistributing and non-production use are allowed;<br>- the additional use grant allows use except for a "Data or Analytics Platform", meaning an offering that lets third parties access the work's functionality or outputs;<br>- copies and derivative works stay under the licence, which must be displayed on each copy;<br>- on 3 March 2027 the licence changes to GPL v3 or later | "Exchange address labels: Dune Spellbook (Business Source License 1.1)" | Checked on 2026-11-27 |
| Exchanges' proof-of-reserves pages | Binance and KuCoin (read by script); OKX, Bybit, Bitget and Gate (figures taken from search results, not checked again). The page addresses are not recorded in the repository | Own level estimate B2, which gave no number: customer balances in USDT and USDC. Stored in `data/raw/level_own_inputs.json` (block `B2`). Not published in the application | No terms specific to these pages were looked for, so each exchange's general terms apply: KuCoin articles 89 to 91 (written consent needed to copy or publish content); Bitget 11.1(xii); Gate 10.1(d) and 2.11 (see section 9). Binance's general terms could not be read and Bybit's were not reachable | "Source: proof-of-reserves pages of the exchanges, read on the dates stated in the file" | Partly checked on 2026-11-27 |
| Similarweb, top countries by website traffic | Similarweb, free website pages for binance.com and bitvavo.com (October 2026), read in a browser | Own level estimate B2: whether users come from the euro area. Top-five country shares stored as text in `data/raw/level_own_inputs.json` (`provenienza_utenti`). Not published in the application | Terms of Use (19 March 2025), https://www.similarweb.com/corp/legal/terms/:<br>- the site may be used for information and personal use, and for internal business purposes where applicable (4);<br>- presenting or sharing data from the platform requires Similarweb's prior consent, and then attribution under its branding guidelines (6(iv));<br>- automated collection is forbidden (6(v));<br>- there is no express allowance for citation | "Source: Similarweb (free website pages, October 2026)", if the data are kept | Checked on 2026-11-27 |

## 11. Other inputs found in the repository

These are not in the list of section 3 of SPEC.md under their own names, but their figures are
stored in `data/raw/level_own_inputs.json` (route B3, own level estimate).

| Dataset | Provider and data | Use in the project and storage | Terms of use | Attribution | Status |
|---|---|---|---|---|---|
| OAM, analysis of the eleventh transmission of VASP flows (third quarter 2025) | Organismo Agenti e Mediatori (Italy). https://www.organismo-am.it/analisi-e-ricerche | B3: value of crypto-assets held by customers of Italian providers, number of customers. Stored in `level_own_inputs.json` (`B3.italia`). Not published as a figure in the application | The site refused automated access (HTTP 403), so no terms were read | "Source: OAM, VASP flow analysis, Q3 2025, pp. 8 to 9" | Not checked: page not reachable |
| DNB statistical news, 27 October 2026 | De Nederlandsche Bank. https://www.dnb.nl/en/general-news/statistical-news/2026/dutch-households-hold-3-2-billion-in-crypto-assets-with-dutch-service-providers/ | B3: EUR 3.2 billion held by Dutch households with Dutch providers at the end of June 2026, of which stablecoins under 1%. Stored in `level_own_inputs.json` (`B3.paesi_bassi`) | DNB statistics disclaimer, https://www.dnb.nl/en/statistics/background-information/disclaimer/: the database and datasets are under CC BY 4.0. Users must name DNB as the source, refer to the licence and say whether the data were transformed. They may not suggest that DNB approves the transformation | "Source: DNB (CC BY 4.0)" | Checked on 2026-11-27 |

The note in `level_own_inputs.json` on Austria (OeNB, HFCS 2023) records that no stablecoin
value is published; no OeNB data are stored.

## 12. Documents cited only for comparison

No data from these documents are stored in the repository or published by the application. A
search of `data/`, `src/` and `web/public/data/` on 2026-11-27 found them only as names in the
list of sources of "Method and data". They are cited, with page references, in the reports and
in SPEC.md. Their terms were not checked, because nothing of theirs is redistributed beyond
citation.

| Document | Link | Use | Status |
|---|---|---|---|
| ESMA, risk article on crypto-asset market structures and EU relevance (2024) | https://www.esma.europa.eu/sites/default/files/2024-04/ESMA50-524821-3153_risk_article_crypto_assets_market_structures_and_eu_relevance.pdf | Comparison of benchmarks (report 02) | Not checked: cited only, no data stored |
| Kaiko, "The State of the European Crypto Market 2025-2026" | https://resources.kaiko.com/hubfs/Research/The%20State%20of%20the%20European%20Crypto%20Market%20-%202025%20-%202026%20Trends%20in%20Trading%20Activity.pdf | Comparison of the EUR share of trading | Not checked: cited only, no data stored |
| Chainalysis, Western Europe crypto adoption (2024 and 2026) | https://www.chainalysis.com/blog/2024-western-europe-crypto-adoption/; https://www.chainalysis.com/blog/western-europe-crypto-adoption-2026/ | Comparison | Not checked: cited only, no data stored |
| IMF Working Paper WP/25/141 | https://www.elibrary.imf.org/view/journals/001/2025/141/article-A001-en.xml | Comparison | Not checked: cited only, no data stored |
| Bruegel Policy Brief 09/2026 | https://www.bruegel.org/policy-brief/new-strategy-contain-stablecoin-risks-european-union | Comparison | Not checked: cited only, no data stored |

## Points to review

These are the places where the terms read on 2026-11-27 restrict redistribution, commercial
use or storage, set out so that the author can decide. Each point reports the terms and where
they are; none is legal advice.

1. **Exchange data stored in the public repository.** `data/raw/m2_daily_volumes.csv` holds
   every pair's daily volume as downloaded. The archived proxy 1 file holds more of the same,
   and `data/processed/m2_exchange_participation.csv` holds weekly volumes per exchange.
   Several terms read restrict this kind of storage or republication:
   - OKX 9.4(a): no publishing or displaying to third parties without written consent, for
     commercial gain or otherwise;
   - CoinDCX 2.3(c): no redistribution or display to third parties;
   - Crypto.com 13.2(a) and 13.3(a)(ii);
   - Gemini: storage is allowed for permitted use, but redistribution needs a Redistribution
     Agreement;
   - Kraken EEA 11.5; Coinone art. 6(1)(4); Upbit art. 5; Bithumb art. 14(2)(3);
   - KuCoin arts. 90 and 91; MEXC 17(e); Bitget 11.1(xii); WhiteBIT; BtcTurk 2.5(o) and (ö).
   For Binance, the Vision terms license the datasets under CC BY-NC-SA 4.0, which allows
   non-commercial sharing with attribution under the same licence. Clause 4.3, however,
   forbids "hosting" the datasets, and the terms do not say whether they cover
   `data-api.binance.vision`.

2. **The weekly index as a derived product.** The application publishes only aggregates, but
   some terms address derived works:
   - Gemini forbids using its market data to create an index;
   - Crypto.com 13.3(a)(ii) forbids derivative works, indexes and benchmarks included, whether
     internal or otherwise;
   - CoinDCX 2.3(c) covers analytics and research derived from the data;
   - OKX 9.4(b) forbids building an aggregator or analytics platform;
   - Bitget 11.1(xii) forbids derivative works.
   No terms read define whether a non-commercial university project counts as commercial use.

3. **Exchange terms not read.** Coinbase (Market Data Terms, the licence named by its API
   documentation), Bitvavo, Bitfinex, Indodax, BTC Markets, Bitso and Bybit could not be read,
   and Bitstamp, Binance.US, Upbit, Bithumb and BtcTurk only in part. They have to be opened in
   a browser before any conclusion is drawn on them.

4. **CoinGecko.** The API terms:
   - discourage caching, require cached data to be refreshed at least every 24 hours and
     deleted when access ends (6.1);
   - forbid copying, storing or deriving from the data except as expressly permitted (6.2);
   - forbid redistributing any part of the API (4.1.6);
   - require "Powered by CoinGecko" (4.3).
   The repository keeps two current values in `data/raw/m1_inputs.json` and an archived ticker
   snapshot of 23 November 2026, with derived tables, in `data/archive/`. The application shows
   no CoinGecko data, and the About page names CoinGecko without the prescribed wording. The
   terms do not say how they apply to keyless public access.

5. **DefiLlama.** The terms grant a personal, non-commercial licence and forbid republishing
   the data in any form without permission (clauses 7 and 8). The repository stores the daily
   circulation series (`data/raw/m1_circulation_daily.csv`) and a monthly series derived from
   it.

6. **GISCO boundaries.**
   - Use is allowed only for non-commercial purposes; commercial users must obtain a licence
     from EuroGeographics.
   - The notice must appear in the map legend and on the introductory page. The application
     shows it under the map on the home page and on the "Map of Europe" page, and on the About
     page.
   - The boundaries file sits in the repository next to code under the MIT licence, which
     allows commercial reuse of the code. The README says the data stay under their providers'
     terms.

7. **ECB.**
   - The reuse policy asks that statistics and metadata not be modified, and the ECB copyright
     page asks that user changes be stated explicitly. The application labels its indicators as
     "calculation on ECB (BSI)".
   - For documents carrying authors' names (WP 3199, and the Economic Bulletin box, which is
     signed), reproduction in a different publication needs written authorisation. The project
     transcribes coefficients and publishes nine percentages measured on Chart B of the box
     (`level.json`). The ECB pages do not say whether such use counts as reproduction.

8. **ESM.** The paper is "all rights reserved", and the website terms forbid publishing site
   content without written authorisation, except as copyright law permits. The project cites
   two percentages and one amount from section 5.1 and stores no ESM file.

9. **BIS.** Commercial use of the statistics is allowed only if users pay no extra charge for
   them, and uses outside the listed conditions are not permitted. The raw sample is in
   `data/raw/bis_lbs_fx_liabilities_sample.csv`.

10. **Similarweb.** Sharing data from the platform needs prior consent (6(iv)). Country shares
    for two websites are stored in `data/raw/level_own_inputs.json`.

11. **Dune Spellbook.**
    - The label files are not in the repository; flows aggregated with them are, in the
      archive.
    - The Business Source License says derivative works stay under the licence, and its
      additional use grant excludes offerings that let third parties access the work's outputs.
    - The application does not use these flows.

12. **Proof-of-reserves figures.** Six exchanges' customer balances are stored in
    `data/raw/level_own_inputs.json`. Four of them come from search results and were not
    checked against the source. The exchanges' general terms (KuCoin art. 90, Bitget
    11.1(xii)) require consent to copy or publish their content.

13. **OAM.** The OAM site refused automated access, so the terms for the Italian figures stored
    in `level_own_inputs.json` were not read.
