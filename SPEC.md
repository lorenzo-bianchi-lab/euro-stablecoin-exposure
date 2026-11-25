# SPEC - euro-stablecoin-exposure

Documento di riferimento del progetto. Va riletto all'inizio di ogni sessione di lavoro,
prima di scrivere codice o report. Ogni modifica a obiettivo, moduli o criteri passa da
qui e viene annotata nel registro in fondo.

Ultimo aggiornamento: 2026-11-25 (prompt 5).

## 0. Obiettivo non negoziabile

Il prodotto finale è un programma utile, potente e innovativo per la BCE, non una
raccolta di report prudenti. **È un'applicazione web completa**, non una pagina di
sintesi: statica, senza server, pubblicata su GitHub Pages, con tutti i calcoli di
scenario eseguiti nel browser. In questa fase conta il funzionamento: grafica pulita ma
essenziale.

- Ogni modulo deve produrre un risultato che un analista della BCE possa usare: un
  numero, una classifica, uno scenario.
- Dichiarare i limiti è obbligatorio, ma non sostituisce il risultato.
- Se un metodo fallisce, si propone e si prova subito un'alternativa.
- Ogni report termina con la riga "Cosa aggiunge questo al programma finale".

Questa sezione prevale sulle altre in caso di dubbio su quanto spingersi. Non prevale
sulla sezione 4 né sulla regola di non inventare dati: un risultato utile è un risultato
vero, con il suo perimetro dichiarato.

## 1. Obiettivo

Progetto universitario (ESCP, economia e finanza) destinato alla BCE. Riferimento:
ECB Working Paper n. 3199, "Stablecoins and monetary policy transmission" (marzo 2026).

Obiettivo iniziale, **abbandonato**: stimare quanta parte delle stablecoin in dollari
(USDT, USDC) è detenuta da residenti dell'area euro. I test 00 e 01 hanno mostrato che
con dati gratuiti non è stimabile.

Obiettivo attuale: costruire uno strumento descrittivo che, dato un livello di adozione
delle stablecoin in dollari preso da fonti esterne o ipotizzato, mostri

- come si muove nel tempo l'attività in stablecoin contro euro rispetto alle altre valute;
- quali sistemi bancari nazionali dell'area euro hanno una raccolta più esposta a una
  sostituzione dei depositi;
- quanto cambierebbe la raccolta di ciascun paese sotto diversi livelli di adozione.

## 2. I moduli

### Modulo 1 - Livello (da fonti esterne, non stimato)

- **Risultato per l'analista**: un numero. Il valore in dollari e in euro delle
  stablecoin in dollari attribuibile all'area euro secondo le ipotesi esterne, aggiornato
  alla circolazione corrente (circolazione mondiale × 7,5% nello scenario di base, × 15%
  nello scenario alto), affiancato dalla diffusione tra i consumatori.
- **Cosa fa**: riporta i riferimenti esterni sul livello di adozione nell'area euro, con
  la definizione esatta di ciascuno, e li applica alla circolazione corrente. Non stima
  quote proprie.
- **Fonti**: riquadro del Bollettino economico BCE 7/2026 (5% dei consumatori dichiara di
  possedere stablecoin, agosto 2025, indagine CES in 11 paesi); ESM Working Paper 79
  (7,5% della circolazione di stablecoin in dollari assunto in mano a famiglie dell'area
  euro, 19 miliardi di dollari al terzo trimestre 2025; 15% nello scenario alto).
- **Avvertenza**: le due cifre non misurano la stessa cosa. Quella BCE è una diffusione
  tra i consumatori, quella ESM è un'ipotesi di calibrazione. Nessuna delle due è una
  misura del valore detenuto.
- **Completato quando**: (a) esiste una tabella con, per ogni riferimento, valore,
  grandezza misurata, periodo, campione, pagina e link, e ogni valore è stato riletto
  sull'originale (fatto in `reports/02_benchmark_e_modulo3.md`, parte A); (b) uno script
  scarica la circolazione corrente di USDT e USDC da una fonte gratuita verificata e
  produce il livello nei due scenari, con data; (c) il risultato è etichettato come
  applicazione di un'ipotesi esterna, non come stima.
- **Stato**: completato il 2026-11-24 (`reports/06_modulo1_livello.md`,
  `src/module1_level.py`). La base a cui si applicano le quote è USDT più USDC, la
  stessa dell'ESM (verificato: 247,8 contro 248 miliardi al 30 settembre 2025).
  Circolazione da DefiLlama, controllata con CoinGecko. Il livello alimenta il modulo 4.

