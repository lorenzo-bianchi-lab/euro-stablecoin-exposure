# 03 - Modulo 2: indice settimanale della quota EUR

Il modulo 2 di [SPEC.md](../SPEC.md) chiede un indice settimanale della quota EUR dei
volumi spot stablecoin/fiat, separato per USDT e USDC, con e senza Coinbase.

Le sezioni 1 e 2 (profondità dello storico e metodo) sono state committate **prima** di
calcolare le serie. Erano già noti solo i valori delle ultime sei settimane, dal test 00.

## 1. Profondità dello storico per exchange

Misurata il 2026-11-24 chiedendo a ogni API le candele giornaliere dal 2023-01-02.

| Storico disponibile | Exchange | Causa del limite |
|---|---|---|
| Almeno dal 2023-01-02 | Binance, Binance.US, Coinbase, Bitstamp, OKX, Bybit, Korbit, BtcTurk, Bitvavo, Bitfinex, Crypto.com, KuCoin, Gate, Bitget, WhiteBIT, Indodax, BTC Markets, Bitso | Nessuno entro la finestra richiesta |
| Dal 2023-11-29 | Coinone | Data di quotazione delle coppie |
| Dal 2023-12-07 | Bithumb | Data di quotazione delle coppie |
| Dal 2024-02 / 2024-03 | CoinDCX | L'API restituisce al massimo 1.000 candele |
| Dal 2024-06-07 | Upbit | Data di quotazione delle coppie |
| Dal 2024-11 / 2025-02 | MEXC | Data di quotazione delle coppie |
| **Dal 2024-12-04** | **Kraken** | **L'API restituisce solo le ultime 720 candele** |
| Dal 2025-11-25 | Gemini | L'API restituisce una finestra fissa di circa un anno |

Kraken è il vincolo che conta: nel test 00 valeva il 40% dei volumi del pannello. Il suo
limite è mobile (720 giorni da oggi), quindi lo storico va accumulato: i volumi
scaricati vengono salvati in un archivio che cresce a ogni esecuzione e non dipende più
da quanto l'API restituisce in futuro.

## 2. Metodo (fissato prima del calcolo)

### 2.1 Definizione

Per ogni settimana da lunedì a domenica (UTC), per ogni stablecoin e per un dato insieme
di exchange:

    indice = volume scambiato contro EUR / volume scambiato contro tutte le valute fiat

con i volumi espressi in unità di stablecoin, come nella proxy 1 del test 00. Si
calcolano solo le settimane complete.

### 2.2 Le serie

Quattro serie principali, come da SPEC:

| Serie | Stablecoin | Exchange |
|---|---|---|
| `usdt` | USDT | tutti |
| `usdt_senza_coinbase` | USDT | tutti tranne Coinbase |
| `usdc` | USDC | tutti |
| `usdc_senza_coinbase` | USDC | tutti tranne Coinbase |

In più, a solo titolo di riferimento, la serie `totale` (USDT e USDC insieme), che
corrisponde alla proxy 1 del test 00.

### 2.3 Due finestre

- **Indice principale**: pannello completo dei 25 exchange, dalla settimana del
  2024-12-09 (prima settimana intera coperta da Kraken) all'ultima settimana chiusa.
- **Indice lungo**: stesse quattro serie dal 2023-01-02, calcolate **senza Kraken e
  senza Gemini** in tutte le settimane, perché il loro storico non arriva così indietro.
  Serve a vedere l'andamento su quattro anni; il suo livello non è confrontabile con
  quello dell'indice principale. Le due serie si sovrappongono dal 2024-12-09, e la
  differenza tra le due in quel tratto viene riportata.

### 2.4 Pannello e registro

- Il pannello è l'elenco di coppie di `src/exchange_fetch.py`, fissato il 2026-11-23.
  Non si aggiungono né si tolgono exchange in base ai risultati.
- Per ogni settimana e ogni exchange si registrano i giorni con dati e il volume. Un
  exchange "entra" nella prima settimana in cui ha dati e "esce" nell'ultima; ingressi
  e uscite vengono elencati con la data.
- Gemini entra nell'indice principale dalla settimana del 2025-12-01. È l'unico
  ingresso dovuto a un limite dell'API e non a un evento di mercato.
- Controllo di robustezza: le stesse serie su un **pannello costante**, cioè i soli
  exchange presenti in tutte le settimane della finestra.

### 2.5 Cosa riceve l'analista

Per ciascuna serie: valore dell'ultima settimana, variazione sulla settimana precedente
in punti percentuali, media delle ultime 4 settimane, media e deviazione standard delle
ultime 52 settimane, scarto standardizzato dell'ultima settimana rispetto alle 52.

### 2.6 Riproducibilità

- I volumi giornalieri vengono salvati in un archivio cumulativo
  (`data/raw/m2_daily_volumes.csv`). Un giorno già archiviato non viene sovrascritto.
- A ogni esecuzione i valori appena scaricati vengono confrontati con quelli in archivio
  e le differenze sono registrate.
- Il controllo richiesto da SPEC consiste in due esecuzioni consecutive: la seconda deve
  dare gli stessi valori per tutte le settimane chiuse. Si riporta anche di quanto
  cambierebbe l'indice usando i soli dati riscaricati.

### 2.7 Limiti noti in partenza

- L'indice misura trading in euro sui book centralizzati, non detenzioni né residenza.
- Bithumb e Korbit chiudono il giorno alle 00:00 ora coreana e Bitso alle 06:00 UTC:
  il confine settimanale di questi exchange è spostato di alcune ore.
- I volumi dichiarati dagli exchange non sono filtrati.

## 3. Risultati

_Da compilare dopo l'esecuzione dello script._
