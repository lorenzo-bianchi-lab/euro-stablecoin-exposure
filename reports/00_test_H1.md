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

_Da compilare dopo l'esecuzione degli script._
