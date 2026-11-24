# SPEC - euro-stablecoin-exposure

Documento di riferimento del progetto. Va riletto all'inizio di ogni sessione di lavoro,
prima di scrivere codice o report. Ogni modifica a obiettivo, moduli o criteri passa da
qui e viene annotata nel registro in fondo.

Ultimo aggiornamento: 2026-11-24.

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

## 2. I quattro moduli

### Modulo 1 - Livello (da fonti esterne, non stimato)

- **Cosa fa**: riporta i riferimenti esterni sul livello di adozione nell'area euro, con
  la definizione esatta di ciascuno. Non produce stime proprie.
- **Fonti**: riquadro del Bollettino economico BCE 7/2026 (5% dei consumatori dichiara di
  possedere stablecoin, agosto 2025, indagine CES in 11 paesi); ESM Working Paper 79
  (7,5% della circolazione di stablecoin in dollari assunto in mano a famiglie dell'area
  euro, 19 miliardi di dollari al terzo trimestre 2025; 15% nello scenario alto).
- **Avvertenza**: le due cifre non misurano la stessa cosa. Quella BCE è una diffusione
  tra i consumatori, quella ESM è un'ipotesi di calibrazione. Nessuna delle due è una
  misura del valore detenuto.
- **Completato quando**: esiste una tabella con, per ogni riferimento, valore, grandezza
  misurata, periodo, campione, pagina e link, e ogni valore è stato riletto
  sull'originale. Stato: fatto in `reports/02_benchmark_e_modulo3.md`, parte A.

### Modulo 2 - Andamento (indice settimanale)

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
- **Da verificare prima di iniziare**: la profondità dello storico exchange per exchange.

### Modulo 3 - Vulnerabilità (struttura della raccolta bancaria per paese)

- **Cosa fa**: descrive, per ciascuno dei 21 paesi dell'area euro e per mese, com'è
  composta la raccolta delle banche: depositi a vista e totali di famiglie e imprese,
  depositi interbancari, titoli di debito emessi, passività verso l'estero, capitale.
- **Fonti**: ECB Data Portal, dataset BSI, 12 serie confermate (`src/ecb_bsi_probe.py`,
  elenco in `reports/02_benchmark_e_modulo3.md`, parte B).
- **Limite noto**: le passività in valuta estera per paese non sono pubblicate a
  frequenza mensile. Il modulo le omette, salvo trovare una fonte alternativa verificata.
- **Completato quando**: (a) esiste una tabella paese per mese con le quote di
  composizione della raccolta, calcolate con formule scritte nel report; (b) le quote
  sommano al totale del passivo entro una tolleranza dichiarata, o lo scarto è spiegato;
  (c) ogni eventuale indicatore sintetico ha pesi motivati prima di guardare la
  classifica dei paesi; (d) il report dichiara che si tratta di struttura della
  raccolta, non di probabilità di deflusso.

### Modulo 4 - Scenari (effetto sulla raccolta per paese)

- **Cosa fa**: calcolo contabile di quanto cambierebbe la raccolta di ciascun paese per
  diversi livelli di adozione, usando i livelli del modulo 1 come punti di partenza e la
  struttura del modulo 3 come base.
- **Completato quando**: (a) ogni scenario è definito da parametri espliciti scritti
  prima di calcolare i risultati; (b) la regola con cui il deflusso è ripartito tra
  paesi e tra tipi di deposito è dichiarata, con almeno una regola alternativa di
  confronto; (c) i risultati sono presentati come esercizio meccanico, con la
  sensibilità ai parametri; (d) il codice riproduce le tabelle del report.

## 3. Fonti dati confermate

| Fonte | Uso | Accesso | Stato |
|---|---|---|---|
| API pubbliche di 25 exchange (Binance, Kraken, Coinbase, Bitstamp, OKX, Bybit, Upbit, Bithumb, Coinone, Korbit, BtcTurk, Bitvavo, Bitfinex, Gemini, Crypto.com, KuCoin, Gate, Bitget, MEXC, WhiteBIT, Indodax, CoinDCX, BTC Markets, Bitso, Binance.US) | Modulo 2 | Gratis, senza chiave | Confermata per 2026-10-12 / 2026-11-22; storico più lungo da verificare |
| CoinGecko, ticker a 24 ore | Controllo di copertura del modulo 2 | Gratis, senza chiave, solo istantanea | Confermata |
| ECB Data Portal, dataset BSI | Modulo 3 | Gratis, senza chiave | Confermata: 12 serie, 21 paesi (20 per i depositi da altre banche), mensile, fino a 2026-09 |
| BCE, Bollettino economico 7/2026, riquadro sulle stablecoin | Modulo 1 | Pagina pubblica | Verificata sull'originale |
| ESM Working Paper 79 | Moduli 1 e 4 | PDF pubblico | Verificata sull'originale |
| ESMA, Kaiko, Chainalysis, IMF WP/25/141, Bruegel PB 09/2026 | Confronto | Pubblici | Verificate sugli originali |
| RPC pubblici Ethereum e Tron; etichette Dune Spellbook | Solo test 00 e 01 | Gratis, senza chiave | Non più usate |

Non disponibile: passività bancarie in valuta estera per paese a frequenza mensile.

## 4. Cosa il programma NON promette

- **Nessuna stima della residenza.** Il programma non dice quante stablecoin sono
  detenute da residenti dell'area euro, né in totale né per paese.
- **Nessun effetto causale sul pass-through.** Il programma non stima l'effetto delle
  stablecoin sulla trasmissione dei tassi alla raccolta o ai prestiti. Per quello il
  riferimento resta il Working Paper BCE 3199.
- **Nessun "early warning".** L'indice del modulo 2 e la struttura del modulo 3 non sono
  segnali anticipatori di deflussi né indicatori di rischio validati.
- Nessuna previsione dell'adozione futura: gli scenari sono ipotesi.
- Nessuna classifica di "paesi a rischio": il modulo 3 descrive la composizione della
  raccolta, non la probabilità che i depositi escano.
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
| Istantanea CoinGecko come serie storica | `reports/00_test_H1.md` | L'API gratuita restituisce solo le ultime 24 ore |

## 6. Regole di lavoro

- Non inventare e non simulare dati. Se una fonte non è raggiungibile, scriverlo.
- Criterio e metodo si committano prima di guardare i risultati e non si modificano dopo.
- Ogni cifra esterna va riletta sull'originale, con pagina o sezione.
- Le chiavi API stanno solo in `.env`, escluso da git. Nessun file di dati oltre 50 MB.
- Commit piccoli con messaggi chiari; push alla fine di ogni sessione.
- Ogni report dichiara i propri limiti e cosa non è stato possibile fare.

## 7. Registro

| Data | Evento |
|---|---|
| 2026-11-23 | Test H1 (`reports/00_test_H1.md`): R = 2,16, GO CON RISERVA |
| 2026-11-24 | Test proxy 3 (`reports/01_test_proxy3.md`): 38,4%, SOLO ANDAMENTO; proxy 2 e 3 scartate |
| 2026-11-24 | Progetto ridefinito in quattro moduli; benchmark verificati e serie BCE confermate (`reports/02_benchmark_e_modulo3.md`) |
