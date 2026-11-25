"""Modulo 6: singole banche dell'area euro, con i dati dell'esercizio di trasparenza EBA 2025.

Definizioni e criteri sono in SPEC.md (modulo 6), scritti prima dei risultati. Per ogni
banca: quota retail come nel Working Paper BCE 3199, posizione rispetto al 75° percentile
tra banche, raccolta all'ingrosso, effetto di uno scenario su depositi e credito con i
coefficienti alto e basso applicati banca per banca; poi riaggregazione per paese,
confronto con il modulo 5 e copertura.

Sono dati pubblici per banca, al massimo livello di consolidamento, al 30 giugno 2025:
non sono dati di vigilanza riservati e l'ordine non è un giudizio sulla solidità.

Uso: python src/module6_banks.py             # ricalcola dall'estratto già presente (lo scarica se manca)
     python src/module6_banks.py --download  # riscarica i file EBA e ricostruisce l'estratto
     python src/module6_banks.py --offline   # non scarica nulla
"""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests

import module4_scenarios as m4
from module5_credit import COEF, EURO_AREA, NAMES, RETAIL_PERCENTILE, SD_DEPOSITS_PP

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
FULL = RAW / "eba_te2025"                       # file completi, non committati (123 MB il più grande)
EXTRACT, BANKS, CBD = RAW / "eba_te2025_extract.csv", RAW / "eba_te2025_banks.csv", RAW / "m6_cbd2_total_assets.csv"
EBA = "https://www.eba.europa.eu/assets/TE2025/Full_database/883401/"
PERIOD, PERIOD_MONTH, PERIOD_QUARTER = "202506", "2025-06", "2025-Q2"
US_COUNTRY = "43"                               # codice EBA degli Stati Uniti (TR_Metadata, foglio Country)
MIN_BANKS, MIN_COUNTRIES = 50, 15               # criterio di sufficienza (SPEC)
CBD_KEY = "Q..W0.67._Z._Z.A.A.A0000._X.ALL.CA._Z.LE._T.EUR"  # totale attivo consolidato di tutte le banche del paese

# voce EBA -> (file, Item, filtri sulle dimensioni)
SECTORS = {"banche_centrali": "101", "governo": "102", "banche": "201", "altre_fin": "202", "imprese": "301", "famiglie": "401"}


def download(name: str, force: bool = False) -> Path:
    FULL.mkdir(parents=True, exist_ok=True)
    path = FULL / name
    if path.exists() and not force:
        return path
    with requests.get(EBA + name, timeout=600, stream=True) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
    return path


def build_extract(force: bool = False) -> None:
    """Dai file completi tiene solo le righe usate: stesso contenuto, nessun valore modificato."""
    oth = pd.read_csv(download("tr_oth.csv", force), dtype=str)
    cre = pd.read_csv(download("tr_cre.csv", force), dtype=str)
    oth = oth[(oth.Period == PERIOD) & oth.Item.isin(["2521010", "2521214", "2521215", "2521216"])]
    oth = oth.assign(Country="0", Portfolio="0")[["LEI_Code", "NSA", "Period", "Item", "Label", "Exposure", "Financial_instruments", "Country", "Portfolio", "Amount", "Sheet"]]
    cre = cre[cre.Period == PERIOD]
    npe = cre[(cre.Sheet == "NPE") & cre.Item.isin(["2520603", "2520605"]) & (cre.Perf_Status == "0")]
    exp = cre[(cre.Item == "2520502") & (cre.Status == "0") & cre.Country.isin(["0", US_COUNTRY])]
    cre = pd.concat([npe, exp]).assign(Financial_instruments="0")[oth.columns]
    pd.concat([oth, cre]).sort_values(["LEI_Code", "Sheet", "Item", "Exposure", "Financial_instruments", "Country", "Portfolio"]).to_csv(EXTRACT, index=False)

    import openpyxl
    wb = openpyxl.load_workbook(download("TR_Metadata.xlsx", force), read_only=True)
    rows = [r[:4] for r in wb["List of Institutions"].iter_rows(values_only=True)][2:]
    pd.DataFrame([r for r in rows if r[2]], columns=["paese", "nome_paese", "lei", "nome"]).to_csv(BANKS, index=False)


