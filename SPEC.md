# SPEC - euro-stablecoin-exposure

Documento di riferimento del progetto. Va riletto all'inizio di ogni sessione di lavoro,
prima di scrivere codice o report. Ogni modifica a obiettivo, moduli o criteri passa da
qui e viene annotata nel registro in fondo.

Ultimo aggiornamento: 2026-11-26 (prompt 8).

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
- **Fonti**: candele giornaliere pubbliche di 24 exchange (`src/exchange_fetch.py`);
  erano 25 fino al 2026-11-25, quando Bybit è stato escluso per tutto lo storico.
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
  scuro, utilizzabile da 390 pixel. Nove sezioni (dieci dal prompt 6, con "Banche"; dal
  prompt 6 in inglese e italiano, e con i testi fuori dai file di dati): panoramica, simulatore, mappa d'Europa,
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
  che pesa lo 0,9% dei volumi (1,8% nell'ultima settimana); l'applicazione marca la fonte
  "aggiornata in parte" e mostra un avviso in cima a ogni pagina.

### Rifiniture, lingua e modulo 6 (2026-11-25, prompt 6)

Criteri e definizioni scritti prima di calcolare i risultati. Prima di scriverli è stata
verificata solo la disponibilità dei dati EBA (quali file, quali voci, quante banche).

- **Bybit fuori dall'indice del modulo 2.** Dai server di GitHub Bybit non risponde,
  quindi l'esecuzione automatica e quella locale davano indici diversi. Bybit esce dal
  pannello per tutte le serie e per tutto lo storico; i suoi dati già scaricati restano
  nell'archivio grezzo, non usati. Il pannello passa a 24 exchange (22 nell'indice
  lungo). La variazione si misura così, qualunque sia l'esito: per ciascuna delle
  quattro serie, sulle settimane dell'indice principale in cui Bybit ha dati, differenza
  tra indice senza e con Bybit in punti percentuali (media, massima in valore assoluto,
  ultima settimana comune), e numero di settimane in cui cambia lo stato della
  segnalazione. L'esclusione non dipende dal risultato.
- **Un solo cambio.** Tutto il programma converte dollari ed euro con un solo cambio:
  il cambio di riferimento BCE più recente alla data della circolazione (modulo 1). Il
  modulo 4 lo legge dal modulo 1. L'ipotesi ESM ha così un solo valore ovunque.
- **Applicazione, rifiniture.** Completate quando: (a) a 1280 pixel nessuna tabella ha
  colonne tagliate e sotto quella larghezza lo scorrimento è interno alla tabella con la
  prima colonna fissa, verificato da un test in ogni sezione; (b) l'avviso sulle fonti è
  un indicatore nella barra laterale con il dettaglio in "Metodo e dati", e ogni
  avvertenza di sezione è una riga con il testo completo espandibile, senza eliminarne
  nessuna; (c) la mappa ha riquadri ingranditi per Malta, Lussemburgo e Cipro; (d) il
  rapporto stampabile esiste anche per il confronto tra due scenari; (e) il codice è
  diviso per sezione e l'avvio carica solo la sezione aperta.
- **Lingua.** Inglese come lingua principale, italiano selezionabile, scelta conservata
  nell'indirizzo (`lang=it`). Tutti i testi stanno in file di traduzione separati
  (`web/src/i18n/`; per i testi che vengono da questo documento, `src/i18n/`). Numeri e
  date seguono la lingua. Un test verifica che non restino stringhe non tradotte.
- **Stato**: tutto applicato il 2026-11-25 (`reports/12_rifiniture_lingua_banche.md`).
  Senza Bybit l'indice è in media 0,40 punti più basso per USDT e 0,12 per USDC
  (massimo 4,5 punti, settimana del 1° giugno 2026; ultima settimana -1,76 e -0,58);
  cambia lo stato di una segnalazione. Cambio unico: 1,0935 dollari per euro; l'ipotesi
  ESM vale 16,7 miliardi di euro ovunque. L'applicazione ha dieci sezioni, con "Banche".

