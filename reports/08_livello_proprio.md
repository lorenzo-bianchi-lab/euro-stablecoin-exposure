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

Calcolato il 2026-11-25.

### 3.1 Verdetto

| Stima | Valore centrale (mld €) | Esito |
|---|---|---|
| B1 - Dal basso, indagine BCE (famiglie) | **15,4** | calcolata |
| B2 - Riserve dei clienti presso gli exchange | nessun numero | strada fallita |
| B3 - Dati nazionali (Italia) | **0,9** | calcolata |

B1 e B3 distano di un fattore 17, ben oltre il fattore 3 ammesso, e B2 non c'è.
**Il criterio non è soddisfatto: il modulo 1 pubblica come proprio solo il minimo di B1,
8,9 miliardi di euro**, accanto all'ipotesi ESM. Non pubblica un intervallo proprio.

Una cosa va detta anche se non entra nel criterio: il valore centrale di B1 (15,4) è a
meno del 10% dal livello ESM di fine novembre 2025 (16,9 miliardi di euro). L'ESM non è
una delle tre stime da confrontare, e il criterio non è stato modificato; ma le due
fonti che partono dall'area euro, indagine BCE e ipotesi ESM, puntano allo stesso ordine
di grandezza.

### 3.2 B1 - Dal basso, con l'indagine BCE

Percentuali lette dal grafico B, riquadro b (errore di lettura circa 0,1 punti; la somma
dà 99,4 ed è riportata a 100):

| Fascia di importo | Detentori |
|---|---|
| fino a 99 € | 19,9% |
| 100-299 € | 17,2% |
| 300-599 € | 14,5% |
| 600-999 € | 10,1% |
| 1.000-1.499 € | 6,9% |
| 1.500-2.499 € | 5,1% |
| 2.500-4.999 € | 8,9% |
| 5.000-9.999 € | 7,6% |
| 10.000 € o più | 9,3% |

Importo medio per detentore: 1.810 euro al minimo, 2.693 al centro, 3.576 al massimo.

| Variante | Detentori | Minimo (mld €) | Centrale (mld €) | Massimo (mld €) |
|---|---|---|---|---|
| **Famiglie** (163,5 milioni, il 5% detiene) | 8,2 milioni | **8,9** | **15,4** | **23,1** |
| Individui di 18 anni o più (296,4 milioni) | 14,8 milioni | 16,2 | 27,9 | 42,0 |

Sono importi in stablecoin in dollari, cioè dopo la correzione per la quota in dollari
(60%, 70%, 79%). Senza la correzione, per tutte le stablecoin, la variante famiglie dà
14,8 - 22,0 - 29,2.

Due cose pesano più delle altre:

- **L'ultima fascia vale il 52% del totale centrale.** Il 9,3% dei detentori ha 10.000
  euro o più, e non si sa quanto di più: tra l'ipotesi di 10.000 e quella di 20.000
  euro a testa il totale cambia di un terzo.
- **Famiglie o individui raddoppia il risultato.** La domanda è posta a una persona ma
  riguarda la famiglia; la variante famiglie è quella coerente, quella individui conta
  più volte la stessa famiglia.

### 3.3 B2 - Riserve dei clienti presso gli exchange: strada fallita

**Motivo, in due righe**: i saldi dei clienti in USDT e USDC sono pubblici per alcuni
exchange, ma non esiste un indicatore gratuito e scaricabile della provenienza degli
utenti per paese. Senza quello le riserve non si possono attribuire all'area euro.

Quello che si è riusciti a leggere:

| Exchange | Data | USDT (mld $) | USDC (mld $) | Verifica |
|---|---|---|---|---|
| Binance | 12 nov 2026 | 24,3 | 5,6 | letto alla fonte |
| KuCoin | 31 ott 2026 | 0,8 | 0,1 | letto alla fonte |
| OKX | 1 nov 2026 | 8,0 | 1,8 | dalla ricerca, non ricontrollato |
| Bybit | 27 ott 2026 | 3,3 | 0,1 | dalla ricerca, non ricontrollato |
| Bitget | 12 nov 2026 | 0,8 | 0,2 | dalla ricerca, non ricontrollato |
| Gate | 18 ott 2026 | 0,8 | n.d. | dalla ricerca, non ricontrollato |

- Totale: 45,8 miliardi di dollari, di cui 30,8 verificati alla fonte. È circa il 19%
  della circolazione di USDT e USDC.
