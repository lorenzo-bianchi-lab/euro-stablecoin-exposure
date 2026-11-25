"""Strato dati dell'applicazione: esporta i risultati in file JSON, uno per sezione.

L'applicazione web legge solo questi file (web/public/data/). Contengono numeri e codici:
i testi dell'interfaccia stanno nei file di traduzione dell'applicazione (web/src/i18n/),
quelli ricavati da SPEC.md sono esportati in italiano e in inglese con le traduzioni di
src/i18n/spec_en.json. Ogni file ha la versione
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
SCHEMA = "2.0.0"   # 2.0.0: i testi sono nell'applicazione (file di traduzione); qui solo codici e numeri
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
    return [re.sub(r"\s+", " ", i).replace("**", "").strip() for i in items]


def spec_en() -> dict[str, str]:
    return json.loads((ROOT / "src" / "i18n" / "spec_en.json").read_text(encoding="utf-8"))


def spec_strings() -> list[str]:
    """Tutti i testi di SPEC.md che l'applicazione mostra: servono al test sulle traduzioni."""
    out: list[str] = []
    for title in ("## 3. Fonti dati confermate", "## 5. Metodi scartati"):
        rows = spec_table(title)
        out += list(rows[0]) + [v for r in rows for v in r.values()]
    return out + spec_bullets("## 4. Cosa il programma NON promette")


def bilingual_table(title: str) -> dict:
    """Tabella di SPEC.md in italiano e in inglese: intestazioni e righe come liste, nello stesso ordine."""
    en = spec_en()
    rows = spec_table(title)
    head = list(rows[0])
    tr = lambda v: en.get(v, v)
    return {"it": {"colonne": head, "righe": [[r[h] for h in head] for r in rows]},
            "en": {"colonne": [tr(h) for h in head], "righe": [[tr(r[h]) for h in head] for r in rows]}}


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
    log, store = pd.read_csv(log_path), pd.read_csv(store_path)
    excluded = load("m2_summary.json").get("pannello", {}).get("esclusi", [])  # gli exchange fuori dal pannello non contano
    return missing_pairs(log[~log.exchange.isin(excluded)], store[~store.exchange.isin(excluded)])


def sources_status(status: dict, m1: dict, m2: dict, m3: dict, m4s: dict, m5s: dict) -> list[dict]:
    """Stato di ogni fonte, in codici: aggiornata, parziale, ultimo_valido, non_aggiornata, statica."""
    mods = status.get("moduli", {})
    offline = status.get("modalita") == "senza rete"

    def state(module: str) -> tuple[str, str | None]:
        st = mods.get(module, {})
        if st.get("esito") == "errore":
            return "ultimo_valido", st.get("messaggio", "la fonte non ha risposto")
        if offline or not st:
            return "non_aggiornata", None
        return "aggiornata", None

    missing = load_missing_pairs()
    rows = []
    for sid, module, kind, date in (
        ("bce_bsi", "modulo3", "mese", m3["ultimo_mese"]),
        ("exchange", "modulo2", "settimana", m2["indice_principale"]["ultima_settimana"]),
        ("defillama", "modulo1", "giorno", m1["data_circolazione"]),
        ("bce_cambio", "modulo1", "giorno", m4s["data_cambio"]),
        ("eurostat", "livello_proprio", "anno", str(m4s["anno_popolazione"])),
        ("bri_lbs", "modulo5", "trimestre", m5s["mappa"]["trimestre_bri"]),
        ("bce_bsi_valuta", "modulo5", "trimestre", m5s["mappa"]["trimestre_bsi"]),
    ):
        st, msg = state(module)
        detail: dict = {"messaggio": msg} if msg else {}
        if sid == "exchange":
            held = m2.get("settimane_trattenute", {})
            detail["exchange"] = m2["pannello"]["exchange"]
            if missing and missing["coppie"]:
                detail.update({"senzaRisposta": missing["coppie"], "quotaVolume": missing["quotaVolume"], "finoAl": missing["datiFinoAl"]})
            if missing and missing["maiDisponibili"]:
                detail["maiDisponibili"] = missing["maiDisponibili"]
            if held:
                detail["trattenute"] = sorted(held)
            if held and st == "aggiornata":
                st = "ultimo_valido"
            elif missing and missing["coppie"] and st == "aggiornata":
                st = "parziale"
        rows.append({"id": sid, "modulo": module, "tipoData": kind, "datiAl": date, "stato": st, "dettaglio": detail})
    for sid, kind, date in (("eba", "giorno", "2025-06-30"), ("bce_cbd", "trimestre", "2025-Q2"), ("bce_ces", "testo", "ces"), ("bce_space", "testo", "space"),
                            ("bce_wp3199", "mese", "2026-03"), ("esm_wp79", "trimestre", "2025-Q3"), ("gisco", "anno", "2024")):
        rows.append({"id": sid, "modulo": "statica", "tipoData": kind, "datiAl": date, "stato": "statica", "dettaglio": {}})
    return rows


