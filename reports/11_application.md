# Report 11 - Dal motore al programma: correzioni, strato dati, applicazione

Data: 2026-11-25. Metodo e criteri di completamento sono in `SPEC.md` (sezioni
"Correzioni al motore" e "Strato dati e applicazione"), committati prima di questo
report (commit `66ba8d6`).

Applicazione: https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/

## 1. Correzioni al motore

### 1.1 Livello di riferimento

Il livello di riferimento del programma è ora la stima propria dal basso (B1, variante
famiglie). L'ipotesi ESM è il confronto; la variante individui è l'estremo superiore
dichiarato.

| | Miliardi di euro |
|---|---|
| Minimo | 8,9 |
| **Centro** | **15,4** |
| Massimo | 23,1 |
| Estremo superiore dichiarato (individui) | 42,0 |
| Confronto: ipotesi ESM, quota 7,5% e 15% | 16,7 e 33,4 |

**Questa scelta è successiva ai risultati.** Il criterio fissato nel report 08 chiedeva
che almeno due strade su tre concordassero entro un fattore 3: non è successo, e il
criterio prevedeva di pubblicare solo il minimo. Il criterio e il suo esito restano
agli atti; la decisione di usare comunque l'intervallo è annotata in SPEC e
nell'applicazione, accanto al numero. Chi legge deve sapere che l'intervallo non è una
misura e non è confermato da una seconda fonte.

### 1.2 Credito

Il valore in evidenza è la regola uniforme del Working Paper BCE 3199 (0,5 euro di
prestiti per euro di depositi), con l'intervallo tra coefficiente basso e alto. La
variante a soglia resta come sensibilità. Si aggiunge la variante continua, definita in
SPEC prima di calcolarla: il coefficiente è interpolato sulla quota retail del paese tra
due punti di ancoraggio (82,4% e 94,9%), senza salto.

Area euro, regola R1, depositi a vista di famiglie e imprese, sostituzione piena:

| Scenario | Depositi da sostituire (mld €) | Credito in meno, uniforme (mld €) | Intervallo basso - alto | Continua | A soglia |
|---|---|---|---|---|---|
| Stima propria, centro | 15,4 | 7,7 | 2,6 - 18,4 | 4,3 | 3,4 |
| ESM alto 2030 | 264,2 | 132,1 | 45,2 - 316,3 | 74,1 | 58,2 |

L'intervallo è largo: tra coefficiente basso e alto c'è un fattore 7. Sono ordini di
grandezza, non previsioni: coefficienti stimati su singole banche, applicati ad
aggregati nazionali.

### 1.3 Riproducibilità

Versioni delle librerie bloccate in `requirements.txt`. Il test di riproducibilità non
confronta più le impronte dei file: confronta i valori, colonna per colonna, e tollera
una unità sull'ultima cifra decimale scritta. Un secondo test verifica che la tolleranza
non lasci passare differenze più grandi.

## 2. Strato dati

`src/export_app_data.py`, eseguito da `run_all.py` dopo i moduli, scrive in
`web/public/data/` i soli file che l'applicazione legge:

| File | Sezione che lo usa |
|---|---|
| `overview.json` | Panoramica |
| `simulator.json` | Simulatore, mappa d'Europa, scheda paese, due canali, confronto |
| `paesi/XX.json` (21 file) | Scheda paese: composizione dal 2003 e posizione nel tempo |
| `channels.json` | Mappa a due canali |
| `monitor.json` | Monitor settimanale |
| `level.json` | Stima del livello |
| `method.json` | Metodo e dati (fonti, limiti e metodi scartati letti da `SPEC.md`) |
| `meta.json` | Stato di ogni fonte, esito dell'ultimo aggiornamento, avviso |
| `geo/europe.geo.json` | Confini da Eurostat GISCO (Countries 2024, 1:20 milioni) |

Ogni file porta versione dello schema (1.0.0), data di generazione, data dei dati,
descrizione e significato dei campi; il riepilogo è in `web/public/data/README.md`,
generato. In tutto 29 file di dati, circa 1 MB.

**Fonte che fallisce.** Il modulo che usa quella fonte fallisce senza toccare i suoi
risultati precedenti; gli altri proseguono. `meta.json` marca la fonte come "ultimo dato
valido" e l'applicazione mostra un avviso in cima a ogni pagina e lo stato fonte per
fonte nella sezione "Metodo e dati".

## 3. Applicazione

React, Vite, TypeScript ed ECharts, come proposto. Sito statico senza server, compilato
in `docs/` e servito da GitHub Pages.

