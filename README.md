# euro-stablecoin-exposure

Progetto universitario (ESCP, economia e finanza) destinato alla BCE. Il programma stima
un intervallo per le stablecoin in dollari (USDT, USDC) detenute dai residenti dell'area
euro, non una misura: 15,4 miliardi di euro, tra 8,9 e 23,1, da un'indagine BCE e da
ipotesi dichiarate. Mostra poi come si muove l'attività in euro, quali sistemi bancari
nazionali hanno la raccolta più esposta a una sostituzione dei depositi e quanto
peserebbe ogni livello di adozione su depositi e credito, paese per paese. Riferimento:
ECB Working Paper n. 3199 (marzo 2026).

L'ipotesi dell'ESM (7,5% e 15% della circolazione) è riportata come confronto. La
variante della stima calcolata sugli individui (42,0 miliardi) è un estremo superiore
dichiarato: conta più volte la stessa famiglia.

## In breve

- **Applicazione web**: https://sqsw5ryvdh-netizen.github.io/euro-stablecoin-exposure/
  Nove sezioni: panoramica, simulatore, mappa d'Europa, scheda paese, mappa a due canali,
  monitor settimanale, stima del livello, confronto ed esportazione, metodo e dati.
- **Risultati in una pagina**: [SINTESI.md](SINTESI.md), generata dal codice.
- **Aggiornare tutto**: `.venv/bin/python src/run_all.py` (circa sei minuti, nessuna chiave
  API), poi `npm run build` in `web/`. Ogni lunedì lo fa da sola una GitHub Action.
