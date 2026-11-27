"""Data layer of the application: exports the results to JSON files, one per section.

The web application reads only these files (web/public/data/). They contain numbers and codes:
the interface texts are in the translation files of the application (web/src/i18n/); the texts
taken from SPEC.md (in English) are exported in English and in Italian, with the Italian from
src/i18n/spec_it.json. Every file has the schema version, the generation date, the data date
and a description of the fields; meta.json reports the status of each source.

Inputs: the results in data/processed (JSON and CSV of modules 1 to 6, run_status.json),
data/raw/m3_bsi.csv and data/raw/m4_inputs.json, SPEC.md (sections 3, 4 and 5),
src/i18n/spec_it.json; country boundaries from Eurostat GISCO (downloaded only if missing).
Outputs: web/public/data/*.json, web/public/data/countries/*.json, web/public/data/geo/europe.geo.json
and web/public/data/README.md, which documents every file and field.

Usage: python src/export_app_data.py            # export; download the GISCO boundaries if missing
       python src/export_app_data.py --offline  # download nothing
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
SCHEMA = "3.0.0"  # 3.0.0: keys in English (2.0.0: the texts are in the application; here only codes and numbers)
GISCO = "https://gisco-services.ec.europa.eu/distribution/v2/countries/geojson/CNTR_RG_20M_2024_4326.geojson"
NAMES = m5.NAMES
NOW = datetime.now(timezone.utc).isoformat(timespec="seconds")
DOCS: dict[str, dict] = {}

# English names of the keys of the structures copied as they are from data/processed (the files in
# data/processed keep their own names). Keys that are not here pass unchanged: series ids
# (usdt_senza_coinbase), step names (modulo1), week dates.
KEYS = {
    "ancoraggio_alto": "high_anchor",
    "ancoraggio_basso": "low_anchor",
    "con": "with_excluded",
    "correlazione_di_rango": "rank_correlation",
    "definizione": "definition",
    "deflusso_paesi_coperti": "outflow_covered_countries",
    "detentori": "holders",
    "dettaglio_segnalazioni_cambiate": "flags_changed_detail",
    "dev_std_52_settimane": "sd_52_weeks",
    "differenza_pp": "difference_pp",
    "esclusi": "excluded",
    "esclusi_indice_lungo": "excluded_long_index",
    "esito": "outcome",
    "exchange_indice_lungo": "exchange_long_index",
    "exchange_mancanti": "missing_exchanges",
    "importo_mld_eur": "amount_bn_eur",
    "massima": "max",
    "massima_assoluta": "max_abs",
    "massimo": "max",
    "media": "mean",
    "media_4_settimane": "mean_4_weeks",
    "media_52_settimane": "mean_52_weeks",
    "media_prime_13_settimane": "mean_first_13_weeks",
    "media_ultime_13_settimane": "mean_last_13_weeks",
    "mese_bilanci_paese": "country_balance_sheet_month",
    "messaggio": "message",
    "minimo": "min",
    "nome": "name",
    "numero_settimane": "week_count",
    "paese": "country",
    "paesi_con_bsi_completo": "countries_with_full_bsi",
    "paesi_con_entrambe": "countries_with_both",
    "prima_settimana": "first_week",
    "quota_di_volume_degli_esclusi": "volume_share_of_excluded",
    "quota_di_volume_mancante": "missing_volume_share",
    "quota_eur": "eur_share",
    "rapporto_mediano_bsi_su_bri": "median_ratio_bsi_to_bis",
    "regola_depositi": "deposit_rule",
    "regola_paesi": "country_rule",
    "scarto_quota": "share_deviation",
    "scarto_standardizzato": "standardised_deviation",
    "scarto_volume": "volume_deviation",
    "secondi": "seconds",
    "segnalazioni_cambiate": "flags_changed",
    "senza": "without_excluded",
    "serie": "series",
    "settimana": "week",
    "settimana_della_massima": "week_of_max",
    "settimana_massimo": "max_week",
    "settimana_minimo": "min_week",
    "settimane_confrontate": "weeks_compared",
    "sostituzione": "substitution",
    "stato": "status",
    "totale": "total",
    "ultima_settimana": "last_week",
    "valore": "value",
    "variazione_dall_inizio_pp": "change_since_start_pp",
    "variazione_pp": "change_pp",
    "volume_eur_mld": "volume_eur_bn",
    "minimo_mld_eur": "min_bn_eur",
    "centrale_mld_eur": "central_bn_eur",
    "massimo_mld_eur": "max_bn_eur",
    "minimo_tutte_le_stablecoin_mld_eur": "min_all_stablecoins_bn_eur",
    "centrale_tutte_le_stablecoin_mld_eur": "central_all_stablecoins_bn_eur",
    "massimo_tutte_le_stablecoin_mld_eur": "max_all_stablecoins_bn_eur",
    "estremo_superiore_dichiarato_mld_eur": "declared_upper_bound_bn_eur",
    "nota_estremo_superiore": "upper_bound_note",
}
# Italian names of the composition items in data/processed/m3_composition.csv -> keys of the country files
ITEMS = {
    "vista_famiglie": "household_sight_deposits",
    "altri_dep_famiglie": "household_other_deposits",
    "vista_imprese": "firm_sight_deposits",
    "altri_dep_imprese": "firm_other_deposits",
    "altri_dep_non_ifm": "other_non_mfi_deposits",
    "dep_governo_centrale": "central_government_deposits",
    "dep_da_ifm": "deposits_from_mfis",
    "titoli_di_debito": "debt_securities",
    "fondi_monetari": "money_market_funds",
    "passivita_estere": "external_liabilities",
    "capitale_e_riserve": "capital_and_reserves",
    "altre_passivita": "other_liabilities",
}


def en(x):
    """A structure read from data/processed, with its keys in English (KEYS); the values do not change."""
    if isinstance(x, dict):
        return {KEYS.get(k, k): en(v) for k, v in x.items()}
    if isinstance(x, list):
        return [en(v) for v in x]
    return x


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
    doc = {"schema": SCHEMA, "file": name, "generated_on": NOW, "data_as_of": data_date, "description": description, "fields": fields, **rnd(payload)}
    path = OUT / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    DOCS[name] = {"description": description, "fields": fields}


def spec_section(title: str) -> str:
    s = (ROOT / "SPEC.md").read_text()
    a = s.index(title)
    b = s.find("\n## ", a + 5)
    return s[a : b if b > 0 else len(s)]


def spec_table(title: str) -> list[dict]:
    rows = [ln for ln in spec_section(title).splitlines() if ln.startswith("|")]
    head = [c.strip() for c in rows[0].strip("|").split("|")]
    return [dict(zip(head, [c.strip() for c in ln.strip("|").split("|")], strict=False)) for ln in rows[2:]]


def spec_bullets(title: str) -> list[str]:
    text = spec_section(title)
    items = re.findall(r"^- (.*?)(?=\n- |\n\n|\Z)", text, re.S | re.M)
    return [re.sub(r"\s+", " ", i).replace("**", "").strip() for i in items]


SPEC_SOURCES, SPEC_LIMITS, SPEC_DISCARDED = "## 3. Confirmed data sources", "## 4. What the programme does NOT promise", "## 5. Discarded methods"


def spec_it() -> dict[str, str]:
    """Italian version of the SPEC.md texts shown by the application (SPEC.md itself is in English)."""
    return json.loads((ROOT / "src" / "i18n" / "spec_it.json").read_text(encoding="utf-8"))


def spec_strings() -> list[str]:
    """All the SPEC.md texts that the application shows: used by the test on translations."""
    out: list[str] = []
    for title in (SPEC_SOURCES, SPEC_DISCARDED):
        rows = spec_table(title)
        out += list(rows[0]) + [v for r in rows for v in r.values()]
    return out + spec_bullets(SPEC_LIMITS)


def bilingual_table(title: str) -> dict:
    """A SPEC.md table in English and Italian: headers and rows as lists, in the same order."""
    it = spec_it()
    rows = spec_table(title)
    head = list(rows[0])

    def tr(v):
        return it.get(v, v)

    return {
        "en": {"columns": head, "rows": [[r[h] for h in head] for r in rows]},
        "it": {"columns": [tr(h) for h in head], "rows": [[tr(r[h]) for h in head] for r in rows]},
    }


def gisco(offline: bool) -> None:
    """Country boundaries from Eurostat GISCO, scale 1:20 million, cut to Europe."""
    path = OUT / "geo" / "europe.geo.json"
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
        for p in polys:  # keep the polygons whose approximate centroid falls in Europe
            xs, ys = [c[0] for c in p[0]], [c[1] for c in p[0]]
            cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
            if -12 <= cx <= 36 and 33.5 <= cy <= 72:
                keep.append([[[round(c[0], 3), round(c[1], 3)] for c in ring] for ring in p])
        if keep:
            feats.append(
                {
                    "type": "Feature",
                    "properties": {"code": code, "name": NAMES.get(code, f["properties"]["NAME_ENGL"]), "euro_area": code in NAMES},
                    "geometry": {"type": "MultiPolygon", "coordinates": keep},
                }
            )
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "source": "Eurostat GISCO, Countries 2024, 1:20M. © EuroGeographics for the administrative boundaries",
                "features": feats,
            },
            separators=(",", ":"),
        )
    )


def day_it(iso: str) -> str:
    """Date in Italian format (for example 25 novembre 2026)."""
    months = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"]
    y, m, d = iso[:10].split("-")
    return f"{int(d)} {months[int(m) - 1]} {y}"


def missing_pairs(log: pd.DataFrame, store: pd.DataFrame) -> dict | None:
    """Pairs that did not respond to the last download although they have data in the history.

    These are the ones that matter: the new weeks come out without them. Pairs that never
    gave data (for example no longer listed) are listed separately and carry no weight.
    The weight is the share of total volumes in the last four weeks in which the pair was
    present.
    """
    failed = log[log.status == "errore"]
    if failed.empty:
        return None
    known = store.merge(failed[["exchange", "symbol"]].drop_duplicates(), on=["exchange", "symbol"])
    never = sorted({f"{r.exchange} {r.symbol}" for r in failed.itertuples()} - {f"{r.exchange} {r.symbol}" for r in known.itertuples()})
    if known.empty:
        return {"exchange": [], "pairs": [], "neverAvailable": never, "volumeShare": 0.0, "dataUntil": None}
    last = known.date.max()
    start = (pd.Timestamp(last) - pd.Timedelta(days=27)).strftime("%Y-%m-%d")
    window = store[(store.date >= start) & (store.date <= last)]
    total = float(window.volume_stable.sum())
    lost = float(known[(known.date >= start) & (known.date <= last)].volume_stable.sum())
    return {
        "exchange": sorted(known.exchange.unique()),
        "pairs": sorted({f"{r.exchange} {r.symbol}" for r in known.itertuples()}),
        "neverAvailable": never,
        "volumeShare": lost / total if total else 0.0,
        "dataUntil": known.groupby(["exchange", "symbol"]).date.max().min(),
    }


def load_missing_pairs() -> dict | None:
    log_path, store_path = PROC / "m2_last_fetch_log.csv", RAW / "m2_daily_volumes.csv"
    if not log_path.exists() or not store_path.exists():
        return None
    log, store = pd.read_csv(log_path), pd.read_csv(store_path)
    excluded = load("m2_summary.json").get("pannello", {}).get("esclusi", [])  # exchanges outside the panel do not count
    return missing_pairs(log[~log.exchange.isin(excluded)], store[~store.exchange.isin(excluded)])


def sources_status(status: dict, m1: dict, m2: dict, m3: dict, m4s: dict, m5s: dict) -> list[dict]:
    """Status of each source, as codes: aggiornata, parziale, ultimo_valido, non_aggiornata, statica."""
    mods = status.get("moduli", {})
    offline = status.get("modalita") == "senza rete"

    def state(module: str) -> tuple[str, str | None]:
        st = mods.get(module, {})
        if st.get("esito") == "errore":
            return "ultimo_valido", st.get("messaggio", "the source did not respond")
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
        detail: dict = {"message": msg} if msg else {}
        if sid == "exchange":
            held = m2.get("settimane_trattenute", {})
            detail["exchange"] = m2["pannello"]["exchange"]
            if missing and missing["pairs"]:
                detail.update({"noResponse": missing["pairs"], "volumeShare": missing["volumeShare"], "dataUntil": missing["dataUntil"]})
            if missing and missing["neverAvailable"]:
                detail["neverAvailable"] = missing["neverAvailable"]
            if held:
                detail["heldWeeks"] = sorted(held)
            if held and st == "aggiornata":
                st = "ultimo_valido"
            elif missing and missing["pairs"] and st == "aggiornata":
                st = "parziale"
        rows.append({"id": sid, "module": module, "dateType": kind, "dataAsOf": date, "status": st, "detail": detail})
    for sid, kind, date in (
        ("eba", "giorno", "2025-06-30"),
        ("bce_cbd", "trimestre", "2025-Q2"),
        ("bce_ces", "testo", "ces"),
        ("bce_space", "testo", "space"),
        ("bce_wp3199", "mese", "2026-03"),
        ("esm_wp79", "trimestre", "2025-Q3"),
        ("gisco", "anno", "2024"),
    ):
        rows.append({"id": sid, "module": "statica", "dateType": kind, "dataAsOf": date, "status": "statica", "detail": {}})
    return rows


def banks_payload(m5s: dict) -> tuple[dict, dict, dict]:
    """Bank-level data of module 6: balance sheets, retail share, coverage and comparison with module 5."""
    m6 = load("m6_summary.json")
    bk = pd.read_csv(PROC / "m6_banks.csv", index_col=0)
    by = pd.read_csv(PROC / "m6_by_country.csv", index_col=0)

    def nan(v):
        return None if v != v else float(v)

    banks = [
        {
            "lei": lei,
            "name": r.nome,
            "country": r.paese,
            "assets": r.totale_attivo,
            "householdDeposits": r.dep_famiglie,
            "householdSight": r.vista_famiglie,
            "firmDeposits": r.dep_imprese,
            "firmSight": r.vista_imprese,
            "otherFinancialDeposits": r.dep_altre_fin,
            "bankDeposits": r.dep_banche,
            "debtSecurities": r.titoli_emessi,
            "loans": r.prestiti,
            "retailShare": r.quota_retail,
            "highRetail": bool(r.quota_retail_alta),
            "rank": int(r.rango_quota_retail),
            "usa": nan(r.usa_su_esposizioni),
        }
        for lei, r in bk.iterrows()
    ]
    countries = [
        {
            "code": k,
            "banks": int(r.banche),
            "highRetailBanks": int(r.banche_alta_quota_retail) if r.banche else 0,
            "sampleAssets": nan(r.totale_attivo_campione),
            "coverageBsi": nan(r.copertura_su_bsi),
            "coverageConsolidated": nan(r.copertura_su_consolidato),
            "m6PerEuro": nan(r.m6_credito_per_euro),
            # keyed by the credit variant ids, the same as in the addresses (cred=...)
            "m5": {v: nan(r[f"m5_{v}_per_euro"]) for v in ("basso", "alto", "soglia", "continua", "uniforme")},
            "m5HighRetail": bool(r.m5_quota_retail_alta),
        }
        for k, r in by.iterrows()
    ]
    crit = m6["criterio_di_sufficienza"]
    payload = {
        "banks": banks,
        "countries": countries,
        "threshold": m6["soglia_quota_retail"]["valore"],
        "median": m6["soglia_quota_retail"]["mediana"],
        "countryThreshold": m5s["soglia_quota_retail"]["valore"],
        "banksAbove": m6["soglia_quota_retail"]["banche_sopra"],
        "criterion": {
            "inSample": crit["banche_area_euro_nel_campione"],
            "complete": crit["banche_con_dati_completi"],
            "countries": crit["paesi_coperti"],
            "met": crit["soddisfatto"],
            "countriesWithoutBanks": crit["paesi_senza_banche"],
            "excluded": en(crit["banche_escluse"]),
        },
        "coverage": {
            "bsi": m6["campione"]["copertura_area_su_bsi"],
            "consolidated": m6["campione"]["copertura_area_su_consolidato"],
            "assets": m6["campione"]["totale_attivo_mld"],
            "withUsa": m6["campione"]["banche_con_esposizione_usa"],
        },
        "comparison": en(m6["confronto_modulo5_paesi_coperti"]),  # m5_<variant>: credit variant ids
        "controlScenario": en(m6["scenario_di_controllo"]),
    }
    dates = {"banks": m6["data_dei_dati"], "countryBalanceSheets": m6["scenario_di_controllo"]["mese_bilanci_paese"]}
    fields = {
        "banks[]": "one row per euro area bank with all items; amounts in EUR billion, consolidated data as at 30 June 2025",
        "banks[].retailShare": "household deposits / (household deposits + deposits of financial corporations other than banks)",
        "banks[].highRetail": "above the 75th percentile of the retail share among the banks in the sample",
        "banks[].householdSight, firmSight": "current accounts and overnight deposits",
        "banks[].usa": (
            "original credit exposures to US counterparties over the total; null if the United States is not among the bank's top ten countries"
        ),
        "countries[].coverageBsi": (
            "total assets of the sample banks over the total assets of the country's MFIs (BSI, June 2025); different perimeters, can exceed 1"
        ),
        "countries[].coverageConsolidated": (
            "the same ratio over the consolidated total assets of all banks in the country (ECB, CBD2, second quarter of 2025)"
        ),
        "countries[].m6PerEuro": "credit reduction per euro of outflow, coefficients applied bank by bank, in the control scenario",
        "countries[].m5": "the same ratio with the module 5 variants on national aggregates",
        "comparison": "sum over the covered countries, EUR billion",
    }
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
        geo_ok = (OUT / "geo" / "europe.geo.json").exists()
    except Exception as exc:  # the map stays the one already present, if any
        geo_ok = (OUT / "geo" / "europe.geo.json").exists()
        print(f"GISCO boundaries not downloaded: {exc}")

    # ---- simulator: balance sheets, weights and coefficients with which the browser redoes the calculations
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
        countries.append(
            {
                "code": code,
                "name": NAMES[code],
                "sight": b.vista[code],
                "householdSight": b.vista_fam[code],
                "customerDeposits": b.clientela[code],
                "wholesale": b.ingrosso[code],
                "total": b.totale[code],
                "loans": retail.prestiti[code],
                "pop": inp["popolazione"][code],
                "r3": r3.peso[code],
                "ownerShare": r3.quota_possessori[code],
                "ownersImputed": bool(r3.imputato[code]),
                "retailShare": retail.quota_retail[code],
                "highRetail": bool(retail.quota_retail_alta[code]),
                "continuousWeight": retail.peso_continuo[code],
                "rank": int(rank.pos_indicatore[code]),
                "indicator": rank.indicatore[code],
                "c1": rank.C1[code],
                "c2": rank.C2[code],
                "c3": rank.C3[code],
                "usd": mp.dollari[code],
                "usdSource": "BRI" if mp.fonte_dollari[code] == "BRI" else "BSI",
                "quadrant": mp.quadrante[code],
            }
        )
    presets = [
        {"id": "P_minimo", "eur": ref["minimo_mld_eur"]},
        {"id": "P_centrale", "eur": ref["centrale_mld_eur"]},
        {"id": "P_massimo", "eur": ref["massimo_mld_eur"]},
        {"id": "ESM_oggi", "eur": m1["livello"]["base_mld_eur"]},
        {"id": "S1", "eur": 143 / fx},
        {"id": "S2", "eur": 300 / fx},
        {"id": "S3", "eur": 600 / fx},
    ]
    coef = m5s["coefficienti"]
    write(
        "simulator.json",
        (
            "Bank balance sheets by country, weights of the allocation rules and coefficients: everything needed to redo the calculations of "
            "modules 4 and 5 in the browser."
        ),
        {"balanceSheets": month, "exchangeRate": inp["data_cambio"]},
        {
            "countries[].sight": "sight deposits of households and firms, EUR billion",
            "countries[].householdSight": "sight deposits of households",
            "countries[].customerDeposits": "total deposits of households and firms",
            "countries[].wholesale": "debt securities issued plus deposits from MFIs",
            "countries[].total": "total liabilities",
            "countries[].loans": "loans to households and firms",
            "countries[].pop": "population (weight of rule R2)",
            "countries[].r3": "estimated crypto-asset owners (weight of rule R3)",
            "countries[].continuousWeight": "weight between 0 and 1 for the continuous credit variant",
            "coefficients": (
                "ECB Working Paper 3199: uniform rule, standard deviation in points, low and high coefficients (table 1, columns 3 and 4)"
            ),
            "level": "reference level in EUR billion",
            "presets[].eur": "amount held in EUR billion; the scenarios defined in dollars are converted at the programme's single exchange rate",
            "usdPerEur": "single exchange rate of the programme: the most recent ECB reference rate at the date of the circulation (module 1)",
            "countries[].usdSource": "BRI (BIS) or BSI (quarterly, by currency)",
        },
        {
            "usdPerEur": fx,
            "exchangeRateDate": inp["data_cambio"],
            "balanceSheetMonth": month,
            "countries": countries,
            "presets": presets,
            "coefficients": {
                "uniform": coef["regola_uniforme"],
                "sd": coef["deviazione_standard_pp"],
                "low": coef["col3"]["basso"],
                "high": coef["col3"]["alto"],
                "lowCol4": coef["col4"]["basso"],
                "highCol4": coef["col4"]["alto"],
            },
            "retailThreshold": m5s["soglia_quota_retail"]["valore"],
            "anchors": en(m5s["variante_continua"]),
            "level": {
                "min": ref["minimo_mld_eur"],
                "central": ref["centrale_mld_eur"],
                "max": ref["massimo_mld_eur"],
                "upperBound": ref["estremo_superiore_dichiarato_mld_eur"],
            },
            "uncertainty": {"minSubstitution": 0.5, "maxSubstitution": 1.0},
            "r3Source": m4s["regola_R3"]["fonte"],
            "medians": {"c1": m5s["mappa"]["mediana_depositi_a_vista"], "usd": m5s["mappa"]["mediana_dollari"]},
        },
    )

    # ---- country sheets: time series, one file per country
    comp = pd.read_csv(PROC / "m3_composition.csv", dtype={"mese": str})
    idx3 = pd.read_csv(PROC / "m3_index.csv", dtype={"mese": str})
    parts = [c for c in comp.columns if c not in ("paese", "mese", "totale_passivo_mln", "scarto")]
    for code in NAMES:
        c, i = comp[comp.paese == code].sort_values("mese"), idx3[idx3.paese == code].sort_values("mese")
        write(
            f"countries/{code}.json",
            f"Monthly time series of {m5.NAMES_EN[code]}: composition of liabilities and exposure indicator.",
            {"balanceSheets": c.mese.max()},
            {
                "composition.items": "shares of total liabilities, one series per item",
                "composition.total": "total liabilities, EUR billion",
                "indicator.rank": "position in the ranking among the countries with data in that month",
                "indicator.c1,c2,c3": "components of the indicator (shares)",
            },
            {
                "code": code,
                "name": NAMES[code],
                "composition": {
                    "months": c.mese.tolist(),
                    "total": (c.totale_passivo_mln / 1000).round(2).tolist(),
                    "items": {ITEMS[p]: c[p].round(4).tolist() for p in parts},
                },
                "indicator": {
                    "months": i.mese.tolist(),
                    "value": i.indicatore.round(3).tolist(),
                    "rank": i.pos_indicatore.tolist(),
                    "countries": i.paesi_nel_mese.tolist(),
                    "c1": i.C1.round(4).tolist(),
                    "c2": i.C2.round(4).tolist(),
                    "c3": i.C3.round(4).tolist(),
                },
            },
        )

    # ---- two-channel map
    write(
        "channels.json",
        "Two-channel map: sight deposits over liabilities and dollar liabilities, with what each quadrant implies for transmission.",
        {"balanceSheets": month, "dollars": m5s["mappa"]["trimestre_bri"]},
        {
            "quadrants": (
                "A high deposits and low dollars, B both high, C low deposits and high dollars, D both low; the texts are in the application"
            ),
            "sourceComparison": "comparability between the BIS measure and the quarterly BSI measure",
        },
        {
            "medians": {"c1": m5s["mappa"]["mediana_depositi_a_vista"], "usd": m5s["mappa"]["mediana_dollari"]},
            "rankCorrelation": m5s["mappa"]["correlazione_di_rango_assi"],
            "sourceComparison": en(m5s["mappa"]["confronto_fonti"]),
            "changeWithRescaling": m5s["mappa"]["paesi_che_cambiano_con_riscalatura"],
            "quadrants": ["A", "B", "C", "D"],
        },
    )

    # ---- weekly monitor
    wk = pd.read_csv(PROC / "m2_weekly_index.csv", index_col=0)
    lg = pd.read_csv(PROC / "m2_weekly_index_long.csv", index_col=0)
    fl = pd.read_csv(PROC / "m2_flags.csv")
    series = ["usdt", "usdt_senza_coinbase", "usdc", "usdc_senza_coinbase"]
    flags = {
        s: {
            "weeks": g.week.tolist(),
            "share": g.quota_eur.round(5).tolist(),
            "volumeEur": g.volume_eur_mld.round(4).tolist(),
            "shareDeviation": [None if v != v else round(v, 2) for v in g.scarto_quota],
            "volumeDeviation": [None if v != v else round(v, 2) for v in g.scarto_volume],
            "status": g.stato.tolist(),
        }
        for s, g in fl.groupby("serie")
    }
    write(
        "monitor.json",
        "Weekly index of the EUR share of stablecoin/fiat volumes, absolute volumes, status of the flags and long history.",
        {"lastWeek": m2["indice_principale"]["ultima_settimana"]},
        {
            "main": "main index, from December 2024",
            "panel": "number of exchanges in the main index and in the long one, and excluded exchanges",
            "exclusionEffect": "difference between the index without and with the excluded exchanges, in percentage points",
            "long": "without Kraken and Gemini, from January 2023: comparable in direction, not in level",
            "flags[series].status": ("segnale (flag), da verificare (to be checked), nessuno (none), storico insufficiente (insufficient history)"),
            "missingSources": "pairs with history that did not respond to the last download, with their share of volumes; null if they all responded",
            "volumes": "billions of stablecoin units (roughly dollars) per week",
        },
        {
            "series": series,
            "main": {
                "weeks": wk.index.tolist(),
                **{s: wk[s].round(5).tolist() for s in series},
                "total": wk.totale.round(5).tolist(),
                "volEurUsdt": wk.volume_eur_usdt_mld.round(4).tolist(),
                "volEurUsdc": wk.volume_eur_usdc_mld.round(4).tolist(),
                "volFiatUsdt": wk.volume_fiat_usdt_mld.round(4).tolist(),
                "volFiatUsdc": wk.volume_fiat_usdc_mld.round(4).tolist(),
                "exchange": wk.exchange_attivi.tolist(),
            },
            "long": {
                "weeks": lg.index.tolist(),
                **{s: lg[s].round(5).tolist() for s in series},
                "volEurUsdt": lg.volume_eur_usdt_mld.round(4).tolist(),
                "volEurUsdc": lg.volume_eur_usdc_mld.round(4).tolist(),
            },
            "flags": flags,
            "statistics": en(m2["indice_principale"]["serie"]),  # keyed by series id, plus total
            "panel": en(m2["pannello"]),
            "exclusionEffect": en(m2["effetto_esclusione"]),
            "heldWeeks": en(m2.get("settimane_trattenute", {})),  # keyed by week
            "missingSources": load_missing_pairs(),
            "predictiveTest": {
                "answer": link["risposta"],
                "pValue": link["principale"]["p_value"],
                "observations": link["principale"]["osservazioni"],
                "rmseRatio": link["principale"]["rapporto_rmse"],
            },
        },
    )

    # ---- level estimate
    ms = pd.read_csv(PROC / "m1_monthly_series.csv", index_col=0)
    b1 = own["B1"]
    write(
        "level.json",
        (
            "Bottom-up estimate of the value of dollar stablecoins held in the euro area, with the editable assumptions, and comparison with the "
            "ESM assumption."
        ),
        {"survey": "August and November 2025", "circulation": m1["data_circolazione"]},
        {
            "bands[].percentage": "share of holders in the band, measured on Chart B, panel b, of the ECB box",
            "bands[].minimo, massimo": "bounds of the band in euro (for the last, open-ended one, the maximum is an assumption)",
            "units": "households and adults of the 21 countries (Eurostat)",
            "dollarShare": "minimum, central and maximum dollar share",
            "esm.series": "ESM base level at month end, EUR billion",
        },
        {
            # bands and dollarShare are keyed by the level case (minimo, centrale, massimo), units and b1 by the
            # counting unit (famiglie, individui): the same ids as in the addresses (caso=..., uni=...)
            "bands": [{("percentage" if k == "percentuale" else k): v for k, v in f.items() if k != "fascia"} for f in own["parametri"]["fasce"]],
            "holderShare": own["parametri"]["quota_detentori"],
            "dollarShare": own["parametri"]["quota_in_dollari"],
            "units": {"famiglie": b1["unita"]["famiglie"], "individui": b1["unita"]["individui"]},
            "reference": en({k: v for k, v in ref.items() if k != "decisione"}),
            "b1": {"famiglie": en(b1["famiglie"]), "individui": en(b1["individui"])},
            "esm": {
                "date": m1["data_circolazione"],
                "baseEur": m1["livello"]["base_mld_eur"],
                "highEur": m1["livello"]["alto_mld_eur"],
                "series": {
                    "months": ms.index.tolist(),
                    "base": ms.livello_base_mld_eur.round(3).tolist(),
                    "high": ms.livello_alto_mld_eur.round(3).tolist(),
                },
            },
            "otherRoutes": {
                "b2": {"customerBalancesBnUsd": own["B2"].get("totale_saldi_clienti_mld_usd")},
                "b3": {"central": own["B3"].get("centrale_mld_eur")},
            },
            "criterionMet": own["verdetto"]["esito"] != "solo minimo di B1",
        },
    )

    # ---- method and data
    sources = sources_status(status, m1, m2, m3, m4s, m5s)
    it = spec_it()
    limits = spec_bullets(SPEC_LIMITS)
    write(
        "method.json",
        "Sources, stated limits and discarded methods, in Italian and in English.",
        {"update": status.get("eseguito_il", NOW)},
        {
            "sources": "table of sources in SPEC.md (section 3)",
            "limits": "section 4 of SPEC.md",
            "discardedMethods": "section 5 of SPEC.md",
            "en, it": "each item is exported in both languages; the Italian comes from src/i18n/spec_it.json",
        },
        {
            "sources": bilingual_table(SPEC_SOURCES),
            "limits": {"en": limits, "it": [it.get(x, x) for x in limits]},
            "discardedMethods": bilingual_table(SPEC_DISCARDED),
            "repo": "https://github.com/lorenzo-bianchi-lab/euro-stablecoin-exposure",
        },
    )

    # ---- banks (module 6)
    if (PROC / "m6_summary.json").exists():
        payload, dates, fields = banks_payload(m5s)
        write(
            "banks.json",
            (
                "Individual euro area banks from the EBA 2025 transparency exercise: balance sheets, retail share, coverage by country and "
                "comparison with module 5. Public bank-level data, not supervisory data."
            ),
            dates,
            fields,
            payload,
        )

    # ---- overview
    ea = pd.read_csv(PROC / "m4_euro_area.csv")
    cr = pd.read_csv(PROC / "m5_credit_euro_area.csv")

    def pick(df, s):
        return df[(df.scenario == s) & (df.regola_paesi == "R1") & (df.get("regola_depositi", "T1") == "T1")].iloc[0]

    e_c, c_c = pick(ea, "P_centrale"), cr[(cr.scenario == "P_centrale") & (cr.regola_paesi == "R1")].iloc[0]
    last_flags = m2["segnalazione"]["ultima_settimana"]
    write(
        "overview.json",
        "Key indicators, active flags and data dates.",
        {"balanceSheets": month, "week": m2["indice_principale"]["ultima_settimana"], "circulation": m1["data_circolazione"]},
        {
            "level": "own estimate in EUR billion",
            "centralScenario": "effect of the central level with rule R1 and full substitution",
            "index[series]": "EUR share of the last week and status of the flag",
        },
        {
            "level": {
                "min": ref["minimo_mld_eur"],
                "central": ref["centrale_mld_eur"],
                "max": ref["massimo_mld_eur"],
                "upperBound": ref["estremo_superiore_dichiarato_mld_eur"],
                "esmBase": m1["livello"]["base_mld_eur"],
                "esmHigh": m1["livello"]["alto_mld_eur"],
            },
            "centralScenario": {
                "outflow": e_c.deflusso_mld_eur,
                "sightDepositsLost": e_c.perdita_depositi_a_vista,
                "wholesaleIncrease": e_c.aumento_raccolta_ingrosso,
                "creditUniform": c_c.uniforme_mld,
                "creditLow": c_c.basso_mld,
                "creditHigh": c_c.alto_mld,
                "creditPct": c_c.uniforme_pct_prestiti,
            },
            "index": {
                s: {
                    "value": m2["indice_principale"]["serie"][s]["valore"],
                    "change": m2["indice_principale"]["serie"][s]["variazione_pp"],
                    **en(last_flags.get(s, {})),
                }
                for s in series
            },
            "ranking": [{"code": r["paese"], "rank": r["posizione"], "c1": r["C1"]} for r in m3["classifica"]],
            "areaSightDeposits": m4s["area_euro"]["depositi_a_vista_mld"],
            "areaLoans": m5s["prestiti_area_mld"],
            "predictiveTest": link["risposta"],
        },
    )

    # ---- meta
    fresh = [x for x in sources if x["status"] == "ultimo_valido"]
    partial = [x for x in sources if x["status"] == "parziale"]
    files = sorted(DOCS) + ["meta.json"] + (["geo/europe.geo.json"] if geo_ok else [])
    write(
        "meta.json",
        "Status of the update and of each source, and list of the data files.",
        {"update": status.get("eseguito_il", NOW)},
        {
            "sources[].status": (
                "aggiornata (updated), parziale (a minor part is missing), ultimo_valido (the source did not respond), non_aggiornata (recomputed "
                "without downloading), statica (static)"
            ),
            "sources[].dateType": (
                "how to read dataAsOf: giorno (day), settimana (week, starting on Monday), mese (month), trimestre (quarter), anno (year), testo "
                "(translation key)"
            ),
            "sources[].detail": "for the exchanges: pairs without a response with their share of volumes, pairs never available, weeks held back",
            "update.mode": "online (with download from the sources) or offline",
        },
        {
            "update": {
                "ranOn": status.get("eseguito_il"),
                "mode": "offline" if status.get("modalita") == "senza rete" else "online",
                "modules": en(status.get("moduli", {})),  # keyed by step name (modulo1, ...)
            },
            "sources": sources,
            "staleSources": [x["id"] for x in fresh],
            "partialSources": [x["id"] for x in partial],
            "file": files,
            "mapAvailable": geo_ok,
        },
    )

    readme = [
        "# Application data",
        "",
        f"Generated by `src/export_app_data.py`. Schema {SCHEMA}. Do not edit by hand.",
        "",
        (
            "Each file contains `schema`, `file`, `generated_on`, `data_as_of`, `description` and `fields` (the documentation of the fields), "
            "plus the data."
        ),
        (
            "The files contain numbers and codes. The interface texts, in English and in Italian, are in `web/src/i18n/`; country names are "
            "derived from the code."
        ),
        "",
    ]
    for name in sorted(DOCS):
        readme += [f"## {name}", "", DOCS[name]["description"], ""] + [f"- `{k}`: {v}" for k, v in DOCS[name]["fields"].items()] + [""]
    readme += [
        "## geo/europe.geo.json",
        "",
        (
            "Boundaries of the European countries from Eurostat GISCO (Countries 2024, scale 1:20 million), with `code`, `name` and `euro_area`. © "
            "EuroGeographics for the administrative boundaries."
        ),
        "",
    ]
    (OUT / "README.md").write_text("\n".join(readme), encoding="utf-8")
    size = sum(p.stat().st_size for p in OUT.rglob("*.json")) / 1024
    print(
        (
            f"application data: {len(list(OUT.rglob('*.json')))} JSON files, {size:.0f} KB; sources not updated: {len(fresh)}, partly updated: "
            f"{len(partial)}"
        )
    )


if __name__ == "__main__":
    main()
