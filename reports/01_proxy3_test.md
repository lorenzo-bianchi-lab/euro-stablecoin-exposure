# 01 - Test della proxy 3: flussi verso exchange pesati per quota euro

Il test H1 ([00_h1_feasibility_test.md](00_h1_feasibility_test.md)) ha lasciato una proxy utilizzabile (proxy 1,
quota EUR dei volumi stablecoin/fiat: 24,3%) e una da scartare (proxy 2, orari
on-chain). Nessuna delle due misura la residenza. Qui si prova un terzo metodo, basato
sugli indirizzi degli exchange.

Come per il test H1, le sezioni 1 e 2 sono state committate **prima** di scaricare i
flussi: la cronologia git lo dimostra. Le quote EUR per exchange erano invece già note,
perché sono un risultato della proxy 1.

## 1. Criterio (fissato prima dei risultati)

Esito **INTERVALLO** se valgono tutte e tre le condizioni:

1. copertura almeno 30%;
2. proxy 3 totale compresa tra 5% e 30%;
3. ciascuno dei sei valori settimanali entro ±25% della loro media.

Esito **SOLO ANDAMENTO** se anche una sola condizione non regge. Nel primo caso il
modulo 1 darà un intervallo; nel secondo un indice nel tempo, senza livello.

## 2. Metodo pre-registrato

Periodo: 2026-10-12 - 2026-11-22, sei settimane da lunedì a domenica (UTC).

### 2.1 Etichette

Liste pubbliche del repository GitHub `duneanalytics/spellbook` (le stesse che
alimentano la tabella `cex.addresses` di Dune), lette senza chiave API:

- `cex_evms_addresses.sql`: 4.957 indirizzi di 328 exchange e servizi di custodia;
- `cex_tron_addresses.sql`: 149 indirizzi di 33 exchange.

Sono indirizzi operativi degli exchange (portafogli caldi e freddi), non gli indirizzi
di deposito dei singoli clienti. I depositi vengono contati quando l'exchange li
raccoglie nel proprio portafoglio.

### 2.2 Flussi

- Eventi `Transfer` di USDT e USDC su Ethereum e di USDT su Tron, letti da RPC
  pubblici filtrando per indirizzo etichettato. Su Ethereum si fa il censimento
  completo. Su Tron il censimento si fa se gli endpoint gratuiti lo permettono;
  altrimenti si usa un campione sistematico dichiarato o, se nemmeno quello è
  praticabile, Tron resta fuori e lo si scrive.
- **Entrata** di un exchange: trasferimento verso un suo indirizzo. **Uscita**:
  trasferimento da un suo indirizzo.
- Esclusi: i trasferimenti interni (mittente e destinatario dello stesso exchange) e
  il conio e la distruzione (indirizzo zero).
- **Flusso** di un exchange = entrate + uscite, in dollari, USDT e USDC insieme.

### 2.3 Quota EUR per exchange

Dalla proxy 1 (`data/raw/exchange_daily_volumes.csv`): volume contro EUR diviso volume
contro tutte le fiat, USDT e USDC insieme, sull'intera finestra. È definita solo per i
25 exchange del pannello della proxy 1, abbinati alle etichette per nome:

Binance, Binance.US (etichetta "Binance US"), Kraken, Coinbase (etichette "Coinbase" e
"Coinbase Prime"), Bitstamp, OKX, Bybit, Upbit, Bithumb, Coinone, Korbit, BtcTurk,
Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate (etichetta "Gate.io"), Bitget,
MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso.

### 2.4 Proxy 3 e copertura

- **Proxy 3** = somma(flusso × quota EUR) / somma(flusso), sugli exchange per cui la
  quota EUR è definita. Calcolata in totale, per token e per ciascuna delle sei
  settimane. La quota EUR di ogni exchange è tenuta fissa: le variazioni settimanali
  riflettono solo la composizione dei flussi.
- **Copertura** = flussi degli exchange con quota EUR definita divisi per i flussi di
  tutti gli indirizzi etichettati come exchange. Il totale vero dei flussi verso
  exchange non è osservabile: l'insieme di tutte le etichette è la migliore
  approssimazione gratuita, e sottostima il totale.
- Il verdetto usa la proxy 3 totale, la copertura totale e i sei valori settimanali.

### 2.5 Varianti di sensibilità (non cambiano il verdetto)