### Modulo 6 - Singole banche (aggiunto il 2026-11-25, prompt 6)

- **Risultato per l'analista**: una classifica e uno scenario per banca. Per ogni banca
  dell'area euro presente nell'esercizio di trasparenza dell'EBA: quota retail,
  posizione rispetto al 75° percentile tra banche, raccolta all'ingrosso, ed effetto
  dello scenario del simulatore su depositi e credito.
- **Fonte**: EBA, esercizio di trasparenza 2025 (pubblicato il 4 dicembre 2025, ultimo
  disponibile), database completo in CSV, gratuito. Dati al 30 giugno 2025, al massimo
  livello di consolidamento. Sono dati pubblici per banca, non dati di vigilanza
  riservati.
- **Criterio di sufficienza, fissato prima**: i dati EBA bastano se, tra le banche con
  sede nei 21 paesi dell'area euro, almeno 50 hanno tutte le voci necessarie (depositi
  di famiglie, imprese, altre società finanziarie e banche; titoli emessi; totale
  attivo; prestiti a famiglie e imprese) e coprono almeno 15 paesi. Altrimenti si
  passa alle statistiche di vigilanza aggregate della BCE per modello di business, e la
  sezione dell'applicazione mostra i modelli di business invece delle banche.
- **Definizioni** (le stesse del modulo 5, portate a livello di banca):
  - quota retail = depositi delle famiglie / (depositi delle famiglie + depositi di
    società finanziarie diverse dalle banche), come nel Working Paper BCE 3199;
  - alta quota retail = sopra il 75° percentile della quota retail tra le banche
    dell'area euro del campione, non ponderato;
  - raccolta all'ingrosso = depositi da banche più titoli di debito emessi, sul totale
    dell'attivo;
  - scenario: ogni banca perde la stessa quota di depositi che lo scenario assegna al
    suo paese (deflusso della banca = quota persa nel paese × depositi della banca nella
    categoria scelta: a vista di famiglie e imprese, a vista delle famiglie, o tutti);
  - credito: deflusso in deviazioni standard = 100 × deflusso / totale attivo / 0,8;
    prestiti in meno = coefficiente × deviazioni standard / 100 × prestiti a famiglie e
    imprese, con coefficiente alto (3,089) sopra la soglia e basso (0,441) sotto.
- **Confronto con il modulo 5**, definito prima: per ogni paese, prestiti in meno per
  euro di deflusso calcolati banca per banca (somma dei prestiti in meno / somma dei
  deflussi delle banche del paese) contro le varianti del modulo 5 (bassa, alta, a
  soglia, continua, uniforme). Scenario di controllo: livello centrale, regola R1,
  depositi a vista di famiglie e imprese, sostituzione piena.
- **Copertura**: per ogni paese, totale attivo delle banche del campione sul totale
  attivo delle istituzioni finanziarie monetarie del paese (BSI, giugno 2025). I
  perimetri sono diversi (gruppo consolidato con le controllate estere contro residenti
  non consolidati): il rapporto può superare il 100% e va letto come ordine di
  grandezza. Se i dati bancari consolidati della BCE sono scaricabili, si aggiunge il
  rapporto sul totale attivo consolidato.
- **Esposizioni in dollari**: l'esercizio EBA non ha scomposizione per valuta. Si
  riportano, se presenti, le esposizioni creditizie verso controparti statunitensi, che
  non sono la stessa cosa.
- **Avvertenze obbligatorie**: dati pubblici per banca, non dati di vigilanza; l'ordine
  non è un giudizio sulla solidità; bilanci consolidati che comprendono attività fuori
  dall'area euro; data dei dati diversa da quella dei bilanci nazionali.
