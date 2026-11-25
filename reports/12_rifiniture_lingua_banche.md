# 12 - Rifiniture, inglese, singole banche

Data: 2026-11-25 (prompt 6). Criteri e definizioni sono in `SPEC.md`, committati prima
dei risultati (commit `a5b6b33`). Prima di scriverli è stata verificata solo la
disponibilità dei dati EBA.

Applicazione: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/

## 1. Rifiniture

| # | Rifinitura | Stato | Come è fatta |
|---|---|---|---|
| 1 | Tabelle larghe | Fatta | Le intestazioni vanno a capo: a 1280 pixel nessuna delle 23 tabelle ha colonne tagliate, in inglese e in italiano. Sotto quella larghezza la tabella scorre dentro il proprio contenitore e la prima colonna resta ferma. Il test nel browser lo verifica in ogni sezione: misura la larghezza del contenuto, scorre la tabella e controlla che la prima cella non si sposti |
| 2 | Avvisi | Fatta | L'avviso sulle fonti è una riga con un pallino nella barra laterale, che porta a "Metodo e dati" dove c'è il dettaglio. Ogni avvertenza di sezione è una riga con "dettagli" che apre il testo completo. Le avvertenze sono 33 nelle undici pagine: nessuna è stata tolta, e se ne sono aggiunte per il cambio unico, per Bybit e per le banche |
| 3 | Bybit fuori dall'indice | Fatta | Sezione 2 |
| 4 | Un solo valore ESM | Fatta | Tutto il programma converte con un solo cambio: quello di riferimento BCE più recente alla data della circolazione (1,0935 dollari per euro, 25 novembre 2026). Il modulo 4 lo legge dal modulo 1. L'ipotesi ESM vale 16,7 miliardi di euro ovunque; il cambio è dichiarato nella panoramica, nella stima del livello e in "Metodo e dati". Un test controlla che i quattro punti in cui compare coincidano |
| 5 | Riquadri sulla mappa | Fatta | Tre riquadri ingranditi sotto la mappa per Lussemburgo, Malta e Cipro, con lo stesso colore e il valore scritto; un clic apre la scheda |
| 6 | Rapporto stampabile A e B | Fatta | Nella sezione "Confronto ed esportazione" si sceglie tra rapporto dello scenario A e rapporto del confronto; la scelta resta nell'indirizzo (`rep=ab`). In stampa resta solo il rapporto |
| 7 | Codice diviso per sezione | Fatta | Un file per sezione, più React, la libreria dei grafici e una lingua. Aprendo "Metodo e dati" si scaricano 193 kB di codice; aprendo la panoramica 802 kB, di cui 617 della libreria dei grafici. Prima era un file unico da 850 kB per qualsiasi pagina |

Conseguenza del cambio unico: gli scenari definiti in dollari valgono in euro circa il
4% in più di prima (143 miliardi di dollari sono 130,8 miliardi di euro, non 125,9). I
report 05 e 07 restano fotografie con il cambio di fine settembre.

## 2. Variazione dell'indice senza Bybit

