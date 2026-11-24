# 05 - Modulo 4: scenari di adozione e raccolta bancaria per paese

Il modulo 4 di [SPEC.md](../SPEC.md) chiede, per ogni livello di adozione delle
stablecoin in dollari, la variazione della raccolta di ciascun paese in miliardi di euro
e in punti percentuali, e quanta raccolta all'ingrosso servirebbe per compensarla.

Le sezioni 1 e 2 sono state committate **prima** di calcolare i risultati. A quel punto
conoscevo i bilanci di settembre 2026 dal modulo 3, quindi gli ordini di grandezza
aggregati erano prevedibili; i risultati per paese no.

## 1. Che tipo di calcolo è

È un esercizio contabile, non una previsione né una stima causale. Risponde a una sola
domanda: se i residenti dell'area euro detenessero un dato importo di stablecoin in
dollari, e lo avessero finanziato prelevando depositi bancari, di quanto si ridurrebbe
la raccolta delle banche di ciascun paese e quanta raccolta all'ingrosso servirebbe per
sostituirla?

Non dice se, quando o con quale probabilità questo accadrà, e non considera le reazioni
di banche, depositanti e banca centrale.

## 2. Parametri, fissati prima dei risultati

### 2.1 Bilanci di partenza

Bilanci bancari di settembre 2026 per i 21 paesi dell'area euro, dal modulo 3
(`data/raw/m3_bsi.csv`). Gli scenari sono applicati ai bilanci di oggi, senza farli
crescere: anche gli importi previsti per il 2030 sono confrontati con la raccolta attuale.

### 2.2 Livelli di adozione

Gli importi vengono dall'ESM Working Paper 79 (sezione 5, verificata nel
[report 02](02_benchmark_e_modulo3.md)): stablecoin in dollari detenute nell'area euro.

| Scenario | Importo (mld $) | Come lo ottiene l'ESM |
|---|---|---|
| S0 - Oggi | 19 | 7,5% di 248 miliardi in circolazione al terzo trimestre 2025 |
| S1 - Base 2030 | 143 | 7,5% di 1.900 miliardi |
| S2 - Alto 2030 | 300 | 7,5% di 4.000 miliardi |
| S3 - Alto 2030, quota doppia | 600 | 15% di 4.000 miliardi |

Sono ipotesi dell'ESM, non stime. Lo script accetta anche un importo qualsiasi, così il
calcolo si può ripetere con il livello che produrrà il modulo 1.

### 2.3 Conversione e tasso di sostituzione

- **Cambio**: tasso di riferimento BCE del 30 settembre 2026, cioè la data dei bilanci.
- **Tasso di sostituzione**: 100%. Ogni euro di stablecoin detenute corrisponde a un
  euro di depositi usciti dalle banche dell'area. È un tetto: una parte potrebbe venire
  da contante, fondi o altre attività, e una parte dei fondi potrebbe tornare alle
  banche per altre vie. Sensibilità al 50%.

### 2.4 Ripartizione tra paesi

Non esistono dati sull'adozione per paese. Si usano due regole.

| Regola | Definizione | Cosa assume |
|---|---|---|
| **R1 - Pro quota sui depositi (principale)** | Il deflusso si distribuisce in proporzione ai depositi a vista di famiglie e imprese di ciascun paese | Ogni euro depositato ha la stessa probabilità di migrare. Tutti i paesi perdono la stessa percentuale di depositi a vista |
| **R2 - Pro capite (alternativa)** | Il deflusso si distribuisce in proporzione alla popolazione (Eurostat, 1° gennaio 2025) | Ogni residente adotta nella stessa misura. I paesi con meno depositi per abitante perdono una percentuale maggiore |

Con R2 il deflusso assegnato a un paese non può superare i suoi depositi a vista; se
accadesse, l'eccedenza verrebbe segnalata, non redistribuita.

### 2.5 Ripartizione tra tipi di deposito

| Regola | Definizione |
|---|---|
| **T1 (principale)** | Escono solo depositi a vista, di famiglie e imprese in proporzione alle rispettive consistenze |
| T2 (alternativa) | Escono solo depositi a vista delle famiglie; la ripartizione tra paesi di R1 si fa sui soli depositi a vista delle famiglie |
| T3 (alternativa) | Escono depositi a vista e vincolati di famiglie e imprese, in proporzione alle consistenze; la ripartizione tra paesi di R1 si fa sui depositi totali |

### 2.6 Grandezze calcolate per ogni paese e scenario

| Grandezza | Formula |
|---|---|
| Deflusso | importo assegnato al paese, in miliardi di euro |
| Perdita di depositi a vista | deflusso / depositi a vista di famiglie e imprese |
| Perdita di depositi della clientela | deflusso / depositi totali di famiglie e imprese |
| Effetto sulla raccolta | deflusso / totale del passivo, in punti percentuali |
| Raccolta all'ingrosso necessaria | pari al deflusso: si assume sostituzione uno a uno |
| Aumento della raccolta all'ingrosso | deflusso / (titoli di debito emessi + depositi da IFM) |

### 2.7 Soglie

Calcolo inverso: quale importo di stablecoin detenute nell'area euro corrisponde a una
perdita dell'1%, del 5% e del 10% dei depositi a vista dell'area, in miliardi di euro e
di dollari, e a quale quota della circolazione ipotizzata dall'ESM.

### 2.8 Sensibilità

Il calcolo è lineare nell'importo: raddoppiare l'adozione, il tasso di sostituzione o la
quota dell'area euro raddoppia ogni risultato. Si riportano comunque il tasso di
sostituzione al 50% e un cambio a ±10%, e soprattutto il confronto tra le due regole di
ripartizione e tra i tre tipi di deposito, che non sono lineari.

## 3. Risultati

_Da compilare dopo l'esecuzione dello script._