| # | Sezione | Stato | Cosa fa |
|---|---|---|---|
| 1 | Panoramica | Completa | Indicatori chiave con intervallo, segnalazioni attive, data dei dati, classifica |
| 2 | Simulatore | Completa | Importo, sostituzione, R1/R2/R3, tipo di deposito, variante del credito; fascia di incertezza; due grafici per paese e tabella |
| 3 | Mappa d'Europa | Completa | Coropletica con scelta dell'indicatore, collegata allo scenario; clic su un paese apre la scheda |
| 4 | Scheda paese | Completa | Composizione della raccolta dal 2003, posizione nel tempo, componenti, effetto di ogni scenario, quadrante |
| 5 | Mappa a due canali | Completa | Depositi a vista contro raccolta in dollari, quattro quadranti selezionabili, tabella |
| 6 | Monitor settimanale | Completa | Quattro serie, volumi assoluti, segnalazioni, storico lungo, scelta del periodo |
| 7 | Stima del livello | Completa | Fasce dell'indagine BCE, ipotesi modificabili, confronto con l'ESM nel tempo |
| 8 | Confronto ed esportazione | Completa | Due scenari affiancati, CSV di ogni tabella, rapporto stampabile |
| 9 | Metodo e dati | Completa | Fonti con stato e data, coefficienti con origine, limiti, metodi scartati |

Per tutta l'applicazione: navigazione laterale (in alto sotto gli 860 pixel), tema chiaro
e scuro, indirizzi che conservano lo scenario (per esempio
`#/simulatore?imp=300&sost=50&reg=R3&dep=T2&cred=continua`), ogni grafico con titolo,
unità, fonte e valori al passaggio del mouse, avvertenze accanto ai numeri a cui si
riferiscono. Gli screenshot di ogni sezione, a 1280 e a 390 pixel, sono in
`reports/figures/app/`.

### La fascia di incertezza del simulatore

Combina tre incertezze, nei due versi:

- il livello: l'importo scelto viene scalato come l'intervallo della stima (8,9 e 23,1
  su un centro di 15,4);
- la quota finanziata con depositi bancari: dal 50% al 100%;
- per il credito, i coefficienti basso e alto.

Non è un intervallo di confidenza: è l'insieme dei risultati che si ottengono spingendo
tutte le ipotesi dalla stessa parte. L'applicazione lo dice accanto alla fascia.

## 4. Verifica

| Controllo | Come | Esito |
|---|---|---|
| I calcoli dell'applicazione coincidono con gli script | `tests/make_app_fixtures.py` calcola con i moduli 4 e 5 nove scenari (tre per ciascuna regola R1, R2, R3: importi, sostituzione e tipi di deposito diversi); `web/tests/model.test.ts` confronta per ogni paese deflusso, depositi persi, effetto sulla raccolta, raccolta all'ingrosso e le cinque varianti del credito, più la stima del livello | 16 test su 16 |
| Ogni sezione si carica senza errori in console | `web/tests/e2e.mjs`: Chrome, a 1280 e a 390 pixel | 9 sezioni su 9, 0 errori |
| Nessuno sbordo orizzontale a 390 pixel | Stesso script: larghezza del contenuto contro larghezza della finestra | 0 pixel in tutte le sezioni |
| Lo scenario si conserva nell'indirizzo | Stesso script: apre un indirizzo con scenario, legge comandi e risultato, cambia sezione | Superato |
| Test del motore e dello strato dati | `tests/test_program.py` | 13 test su 13 |

Il primo giro dei test nel browser ha trovato un errore in console nella Panoramica:
mancava l'icona del sito e il browser registrava una risposta 404. Aggiunta l'icona.

## 5. Aggiornamento automatico

`.github/workflows/weekly-update.yml`: ogni lunedì alle 06:00 UTC, o a mano. Esegue
`run_all.py`, i test Python (che includono il confronto tra applicazione e script),
compila l'applicazione, esegue i test nel browser, e solo se passano committa dati e
applicazione e chiede a GitHub Pages di ripubblicare. Se un modulo fallisce
l'aggiornamento prosegue con l'ultimo dato valido; se falliscono i test non viene
pubblicato nulla.

**Stato al 2026-11-25: in funzione.** Il primo caricamento era stato rifiutato da GitHub
perché l'accesso usato non aveva il permesso `workflow`; concesso il permesso, la Action
è stata caricata e avviata a mano.

Prima esecuzione ([run 45646686279](https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure/actions/runs/45646686279)), durata 5 minuti:

| Passo | Esito |
|---|---|
| Aggiornamento dei dati | Completo: tutti i moduli riusciti, nessuna fonte ferma |
| Test dei calcoli e dello strato dati | 13 su 13, compresi il confronto tra applicazione e script e la riproducibilità (su Linux, con dati prodotti lì) |
| Compilazione dell'applicazione | Riuscita |
| Test nel browser | 9 sezioni su 9, 0 errori in console, 0 pixel di sbordo a 390 pixel |
| Pubblicazione | Commit automatico `0b711f2`, 67 file |
| Ricostruzione del sito | Richiesta e completata; il sito mostra i dati di questa esecuzione |

