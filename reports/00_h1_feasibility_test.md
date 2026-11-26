# 00 - Test di fattibilità dell'ipotesi H1

> **H1**: indicatori pubblici indipendenti danno stime tra loro coerenti della quota
> di attività in stablecoin in dollari (USDT, USDC) attribuibile all'area euro.

Questo documento è scritto in due tempi. Le sezioni 1 e 2 (criterio e metodo) sono
state committate **prima** di scaricare qualsiasi volume o profilo orario: la
cronologia git lo dimostra. Le sezioni successive riportano i risultati.

## 1. Criterio di decisione (fissato prima dei risultati)

Sia R il rapporto tra la stima centrale più alta e quella più bassa delle due proxy.

| R | Verdetto |
|---|---|
| R ≤ 2 | GO |
| 2 < R ≤ 4 | GO CON RISERVA (intervallo ampio, da dichiarare) |
| R > 4 | NO-GO |

Il verdetto si calcola sulle due **stime centrali** definite qui sotto. Gli intervalli
servono a descrivere l'incertezza e non modificano il verdetto.

## 2. Metodo pre-registrato

Finestra comune alle due proxy: sei settimane complete, da lunedì 2026-10-12 00:00 UTC
a lunedì 2026-11-23 00:00 UTC (42 giorni).

### 2.1 Proxy 1 - Exchange

- **Grandezza**: quota dei volumi spot di USDT e USDC scambiati contro EUR sul totale
  dei volumi scambiati contro valute fiat.
- **Universo**: tutte le coppie spot stablecoin/fiat (in entrambi i versi, per esempio
  USDT/EUR e EUR/USDT) sugli exchange che espongono candele giornaliere tramite API
  pubblica gratuita senza chiave e che risultano raggiungibili. L'elenco si chiude in
  base alla raggiungibilità, non in base ai volumi osservati.
- **Unità**: volume espresso in unità di stablecoin (circa dollari). Se la stablecoin
  è la valuta base si usa il volume base; se è la valuta quotata si usa il volume
  quotato o, se manca, volume base per prezzo di chiusura.
- **Stima centrale P1**: somma dei volumi contro EUR divisa per la somma dei volumi
  contro tutte le fiat, USDT e USDC insieme, sull'intera finestra.
- **Intervallo P1**: minimo e massimo tra (a) le sei quote settimanali, (b) la quota
  calcolata solo su USDT e solo su USDC, (c) la quota ricavata da un'istantanea a 24
  ore dei ticker CoinGecko, che copre più exchange ma un solo giorno (esclusi i ticker
  marcati come anomali o non aggiornati).