Bybit è stato tolto dal pannello per tutte le serie e per tutto lo storico. I suoi dati
già scaricati restano nell'archivio grezzo, non usati. Il pannello passa da 25 a 24
exchange (22 nell'indice lungo). La misura era definita prima del calcolo: differenza
tra indice senza e con Bybit sulle 102 settimane dell'indice principale, in punti
percentuali.

| Serie | Differenza media | Differenza massima | Ultima settimana comune (16 novembre 2026) |
|---|---|---|---|
| USDT | -0,40 | 4,50 (settimana del 1° giugno 2026) | -1,76 |
| USDT senza Coinbase | -0,43 | 4,68 | -1,89 |
| USDC | -0,12 | 0,97 (settimana dell'8 giugno 2026) | -0,58 |
| USDC senza Coinbase | -0,15 | 1,19 | -0,80 |

- Bybit pesava in media lo 0,5% dei volumi, al massimo il 4,3%, l'1,8% nell'ultima
  settimana. L'effetto sull'indice è più grande del suo peso perché i suoi volumi sono
  quasi tutti contro euro.
- L'ultimo valore di USDT passa da 11,9% a 10,2%; quello di USDC da 54,9% a 54,3%.
- Cambia lo stato di una segnalazione su 200: USDT, settimana del 27 luglio 2026, da
  "nessuno" a "da verificare".
- L'indice senza Bybit è più basso, quindi il livello non è confrontabile con quello dei
  report 03 e 09. La direzione è la stessa.

## 3. Modulo 6: singole banche

### 3.1 Dati trovati

L'ultimo esercizio di trasparenza dell'EBA è quello del 2025, pubblicato il 4 dicembre
2025: quattro date, l'ultima il 30 giugno 2025, 119 banche di 25 paesi, al massimo
livello di consolidamento. Il database completo si scarica gratis, in CSV, senza chiave.
Quello del 2026 non è ancora uscito, e l'EBA scrive che sta valutando se continuare
l'esercizio ora che esiste il Pillar 3 Data Hub.

| Voce richiesta | Presente | Dove |
|---|---|---|
| Depositi di famiglie e imprese | Sì | Passività per strumento e settore di controparte |
| Di cui a vista | Sì | Stessa tabella: conti correnti e depositi overnight |
| Depositi da banche | Sì | Stessa tabella, enti creditizi |
| Titoli emessi | Sì | Stessa tabella |
| Totale attivo | Sì | Tabella dell'attivo |
| Prestiti a famiglie e imprese | Sì | Tabella delle esposizioni deteriorate, valore lordo per settore |
| Esposizioni in dollari | **No** | Nessuna scomposizione per valuta in tutto l'esercizio |

Al posto delle esposizioni in dollari l'applicazione riporta le esposizioni creditizie
verso controparti statunitensi, che sono un'altra grandezza: riguardano il paese del
debitore, non la valuta, e l'EBA le pubblica solo quando gli Stati Uniti sono tra i primi
dieci paesi della banca (42 banche su 85).

Criterio di sufficienza fissato prima (almeno 50 banche dell'area euro con tutte le voci,
in almeno 15 paesi): **soddisfatto**. Le banche con sede nell'area euro sono 99; 85 hanno
tutte le voci e stanno in 18 paesi. Non è servito passare alle statistiche di vigilanza
aggregate per modello di business. Le 14 escluse: 12 non hanno le voci di bilancio di
giugno 2025 nel database (tra cui J.P. Morgan SE, Goldman Sachs Bank Europe, Barclays
Bank Ireland, Banque et Caisse d'Epargne de l'Etat), 2 non hanno depositi di famiglie e
la quota retail non è definita (SFIL, Bpifrance). Nessuna banca dell'esercizio ha sede in
Bulgaria, Croazia o Slovacchia.

Il repository contiene solo le righe usate (`data/raw/eba_te2025_extract.csv`, 1 MB):
il file completo del rischio di credito pesa 123 MB. `src/module6_banks.py --download`
lo riscarica e ricostruisce l'estratto.

### 3.2 Quota retail e soglia

Quota retail = depositi delle famiglie / (depositi delle famiglie + depositi di società
finanziarie diverse dalle banche), come nel Working Paper BCE 3199. Tra le 85 banche la
mediana è 85,0% e il 75° percentile è **94,4%**: 21 banche stanno sopra. Tra i paesi
(modulo 5) la soglia era 92,4%.

### 3.3 Copertura

Totale attivo del campione: 25.397 miliardi di euro. È il 61% dell'attivo delle
istituzioni finanziarie monetarie residenti nell'area (BSI, giugno 2025) e il 69%
dell'attivo consolidato di tutte le banche (dati bancari consolidati BCE, secondo
trimestre 2025).

| Paese | Banche | Di cui alta quota retail | Copertura, IFM residenti | Copertura, consolidato |
|---|---|---|---|---|
| Germania | 17 | 1 | 40% | 47% |
| Italia | 12 | 1 | 66% | 84% |
| Spagna | 10 | 4 | 121% | 89% |
| Francia | 8 | 1 | 74% | 91% |
| Paesi Bassi | 6 | 1 | 80% | 82% |
| Austria | 5 | 2 | 38% | 30% |
| Belgio | 4 | 2 | 44% | 44% |
| Grecia | 4 | 3 | 101% | 94% |
| Finlandia | 3 | 0 | 105% | 83% |
| Irlanda | 3 | 1 | 26% | 60% |
| Portogallo | 3 | 2 | 56% | 53% |
| Lituania | 2 | 1 | 39% | 40% |
| Malta | 2 | 1 | 47% | 43% |
| Slovenia | 2 | 1 | 68% | 58% |
| Cipro | 1 | 0 | 37% | 39% |
| Estonia | 1 | 0 | 20% | 16% |
| Lettonia | 1 | 0 | 17% | 8% |
| Lussemburgo | 1 | 0 | 2% | 3% |
| Bulgaria, Croazia, Slovacchia | 0 | - | - | - |

Il rapporto supera il 100% dove i gruppi hanno grandi controllate estere (Santander,
BBVA, Nordea): al numeratore c'è il gruppo consolidato, al denominatore le sole banche
residenti. Va letto come ordine di grandezza.

### 3.4 Confronto con il modulo 5

Scenario di controllo: livello centrale (15,4 miliardi di euro), regola R1, depositi a
vista di famiglie e imprese, sostituzione piena. Ogni banca perde la stessa quota di
depositi del suo paese; il coefficiente è quello alto (3,089) per le banche sopra la
soglia e quello basso (0,441) per le altre. Nei 18 paesi coperti il deflusso è 15,0
miliardi.

| Calcolo | Prestiti in meno (mld €) | Per euro di deflusso |
|---|---|---|
| **Modulo 6, banca per banca** | **6,7** | **0,45** |
| Modulo 5, regola uniforme | 7,5 | 0,50 |
| Modulo 5, variante continua | 3,7 | 0,25 |
| Modulo 5, variante a soglia | 2,7 | 0,18 |
| Modulo 5, coefficiente basso | 2,5 | 0,17 |
| Modulo 5, coefficiente alto | 17,7 | 1,18 |

- Applicati banca per banca, i coefficienti danno 0,45 euro di prestiti per euro di
  deflusso: vicino alla regola uniforme di 0,5 che il paper indica per l'insieme delle
  banche, e due volte e mezzo la variante a soglia tra paesi. Conferma la scelta del
  prompt 5 di mettere in evidenza la regola uniforme.
- La variante a soglia tra paesi sottostima perché classifica interi sistemi: i cinque
  paesi sopra la soglia nazionale sono piccoli, mentre le banche ad alta quota retail
  stanno anche nei paesi grandi (quattro in Spagna, tre in Grecia, due in Austria, Belgio
  e Portogallo).
- Dove i due calcoli divergono di più: Irlanda (0,95 banca per banca contro 0,05 a
  soglia), perché i depositi di intermediari non bancari che abbassano la quota retail
  nazionale non stanno nelle banche commerciali del campione; Lituania nel verso opposto
  (0,26 contro 1,37), perché il paese è sopra la soglia ma la banca ad alta quota retail
  del campione ha pochi prestiti.
- Il valore banca per banca copre solo le banche del campione e, per costruzione, non
  dipende dall'importo dello scenario: dipende dal tipo di deposito scelto.

## 4. Sezione "Banche"

Completa, alla voce "Banks" del menu (`#/banks`).

- **Campione**: banche incluse, soglia, copertura, credito per euro di deflusso contro
  il modulo 5, ricalcolato nel browser sullo scenario del simulatore.
- **Grafico**: quota retail contro raccolta all'ingrosso (depositi da banche più titoli
  emessi sul totale attivo), dimensione per totale attivo, colore per classe, linea
  sulla soglia. Un clic apre la scheda.