- **Stato**: completato il 2026-11-25 (`reports/12_rifiniture_lingua_banche.md`,
  `src/module6_banks.py`). Criterio di sufficienza soddisfatto: 85 banche con tutte le
  voci su 99, in 18 paesi (mancano Bulgaria, Croazia e Slovacchia). Soglia di quota
  retail tra banche 94,4%, 21 banche sopra. Copertura: 61% dell'attivo delle banche
  residenti, 69% di quello consolidato. Nei paesi coperti i coefficienti applicati banca
  per banca danno 0,45 euro di prestiti in meno per euro di deflusso, contro 0,18 della
  variante a soglia del modulo 5, 0,25 della continua e 0,50 della regola uniforme.
  Nessuna esposizione in dollari nei dati. La variante continua per banca non è
  calcolata: gli ancoraggi tra banche non erano definiti prima dei risultati.

### Estetica e identità (2026-11-26, prompt 7)

In questo prompt non cambia nessun calcolo: moduli, strato dati e modello
dell'applicazione restano quelli del prompt 6, e tutti i test esistenti devono restare
verdi. Cambia solo la presentazione. Criteri scritti prima del lavoro.

- **Nome**: "Euro Stablecoin Exposure Monitor". Nessun logo, colore o marchio della BCE o
  di altre istituzioni. In fondo a ogni pagina: "Progetto universitario, non affiliato
  alla BCE".
- **Sistema grafico in un unico file** (`web/src/styles/tokens.css`): colori, tipografia
  (un carattere per i titoli, uno per testo e numeri, cifre tabulari), spaziature,
  raggi, ombre, stati. Direzione: istituzionale, sobria, blu profondo con un solo colore
  d'accento; tema scuro allo stesso livello. Un tema unico per i grafici, letto dagli
  stessi token: palette per serie, palette sequenziale per la mappa, griglie leggere,
  etichette dirette al posto delle legende dove possibile; le serie si distinguono
  anche per tratto o forma, non solo per colore.
- **Pagine nuove**: pagina iniziale con una frase su cosa fa il programma, tre risultati
  generati dai dati correnti (livello stimato, paesi più esposti per ciascun canale,
  effetto dello scenario alto), mappa d'anteprima e ingressi agli strumenti; pagina
  "About" con scopo, autori (segnaposto), fonti e licenze.
- **Sezioni**: un risultato principale in evidenza per sezione; comandi dello scenario
  in un pannello stabile; tabella delle banche con paginazione; mappa con proiezione
  equivalente, legenda a classi e paese selezionato in evidenza; rapporto stampabile di
  due pagine con intestazione, data dei dati e scenario; navigazione mobile dedicata.
- **Completato quando**: (a) tutti i test del prompt 6 passano, con le sole modifiche
  rese necessarie dalle nuove pagine e dalla paginazione, elencate nel report; (b) un
  controllo automatico verifica il contrasto AA (4,5:1 per il testo, 3:1 per testo
  grande ed elementi grafici) sui token dei due temi e sul testo reso in ogni pagina;
  (c) ogni pagina si usa da tastiera con fuoco visibile, ogni grafico ha un testo
  alternativo, e con la preferenza di riduzione del movimento non ci sono animazioni;
  (d) esistono screenshot prima e dopo di ogni sezione a 1280 e 390 pixel nei due temi
  (`reports/figures/app/before`, `after`), e ogni screenshot "dopo" è stato guardato;
  (e) il peso delle pagine è riportato prima e dopo.
- **Stato**: completato il 2026-11-26 (`reports/13_estetica_e_identita.md`). Criteri da
  (a) a (e) soddisfatti. Blu profondo `#163b6e` con accento rame `#a8481f`; Source Serif
  4 per i titoli, Inter per testo e numeri. Dodici pagine: le dieci sezioni, la pagina
  iniziale e About. Le sezioni sono state ridisegnate da dieci agenti in parallelo, uno
  per sezione, poi uniformate. Le pagine pesano circa 90 kB compressi in più, per i
  caratteri. Autori e licenza del codice restano da compilare.

