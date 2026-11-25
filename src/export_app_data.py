"""Strato dati dell'applicazione: esporta i risultati in file JSON, uno per sezione.

L'applicazione web legge solo questi file (web/public/data/). Ogni file ha la versione
dello schema, la data di generazione, la data dei dati e una descrizione dei campi;
meta.json riporta lo stato di ogni fonte. La descrizione completa è in
web/public/data/README.md, generato qui.

Uso: python src/export_app_data.py            # esporta; scarica i confini GISCO se mancano
     python src/export_app_data.py --offline  # non scarica nulla
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests

import module4_scenarios as m4
import module5_credit as m5

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
OUT = ROOT / "web" / "public" / "data"
SCHEMA = "1.0.0"
GISCO = "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson"
NAMES = m5.NAMES
NOW = datetime.now(timezone.utc).isoformat(timespec="seconds")
DOCS: dict[str, dict] = {}


def load(name: str) -> dict:
    return json.loads((PROC / name).read_text())


def rnd(x, d=6):
    if isinstance(x, float):
        return None if x != x else round(x, d)
    if isinstance(x, dict):
        return {k: rnd(v, d) for k, v in x.items()}
    if isinstance(x, (list, tuple)):
        return [rnd(v, d) for v in x]
    return x


def write(name: str, description: str, data_date: dict, fields: dict, payload: dict) -> None:
    doc = {"schema": SCHEMA, "file": name, "generato_il": NOW, "dati_al": data_date, "descrizione": description, "campi": fields, **rnd(payload)}
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    DOCS[name] = {"descrizione": description, "campi": fields}


def spec_section(title: str) -> str:
    s = (ROOT / "SPEC.md").read_text()
    a = s.index(title)
    b = s.find("\n## ", a + 5)
    return s[a:b if b > 0 else len(s)]


def spec_table(title: str) -> list[dict]:
    rows = [ln for ln in spec_section(title).splitlines() if ln.startswith("|")]
    head = [c.strip() for c in rows[0].strip("|").split("|")]
    return [dict(zip(head, [c.strip() for c in ln.strip("|").split("|")])) for ln in rows[2:]]


def spec_bullets(title: str) -> list[str]:
    text = spec_section(title)
    items = re.findall(r"^- (.*?)(?=\n- |\n\n|\Z)", text, re.S | re.M)
    return [re.sub(r"\s+", " ", i).replace("**", "") for i in items]


def gisco(offline: bool) -> None:
    """Confini dei paesi da Eurostat GISCO, scala 1:20 milioni, ridotti all'Europa."""
    path = OUT / "geo" / "europa.geo.json"
    if path.exists() or offline:
        return
    r = requests.get(GISCO, timeout=180)
    r.raise_for_status()
    feats = []
    for f in r.json()["features"]:
        code = f["properties"]["CNTR_ID"]
        code = "GR" if code == "EL" else code
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        keep = []
        for p in polys:  # si tengono i poligoni il cui baricentro approssimato cade in Europa
            xs, ys = [c[0] for c in p[0]], [c[1] for c in p[0]]
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            if -12 <= cx <= 36 and 33.5 <= cy <= 72:
                keep.append([[[round(c[0], 3), round(c[1], 3)] for c in ring] for ring in p])
        if keep:
            feats.append({"type": "Feature", "properties": {"code": code, "name": NAMES.get(code, f["properties"]["NAME_ENGL"]), "area_euro": code in NAMES},
                          "geometry": {"type": "MultiPolygon", "coordinates": keep}})
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"type": "FeatureCollection", "fonte": "Eurostat GISCO, Countries 2024, 1:20M. © EuroGeographics per i confini amministrativi", "features": feats}, separators=(",", ":")))


def day_it(iso: str) -> str:
    months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    y, m, d = iso[:10].split("-")
    return f"{int(d)} {months[int(m) - 1]} {y}"


