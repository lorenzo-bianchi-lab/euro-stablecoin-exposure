# 04 - Modulo 3: classifica dei paesi per struttura della raccolta bancaria

Il modulo 3 di [SPEC.md](../SPEC.md) chiede una classifica dei 21 paesi dell'area euro
per esposizione strutturale della raccolta bancaria a una sostituzione dei depositi con
stablecoin, con le componenti che spiegano la posizione di ciascuno.

Le sezioni 1 e 2 sono state committate **prima** di calcolare qualsiasi quota o
classifica. A quel punto conoscevo solo: i valori assoluti di tre paesi nell'ultimo mese
(dalla verifica del report 02) e la quota di passività in dollari dei 13 paesi BRI, che
qui entra solo in una variante.

## 1. Tabella di composizione (criteri a e b di SPEC)

Fonte: ECB Data Portal, dataset BSI, consistenze di fine mese in milioni di euro,
istituzioni finanziarie monetarie escluso il Sistema europeo di banche centrali.

Il passivo aggregato si scompone in sei voci:

    totale passivo = depositi di residenti dell'area euro + quote di fondi monetari
                   + titoli di debito emessi + capitale e riserve
                   + passività verso non residenti dell'area euro + altre passività

I depositi di residenti dell'area euro si scompongono a loro volta per controparte. Le
quote della tabella, tutte in rapporto al totale del passivo, sono:

| Voce | Formula con i codici BSI |
|---|---|
| Depositi a vista, famiglie | `L21` settore 2250 |
| Altri depositi, famiglie | `L20` settore 2250 meno `L21` settore 2250 |
| Depositi a vista, imprese | `L21` settore 2240 |
| Altri depositi, imprese | `L20` settore 2240 meno `L21` settore 2240 |
| Altri depositi di non-IFM | `L20` settore 2300 meno famiglie meno imprese |
| Depositi del governo centrale | `L20` settore 0000 meno settore 2300 meno settore 1000 |
| Depositi da IFM (interbancario, banca centrale inclusa) | `L20` settore 1000 |
| Quote di fondi monetari | `L30` |
| Titoli di debito emessi | `L40` |
| Capitale e riserve | `L60` |
| Passività verso l'estero | `LXG` |
| Altre passività | `L70` |
| Scarto | totale `T00` meno la somma delle voci |

Tolleranza dichiarata: lo scarto deve restare entro lo 0,5% del totale del passivo in
valore assoluto. Dove non ci resta, il report lo spiega paese per paese.

## 2. Indicatore e classifica (criterio c di SPEC), fissati prima dei dati

### 2.1 Cosa deve misurare

Il meccanismo di riferimento è quello del Working Paper BCE 3199: i fondi si spostano
dai depositi al dettaglio verso le stablecoin, la banca deve sostituirli con raccolta
all'ingrosso e la sua capacità di intermediazione ne risente. Un sistema bancario è
strutturalmente più esposto quanto più la sua raccolta è fatta del tipo di depositi che
può migrare, quanto meno quei depositi sono vincolati, e quanto più la raccolta dipende
da essi rispetto ai canali all'ingrosso.

### 2.2 Tre componenti

| Componente | Formula | Perché | Verso |
|---|---|---|---|
| C1 - Quantità in gioco | (depositi a vista di famiglie + depositi a vista di imprese) / totale passivo | È la raccolta che può spostarsi senza preavviso e senza penali verso uno strumento di pagamento | più alto = più esposto |
| C2 - Mobilità | depositi a vista di famiglie e imprese / depositi totali di famiglie e imprese | A parità di depositi, quelli a vista sono meno stabili di quelli vincolati | più alto = più esposto |
| C3 - Dipendenza | depositi totali di famiglie e imprese / (depositi totali di famiglie e imprese + titoli di debito emessi + depositi da IFM) | Chi si finanzia quasi solo con depositi della clientela ha meno canali all'ingrosso già attivi per sostituirli | più alto = più esposto |

### 2.3 Indicatore principale

Ogni mese, ciascuna componente viene standardizzata tra i paesi con dati in quel mese
(valore meno media, diviso deviazione standard). L'indicatore è:

    I = 0,50 × z(C1) + 0,25 × z(C2) + 0,25 × z(C3)

C1 pesa la metà perché misura direttamente quanta raccolta è del tipo che può migrare;
C2 e C3 qualificano quanto quella perdita sarebbe rapida e quanto difficile da
compensare, e si dividono l'altra metà. La classifica ordina i paesi per I decrescente.
L'indicatore è relativo: dice chi è più esposto degli altri in quel mese, non di quanto
in assoluto. Per l'evoluzione nel tempo vanno lette le tre componenti, che sono quote.

### 2.4 Pesature alternative

| Variante | Definizione | Cosa verifica |
|---|---|---|
| A1 - Pesi uguali | un terzo ciascuna | Se il peso doppio di C1 decide l'ordine |
| A2 - Solo quantità | solo C1 | Quanto aggiungono C2 e C3 |
| A3 - Solo famiglie | C1 e C2 calcolate con i soli depositi delle famiglie, stessi pesi | Se le imprese cambiano l'ordine |
| A4 - Ranghi | media pesata dei ranghi invece che dei valori standardizzati, stessi pesi | Se pochi valori estremi decidono l'ordine |
| A5 - Con canale valutario | 0,40 C1 + 0,20 C2 + 0,20 C3 + 0,20 C4, dove C4 = passività in dollari / passività totali (BRI) | Se la raccolta in dollari, che il WP 3199 indica come canale distinto, cambia l'ordine. Solo 13 paesi, ultimo trimestre disponibile |

Misure di stabilità riportate per ogni variante: correlazione di rango di Spearman con
la classifica principale, numero di paesi che si spostano di più di tre posizioni,
paesi in comune tra i primi cinque.

### 2.5 Cosa la classifica non è

Ordina i paesi per struttura della raccolta. Non è una probabilità che i depositi
escano, non è un giudizio sulla solidità delle banche e non tiene conto di liquidità,
capitale in eccesso o accesso al rifinanziamento.

## 3. Risultati

_Da compilare dopo l'esecuzione degli script._