- **Robustezza** (riportata, fuori dall'intervallo): esclusione di un exchange alla
  volta; quota EUR sul totale delle fiat diverse dal dollaro.

### 2.2 Proxy 2 - Orari on-chain

- **Grandezza**: quota dei trasferimenti on-chain compatibile con l'orario lavorativo
  europeo.
- **Serie**: USDT su Ethereum, USDC su Ethereum, USDT su Tron (USDC su Tron non è più
  supportata dall'emittente e viene esclusa).
- **Dati**: eventi `Transfer` dei contratti, letti da RPC pubblici. Il censimento
  completo non è praticabile gratis (circa un milione di eventi al giorno su Ethereum
  e alcuni milioni su Tron), quindi si usa un **campione sistematico di blocchi**:
  un blocco ogni 50 su Ethereum e uno ogni 200 su Tron, cioè circa sei blocchi per
  ora su ciascuna rete. Il campionamento è uniforme nel tempo e non altera il profilo
  orario. Sono dati reali campionati, non simulati.
- **Metrica principale**: numero di trasferimenti (esclusi conio e distruzione, cioè
  da o verso l'indirizzo zero). Metriche di sensibilità: trasferimenti di taglia
  "retail" (tra 1 e 10.000 dollari) e valore trasferito.
- **Profilo orario**: media dei trasferimenti per blocco campionato in ciascuna delle
  24 ore UTC. Versione principale sui soli giorni feriali (lunedì-venerdì UTC);
  versione di sensibilità su tutti i giorni.
- **Metodo A (principale), scomposizione in tre fasce**: il profilo è modellato come
  una componente piatta (attività automatica 24 ore su 24, non attribuita) più tre
  componenti regionali non negative. Ogni componente regionale vale 1 nelle ore
  lavorative locali 09:00-18:00 e 0 altrove, con fusi di riferimento Asia/Shanghai,
  Europe/Berlin e America/New_York e ora legale reale giorno per giorno. I pesi si
  stimano con minimi quadrati non negativi. Quota Europa = peso Europa diviso la
  somma dei tre pesi regionali.
- **Metodo B (sensibilità), partizione semplice**: quota dell'attività che cade nella
  fascia 08:00-16:00 UTC, con Asia 00:00-08:00 e Americhe 16:00-24:00. Con un profilo
  piatto questo metodo restituisce 33,3% per costruzione.
- **Stima centrale P2**: media semplice della quota Europa del metodo A sulle tre
  serie, metrica principale, giorni feriali.
- **Intervallo P2**: minimo e massimo su tutte le combinazioni di serie, metrica,
  metodo e insieme di giorni.

### 2.3 Limiti noti in partenza

- L'orario europeo comprende Regno Unito, Svizzera e Africa e non distingue l'area
  euro dal resto del fuso.
- I volumi sugli exchange misurano il trading, non le detenzioni.
- Le due proxy non misurano la stessa grandezza: la prima è una quota di valuta
  (EUR sulle fiat), la seconda una quota di fuso orario. La coerenza tra le due è
  proprio ciò che H1 mette alla prova.

## 3. Risultati

Eseguito il 2026-11-23. Tutti i numeri sono riproducibili con gli script in `src/`
a partire dai file in `data/raw/`.

### 3.1 Verdetto

| | Stima centrale | Intervallo |
|---|---|---|
| Proxy 1 - quota EUR dei volumi stablecoin/fiat | **24,3%** | 11,9% - 50,4% |
| Proxy 2 - quota "orario europeo" on-chain | **52,4%** | 27,3% - 85,0% |

**R = 52,4 / 24,3 = 2,16 → GO CON RISERVA.**

Il verdetto è quello che il criterio pre-registrato produce, e non è stato ritoccato.
Va però letto con tre avvertenze, sviluppate nella sezione 4:

- R è a ridosso della soglia tra GO e GO CON RISERVA. L'incertezza campionaria della
  sola proxy 2 (ricampionamento dei giorni, 95%: 45,4% - 61,0%) sposta R tra 1,87 e 2,51.
- Gli intervalli delle due proxy si sovrappongono, ma sono molto larghi: combinando
  gli estremi, R va da 1 a 7,1.
- Entrambe le stime sono molto sopra i benchmark pubblicati per l'area euro (7,5% - 15%).
  La coerenza trovata riguarda due misure di "attività in euro o in orario europeo",
  non la quota detenuta dai residenti dell'area euro.

### 3.2 Fonti usate e periodo

Periodo: 2026-10-12 - 2026-11-22 (42 giorni, sei settimane complete) per entrambe le proxy.

| Dato | Fonte | Chiave API | Copertura |
|---|---|---|---|
| Volumi giornalieri stablecoin/fiat | API pubbliche di 25 exchange: Binance, Binance.US, Kraken, Coinbase, Bitstamp, OKX, Bybit, Upbit, Bithumb, Coinone, Korbit, BtcTurk, Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate, Bitget, MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso | no | 142 coppie con dati, 53,7 miliardi di dollari scambiati |
| Istantanea 24 ore dei ticker | CoinGecko, API pubblica | no | 142 ticker validi su 48 exchange, 1,03 miliardi di dollari, rilevata il 2026-11-23 tra le 07:16 e le 09:38 UTC |
| Trasferimenti USDT e USDC su Ethereum | RPC pubblici dRPC e MEV Blocker (`eth_getLogs`) | no | 6.029 blocchi campionati (uno ogni 50), 1.082.677 trasferimenti |
| Trasferimenti USDT su Tron | RPC pubblici PublicNode, TronGrid per le intestazioni | no | 6.046 blocchi campionati (uno ogni 200), 489.934 trasferimenti |

Nessuna fonte ha richiesto una chiave API. Nessun blocco campionato è andato perso.

### 3.3 Proxy 1 - Exchange

Quota EUR sul totale dei volumi contro fiat, USDT e USDC insieme: **24,3%**.

| Valuta | Quota del volume | di cui USDT (mld $) | di cui USDC (mld $) |
|---|---|---|---|
| USD | 41,2% | 16,6 | 5,5 |
| EUR | 24,3% | 4,3 | 8,7 |
| KRW | 17,0% | 8,1 | 1,0 |
| BRL | 7,5% | 3,3 | 0,8 |
| TRY | 3,5% | 1,7 | 0,2 |
| GBP | 2,2% | 0,6 | 0,6 |
| altre 19 valute | 4,2% | | |

Componenti dell'intervallo:

| Variante | Quota EUR |
|---|---|
| Settimana per settimana (sei valori) | da 22,4% a 25,2% |
| Solo USDT | 11,9% |
| Solo USDC | 50,4% |
| Istantanea CoinGecko, 48 exchange, 24 ore | 24,3% |

Robustezza, fuori dall'intervallo:

- Togliendo un exchange alla volta la quota resta tra 20,7% e 26,7%. Il pannello è
  però concentrato: Kraken vale il 39,7% del volume, Binance il 15,2%, Coinbase il 9,3%.
- Quota EUR sulle sole fiat diverse dal dollaro: 41,3%.
- CoinGecko marca come "anomali" i ticker USDT/KRW di Upbit, Bithumb e Coinone. Se
  li si include la quota dell'istantanea scende a 20,5%. La regola pre-registrata li
  esclude; nel pannello a sei settimane quegli stessi exchange sono inclusi.

Lettura: la stabilità nel tempo è alta (meno di tre punti tra una settimana e l'altra),
quella tra token è bassa. USDC è scambiata contro euro quattro volte più di USDT, ed è
questo scarto a generare quasi tutta la larghezza dell'intervallo.

### 3.4 Proxy 2 - Orari on-chain

![Profilo orario dei trasferimenti](figures/00_hourly_profiles.png)

Giorni feriali, numero di trasferimenti (metrica principale):

| Serie | Metodo A: quota Europa | Componente piatta | Metodo B: fascia 08-16 UTC |
|---|---|---|---|
| USDT su Ethereum | 63,6% | 90% | 36,8% |
| USDC su Ethereum | 32,3% | 86% | 35,6% |
| USDT su Tron | 61,3% | 58% | 45,8% |
| **Media (stima centrale)** | **52,4%** | | 39,4% |

Con un profilo perfettamente piatto il metodo B darebbe 33,3%.

L'intervallo 27,3% - 85,0% copre le 36 combinazioni di serie, metrica, metodo e
insieme di giorni (tabella completa in `data/processed/proxy2_decomposition.csv`).
Limitandosi alla metrica principale l'intervallo è 27,3% - 63,6%. L'estremo superiore
viene dal valore trasferito su Tron, che è dominato da pochi trasferimenti molto grandi.

Lettura, in ordine di importanza:

- Su Ethereum il profilo è quasi piatto: ogni ora pesa tra il 2,9% e il 5,0% del
  totale e la componente piatta assorbe l'86% - 90% dell'attività. La quota Europa
  del metodo A è quindi calcolata su circa un decimo dei trasferimenti.
- Il metodo A assegna peso zero all'Asia su Ethereum. Non è un risultato credibile:
  la componente piatta assorbe il livello minimo della giornata, che cade nelle ore
  asiatiche, e la quota delle altre due fasce risulta gonfiata.
- Su Tron il ciclo giornaliero è netto (da 1,7% a 6,2% per ora) ma non ha la forma
  di un orario d'ufficio europeo: sale dalle 00 UTC e culmina alle 13-15 UTC. È
  compatibile con la veglia in Asia sommata alla giornata di Medio Oriente, Turchia,
  Russia e Africa, che condividono la fascia oraria europea.

### 3.5 Benchmark esterno

Aggiornamento del 2026-11-24: tutte le cifre di questa tabella sono state rilette sui
documenti originali. Valore, periodo, campione e pagina di ciascuna sono in
[02_benchmarks_and_module3_data.md](02_benchmarks_and_module3_data.md), parte A. Nessuna fonte pubblica
una quota **misurata** dell'area euro sulle stablecoin in dollari.

| Fonte | Cifra | Cosa misura | Dove |
|---|---|---|---|
| [ESM Working Paper 79](https://www.esm.europa.eu/system/files/document/2026-10/WP%2079.pdf), 2026 | 7,5% (scenario alto 15%) | Area euro sulla circolazione mondiale di stablecoin in dollari. È un'ipotesi di calibrazione, non una stima | Sezione 5.1, pp. 47-48 |
| [ESMA, "Crypto assets: Market structures and EU relevance"](https://www.esma.europa.eu/sites/default/files/2024-04/ESMA50-524821-3153_risk_article_crypto_assets_market_structures_and_eu_relevance.pdf), 2024 | circa 10% | EUR sui volumi fiat-crypto, tutte le crypto, dati Kaiko da dic 2020 a dic 2023 | p. 7, grafico 5 |
| [Kaiko, "The State of the European Crypto Market 2025-2026"](https://resources.kaiko.com/hubfs/Research/The%20State%20of%20the%20European%20Crypto%20Market%20-%202025%20-%202026%20Trends%20in%20Trading%20Activity.pdf), mag 2026 | 9,0% | EUR sul volume mondiale crypto-fiat, primo trimestre 2026 | Parte 1, p. 2 |
| [Chainalysis](https://www.chainalysis.com/blog/western-europe-crypto-adoption-2026/), nov 2026 | 11,8% | Scambi in euro sul volume crypto contro 33 valute fiat, fine del periodo luglio 2025 - giugno 2026 | Testo dell'articolo |
| [Chainalysis](https://www.chainalysis.com/blog/2024-western-europe-crypto-adoption/), ott 2024 | 24% | EUR sugli acquisti di stablecoin contro valute fiat. Unica cifra specifica per le stablecoin; periodo e campione non dichiarati | Testo dell'articolo |
| [IMF WP/25/141](https://www.elibrary.imf.org/view/journals/001/2025/141/article-A001-en.xml), Reuter, 2025 | 21,4% | "Europa" in senso largo sui flussi USDT e USDC del 2024 (nostro calcolo: 334 su 1.561 miliardi). Usa anche profili orari | Tabella 6 |
| [Bruegel Policy Brief 09/2026](https://www.bruegel.org/policy-brief/new-strategy-contain-stablecoin-risks-european-union), 2026 | 38% | Transazioni in stablecoin attribuite all'Europa per fuso orario, quarto trimestre 2025, dati Artemis | Figura 3b |
| [Chainalysis](https://www.chainalysis.com/blog/western-europe-crypto-adoption-2026/), nov 2026 | 5,1% | Europa occidentale sui saldi mondiali in stablecoin, luglio 2025 - giugno 2026 | Testo dell'articolo |
| [BCE, Bollettino economico 7/2026](https://www.ecb.europa.eu/press/economic-bulletin/focus/2026/html/ecb.ebbox202607_08~f4ddf0117c.en.html) | 5% | Consumatori dell'area euro che dichiarano di possedere stablecoin, agosto 2025, indagine CES in 11 paesi. È una diffusione, non una quota dell'offerta | Grafico B, riquadro a |

Il documento di riferimento del progetto, [ECB Working Paper 3199](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3199~ad552b59ec.en.pdf)
("Stablecoins and monetary policy transmission", marzo 2026), studia la sostituzione dei
depositi con dati granulari sulle banche dell'area euro. Una ricerca nel testo non
trova alcuna quota dell'area euro sulle stablecoin.

Confronto:

- La proxy 1 (24,3%) coincide con l'unica cifra pubblicata specifica per le
  stablecoin (Chainalysis 2024: 24%) ed è circa il doppio della quota EUR sul trading
  crypto complessivo (9% - 12%).
- La proxy 2, metodo B (36% - 46%), è nello stesso ordine di grandezza dell'altra
  stima per fuso orario (Bruegel/Artemis: 38%). Il metodo A (52,4%) è sopra ogni
  benchmark.
- Entrambe sono ben sopra le quote di offerta riferite all'area euro o all'Europa
  occidentale (5,1% - 15%).

## 4. Limiti

I tre principali:

1. **La proxy 2 non identifica l'area euro, e a fatica l'Europa.** Su Ethereum
   l'86% - 90% dell'attività non ha ciclo giornaliero (bot, arbitraggio, protocolli) e
   la quota è stimata sul residuo. La fascia europea si sovrappone alla sera asiatica
   e al mattino americano e comprende Regno Unito, Svizzera, Africa, Medio Oriente,
   Turchia e Russia. Il peso zero dell'Asia su Ethereum mostra che la scomposizione
   scelta non separa bene le tre fasce.
2. **La proxy 1 misura il trading in euro, non le detenzioni né la residenza.**
   Copre solo i book centralizzati con candele pubbliche: restano fuori OTC, P2P,
   emissione e rimborso diretti e gli acquisti di stablecoin contro altre crypto. Una
   coppia in euro può essere usata da non residenti e da market maker. Il risultato
   dipende molto dalla composizione: un solo exchange vale il 40% del volume e la
   quota passa dal 12% (USDT) al 50% (USDC).
3. **La coerenza trovata è debole e in parte nominale.** Le due proxy misurano
   grandezze diverse e nessuna delle due è vicina ai benchmark per l'area euro. R sta
   tra 1,6 e 2,5 a seconda di scelte di specificazione tutte ragionevoli (per esempio
   R = 1,62 usando il metodo B al posto del metodo A), quindi il verdetto non è robusto
   rispetto alla soglia di 2.

Altri limiti:

- I dati on-chain sono un campione (2% dei blocchi Ethereum, 0,5% dei blocchi Tron).
  L'errore campionario sui conteggi è piccolo; sul valore trasferito è grande.
- Sono coperte solo Ethereum e Tron. Mancano Solana, BNB Chain e le reti di secondo
  livello, dove passa una parte rilevante di USDC e USDT.
- La finestra contiene il cambio dell'ora in Europa (25 ottobre) e negli Stati Uniti
  (1 novembre). I profili regionali ne tengono conto giorno per giorno.
- Sei settimane non dicono nulla sulla stabilità di lungo periodo.
- I volumi dichiarati dagli exchange possono includere scambi fittizi. Non è stato
  applicato alcun filtro, per non introdurre scelte soggettive dopo aver visto i dati.

## 5. Cosa non è stato possibile fare

- **Censimento completo dei trasferimenti**: con gli RPC gratuiti richiederebbe
  decine di gigabyte e molte ore. Si è usato un campione sistematico.
- **Dune, Etherscan, BigQuery**: richiedono una chiave o un account e non sono stati
  usati. Una chiave Dune gratuita permetterebbe il censimento completo e l'analisi per
  indirizzo; per questo test non è servita.
- **TronGrid senza chiave** limita a 3 richieste al secondo: sostituito con PublicNode.
- **Exchange non raggiunti o senza storico gratuito**: Mercado Bitcoin (HTTP 403),
  Bitkub (HTTP 502), HTX (simboli fiat non validi), Luno (candele solo con
  autenticazione), Paribu, Independent Reserve, Coins.ph, Bit2Me. Alcuni compaiono
  solo nell'istantanea CoinGecko. bitFlyer non quota stablecoin. Una coppia Bitget
  (RON/USDT) ha restituito errore e 12 coppie Binance non hanno dati nella finestra.
- **Storico CoinGecko**: l'API gratuita dà solo le ultime 24 ore. L'istantanea è di
  lunedì mattina e copre in buona parte la domenica.
- **USDC su Tron**: esclusa, l'emittente non la supporta più.
- **Distinzione tra area euro e resto d'Europa**: nessuna delle due proxy la consente.
- **Verifica indipendente dei benchmark**: le cifre "di seconda mano" e quelle lette
  solo sulla pagina web non sono state ricontrollate sui documenti originali. Il PDF
  di Kaiko e le pagine di Bloomberg e Bitvavo non erano accessibili.

## 6. Indicazioni per il passo successivo

- Tenere la proxy 1 come indicatore principale, separando sempre USDT e USDC.
- Sostituire la proxy 2 con una misura che identifichi la residenza: indirizzi di
  deposito di exchange europei, oppure il metodo IMF (etichette regionali più profili
  orari per indirizzo). Entrambe richiedono dati per indirizzo, quindi una chiave Dune.
- Aggiungere una terza proxy indipendente (per esempio traffico web o download delle
  app per paese) prima di ripartire la quota tra i sistemi bancari nazionali.

## 7. Riproducibilità

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python src/exchange_fetch.py      # volumi giornalieri, circa 1 minuto
.venv/bin/python src/coingecko_snapshot.py  # istantanea 24 ore, circa 15 minuti
.venv/bin/python src/onchain_fetch.py       # campione di blocchi, circa 30 minuti
.venv/bin/python src/proxy1_exchange.py
.venv/bin/python src/proxy2_onchain.py
.venv/bin/python src/h1_decision.py
```

Rieseguire gli script di raccolta in un altro giorno cambia l'istantanea CoinGecko;
i dati della finestra 12 ottobre - 22 novembre restano gli stessi.

---

**Cosa aggiunge questo al programma finale**: la quota EUR dei volumi stablecoin/fiat
(24,3%, stabile tra 22,4% e 25,2% nelle sei settimane), che diventa l'indice del modulo
2 con la raccolta dati già funzionante su 25 exchange, e la prova che il profilo orario
on-chain non distingue l'Europa e non va usato.
