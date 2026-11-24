# 02 - Verifica dei benchmark e fattibilità del modulo 3

Dopo i test [00](00_test_H1.md) e [01](01_test_proxy3.md) il progetto è stato ridefinito
in quattro moduli (vedi [SPEC.md](../SPEC.md)). Questo documento fa due verifiche
preliminari: che le cifre esterne usate come livello esistano davvero nei documenti
originali, e che i dati bancari per il modulo 3 siano scaricabili gratis.

Eseguito il 2026-11-24.

## Parte A - Benchmark verificati sugli originali

Ogni cifra qui sotto è stata riletta nel documento originale, scaricato e cercato nel
testo. La colonna "Dove" indica il punto esatto. I numeri di pagina sono quelli stampati
sul documento; tra parentesi la pagina del file PDF quando è diversa.

### A.1 Le due fonti del modulo 1

**BCE, Bollettino economico n. 7/2026, riquadro "Who holds stablecoins? New evidence on
euro area consumer holdings"** (Born, Evrard, Georgarakos, Kenny, Lambert, Meyer, Pairan,
Zannier). [Testo originale](https://www.ecb.europa.eu/press/economic-bulletin/focus/2026/html/ecb.ebbox202607_08~f4ddf0117c.en.html).

| Cifra | Cosa misura esattamente | Periodo | Campione | Dove |
|---|---|---|---|---|
| 5% | Quota di consumatori che dichiarano che loro o un membro della famiglia possiedono stablecoin | agosto 2025 | Modulo tematico dell'indagine CES della BCE, 11 maggiori paesi dell'area euro, dati pesati per popolazione | Testo che precede il grafico B; grafico B, riquadro a |
| 13% (9,8% a novembre 2024) | Quota di consumatori che possiedono cripto-attività | agosto 2025 | come sopra | come sopra |
| "oltre un terzo" | Detentori di stablecoin sul totale dei detentori di cripto-attività | agosto 2025 | come sopra | come sopra |
| USDT 17%, USDC 12%, EURC 10% | Quota dei consumatori con cripto-attività che detiene ciascuna stablecoin (risposte multiple) | agosto 2025 | 1.286 rispondenti che possiedono cripto-attività | Testo che precede il grafico C; grafico C, riquadro a |
| circa 10% | Detentori di stablecoin con almeno 10.000 euro investiti (stima) | novembre 2025 | Modulo tematico CES di novembre | Testo che precede il grafico B; grafico B, riquadro b |

Cosa **non** c'è nel riquadro:

- un importo complessivo in euro delle stablecoin detenute dai consumatori dell'area euro;
- una quota dell'area euro sull'offerta mondiale di stablecoin;
- la numerosità totale del campione (compare solo quella dei 1.286 detentori di cripto-attività);
- la quota media di portafoglio in forma numerica: è mostrata solo nel grafico C, riquadro b.

Il 5% è quindi una **diffusione** (quante persone), non un **livello** (quanto valore).
La BCE stessa definisce i dati "sperimentali".

**ESM Working Paper 79, "Global stablecoins in 2030: a European perspective"**
(Bindseil, Meuwissen, Mondini, Rohár), 2026. [PDF originale](https://www.esm.europa.eu/system/files/document/2026-10/WP%2079.pdf),
81 pagine.

| Cifra | Cosa misura esattamente | Periodo | Campione | Dove |
|---|---|---|---|---|
| 7,5% | Quota della circolazione mondiale di stablecoin in dollari che gli autori **assumono** detenuta da famiglie dell'area euro, pari a 19 miliardi di dollari | terzo trimestre 2025 (circolazione totale 248 miliardi) | Nessuno: è un'ipotesi di calibrazione dello scenario di base | Sezione 5.1, pp. 47-48 (PDF 49-50); tabella 5-1, p. 47; note alla tabella 4-3, p. 44 |
| 15% | Stessa quota nello scenario di sensibilità D | proiezione al 2030 | Nessuno: ipotesi | Sezione 5.1, p. 48; tabella 5-1 |
| 25% e 67,5% | Quote assunte per Stati Uniti e resto del mondo | terzo trimestre 2025 | Nessuno: ipotesi | Sezione 5.1, p. 48 |
| 600 miliardi di dollari | 15% di una circolazione di 4.000 miliardi, scenario D | proiezione al 2030 | Nessuno: ipotesi | Sezione 5.2, p. 56 (PDF 58) |

Gli autori motivano il 7,5% scontando le stime di Reuter (2025), la cui "Europa" include
Russia, Ucraina, Turchia e Regno Unito. Non è una stima empirica e non ha un intervallo
di confidenza.

**Conseguenza per il modulo 1**: le due fonti misurano cose diverse e nessuna delle due
è una misura del livello. La BCE dà una diffusione tra i consumatori; l'ESM dà
un'ipotesi dichiarata. Il modulo 1 può riportarle come riferimenti esterni, ma non
può presentarle come stima.

### A.2 Le altre cifre citate nel report 00

| Fonte | Cifra | Cosa misura esattamente | Periodo | Campione | Dove |
|---|---|---|---|---|---|
| [ESMA, "Crypto assets: Market structures and EU relevance"](https://www.esma.europa.eu/sites/default/files/2024-04/ESMA50-524821-3153_risk_article_crypto_assets_market_structures_and_eu_relevance.pdf), 2024 | circa 10% | Quota dell'euro sui volumi di scambio tra valute fiat e cripto-attività; dollaro e won insieme circa 80% | dicembre 2020 - dicembre 2023, media mobile a 3 mesi | Dati Kaiko; exchange non elencati | p. 7 e grafico 5 |
| [Kaiko, "The State of the European Crypto Market 2025-2026"](https://resources.kaiko.com/hubfs/Research/The%20State%20of%20the%20European%20Crypto%20Market%20-%202025%20-%202026%20Trends%20in%20Trading%20Activity.pdf), maggio 2026 | 9,03% (7,5% nel 2024) | Quota dell'euro sul volume mondiale cripto-fiat; dollaro 54,94%, won 27,61% | primo trimestre 2026 | Non specificato nel passaggio | Parte 1, p. 2 (PDF 3) |
| [Chainalysis, "Inside Western Europe's $2 Trillion Crypto Economy"](https://www.chainalysis.com/blog/western-europe-crypto-adoption-2026/), 9 novembre 2026 | 11,8% | Quota degli scambi in euro sul volume cripto contro le 33 principali valute fiat | "fine del periodo di studio" (periodo del rapporto: luglio 2025 - giugno 2026) | Non specificato | Testo dell'articolo |
| stessa pagina | 5,1% (da 3,4%) | Quota dell'Europa occidentale sui saldi mondiali in stablecoin | luglio 2025 - giugno 2026 | Paesi inclusi non elencati nel testo letto | Sommario e testo dell'articolo |
| [Chainalysis, "2024 Western Europe Crypto Adoption"](https://www.chainalysis.com/blog/2024-western-europe-crypto-adoption/), 23 ottobre 2024 | 24% (6% per bitcoin) | Quota dell'euro sugli acquisti di stablecoin scambiati contro valute fiat, da dati di order book | non dichiarato | Non dichiarato | Testo dell'articolo |
| [IMF WP/25/141, Reuter, "Decrypting Crypto"](https://www.elibrary.imf.org/view/journals/001/2025/141/article-A001-en.xml), 2025 | 21,4% | Flussi di USDC e USDT attribuiti all'"Europa": 167 + 167 = 334 miliardi su 1.561 nelle cinque regioni. La percentuale è un nostro calcolo sulla tabella | 2024 | Ethereum, BNB Smart Chain, Optimism, Arbitrum, Base, Linea; 138 milioni di transazioni per 2.019 miliardi | Tabella 6 |
| [Bruegel Policy Brief 09/2026](https://www.bruegel.org/policy-brief/new-strategy-contain-stablecoin-risks-european-union), 2026 | 38% | Transazioni in stablecoin "basate in Europa" sul totale mondiale, attribuite per fuso orario | quarto trimestre 2025 | Dati Artemis; reti e fusi non specificati | Paragrafo che precede la figura 3; figura 3b |

Esito della verifica:

- Tutte le cifre del report 00 sono state ritrovate negli originali. Nessuna è stata eliminata.
- La voce Kaiko, prima marcata "seconda mano", è ora verificata sul PDF originale. Non
  ho trovato conferma che la cifra escluda le coppie stablecoin/euro, quindi quella
  precisazione va tolta.
- Il working paper IMF non è scaricabile da imf.org (HTTP 403): è stato letto nella
  versione integrale della IMF eLibrary.
- Il [Working Paper BCE 3199](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3199~ad552b59ec.en.pdf)
  ("Stablecoins and monetary policy transmission", Altavilla, Boucinha, Burlon, Adalid,
  Fortes, Maruhn) è stato aperto: titolo, autori e sommario corrispondono. Una ricerca
  automatica nel testo delle 46 pagine non trova alcuna quota dell'area euro sulle
  stablecoin. Non è stata fatta una lettura integrale.

Avvertenza corretta rispetto al report 00: lì il 5% della BCE era accostato alle quote
di offerta (7,5% - 15%) come se misurassero la stessa cosa. Non è così: il 5% è la
quota di consumatori che ne possiede.

## Parte B - Fattibilità del modulo 3

Fonte: ECB Data Portal, dataset BSI (Balance Sheet Items), API pubblica senza chiave
(`https://data-api.ecb.europa.eu/service/data/BSI/...`). Tutte le serie sono consistenze
di fine mese in milioni di euro, non destagionalizzate, riferite alle istituzioni
finanziarie monetarie (IFM) escluso il Sistema europeo di banche centrali.

Nei codici `{paese}` è il codice ISO a due lettere. I 21 paesi dell'area euro sono:
AT BE BG CY DE EE ES FI FR GR HR IE IT LT LU LV MT NL PT SI SK.

| Grandezza richiesta | Codice della serie | Paesi coperti | Periodo disponibile |
|---|---|---|---|
| Depositi a vista, famiglie | `BSI.M.{paese}.N.A.L21.A.1.U2.2250.Z01.E` | 21 su 21 | 2003-01 - 2026-09 |
| Depositi a vista, imprese non finanziarie | `BSI.M.{paese}.N.A.L21.A.1.U2.2240.Z01.E` | 21 su 21 | 2003-01 - 2026-09 |
| Depositi totali, famiglie | `BSI.M.{paese}.N.A.L20.A.1.U2.2250.Z01.E` | 21 su 21 | 2003-01 - 2026-09 |
| Depositi totali, imprese non finanziarie | `BSI.M.{paese}.N.A.L20.A.1.U2.2240.Z01.E` | 21 su 21 | 2003-01 - 2026-09 |
| Depositi totali, non-IFM escluso governo centrale | `BSI.M.{paese}.N.A.L20.A.1.U2.2300.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Depositi interbancari: da IFM dell'area euro, banca centrale inclusa | `BSI.M.{paese}.N.A.L20.A.1.U2.1000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Depositi interbancari: da altre banche, banca centrale esclusa | `BSI.M.{paese}.N.A.L20.A.1.U2.1210.Z01.E` | 20 su 21 (manca FR) | 2014-12 - 2026-09 |
| Titoli di debito emessi, totale | `BSI.M.{paese}.N.A.L40.A.1.U2.0000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Titoli di debito emessi, oltre 2 anni | `BSI.M.{paese}.N.A.L40.H.1.Z5.0000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Passività verso non residenti dell'area euro | `BSI.M.{paese}.N.A.LXG.A.1.U4.0000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Capitale e riserve | `BSI.M.{paese}.N.A.L60.X.1.Z5.0000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| Totale passivo | `BSI.M.{paese}.N.A.T00.A.1.Z5.0000.Z01.E` | 21 su 21 | 1997-09 - 2026-09 |
| **Passività in valuta estera** | **non disponibile come aggregato** | | |
| di cui, unico spezzone: depositi a vista non in euro degli altri intermediari finanziari | `BSI.M.{paese}.N.A.L21.A.1.U2.227A.Z06.E` | 21 su 21 | 2022-01 - 2026-09 |

Note sulla copertura:

- La data di inizio indicata è la più antica. I paesi entrati dopo partono più tardi:
  Grecia 1998-03, Slovenia 2004-01, Lituania 2004-06, Malta 2005-01, Cipro 2005-11,
  Slovacchia 2006-01, Estonia 2008-01, Lettonia 2010-09, Croazia 2010-12, Bulgaria 2022-01.
  Dettaglio in `data/processed/ecb_bsi_coverage_by_country.csv`.
- Tutte le serie arrivano a settembre 2026 per tutti i paesi coperti.
- Il settore di controparte "IFM" (codice 1000) include la banca centrale, quindi
  contiene anche il rifinanziamento presso l'Eurosystem. La variante senza banca centrale
  (codice 1210) parte solo dal 2014-12 e non esiste per la Francia.
- I depositi sono quelli dei residenti dell'area euro (codice `U2`), non dei soli
  residenti del paese; esiste anche la variante domestica (`U6`).

**Passività in valuta estera.** È l'unica grandezza richiesta che non si riesce a
ottenere. Nel dataset BSI la scomposizione per valuta (`EUR`, `Z06` = tutte tranne
l'euro) esiste solo per i prestiti e per i depositi di tre sottosettori finanziari
(S.125, S.126, S.127), dal 2022. Non esiste per i depositi di famiglie e imprese, per i
titoli emessi né per il totale del passivo. Le passività verso non residenti dell'area
euro sono un sostituto imperfetto: misurano la residenza della controparte, non la valuta.

**Campione salvato**: `data/raw/ecb_bsi_sample.csv`, 35.580 osservazioni, tutte le 13
serie, tutti i paesi coperti, da 2015-01 a 2026-09. Si rigenera con
`python src/ecb_bsi_probe.py`. L'indice di vulnerabilità non è stato costruito.

## Cosa non è stato possibile fare

- **Trovare le passività in valuta estera per paese a frequenza mensile**: non sono
  pubblicate nel dataset BSI. Fonti alternative da verificare, non ancora provate: le
  statistiche bancarie territoriali della BRI e i dati bancari consolidati della BCE,
  entrambi trimestrali.
- **Scaricare il working paper IMF da imf.org**: il sito restituisce HTTP 403 alle
  richieste automatiche. Letto dalla IMF eLibrary, che riporta il testo integrale.
- **Confermare la data esatta di pubblicazione** del riquadro BCE e del working paper
  ESM: le pagine lette non la riportano in forma leggibile. Il riquadro appartiene al
  numero 7/2026; il file ESM è nella cartella di ottobre 2026.
- **Leggere per intero il Working Paper BCE 3199**: verificati titolo, autori e
  sommario, più una ricerca automatica nel testo.
- **Verificare definizioni che gli originali non danno**: i paesi inclusi
  nell'"Europa occidentale" di Chainalysis, gli exchange coperti da Kaiko, le reti e i
  fusi usati da Bruegel/Artemis, il periodo della cifra Chainalysis del 2024.
