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

Calcolato il 2026-11-25.

### 3.1 Esito del test: no

**Le variazioni mensili dei volumi di stablecoin contro euro non aiutano a prevedere la
variazione dei depositi a vista delle famiglie.** Nessuna delle due condizioni è
soddisfatta.

| | Specificazione principale |
|---|---|
| Osservazioni | 43, da marzo 2023 a settembre 2026 |
| Coefficiente del ritardo dei volumi | 0,0049 (errore standard 0,0048) |
| Significatività (condizione 1) | p = 0,31: non significativo |
| Errore di previsione fuori campione, con i volumi rispetto ai soli ritardi (condizione 2) | 1,009: non migliora |
| Previsioni fuori campione | 12 |

Il coefficiente dice che un aumento del 10% dei volumi sarebbe seguito da una variazione
dei depositi di 0,05 punti in più, un effetto piccolo e non distinguibile da zero.

### 3.2 Varianti

| Variante | Osservazioni | Significatività | Rapporto tra gli errori fuori campione | Aiuta? |
|---|---|---|---|---|
| Due ritardi | 42 | p = 0,32 | 1,12 | no |
| Variazioni sui dodici mesi | 32 | p = 0,16 | 0,96 | no |
| Quota EUR al posto dei volumi | 43 | p = 0,57 | 1,02 | no |
| Solo USDT | 43 | p = 0,50 | 1,03 | no |
| Solo USDC | 43 | p = 0,44 | 1,01 | no |

Nessuna variante è significativa. Nella variante a dodici mesi l'errore fuori campione
scende del 4%, ma il coefficiente non è significativo e le osservazioni si
sovrappongono: non basta.

### 3.3 Perché il risultato è nullo, e cosa non dimostra

- **Le grandezze non sono confrontabili per scala.** I volumi contro euro valgono in
  media 3 miliardi di dollari al mese; i depositi a vista delle famiglie 5.526 miliardi
  di euro. Anche se ogni dollaro scambiato fosse un deposito uscito, sarebbe lo 0,05%.
- **I volumi sono molto più variabili dei depositi**: deviazione standard delle
  variazioni mensili del 22% contro lo 0,7%. La correlazione nello stesso mese è zero;
  con un mese di ritardo è 0,15.
- **Il test ha poca potenza.** Con 43 osservazioni un legame debole non si vedrebbe.
  L'esito dice che in questi dati non c'è evidenza, non che il legame non esista.
- **Il campione non contiene un episodio di adozione ampia.** Il Working Paper BCE 3199
  dice esplicitamente che ai livelli attuali gli effetti aggregati sono trascurabili:
  questo risultato è coerente.

Conseguenza: l'indice del modulo 2 resta un indicatore descrittivo del trading in euro.
Non va presentato come anticipatore dei depositi.

### 3.4 Regola di segnalazione

La regola è attiva in `src/module2_index.py` e i suoi esiti sono in
`data/processed/m2_flags.csv`. Ultima settimana (16-22 novembre 2026):

| Serie | Scarto della quota | Scarto del volume | Stato |
|---|---|---|---|
| USDT | -0,7 | +0,5 | nessuno |
| USDT senza Coinbase | -1,0 | +0,2 | nessuno |
| USDC | +0,7 | +2,6 | **da verificare** |
| USDC senza Coinbase | +0,4 | +2,0 | nessuno |

USDC è "da verificare" perché i volumi contro euro sono insolitamente alti (1,6 miliardi
di dollari nella settimana) mentre la quota è nella norma: si scambia più USDC contro
tutte le valute, non in particolare contro l'euro. È la quarta settimana consecutiva.

Storico, sulle 50 settimane in cui la finestra di 52 è disponibile (dal dicembre 2025):

| Serie | Segnale | Da verificare | Nessuno |
|---|---|---|---|
| USDT | 0 | 1 | 49 |
| USDT senza Coinbase | 0 | 0 | 50 |
| USDC | 0 | 12 | 38 |
| USDC senza Coinbase | 0 | 7 | 43 |

- **Il segnale pieno non è mai scattato.** In nessuna settimana quota e volume si sono
  mossi insieme oltre le due deviazioni standard.
- **I "da verificare" di USDC a gennaio-febbraio 2026** sono l'episodio già descritto nel
  report 03: la quota è scesa di oltre due deviazioni mentre i volumi contro euro erano
  normali, perché erano aumentati i volumi contro won. La regola li classifica
  correttamente come movimento del denominatore, non dell'euro.
- **L'unico caso su USDT** è la settimana del 2 marzo 2026 (quota +2,8, volume +1,7).

La regola fa quello per cui è stata disegnata: distingue un movimento dell'euro da un
movimento delle altre valute. Dato l'esito della sezione 3.1, non è un segnale
anticipatore di deflussi dai depositi.

Una precisazione: lo scarto standardizzato riportato nel report 03 e nella sintesi
usava una finestra che includeva la settimana osservata. Da ora vale la definizione di
questo documento, con le 52 settimane precedenti; i valori cambiano di poco.

### 3.5 Criterio

| Condizione | Esito |
|---|---|
| 1. Ritardo dei volumi significativo al 5% nella specificazione principale | No (p = 0,31) |
| 2. Errore fuori campione più basso con i volumi | No (rapporto 1,009) |
| **Risposta alla domanda** | **No** |

## 4. Limiti

- 43 osservazioni mensili, tre anni e mezzo, nessun episodio di stress.
- Pannello lungo senza Kraken, che vale un terzo dei volumi recenti contro fiat.
- Depositi non destagionalizzati; la variante a dodici mesi riduce il campione a 32.
- Errori standard robusti all'eteroschedasticità ma non all'autocorrelazione.
- La regola di segnalazione ha solo 50 settimane di storico: la frequenza dei "da
  verificare" su USDC (una settimana su quattro) dice che la soglia di 2 è stretta per
  una serie così variabile.

## 5. Cosa non è stato possibile fare

- **Usare i volumi con Kraken**: il suo storico parte da dicembre 2024 e darebbe 21 mesi.
- **Provare il test per paese**: i volumi contro euro non sono attribuibili a un paese.
- **Validare la regola di segnalazione su un evento**: nel campione non ce ne sono.

## 6. Come si usa

```bash
.venv/bin/python src/module2_link_test.py   # ripete il test sui dati aggiornati
.venv/bin/python src/module2_index.py       # aggiorna indice e segnalazioni
```

---

**Cosa aggiunge questo al programma finale**: un risultato negativo utile e una regola.
L'indice settimanale non anticipa i depositi a vista delle famiglie, quindi il programma
non lo presenta come tale; e ogni settimana l'indice esce ora con uno stato esplicito
(segnale, da verificare, nessuno) che separa i movimenti dell'euro da quelli delle
altre valute.
