# 07 - Modulo 5: effetto sul credito e sulla trasmissione

Il modulo 5 di [SPEC.md](../SPEC.md) porta gli scenari del modulo 4 dai depositi al
credito, applicando i coefficienti del Working Paper BCE 3199, e colloca i paesi su una
mappa a due canali.

Le sezioni 1 e 2 sono state committate **prima** di calcolare i risultati. I
coefficienti della sezione 1 sono dati di ingresso, trascritti dal paper.

**Avvertenza che vale per tutto il documento**: sono coefficienti stimati su singole
banche, applicati qui ad aggregati nazionali. Danno ordini di grandezza, non previsioni.

## 1. Coefficienti del Working Paper BCE 3199, verificati sull'originale

Altavilla, Boucinha, Burlon, Adalid, Fortes, Maruhn, "Stablecoins and monetary policy
transmission", ECB Working Paper 3199, marzo 2026
([PDF](https://www.ecb.europa.eu/pub/pdf/scpwps/ecb.wp3199~ad552b59ec.en.pdf)). Letto
per intero; le tabelle 1 e 3 sono state controllate anche sull'immagine della pagina.
I numeri di pagina sono quelli stampati.

| N. | Coefficiente | Valore | Cosa misura esattamente | Origine |
|---|---|---|---|---|
| 1 | Regola depositi → prestiti | 100 mld € di depositi retail in meno → circa 50 mld € di prestiti in meno | Elasticità implicita nella stima su tutte le banche, che gli autori dichiarano in linea con la letteratura | Sezione 3.2, p. 18 |
| 1a | Stima da cui deriva | Un calo di una deviazione standard dei depositi a vista sul totale attivo (0,8 punti) riduce la crescita annua dei prestiti di circa 1 punto, cioè 0,4 punti del totale attivo | Stima su tutte le banche insieme, "non mostrata" in tabella | Sezione 3.2, p. 18 |
| 2a | Calo dei depositi a vista, banche a **bassa** quota retail | -0,441 (errore std. 0,306), non significativo; con controllo della domanda -0,342 (0,293) | Crescita cumulata dei prestiti al settore privato non finanziario tra t-1 e t+24, in punti, per un calo di una deviazione standard dei depositi a vista delle famiglie sul totale attivo | Tabella 1, colonne 3 e 4, p. 17 |
| 2b | Calo dei depositi a vista, banche ad **alta** quota retail | -3,089** (0,197); con controllo della domanda -4,173* (0,163) | Come sopra. Alta quota retail = sopra il 75° percentile del rapporto tra depositi delle famiglie e depositi di famiglie più intermediari non bancari | Tabella 1, colonne 3 e 4, p. 17 |
| 2c | Shock alle stablecoin | -2,633** (1,055); con controllo della domanda -2,230** (1,102) | Crescita cumulata dei prestiti a 24 mesi per uno shock di una deviazione standard all'esposizione alle stablecoin | Tabella 1, colonne 1 e 2, p. 17 |
| 3a | Risposta dei prestiti a +25 pb, **bassa** raccolta in dollari | -1,590** (0,617); con controllo della domanda -1,330** (0,596) | Crescita annua dei prestiti 24 mesi dopo, in punti, per banche con molta raccolta all'ingrosso e quota in dollari sotto il 75° percentile | Tabella 3, colonne 1 e 3, p. 28 |
| 3b | Risposta dei prestiti a +25 pb, **alta** raccolta in dollari | -0,064 (0,578); con controllo della domanda +0,293 (0,540): non significativi | Come sopra, quota in dollari sopra il 75° percentile | Tabella 3, colonne 2 e 4, p. 28 |
| 3c | Differenza tra 3a e 3b | F = 3,36* e 4,20** | Test di uguaglianza dei due coefficienti | Tabella 3, p. 28 |
| 4a | Trasmissione ai tassi sui prestiti, tutte le banche | circa 70% dopo un anno, circa 100% dopo due | Punti di tasso sui prestiti alle imprese per punto di tasso di policy | Sezione 4.2 e figura 9, pp. 22-23 |
| 4b | Trasmissione ai tassi sui prestiti, banche dipendenti dall'ingrosso | circa 80% dopo 12 mesi, circa 120% dopo due anni | Come sopra, banche nel quartile più basso del rapporto depositi retail su depositi totali | Sezione 4.2 e figura 9, pp. 22-23 |
| 4c | Trasmissione ai tassi sui depositi | circa 10% (tutte); oltre 30% dopo 18-24 mesi (dipendenti dall'ingrosso) | Punti di tasso sui depositi a vista retail per punto di tasso di policy | Sezione 4.2 e figura 9, p. 23 |
| 4d | Risposta dei prestiti a +25 pb | circa -0,3 punti (tutte); quasi -0,7 punti (dipendenti dall'ingrosso), con intervallo fino a -1,5 | Picco della crescita annua dei prestiti alle imprese, circa 12 mesi dopo | Sezione 4.2 e figura 9, p. 23 |

Due annotazioni sulla trascrizione:

- Nella tabella 1 gli errori standard dei coefficienti "alta quota retail" (0,197 e
  0,163) sono riportati come stampati. Con quei valori i coefficienti sarebbero
  significativi all'1%, mentre gli asterischi indicano 5% e 10%: una delle due
  indicazioni nel paper è probabilmente un refuso. Qui si usano le stime puntuali.
- I valori 4a-4d sono letti dal testo, che descrive la figura 9 con "circa": non
  esistono in tabella.

## 2. Metodo, fissato prima dei risultati

### 2.1 Dati aggiuntivi

Dal dataset BSI della BCE, per i 21 paesi, mensili: prestiti alle famiglie
(`A20`, settore 2250) e alle imprese non finanziarie (settore 2240); depositi degli
intermediari non bancari (settori 2210 e 2220), per la quota retail.

### 2.2 Dal deflusso ai prestiti

Per ogni paese e scenario il modulo 4 dà un deflusso di depositi. Tre varianti.

| Variante | Regola |
|---|---|
| **Uniforme** | Prestiti in meno = 0,5 × deflusso (coefficiente 1), uguale per tutti i paesi |
| **Intervallo** | Per ogni paese si calcola l'effetto con il coefficiente basso (2a) e con quello alto (2b) |
| **A soglia** | Coefficiente alto ai paesi sopra la soglia di quota retail, coefficiente basso agli altri |

Applicazione dei coefficienti 2a e 2b a un paese:

    calo dei prestiti (%) = coefficiente × (deflusso / totale del passivo, in punti) / 0,8
    prestiti in meno (mld €) = calo (%) × prestiti a famiglie e imprese

Lo 0,8 è la deviazione standard indicata dal paper per la stima su tutte le banche; si
assume che valga anche per la tabella 1, che usa la stessa variabile. Si usano le stime
della colonna 3 (-0,441 e -3,089); la colonna 4 è riportata come sensibilità.
L'effetto è cumulato su 24 mesi.

### 2.3 Soglia di quota retail

Il paper classifica "ad alta quota retail" le banche sopra il 75° percentile del
rapporto tra depositi delle famiglie e depositi di famiglie più intermediari non
bancari. La soglia per i paesi è definita allo stesso modo:

    quota retail = depositi delle famiglie / (depositi delle famiglie + depositi di
                   altri intermediari finanziari, assicurazioni e fondi pensione)

**Soglia: il 75° percentile di questa quota tra i 21 paesi, nell'ultimo mese.** I paesi
sopra ricevono il coefficiente alto. È una trasposizione: il percentile del paper è
calcolato tra banche e il suo valore non è pubblicato.

### 2.4 Mappa a due canali

- **Asse 1**: depositi a vista di famiglie e imprese sul totale del passivo (C1 del modulo 3).
- **Asse 2**: passività in dollari sul totale del passivo. Fonte: statistiche BRI per
  i 13 paesi che dichiarano. Per gli altri otto si provano, nell'ordine, i dati bancari
  consolidati della BCE e la scomposizione trimestrale per valuta del dataset BSI
  (depositi in dollari più titoli emessi in dollari). Dove esistono entrambe le fonti si
  confrontano, per capire se sono paragonabili; i paesi con la fonte alternativa sono
  marcati.
- **Soglie dei quadranti**: la mediana dei 21 paesi su ciascun asse.
- **Quadranti**: A = depositi alti e dollari bassi; B = depositi alti e dollari alti;
  C = depositi bassi e dollari alti; D = depositi bassi e dollari bassi.
- Per ogni quadrante si scrive cosa implicano i coefficienti 3 e 4 per la trasmissione.

### 2.5 Cosa non si fa

Non si stimano coefficienti propri, non si applica il coefficiente 2c (richiede lo
shock di attenzione definito dagli autori) e non si calcolano effetti sui tassi per
paese: i coefficienti 3 e 4 servono solo a qualificare i quadranti.

## 3. Risultati

_Da compilare dopo l'esecuzione dello script._
