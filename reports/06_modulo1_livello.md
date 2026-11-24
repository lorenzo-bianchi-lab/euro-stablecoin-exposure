# 06 - Modulo 1: il livello, da fonti esterne

Il modulo 1 di [SPEC.md](../SPEC.md) chiede un numero: il valore delle stablecoin in
dollari attribuibile all'area euro secondo le ipotesi esterne, aggiornato alla
circolazione corrente, affiancato dalla diffusione tra i consumatori.

Le sezioni 1 e 2 sono state committate **prima** di leggere i dati di circolazione. Le
due quote applicate (7,5% e 15%) non sono scelte nostre: vengono dall'ESM Working Paper
79, verificato sull'originale nel [report 02](02_benchmark_e_modulo3.md).

## 1. Che tipo di numero è

Non è una stima. È l'applicazione meccanica di un'ipotesi esterna a un dato osservato:

    livello = circolazione mondiale di stablecoin in dollari × quota assunta dall'ESM

La circolazione è misurata; la quota è un'ipotesi di calibrazione degli autori dell'ESM,
senza intervallo di confidenza. Il risultato eredita tutta l'incertezza della quota.

## 2. Metodo, fissato prima dei numeri

### 2.1 Circolazione

- **Fonte principale**: API pubblica di DefiLlama (`stablecoins.llama.fi`), senza chiave.
  Tre grandezze: tutte le stablecoin ancorate al dollaro, USDT, USDC.
- **Fonte di controllo**: CoinGecko (`circulating_supply` di USDT e USDC). Se le due
  fonti differiscono di più del 2% per uno dei due token, il report lo segnala.
- **Convalida sull'ESM**: l'ESM indica 248 miliardi di dollari in circolazione al terzo
  trimestre 2025. Si confronta con il dato DefiLlama del 30 settembre 2025. Se tornano,
  la base a cui applicare la quota è la stessa usata dagli autori.

### 2.2 Livello

| Grandezza | Definizione |
|---|---|
| **Livello di base** | 7,5% della circolazione di tutte le stablecoin in dollari (la base usata dall'ESM) |
| **Livello alto** | 15% della stessa circolazione (scenario di sensibilità D dell'ESM) |
| Di cui USDT e USDC | Le stesse quote applicate alla sola circolazione di USDT e USDC, che sono l'oggetto del progetto |

In dollari e in euro, al tasso di riferimento BCE dell'ultimo giorno disponibile.

### 2.3 Serie storica

Lo stesso calcolo a ogni fine mese dal gennaio 2023, e il rapporto tra il livello di
base e i depositi a vista di famiglie e imprese dell'area euro (dal modulo 3) nei mesi
in cui il dato bancario esiste.

### 2.4 Diffusione tra i consumatori

Riportata senza elaborazioni: 5% dei consumatori dichiara che in famiglia si possiedono
stablecoin (BCE, indagine CES, agosto 2025, 11 paesi). Non è aggiornabile: dipende dalla
prossima rilevazione della BCE.

### 2.5 Controllo di coerenza tra le due fonti

Le due fonti esterne non misurano la stessa cosa, ma si possono confrontare con un
calcolo dichiarato. Il riquadro BCE dice che circa il 10% dei detentori ha almeno 10.000
euro in stablecoin (novembre 2025). Ne segue un **pavimento**:

    pavimento = famiglie dell'area euro × 5% × 10% × 10.000 euro

con il numero di famiglie da Eurostat. È un minimo, perché ignora il 90% dei detentori
e conta 10.000 euro esatti per gli altri. Si confronta con il livello di base alla fine
di novembre 2025. È un nostro calcolo su cifre BCE, non una stima della BCE, e assume
che i risultati degli 11 paesi dell'indagine valgano per tutti i 21.

### 2.6 Collegamento con il modulo 4

Il livello di base e quello alto vengono salvati in `data/processed/m1_level.json`. Il
modulo 4 li legge e li aggiunge agli scenari ESM come livello di partenza aggiornato.

## 3. Risultati

_Da compilare dopo l'esecuzione dello script._