- Kraken pubblica solo i rapporti di copertura, senza importi. Coinbase non pubblica
  saldi per token. Sono due degli exchange più usati in Europa.
- Provenienza degli utenti: la pagina gratuita di Similarweb dà i primi cinque paesi per
  traffico, si legge solo da un browser e ha smesso di rispondere dopo due siti. Per
  binance.com nessun paese dell'area euro è tra i primi cinque (il quinto è la Turchia
  con il 4,4%); per bitvavo.com oltre il 90% del traffico viene dall'area euro. Le API
  di Similarweb e di Cloudflare Radar richiedono un accesso.

Il dato resta utile come ordine di grandezza: tutti i clienti di questi sei exchange,
nel mondo, hanno in custodia 46 miliardi di dollari di USDT e USDC.

### 3.4 B3 - Dati nazionali

**Italia, OAM** (terzo trimestre 2025, ultima rilevazione prima del passaggio a MiCAR):
1.245.082 clienti con cripto-attività per 2,16 miliardi di euro, presso 85 prestatori
di servizi sui 125 iscritti. Nessuna scomposizione per tipo di cripto-attività.

| Passaggio | Valore |
|---|---|
| Cripto-attività dei clienti italiani | 2,16 mld € |
| Quota stablecoin applicata (WP 3199) | 10% → 0,22 mld € |
| Quota in dollari (centrale) | 70% → 0,15 mld € |
| Quota dell'Italia sui possessori dell'area (SPACE 2024) | 16,7% |
| **Area euro, centrale** | **0,90 mld €** (da 0,78 a 1,02) |

**Paesi Bassi, DNB** (fine giugno 2026): le famiglie hanno 3,2 miliardi di euro di
cripto-attività presso prestatori olandesi, e le stablecoin sono **meno dell'1%**. È una
misura, non un'ipotesi. Riportata all'area euro dà un tetto di 0,72 miliardi; e se la
quota olandese valesse anche per l'Italia, la stima italiana scenderebbe da 0,90 a 0,09.