def fetch_cbd() -> None:
    r = requests.get("https://data-api.ecb.europa.eu/service/data/CBD2/" + CBD_KEY,
                     params={"format": "csvdata", "detail": "dataonly", "startPeriod": PERIOD_QUARTER, "endPeriod": PERIOD_QUARTER}, timeout=120)
    r.raise_for_status()
    d = pd.read_csv(io.StringIO(r.text))
    d = d[d.REF_AREA.isin(EURO_AREA)][["REF_AREA", "TIME_PERIOD", "OBS_VALUE"]].rename(columns={"REF_AREA": "paese", "TIME_PERIOD": "trimestre", "OBS_VALUE": "migliaia_eur"})
    d.to_csv(CBD, index=False)


def load_banks() -> pd.DataFrame:
    """Una riga per banca dell'area euro, importi in miliardi di euro."""
    x = pd.read_csv(EXTRACT, dtype=str)
    x["Amount"] = pd.to_numeric(x.Amount, errors="coerce") / 1000   # da milioni a miliardi
    names = pd.read_csv(BANKS).set_index("lei")

    def pick(item: str, **dims) -> pd.Series:
        sel = x[x.Item == item]
        for k, v in dims.items():
            sel = sel[sel[k] == v]
        return sel.groupby("LEI_Code").Amount.sum(min_count=1)

    cols = {"totale_attivo": pick("2521010"), "totale_passivo": pick("2521214"), "patrimonio": pick("2521216"),
            "titoli_emessi": pick("2521215", Financial_instruments="40"), "derivati_passivi": pick("2521215", Financial_instruments="12"),
            "prestiti_fam": pick("2520605", Exposure="401"), "prestiti_imp": pick("2520605", Exposure="301"), "prestiti_totali": pick("2520603"),
            "esposizione_usa": pick("2520502", Country=US_COUNTRY), "esposizione_totale": pick("2520502", Country="0")}
    for name, code in SECTORS.items():
        cols[f"dep_{name}"] = pick("2521215", Exposure=code, Financial_instruments="30")
        cols[f"vista_{name}"] = pick("2521215", Exposure=code, Financial_instruments="31")
    b = pd.DataFrame(cols)
    b.insert(0, "paese", x.groupby("LEI_Code").NSA.first())
    b.insert(1, "nome", names.nome.reindex(b.index))
    b = b[b.paese.isin(EURO_AREA) & b.nome.notna()].copy()
    b.index.name = "lei"
    return b


def indicators(b: pd.DataFrame) -> tuple[pd.DataFrame, float]:
    need = ["totale_attivo", "dep_famiglie", "dep_imprese", "dep_altre_fin", "dep_banche", "vista_famiglie", "vista_imprese", "titoli_emessi", "prestiti_fam", "prestiti_imp"]
    b["dati_completi"] = b[need].notna().all(axis=1) & (b.totale_attivo > 0) & ((b.dep_famiglie + b.dep_altre_fin) > 0)
    b["quota_retail"] = b.dep_famiglie / (b.dep_famiglie + b.dep_altre_fin)
    threshold = float(np.percentile(b.quota_retail[b.dati_completi], RETAIL_PERCENTILE))
    b["quota_retail_alta"] = b.quota_retail > threshold
    b["vista"] = b.vista_famiglie + b.vista_imprese                    # T1
    b["clientela"] = b.dep_famiglie + b.dep_imprese                    # T3
    b["prestiti"] = b.prestiti_fam + b.prestiti_imp
    b["ingrosso"] = b.dep_banche + b.titoli_emessi
    b["ingrosso_su_attivo"] = b.ingrosso / b.totale_attivo
    b["vista_su_attivo"] = b.vista / b.totale_attivo
    b["depositi_clientela_su_attivo"] = b.clientela / b.totale_attivo
    b["prestiti_su_attivo"] = b.prestiti / b.totale_attivo
    b["usa_su_esposizioni"] = b.esposizione_usa / b.esposizione_totale   # vuoto se gli Stati Uniti non sono tra i primi dieci paesi
    b["rango_quota_retail"] = b.quota_retail.rank(ascending=False, method="min")
    return b, threshold


def bank_effects(b: pd.DataFrame, lost_share: pd.Series, base: str = "vista") -> pd.DataFrame:
    """Effetto di uno scenario banca per banca: stessa quota di depositi persa del proprio paese."""
    out = pd.DataFrame(index=b.index)
    out["deflusso"] = b.paese.map(lost_share) * b[base]
    sd = 100 * out.deflusso / b.totale_attivo / SD_DEPOSITS_PP
    out["credito_basso"] = COEF["col3"]["basso"] * sd / 100 * b.prestiti
    out["credito_alto"] = COEF["col3"]["alto"] * sd / 100 * b.prestiti
    out["credito"] = np.where(b.quota_retail_alta, out.credito_alto, out.credito_basso)
    out["credito_pct_prestiti"] = 100 * out.credito / b.prestiti
    out["deflusso_su_attivo_pp"] = 100 * out.deflusso / b.totale_attivo
    return out