Il caso della fonte che fallisce del tutto è stato verificato in locale: con il modulo 2
marcato come fallito, `meta.json` porta l'avviso "Fonti non aggiornate nell'ultima
esecuzione, mostrate con l'ultimo dato valido" e la fonte con la data dell'ultimo dato.

**Una fonte non risponde dai server di GitHub: Bybit.** Dalle macchine di GitHub le sue
cinque coppie ricevono "403 Forbidden"; dal computer locale rispondono. Conseguenze:

- per le settimane già scaricate restano i dati di Bybit presenti nel repository;
- per le settimane nuove calcolate dalla Action Bybit mancherà. Pesa lo 0,9% dei volumi
  totali dell'indice nelle ultime quattro settimane, ma è in crescita: 1,8% nell'ultima.
  La regola trattiene una settimana quando gli exchange mancanti pesavano in media più
  del 2% nelle quattro precedenti: oggi Bybit è sotto, quindi la settimana viene
  pubblicata senza. Bybit quota soprattutto coppie contro euro (fino al 2,5% dei volumi
  contro euro), perciò la quota EUR pubblicata dalla Action sarà leggermente più bassa
  di quella di un'esecuzione locale. Se il suo peso medio supera il 2%, le settimane
  nuove verranno trattenute e l'indice resterà fermo all'ultima valida, segnalandolo;
- l'applicazione lo segnala: la fonte è marcata "aggiornata in parte", un avviso compare
  in cima a ogni pagina e accanto ai grafici del monitor settimanale, e "Metodo e dati"
  elenca le coppie senza risposta. Le coppie che non hanno mai dato dati (Bitget
  RONUSDT) sono elencate a parte e non fanno scattare l'avviso.

Non è stato aggirato il blocco. Rimedi possibili, non applicati: eseguire
l'aggiornamento da un computer in Europa, oppure togliere Bybit dall'indice per tutta la
serie, così che locale e automatico coincidano.

Resta non osservata l'esecuzione pianificata del lunedì: finora la Action è partita solo
a mano. GitHub sospende le esecuzioni pianificate dopo 60 giorni senza attività nel
repository.

## 6. Scelte tecniche

- **Indirizzi con il cancelletto** (`#/sezione?parametri`). GitHub Pages non riscrive gli
  indirizzi: con il cancelletto ogni indirizzo si apre direttamente, senza server.
- **Compilazione in `docs/` nel ramo principale.** È la configurazione di GitHub Pages
  già in uso: nessuna impostazione del repository da cambiare.
- **Un solo modulo per i calcoli** (`web/src/lib/model.ts`), senza dipendenze
  dall'interfaccia: è quello che i test confrontano con Python.
- **Dati letti all'avvio, schede paese su richiesta.** L'avvio carica tre file; le serie
  storiche di un paese si scaricano solo aprendo la sua scheda.
- **Confini nel repository.** La mappa non dipende da GISCO al momento dell'uso; i
  poligoni sono ridotti all'Europa e arrotondati a tre decimali (circa 100 metri).
- **Chrome già installato per i test nel browser** (`playwright-core`), invece di
  scaricare un browser apposito.
- **CSV con punto e virgola e virgola decimale**: si aprono direttamente in un foglio di
  calcolo italiano.

## 7. Limiti e cose non fatte

- L'applicazione compilata è un solo file JavaScript di circa 850 kB (280 kB compressi):
  non è stato diviso per sezione.
- La grafica è essenziale, come richiesto; non è stata curata l'estetica.
- Il rapporto stampabile copre lo scenario A, non il confronto A-B.
- I confini a scala 1:20 milioni rendono Malta e Lussemburgo molto piccoli sulla mappa:
  i loro valori si leggono nella tabella accanto.
- L'ipotesi ESM compare con due valori vicini: 16,7 miliardi di euro nella stima del
  livello (cambio corrente) e 16,1 tra i livelli predefiniti del simulatore (cambio di
  fine settembre, quello dei bilanci). È dichiarato ma può confondere.
- I test nel browser verificano caricamento, console, larghezza e indirizzi, non la
  correttezza visiva di ogni grafico: quella è stata controllata a vista sugli screenshot.

---

**Cosa aggiunge questo al programma finale**: trasforma i risultati dei moduli in uno
strumento che un analista apre da un indirizzo, senza installare nulla: sceglie uno
scenario, vede l'effetto su depositi, raccolta e credito per ogni paese con la sua
fascia di incertezza, lo confronta con un altro, lo esporta e lo condivide; e i dati si
aggiornano da soli ogni settimana.