Negli altri paesi la ricerca non ha trovato statistiche ufficiali sul valore detenuto
(l'Austria pubblica solo la quota di famiglie con cripto-attività).

**Perché B3 è diciassette volte più bassa di B1.** Misura un'altra cosa: le
cripto-attività tenute presso prestatori registrati nel paese. Restano fuori gli
exchange esteri, dove passa la gran parte del trading in stablecoin, e i portafogli
propri. Il dato olandese dice anzi che presso i prestatori nazionali le stablecoin sono
quasi assenti. B3 non smentisce B1: mostra che le statistiche nazionali disponibili non
vedono le stablecoin.

### 3.5 B4 - Regola R3: esiste, ed è stata aggiunta

**Fonte**: BCE, indagine SPACE 2024, grafico 41: quota di adulti che possiede
cripto-attività, per paese. Copre **20 paesi su 21**; manca la Bulgaria, entrata
nell'area nel 2026, a cui è assegnata la media semplice (10,8%). La soglia di 15 paesi è
superata. La media dell'area ricostruita con questi pesi è 8,9%, contro l'8,8%
pubblicato dalla BCE.

Scenario ESM alto 2030 (300 miliardi di dollari), effetto sulla raccolta in punti del
passivo:

| Paese | Possessori di cripto-attività | R1 pro quota sui depositi | R2 pro capite | R3 per possessori |
|---|---|---|---|---|
| Bulgaria | 10,8% (imputato) | 1,66 | 3,74 | 4,57 |
| Slovenia | 15,2% | 1,91 | 2,58 | 4,41 |
| Croazia | 12,6% | 1,57 | 2,85 | 4,08 |
| Lettonia | 7,7% | 1,63 | 4,08 | 3,51 |
| Slovacchia | 10,8% | 1,27 | 2,85 | 3,42 |
| Grecia | 13,7% | 1,54 | 2,09 | 3,29 |
| Lituania | 13,1% | 1,21 | 1,94 | 2,86 |
| Portogallo | 12,0% | 0,91 | 1,71 | 2,37 |
| Estonia | 7,4% | 1,14 | 2,01 | 1,64 |
| Cipro | 13,1% | 1,31 | 0,95 | 1,40 |
| Spagna | 9,4% | 1,17 | 1,04 | 1,13 |
| Malta | 10,5% | 1,47 | 0,86 | 1,05 |
| Italia | 8,8% | 0,99 | 1,03 | 1,05 |
| Austria | 13,0% | 0,82 | 0,63 | 0,92 |
| Belgio | 11,9% | 0,46 | 0,59 | 0,77 |
| Finlandia | 11,2% | 0,58 | 0,61 | 0,77 |
| Francia | 9,3% | 0,27 | 0,38 | 0,39 |
| Germania | 5,9% | 0,69 | 0,51 | 0,34 |
| Irlanda | 13,1% | 0,35 | 0,19 | 0,26 |
| Paesi Bassi | 5,5% | 0,37 | 0,41 | 0,26 |
| Lussemburgo | 11,9% | 0,16 | 0,03 | 0,04 |

- **L'ordine cambia poco**: correlazione di rango 0,92 con R1 e 0,97 con R2. In testa
  restano sistemi piccoli finanziati da depositi: Bulgaria, Slovenia, Croazia, Lettonia,
  Slovacchia.
- **La dispersione aumenta**: con R3 Bulgaria, Slovenia e Croazia perderebbero tra il
  7,5% e il 9% dei depositi a vista, contro il 3,2% uniforme di R1.
- **Germania e Paesi Bassi scendono**: hanno le quote di possessori più basse dell'area
  (5,9% e 5,5%). Con R3 la Germania riceve il 15% del deflusso contro il 31% di R1.
- **Sul credito**: nello scenario ESM alto la variante a soglia dà 81,5 miliardi di
  prestiti in meno con R3, contro 58,2 con R1 e 72,3 con R2, perché R3 sposta il
  deflusso verso i paesi con il coefficiente alto.

R3 è ora disponibile nel modulo 4, nel modulo 5 e nel cruscotto.

## 4. Limiti

- **B1 dipende da un grafico letto a occhio di macchina, da un'ultima fascia aperta e
  dalla scelta tra famiglie e individui.** L'intervallo 8,9 - 23,1 copre le prime due
  incertezze, non la terza.
- **B1 estende a 21 paesi un'indagine su 11**, che la BCE definisce sperimentale, e usa
  quote di persone come quote di valore per la parte in dollari.
- **B3 poggia su un'ipotesi forte** (stablecoin pari al 10% delle cripto-attività) che
  l'unico dato misurato, quello olandese, contraddice.
- **B2 non esiste.** Il programma non ha una stima basata sui saldi presso gli exchange.
- **R3 usa il possesso di cripto-attività, non di stablecoin**, rilevato nel 2023-2024,
  e imputa la Bulgaria. Ripartisce un totale ipotizzato: non stima le detenzioni per paese.
- **Il minimo pubblicato non è una misura.** È il risultato più basso di una
  triangolazione di cui una sola strada ha prodotto un valore plausibile.

## 5. Cosa non è stato possibile fare

- **B2**: nessun indicatore gratuito e scaricabile della provenienza degli utenti per
  paese. Servirebbe un accesso a Similarweb o a Cloudflare Radar.
- **Leggere i dati esatti del grafico B**: la BCE non li pubblica; le percentuali sono
  misurate sull'immagine.
- **Trovare dati nazionali sulle stablecoin oltre a quelli olandesi**: l'OAM non le
  distingue e ha chiuso la rilevazione; per Francia, Germania, Spagna e gli altri non è
  emersa alcuna statistica ufficiale sul valore detenuto.
- **Ricontrollare alla fonte i saldi di OKX, Bybit, Bitget e Gate**: le loro pagine non
  rispondono alle richieste automatiche. Sono riportati come letti dalla ricerca.
- **Avere la quota di possessori per la Bulgaria** nell'indagine SPACE: esiste
  nell'Eurobarometro del 2023, che però misura il possesso negli ultimi due anni e non
  è stato mescolato con SPACE.

## 6. Come si usa

```bash
.venv/bin/python src/level_own.py            # ricalcola B1, B3 e il verdetto
.venv/bin/python src/module4_scenarios.py    # scenari con R1, R2 e R3
```

Le cifre esterne di B2 e B3 sono in `data/raw/level_own_inputs.json`, ciascuna con fonte
e stato della verifica; le quote di SPACE in `data/raw/r3_crypto_ownership.json`.

---

**Cosa aggiunge questo al programma finale**: una prima stima propria del livello,
indipendente dall'ESM (15,4 miliardi di euro al centro, 8,9 come minimo pubblicato), che
cade nello stesso ordine di grandezza dell'ipotesi esterna; la prova che riserve degli
exchange e statistiche nazionali oggi non bastano a confermarla; e una terza regola di
ripartizione tra paesi fondata su un'indagine della BCE invece che su un'ipotesi.
