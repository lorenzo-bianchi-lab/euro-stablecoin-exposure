# 01 - Test della proxy 3: flussi verso exchange pesati per quota euro

Il test H1 ([00_test_H1.md](00_test_H1.md)) ha lasciato una proxy utilizzabile (proxy 1,
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

_Da compilare dopo l'esecuzione degli script._