### Chiusura e versione 1.0 (2026-11-26, prompt 8)

Nessun calcolo cambia e tutti i test restano verdi. Criteri scritti prima del lavoro.

- **Correzioni**: (1) l'indirizzo senza sezione apre la pagina iniziale; (2) il primo
  disegno di ogni grafico è completo e immediato, senza animazione, anche con la scheda
  in secondo piano, in stampa o in una cattura, e un test confronta per ogni pagina i
  punti disegnati con i punti dei dati dopo tre secondi, a scheda visibile e non; (3) la
  mappa si apre con il paese dal valore più alto già selezionato; (4) le avvertenze
  stanno sotto il grafico o la tabella a cui si riferiscono, in stile neutro, e resta
  gialla solo una segnalazione attiva, senza eliminarne nessuna; (5) la pagina About
  riporta autori (segnaposto "[NOMI DA INSERIRE]"), corso e università.
- **Completamento**: (6) visita guidata in cinque passi (pagina iniziale, simulatore,
  mappa, banche, monitor), avviabile dalla pagina iniziale e saltabile; (7) README in
  inglese e nota metodologica di due pagine in inglese, scaricabile da "Method and
  data"; (8) esecuzione completa da un clone pulito seguendo solo il README; (9)
  verifica dell'aggiornamento pianificato, o istruzioni scritte per farla; (10)
  etichetta della versione 1.0 con note di rilascio.
- **Stato**: completato il 2026-11-26 (`reports/14_chiusura.md`). Punti da 1 a 8 e 10
  fatti; il clone pulito è riuscito senza correzioni. Punto 9: nessuna esecuzione
  pianificata è ancora partita, perché il workflow esiste dal 25 novembre; il primo
  lunedì utile è il 30 novembre 2026 e il README dice come controllarlo. Versione 1.0
  etichettata (`v1.0`).

### Aggiornamento e sintesi

Un solo comando aggiorna i moduli nell'ordine giusto e rigenera la pagina di sintesi e i
dati dell'applicazione:

    .venv/bin/python src/run_all.py

