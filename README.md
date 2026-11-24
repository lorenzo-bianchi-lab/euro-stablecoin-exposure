# euro-stablecoin-exposure

Progetto universitario (ESCP, economia e finanza). Obiettivo finale: stimare quanta
parte delle stablecoin in dollari (USDT, USDC) è detenuta o usata da residenti
dell'area euro, e quali sistemi bancari nazionali sarebbero più vulnerabili a una
sostituzione dei depositi. Riferimento: ECB Working Paper n. 3199 (marzo 2026).

## Stato

Il progetto è definito in [SPEC.md](SPEC.md): quattro moduli, fonti confermate, cosa
il programma non promette e metodi scartati. Va letto per primo.

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

## Struttura

| Percorso | Contenuto |
|---|---|
| `data/raw/` | Dati scaricati dalle API, senza modifiche |
| `data/processed/` | Tabelle aggregate usate nei report |
| `src/` | Script Python |
| `notebooks/` | Notebook esplorativi |
| `reports/` | Report in Markdown |

## Come riprodurre

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python src/exchange_fetch.py
.venv/bin/python src/coingecko_snapshot.py
.venv/bin/python src/onchain_fetch.py
.venv/bin/python src/proxy1_exchange.py
.venv/bin/python src/proxy2_onchain.py
.venv/bin/python src/h1_decision.py
.venv/bin/python src/cex_flows_fetch.py
.venv/bin/python src/proxy3_cex_flows.py
.venv/bin/python src/ecb_bsi_probe.py
.venv/bin/python src/bis_lbs_probe.py
```

## Chiavi API

Le chiavi vanno solo nel file `.env` (escluso da git); `.env.example` elenca i nomi
attesi. Il test H1 usa esclusivamente endpoint pubblici senza chiave.

## Regole sui dati

- Nessun dato inventato o simulato: se una fonte non è raggiungibile, il report lo dichiara.
- Nessun file di dati oltre 50 MB nel repository.
