# Sintesi - esposizione dell'area euro alle stablecoin in dollari

Pagina generata il 25 novembre 2026 da `src/summary.py`. Non va modificata a mano: si rigenera con
`.venv/bin/python src/run_all.py`. Versione interattiva: [cruscotto](https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/).

Il programma non stima quante stablecoin detengono i residenti dell'area euro: con dati
gratuiti non è possibile. Parte da un livello ipotizzato da fonti esterne e mostra come
si muove l'attività in euro, quali sistemi bancari hanno la raccolta più esposta e
quanto peserebbe ogni livello di adozione, paese per paese.

## 1. Livello: 16,7 - 33,4 miliardi di euro

Stablecoin in dollari attribuite all'area euro applicando le quote assunte dall'ESM (7,5% e 15%)
alla circolazione di USDT e USDC del 24 novembre 2026: 244,2 miliardi di dollari.

| | Miliardi di dollari | Miliardi di euro | Sui depositi a vista dell'area |
|---|---|---|---|
| Quota 7,5% | 18,3 | 16,7 | 0,21% |
| Quota 15% | 36,6 | 33,4 | 0,42% |

È un'ipotesi esterna applicata, non una stima. Accanto: il 5% dei consumatori
dichiara di possedere stablecoin (BCE, agosto 2025).

Stima propria dal basso, dall'indagine BCE: 15,4 miliardi di euro (da 8,9 a 23,1).
Le altre strade non hanno dato una stima concorde: il programma pubblica come proprio solo il minimo, 8,9 miliardi di euro.

## 2. Andamento: quota EUR dei volumi stablecoin/fiat, settimana 16-22 novembre 2026

| Serie | Ultima settimana | Variazione (punti) | Media 52 settimane | Scarto della quota | Scarto del volume | Stato |
|---|---|---|---|---|---|---|
| USDT | 11,9% | 0,0 | 14,2% | -0,7 | +0,5 | nessuno |
| USDT senza Coinbase | 10,9% | +0,3 | 13,9% | -1,0 | +0,2 | nessuno |
| USDC | 54,9% | +2,1 | 48,9% | +0,7 | +2,6 | da verificare |
| USDC senza Coinbase | 48,5% | +2,6 | 45,0% | +0,4 | +2,0 | nessuno |

Da guardare: USDC (da verificare). Uno scarto oltre 2 solo sul volume o solo sulla quota indica di solito
un movimento delle altre valute, non dell'euro.
L'indice misura trading in euro su 25 exchange, non detenzioni né residenza. Test sul contenuto
predittivo per i depositi a vista delle famiglie: esito **no** (p = 0,31, 43 mesi).

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
| Oggi, quota 7,5% | 18,3 | 16,1 | 0,20% | 0,13% | 3,6 (da 2,8 a 19,3) |
| Oggi, quota 15% | 36,6 | 32,3 | 0,39% | 0,26% | 7,1 (da 5,5 a 38,6) |
| ESM base 2030 | 143 | 125,9 | 1,5% | 1,0% | 27,7 (da 21,5 a 150,8) |
| ESM alto 2030 | 300 | 264,2 | 3,2% | 2,1% | 58,2 (da 45,2 a 316,3) |
| ESM alto 2030, quota 15% | 600 | 528,4 | 6,5% | 4,2% | 116,4 (da 90,3 a 632,5) |

Perché l'area perda il 5% dei depositi a vista servirebbero 464 miliardi di dollari di stablecoin
detenute dai residenti, 25 volte il livello di base di oggi.
Nello scenario ESM alto l'aumento di raccolta all'ingrosso necessario è massimo in
Lettonia (+48%), Slovenia (+27%), Lituania (+25%) e minimo in Francia (+0,7%).
È un calcolo contabile con sostituzione piena dei depositi, non una previsione. Il credito in meno
applica coefficienti del Working Paper BCE 3199, stimati su singole banche, ad aggregati nazionali:
il primo valore è la variante a soglia, tra parentesi l'intervallo tra coefficiente basso e alto.

## 5. Mappa a due canali

| Quadrante | Paesi |
|---|---|
| A - depositi alti, dollari bassi | Slovenia, Bulgaria, Lettonia, Croazia, Malta, Slovacchia, Lituania |
| B - entrambi alti | Grecia, Cipro, Spagna |
| C - depositi bassi, dollari alti | Germania, Finlandia, Belgio, Paesi Bassi, Irlanda, Francia, Lussemburgo |
| D - entrambi bassi | Estonia, Italia, Portogallo, Austria |

Nel quadrante A il rischio è la perdita di depositi e di credito; nel C è la minore presa della
politica monetaria interna sulle banche già finanziate in dollari.

## Cosa questa pagina non dice

- Non misura quante stablecoin detengono i residenti dell'area euro: i livelli sono ipotesi o triangolazioni.
- Non stima effetti causali: il credito in meno applica coefficienti pubblicati, come ordine di grandezza.
- Non è un sistema di allerta precoce: la segnalazione marca valori insoliti, non anticipa i depositi.

## Dati e aggiornamento

| Modulo | Dati aggiornati a | Ultima esecuzione | Dettagli |
|---|---|---|---|
| 1 - Livello | 24 novembre 2026 | riuscita | [06_modulo1_livello.md](reports/06_modulo1_livello.md) |
| 2 - Andamento | settimana 16-22 novembre 2026 | riuscita | [03_modulo2_indice.md](reports/03_modulo2_indice.md) |
| 3 - Vulnerabilità | settembre 2026 | riuscita | [04_modulo3_classifica.md](reports/04_modulo3_classifica.md) |
| 4 - Scenari | bilanci di settembre 2026 | riuscita | [05_modulo4_scenari.md](reports/05_modulo4_scenari.md) |
| 5 - Credito e trasmissione | bilanci di settembre 2026 | riuscita | [07_modulo5_credito.md](reports/07_modulo5_credito.md) |

Ultimo aggiornamento completo: 25 novembre 2026, modalità con scarico dalle fonti.
Definizioni, fonti, limiti e metodi scartati: [SPEC.md](SPEC.md).

---

**Cosa aggiunge questo al programma finale**: i risultati di tutti i moduli in una pagina sola, sempre
allineata ai dati perché generata dal codice e non scritta a mano.