def banks_payload(m5s: dict) -> tuple[dict, dict, dict]:
    """Dati per banca del modulo 6: bilanci, quota retail, copertura e confronto con il modulo 5."""
    m6 = load("m6_summary.json")
    bk = pd.read_csv(PROC / "m6_banks.csv", index_col=0)
    by = pd.read_csv(PROC / "m6_by_country.csv", index_col=0)
    nan = lambda v: None if v != v else float(v)
    banks = [{"lei": lei, "nome": r.nome, "paese": r.paese, "attivo": r.totale_attivo, "depFam": r.dep_famiglie, "vistaFam": r.vista_famiglie,
              "depImp": r.dep_imprese, "vistaImp": r.vista_imprese, "depAltreFin": r.dep_altre_fin, "depBanche": r.dep_banche, "titoli": r.titoli_emessi,
              "prestiti": r.prestiti, "quotaRetail": r.quota_retail, "retailAlta": bool(r.quota_retail_alta), "rango": int(r.rango_quota_retail),
              "usa": nan(r.usa_su_esposizioni)} for lei, r in bk.iterrows()]
    countries = [{"code": k, "banche": int(r.banche), "alte": int(r.banche_alta_quota_retail) if r.banche else 0,
                  "attivoCampione": nan(r.totale_attivo_campione), "coperturaBsi": nan(r.copertura_su_bsi), "coperturaConsolidato": nan(r.copertura_su_consolidato),
                  "m6PerEuro": nan(r.m6_credito_per_euro), "m5": {v: nan(r[f"m5_{v}_per_euro"]) for v in ("basso", "alto", "soglia", "continua", "uniforme")},
                  "m5RetailAlta": bool(r.m5_quota_retail_alta)} for k, r in by.iterrows()]
    crit = m6["criterio_di_sufficienza"]
    payload = {"banche": banks, "paesi": countries, "soglia": m6["soglia_quota_retail"]["valore"], "mediana": m6["soglia_quota_retail"]["mediana"],
               "sogliaPaesi": m5s["soglia_quota_retail"]["valore"], "banchesSopra": m6["soglia_quota_retail"]["banche_sopra"],
               "criterio": {"nelCampione": crit["banche_area_euro_nel_campione"], "complete": crit["banche_con_dati_completi"], "paesi": crit["paesi_coperti"],
                            "soddisfatto": crit["soddisfatto"], "paesiSenzaBanche": crit["paesi_senza_banche"], "escluse": crit["banche_escluse"]},
               "copertura": {"bsi": m6["campione"]["copertura_area_su_bsi"], "consolidato": m6["campione"]["copertura_area_su_consolidato"],
                             "attivo": m6["campione"]["totale_attivo_mld"], "conUsa": m6["campione"]["banche_con_esposizione_usa"]},
               "confronto": m6["confronto_modulo5_paesi_coperti"], "scenarioDiControllo": m6["scenario_di_controllo"]}
    dates = {"banche": m6["data_dei_dati"], "bilanciPaese": m6["scenario_di_controllo"]["mese_bilanci_paese"]}
    fields = {"banche[]": "una riga per banca dell'area euro con tutte le voci; importi in miliardi di euro, dati consolidati al 30 giugno 2025",
              "banche[].quotaRetail": "depositi delle famiglie / (depositi delle famiglie + depositi di società finanziarie diverse dalle banche)",
              "banche[].retailAlta": "sopra il 75° percentile della quota retail tra le banche del campione", "banche[].vistaFam, vistaImp": "conti correnti e depositi overnight",
              "banche[].usa": "esposizioni creditizie originarie verso controparti statunitensi sul totale; null se gli Stati Uniti non sono tra i primi dieci paesi della banca",
              "paesi[].coperturaBsi": "totale attivo delle banche del campione sul totale attivo delle IFM del paese (BSI, giugno 2025); perimetri diversi, può superare 1",
              "paesi[].coperturaConsolidato": "lo stesso rapporto sul totale attivo consolidato di tutte le banche del paese (BCE, CBD2, secondo trimestre 2025)",
              "paesi[].m6PerEuro": "prestiti in meno per euro di deflusso, coefficienti applicati banca per banca, nello scenario di controllo",
              "paesi[].m5": "lo stesso rapporto con le varianti del modulo 5 sugli aggregati nazionali", "confronto": "somma sui paesi coperti, miliardi di euro"}
    return payload, dates, fields


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
            "usd": mp.dollari[code], "fonteUsd": "BRI" if mp.fonte_dollari[code] == "BRI" else "BSI", "quadrante": mp.quadrante[code],
        })
    presets = [
        {"id": "P_minimo", "eur": ref["minimo_mld_eur"]},
        {"id": "P_centrale", "eur": ref["centrale_mld_eur"]},
        {"id": "P_massimo", "eur": ref["massimo_mld_eur"]},
        {"id": "ESM_oggi", "eur": m1["livello"]["base_mld_eur"]},
        {"id": "S1", "eur": 143 / fx}, {"id": "S2", "eur": 300 / fx},
        {"id": "S3", "eur": 600 / fx},
    ]
    coef = m5s["coefficienti"]
    write("simulatore.json", "Bilanci bancari per paese, pesi delle regole di ripartizione e coefficienti: tutto ciò che serve a rifare nel browser i calcoli dei moduli 4 e 5.",
          {"bilanci": month, "cambio": inp["data_cambio"]},
          {"paesi[].vista": "depositi a vista di famiglie e imprese, miliardi di euro", "paesi[].vistaFam": "depositi a vista delle famiglie", "paesi[].clientela": "depositi totali di famiglie e imprese",
           "paesi[].ingrosso": "titoli di debito emessi più depositi da IFM", "paesi[].totale": "totale del passivo", "paesi[].prestiti": "prestiti a famiglie e imprese",
           "paesi[].pop": "popolazione (peso della regola R2)", "paesi[].r3": "possessori di cripto-attività stimati (peso della regola R3)", "paesi[].pesoContinuo": "peso tra 0 e 1 per la variante continua del credito",
           "coefficienti": "Working Paper BCE 3199: regola uniforme, deviazione standard in punti, coefficienti basso e alto (tabella 1, colonne 3 e 4)", "livello": "livello di riferimento in miliardi di euro",
           "predefiniti[].eur": "importo detenuto in miliardi di euro; gli scenari definiti in dollari sono convertiti al cambio unico del programma",
           "cambioUsdPerEur": "cambio unico del programma: riferimento BCE più recente alla data della circolazione (modulo 1)", "paesi[].fonteUsd": "BRI oppure BSI (trimestrale per valuta)"},
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
          {"quadranti": "A depositi alti e dollari bassi, B entrambi alti, C depositi bassi e dollari alti, D entrambi bassi; i testi sono nell'applicazione", "confrontoFonti": "paragonabilità tra misura BRI e misura BSI trimestrale"},
          {"mediane": {"c1": m5s["mappa"]["mediana_depositi_a_vista"], "usd": m5s["mappa"]["mediana_dollari"]},
           "correlazioneDiRango": m5s["mappa"]["correlazione_di_rango_assi"], "confrontoFonti": m5s["mappa"]["confronto_fonti"],
           "cambianoConRiscalatura": m5s["mappa"]["paesi_che_cambiano_con_riscalatura"],
           "quadranti": ["A", "B", "C", "D"]})

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
          {"principale": "indice principale, dal dicembre 2024", "pannello": "numero di exchange nell'indice principale e in quello lungo, ed exchange esclusi", "effettoEsclusione": "differenza tra indice senza e con gli exchange esclusi, in punti percentuali", "lungo": "senza Kraken e Gemini, dal gennaio 2023: confrontabile per direzione, non per livello",
           "segnalazioni[serie].stato": "segnale, da verificare, nessuno, storico insufficiente",
           "fontiMancanti": "coppie con storico che non hanno risposto all'ultimo scarico, con la loro quota dei volumi; null se hanno risposto tutte", "volumi": "miliardi di unità di stablecoin (circa dollari) a settimana"},
          {"serie": series,
           "principale": {"settimane": wk.index.tolist(), **{s: wk[s].round(5).tolist() for s in series}, "totale": wk.totale.round(5).tolist(),
                          "volEurUsdt": wk.volume_eur_usdt_mld.round(4).tolist(), "volEurUsdc": wk.volume_eur_usdc_mld.round(4).tolist(),
                          "volFiatUsdt": wk.volume_fiat_usdt_mld.round(4).tolist(), "volFiatUsdc": wk.volume_fiat_usdc_mld.round(4).tolist(),
                          "exchange": wk.exchange_attivi.tolist()},
           "lungo": {"settimane": lg.index.tolist(), **{s: lg[s].round(5).tolist() for s in series},
                     "volEurUsdt": lg.volume_eur_usdt_mld.round(4).tolist(), "volEurUsdc": lg.volume_eur_usdc_mld.round(4).tolist()},
           "segnalazioni": flags, "statistiche": m2["indice_principale"]["serie"], "pannello": m2["pannello"], "effettoEsclusione": m2["effetto_esclusione"],
           "settimaneTrattenute": m2.get("settimane_trattenute", {}),
           "fontiMancanti": load_missing_pairs(),
           "testPredittivo": {"risposta": link["risposta"], "pValue": link["principale"]["p_value"], "osservazioni": link["principale"]["osservazioni"], "rapportoRmse": link["principale"]["rapporto_rmse"]}})

    # ---- stima del livello
    ms = pd.read_csv(PROC / "m1_monthly_series.csv", index_col=0)
    b1 = own["B1"]
    write("livello.json", "Stima dal basso del valore di stablecoin in dollari detenuto nell'area euro, con le ipotesi modificabili, e confronto con l'ipotesi ESM.",
          {"indagine": "agosto e novembre 2025", "circolazione": m1["data_circolazione"]},
          {"fasce[].percentuale": "quota di detentori nella fascia, misurata sul grafico B riquadro b del riquadro BCE", "fasce[].minimo, massimo": "estremi della fascia in euro (per l'ultima, aperta, il massimo è un'ipotesi)", "unita": "famiglie e adulti dei 21 paesi (Eurostat)",
           "quotaDollari": "minimo, centrale e massimo della quota in dollari", "esm.serie": "livello ESM di base a fine mese, miliardi di euro"},
          {"fasce": [{k: v for k, v in f.items() if k != "fascia"} for f in own["parametri"]["fasce"]], "quotaDetentori": own["parametri"]["quota_detentori"], "quotaDollari": own["parametri"]["quota_in_dollari"],
           "unita": {"famiglie": b1["unita"]["famiglie"], "individui": b1["unita"]["individui"]},
           "riferimento": {k: v for k, v in ref.items() if k != "decisione"}, "b1": {"famiglie": b1["famiglie"], "individui": b1["individui"]},
           "esm": {"data": m1["data_circolazione"], "baseEur": m1["livello"]["base_mld_eur"], "altoEur": m1["livello"]["alto_mld_eur"],
                   "serie": {"mesi": ms.index.tolist(), "base": ms.livello_base_mld_eur.round(3).tolist(), "alto": ms.livello_alto_mld_eur.round(3).tolist()}},
           "altreStrade": {"b2": {"saldiClientiMldUsd": own["B2"].get("totale_saldi_clienti_mld_usd")}, "b3": {"centrale": own["B3"].get("centrale_mld_eur")}},
           "criterioSoddisfatto": own["verdetto"]["esito"] != "solo minimo di B1"})

    # ---- metodo e dati
    sources = sources_status(status, m1, m2, m3, m4s, m5s)
    en = spec_en()
    limits = spec_bullets("## 4. Cosa il programma NON promette")
    write("metodo.json", "Fonti, limiti dichiarati e metodi scartati, in italiano e in inglese.", {"aggiornamento": status.get("eseguito_il", NOW)},
          {"fonti": "tabella delle fonti di SPEC.md (sezione 3)", "limiti": "sezione 4 di SPEC.md", "metodiScartati": "sezione 5 di SPEC.md",
           "it, en": "ogni voce è esportata nelle due lingue; l'inglese viene da src/i18n/spec_en.json"},
          {"fonti": bilingual_table("## 3. Fonti dati confermate"), "limiti": {"it": limits, "en": [en.get(x, x) for x in limits]},
           "metodiScartati": bilingual_table("## 5. Metodi scartati"), "repo": "https://github.com/sqsw5ryvdh-netizen/euro-stablecoin-exposure"})

    # ---- banche (modulo 6)
    if (PROC / "m6_summary.json").exists():
        payload, dates, fields = banks_payload(m5s)
        write("banche.json", "Singole banche dell'area euro dall'esercizio di trasparenza EBA 2025: bilanci, quota retail, copertura per paese e confronto con il modulo 5. Dati pubblici per banca, non dati di vigilanza.",
              dates, fields, payload)

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
           "classifica": [{"code": r["paese"], "posizione": r["posizione"], "c1": r["C1"]} for r in m3["classifica"]],
           "depositiAVistaArea": m4s["area_euro"]["depositi_a_vista_mld"], "prestitiArea": m5s["prestiti_area_mld"],
           "testPredittivo": link["risposta"]})

    # ---- meta
    fresh = [x for x in sources if x["stato"] == "ultimo_valido"]
    partial = [x for x in sources if x["stato"] == "parziale"]
    files = sorted(DOCS) + ["meta.json"] + (["geo/europa.geo.json"] if geo_ok else [])
    write("meta.json", "Stato dell'aggiornamento e di ogni fonte, ed elenco dei file di dati.", {"aggiornamento": status.get("eseguito_il", NOW)},
          {"fonti[].stato": "aggiornata, parziale (manca una parte minore), ultimo_valido (la fonte non ha risposto), non_aggiornata (ricalcolo senza scarico), statica",
           "fonti[].tipoData": "come leggere datiAl: giorno, settimana (lunedì), mese, trimestre, anno, testo (chiave di traduzione)",
           "fonti[].dettaglio": "per gli exchange: coppie senza risposta con la loro quota dei volumi, coppie mai disponibili, settimane trattenute",
           "aggiornamento.modalita": "online (con scarico dalle fonti) oppure offline"},
          {"aggiornamento": {"eseguitoIl": status.get("eseguito_il"), "modalita": "offline" if status.get("modalita") == "senza rete" else "online", "moduli": status.get("moduli", {})},
           "fonti": sources, "fontiNonAggiornate": [x["id"] for x in fresh], "fontiParziali": [x["id"] for x in partial],
           "file": files, "mappaDisponibile": geo_ok})

    readme = ["# Dati dell'applicazione", "", f"Generati da `src/export_app_data.py`. Schema {SCHEMA}. Non modificare a mano.", "",
              "Ogni file contiene `schema`, `file`, `generato_il`, `dati_al`, `descrizione` e `campi` (la documentazione dei campi), più i dati.",
              "I file contengono numeri e codici. I testi dell'interfaccia, in inglese e in italiano, sono in `web/src/i18n/`; i nomi dei paesi si ricavano dal codice.", ""]
    for name in sorted(DOCS):
        readme += [f"## {name}", "", DOCS[name]["descrizione"], ""] + [f"- `{k}`: {v}" for k, v in DOCS[name]["campi"].items()] + [""]
    readme += ["## geo/europa.geo.json", "", "Confini dei paesi europei da Eurostat GISCO (Countries 2024, scala 1:20 milioni), con `code`, `name` e `area_euro`. © EuroGeographics per i confini amministrativi.", ""]
    (OUT / "README.md").write_text("\n".join(readme), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT.rglob("*.json")) / 1024
    print(f"dati dell'applicazione: {len(list(OUT.rglob('*.json')))} file JSON, {size:.0f} KB; fonti non aggiornate: {len(fresh)}, aggiornate in parte: {len(partial)}")


if __name__ == "__main__":
    main()
