# Dati dell'applicazione

Generati da `src/export_app_data.py`. Schema 2.0.0. Non modificare a mano.

Ogni file contiene `schema`, `file`, `generato_il`, `dati_al`, `descrizione` e `campi` (la documentazione dei campi), più i dati.
I file contengono numeri e codici. I testi dell'interfaccia, in inglese e in italiano, sono in `web/src/i18n/`; i nomi dei paesi si ricavano dal codice.

## banche.json

Singole banche dell'area euro dall'esercizio di trasparenza EBA 2025: bilanci, quota retail, copertura per paese e confronto con il modulo 5. Dati pubblici per banca, non dati di vigilanza.

- `banche[]`: una riga per banca dell'area euro con tutte le voci; importi in miliardi di euro, dati consolidati al 30 giugno 2025
- `banche[].quotaRetail`: depositi delle famiglie / (depositi delle famiglie + depositi di società finanziarie diverse dalle banche)
- `banche[].retailAlta`: sopra il 75° percentile della quota retail tra le banche del campione
- `banche[].vistaFam, vistaImp`: conti correnti e depositi overnight
- `banche[].usa`: esposizioni creditizie originarie verso controparti statunitensi sul totale; null se gli Stati Uniti non sono tra i primi dieci paesi della banca
- `paesi[].coperturaBsi`: totale attivo delle banche del campione sul totale attivo delle IFM del paese (BSI, giugno 2025); perimetri diversi, può superare 1
- `paesi[].coperturaConsolidato`: lo stesso rapporto sul totale attivo consolidato di tutte le banche del paese (BCE, CBD2, secondo trimestre 2025)
- `paesi[].m6PerEuro`: prestiti in meno per euro di deflusso, coefficienti applicati banca per banca, nello scenario di controllo
- `paesi[].m5`: lo stesso rapporto con le varianti del modulo 5 sugli aggregati nazionali
- `confronto`: somma sui paesi coperti, miliardi di euro

## canali.json

Mappa a due canali: depositi a vista sul passivo e passività in dollari, con ciò che ogni quadrante implica per la trasmissione.

- `quadranti`: A depositi alti e dollari bassi, B entrambi alti, C depositi bassi e dollari alti, D entrambi bassi; i testi sono nell'applicazione
- `confrontoFonti`: paragonabilità tra misura BRI e misura BSI trimestrale

## livello.json

Stima dal basso del valore di stablecoin in dollari detenuto nell'area euro, con le ipotesi modificabili, e confronto con l'ipotesi ESM.

- `fasce[].percentuale`: quota di detentori nella fascia, misurata sul grafico B riquadro b del riquadro BCE
- `fasce[].minimo, massimo`: estremi della fascia in euro (per l'ultima, aperta, il massimo è un'ipotesi)
- `unita`: famiglie e adulti dei 21 paesi (Eurostat)
- `quotaDollari`: minimo, centrale e massimo della quota in dollari
- `esm.serie`: livello ESM di base a fine mese, miliardi di euro

## meta.json

Stato dell'aggiornamento e di ogni fonte, ed elenco dei file di dati.

- `fonti[].stato`: aggiornata, parziale (manca una parte minore), ultimo_valido (la fonte non ha risposto), non_aggiornata (ricalcolo senza scarico), statica
- `fonti[].tipoData`: come leggere datiAl: giorno, settimana (lunedì), mese, trimestre, anno, testo (chiave di traduzione)
- `fonti[].dettaglio`: per gli exchange: coppie senza risposta con la loro quota dei volumi, coppie mai disponibili, settimane trattenute
- `aggiornamento.modalita`: online (con scarico dalle fonti) oppure offline

## metodo.json

Fonti, limiti dichiarati e metodi scartati, in italiano e in inglese.

- `fonti`: tabella delle fonti di SPEC.md (sezione 3)
- `limiti`: sezione 4 di SPEC.md
- `metodiScartati`: sezione 5 di SPEC.md
- `it, en`: ogni voce è esportata nelle due lingue; l'inglese viene da src/i18n/spec_en.json

## monitor.json

Indice settimanale della quota EUR dei volumi stablecoin/fiat, volumi assoluti, stato delle segnalazioni e storico lungo.

- `principale`: indice principale, dal dicembre 2024
- `pannello`: numero di exchange nell'indice principale e in quello lungo, ed exchange esclusi
- `effettoEsclusione`: differenza tra indice senza e con gli exchange esclusi, in punti percentuali
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
- `predefiniti[].eur`: importo detenuto in miliardi di euro; gli scenari definiti in dollari sono convertiti al cambio unico del programma
- `cambioUsdPerEur`: cambio unico del programma: riferimento BCE più recente alla data della circolazione (modulo 1)
- `paesi[].fonteUsd`: BRI oppure BSI (trimestrale per valuta)

## geo/europa.geo.json

Confini dei paesi europei da Eurostat GISCO (Countries 2024, scala 1:20 milioni), con `code`, `name` e `area_euro`. © EuroGeographics per i confini amministrativi.
