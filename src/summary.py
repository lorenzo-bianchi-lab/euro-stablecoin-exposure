"""Genera la sintesi di una pagina (SINTESI.md) dai risultati dei quattro moduli.

Legge solo i file in data/processed: non scarica e non ricalcola nulla. Ogni frase è
costruita dai dati, così la pagina resta vera a ogni aggiornamento.

Uso: python src/summary.py
"""
from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
OUT = ROOT / "SINTESI.md"
MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
SERIES_LABELS = {"usdt": "USDT", "usdt_senza_coinbase": "USDT senza Coinbase", "usdc": "USDC", "usdc_senza_coinbase": "USDC senza Coinbase"}
SCENARIO_LABELS = {"M1_oggi_base": "Oggi, quota 7,5%", "M1_oggi_alto": "Oggi, quota 15%", "S1_base_2030": "ESM base 2030",
                   "S2_alto_2030": "ESM alto 2030", "S3_alto_2030_quota_doppia": "ESM alto 2030, quota 15%"}
MODULES = {"modulo1": "1 - Livello", "modulo2": "2 - Andamento", "modulo3": "3 - Vulnerabilità", "modulo4": "4 - Scenari"}


def n(x: float, d: int = 1) -> str:
    """Numero in formato italiano: punto per le migliaia, virgola per i decimali."""
    s = f"{x:,.{d}f}"
    return s.replace(",", "§").replace(".", ",").replace("§", ".")


def pct(x: float, d: int = 1) -> str:
    return n(100 * x, d) + "%"


def signed(x: float, d: int = 1) -> str:
    x = round(x, d) + 0.0  # evita "+0,0" e "-0,0"
    return ("+" if x > 0 else "") + n(x, d)


def day(iso: str) -> str:
    d = datetime.strptime(iso[:10], "%Y-%m-%d")
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def month(ym: str) -> str:
    return f"{MONTHS[int(ym[5:7]) - 1]} {ym[:4]}"


def week(monday: str) -> str:
    a = datetime.strptime(monday, "%Y-%m-%d")
    b = a + timedelta(days=6)
    left = f"{a.day}" if a.month == b.month else f"{a.day} {MONTHS[a.month - 1]}"
    return f"{left}-{b.day} {MONTHS[b.month - 1]} {b.year}"


def load(name: str) -> dict:
    return json.loads((PROC / name).read_text())