def main() -> None:
    args = set(sys.argv[1:])
    offline = "--offline" in args
    if "--download" in args or (not offline and not (EXTRACT.exists() and BANKS.exists())):
        build_extract("--download" in args)
    if not offline and ("--download" in args or not CBD.exists()):
        try:
            fetch_cbd()
        except Exception as exc:  # la copertura sul consolidato è un'aggiunta: senza, resta quella sul BSI
            print(f"dati bancari consolidati BCE non scaricati: {exc}")

    b, threshold = indicators(load_banks())
    ok = b[b.dati_completi].copy()
    sufficient = len(ok) >= MIN_BANKS and ok.paese.nunique() >= MIN_COUNTRIES

    # Scenario di controllo: livello centrale, R1, depositi a vista di famiglie e imprese, sostituzione piena
    bal, month = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
    alloc = m4.allocate(bal, ref["centrale_mld_eur"], "R1", "T1", pd.Series(inp["popolazione"], dtype=float))
    lost = alloc.deflusso_mld / bal.vista
    eff = bank_effects(ok, lost)
    ok = ok.join(eff)
    cols = ["paese", "nome", "totale_attivo", "dep_famiglie", "vista_famiglie", "dep_imprese", "vista_imprese", "dep_altre_fin", "dep_banche", "dep_banche_centrali",
            "dep_governo", "titoli_emessi", "prestiti_fam", "prestiti_imp", "esposizione_usa", "esposizione_totale", "quota_retail", "quota_retail_alta",
            "rango_quota_retail", "vista", "clientela", "prestiti", "ingrosso", "ingrosso_su_attivo", "vista_su_attivo", "depositi_clientela_su_attivo",
            "prestiti_su_attivo", "usa_su_esposizioni", "deflusso", "deflusso_su_attivo_pp", "credito", "credito_basso", "credito_alto", "credito_pct_prestiti"]
    ok[cols].round(6).sort_values("quota_retail", ascending=False).to_csv(PROC / "m6_banks.csv")

    # Per paese: copertura e confronto con il modulo 5
    m3 = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    bsi = m3[(m3.mese == PERIOD_MONTH) & (m3.serie == "totale")].set_index("paese").milioni_eur / 1000
    cbd = (pd.read_csv(CBD).set_index("paese").migliaia_eur / 1e6) if CBD.exists() else pd.Series(dtype=float)
    m5 = pd.read_csv(PROC / "m5_credit_by_country.csv")
    m5 = m5[(m5.scenario == "P_centrale") & (m5.regola_paesi == "R1")].set_index("paese")
    g = ok.groupby("paese")
    c = pd.DataFrame({"banche": g.size(), "banche_alta_quota_retail": g.quota_retail_alta.sum(), "totale_attivo_campione": g.totale_attivo.sum(),
                      "deflusso_campione": g.deflusso.sum(), "credito_campione": g.credito.sum(), "prestiti_campione": g.prestiti.sum()}).reindex(EURO_AREA)
    c.insert(0, "nome", [NAMES[k] for k in c.index])
    c["banche"] = c.banche.fillna(0).astype(int)
    c["totale_attivo_bsi"] = bsi.reindex(c.index)
    c["copertura_su_bsi"] = c.totale_attivo_campione / c.totale_attivo_bsi
    c["totale_attivo_consolidato"] = cbd.reindex(c.index)
    c["copertura_su_consolidato"] = c.totale_attivo_campione / c.totale_attivo_consolidato
    c["m6_credito_per_euro"] = c.credito_campione / c.deflusso_campione
    c["m6_credito_pct_prestiti"] = 100 * c.credito_campione / c.prestiti_campione
    for k in ("basso", "alto", "soglia", "continua", "uniforme"):
        c[f"m5_{k}_per_euro"] = m5[f"{k}_mld"] / m5.deflusso_mld
    c["m5_quota_retail_alta"] = m5.quota_retail_alta.reindex(c.index)
    c["deflusso_paese"] = m5.deflusso_mld
    c["m6_credito_riportato_al_paese"] = c.m6_credito_per_euro * c.deflusso_paese   # credito per euro delle banche × deflusso del paese
    c["m5_soglia_mld"], c["m5_continua_mld"], c["m5_uniforme_mld"] = m5.soglia_mld, m5.continua_mld, m5.uniforme_mld
    c.round(6).to_csv(PROC / "m6_by_country.csv")

    cov = c[c.banche > 0]
    area = {"deflusso_paesi_coperti": float(cov.deflusso_paese.sum()), "m6": float(cov.m6_credito_riportato_al_paese.sum()),
            "m5_soglia": float(cov.m5_soglia_mld.sum()), "m5_continua": float(cov.m5_continua_mld.sum()), "m5_uniforme": float(cov.m5_uniforme_mld.sum()),
            "m5_basso": float((cov.m5_basso_per_euro * cov.deflusso_paese).sum()), "m5_alto": float((cov.m5_alto_per_euro * cov.deflusso_paese).sum())}
    area["m6_per_euro"] = area["m6"] / area["deflusso_paesi_coperti"]
    summary = {
        "fonte": "EBA, esercizio di trasparenza 2025 (pubblicato il 4 dicembre 2025), database completo", "data_dei_dati": "2025-06-30",
        "avvertenza": "Dati pubblici per banca al massimo livello di consolidamento: non sono dati di vigilanza riservati e l'ordine non è un giudizio sulla solidità.",
        "criterio_di_sufficienza": {"banche_minime": MIN_BANKS, "paesi_minimi": MIN_COUNTRIES, "banche_area_euro_nel_campione": int(len(b)),
                                    "banche_con_dati_completi": int(len(ok)), "paesi_coperti": int(ok.paese.nunique()), "soddisfatto": bool(sufficient),
                                    "paesi_senza_banche": sorted(set(EURO_AREA) - set(ok.paese)),
                                    "banche_escluse": [{"lei": k, "nome": r.nome, "paese": r.paese} for k, r in b[~b.dati_completi].iterrows()]},
        "voci_trovate": {"depositi_famiglie_e_imprese": True, "di_cui_a_vista": True, "depositi_da_banche": True, "titoli_emessi": True, "totale_attivo": True,
                         "prestiti_a_famiglie_e_imprese": True, "esposizioni_in_dollari": False,
                         "nota_dollari": "Nessuna scomposizione per valuta. Sono riportate le esposizioni creditizie originarie verso controparti statunitensi, pubblicate solo quando gli Stati Uniti sono tra i primi dieci paesi della banca."},
        "soglia_quota_retail": {"percentile": RETAIL_PERCENTILE, "valore": threshold, "banche_sopra": int(ok.quota_retail_alta.sum()),
                                "mediana": float(ok.quota_retail.median()), "soglia_tra_paesi_modulo5": json.loads((PROC / "m5_summary.json").read_text())["soglia_quota_retail"]["valore"]},
        "campione": {"totale_attivo_mld": float(ok.totale_attivo.sum()), "copertura_area_su_bsi": float(c.totale_attivo_campione.sum() / c.totale_attivo_bsi.sum()),
                     "copertura_area_su_consolidato": float(c.totale_attivo_campione.sum() / c.totale_attivo_consolidato.sum()) if c.totale_attivo_consolidato.notna().any() else None,
                     "banche_con_esposizione_usa": int(ok.esposizione_usa.notna().sum()), "mese_bsi": PERIOD_MONTH, "trimestre_consolidato": PERIOD_QUARTER if CBD.exists() else None},
        "scenario_di_controllo": {"importo_mld_eur": ref["centrale_mld_eur"], "regola_paesi": "R1", "regola_depositi": "T1", "sostituzione": 1.0, "mese_bilanci_paese": month},
        "confronto_modulo5_paesi_coperti": area,
        "per_paese": c.reset_index().rename(columns={"index": "paese"}).replace({np.nan: None}).to_dict("records"),
        "prime_dieci_per_credito_pct": [{"lei": k, "nome": r.nome, "paese": r.paese, "quota_retail": float(r.quota_retail), "credito_pct_prestiti": float(r.credito_pct_prestiti)}
                                        for k, r in ok.sort_values("credito_pct_prestiti", ascending=False).head(10).iterrows()],
    }
    (PROC / "m6_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(json.dumps({k: summary[k] for k in ("criterio_di_sufficienza", "soglia_quota_retail", "campione", "confronto_modulo5_paesi_coperti")}, indent=1, ensure_ascii=False))
    if not sufficient:
        sys.exit("criterio di sufficienza non soddisfatto: servono le statistiche di vigilanza aggregate")


if __name__ == "__main__":
    main()
