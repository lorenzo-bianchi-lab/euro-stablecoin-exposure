# 13 - Estetica e identità

Data: 2026-11-26 (prompt 7). In questo prompt non è cambiato nessun calcolo: moduli,
strato dati e modello dell'applicazione sono quelli del prompt 6, e i file in `data/` e
`web/public/data/` non sono stati toccati. Criteri in `SPEC.md`, committati prima del
lavoro (commit `88f4130`) insieme agli screenshot "prima".

Applicazione: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/

## 1. Sistema grafico

Tutto è definito in un solo file, `web/src/styles/tokens.css`. I componenti
(`base.css`) e i grafici (`components/Chart.tsx`) leggono quei valori e non ne
definiscono altri.

| Voce | Scelta |
|---|---|
| Nome | Euro Stablecoin Exposure Monitor. Segno originale (tre barre in un cerchio aperto); nessun logo, colore o marchio di istituzioni |
| Colore principale | Blu profondo `#163b6e` (tema scuro: `#9bbcf0`) |
| Unico accento | Rame `#a8481f` (tema scuro: `#f0a070`): segnalazioni, selezione, serie a confronto |
| Fondi e testo | Pagina `#f5f6f8`, schede bianche, testo `#0f1b2d`; tema scuro con valori propri (`#0b1320`, `#121c2c`, `#e9eef5`), non un'inversione |
| Titoli | Source Serif 4 |
| Testo e numeri | Inter, con cifre tabulari |
| Scala | Spaziature a multipli di 4 px, tre raggi, tre ombre, anello del fuoco in accento |
| Serie dei grafici | Sei colori in ordine fisso; ogni serie ha anche un tratto e una forma propri |
| Mappa | Cinque classi di blu dal chiaro allo scuro, legenda con gli estremi scritti |
| Griglie ed etichette | Griglie leggere; etichette scritte alla fine delle linee e accanto alle barre al posto delle legende, dove c'è spazio |

I caratteri sono file locali (licenza SIL Open Font License), le icone sono Lucide
(licenza ISC). In fondo a ogni pagina: "University project, not affiliated with the
ECB" (in italiano: "Progetto universitario, non affiliato alla BCE").

## 2. Come è stato fatto

Prima il sistema grafico, i componenti comuni, l'intelaiatura, la pagina iniziale e la
pagina About. Poi dieci agenti in parallelo, uno per sezione, ciascuno con il permesso
di toccare solo il file della propria sezione e i propri due file di traduzione, e con
l'obbligo di compilare in una cartella propria e guardare i propri screenshot. Per
permetterlo i testi sono stati divisi in un file per sezione (`web/src/i18n/en/`,
`it/`). Infine l'uniformazione: richieste degli agenti portate nei file comuni,
correzioni emerse dalla revisione degli screenshot.

## 3. Stato delle pagine

| Pagina | Stato | Risultato in evidenza e cambiamenti principali |
|---|---|---|
| Pagina iniziale (nuova) | Completa | Una frase su cosa fa il programma; tre risultati le cui frasi sono modelli riempiti con i dati correnti (livello, paesi più esposti per canale, scenario alto); mappa d'anteprima; sei ingressi agli strumenti |
| About (nuova) | Completa, con segnaposto | Scopo, indipendenza dalle istituzioni, autori (segnaposto da compilare), fonti con attribuzione, software e licenze |
| Panoramica | Completa | Livello stimato con i tre indicatori a fianco; classifica a barre orizzontali con il valore scritto |
| Simulatore | Completa | Pannello dello scenario fisso a sinistra; depositi da sostituire in evidenza; tabella a tutta larghezza |
| Mappa d'Europa | Completa | Proiezione equivalente di Lambert, cinque classi con legenda leggibile, paese selezionato con bordo in accento e pannello dei suoi valori, poi pulsante per la scheda |
| Scheda paese | Completa | Posizione in classifica con una frase che dice cosa la determina; raccolta ad aree impilate con i depositi a vista in risalto |
| Banche | Completa | Credito per euro di deflusso in evidenza; classi distinte per forma; tabella compatta a nove colonne con venti righe per pagina; scheda della banca |
| Mappa a due canali | Completa | Correlazione tra i canali in evidenza; fonti distinte per forma; nomi dei quadranti negli angoli del grafico |
| Monitor settimanale | Completa | Ultima quota EUR con variazione e stato a parole; linee con etichette dirette; tabelle paginate |
| Stima del livello | Completa | Ipotesi in un pannello fisso; stima con la formula e i valori correnti; barre con il valore scritto |
| Confronto ed esportazione | Completa | Differenza tra B e A in evidenza; rapporto di due pagine A4 con intestazione, data dei dati, scenario e numero di pagina |
| Metodo e dati | Completa | Stato dell'ultimo aggiornamento in evidenza; indice interno; stati scritti in etichette; tabelle lunghe paginate |

Comune a tutte: navigazione laterale a gruppi con icone; sotto i 1024 pixel barra
superiore, barra in basso con quattro voci e menu a tutto schermo; stati di caricamento
(sagome) e di errore (messaggio e pulsante); transizioni brevi quando cambiano i valori.

## 4. Verifiche