- **Tabella**: 85 banche, ordinabile su ogni colonna, filtrabile per paese e per classe,
  con ricerca per nome; deflusso e credito in meno nello scenario; download CSV. I
  filtri restano nell'indirizzo.
- **Per paese**: copertura e confronto con le varianti del modulo 5.
- **Scheda della banca** (`#/banks/<LEI>`): sei indicatori, composizione della raccolta,
  effetto di ogni scenario predefinito, voci di bilancio.
- Avvertenze in ogni blocco: dati pubblici per banca e non di vigilanza; l'ordine non è
  un giudizio sulla solidità; bilanci consolidati con attività fuori dall'area euro;
  date diverse da quelle dei bilanci nazionali; adozione per banca non osservata.

## 5. Lingua

- Inglese all'avvio, italiano dal pulsante nella barra laterale. La scelta sta
  nell'indirizzo (`lang=it`) e resta cambiando sezione.
- 587 testi per lingua in `web/src/i18n/en.json` e `it.json`; i 117 testi che vengono da
  SPEC.md (fonti, limiti, metodi scartati) sono tradotti in `src/i18n/spec_en.json`. Nel
  codice dei componenti non resta testo. I file di dati contengono solo numeri e codici.
- Numeri, date, simbolo di valuta e separatori del CSV seguono la lingua ("€15.4 bn" e
  "15,4 mld €"; "25 November 2026" e "25 novembre 2026").