### Modulo 2 - Andamento (indice settimanale)

- **Risultato per l'analista**: un numero per settimana e la sua variazione. Quattro
  serie storiche aggiornabili con un comando, più l'ultimo valore e lo scarto dalla media.
- **Cosa fa**: indice settimanale della quota EUR dei volumi spot stablecoin/fiat sugli
  exchange centralizzati (ex proxy 1). Quattro serie: USDT e USDC, ciascuna con e senza
  Coinbase.
- **Perché senza Coinbase**: su Coinbase USDC si converte in dollari fuori dal book,
  quindi la sua quota EUR è gonfiata.
- **Fonti**: candele giornaliere pubbliche di 25 exchange (`src/exchange_fetch.py`).
- **Completato quando**: (a) uno script produce le quattro serie settimanali per tutto
  lo storico che le API gratuite restituiscono, con il periodo effettivo dichiarato;
  (b) per ogni settimana è registrato quali exchange hanno contribuito; (c) il pannello
  di exchange è fisso oppure ogni ingresso e uscita è documentato; (d) una seconda
  esecuzione riproduce gli stessi valori per le settimane già chiuse; (e) il report
  dichiara che l'indice misura trading in euro, non detenzioni né residenza.
- **Stato**: completato il 2026-11-24 (`reports/03_modulo2_indice.md`, `src/module2_index.py`).
  Indice principale su 102 settimane dal 2024-12-09; indice lungo su 203 settimane dal
  2023-01-02 senza Kraken e Gemini. Lo storico cresce a ogni aggiornamento settimanale.
- **Limite noto**: il pannello contiene solo le coppie quotate il 2026-11-23; quelle
  eliminate prima mancano dallo storico.

### Modulo 3 - Vulnerabilità (struttura della raccolta bancaria per paese)

- **Risultato per l'analista**: una classifica. I paesi dell'area euro ordinati per
  esposizione strutturale della raccolta a una sostituzione dei depositi, con le
  componenti che spiegano la posizione di ciascuno e la sua evoluzione nel tempo.
- **Cosa fa**: descrive, per ciascuno dei 21 paesi dell'area euro e per mese, com'è
  composta la raccolta delle banche: depositi a vista e totali di famiglie e imprese,
  depositi interbancari, titoli di debito emessi, passività verso l'estero, capitale.
  Aggiunge, per i paesi coperti, la quota di passività in valuta estera e in dollari.
- **Fonti**: ECB Data Portal, dataset BSI, 12 serie confermate (`src/ecb_bsi_probe.py`);
  statistiche bancarie territoriali della BRI per le passività in valuta estera
  (`src/bis_lbs_probe.py`). Elenco in `reports/02_benchmark_e_modulo3.md`, parte B.
- **Limite noto**: le passività in valuta estera sono trimestrali e coprono 13 paesi su
  21 (mancano BG, EE, HR, LT, LV, MT, SI, SK, che non dichiarano alla BRI).
- **Stato**: completato il 2026-11-24 (`reports/04_modulo3_classifica.md`,
  `src/module3_ranking.py`). Indicatore: 0,50 z(C1) + 0,25 z(C2) + 0,25 z(C3), con
  C1 = depositi a vista di famiglie e imprese sul passivo, C2 = quota a vista dei
  depositi della clientela, C3 = dipendenza dai depositi rispetto alla raccolta
  all'ingrosso. La raccolta in dollari resta una seconda mappa, non una componente.
- **Completato quando**: (a) esiste una tabella paese per mese con le quote di
  composizione della raccolta, calcolate con formule scritte nel report; (b) le quote
  sommano al totale del passivo entro una tolleranza dichiarata, o lo scarto è spiegato;
  (c) la classifica è prodotta da un indicatore con componenti e pesi scritti e motivati
  prima di guardare l'ordine dei paesi, e accompagnata da almeno una pesatura
  alternativa per mostrare quanto l'ordine è stabile; (d) il report dichiara che la
  classifica ordina la struttura della raccolta, non la probabilità di deflusso.

### Modulo 4 - Scenari (effetto sulla raccolta per paese)

- **Risultato per l'analista**: uno scenario. Per ogni livello di adozione, la variazione
  della raccolta di ciascun paese in miliardi di euro e in punti percentuali, e quanta
  raccolta all'ingrosso servirebbe per compensarla.
