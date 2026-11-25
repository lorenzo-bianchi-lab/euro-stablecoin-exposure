# Sintesi - esposizione dell'area euro alle stablecoin in dollari

Pagina generata il 25 novembre 2026 da `src/summary.py`. Non va modificata a mano: si rigenera con
`.venv/bin/python src/run_all.py`. Versione interattiva: [applicazione](https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/).

Il programma stima un intervallo per le stablecoin in dollari detenute dai residenti dell'area
euro, non una misura: parte da un'indagine BCE e da ipotesi dichiarate. Mostra poi come si
muove l'attività in euro, quali sistemi bancari hanno la raccolta più esposta e quanto
peserebbe ogni livello di adozione su depositi e credito, paese per paese.

## 1. Livello: 15,4 miliardi di euro, intervallo 8,9 - 23,1

Stima propria dal basso: famiglie dell'area euro × quota che detiene stablecoin × importo medio
detenuto × quota in dollari, dall'indagine BCE sui consumatori. Il programma stima un intervallo.

| | Miliardi di euro | Cosa rappresenta |
|---|---|---|
| Minimo | 8,9 | Ipotesi prudenti su importi e quota in dollari |
| **Centro** | **15,4** | Livello di riferimento del programma |
| Massimo | 23,1 | Ipotesi alte su importi e quota in dollari |
| Estremo superiore dichiarato | 42,0 | Variante individui: conta più volte la stessa famiglia |
| Confronto: ipotesi ESM, quota 7,5% | 16,7 | Quota assunta dall'ESM × circolazione di USDT e USDC del 25 novembre 2026 (243,4 mld $) |
| Confronto: ipotesi ESM, quota 15% | 33,4 | Come sopra, quota doppia |

L'indagine copre 11 paesi ed è definita sperimentale dalla BCE; l'estensione a 21 paesi è un'ipotesi.
Le altre due strade tentate (riserve degli exchange, dati nazionali) non confermano la stima: il
criterio fissato nel report 08 avrebbe pubblicato solo il minimo. La scelta dell'intervallo come
riferimento è del 25 novembre 2026, successiva ai risultati, ed è annotata nel registro di SPEC.md.

## 2. Andamento: quota EUR dei volumi stablecoin/fiat, settimana 16-22 novembre 2026

| Serie | Ultima settimana | Variazione (punti) | Media 52 settimane | Scarto della quota | Scarto del volume | Stato |
|---|---|---|---|---|---|---|
| USDT | 10,2% | -1,2 | 13,5% | -1,2 | -0,1 | nessuno |
| USDT senza Coinbase | 9,0% | -1,0 | 13,2% | -1,5 | -0,5 | nessuno |
| USDC | 54,3% | +1,8 | 48,7% | +0,7 | +2,4 | da verificare |
| USDC senza Coinbase | 47,7% | +2,2 | 44,7% | +0,4 | +1,8 | nessuno |

Da guardare: USDC (da verificare). Uno scarto oltre 2 solo sul volume o solo sulla quota indica di solito
un movimento delle altre valute, non dell'euro.
L'indice misura trading in euro su 24 exchange, non detenzioni né residenza. Test sul contenuto
predittivo per i depositi a vista delle famiglie: esito **no** (p = 0,31, 43 mesi).
Bybit è fuori dall'indice per tutto lo storico. Senza, l'indice è in media -0,40 punti per USDT
e -0,12 per USDC; nell'ultima settimana comune -1,76 e -0,58.

## 3. Vulnerabilità: classifica della raccolta bancaria, settembre 2026

Paesi ordinati per esposizione strutturale a una sostituzione dei depositi.

| Posizione | Paese | Depositi a vista sul passivo | Depositi a vista (mld €) | Quota dell'area |
|---|---|---|---|---|
| 1 | Slovenia | 59,0% | 36 | 0,4% |
| 2 | Lettonia | 50,3% | 17 | 0,2% |
| 3 | Bulgaria | 51,5% | 65 | 0,8% |
| 4 | Malta | 45,6% | 22 | 0,3% |
| 5 | Croazia | 48,6% | 49 | 0,6% |
| ... | | | | |
| 10 | Spagna | 36,2% | 1.255 | 15,3% |
| ... | | | | |
| 12 | Italia | 30,7% | 1.296 | 15,8% |
| ... | | | | |
| 15 | Germania | 21,4% | 2.566 | 31,4% |
| ... | | | | |
| 19 | Paesi Bassi | 11,4% | 367 | 4,5% |
| 20 | Lussemburgo | 4,9% | 87 | 1,1% |
| 21 | Francia | 8,5% | 1.126 | 13,8% |

I primi cinque detengono il 2,3% dei depositi a vista dell'area;
Germania, Italia, Spagna e Francia ne detengono il 76%.
La classifica ordina la struttura della raccolta, non la probabilità che i depositi escano.

## 4. Scenari: quanto pesa ogni livello sulla raccolta, bilanci di settembre 2026