- Exchange etichettati senza coppie fiat contati con quota EUR pari a zero (limite inferiore).
- Solo entrate; solo uscite.
- Quota EUR specifica per token al posto di quella complessiva.
- Per rete (Ethereum, Tron).
- Senza le etichette "Coinbase Prime".
- Esclusione di un exchange alla volta.

### 2.6 Ipotesi debole dichiarata in partenza

Il metodo assume che i flussi on-chain di un exchange si dividano tra valute come i
suoi volumi di trading stablecoin/fiat. Non c'è motivo per cui debba essere vero: un
exchange che quota solo coppie in euro riceve quota 100% anche se quelle coppie sono
una frazione minima della sua attività, e gran parte delle stablecoin viene scambiata
contro altre crypto, non contro valute fiat.

## 3. Risultati

Eseguito il 2026-11-23/24. Tutti i numeri si riproducono con `src/proxy3_cex_flows.py`
a partire dalle tabelle giornaliere in `data/raw/cex_flows_*_daily.csv`.

### 3.1 Verdetto

| Condizione | Soglia | Valore | Esito |
|---|---|---|---|
| Copertura | almeno 30% | 91,0% | regge |
| Proxy 3 totale | tra 5% e 30% | **38,4%** | **non regge** |
| Variazione settimanale | entro ±25% della media | da -14,9% a +19,1% | regge |

**Verdetto: SOLO ANDAMENTO.** La proxy 3 supera il tetto del 30%, quindi il modulo 1
non può usarla per fissare un livello.

Due avvertenze vanno oltre il criterio e sono spiegate nelle sezioni 3.5 e 4:

- la copertura del 91% è misurata sull'insieme degli indirizzi etichettati, che però
  non contiene gli indirizzi attivi di Kraken né degli exchange coreani;
- anche l'andamento è inquinato: la crescita da 33% a 46% nelle sei settimane dipende
  per intero dal crollo dei flussi etichettati di Binance a fine ottobre.

### 3.2 Fonti delle etichette e copertura

| | Ethereum | Tron |
|---|---|---|
| Fonte delle etichette | `cex_evms_addresses.sql`, Dune Spellbook su GitHub | `cex_tron_addresses.sql`, Dune Spellbook su GitHub |
| Ultimo aggiornamento del file | 2026-01-28 | 2026-10-19 |
| Indirizzi etichettati | 4.957 (328 nomi) | 149 (33 nomi) |
| Indirizzi con flussi nel periodo | 319 | 34 |
| Flussi letti da | RPC pubblici MEV Blocker e dRPC | RPC pubblici PublicNode |
| Tipo di rilevazione | censimento completo | censimento completo |
| Flussi lordi etichettati | 271,6 mld $ | 87,9 mld $ |
| Copertura (definizione pre-registrata) | 88,6% | 98,6% |
| Flussi etichettati sul valore totale trasferito on-chain | circa 11% | circa 8% |

In totale: 13,9 milioni di trasferimenti, 359,5 miliardi di dollari di flussi lordi
etichettati, di cui 327,2 miliardi (91,0%) verso exchange con quota EUR definita. Altri
84,5 miliardi sono trasferimenti interni allo stesso exchange, esclusi. Nessuna chiave
API è stata necessaria e nessun blocco è andato perso.

L'ultima riga della tabella usa come denominatore il valore totale stimato dal campione
di blocchi del test H1: è una stima grossolana, utile solo come ordine di grandezza.

La copertura per settimana va da 84,3% a 93,9%. Per token: 92,4% su USDT, 88,8% su USDC.

### 3.3 Proxy 3

| | Proxy 3 | Copertura |
|---|---|---|
| **Totale** | **38,4%** | 91,0% |
| USDT | 29,6% | 92,4% |
| USDC | 52,9% | 88,8% |
| Ethereum (USDT e USDC) | 41,6% | 88,6% |
| Tron (USDT) | 29,7% | 98,6% |

| Settimana (lunedì) | Proxy 3 | Scarto dalla media (38,9%) | Flussi lordi (mld $) |
|---|---|---|---|
| 12 ottobre | 33,5% | -13,9% | 51,9 |
| 19 ottobre | 33,1% | -14,9% | 54,8 |
| 26 ottobre | 35,3% | -9,1% | 72,6 |
| 2 novembre | 40,0% | +3,0% | 53,5 |
| 9 novembre | 45,0% | +15,7% | 40,6 |
| 16 novembre | 46,3% | +19,1% | 53,8 |

Da dove viene il 38,4%: i dieci exchange con più flussi etichettati.