- **Cosa fa**: calcolo contabile di quanto cambierebbe la raccolta di ciascun paese per
  diversi livelli di adozione, usando i livelli del modulo 1 come punti di partenza e la
  struttura del modulo 3 come base.
- **Completato quando**: (a) ogni scenario è definito da parametri espliciti scritti
  prima di calcolare i risultati; (b) la regola con cui il deflusso è ripartito tra
  paesi e tra tipi di deposito è dichiarata, con almeno una regola alternativa di
  confronto; (c) i risultati sono presentati come esercizio meccanico, con la
  sensibilità ai parametri; (d) il codice riproduce le tabelle del report.
- **Stato**: completato il 2026-11-24 (`reports/05_modulo4_scenari.md`,
  `src/module4_scenarios.py`). Scenari ESM da 19 a 600 miliardi di dollari; ripartizione
  tra paesi pro quota sui depositi a vista (R1) o pro capite (R2); lo script accetta
  anche un importo libero, che sarà il livello prodotto dal modulo 1.

### Modulo 5 - Credito e trasmissione (aggiunto il 2026-11-25)

- **Risultato per l'analista**: un numero e una mappa. Per ogni scenario e paese del
  modulo 4, i prestiti in meno a famiglie e imprese in miliardi e in percentuale, con un
  intervallo; e la collocazione di ogni paese su due canali, depositi a vista e raccolta
  in dollari, con ciò che ciascun quadrante implica per la trasmissione.
- **Cosa fa**: applica ai deflussi del modulo 4 i coefficienti pubblicati nel Working
  Paper BCE 3199, trascritti e verificati sull'originale. Non stima nulla di proprio.
- **Avvertenza obbligatoria**: sono coefficienti stimati su singole banche e applicati
  ad aggregati nazionali. Danno ordini di grandezza, non previsioni.
- **Completato quando**: (a) i coefficienti sono in una tabella con sezione e tabella di
  origine, verificati sul PDF; (b) soglie e regole di applicazione sono scritte prima
  dei risultati (`reports/07_modulo5_credito.md`, sezione 2); (c) per ogni scenario e
  paese esistono prestiti in meno con intervallo, variante a soglia e variante uniforme;
  (d) la mappa a due canali copre i 21 paesi o dichiara quali mancano e perché.
- **Stato**: completato il 2026-11-25 (`reports/07_modulo5_credito.md`,
  `src/module5_credit.py`). Soglia di quota retail: 75° percentile tra i paesi (92,4%),
  cinque paesi sopra. Mappa: 13 paesi con dati BRI, 8 con la scomposizione trimestrale
  per valuta del BSI.

### Estensioni dei moduli 1, 2 e 4 (aggiunte il 2026-11-25)

- **Modulo 1, livello proprio**: tre stime indipendenti del valore detenuto dai residenti
  (B1 dal basso con l'indagine BCE; B2 dalle riserve dei clienti degli exchange; B3 da
  dati nazionali). Criterio fissato prima: se almeno due delle tre stime centrali stanno
  entro un fattore 3, il modulo 1 pubblica un intervallo proprio accanto all'ipotesi
  ESM; altrimenti pubblica il minimo di B1. Metodo in `reports/08_livello_proprio.md`.
  **Esito del 2026-11-25: criterio non soddisfatto.** B1 = 15,4 miliardi di euro, B3 =
  0,9, B2 senza numero. Il modulo 1 pubblica come proprio solo il minimo di B1, 8,9
  miliardi di euro, accanto all'ipotesi ESM.
- **Modulo 4, regola R3**: ripartizione tra paesi basata sulla quota di possessori di
  cripto-attività, se un'indagine la dà per almeno 15 paesi dell'area euro.
  **Esito: aggiunta.** Indagine SPACE 2024 della BCE, 20 paesi su 21 (Bulgaria imputata).
- **Modulo 2, collegamento e segnalazione**: test pre-registrato sul contenuto predittivo
  dei volumi stablecoin contro euro per i depositi a vista delle famiglie, riportato
  anche se nullo; regola di segnalazione esplicita sull'indice. Metodo in
  `reports/09_modulo2_segnale.md`. **Esito: test nullo** (p = 0,31; nessun miglioramento
  fuori campione). L'indice resta descrittivo; la regola di segnalazione è attiva.

### Cruscotto e test (aggiunti il 2026-11-25)

