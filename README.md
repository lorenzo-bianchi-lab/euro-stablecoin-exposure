# euro-stablecoin-exposure

Progetto universitario (ESCP, economia e finanza). Obiettivo finale: stimare quanta
parte delle stablecoin in dollari (USDT, USDC) è detenuta o usata da residenti
dell'area euro, e quali sistemi bancari nazionali sarebbero più vulnerabili a una
sostituzione dei depositi. Riferimento: ECB Working Paper n. 3199 (marzo 2026).

## Stato

Fase 0: test di fattibilità "go / no-go" dell'ipotesi H1.

> H1: indicatori pubblici indipendenti danno stime tra loro coerenti della quota
> di attività in stablecoin in dollari attribuibile all'area euro.

Risultato (2026-11-23): **GO CON RISERVA**, con R = 2,16. La proxy sugli exchange dà
24,3%, quella sugli orari on-chain 52,4%. Dettagli, limiti e benchmark in
[reports/00_test_H1.md](reports/00_test_H1.md).

Test della proxy 3 (2026-11-24): **SOLO ANDAMENTO**. I flussi verso exchange pesati per
quota EUR danno 38,4%, sopra il tetto del 30%, e risentono di etichette incomplete.
Dettagli in [reports/01_test_proxy3.md](reports/01_test_proxy3.md).

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
```

## Chiavi API

Le chiavi vanno solo nel file `.env` (escluso da git); `.env.example` elenca i nomi
attesi. Il test H1 usa esclusivamente endpoint pubblici senza chiave.

## Regole sui dati

- Nessun dato inventato o simulato: se una fonte non è raggiungibile, il report lo dichiara.
- Nessun file di dati oltre 50 MB nel repository.