- **Test**: `.venv/bin/python -m unittest discover -s tests -v`; in `web/`, `npm test`
  (calcoli dell'applicazione contro gli script) e `npm run e2e` (ogni sezione nel browser).
- **Cosa fa e cosa non promette**: [SPEC.md](SPEC.md). Va letto per primo.

I report numerati in `reports/` sono fotografie alla data indicata; l'applicazione, la
sintesi e i file in `data/processed/` riflettono l'ultimo aggiornamento.

## Cronologia

Test preliminari e moduli, nell'ordine in cui sono stati fatti.

Fase 0: test di fattibilità "go / no-go" dell'ipotesi H1.

> H1: indicatori pubblici indipendenti danno stime tra loro coerenti della quota
> di attività in stablecoin in dollari attribuibile all'area euro.

Risultato (2026-11-23): **GO CON RISERVA**, con R = 2,16. La proxy sugli exchange dà
24,3%, quella sugli orari on-chain 52,4%. Dettagli, limiti e benchmark in
[reports/00_test_H1.md](reports/00_test_H1.md).

Test della proxy 3 (2026-11-24): **SOLO ANDAMENTO**. I flussi verso exchange pesati per
quota EUR danno 38,4%, sopra il tetto del 30%, e risentono di etichette incomplete.
Dettagli in [reports/01_test_proxy3.md](reports/01_test_proxy3.md).

Verifica dei benchmark e delle serie BCE per il modulo 3 (2026-11-24): tutte le cifre
esterne ritrovate negli originali; 12 serie di bilancio bancario scaricabili per i 21
paesi dell'area euro, più le passività in valuta estera e in dollari dalla BRI per 13 paesi. Dettagli in
[reports/02_benchmark_e_modulo3.md](reports/02_benchmark_e_modulo3.md).

Modulo 2 (2026-11-24): indice settimanale della quota EUR dei volumi stablecoin/fiat,
quattro serie su 102 settimane. Ultima settimana: USDT 11,9%, USDC 54,9%. Dettagli in
[reports/03_modulo2_indice.md](reports/03_modulo2_indice.md). Aggiornamento:
`.venv/bin/python src/module2_index.py`.

Modulo 3 (2026-11-24): classifica dei 21 paesi dell'area euro per esposizione
strutturale della raccolta bancaria (dati di settembre 2026). In testa Slovenia,
Lettonia e Bulgaria; in coda Francia, Lussemburgo e Paesi Bassi. Dettagli in
[reports/04_modulo3_classifica.md](reports/04_modulo3_classifica.md). Aggiornamento:
`.venv/bin/python src/module3_ranking.py`.

Modulo 4 (2026-11-24): scenari di adozione per paese. Al livello ipotizzato dall'ESM
per oggi (19 miliardi di dollari) l'effetto è lo 0,2% dei depositi a vista dell'area;
per arrivare al 5% servirebbero 464 miliardi di dollari. Dettagli in
[reports/05_modulo4_scenari.md](reports/05_modulo4_scenari.md). Un livello qualsiasi:
`.venv/bin/python src/module4_scenarios.py --importo-usd 250`.

Modulo 1 (2026-11-24): livello attribuibile all'area euro applicando le quote assunte
dall'ESM alla circolazione corrente di USDT e USDC. Al 24 novembre 2026: 16,7 miliardi di
euro (quota 7,5%) e 33,4 (quota 15%). È un'ipotesi esterna applicata, non una stima.
Dettagli in [reports/06_modulo1_livello.md](reports/06_modulo1_livello.md).
Aggiornamento: `.venv/bin/python src/module1_level.py`.

Estensioni del 2026-11-25:

- **Credito e trasmissione** ([report 07](reports/07_modulo5_credito.md)): prestiti in
  meno per scenario e paese con i coefficienti del WP 3199, e mappa a due canali.
- **Livello proprio e regola R3** ([report 08](reports/08_livello_proprio.md)): stima dal
  basso di 15,4 miliardi di euro (8,9 - 23,1); le altre due strade non la confermano.
  Ripartizione tra paesi per possessori di cripto-attività.
- **Test predittivo e segnalazione** ([report 09](reports/09_modulo2_segnale.md)):
  l'indice settimanale non anticipa i depositi; ha però una regola di segnalazione.
- **Cruscotto e test** ([report 10](reports/10_cruscotto_e_test.md)): sostituito
  dall'applicazione.
- **Dal motore al programma** ([report 11](reports/11_applicazione.md)): la stima propria
  diventa il livello di riferimento, con il suo intervallo; il credito in evidenza usa
  la regola uniforme del WP 3199 con intervallo basso-alto e una variante continua;
  strato dati in JSON, applicazione web a nove sezioni, aggiornamento settimanale.

## Struttura

| Percorso | Contenuto |
|---|---|
| `data/raw/` | Dati scaricati dalle API, senza modifiche |
| `data/processed/` | Tabelle aggregate prodotte dai moduli |
| `src/` | Script Python: i moduli, `run_all.py`, `summary.py`, `export_app_data.py` |
| `web/` | Applicazione (React, Vite, TypeScript, ECharts) e i suoi test |
| `web/public/data/` | Strato dati: un file JSON per sezione, descritto in `README.md` nella stessa cartella |
| `docs/` | Applicazione compilata, pubblicata con GitHub Pages |
| `reports/` | Report in Markdown; `reports/figures/app/` contiene gli screenshot delle sezioni |
| `tests/` | Test automatici in Python |
| `.github/workflows/` | Aggiornamento automatico del lunedì |

## Come riprodurre

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt   # versioni bloccate
.venv/bin/python src/run_all.py             # moduli, sintesi e dati dell'applicazione
.venv/bin/python src/run_all.py --offline   # ricalcolo dai dati già scaricati
cd web && npm ci && npm run build           # applicazione compilata in docs/
npm run dev                                 # applicazione in locale
```

Ogni modulo si può eseguire da solo: `src/module1_level.py`, `src/module2_index.py`,
`src/module3_ranking.py`, `src/module4_scenarios.py`, `src/module5_credit.py`,
`src/level_own.py`. Gli script dei test preliminari (report 00, 01 e 02) restano in
`src/` e sono descritti nei rispettivi report.

Se una fonte non risponde, il modulo che la usa fallisce, i suoi risultati restano quelli
dell'ultima esecuzione riuscita e l'applicazione lo segnala in alto e nella sezione
"Metodo e dati".

## Chiavi API

Le chiavi vanno solo nel file `.env` (escluso da git); `.env.example` elenca i nomi
attesi. Tutto il programma usa esclusivamente endpoint pubblici senza chiave.

## Regole sui dati

- Nessun dato inventato o simulato: se una fonte non è raggiungibile, il report lo dichiara.
- Nessun file di dati oltre 50 MB nel repository.