| Exchange | Flussi lordi (mld $) | Quota dei flussi etichettati | Quota EUR (proxy 1) | Contributo alla proxy 3 (punti) | Volume fiat / flussi |
|---|---|---|---|---|---|
| Coinbase | 106,5 | 29,6% | 59,3% | 19,3 | 4,7% |
| Binance | 81,6 | 22,7% | 10,9% | 2,7 | 10,0% |
| Bitfinex | 38,2 | 10,6% | 2,3% | 0,3 | 5,8% |
| OKX | 35,5 | 9,9% | 46,4% | 5,0 | 8,4% |
| Bybit | 25,5 | 7,1% | 90,9% | 7,1 | 1,5% |
| Gate | 11,3 | 3,1% | 0,0% | 0,0 | 0,0% |
| KuCoin | 9,4 | 2,6% | 100,0% | 2,9 | 0,4% |
| MEXC | 4,4 | 1,2% | 29,4% | 0,4 | 2,0% |
| Bitso | 4,1 | 1,2% | 0,0% | 0,0 | 7,2% |
| Bitstamp | 3,0 | 0,8% | 36,2% | 0,3 | 73,0% |

L'ultima colonna dice quanto pesano le coppie stablecoin/fiat dell'exchange rispetto ai
suoi flussi on-chain: è la base su cui poggia la quota EUR applicata. Tabella completa
in `data/processed/proxy3_by_exchange.csv`.

Varianti di sensibilità (non cambiano il verdetto):

| Variante | Proxy 3 |
|---|---|
| Exchange senza coppie fiat contati a quota zero | 35,0% |
| Solo entrate | 38,4% |
| Solo uscite | 38,5% |
| Quota EUR specifica per token | 44,4% |
| Senza le etichette "Coinbase Prime" | 36,8% |
| Senza Coinbase (minimo tra le esclusioni singole) | 28,4% |
| Senza Binance (massimo tra le esclusioni singole) | 47,6% |

### 3.4 Confronto con la proxy 1 e con i benchmark

| Misura | Totale | USDT | USDC |
|---|---|---|---|
| Proxy 1 - quota EUR dei volumi stablecoin/fiat | 24,3% | 11,9% | 50,4% |
| Proxy 3 - flussi pesati per quota EUR | 38,4% | 29,6% | 52,9% |

- La proxy 3 non è indipendente dalla proxy 1: usa le stesse quote EUR per exchange e
  cambia solo i pesi, dai volumi fiat ai flussi on-chain. La differenza di 14 punti
  viene tutta dai pesi: Kraken (quota EUR 29%, il 40% dei volumi fiat) pesa zero nei
  flussi etichettati, mentre Coinbase (59%) e Bybit (91%) pesano molto di più.
- Rispetto ai benchmark del test H1 ([00_h1_feasibility_test.md](00_h1_feasibility_test.md), sezione 3.5) la
  proxy 3 è sopra la quota EUR del trading crypto (9% - 12%), sopra l'unica cifra
  specifica per le stablecoin (Chainalysis 2024: 24%), sopra la quota dell'Europa in
  senso largo nei flussi (IMF: 21%) e ben sopra le quote di offerta riferite all'area euro
  o all'Europa occidentale (5,1% - 15%). Coincide con la stima per fuso orario di Bruegel/Artemis (38%), ma le due
  misure non hanno nulla in comune e la coincidenza non va letta come conferma.

### 3.5 Perché né il livello né l'andamento sono affidabili

- **Coinbase da sola vale metà del risultato** (19,3 punti su 38,4). La sua quota EUR
  del 59% è un artefatto: su Coinbase USDC si converte in dollari alla pari, fuori dal
  book, quindi i volumi in dollari mancano e l'euro risulta dominante.
- **Le quote più alte poggiano su basi minime.** Bybit (91%) e KuCoin (100%) quotano
  quasi solo coppie in euro tra le fiat, ma quelle coppie valgono l'1,5% e lo 0,4% dei
  rispettivi flussi on-chain.
- **Mancano exchange grandi.** Kraken ha 254 indirizzi etichettati, tre soli attivi e
  flussi per 148 dollari in sei settimane. Upbit, Bithumb, Korbit e Coinone insieme
  non arrivano a 0,3 miliardi. La spiegazione più probabile è che le etichette siano
  vecchie rispetto ai portafogli oggi in uso; non è stato possibile verificarlo.