- Ordine: modulo 3, modulo 1, modulo 2, livello proprio, modulo 4, modulo 5, modulo 6,
  test del modulo 2, sintesi, dati dell'applicazione. Circa cinque minuti. Il modulo 6 usa
  l'estratto EBA già nel repository e non scarica nulla, salvo `--download`. L'applicazione si
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
| API pubbliche di 24 exchange (Binance, Kraken, Coinbase, Bitstamp, OKX, Upbit, Bithumb, Coinone, Korbit, BtcTurk, Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate, Bitget, MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso, Binance.US) | Modulo 2 | Gratis, senza chiave | Confermata. Storico: almeno dal 2023 per 17 exchange; Kraken solo dal 2024-12 (ultime 720 candele). Bybit escluso dal 2026-11-25: non risponde dai server di GitHub |
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
| EBA, esercizio di trasparenza 2025, database completo | Modulo 6: bilanci delle singole banche | Gratis, senza chiave; file CSV | Confermata: 99 banche dell'area euro, 85 con tutte le voci, 18 paesi; dati al 30 giugno 2025. Nessuna scomposizione per valuta |
| ECB Data Portal, dati bancari consolidati (CBD2) | Modulo 6: copertura del campione | Gratis, senza chiave | Confermata: totale attivo consolidato per paese, trimestrale |
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
- Il modulo 6 usa dati pubblici per banca, non dati di vigilanza riservati. L'ordine delle
  banche descrive la struttura della raccolta: non è un giudizio sulla solidità di
  nessuna banca né una previsione di deflussi.
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
| Esposizioni in dollari delle singole banche dai dati EBA | `reports/12_rifiniture_lingua_banche.md` | L'esercizio di trasparenza non ha scomposizione per valuta. Riportate al loro posto le esposizioni verso controparti statunitensi, che sono un'altra grandezza |
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
| 2026-11-25 | Prompt 6. Criteri fissati prima dei risultati: Bybit fuori dall'indice per tutto lo storico, con la misura della variazione; un solo cambio per tutto il programma; rifiniture dell'applicazione; inglese come lingua principale; modulo 6 sulle singole banche con i dati dell'esercizio di trasparenza EBA 2025 (verificata solo la disponibilità: 119 banche, dati al 30 giugno 2025, nessuna scomposizione per valuta) |
| 2026-11-25 | Prompt 6 completato (`reports/12_rifiniture_lingua_banche.md`): sette rifiniture applicate; indice senza Bybit (in media -0,40 punti per USDT, -0,12 per USDC); cambio unico; applicazione in inglese e italiano con 587 testi per lingua; modulo 6 con 85 banche in 18 paesi e sezione "Banche". Test: 22 Python, 31 dell'applicazione, browser su undici pagine nelle due lingue |
| 2026-11-25 | Aggiornamento automatico avviato a mano dopo il prompt 6: tutti i passi riusciti su GitHub (dati, 22 test, compilazione, test nel browser, pubblicazione). Indice calcolato su GitHub e indice calcolato in locale identici su 102 settimane; nessuna fonte aggiornata in parte. L'applicazione ora chiede sempre al server se i file di dati sono cambiati, per non mostrare dati vecchi dopo un aggiornamento |
| 2026-11-26 | Prompt 7. Criteri fissati prima del lavoro: nessun calcolo cambia; nome "Euro Stablecoin Exposure Monitor"; sistema grafico in un unico file; pagina iniziale e pagina About; ridisegno delle dieci sezioni; controlli di contrasto e accessibilità. Salvati gli screenshot "prima" (44, in `reports/figures/app/before`) |
| 2026-11-26 | Prompt 7 completato (`reports/13_estetica_e_identita.md`): sistema grafico in `web/src/styles/tokens.css`, nome "Euro Stablecoin Exposure Monitor", pagina iniziale con tre risultati generati dai dati, pagina About, dieci sezioni ridisegnate in parallelo e uniformate, rapporto stampabile di due pagine, navigazione mobile. Nessun calcolo cambiato. Test: 22 Python, 42 dell'applicazione (10 nuovi sul contrasto), browser su 13 pagine nelle due lingue e nei due temi |
| 2026-11-26 | Aggiornamento automatico avviato a mano dopo il prompt 7. Prima esecuzione: fallito un controllo del test nel browser (chiusura del menu mobile, per una questione di tempi sui server di GitHub), quindi niente pubblicazione da parte dell'Action, come previsto. Corretti il menu, che ora si chiude subito al clic, e il test. Seconda esecuzione: tutti i passi riusciti |
| 2026-11-26 | Prompt 8. Criteri fissati prima del lavoro: cinque correzioni (indirizzo, primo disegno dei grafici, selezione sulla mappa, avvertenze neutre sotto grafici e tabelle, About), visita guidata, README e nota metodologica in inglese, clone pulito, verifica dell'aggiornamento pianificato, versione 1.0 |
| 2026-11-26 | Prompt 8 completato (`reports/14_chiusura.md`) e versione 1.0 etichettata: pagina iniziale come indirizzo predefinito; grafici completi al primo disegno, con un test che confronta punti disegnati e punti dei dati a scheda visibile e in secondo piano; mappa con selezione iniziale; 33 avvertenze in stile neutro sotto grafici e tabelle; visita guidata in cinque passi; README e nota metodologica in inglese; clone pulito riuscito seguendo solo il README. Aggiornamento pianificato da verificare lunedì 30 novembre 2026 |
| 2026-11-26 | Aggiornamento automatico avviato a mano dopo la versione 1.0: tutti i passi riusciti su GitHub, compresi la generazione della nota metodologica e i nuovi controlli sui grafici |
