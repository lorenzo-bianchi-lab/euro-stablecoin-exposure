# 02 - Verifica dei benchmark e fattibilità del modulo 3

Dopo i test [00](00_h1_feasibility_test.md) e [01](01_proxy3_test.md) il progetto è stato ridefinito
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
Russia, Ucraina, Turchia e Regno Unito. La circolazione a cui applicano la quota è la
somma di USDT e USDC (174 + 74 miliardi, sezione 4.4.1, p. 39), che assumono
rappresentare tutte le stablecoin in dollari: precisazione aggiunta dopo il modulo 1
([report 06](06_module1_level.md), sezione 3.2). Non è una stima empirica e non ha un intervallo
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
| **Passività in valuta estera** | **non disponibile nel dataset BSI; recuperata dalla BRI, vedi sotto** | | |
| unico spezzone BSI: depositi a vista non in euro degli altri intermediari finanziari | `BSI.M.{paese}.N.A.L21.A.1.U2.227A.Z06.E` | 21 su 21 | 2022-01 - 2026-09 |

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

**Passività in valuta estera: metodo fallito e alternativa provata.** Nel dataset BSI
la scomposizione per valuta (`EUR`, `Z06` = tutte tranne l'euro) esiste solo per i
prestiti e per i depositi di tre sottosettori finanziari (S.125, S.126, S.127), dal
2022. Non esiste per i depositi di famiglie e imprese, per i titoli emessi né per il
totale del passivo.

L'alternativa funziona: le statistiche bancarie territoriali della BRI (Locational
Banking Statistics), API pubblica senza chiave
(`https://stats.bis.org/api/v2/data/dataflow/BIS/WS_LBS_D_PUB/1.0/...`), pubblicano le
passività delle banche residenti in ciascun paese per valuta. Importi in milioni di
dollari, consistenze di fine trimestre, tutte le controparti e tutti gli strumenti.

| Grandezza | Codice della serie BRI | Paesi coperti | Periodo disponibile |
|---|---|---|---|
| Passività totali, tutte le valute | `Q.S.L.A.TO1.A.5J.A.{paese}.A.5J.A` | 13 su 21 | 1977-Q4 - 2026-Q2 |
| Passività in valuta nazionale (euro) | `Q.S.L.A.TO1.D.5J.A.{paese}.A.5J.A` | 13 su 21 | 1977-Q4 - 2026-Q2 |
| Passività in valuta estera, totale | `Q.S.L.A.TO1.F.5J.A.{paese}.A.5J.A` | 13 su 21 | 1977-Q4 - 2026-Q2 |
| Passività in dollari | `Q.S.L.A.USD.F.5J.A.{paese}.A.5J.A` | 13 su 21 | 1977-Q4 - 2026-Q2 |

- Paesi coperti: AT BE CY DE ES FI FR GR IE IT LU NL PT. Mancano BG EE HR LT LV MT SI SK,
  che non dichiarano alla BRI.
- La data di inizio è la più antica. La serie in dollari parte più tardi per alcuni
  paesi: Paesi Bassi 2014-Q4, Austria 2013-Q4, Spagna 2012-Q2, Portogallo 2009-Q3,
  Cipro 2008-Q4, Francia e Italia 2007-Q3. Dettaglio in
  `data/processed/bis_lbs_coverage_by_country.csv`.
- La frequenza è trimestrale, non mensile come richiesto.
- Per Austria e Finlandia valuta nazionale ed estera non sommano al totale: una parte
  delle passività non è attribuita a una valuta.

Primo risultato già leggibile, secondo trimestre 2026: quota delle passività bancarie
in dollari sul totale, per paese.

| Paese | Passività totali (mld $) | In valuta estera | In dollari |
|---|---|---|---|
| Lussemburgo | 1.104 | 38,8% | 27,2% |
| Francia | 15.522 | 21,6% | 14,9% |
| Irlanda | 1.178 | 20,9% | 14,8% |
| Paesi Bassi | 2.862 | 19,8% | 14,3% |
| Cipro | 73 | 12,7% | 10,4% |
| Germania | 11.630 | 13,5% | 9,4% |
| Spagna | 3.386 | 12,1% | 9,4% |
| Finlandia | 800 | 20,5% | 9,3% |
| Belgio | 1.660 | 14,6% | 8,2% |
| Grecia | 316 | 6,1% | 5,4% |
| Austria | 1.171 | 6,3% | 4,2% |
| Italia | 4.785 | 3,6% | 2,8% |
| Portogallo | 565 | 2,2% | 2,0% |

Questa tabella è una lettura diretta dei dati BRI, non l'indice del modulo 3. Dice
quali sistemi bancari si finanziano già oggi in dollari, che è il canale indicato dal
Working Paper BCE 3199 per le stablecoin in valuta estera.

**Campioni salvati**:

- `data/raw/ecb_bsi_sample.csv`: 35.580 osservazioni, le 13 serie BCE, tutti i paesi
  coperti, da 2015-01 a 2026-09. Si rigenera con `python src/ecb_bsi_probe.py`.
- `data/raw/bis_lbs_fx_liabilities_sample.csv`: 2.392 osservazioni, le 4 serie BRI,
  13 paesi, da 2015-Q1 a 2026-Q2. Si rigenera con `python src/bis_lbs_probe.py`.

L'indice di vulnerabilità non è stato costruito.

## Cosa non è stato possibile fare

- **Avere le passività in valuta estera a frequenza mensile e per tutti i 21 paesi**:
  la fonte trovata (BRI) è trimestrale e copre 13 paesi. Per gli altri otto non ho
  ancora una fonte; i dati bancari consolidati della BCE sono la prossima da provare.
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

---

**Cosa aggiunge questo al programma finale**: i livelli di riferimento del modulo 1
riletti sugli originali (5% dei consumatori; 7,5% - 15% della circolazione, cioè 19
miliardi di dollari al terzo trimestre 2025), le 12 serie BCE e le 4 serie BRI già
scaricabili con uno script per il modulo 3, e una prima classifica utilizzabile: la
quota di passività bancarie in dollari per paese.