- **L'andamento è un effetto delle etichette.** I flussi etichettati di Binance passano
  da circa 3,4 miliardi al giorno a meno di 1 dal 30 ottobre, su entrambe le reti, e la
  sua quota scende dal 39% al 6-8% dei flussi. Escludendo Binance, la proxy 3 è piatta:
  tra 45,8% e 49,3% in tutte le settimane. La crescita osservata non descrive quindi un
  cambiamento reale ma, con ogni probabilità, una rotazione di portafogli non ancora
  registrata nelle liste.

## 4. Limiti

I principali:

1. **L'ipotesi di base non regge alla prova dei dati.** Il metodo assume che i flussi
   on-chain di un exchange si dividano tra valute come i suoi volumi stablecoin/fiat.
   Per quasi tutti i grandi exchange quei volumi sono meno del 10% dei flussi, e la
   quota EUR dipende da quali coppie l'exchange quota più che da chi sono i clienti.
2. **La copertura vera non è nota.** Il 91% è calcolato sull'insieme etichettato, che è
   incompleto e datato (file Ethereum fermo a gennaio 2026). I flussi etichettati sono
   circa un decimo del valore trasferito on-chain e non c'è modo, con dati gratuiti, di
   sapere quanta parte del resto riguarda exchange.
3. **Il risultato dipende da pochi nomi e da poche etichette.** Togliendo un solo
   exchange la proxy 3 va dal 28% al 48%; dieci indirizzi spiegano quasi due terzi dei
   flussi. Un errore o un ritardo su una singola etichetta sposta il risultato di
   parecchi punti.
4. **Non misura la residenza.** Come le proxy 1 e 2, pesa attività in euro, non
   detenzioni di residenti dell'area euro.

Altri limiti:

- Gli indirizzi etichettati sono portafogli operativi. I depositi dei clienti vengono
  contati solo quando l'exchange li raccoglie, e una parte dei flussi è movimentazione
  tra exchange, custodi e market maker, non attività di clienti.
- Sono coperte solo Ethereum e Tron; mancano Solana, BNB Chain e le reti di secondo livello.
- Le etichette non sono state verificate in modo indipendente.
- Sei settimane sono poche per giudicare la stabilità.

## 5. Cosa non è stato possibile fare

- **Etichettare Kraken e gli exchange coreani**: le liste gratuite non contengono i
  loro indirizzi attivi. Una chiave Dune non risolverebbe il problema, perché la tabella
  `cex.addresses` di Dune è costruita su queste stesse liste. Servirebbero etichette
  più aggiornate (Arkham, Nansen, Etherscan), che sono a pagamento o richiedono un account.
- **Misurare la copertura sul totale vero dei flussi verso exchange**: quel totale non
  è osservabile senza un insieme di etichette completo.
- **Verificare la causa del calo di Binance**: la rotazione dei portafogli è l'ipotesi
  più probabile, ma non è stata confermata.
- **Identificare gli indirizzi di deposito dei clienti**: richiede l'analisi delle
  transazioni di raccolta per ogni exchange, fuori dalla portata di un test di fattibilità.
- **Coprire altre reti**: non incluse.
- **Usare Dune**: non è servito; etichette e flussi sono stati ottenuti senza chiave.

## 6. Indicazioni per il modulo 1

- Non usare la proxy 3 né per il livello né, allo stato attuale, per l'andamento.
- L'indice nel tempo più solido tra quelli provati resta la proxy 1 (quota EUR dei
  volumi stablecoin/fiat), che nelle sei settimane oscilla solo tra 22,4% e 25,2%.
  Va tenuta separata per USDT e USDC.
- Se si vuole ritentare un metodo per indirizzi, il primo passo è procurarsi etichette
  aggiornate e controllarne la continuità exchange per exchange prima di aggregare.

## 7. Riproducibilità

```bash
.venv/bin/python src/cex_flows_fetch.py     # censimento dei flussi, circa 30 minuti
.venv/bin/python src/proxy3_cex_flows.py    # proxy 3, copertura e verdetto
```

Le etichette vengono scaricate da GitHub a una versione fissata (commit `9f61b0dd2b`
per Ethereum, `447a87c906` per Tron) e non sono incluse in questo repository, perché
sono distribuite da Dune con licenza Business Source License.

---

**Cosa aggiunge questo al programma finale**: la scoperta che la quota EUR di Coinbase
è un artefatto, da cui la variante "senza Coinbase" dell'indice del modulo 2; il
censimento dei flussi di USDT e USDC di 121 exchange su Ethereum e Tron, riutilizzabile
come dato di contesto; e l'esclusione motivata dei metodi basati su etichette gratuite.