| Controllo | Esito |
|---|---|
| Test Python | 22 su 22, invariati |
| Calcoli dell'applicazione contro gli script | 20 su 20, invariati |
| Traduzioni | 12 su 12: ora leggono i file per sezione, e controllano che nessuna chiave stia in due file |
| Contrasto sui token (nuovo) | 10 su 10: testo almeno 4,5:1 su ogni fondo su cui compare, elementi grafici e serie almeno 3:1, nei due temi |
| Contrasto sul testo reso (nuovo) | 0 testi sotto soglia in 13 pagine, tema chiaro e scuro |
| Browser, 13 pagine nelle due lingue | 0 errori in console; 0 px di sbordo a 390 px; 0 tabelle tagliate a 1280 px su 25; 34 avvertenze, tutte chiuse all'avvio; 19 grafici, tutti con testo alternativo; dicitura in fondo a ogni pagina |
| Tastiera | Il primo Tab porta a "Skip to content"; su cinque pagine tutti gli elementi raggiunti (fino a 45 per pagina) hanno il fuoco visibile |
| Riduzione del movimento | Con la preferenza attiva: nessuna animazione nei componenti né nei grafici |
| Navigazione mobile | Barra in basso, menu con le dodici voci, chiusura con Esc |
| Rapporto stampabile | Due pagine A4 nel PDF generato dal test, con intestazione su entrambe |
| Condivisione | Titolo, descrizione, icona e immagine di anteprima presenti |

Modifiche ai test esistenti, rese necessarie dal ridisegno: elenco delle pagine con le
due nuove; il deflusso del simulatore si legge dal risultato in evidenza e non dal primo
indicatore; le banche si contano dal totale dichiarato, perché la tabella è paginata; il
test della tastiera apre una pagina nuova per ogni sezione; le pagine iniziale e About
sono esentate dall'obbligo di avere avvertenze; il test delle traduzioni legge i file
per sezione. Nessun controllo è stato tolto.

### Peso delle pagine

Byte scaricati aprendo la pagina per prima (non compressi; tra parentesi compressi).

| Pagina | Prima | Dopo |
|---|---|---|
| Pagina iniziale | - | 1.114 kB (433) |
| Panoramica | 827 kB (274) | 907 kB (365) |
| Simulatore | 827 kB (274) | 906 kB (365) |
| Mappa d'Europa | 950 kB (314) | 1.116 kB (433) |
| Banche | 870 kB (288) | 951 kB (379) |
| Monitor settimanale | 876 kB (286) | 956 kB (376) |
| Confronto | 225 kB (73) | 374 kB (185) |
| Metodo e dati | 232 kB (77) | 381 kB (188) |
| About | - | 362 kB (181) |

Le pagine pesano di più: circa 90 kB compressi in più ciascuna. Quasi tutto viene dai
due caratteri (97 kB, non comprimibili) e dai testi nelle due strutture. La libreria dei
grafici registra solo barre, linee e punti (550 kB); i moduli della mappa (88 kB) si
scaricano solo dalle due pagine che hanno una mappa. Le pagine senza grafici non la
scaricano. I numeri completi sono in `reports/figures/app/peso_prima.json` e
`peso_dopo.json`.

### Screenshot

`reports/figures/app/before` (44) e `after` (52): ogni pagina a 1280 e 390 pixel, tema
chiaro e scuro. Li ho guardati tutti: a 1280 pixel in chiaro uno per uno, in scuro la
mappa e la mappa a due canali uno per uno e le altre pagine affiancate a dimensione
ridotta; a 390 pixel chiaro e scuro affiancati.

Corretto durante la revisione:
- sulla mappa il paese con il valore minimo cadeva fuori dalle classi per un
  arrotondamento e appariva come "fuori dall'area euro";
- la classe più chiara della mappa era quasi uguale al grigio dei paesi fuori dall'area;
- due serie dei grafici avevano la stessa luminanza nel tema scuro;
- nella cattura a pagina intera la barra mobile compariva a metà pagina.

## 5. Cosa non è riuscito, e limiti

- **Pagine più pesanti**, come sopra.
- **Piè di pagina del rapporto**: segue il contenuto, non è fissato in fondo al foglio.
  Fissarlo portava il rapporto a tre pagine.
- **Scorrimento virtuale**: non fatto; le tabelle lunghe usano la paginazione.
- **Mappa da tastiera**: la mappa non si percorre con la tastiera. Lo stesso paese si
  seleziona dalla tabella dei valori, che è raggiungibile.
- **Mappa a due canali**: le sigle di Francia, Irlanda e Paesi Bassi si sovrappongono in
  parte, perché i punti quasi coincidono.
- **Autori**: segnaposto. **Licenza del codice**: da scegliere. **Condizioni d'uso delle
  fonti**: riportate in forma generale; vanno rilette sui siti di ciascuna fonte prima di
  una pubblicazione definitiva.
- **Stato "fonte con problemi"** in Metodo e dati: non verificato a schermo, perché oggi
  tutte le fonti sono aggiornate.
- **Esecuzione pianificata del lunedì**: ancora non osservata.

---

**Cosa aggiunge questo al programma finale**: lo stesso strumento ha ora un nome, una
pagina iniziale che dice i tre risultati con i dati del giorno e una veste che un
analista può leggere e stampare, con contrasto, tastiera e stampa verificati dai test.
