"""Genera la sintesi di una pagina (SUMMARY.md) dai risultati dei moduli.

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
OUT = ROOT / "SUMMARY.md"
MONTHS = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
SERIES_LABELS = {"usdt": "USDT", "usdt_senza_coinbase": "USDT senza Coinbase", "usdc": "USDC", "usdc_senza_coinbase": "USDC senza Coinbase"}
SCENARIO_LABELS = {"P_minimo": "Stima propria, minimo", "P_centrale": "**Stima propria, centro**", "P_massimo": "Stima propria, massimo",
                   "M1_oggi_base": "Confronto: ipotesi ESM oggi (7,5%)", "S1_base_2030": "ESM base 2030",
                   "S2_alto_2030": "ESM alto 2030", "S3_alto_2030_quota_doppia": "ESM alto 2030, quota 15%"}
MODULES = {"modulo1": "1 - Livello", "modulo2": "2 - Andamento", "modulo3": "3 - Vulnerabilità", "modulo4": "4 - Scenari",
           "modulo5": "5 - Credito e trasmissione", "modulo6": "6 - Singole banche"}
PAGES = "https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/"
QUADRANTS = {"A": "depositi alti, dollari bassi", "B": "entrambi alti", "C": "depositi bassi, dollari alti", "D": "entrambi bassi"}


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
    add(f"`.venv/bin/python src/run_all.py`. Versione interattiva: [applicazione]({PAGES}).")
    add("")
    add("Il programma stima un intervallo per le stablecoin in dollari detenute dai residenti dell'area")
    add("euro, non una misura: parte da un'indagine BCE e da ipotesi dichiarate. Mostra poi come si")
    add("muove l'attività in euro, quali sistemi bancari hanno la raccolta più esposta e quanto")
    add("peserebbe ogni livello di adozione su depositi e credito, paese per paese.")
    add("")

    # 1. Livello
    lv, circ, dep = m1["livello"], m1["circolazione_mld_usd"], m1["rapporto_con_i_depositi"]
    own = load("level_own.json")
    ref, b1 = own["livello_di_riferimento"], own["B1"]["famiglie"]
    add(f"## 1. Livello: {n(ref['centrale_mld_eur'])} miliardi di euro, intervallo {n(ref['minimo_mld_eur'])} - {n(ref['massimo_mld_eur'])}")
    add("")
    add("Stima propria dal basso: famiglie dell'area euro × quota che detiene stablecoin × importo medio")
    add(f"detenuto × quota in dollari, dall'indagine BCE sui consumatori. Il programma stima un intervallo.")
    add("")
    add("| | Miliardi di euro | Cosa rappresenta |")
    add("|---|---|---|")
    add(f"| Minimo | {n(ref['minimo_mld_eur'])} | Ipotesi prudenti su importi e quota in dollari |")
    add(f"| **Centro** | **{n(ref['centrale_mld_eur'])}** | Livello di riferimento del programma |")
    add(f"| Massimo | {n(ref['massimo_mld_eur'])} | Ipotesi alte su importi e quota in dollari |")
    add(f"| Estremo superiore dichiarato | {n(ref['estremo_superiore_dichiarato_mld_eur'])} | Variante individui: conta più volte la stessa famiglia |")
    add(f"| Confronto: ipotesi ESM, quota 7,5% | {n(lv['base_mld_eur'])} | Quota assunta dall'ESM × circolazione di USDT e USDC del {day(m1['data_circolazione'])} ({n(circ['usdt_piu_usdc'])} mld $) |")
    add(f"| Confronto: ipotesi ESM, quota 15% | {n(lv['alto_mld_eur'])} | Come sopra, quota doppia |")
    add("")
    add("L'indagine copre 11 paesi ed è definita sperimentale dalla BCE; l'estensione a 21 paesi è un'ipotesi.")
    add("Le altre due strade tentate (riserve degli exchange, dati nazionali) non confermano la stima: il")
    add("criterio fissato nel report 08 avrebbe pubblicato solo il minimo. La scelta dell'intervallo come")
    add("riferimento è del 25 novembre 2026, successiva ai risultati, ed è annotata nel registro di SPEC.md.")
    add("")

    # 2. Andamento
    ip = m2["indice_principale"]
    add(f"## 2. Andamento: quota EUR dei volumi stablecoin/fiat, settimana {week(ip['ultima_settimana'])}")
    add("")
    flags = m2.get("segnalazione", {}).get("ultima_settimana", {})
    add("| Serie | Ultima settimana | Variazione (punti) | Media 52 settimane | Scarto della quota | Scarto del volume | Stato |")
    add("|---|---|---|---|---|---|---|")
    states = []
    for key, label in SERIES_LABELS.items():
        s, f = ip["serie"][key], flags.get(key, {})
        stato = f.get("stato", "n.d.")
        states.append((label, stato))
        add(f"| {label} | {pct(s['valore'])} | {signed(s['variazione_pp'])} | {pct(s['media_52_settimane'])} | {signed(f.get('scarto_quota', float('nan')))} | {signed(f.get('scarto_volume', float('nan')))} | {stato} |")
    add("")
    hot = [f"{label} ({stato})" for label, stato in states if stato in ("segnale", "da verificare")]
    if hot:
        add(f"Da guardare: {', '.join(hot)}. Uno scarto oltre 2 solo sul volume o solo sulla quota indica di solito")
        add("un movimento delle altre valute, non dell'euro.")
    else:
        add("Nessuna serie è segnalata: quota e volume contro euro sono entro 2 deviazioni standard dalle 52 settimane precedenti.")
    if (PROC / "m2_link_test.json").exists():
        lt = load("m2_link_test.json")
        add(f"L'indice misura trading in euro su {m2['exchange_attivi_min_max'][1]} exchange, non detenzioni né residenza. Test sul contenuto")
        add(f"predittivo per i depositi a vista delle famiglie: esito **{lt['risposta']}** (p = {n(lt['principale']['p_value'], 2)}, {lt['principale']['osservazioni']} mesi).")
    ex = m2.get("effetto_esclusione", {})
    if ex.get("differenza_pp"):
        d = ex["differenza_pp"]
        add(f"{', '.join(ex['esclusi'])} è fuori dall'indice per tutto lo storico. Senza, l'indice è in media {signed(d['usdt']['media'], 2)} punti per USDT")
        add(f"e {signed(d['usdc']['media'], 2)} per USDC; nell'ultima settimana comune {signed(d['usdt']['ultima_settimana'], 2)} e {signed(d['usdc']['ultima_settimana'], 2)}.")
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
    cr = None
    if (PROC / "m5_credit_euro_area.csv").exists():
        cr = pd.read_csv(PROC / "m5_credit_euro_area.csv")
        cr = cr[cr.regola_paesi == "R1"].set_index("scenario")
    add("| Scenario | Stablecoin detenute (mld $) | Depositi da sostituire (mld €) | Depositi a vista persi | Raccolta all'ingrosso in più | Credito in meno (mld €) |")
    add("|---|---|---|---|---|---|")
    for key, label in SCENARIO_LABELS.items():
        if key in ea.index:
            r = ea.loc[key]
            credito = "n.d." if cr is None or key not in cr.index else f"{n(cr.loc[key, 'uniforme_mld'])} (da {n(cr.loc[key, 'basso_mld'])} a {n(cr.loc[key, 'alto_mld'])})"
            add(f"| {label} | {n(r.importo_mld_usd, 0 if r.importo_mld_usd >= 100 else 1)} | {n(r.deflusso_mld_eur)} | {pct(r.perdita_depositi_a_vista, 2 if r.perdita_depositi_a_vista < 0.01 else 1)} | {pct(r.aumento_raccolta_ingrosso, 2 if r.aumento_raccolta_ingrosso < 0.01 else 1)} | {credito} |")
    add("")
    thr = {round(t["perdita_depositi_a_vista_area"], 2): t for t in m4["soglie"]}
    t5 = thr[0.05]
    add(f"Perché l'area perda il 5% dei depositi a vista servirebbero {n(t5['importo_mld_usd'], 0)} miliardi di dollari di stablecoin")
    add(f"detenute dai residenti, {n(t5['importo_mld_usd'] / (ref['centrale_mld_eur'] * m4['cambio_usd_per_eur']), 0)} volte il centro della stima propria.")
    byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
    s2 = byc[(byc.scenario == "S2_alto_2030") & (byc.regola_paesi == "R1") & (byc.regola_depositi == "T1")].sort_values("aumento_raccolta_ingrosso", ascending=False)
    lead, last = s2.head(3), s2.iloc[-1]
    add("Nello scenario ESM alto l'aumento di raccolta all'ingrosso necessario è massimo in")
    add(", ".join(f"{r.nome} (+{pct(r.aumento_raccolta_ingrosso, 0)})" for r in lead.itertuples()) + f" e minimo in {last.nome} (+{pct(last.aumento_raccolta_ingrosso, 1)}).")
    add("È un calcolo contabile con sostituzione piena dei depositi, non una previsione. Il credito in meno")
    add("applica coefficienti del Working Paper BCE 3199, stimati su singole banche, ad aggregati nazionali:")
    add("il primo valore è la regola uniforme (0,5 euro di prestiti per euro di depositi), tra parentesi")
    add("l'intervallo tra coefficiente basso e alto. Variante continua e a soglia nell'applicazione.")
    add("")
    if (PROC / "m5_two_channel_map.csv").exists():
        mp = pd.read_csv(PROC / "m5_two_channel_map.csv", index_col=0)
        add("## 5. Mappa a due canali")
        add("")
        add("| Quadrante | Paesi |")
        add("|---|---|")
        for q, label in QUADRANTS.items():
            add(f"| {q} - {label} | {', '.join(mp[mp.quadrante == q].sort_values('depositi_a_vista', ascending=False).nome)} |")
        add("")
        add("Nel quadrante A il rischio è la perdita di depositi e di credito; nel C è la minore presa della")
        add("politica monetaria interna sulle banche già finanziate in dollari.")
        add("")

    if (PROC / "m6_summary.json").exists():
        m6 = load("m6_summary.json")
        k, t, c, a = m6["criterio_di_sufficienza"], m6["soglia_quota_retail"], m6["campione"], m6["confronto_modulo5_paesi_coperti"]
        add("## 6. Singole banche (esercizio di trasparenza EBA 2025)")
        add("")
        add(f"{k['banche_con_dati_completi']} banche dell'area euro con tutte le voci, su {k['banche_area_euro_nel_campione']} nell'esercizio, in {k['paesi_coperti']} paesi su 21;")
        add(f"dati al {day(m6['data_dei_dati'])}. Coprono il {pct(c['copertura_area_su_bsi'], 0)} dell'attivo delle banche residenti e il {pct(c['copertura_area_su_consolidato'], 0)} di quello consolidato.")
        add(f"Soglia di quota retail tra banche: {pct(t['valore'])} ({t['banche_sopra']} banche sopra); tra paesi era {pct(t['soglia_tra_paesi_modulo5'])}.")
        add("")
        add("| Prestiti in meno al livello centrale, paesi coperti | Miliardi di euro | Per euro di deflusso |")
        add("|---|---|---|")
        for label, key in (("**Modulo 6, coefficienti banca per banca**", "m6"), ("Modulo 5, regola uniforme", "m5_uniforme"), ("Modulo 5, variante continua", "m5_continua"),
                           ("Modulo 5, variante a soglia", "m5_soglia"), ("Modulo 5, coefficiente basso", "m5_basso"), ("Modulo 5, coefficiente alto", "m5_alto")):
            add(f"| {label} | {n(a[key], 1)} | {n(a[key] / a['deflusso_paesi_coperti'], 2)} |")
        add("")
        add("Dati pubblici per banca, non dati di vigilanza: l'ordine delle banche non è un giudizio sulla solidità.")
        add("")

    # Avvertenze e stato
    add("## Cosa questa pagina non dice")
    add("")
    add("- Non misura quante stablecoin detengono i residenti dell'area euro: stima un intervallo da un'indagine e da ipotesi dichiarate.")
    add("- Non stima effetti causali: il credito in meno applica coefficienti pubblicati, come ordine di grandezza.")
    add("- Non è un sistema di allerta precoce: la segnalazione marca valori insoliti, non anticipa i depositi.")
    add("")
    add("## Dati e aggiornamento")
    add("")
    add("| Modulo | Dati aggiornati a | Ultima esecuzione | Dettagli |")
    add("|---|---|---|---|")
    dates = {"modulo1": day(m1["data_circolazione"]), "modulo2": "settimana " + week(ip["ultima_settimana"]),
             "modulo3": month(m3["ultimo_mese"]), "modulo4": "bilanci di " + month(m4["mese_bilanci"])}
    reports = {"modulo1": "reports/06_module1_level.md", "modulo2": "reports/03_module2_weekly_index.md",
               "modulo3": "reports/04_module3_ranking.md", "modulo4": "reports/05_module4_scenarios.md",
               "modulo5": "reports/07_module5_credit.md", "modulo6": "reports/12_refinements_language_banks.md"}
    dates["modulo5"] = "bilanci di " + month(m4["mese_bilanci"])
    dates["modulo6"] = "30 giugno 2025"
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
    add("**Cosa aggiunge questo al programma finale**: i risultati di tutti i moduli in una pagina sola, sempre")
    add("allineata ai dati perché generata dal codice e non scritta a mano.")
    add("")
    OUT.write_text("\n".join(L))
    print(f"scritto {OUT.name}: {len(L)} righe")


if __name__ == "__main__":
    main()