- Anche i nomi delle sezioni negli indirizzi sono in inglese; i vecchi indirizzi in
  italiano continuano a funzionare.

## 6. Verifiche

| Controllo | Esito |
|---|---|
| Test Python (`tests/`) | 22 su 22: quadratura, scenari, strato dati, cambio unico, traduzioni di SPEC, Bybit fuori dall'indice, modulo 6, riproducibilità senza rete |
| Calcoli dell'applicazione contro gli script (`npm test`) | 20 su 20: nove scenari per paese, tre scenari per banca su 85 banche, sei varianti della stima del livello |
| Traduzioni (`npm test`) | 11 su 11: stesse chiavi e stessi segnaposto nelle due lingue, ogni chiave usata esiste, nessuna inutilizzata, nessun testo nei componenti |
| Browser (`npm run e2e`), undici pagine | 0 errori in console; 0 pixel di sbordo a 390 pixel; 0 tabelle tagliate a 1280 pixel su 23, nelle due lingue; 15 tabelle scorrono a 390 pixel, tutte con la prima colonna fissa; nessuna chiave mancante e nessuna parola dell'altra lingua |
| Browser, comportamenti | Scenario nell'indirizzo, tema scuro, cambio lingua e ritorno, vecchio indirizzo in italiano, avvertenza a una riga che si apre, indicatore delle fonti, tre riquadri sulla mappa, rapporto A e B in stampa, filtro e scheda delle banche, file scaricati all'avvio: tutti superati |

Gli screenshot delle pagine, a 1280 e a 390 pixel, sono in `reports/figures/app/`,
con l'esito in `esito_test_browser.json`.

## 7. Cosa non è riuscito, e limiti

- **Esposizioni in dollari per banca**: non esistono nei dati EBA. Le esposizioni verso
  controparti statunitensi le sostituiscono solo in parte e per metà delle banche.
- **Tre paesi senza banche** (Bulgaria, Croazia, Slovacchia) e coperture sotto il 20% in
  Estonia, Lettonia e Lussemburgo: lì il modulo 6 non dice nulla o quasi.
- **Date diverse**: banche al 30 giugno 2025, bilanci nazionali a settembre 2026. Il
  modulo 6 non si aggiorna da solo: lo farà quando, e se, l'EBA pubblicherà un nuovo
  esercizio.
- **Perimetro consolidato**: i depositi di un gruppo comprendono quelli raccolti fuori
  dall'area euro, e lo scenario li tratta come se fossero tutti nel paese della sede.
- **Variante continua per banca**: non calcolata. Gli ancoraggi tra banche non erano
  stati definiti prima, e definirli dopo aver visto i risultati avrebbe violato la
  regola. La variante del credito scelta nel simulatore non si applica alle banche.
- **Testi rimasti in italiano**: SPEC.md, i report, la descrizione dei file di dati e i
  messaggi di errore dei moduli. L'applicazione li indica come tali.
- **Libreria dei grafici**: resta un file unico da 617 kB (205 compressi), scaricato
  dalla prima sezione che ha un grafico.
- **Nomi dei paesi fuori dall'area euro**: sulla mappa compare solo "fuori dall'area
  euro", senza nome.
- **Esecuzione pianificata del lunedì**: ancora non osservata; lo stato dell'esecuzione
  avviata a mano dopo queste modifiche è nel registro di SPEC.md.

---

**Cosa aggiunge questo al programma finale**: lo stesso scenario si legge ora fino alla
singola banca, e mostra che i coefficienti applicati banca per banca danno quasi la
regola uniforme; l'applicazione è in inglese, con indice e cambio uguali in ogni
esecuzione.
