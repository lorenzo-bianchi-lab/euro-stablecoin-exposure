# Dati dell'applicazione

Generati da `src/export_app_data.py`. Schema 1.0.0. Non modificare a mano.

Ogni file contiene `schema`, `file`, `generato_il`, `dati_al`, `descrizione` e `campi` (la documentazione dei campi), più i dati.

## canali.json

Mappa a due canali: depositi a vista sul passivo e passività in dollari, con ciò che ogni quadrante implica per la trasmissione.

- `quadranti[].implicazione`: testo ricavato dai coefficienti del Working Paper BCE 3199
- `confrontoFonti`: paragonabilità tra misura BRI e misura BSI trimestrale

## livello.json

Stima dal basso del valore di stablecoin in dollari detenuto nell'area euro, con le ipotesi modificabili, e confronto con l'ipotesi ESM.

- `fasce[].percentuale`: quota di detentori nella fascia, misurata sul grafico B riquadro b del riquadro BCE
- `unita`: famiglie e adulti dei 21 paesi (Eurostat)
- `quotaDollari`: minimo, centrale e massimo della quota in dollari
- `esm.serie`: livello ESM di base a fine mese, miliardi di euro

## meta.json

Stato dell'aggiornamento e di ogni fonte, ed elenco dei file di dati.

- `fonti[].stato`: aggiornata, aggiornata in parte, ultimo dato valido, non aggiornata in questa esecuzione, statica
- `avviso`: testo da mostrare nell'applicazione quando una fonte non si è aggiornata

## metodo.json

Fonti, limiti dichiarati, metodi scartati e stato dell'ultimo aggiornamento.

- `fontiDescrizione`: tabella delle fonti di SPEC.md
- `limiti`: sezione 4 di SPEC.md
- `metodiScartati`: sezione 5 di SPEC.md
- `coefficienti`: Working Paper BCE 3199, con origine

## monitor.json

Indice settimanale della quota EUR dei volumi stablecoin/fiat, volumi assoluti, stato delle segnalazioni e storico lungo.

- `principale`: 25 exchange, dal dicembre 2024
- `lungo`: senza Kraken e Gemini, dal gennaio 2023: confrontabile per direzione, non per livello
- `segnalazioni[serie].stato`: segnale, da verificare, nessuno, storico insufficiente
- `fontiMancanti`: coppie con storico che non hanno risposto all'ultimo scarico, con la loro quota dei volumi; null se hanno risposto tutte
- `volumi`: miliardi di unità di stablecoin (circa dollari) a settimana

## paesi/AT.json

Serie storiche mensili di Austria: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/BE.json

Serie storiche mensili di Belgio: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/BG.json

Serie storiche mensili di Bulgaria: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/CY.json

Serie storiche mensili di Cipro: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/DE.json

Serie storiche mensili di Germania: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/EE.json

Serie storiche mensili di Estonia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/ES.json

Serie storiche mensili di Spagna: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/FI.json

Serie storiche mensili di Finlandia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/FR.json

Serie storiche mensili di Francia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/GR.json

Serie storiche mensili di Grecia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/HR.json

Serie storiche mensili di Croazia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/IE.json

Serie storiche mensili di Irlanda: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/IT.json

Serie storiche mensili di Italia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/LT.json

Serie storiche mensili di Lituania: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/LU.json

Serie storiche mensili di Lussemburgo: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/LV.json

Serie storiche mensili di Lettonia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/MT.json

Serie storiche mensili di Malta: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/NL.json

Serie storiche mensili di Paesi Bassi: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/PT.json

Serie storiche mensili di Portogallo: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/SI.json

Serie storiche mensili di Slovenia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## paesi/SK.json

Serie storiche mensili di Slovacchia: composizione del passivo e indicatore di esposizione.

- `composizione.voci`: quote sul totale del passivo, una serie per voce
- `composizione.totale`: totale del passivo, miliardi di euro
- `indicatore.posizione`: posizione in classifica tra i paesi con dati in quel mese
- `indicatore.c1,c2,c3`: componenti dell'indicatore (quote)

## panoramica.json

Indicatori chiave, segnalazioni attive e date dei dati.

- `livello`: stima propria in miliardi di euro
- `scenarioCentrale`: effetto del livello centrale con regola R1 e sostituzione piena
- `indice[serie]`: quota EUR dell'ultima settimana e stato della segnalazione

## simulatore.json

Bilanci bancari per paese, pesi delle regole di ripartizione e coefficienti: tutto ciò che serve a rifare nel browser i calcoli dei moduli 4 e 5.

- `paesi[].vista`: depositi a vista di famiglie e imprese, miliardi di euro
- `paesi[].vistaFam`: depositi a vista delle famiglie
- `paesi[].clientela`: depositi totali di famiglie e imprese
- `paesi[].ingrosso`: titoli di debito emessi più depositi da IFM
- `paesi[].totale`: totale del passivo
- `paesi[].prestiti`: prestiti a famiglie e imprese
- `paesi[].pop`: popolazione (peso della regola R2)
- `paesi[].r3`: possessori di cripto-attività stimati (peso della regola R3)
- `paesi[].pesoContinuo`: peso tra 0 e 1 per la variante continua del credito
- `coefficienti`: Working Paper BCE 3199: regola uniforme, deviazione standard in punti, coefficienti basso e alto (tabella 1, colonne 3 e 4)
- `livello`: livello di riferimento in miliardi di euro
- `predefiniti[].eur`: importo detenuto in miliardi di euro, al cambio dei bilanci per gli scenari definiti in dollari

## geo/europa.geo.json

Confini dei paesi europei da Eurostat GISCO (Countries 2024, scala 1:20 milioni), con `code`, `name` e `area_euro`. © EuroGeographics per i confini amministrativi.