| Scenario | Stablecoin detenute (mld $) | Depositi da sostituire (mld €) | Depositi a vista persi | Raccolta all'ingrosso in più | Credito in meno (mld €) |
|---|---|---|---|---|---|
| Stima propria, minimo | 9,8 | 8,9 | 0,11% | 0,07% | 4,5 (da 1,5 a 10,7) |
| **Stima propria, centro** | 16,8 | 15,4 | 0,19% | 0,12% | 7,7 (da 2,6 a 18,4) |
| Stima propria, massimo | 25,3 | 23,1 | 0,28% | 0,19% | 11,6 (da 4,0 a 27,7) |
| Confronto: ipotesi ESM oggi (7,5%) | 18,3 | 16,7 | 0,20% | 0,13% | 8,3 (da 2,9 a 20,0) |
| ESM base 2030 | 143 | 130,8 | 1,6% | 1,1% | 65,4 (da 22,3 a 156,5) |
| ESM alto 2030 | 300 | 274,3 | 3,4% | 2,2% | 137,2 (da 46,9 a 328,4) |
| ESM alto 2030, quota 15% | 600 | 548,7 | 6,7% | 4,4% | 274,3 (da 93,8 a 656,8) |

Perché l'area perda il 5% dei depositi a vista servirebbero 447 miliardi di dollari di stablecoin
detenute dai residenti, 27 volte il centro della stima propria.
Nello scenario ESM alto l'aumento di raccolta all'ingrosso necessario è massimo in
Lettonia (+50%), Slovenia (+28%), Lituania (+26%) e minimo in Francia (+0,7%).
È un calcolo contabile con sostituzione piena dei depositi, non una previsione. Il credito in meno
applica coefficienti del Working Paper BCE 3199, stimati su singole banche, ad aggregati nazionali:
il primo valore è la regola uniforme (0,5 euro di prestiti per euro di depositi), tra parentesi
l'intervallo tra coefficiente basso e alto. Variante continua e a soglia nell'applicazione.

## 5. Mappa a due canali

| Quadrante | Paesi |
|---|---|
| A - depositi alti, dollari bassi | Slovenia, Bulgaria, Lettonia, Croazia, Malta, Slovacchia, Lituania |
| B - entrambi alti | Grecia, Cipro, Spagna |
| C - depositi bassi, dollari alti | Germania, Finlandia, Belgio, Paesi Bassi, Irlanda, Francia, Lussemburgo |
| D - entrambi bassi | Estonia, Italia, Portogallo, Austria |

Nel quadrante A il rischio è la perdita di depositi e di credito; nel C è la minore presa della
politica monetaria interna sulle banche già finanziate in dollari.

## 6. Singole banche (esercizio di trasparenza EBA 2025)

85 banche dell'area euro con tutte le voci, su 99 nell'esercizio, in 18 paesi su 21;
dati al 30 giugno 2025. Coprono il 61% dell'attivo delle banche residenti e il 69% di quello consolidato.
Soglia di quota retail tra banche: 94,4% (21 banche sopra); tra paesi era 92,4%.

| Prestiti in meno al livello centrale, paesi coperti | Miliardi di euro | Per euro di deflusso |
|---|---|---|
| **Modulo 6, coefficienti banca per banca** | 6,7 | 0,45 |
| Modulo 5, regola uniforme | 7,5 | 0,50 |
| Modulo 5, variante continua | 3,7 | 0,25 |
| Modulo 5, variante a soglia | 2,7 | 0,18 |
| Modulo 5, coefficiente basso | 2,5 | 0,17 |
| Modulo 5, coefficiente alto | 17,7 | 1,18 |

Dati pubblici per banca, non dati di vigilanza: l'ordine delle banche non è un giudizio sulla solidità.

## Cosa questa pagina non dice

- Non misura quante stablecoin detengono i residenti dell'area euro: stima un intervallo da un'indagine e da ipotesi dichiarate.
- Non stima effetti causali: il credito in meno applica coefficienti pubblicati, come ordine di grandezza.
- Non è un sistema di allerta precoce: la segnalazione marca valori insoliti, non anticipa i depositi.

## Dati e aggiornamento

| Modulo | Dati aggiornati a | Ultima esecuzione | Dettagli |
|---|---|---|---|
| 1 - Livello | 25 novembre 2026 | riuscita | [06_modulo1_livello.md](reports/06_modulo1_livello.md) |
| 2 - Andamento | settimana 16-22 novembre 2026 | riuscita | [03_modulo2_indice.md](reports/03_modulo2_indice.md) |
| 3 - Vulnerabilità | settembre 2026 | riuscita | [04_modulo3_classifica.md](reports/04_modulo3_classifica.md) |
| 4 - Scenari | bilanci di settembre 2026 | riuscita | [05_modulo4_scenari.md](reports/05_modulo4_scenari.md) |
| 5 - Credito e trasmissione | bilanci di settembre 2026 | riuscita | [07_modulo5_credito.md](reports/07_modulo5_credito.md) |
| 6 - Singole banche | 30 giugno 2025 | riuscita | [12_rifiniture_lingua_banche.md](reports/12_rifiniture_lingua_banche.md) |

Ultimo aggiornamento completo: 25 novembre 2026, modalità con scarico dalle fonti.
Definizioni, fonti, limiti e metodi scartati: [SPEC.md](SPEC.md).

---

**Cosa aggiunge questo al programma finale**: i risultati di tutti i moduli in una pagina sola, sempre
allineata ai dati perché generata dal codice e non scritta a mano.
