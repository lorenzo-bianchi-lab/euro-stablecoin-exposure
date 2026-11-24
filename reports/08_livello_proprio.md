# 08 - Livello proprio e ripartizione per paese

Il modulo 1 usa finora un livello non suo: l'ipotesi dell'ESM. Qui si provano tre stime
indipendenti del valore di stablecoin in dollari detenuto dai residenti dell'area euro
(B1, B2, B3) e una regola di ripartizione tra paesi basata su dati (B4).

Le sezioni 1 e 2 sono state committate **prima** di calcolare i risultati. A quel punto
avevo visto il grafico B del riquadro BCE, perché serve a definire le fasce, ma non
avevo calcolato alcun totale.

## 1. Criterio (fissato prima dei risultati)

- Si confrontano i valori **centrali** di B1 (variante famiglie), B2 e B3, in miliardi
  di euro.
- Se almeno due stanno entro un fattore 3 l'uno dall'altro, il modulo 1 pubblica un
  **intervallo proprio** accanto all'ipotesi ESM: dal più basso al più alto dei valori
  centrali che concordano.
- Altrimenti il modulo 1 pubblica soltanto il **minimo di B1** (variante famiglie),
  dichiarandolo come pavimento.
- Una strada che non produce un numero conta come assente, non come disaccordo.

## 2. Metodo, fissato prima dei risultati

### 2.1 B1 - Dal basso, con l'indagine BCE

Fonte: riquadro del Bollettino economico BCE 7/2026, grafico B, riquadro b
(distribuzione degli importi tra i detentori di stablecoin, novembre 2025). La BCE non
pubblica i dati del grafico: le percentuali delle nove fasce si leggono dall'immagine,
misurando l'altezza delle barre in pixel.

    totale = unità × quota di detentori × importo medio × quota in dollari

| Elemento | Minimo | Centrale | Massimo |
|---|---|---|---|
| Importo di ogni fascia | estremo inferiore | punto medio | estremo superiore |
| Prima fascia (fino a 99 €) | 0 € | 50 € | 99 € |
| Ultima fascia (10.000 € o più) | 10.000 € | 15.000 € | 20.000 € |
| Quota in dollari | 60% | 70% | 79% |

- **Quota di detentori**: 5%, dal testo del riquadro (agosto 2025).
- **Quota in dollari**: dalle quote di detentori del riquadro (USDT 17%, USDC 12%, EURC
  10%, altre meno del 9%). Minimo: le "altre" tutte non in dollari, 29/48. Massimo:
  tutte in dollari, 38/48. Centrale: metà e metà. Sono quote di persone usate come
  quote di valore: approssimazione dichiarata.
- **Unità**, due varianti: famiglie dei 21 paesi (Eurostat) e individui di 18 anni o più
  (Eurostat). La domanda dell'indagine riguarda "lei o un membro della sua famiglia":
  la variante famiglie è quella coerente con la domanda ed è quella usata nel criterio.
- Si assume che gli 11 paesi dell'indagine rappresentino tutti i 21.

### 2.2 B2 - Riserve dei clienti presso gli exchange

    totale = somma sugli exchange di (USDT + USDC detenuti per i clienti × quota di
             utenti dell'area euro)

- Riserve: proof of reserves pubblicate dagli exchange, o i dati di trasparenza degli
  exchange aggregati da DefiLlama, se raggiungibili gratis.
- Quota di utenti dell'area euro: il miglior indicatore gratuito di provenienza degli
  utenti che risulti davvero scaricabile. Se non ne esiste uno per paese, la strada B2
  non produce un numero e lo si scrive.
- Misura solo le stablecoin lasciate in custodia agli exchange, non quelle in
  portafogli propri: è per costruzione una stima parziale.

### 2.3 B3 - Dati nazionali

- Italia: statistiche trimestrali dell'OAM sui prestatori di servizi in cripto-attività.
  Se danno il valore in stablecoin, si usa quello. Se danno solo il totale delle
  cripto-attività, si applica la quota delle stablecoin sul mercato cripto indicata dal
  Working Paper BCE 3199 (circa 10%) e la quota in dollari di B1.
- Dal dato italiano all'area euro: si divide per la quota dell'Italia sui possessori di
  cripto-attività dell'area (dati di B4) o, se mancano, sulla popolazione.
- Si cercano fonti analoghe negli altri paesi; se esistono si usano allo stesso modo e
  si riporta la dispersione.

### 2.4 B4 - Regola R3 di ripartizione tra paesi

- Si cerca la quota di possessori di cripto-attività per paese: indagine SPACE della
  BCE, Eurobarometro, ESMA, banche centrali nazionali.
- **Se esiste per almeno 15 dei 21 paesi**, si aggiunge al modulo 4 la regola R3: il
  deflusso si distribuisce in proporzione al numero di possessori, cioè quota per
  popolazione di 18 anni o più. Ai paesi mancanti si assegna la media semplice delle
  quote disponibili, e li si marca.
- R3 viene confrontata con R1 (pro quota sui depositi) e R2 (pro capite) nello scenario
  S2: correlazione di rango e paesi che cambiano di più.
- R3 ripartisce un totale ipotizzato. Non è una stima delle detenzioni per paese:
  possedere cripto-attività non equivale a possedere stablecoin.

## 3. Risultati

_Da compilare dopo l'esecuzione degli script._