def missing_pairs(log: pd.DataFrame, store: pd.DataFrame) -> dict | None:
    """Coppie che all'ultimo scarico non hanno risposto pur avendo dati nello storico.

    Sono quelle che contano: le settimane nuove escono senza di loro. Le coppie che non
    hanno mai dato dati (per esempio non più quotate) sono elencate a parte e non pesano.
    Il peso è la quota dei volumi totali nelle ultime quattro settimane in cui la coppia
    era presente.
    """
    failed = log[log.status == "errore"]
    if failed.empty:
        return None
    known = store.merge(failed[["exchange", "symbol"]].drop_duplicates(), on=["exchange", "symbol"])
    never = sorted({f"{r.exchange} {r.symbol}" for r in failed.itertuples()} - {f"{r.exchange} {r.symbol}" for r in known.itertuples()})
    if known.empty:
        return {"exchange": [], "coppie": [], "maiDisponibili": never, "quotaVolume": 0.0, "datiFinoAl": None}
    last = known.date.max()
    start = (pd.Timestamp(last) - pd.Timedelta(days=27)).strftime("%Y-%m-%d")
    window = store[(store.date >= start) & (store.date <= last)]
    total = float(window.volume_stable.sum())
    lost = float(known[(known.date >= start) & (known.date <= last)].volume_stable.sum())
    return {"exchange": sorted(known.exchange.unique()), "coppie": sorted({f"{r.exchange} {r.symbol}" for r in known.itertuples()}),
            "maiDisponibili": never, "quotaVolume": lost / total if total else 0.0, "datiFinoAl": known.groupby(["exchange", "symbol"]).date.max().min()}


def load_missing_pairs() -> dict | None:
    log_path, store_path = PROC / "m2_last_fetch_log.csv", RAW / "m2_daily_volumes.csv"
    if not log_path.exists() or not store_path.exists():
        return None
    return missing_pairs(pd.read_csv(log_path), pd.read_csv(store_path))


def sources_status(status: dict, m1: dict, m2: dict, m3: dict, m4s: dict, m5s: dict) -> list[dict]:
    mods = status.get("moduli", {})
    offline = status.get("modalita") == "senza rete"

    def state(module: str) -> tuple[str, str]:
        st = mods.get(module, {})
        if st.get("esito") == "errore":
            return "ultimo dato valido", st.get("messaggio", "la fonte non ha risposto")
        if offline or not st:
            return "non aggiornata in questa esecuzione", "ricalcolo dai dati già scaricati"
        return "aggiornata", ""

    last_week = m2["indice_principale"]["ultima_settimana"]
    missing = load_missing_pairs()
    rows = []
    for sid, name, module, date in (
        ("bce_bsi", "BCE, bilanci bancari mensili (BSI)", "modulo3", m3["ultimo_mese"]),
        ("exchange", "25 exchange, volumi giornalieri stablecoin/fiat", "modulo2", "settimana del " + last_week),
        ("defillama", "DefiLlama, circolazione di USDT e USDC", "modulo1", m1["data_circolazione"]),
        ("bce_cambio", "BCE, cambio di riferimento euro/dollaro", "modulo4", m4s["data_cambio"]),
        ("eurostat", "Eurostat, popolazione e famiglie", "livello_proprio", "1° gennaio " + str(m4s["anno_popolazione"])),
        ("bri_lbs", "BRI, passività bancarie per valuta", "modulo5", m5s["mappa"]["trimestre_bri"]),
        ("bce_bsi_valuta", "BCE, BSI trimestrale per valuta", "modulo5", m5s["mappa"]["trimestre_bsi"]),
    ):
        st, msg = state(module)
        detail = msg
        if sid == "exchange":
            held = m2.get("settimane_trattenute", {})
            parts = []
            if missing and missing["coppie"]:
                share = f"{100 * missing['quotaVolume']:.1f}".replace(".", ",")
                parts.append(f"senza risposta all'ultimo scarico: {', '.join(missing['coppie'])} "
                             f"({share}% dei volumi nelle quattro settimane fino al {missing['datiFinoAl']}); le settimane successive escono senza")
            if missing and missing["maiDisponibili"]:
                parts.append(f"coppie mai disponibili: {', '.join(missing['maiDisponibili'])}")
            if held:
                parts.append(f"settimane trattenute perché incomplete: {', '.join(held)}")
            detail = "; ".join([p for p in [msg] + parts if p])
            if held and st == "aggiornata":
                st = "ultimo dato valido"
            elif missing and missing["coppie"] and st == "aggiornata":
                st = "aggiornata in parte"
        rows.append({"id": sid, "nome": name, "modulo": module, "dati_al": date, "stato": st, "dettaglio": detail})
    for sid, name, date in (
        ("bce_ces", "BCE, Bollettino economico 7/2026, indagine sui consumatori (CES)", "agosto e novembre 2025"),
        ("bce_space", "BCE, indagine SPACE 2024", "2023-2024"),
        ("bce_wp3199", "BCE, Working Paper 3199", "marzo 2026"),
        ("esm_wp79", "ESM, Working Paper 79", "terzo trimestre 2025"),
        ("gisco", "Eurostat GISCO, confini dei paesi", "2024"),
    ):
        rows.append({"id": sid, "nome": name, "modulo": "statica", "dati_al": date, "stato": "statica", "dettaglio": "documento pubblicato, verificato sull'originale"})
    return rows