- **Cruscotto**: una pagina HTML unica (`docs/index.html`), generata da
  `src/dashboard.py`, senza server e senza dipendenze esterne, pubblicata con GitHub
  Pages. Cursore sull'importo detenuto, scelta della regola di ripartizione e del tasso
  di sostituzione; per paese mostra deflusso, raccolta all'ingrosso necessaria e credito
  in meno; mostra la mappa a due canali e l'indice settimanale.
- **Test automatici** (`tests/`): quadratura dei bilanci, linearità degli scenari,
  somma delle ripartizioni, riproducibilità senza rete.
- **Completato quando**: il cruscotto ricalcola nel browser gli stessi numeri degli
  script per almeno uno scenario di controllo, e tutti i test passano.
- **Stato**: completato il 2026-11-25 (`reports/10_cruscotto_e_test.md`), poi sostituito
  lo stesso giorno dall'applicazione descritta più sotto, allo stesso indirizzo.

### Correzioni al motore (2026-11-25, prompt 5)

- **Livello di riferimento.** Il livello di riferimento del programma è la stima propria
  dal basso (B1, variante famiglie): 15,4 miliardi di euro, intervallo 8,9 - 23,1.
  L'ipotesi ESM diventa il confronto. La variante individui è l'estremo superiore
  dichiarato. **Questa è una decisione presa dopo aver visto i risultati**: il criterio
  fissato nel report 08 non era soddisfatto e prevedeva di pubblicare solo il minimo.
  Il criterio non viene riscritto: resta agli atti, con il suo esito, e la decisione di
  superarlo è annotata qui e nel registro.
- **Credito.** Il valore in evidenza è la regola uniforme del Working Paper BCE 3199
  (0,5 euro di prestiti per euro di depositi), con l'intervallo tra coefficiente basso e
  alto. La variante a soglia resta come sensibilità. Si aggiunge una **variante
  continua**, definita prima di calcolarla:

      coefficiente(q) = basso + (alto - basso) × t,   t = (q - qL) / (qH - qL), limitato tra 0 e 1

  dove q è la quota retail del paese, qL la mediana della quota retail dei paesi sotto
  la soglia del 75° percentile e qH la mediana di quelli sopra. I due gruppi del paper
  diventano i due punti di ancoraggio e in mezzo si interpola, senza salto.
- **Riproducibilità.** Versioni delle librerie bloccate in `requirements.txt`; il test
  di riproducibilità confronta i valori con una tolleranza sull'ultima cifra decimale.
- **Stato**: applicate il 2026-11-25 (`reports/11_applicazione.md`). I numeri dei report
  07 e 08 restano fotografie di prima delle correzioni.

### Strato dati e applicazione (2026-11-25, prompt 5)

- **Strato dati**: `src/export_app_data.py` esporta tutti i risultati in file JSON
  versionati e documentati, uno per sezione, in `web/public/data/`, ciascuno con la data
  dei dati; `meta.json` riporta lo stato di ogni fonte. L'applicazione legge solo quei
  file. I confini dei 21 paesi vengono da Eurostat GISCO.
- **Aggiornamento automatico**: una GitHub Action esegue l'aggiornamento ogni lunedì,
  rigenera i dati e ripubblica. Se una fonte fallisce si tiene l'ultimo dato valido e
  l'applicazione lo segnala.
- **Applicazione** (`web/`, pubblicata da `docs/`): React, Vite, TypeScript, ECharts.
  Navigazione laterale, indirizzi condivisibili che conservano lo scenario, tema chiaro e
  scuro, utilizzabile da 390 pixel. Nove sezioni: panoramica, simulatore, mappa d'Europa,
  scheda paese, mappa a due canali, monitor settimanale, stima del livello, confronto ed
  esportazione, metodo e dati.
- **Completato quando**: (a) ogni sezione funziona e mostra accanto ai numeri le
  avvertenze che li riguardano; (b) i calcoli dell'applicazione coincidono con gli script
  Python su almeno tre scenari per ogni regola; (c) ogni sezione si carica senza errori
  in console; (d) nessuno sbordo orizzontale a 390 pixel; (e) esiste uno screenshot di
  ogni sezione in `reports/figures/app/`.
- Il cruscotto a pagina unica del 2026-11-25 (`src/dashboard.py`) è sostituito
  dall'applicazione.
