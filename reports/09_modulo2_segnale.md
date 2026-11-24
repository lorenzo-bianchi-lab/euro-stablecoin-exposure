# 09 - Modulo 2: contenuto predittivo e regola di segnalazione

L'indice del modulo 2 descrive il trading in euro. Qui si verifica se dice qualcosa in
anticipo sui depositi bancari, e gli si aggiunge una regola di segnalazione esplicita.

Le sezioni 1 e 2 sono state committate **prima** di eseguire il test.

## 1. Domanda e criterio (fissati prima dei risultati)

**Domanda**: le variazioni mensili dei volumi di stablecoin scambiati contro euro
aiutano a prevedere la variazione dei depositi a vista delle famiglie dell'area euro,
rispetto a un modello che usa solo i ritardi dei depositi?

**Criterio**: la risposta è sì solo se valgono entrambe le condizioni nella
specificazione principale:

1. nel campione, il ritardo dei volumi è significativo al 5%;
2. fuori campione, l'errore quadratico medio di previsione del modello con i volumi è
   più basso di quello con i soli ritardi.

In ogni altro caso la risposta è no, e lo si riporta così. Il risultato viene pubblicato
anche se nullo.

## 2. Metodo, fissato prima dei risultati

### 2.1 Dati

- **Depositi**: depositi a vista delle famiglie, somma dei 21 paesi (BSI `L21`, settore
  2250), consistenze di fine mese, non destagionalizzate. Ultimo mese: settembre 2026.
- **Volumi**: somma mensile dei volumi di USDT e USDC scambiati contro euro, in unità di
  stablecoin, dall'archivio del modulo 2. Si usa il pannello lungo (senza Kraken e
  Gemini) perché parte dal gennaio 2023; con Kraken i mesi sarebbero 21.
- **Campione**: da febbraio 2023 a settembre 2026, 44 variazioni mensili.

### 2.2 Specificazione principale

    y(t) = variazione percentuale mensile dei depositi a vista delle famiglie
    x(t) = variazione percentuale mensile dei volumi contro euro   (differenze dei logaritmi)

    modello di base:   y(t) = a + b·y(t-1) + errore
    modello ampliato:  y(t) = a + b·y(t-1) + c·x(t-1) + errore

- Condizione 1: test su c con errori standard robusti all'eteroschedasticità.
- Condizione 2: previsioni a un mese con finestra espandibile sugli ultimi 12 mesi;
  rapporto tra gli errori quadratici medi dei due modelli.

### 2.3 Varianti (riportate, non decidono l'esito)

- Due ritardi per entrambe le variabili.
- Variazioni sui dodici mesi invece che mensili, per neutralizzare la stagionalità.
- Al posto dei volumi: la quota EUR (indice), i volumi di sola USDT e di sola USDC.
- Sono sette test: con una soglia del 5% ci si aspetta per caso circa un terzo di
  probabilità che almeno uno risulti significativo. Per questo decide solo la principale.

### 2.4 Limiti noti in partenza

- 44 osservazioni sono poche: il test ha poca potenza, quindi un esito nullo non
  dimostra che il legame non esista.
- I volumi contro euro sono una frazione minima dei depositi (circa un miliardo di
  dollari a settimana contro oltre 5.000 miliardi di euro di depositi a vista delle
  famiglie): un legame meccanico sarebbe sorprendente.
- Il pannello lungo esclude Kraken, che vale un terzo dei volumi recenti.

### 2.5 Regola di segnalazione

Per ciascuna delle quattro serie, ogni settimana:

    scarto della quota   = (quota EUR - media delle 52 settimane precedenti) / deviazione standard
    scarto del volume    = (volume contro EUR - media delle 52 settimane precedenti) / deviazione standard

La finestra sono le 52 settimane che precedono quella osservata, esclusa.

| Stato | Condizione |
|---|---|
| **Segnale** | Entrambi gli scarti oltre 2 in valore assoluto e dello stesso segno |
| **Da verificare** | Uno solo dei due oltre 2, oppure entrambi oltre 2 ma di segno opposto |
| Nessuno | Altrimenti |

Il doppio requisito serve a distinguere un movimento dell'euro da un movimento delle
altre valute, che sposta la quota senza che i volumi in euro cambino. La regola marca
valori insoliti. Se il test della sezione 1 è nullo, non va letta come segnale
anticipatore di deflussi dai depositi.

Si riporta quante volte la regola sarebbe scattata nello storico disponibile.

## 3. Risultati

_Da compilare dopo l'esecuzione dello script._