def main() -> None:
    offline = "--offline" in sys.argv
    OUT.mkdir(parents=True, exist_ok=True)
    m1, m2, m3, m4s, m5s = load("m1_level.json"), load("m2_summary.json"), load("m3_summary.json"), load("m4_summary.json"), load("m5_summary.json")
    own, link = load("level_own.json"), load("m2_link_test.json")
    status = load("run_status.json") if (PROC / "run_status.json").exists() else {}
    month = m3["ultimo_mese"]
    try:
        gisco(offline)
        geo_ok = (OUT / "geo" / "europa.geo.json").exists()
    except Exception as exc:  # la mappa resta quella già presente, se c'è
        geo_ok = (OUT / "geo" / "europa.geo.json").exists()
        print(f"confini GISCO non scaricati: {exc}")

    # ---- simulatore: bilanci, pesi e coefficienti con cui il browser rifà i calcoli
    b, _ = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    retail = pd.read_csv(PROC / "m5_retail_share.csv", index_col=0)
    r3 = pd.read_csv(PROC / "m4_r3_weights.csv", index_col=0)
    rank = pd.read_csv(PROC / "m3_ranking_latest.csv", index_col=0)
    mp = pd.read_csv(PROC / "m5_two_channel_map.csv", index_col=0)
    ref = own["livello_di_riferimento"]
    fx = inp["usd_per_eur"]
    countries = []
    for code in sorted(NAMES, key=lambda k: NAMES[k]):
        countries.append({
            "code": code, "nome": NAMES[code], "vista": b.vista[code], "vistaFam": b.vista_fam[code], "clientela": b.clientela[code],
            "ingrosso": b.ingrosso[code], "totale": b.totale[code], "prestiti": retail.prestiti[code], "pop": inp["popolazione"][code],
            "r3": r3.peso[code], "quotaPossessori": r3.quota_possessori[code], "possessoriImputati": bool(r3.imputato[code]),
            "quotaRetail": retail.quota_retail[code], "retailAlta": bool(retail.quota_retail_alta[code]), "pesoContinuo": retail.peso_continuo[code],
            "posizione": int(rank.pos_indicatore[code]), "indicatore": rank.indicatore[code], "c1": rank.C1[code], "c2": rank.C2[code], "c3": rank.C3[code],
            "usd": mp.dollari[code], "fonteUsd": mp.fonte_dollari[code], "quadrante": mp.quadrante[code],
        })
    presets = [
        {"id": "P_minimo", "nome": "Stima propria, minimo", "eur": ref["minimo_mld_eur"]},
        {"id": "P_centrale", "nome": "Stima propria, centro", "eur": ref["centrale_mld_eur"]},
        {"id": "P_massimo", "nome": "Stima propria, massimo", "eur": ref["massimo_mld_eur"]},
        {"id": "ESM_oggi", "nome": "Ipotesi ESM oggi (7,5%)", "eur": m1["livello"]["base_mld_usd"] / fx},
        {"id": "S1", "nome": "ESM base 2030", "eur": 143 / fx}, {"id": "S2", "nome": "ESM alto 2030", "eur": 300 / fx},
        {"id": "S3", "nome": "ESM alto 2030, quota 15%", "eur": 600 / fx},
    ]
    coef = m5s["coefficienti"]
    write("simulatore.json", "Bilanci bancari per paese, pesi delle regole di ripartizione e coefficienti: tutto ciò che serve a rifare nel browser i calcoli dei moduli 4 e 5.",
          {"bilanci": month, "cambio": inp["data_cambio"]},
          {"paesi[].vista": "depositi a vista di famiglie e imprese, miliardi di euro", "paesi[].vistaFam": "depositi a vista delle famiglie", "paesi[].clientela": "depositi totali di famiglie e imprese",
           "paesi[].ingrosso": "titoli di debito emessi più depositi da IFM", "paesi[].totale": "totale del passivo", "paesi[].prestiti": "prestiti a famiglie e imprese",
           "paesi[].pop": "popolazione (peso della regola R2)", "paesi[].r3": "possessori di cripto-attività stimati (peso della regola R3)", "paesi[].pesoContinuo": "peso tra 0 e 1 per la variante continua del credito",
           "coefficienti": "Working Paper BCE 3199: regola uniforme, deviazione standard in punti, coefficienti basso e alto (tabella 1, colonne 3 e 4)", "livello": "livello di riferimento in miliardi di euro",
           "predefiniti[].eur": "importo detenuto in miliardi di euro, al cambio dei bilanci per gli scenari definiti in dollari"},
          {"cambioUsdPerEur": fx, "dataCambio": inp["data_cambio"], "meseBilanci": month, "paesi": countries, "predefiniti": presets,
           "coefficienti": {"uniforme": coef["regola_uniforme"], "sd": coef["deviazione_standard_pp"], "basso": coef["col3"]["basso"], "alto": coef["col3"]["alto"],
                            "bassoCol4": coef["col4"]["basso"], "altoCol4": coef["col4"]["alto"]},
           "sogliaRetail": m5s["soglia_quota_retail"]["valore"], "ancoraggi": m5s["variante_continua"],
           "livello": {"minimo": ref["minimo_mld_eur"], "centrale": ref["centrale_mld_eur"], "massimo": ref["massimo_mld_eur"], "estremoSuperiore": ref["estremo_superiore_dichiarato_mld_eur"]},
           "incertezza": {"sostituzioneMinima": 0.5, "sostituzioneMassima": 1.0},
           "r3Fonte": m4s["regola_R3"]["fonte"], "mediane": {"c1": m5s["mappa"]["mediana_depositi_a_vista"], "usd": m5s["mappa"]["mediana_dollari"]}})

    # ---- schede paese: serie storiche, un file per paese
    comp = pd.read_csv(PROC / "m3_composition.csv", dtype={"mese": str})
    idx3 = pd.read_csv(PROC / "m3_index.csv", dtype={"mese": str})
    parts = [c for c in comp.columns if c not in ("paese", "mese", "totale_passivo_mln", "scarto")]
    for code in NAMES:
        c, i = comp[comp.paese == code].sort_values("mese"), idx3[idx3.paese == code].sort_values("mese")
        write(f"paesi/{code}.json", f"Serie storiche mensili di {NAMES[code]}: composizione del passivo e indicatore di esposizione.", {"bilanci": c.mese.max()},
              {"composizione.voci": "quote sul totale del passivo, una serie per voce", "composizione.totale": "totale del passivo, miliardi di euro",
               "indicatore.posizione": "posizione in classifica tra i paesi con dati in quel mese", "indicatore.c1,c2,c3": "componenti dell'indicatore (quote)"},
              {"code": code, "nome": NAMES[code],
               "composizione": {"mesi": c.mese.tolist(), "totale": (c.totale_passivo_mln / 1000).round(2).tolist(), "voci": {p: c[p].round(4).tolist() for p in parts}},
               "indicatore": {"mesi": i.mese.tolist(), "valore": i.indicatore.round(3).tolist(), "posizione": i.pos_indicatore.tolist(), "paesi": i.paesi_nel_mese.tolist(),
                              "c1": i.C1.round(4).tolist(), "c2": i.C2.round(4).tolist(), "c3": i.C3.round(4).tolist()}})

    # ---- mappa a due canali
    write("canali.json", "Mappa a due canali: depositi a vista sul passivo e passività in dollari, con ciò che ogni quadrante implica per la trasmissione.",
          {"bilanci": month, "dollari": m5s["mappa"]["trimestre_bri"]},
          {"quadranti[].implicazione": "testo ricavato dai coefficienti del Working Paper BCE 3199", "confrontoFonti": "paragonabilità tra misura BRI e misura BSI trimestrale"},
          {"mediane": {"c1": m5s["mappa"]["mediana_depositi_a_vista"], "usd": m5s["mappa"]["mediana_dollari"]},
           "correlazioneDiRango": m5s["mappa"]["correlazione_di_rango_assi"], "confrontoFonti": m5s["mappa"]["confronto_fonti"],
           "cambianoConRiscalatura": m5s["mappa"]["paesi_che_cambiano_con_riscalatura"],
           "quadranti": [
               {"id": "A", "titolo": "Depositi alti, dollari bassi", "canale": "Sostituzione dei depositi",
                "implicazione": "Un deflusso riduce di più il credito (coefficiente delle banche ad alta quota retail: -3,09 punti di crescita dei prestiti per deviazione standard, contro -0,44). Spostandosi verso la raccolta all'ingrosso, la trasmissione ai tassi sui prestiti diventerebbe più forte (da circa 70% a 80% dopo un anno, da 100% a 120% dopo due) e quella ai tassi sui depositi salirebbe da circa 10% a oltre 30%."},
               {"id": "B", "titolo": "Entrambi alti", "canale": "Entrambi i canali",
                "implicazione": "Esposti alla sostituzione dei depositi come il quadrante A e a una raccolta in dollari già rilevante come il quadrante C."},
               {"id": "C", "titolo": "Depositi bassi, dollari alti", "canale": "Raccolta in valuta",
                "implicazione": "Poco esposti alla perdita di depositi, ma già finanziati all'ingrosso e in dollari: per banche di questo tipo un aumento di 25 punti base del tasso di policy non riduce i prestiti in modo significativo (+0,29 contro -1,33 delle banche con poca raccolta in dollari), e la reazione alla politica monetaria statunitense è più forte."},
               {"id": "D", "titolo": "Entrambi bassi", "canale": "Nessuno dei due", "implicazione": "I meno esposti su entrambi i canali."}],
           "avvertenza": "Coefficienti stimati su singole banche, applicati qui a paesi interi: qualificano i quadranti, non danno numeri per paese."})

    # ---- monitor settimanale
    wk = pd.read_csv(PROC / "m2_weekly_index.csv", index_col=0)
    lg = pd.read_csv(PROC / "m2_weekly_index_long.csv", index_col=0)
    fl = pd.read_csv(PROC / "m2_flags.csv")
    series = ["usdt", "usdt_senza_coinbase", "usdc", "usdc_senza_coinbase"]
    flags = {s: {"settimane": g.week.tolist(), "quota": g.quota_eur.round(5).tolist(), "volumeEur": g.volume_eur_mld.round(4).tolist(),
                 "scartoQuota": [None if v != v else round(v, 2) for v in g.scarto_quota], "scartoVolume": [None if v != v else round(v, 2) for v in g.scarto_volume],
                 "stato": g.stato.tolist()} for s, g in fl.groupby("serie")}
    write("monitor.json", "Indice settimanale della quota EUR dei volumi stablecoin/fiat, volumi assoluti, stato delle segnalazioni e storico lungo.",
          {"ultimaSettimana": m2["indice_principale"]["ultima_settimana"]},
          {"principale": "25 exchange, dal dicembre 2024", "lungo": "senza Kraken e Gemini, dal gennaio 2023: confrontabile per direzione, non per livello",
           "segnalazioni[serie].stato": "segnale, da verificare, nessuno, storico insufficiente",
           "fontiMancanti": "coppie con storico che non hanno risposto all'ultimo scarico, con la loro quota dei volumi; null se hanno risposto tutte", "volumi": "miliardi di unità di stablecoin (circa dollari) a settimana"},
          {"serie": series,
           "principale": {"settimane": wk.index.tolist(), **{s: wk[s].round(5).tolist() for s in series}, "totale": wk.totale.round(5).tolist(),
                          "volEurUsdt": wk.volume_eur_usdt_mld.round(4).tolist(), "volEurUsdc": wk.volume_eur_usdc_mld.round(4).tolist(),
                          "volFiatUsdt": wk.volume_fiat_usdt_mld.round(4).tolist(), "volFiatUsdc": wk.volume_fiat_usdc_mld.round(4).tolist(),
                          "exchange": wk.exchange_attivi.tolist()},
           "lungo": {"settimane": lg.index.tolist(), **{s: lg[s].round(5).tolist() for s in series},
                     "volEurUsdt": lg.volume_eur_usdt_mld.round(4).tolist(), "volEurUsdc": lg.volume_eur_usdc_mld.round(4).tolist()},
           "segnalazioni": flags, "statistiche": m2["indice_principale"]["serie"], "regola": m2["segnalazione"]["regola"],
           "settimaneTrattenute": m2.get("settimane_trattenute", {}),
           "fontiMancanti": load_missing_pairs(),
           "testPredittivo": {"risposta": link["risposta"], "pValue": link["principale"]["p_value"], "osservazioni": link["principale"]["osservazioni"], "rapportoRmse": link["principale"]["rapporto_rmse"]},
           "avvertenza": "L'indice misura trading in euro su exchange centralizzati, non detenzioni né residenza. Il test pre-registrato non trova contenuto predittivo per i depositi."})

    # ---- stima del livello
    ms = pd.read_csv(PROC / "m1_monthly_series.csv", index_col=0)
    b1 = own["B1"]
    write("livello.json", "Stima dal basso del valore di stablecoin in dollari detenuto nell'area euro, con le ipotesi modificabili, e confronto con l'ipotesi ESM.",
          {"indagine": "agosto e novembre 2025", "circolazione": m1["data_circolazione"]},
          {"fasce[].percentuale": "quota di detentori nella fascia, misurata sul grafico B riquadro b del riquadro BCE", "unita": "famiglie e adulti dei 21 paesi (Eurostat)",
           "quotaDollari": "minimo, centrale e massimo della quota in dollari", "esm.serie": "livello ESM di base a fine mese, miliardi di euro"},
          {"fasce": own["parametri"]["fasce"], "quotaDetentori": own["parametri"]["quota_detentori"], "quotaDollari": own["parametri"]["quota_in_dollari"],
           "unita": {"famiglie": b1["unita"]["famiglie"], "individui": b1["unita"]["individui"]},
           "riferimento": ref, "b1": {"famiglie": b1["famiglie"], "individui": b1["individui"]},
           "esm": {"data": m1["data_circolazione"], "baseEur": m1["livello"]["base_mld_eur"], "altoEur": m1["livello"]["alto_mld_eur"],
                   "serie": {"mesi": ms.index.tolist(), "base": ms.livello_base_mld_eur.round(3).tolist(), "alto": ms.livello_alto_mld_eur.round(3).tolist()}},
           "altreStrade": {"b2": {"esito": own["B2"]["esito"], "motivo": own["B2"].get("motivo"), "saldiClientiMldUsd": own["B2"].get("totale_saldi_clienti_mld_usd")},
                           "b3": {"centrale": own["B3"].get("centrale_mld_eur"), "ipotesi": own["B3"].get("ipotesi")}},
           "criterio": {"esito": own["verdetto"]["esito"], "nota": ref["decisione"]},
           "avvertenza": "Stima da un'indagine su 11 paesi che la BCE definisce sperimentale, estesa a 21. Le altre due strade tentate non l'hanno confermata."})

    # ---- metodo e dati
    sources = sources_status(status, m1, m2, m3, m4s, m5s)
    missing_ex = load_missing_pairs()
    write("metodo.json", "Fonti, limiti dichiarati, metodi scartati e stato dell'ultimo aggiornamento.", {"aggiornamento": status.get("eseguito_il", NOW)},
          {"fontiDescrizione": "tabella delle fonti di SPEC.md", "limiti": "sezione 4 di SPEC.md", "metodiScartati": "sezione 5 di SPEC.md", "coefficienti": "Working Paper BCE 3199, con origine"},
          {"fontiDescrizione": spec_table("## 3. Fonti dati confermate"), "limiti": spec_bullets("## 4. Cosa il programma NON promette"),
           "metodiScartati": spec_table("## 5. Metodi scartati"),
           "coefficienti": [
               {"nome": "Regola depositi → prestiti", "valore": "100 mld € di depositi retail in meno → circa 50 mld € di prestiti in meno", "origine": "Sezione 3.2, p. 18"},
               {"nome": "Calo dei depositi a vista, bassa quota retail", "valore": "-0,441 (non significativo); -0,342 con controllo della domanda", "origine": "Tabella 1, colonne 3 e 4"},
               {"nome": "Calo dei depositi a vista, alta quota retail", "valore": "-3,089; -4,173 con controllo della domanda", "origine": "Tabella 1, colonne 3 e 4"},
               {"nome": "Prestiti a +25 pb, bassa raccolta in dollari", "valore": "-1,590; -1,330 con controllo della domanda", "origine": "Tabella 3, colonne 1 e 3"},
               {"nome": "Prestiti a +25 pb, alta raccolta in dollari", "valore": "-0,064; +0,293 (non significativi)", "origine": "Tabella 3, colonne 2 e 4"},
               {"nome": "Trasmissione ai tassi sui prestiti", "valore": "70% a un anno, 100% a due; 80% e 120% per banche dipendenti dall'ingrosso", "origine": "Sezione 4.2, figura 9"},
               {"nome": "Trasmissione ai tassi sui depositi", "valore": "circa 10%; oltre 30% per banche dipendenti dall'ingrosso", "origine": "Sezione 4.2, figura 9"}],
           "repo": "https://github.com/sqsw5ryvdh-netizen/euro-stablecoin-exposure"})

    # ---- panoramica
    ea = pd.read_csv(PROC / "m4_euro_area.csv")
    cr = pd.read_csv(PROC / "m5_credit_euro_area.csv")
    pick = lambda df, s: df[(df.scenario == s) & (df.regola_paesi == "R1") & (df.get("regola_depositi", "T1") == "T1")].iloc[0]
    e_c, c_c = pick(ea, "P_centrale"), cr[(cr.scenario == "P_centrale") & (cr.regola_paesi == "R1")].iloc[0]
    last_flags = m2["segnalazione"]["ultima_settimana"]
    write("panoramica.json", "Indicatori chiave, segnalazioni attive e date dei dati.", {"bilanci": month, "settimana": m2["indice_principale"]["ultima_settimana"], "circolazione": m1["data_circolazione"]},
          {"livello": "stima propria in miliardi di euro", "scenarioCentrale": "effetto del livello centrale con regola R1 e sostituzione piena", "indice[serie]": "quota EUR dell'ultima settimana e stato della segnalazione"},
          {"livello": {"minimo": ref["minimo_mld_eur"], "centrale": ref["centrale_mld_eur"], "massimo": ref["massimo_mld_eur"], "estremoSuperiore": ref["estremo_superiore_dichiarato_mld_eur"],
                       "esmBase": m1["livello"]["base_mld_eur"], "esmAlto": m1["livello"]["alto_mld_eur"]},
           "scenarioCentrale": {"deflusso": e_c.deflusso_mld_eur, "depositiAVistaPersi": e_c.perdita_depositi_a_vista, "aumentoIngrosso": e_c.aumento_raccolta_ingrosso,
                                "creditoUniforme": c_c.uniforme_mld, "creditoBasso": c_c.basso_mld, "creditoAlto": c_c.alto_mld, "creditoPct": c_c.uniforme_pct_prestiti},
           "indice": {s: {"valore": m2["indice_principale"]["serie"][s]["valore"], "variazione": m2["indice_principale"]["serie"][s]["variazione_pp"], **last_flags.get(s, {})} for s in series},
           "classifica": [{"code": r["paese"], "nome": r["nome"], "posizione": r["posizione"], "c1": r["C1"]} for r in m3["classifica"]],
           "depositiAVistaArea": m4s["area_euro"]["depositi_a_vista_mld"], "prestitiArea": m5s["prestiti_area_mld"],
           "testPredittivo": link["risposta"]})

    # ---- meta
    fresh = [s for s in sources if s["stato"] == "ultimo dato valido"]
    partial = [s for s in sources if s["stato"] == "aggiornata in parte"]
    notices = []
    if fresh:
        notices.append("Fonti non aggiornate nell'ultima esecuzione, mostrate con l'ultimo dato valido: " + "; ".join(f"{s['nome']} ({s['dati_al']})" for s in fresh) + ".")
    if partial and missing_ex and missing_ex["coppie"]:
        share = f"{100 * missing_ex['quotaVolume']:.1f}".replace(".", ",")
        notices.append(f"Indice settimanale aggiornato in parte: {', '.join(missing_ex['exchange'])} non ha risposto all'ultimo scarico ({share}% dei volumi). "
                       f"I suoi dati arrivano al {day_it(missing_ex['datiFinoAl'])}; le settimane successive escono senza.")
    files = sorted(DOCS) + ["meta.json"] + (["geo/europa.geo.json"] if geo_ok else [])
    write("meta.json", "Stato dell'aggiornamento e di ogni fonte, ed elenco dei file di dati.", {"aggiornamento": status.get("eseguito_il", NOW)},
          {"fonti[].stato": "aggiornata, aggiornata in parte, ultimo dato valido, non aggiornata in questa esecuzione, statica", "avviso": "testo da mostrare nell'applicazione quando una fonte non si è aggiornata"},
          {"aggiornamento": {"eseguitoIl": status.get("eseguito_il"), "modalita": status.get("modalita"), "moduli": status.get("moduli", {})},
           "fonti": sources, "fontiNonAggiornate": [s["nome"] for s in fresh], "fontiParziali": [s["nome"] for s in partial],
           "avviso": " ".join(notices),
           "file": files, "mappaDisponibile": geo_ok})

    readme = ["# Dati dell'applicazione", "", f"Generati da `src/export_app_data.py`. Schema {SCHEMA}. Non modificare a mano.", "",
              "Ogni file contiene `schema`, `file`, `generato_il`, `dati_al`, `descrizione` e `campi` (la documentazione dei campi), più i dati.", ""]
    for name in sorted(DOCS):
        readme += [f"## {name}", "", DOCS[name]["descrizione"], ""] + [f"- `{k}`: {v}" for k, v in DOCS[name]["campi"].items()] + [""]
    readme += ["## geo/europa.geo.json", "", "Confini dei paesi europei da Eurostat GISCO (Countries 2024, scala 1:20 milioni), con `code`, `name` e `area_euro`. © EuroGeographics per i confini amministrativi.", ""]
    (OUT / "README.md").write_text("\n".join(readme), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT.rglob("*.json")) / 1024
    print(f"dati dell'applicazione: {len(list(OUT.rglob('*.json')))} file JSON, {size:.0f} KB; fonti non aggiornate: {len(fresh)}, aggiornate in parte: {len(partial)}")


if __name__ == "__main__":
    main()