- **Stato**: applicazione completata e pubblicata il 2026-11-25
  (`reports/11_applicazione.md`), criteri da (a) a (e) soddisfatti. Indirizzo:
  https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/
  L'aggiornamento automatico (`.github/workflows/aggiornamento.yml`) è in funzione dal
  2026-11-25: prima esecuzione, avviata a mano, riuscita in tutti i passi. Dai server di
  GitHub Bybit non risponde (403): le settimane nuove calcolate lì escono senza Bybit,
  che pesa lo 0,5% dei volumi; l'applicazione lo elenca in "Metodo e dati".

### Aggiornamento e sintesi

Un solo comando aggiorna i moduli nell'ordine giusto e rigenera la pagina di sintesi e i
dati dell'applicazione:

    .venv/bin/python src/run_all.py

- Ordine: modulo 3, modulo 1, modulo 2, livello proprio, modulo 4, modulo 5, test del
  modulo 2, sintesi, dati dell'applicazione. Circa sei minuti. L'applicazione si
  ricompila con `npm run build` in `web/`.
- `SINTESI.md` è generata da `src/summary.py` a partire dai file in `data/processed`:
  non si modifica a mano.
- Se una fonte non risponde, il modulo corrispondente fallisce senza toccare i dati
  esistenti, gli altri proseguono, la sintesi indica quali dati sono quelli precedenti e
  il comando esce con codice di errore.
- I report numerati sono fotografie alla data indicata. I file in `data/processed` e la
  sintesi riflettono l'ultimo aggiornamento.

## 3. Fonti dati confermate

| Fonte | Uso | Accesso | Stato |
|---|---|---|---|
| API pubbliche di 25 exchange (Binance, Kraken, Coinbase, Bitstamp, OKX, Bybit, Upbit, Bithumb, Coinone, Korbit, BtcTurk, Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate, Bitget, MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso, Binance.US) | Modulo 2 | Gratis, senza chiave | Confermata. Storico: almeno dal 2023 per 18 exchange; Kraken solo dal 2024-12 (ultime 720 candele) |
| CoinGecko, ticker a 24 ore | Controllo di copertura del modulo 2 | Gratis, senza chiave, solo istantanea | Confermata |
| ECB Data Portal, dataset BSI | Modulo 3 | Gratis, senza chiave | Confermata: 12 serie, 21 paesi (20 per i depositi da altre banche), mensile, fino a 2026-09 |
| DefiLlama, API delle stablecoin | Modulo 1: circolazione di USDT, USDC e totale | Gratis, senza chiave | Confermata; coincide con CoinGecko entro lo 0,4% |
| CoinGecko, `circulating_supply` | Modulo 1: controllo | Gratis, senza chiave | Confermata |
| Eurostat, famiglie (`lfst_hhnhtych`) | Modulo 1: controllo di coerenza | Gratis, senza chiave | Confermata: 21 paesi, 2025 |
| ECB Data Portal, BSI trimestrale per valuta | Modulo 5: passività in dollari degli otto paesi senza dati BRI | Gratis, senza chiave | Confermata: depositi in dollari di residenti per 21 paesi; altre componenti per 16-17 |
| BCE, indagine SPACE 2024, dati dei grafici | Regola R3: possessori di cripto-attività per paese | File pubblico | Verificata: 20 paesi su 21 |
| BCE, Bollettino 7/2026, grafico B riquadro b | Livello proprio B1 | Solo immagine | Percentuali misurate sull'immagine |
| OAM (Italia) e DNB (Paesi Bassi) | Livello proprio B3 | Documenti pubblici | Verificate; OAM non distingue le stablecoin |
| Proof of reserves degli exchange | Livello proprio B2 | Binance e KuCoin leggibili da script | Saldi letti; inutilizzabili senza la provenienza degli utenti |
| Eurostat, popolazione per età e famiglie | Livello proprio e regola R3 | Gratis, senza chiave | Confermata |
| Eurostat GISCO, confini dei paesi (Countries 2024, 1:20 milioni) | Applicazione: mappa d'Europa | Gratis, senza chiave; © EuroGeographics per i confini amministrativi | Confermata |
| BRI, statistiche bancarie territoriali (LBS) | Modulo 3: passività in valuta estera e in dollari | Gratis, senza chiave | Confermata: 4 serie, 13 paesi su 21, trimestrale, fino a 2026-Q2 |
| ECB Data Portal, tasso di cambio di riferimento (EXR) | Modulo 4: conversione degli importi in dollari | Gratis, senza chiave | Confermata |
| Eurostat, popolazione al 1° gennaio (`demo_pjan`) | Modulo 4: ripartizione pro capite | Gratis, senza chiave | Confermata: 21 paesi, 2025 |
| BCE, Bollettino economico 7/2026, riquadro sulle stablecoin | Modulo 1 | Pagina pubblica | Verificata sull'originale |
| ESM Working Paper 79 | Moduli 1 e 4 | PDF pubblico | Verificata sull'originale |
| ESMA, Kaiko, Chainalysis, IMF WP/25/141, Bruegel PB 09/2026 | Confronto | Pubblici | Verificate sugli originali |
| RPC pubblici Ethereum e Tron; etichette Dune Spellbook | Solo test 00 e 01 | Gratis, senza chiave | Non più usate |