def main() -> None:
    m1, m2, m3, m4 = load("m1_level.json"), load("m2_summary.json"), load("m3_summary.json"), load("m4_summary.json")
    status = load("run_status.json") if (PROC / "run_status.json").exists() else {}
    L: list[str] = []
    add = L.append

    add("# Sintesi - esposizione dell'area euro alle stablecoin in dollari")
    add("")
    add(f"Pagina generata il {day(datetime.now().strftime('%Y-%m-%d'))} da `src/summary.py`. Non va modificata a mano: si rigenera con")
    add("`.venv/bin/python src/run_all.py`.")
    add("")
    add("Il programma non stima quante stablecoin detengono i residenti dell'area euro: con dati")
    add("gratuiti non è possibile. Parte da un livello ipotizzato da fonti esterne e mostra come")
    add("si muove l'attività in euro, quali sistemi bancari hanno la raccolta più esposta e")
    add("quanto peserebbe ogni livello di adozione, paese per paese.")
    add("")

    # 1. Livello
    lv, circ, dep = m1["livello"], m1["circolazione_mld_usd"], m1["rapporto_con_i_depositi"]
    add(f"## 1. Livello: {n(lv['base_mld_eur'])} - {n(lv['alto_mld_eur'])} miliardi di euro")
    add("")
    add(f"Stablecoin in dollari attribuite all'area euro applicando le quote assunte dall'ESM (7,5% e 15%)")
    add(f"alla circolazione di USDT e USDC del {day(m1['data_circolazione'])}: {n(circ['usdt_piu_usdc'])} miliardi di dollari.")
    add("")
    add("| | Miliardi di dollari | Miliardi di euro | Sui depositi a vista dell'area |")
    add("|---|---|---|---|")
    add(f"| Quota 7,5% | {n(lv['base_mld_usd'])} | {n(lv['base_mld_eur'])} | {pct(dep['livello_base_su_depositi'], 2)} |")
    add(f"| Quota 15% | {n(lv['alto_mld_usd'])} | {n(lv['alto_mld_eur'])} | {pct(dep['livello_alto_su_depositi'], 2)} |")
    add("")
    add(f"È un'ipotesi esterna applicata, non una stima. Accanto: il {pct(m1['diffusione_bce']['quota_consumatori'], 0)} dei consumatori")
    add(f"dichiara di possedere stablecoin (BCE, {month(m1['diffusione_bce']['mese'])}).")
    add("")

    # 2. Andamento
    ip = m2["indice_principale"]
    add(f"## 2. Andamento: quota EUR dei volumi stablecoin/fiat, settimana {week(ip['ultima_settimana'])}")
    add("")
    add("| Serie | Ultima settimana | Variazione (punti) | Media 52 settimane | Scarto standardizzato |")
    add("|---|---|---|---|---|")
    outliers = []
    for key, label in SERIES_LABELS.items():
        s = ip["serie"][key]
        add(f"| {label} | {pct(s['valore'])} | {signed(s['variazione_pp'])} | {pct(s['media_52_settimane'])} | {signed(s['scarto_standardizzato'], 2)} |")
        if abs(s["scarto_standardizzato"]) > 2:
            outliers.append(label)
    add("")
    if outliers:
        add(f"Fuori dall'intervallo abituale (scarto oltre 2): {', '.join(outliers)}. Prima di interpretarlo vanno")
        add("guardati i volumi contro euro in valore assoluto, perché l'indice è una quota.")
    else:
        add("Nessuna serie è fuori dal proprio intervallo abituale (scarto entro 2). L'indice misura")
        add(f"trading in euro su {m2['exchange_attivi_min_max'][1]} exchange, non detenzioni né residenza.")
    add("")

    # 3. Vulnerabilità
    rank = pd.read_csv(PROC / "m3_ranking_latest.csv", index_col=0).sort_values("pos_indicatore")
    add(f"## 3. Vulnerabilità: classifica della raccolta bancaria, {month(m3['ultimo_mese'])}")
    add("")
    add("Paesi ordinati per esposizione strutturale a una sostituzione dei depositi.")
    add("")
    add("| Posizione | Paese | Depositi a vista sul passivo | Depositi a vista (mld €) | Quota dell'area |")
    add("|---|---|---|---|---|")
    big = rank.sort_values("vista_mld_eur", ascending=False).head(4).index
    shown = list(rank.index[:5]) + [k for k in rank.index[5:-3] if k in big] + list(rank.index[-3:])
    prev = 0
    for k in shown:
        r = rank.loc[k]
        if int(r.pos_indicatore) - prev > 1:
            add("| ... | | | | |")
        add(f"| {int(r.pos_indicatore)} | {r.nome} | {pct(r.C1)} | {n(r.vista_mld_eur, 0)} | {pct(r.quota_dei_depositi_a_vista_dell_area)} |")
        prev = int(r.pos_indicatore)
    add("")
    top4 = rank.loc[big]
    add(f"I primi cinque detengono il {pct(rank.quota_dei_depositi_a_vista_dell_area.iloc[:5].sum())} dei depositi a vista dell'area;")
    add(f"{', '.join(top4.nome[:-1])} e {top4.nome.iloc[-1]} ne detengono il {pct(top4.quota_dei_depositi_a_vista_dell_area.sum(), 0)}.")
    add("La classifica ordina la struttura della raccolta, non la probabilità che i depositi escano.")
    add("")

    # 4. Scenari
    ea = pd.read_csv(PROC / "m4_euro_area.csv")
    ea = ea[(ea.regola_paesi == "R1") & (ea.regola_depositi == "T1")].set_index("scenario")
    add(f"## 4. Scenari: quanto pesa ogni livello sulla raccolta, bilanci di {month(m4['mese_bilanci'])}")
    add("")
    add("| Scenario | Stablecoin detenute (mld $) | Depositi da sostituire (mld €) | Depositi a vista persi | Aumento della raccolta all'ingrosso |")
    add("|---|---|---|---|---|")
    for key, label in SCENARIO_LABELS.items():
        if key in ea.index:
            r = ea.loc[key]
            add(f"| {label} | {n(r.importo_mld_usd, 0 if r.importo_mld_usd >= 100 else 1)} | {n(r.deflusso_mld_eur)} | {pct(r.perdita_depositi_a_vista, 2 if r.perdita_depositi_a_vista < 0.01 else 1)} | {pct(r.aumento_raccolta_ingrosso, 2 if r.aumento_raccolta_ingrosso < 0.01 else 1)} |")
    add("")
    thr = {round(t["perdita_depositi_a_vista_area"], 2): t for t in m4["soglie"]}
    t5 = thr[0.05]
    add(f"Perché l'area perda il 5% dei depositi a vista servirebbero {n(t5['importo_mld_usd'], 0)} miliardi di dollari di stablecoin")
    add(f"detenute dai residenti, {n(t5['importo_mld_usd'] / lv['base_mld_usd'], 0)} volte il livello di base di oggi.")
    byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
    s2 = byc[(byc.scenario == "S2_alto_2030") & (byc.regola_paesi == "R1") & (byc.regola_depositi == "T1")].sort_values("aumento_raccolta_ingrosso", ascending=False)
    lead, last = s2.head(3), s2.iloc[-1]
    add("Nello scenario ESM alto l'aumento di raccolta all'ingrosso necessario è massimo in")
    add(", ".join(f"{r.nome} (+{pct(r.aumento_raccolta_ingrosso, 0)})" for r in lead.itertuples()) + f" e minimo in {last.nome} (+{pct(last.aumento_raccolta_ingrosso, 1)}).")
    add("È un calcolo contabile con sostituzione piena dei depositi, non una previsione.")
    add("")

    # Avvertenze e stato
    add("## Cosa questa pagina non dice")
    add("")
    add("- Non stima la quota di stablecoin detenuta da residenti dell'area euro.")
    add("- Non misura effetti causali sulla trasmissione della politica monetaria.")
    add("- Non è un sistema di allerta precoce: nessun indicatore qui è un segnale anticipatore.")
    add("")
    add("## Dati e aggiornamento")
    add("")
    add("| Modulo | Dati aggiornati a | Ultima esecuzione | Dettagli |")
    add("|---|---|---|---|")
    dates = {"modulo1": day(m1["data_circolazione"]), "modulo2": "settimana " + week(ip["ultima_settimana"]),
             "modulo3": month(m3["ultimo_mese"]), "modulo4": "bilanci di " + month(m4["mese_bilanci"])}
    reports = {"modulo1": "reports/06_modulo1_livello.md", "modulo2": "reports/03_modulo2_indice.md",
               "modulo3": "reports/04_modulo3_classifica.md", "modulo4": "reports/05_modulo4_scenari.md"}
    for key, label in MODULES.items():
        st = status.get("moduli", {}).get(key, {})
        esito = {"ok": "riuscita", "errore": "**fallita: dati precedenti**", "saltato": "non eseguita"}.get(st.get("esito"), "non registrata")
        add(f"| {label} | {dates[key]} | {esito} | [{reports[key].split('/')[-1]}]({reports[key]}) |")
    add("")
    if status.get("eseguito_il"):
        add(f"Ultimo aggiornamento completo: {day(status['eseguito_il'])}, modalità {status.get('modalita', 'n.d.')}.")
    add("Definizioni, fonti, limiti e metodi scartati: [SPEC.md](SPEC.md).")
    add("")
    add("---")
    add("")
    add("**Cosa aggiunge questo al programma finale**: i quattro risultati in una pagina sola, sempre")
    add("allineata ai dati perché generata dal codice e non scritta a mano.")
    add("")
    OUT.write_text("\n".join(L))
    print(f"scritto {OUT.name}: {len(L)} righe")


if __name__ == "__main__":
    main()