Non disponibile: passività bancarie in valuta estera a frequenza mensile, e per otto
paesi dell'area euro a qualsiasi frequenza.

## 4. Cosa il programma NON promette

Tre impegni fissati il 2026-11-24 sono stati ridefiniti il 2026-11-25 su richiesta
esplicita. Restano veri nella forma qui sotto.

- **Nessuna misura della residenza.** Il programma non osserva quante stablecoin
  detengono i residenti dell'area euro. **Stima un intervallo** (ridefinito il
  2026-11-25, prompt 5): 8,9 - 23,1 miliardi di euro, centro 15,4, ricavato dall'indagine
  BCE sui consumatori con ipotesi dichiarate. È una stima da indagine, non una misura, e
  le altre due strade tentate non l'hanno confermata. Non produce stime per paese: la
  regola R3 ripartisce un totale, non misura le detenzioni nazionali.
- **Nessun effetto causale stimato dal programma.** Il modulo 5 non stima l'effetto
  delle stablecoin su credito e tassi: applica coefficienti pubblicati dal Working Paper
  BCE 3199, stimati su singole banche, ad aggregati nazionali. Sono ordini di grandezza.
- **Nessun "early warning" validato.** La regola di segnalazione del modulo 2 marca
  valori insoliti dell'indice. Non è un segnale anticipatore di deflussi, a meno che il
  test pre-registrato non mostri un contenuto predittivo; l'esito del test è riportato
  comunque.
- Nessuna previsione dell'adozione futura: gli scenari sono ipotesi.
- La classifica del modulo 3 ordina i paesi per struttura della raccolta. Non è una
  probabilità che i depositi escano né un giudizio sulla solidità delle banche.
- Nessuna copertura di OTC, P2P, finanza decentralizzata o reti diverse da quelle
  dichiarate in ciascun report.

## 5. Metodi scartati

| Metodo | Dove è stato provato | Motivo dello scarto |
|---|---|---|
| Stima della quota dell'area euro come livello | Test 00 e 01 | Nessuna proxy gratuita misura la residenza; le stime vanno dal 24% al 52% contro riferimenti esterni del 5% - 15% |
| Proxy 2: profilo orario dei trasferimenti on-chain | `reports/00_test_H1.md` | Su Ethereum l'86% - 90% dell'attività non ha ciclo giornaliero; la scomposizione assegna peso zero all'Asia; la fascia europea include Regno Unito, Africa, Medio Oriente, Turchia e Russia |
| Proxy 3: flussi verso exchange pesati per quota EUR | `reports/01_test_proxy3.md` | Esito 38,4%, sopra il tetto pre-registrato del 30%; Coinbase vale metà del risultato per un artefatto; etichette incomplete (Kraken e exchange coreani assenti); andamento dovuto al calo dei flussi etichettati di Binance |
| Proxy 1 usata come livello | `reports/00_test_H1.md` | Misura la quota di trading in euro, non le detenzioni; va dal 12% (USDT) al 50% (USDC). Resta in uso solo come andamento, nel modulo 2 |
| Chiave Dune per migliorare le etichette | `reports/01_test_proxy3.md` | La tabella di Dune usa le stesse liste pubbliche già provate |
| Dataset BSI per le passività in valuta estera | `reports/02_benchmark_e_modulo3.md` | La scomposizione per valuta non è pubblicata per depositi, titoli e totale del passivo. Sostituito dalle statistiche BRI |
| Dati bancari consolidati della BCE per le passività in valuta | `reports/07_modulo5_credito.md` | Il dataset ha la dimensione di valuta ma contiene solo il totale. Sostituito dal BSI trimestrale |
| B2: riserve dei clienti degli exchange ripartite per paese | `reports/08_livello_proprio.md` | Nessun indicatore gratuito e scaricabile della provenienza degli utenti |
| B3 come stima del livello | `reports/08_livello_proprio.md` | Le statistiche nazionali vedono solo i prestatori registrati nel paese: 17 volte sotto la stima dal basso |
| Indice del modulo 2 come anticipatore dei depositi | `reports/09_modulo2_segnale.md` | Test pre-registrato nullo: p = 0,31, nessun miglioramento fuori campione |
| Istantanea CoinGecko come serie storica | `reports/00_test_H1.md` | L'API gratuita restituisce solo le ultime 24 ore |

## 6. Regole di lavoro

- Non inventare e non simulare dati. Se una fonte non è raggiungibile, scriverlo.
- Criterio e metodo si committano prima di guardare i risultati e non si modificano dopo.
- Ogni cifra esterna va riletta sull'originale, con pagina o sezione.
- Le chiavi API stanno solo in `.env`, escluso da git. Nessun file di dati oltre 50 MB.
- Commit piccoli con messaggi chiari; push alla fine di ogni sessione.
- Ogni report dichiara i propri limiti e cosa non è stato possibile fare.
- Se un metodo fallisce, nello stesso report si propone e si prova un'alternativa: due
  righe sul motivo e si passa alla strada successiva.
- Ogni report termina con la riga "Cosa aggiunge questo al programma finale".

## 7. Registro

| Data | Evento |
|---|---|
| 2026-11-23 | Test H1 (`reports/00_test_H1.md`): R = 2,16, GO CON RISERVA |
| 2026-11-24 | Test proxy 3 (`reports/01_test_proxy3.md`): 38,4%, SOLO ANDAMENTO; proxy 2 e 3 scartate |
| 2026-11-24 | Progetto ridefinito in quattro moduli; benchmark verificati e serie BCE confermate (`reports/02_benchmark_e_modulo3.md`) |
| 2026-11-24 | Aggiunta la sezione 0 (obiettivo non negoziabile); ogni modulo ha ora un risultato dichiarato per l'analista; passività in valuta estera recuperate dalle statistiche BRI |
| 2026-11-24 | Modulo 2 completato (`reports/03_modulo2_indice.md`): indice settimanale in quattro serie, riproducibile |
| 2026-11-24 | Modulo 3 completato (`reports/04_modulo3_classifica.md`): classifica dei 21 paesi, stabile a cinque pesature |
| 2026-11-24 | Modulo 4 completato (`reports/05_modulo4_scenari.md`): scenari per paese, soglie e strumento con importo libero. Resta il modulo 1 |
| 2026-11-24 | Modulo 1 completato (`reports/06_modulo1_livello.md`): livello di base 16,7 miliardi di euro, alto 33,4. Tutti e quattro i moduli sono completi |
| 2026-11-24 | Aggiunti il comando unico `src/run_all.py` e la sintesi generata `SINTESI.md` |
| 2026-11-25 | Aggiunti il modulo 5 (credito e trasmissione), il livello proprio, la regola R3, il test e la segnalazione del modulo 2, il cruscotto e i test automatici. Ridefinite le tre non-promesse della sezione 4 |
| 2026-11-25 | Modulo 5 completato; livello proprio: criterio non soddisfatto, pubblicato il minimo di B1; regola R3 aggiunta; test del modulo 2 nullo; cruscotto pubblicato e test automatici superati |
| 2026-11-25 | Prompt 5. Sezione 0: il prodotto finale è un'applicazione web completa. Il livello di riferimento diventa la stima propria (15,4; 8,9 - 23,1), per decisione successiva ai risultati e in deroga al criterio del report 08, che resta agli atti. Credito: regola uniforme in evidenza, variante continua definita prima del calcolo. Aggiunti strato dati JSON, aggiornamento automatico e applicazione |
| 2026-11-25 | Applicazione completata (`reports/11_applicazione.md`): nove sezioni, strato dati in 29 file JSON, calcoli nel browser coincidenti con gli script su nove scenari, test nel browser superati. Aggiornamento automatico del lunedì scritto |
| 2026-11-25 | Aggiornamento automatico in funzione: prima esecuzione su GitHub riuscita (dati, 13 test, compilazione, test nel browser, pubblicazione). Bybit non risponde dai server di GitHub: annotato nel report 11 |
