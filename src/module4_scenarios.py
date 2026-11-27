"""Module 4: adoption scenarios for dollar stablecoins and bank funding by country.

Accounting exercise defined in reports/05_module4_scenarios.md (section 2): given an amount of
stablecoins held in the euro area, it allocates it across countries and computes how much the
funding of each one falls and how much wholesale funding would be needed to replace it.

Inputs: data/raw/m3_bsi.csv (balance sheets of module 3), the single exchange rate from
data/processed/m1_level.json, Eurostat demo_pjan (population, stored in data/raw/m4_inputs.json),
data/processed/level_own.json, data/raw/r3_crypto_ownership.json and
data/raw/level_own_population.json (rule R3).
Outputs: data/processed/m4_scenarios_by_country.csv, m4_euro_area.csv, m4_main_table.csv,
m4_thresholds.csv, m4_rule_comparison.csv, m4_r3_weights.csv, m4_summary.json (or m4_custom.csv
with --importo-usd); figure reports/figures/05_scenario_s2.png.

Usage: python src/module4_scenarios.py                    # ESM scenarios, thresholds and sensitivity
       python src/module4_scenarios.py --offline          # without downloading the population
       python src/module4_scenarios.py --importo-usd 250  # any level, in USD billion
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import requests

from module5_credit import NAMES_EN

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC, FIG = ROOT / "data" / "raw", ROOT / "data" / "processed", ROOT / "reports" / "figures"
INPUTS = RAW / "m4_inputs.json"
NAMES = {
    "AT": "Austria",
    "BE": "Belgio",
    "BG": "Bulgaria",
    "CY": "Cipro",
    "DE": "Germania",
    "EE": "Estonia",
    "ES": "Spagna",
    "FI": "Finlandia",
    "FR": "Francia",
    "GR": "Grecia",
    "HR": "Croazia",
    "IE": "Irlanda",
    "IT": "Italia",
    "LT": "Lituania",
    "LU": "Lussemburgo",
    "LV": "Lettonia",
    "MT": "Malta",
    "NL": "Paesi Bassi",
    "PT": "Portogallo",
    "SI": "Slovenia",
    "SK": "Slovacchia",
}
# Amounts in USD billion, ESM Working Paper 79, section 5
SCENARIOS = {"S0_oggi": 19.0, "S1_base_2030": 143.0, "S2_alto_2030": 300.0, "S3_alto_2030_quota_doppia": 600.0}
ESM_CIRCULATION = {"T3_2025": 248.0, "base_2030": 1900.0, "alto_2030": 4000.0}
SUBSTITUTION = 1.0
THRESHOLDS = [0.01, 0.05, 0.10]


def load_balance_sheets() -> tuple[pd.DataFrame, str]:
    d = pd.read_csv(RAW / "m3_bsi.csv", dtype={"mese": str})
    month = d.mese.max()
    w = d[d.mese == month].pivot(index="paese", columns="serie", values="milioni_eur") / 1000  # EUR billion
    b = pd.DataFrame(
        {
            "vista_fam": w.vista_fam,
            "vista_imp": w.vista_imp,
            "dep_fam": w.dep_fam,
            "dep_imp": w.dep_imp,
            "ingrosso": w.titoli + w.dep_ifm,
            "totale": w.totale,
        }
    )
    b["vista"] = b.vista_fam + b.vista_imp
    b["clientela"] = b.dep_fam + b.dep_imp
    return b, month


def single_fx() -> tuple[float, str]:
    """Single exchange rate of the programme: the most recent ECB reference rate, read from module 1 (SPEC, prompt 6)."""
    c = json.loads((PROC / "m1_level.json").read_text())["cambio"]
    return float(c["usd_per_eur"]), c["data"]


def load_inputs(month: str, offline: bool) -> dict:
    """Single exchange rate of the programme (from module 1) and Eurostat population."""
    fx, fx_date = single_fx()
    if offline:
        out = json.loads(INPUTS.read_text())
        out.update({"usd_per_eur": fx, "data_cambio": fx_date})
        INPUTS.write_text(json.dumps(out, indent=2))
        return out

    geo = [("EL" if c == "GR" else c) for c in NAMES]
    r = requests.get(
        "https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_pjan",
        params=[("format", "JSON"), ("sex", "T"), ("age", "TOTAL"), ("sinceTimePeriod", "2024")] + [("geo", g) for g in geo],
        timeout=60,
    )
    r.raise_for_status()
    j = r.json()
    gi, ti = j["dimension"]["geo"]["category"]["index"], j["dimension"]["time"]["category"]["index"]
    year = max(ti)
    pop = {("GR" if g == "EL" else g): j["value"].get(str(gi[g] * len(ti) + ti[year])) for g in gi}
    out = {"usd_per_eur": fx, "data_cambio": fx_date, "anno_popolazione": year, "popolazione": pop}
    INPUTS.write_text(json.dumps(out, indent=2))
    return out


def load_r3() -> pd.DataFrame | None:
    """Rule R3: weights = share of crypto-asset owners × population aged 18 or over.

    The share by country comes from an external survey (data/raw/r3_crypto_ownership.json).
    Countries without data get the simple mean of the available shares, and are marked.
    """
    src, pop_path = RAW / "r3_crypto_ownership.json", RAW / "level_own_population.json"
    if not (src.exists() and pop_path.exists()):
        return None
    shares = json.loads(src.read_text())["quote_percentuali"]
    adults = pd.Series(json.loads(pop_path.read_text())["adulti_18_piu"], dtype=float)
    s = pd.Series(shares, dtype=float).reindex(sorted(NAMES))
    out = pd.DataFrame({"quota_possessori": s.fillna(s.mean()) / 100, "imputato": s.isna(), "adulti": adults.reindex(sorted(NAMES))})
    out["peso"] = out.quota_possessori * out.adulti
    out.index.name = "paese"
    return out


def allocate(b: pd.DataFrame, amount_eur: float, country_rule: str, deposit_rule: str, pop: pd.Series) -> pd.DataFrame:
    base = {"T1": b.vista, "T2": b.vista_fam, "T3": b.clientela}[deposit_rule]
    if country_rule == "R3":
        weights = load_r3().peso.reindex(b.index)
    else:
        weights = base if country_rule == "R1" else pop.reindex(b.index)
    out = pd.DataFrame(index=b.index)
    wanted = amount_eur * weights / weights.sum()
    out["deflusso_mld"] = np.minimum(wanted, base)
    out["eccedenza_mld"] = wanted - out.deflusso_mld
    from_overnight = out.deflusso_mld if deposit_rule != "T3" else out.deflusso_mld * b.vista / b.clientela
    out["perdita_categoria_colpita"] = out.deflusso_mld / base
    out["perdita_depositi_a_vista"] = from_overnight / b.vista
    out["perdita_depositi_clientela"] = out.deflusso_mld / b.clientela
    out["effetto_sulla_raccolta_pp"] = 100 * out.deflusso_mld / b.totale
    out["raccolta_ingrosso_necessaria_mld"] = out.deflusso_mld
    out["aumento_raccolta_ingrosso"] = out.deflusso_mld / b.ingrosso
    out["C1_prima"] = b.vista / b.totale
    out["C1_dopo"] = (b.vista - from_overnight) / b.totale
    return out


def euro_area(b: pd.DataFrame, a: pd.DataFrame) -> dict:
    f = a.deflusso_mld.sum()
    return {
        "deflusso_mld_eur": float(f),
        "perdita_depositi_a_vista": float((a.perdita_depositi_a_vista * b.vista).sum() / b.vista.sum()),
        "perdita_depositi_clientela": float(f / b.clientela.sum()),
        "effetto_sulla_raccolta_pp": float(100 * f / b.totale.sum()),
        "aumento_raccolta_ingrosso": float(f / b.ingrosso.sum()),
        "eccedenza_mld": float(a.eccedenza_mld.sum()),
    }


def main() -> None:
    args = sys.argv[1:]
    b, month = load_balance_sheets()
    inp = load_inputs(month, "--offline" in args)
    fx = inp["usd_per_eur"]
    pop = pd.Series(inp["popolazione"], dtype=float)

    if "--importo-usd" in args:
        usd = float(args[args.index("--importo-usd") + 1])
        eur = usd / fx * SUBSTITUTION
        alt = allocate(b, eur, "R2", "T1", pop)[["deflusso_mld", "effetto_sulla_raccolta_pp", "aumento_raccolta_ingrosso"]].add_suffix("_R2")
        table = allocate(b, eur, "R1", "T1", pop).join(alt)
        table.insert(0, "nome", [NAMES[k] for k in table.index])
        table.sort_values("effetto_sulla_raccolta_pp", ascending=False).round(4).to_csv(PROC / "m4_custom.csv")
        print(
            f"Amount USD {usd:.0f} bn = EUR {eur:.1f} bn at the exchange rate {fx} of {inp['data_cambio']}; "
            f"euro area: {euro_area(b, allocate(b, eur, 'R1', 'T1', pop))}"
        )
        print(table.sort_values("effetto_sulla_raccolta_pp", ascending=False).round(3).to_string())
        return

    scenarios = dict(SCENARIOS)
    m1 = PROC / "m1_level.json"
    if m1.exists():  # current level produced by module 1
        lv = json.loads(m1.read_text())
        scenarios = {"M1_oggi_base": lv["livello"]["base_mld_usd"], "M1_oggi_alto": lv["livello"]["alto_mld_usd"], **SCENARIOS}
    own = PROC / "level_own.json"
    if own.exists():  # reference level of the programme, in euro: converted at the exchange rate used for the balance sheets
        ref = json.loads(own.read_text())["livello_di_riferimento"]
        scenarios = {
            "P_minimo": ref["minimo_mld_eur"] * fx,
            "P_centrale": ref["centrale_mld_eur"] * fx,
            "P_massimo": ref["massimo_mld_eur"] * fx,
            **scenarios,
        }

    r3 = load_r3()
    country_rules = ["R1", "R2"] + (["R3"] if r3 is not None else [])
    if r3 is not None:
        r3.round(6).to_csv(PROC / "m4_r3_weights.csv")

    rows, ea = [], []
    for name, usd in scenarios.items():
        eur = usd / fx * SUBSTITUTION
        for cr in country_rules:
            for dr in ("T1", "T2", "T3"):
                a = allocate(b, eur, cr, dr, pop)
                a.insert(0, "nome", [NAMES[k] for k in a.index])
                rows.append(a.assign(scenario=name, regola_paesi=cr, regola_depositi=dr, importo_mld_usd=usd).reset_index())
                ea.append(
                    {"scenario": name, "importo_mld_usd": usd, "importo_mld_eur": eur, "regola_paesi": cr, "regola_depositi": dr, **euro_area(b, a)}
                )
    allr = pd.concat(rows, ignore_index=True)
    allr.round(6).to_csv(PROC / "m4_scenarios_by_country.csv", index=False)
    ea = pd.DataFrame(ea)
    ea.round(6).to_csv(PROC / "m4_euro_area.csv", index=False)

    base_cols = [
        "nome",
        "deflusso_mld",
        "perdita_depositi_a_vista",
        "perdita_depositi_clientela",
        "effetto_sulla_raccolta_pp",
        "aumento_raccolta_ingrosso",
    ]
    cols = {"nome": pd.Series(NAMES).reindex(b.index)}
    for name in scenarios:
        for cr in country_rules:
            sel = allr[(allr.scenario == name) & (allr.regola_paesi == cr) & (allr.regola_depositi == "T1")].set_index("paese")
            for col in base_cols[1:]:
                cols[f"{name}|{cr}|{col}"] = sel[col]
    wide = pd.DataFrame(cols)
    wide.round(6).to_csv(PROC / "m4_main_table.csv")

    # Thresholds: amount corresponding to a given loss of the area's sight deposits
    thr = []
    for x in THRESHOLDS:
        eur = x * b.vista.sum() / SUBSTITUTION
        usd = eur * fx
        thr.append(
            {
                "perdita_depositi_a_vista_area": x,
                "importo_mld_eur": eur,
                "importo_mld_usd": usd,
                "multiplo_di_S0": usd / SCENARIOS["S0_oggi"],
                **{f"quota_circolazione_{k}": usd / v for k, v in ESM_CIRCULATION.items()},
            }
        )
    pd.DataFrame(thr).round(6).to_csv(PROC / "m4_thresholds.csv", index=False)

    # Comparison between rules in scenario S2
    ref = "S2_alto_2030"

    def pick(cr, dr, col="effetto_sulla_raccolta_pp"):
        return allr[(allr.scenario == ref) & (allr.regola_paesi == cr) & (allr.regola_depositi == dr)].set_index("paese")[col]

    r1, r2 = pick("R1", "T1"), pick("R2", "T1")
    cmp = pd.DataFrame(
        {
            "nome": pd.Series(NAMES),
            "R1_pp": r1,
            "R2_pp": r2,
            "rapporto_R2_su_R1": r2 / r1,
            "R1_perdita_vista": pick("R1", "T1", "perdita_depositi_a_vista"),
            "R2_perdita_vista": pick("R2", "T1", "perdita_depositi_a_vista"),
            "depositi_a_vista_per_abitante_eur": b.vista * 1e9 / pop.reindex(b.index),
            "R1_aumento_ingrosso": pick("R1", "T1", "aumento_raccolta_ingrosso"),
            "R2_aumento_ingrosso": pick("R2", "T1", "aumento_raccolta_ingrosso"),
        }
    )
    r3_info = None
    if r3 is not None:
        cmp["R3_pp"] = pick("R3", "T1")
        cmp["R3_perdita_vista"] = pick("R3", "T1", "perdita_depositi_a_vista")
        cmp["R3_aumento_ingrosso"] = pick("R3", "T1", "aumento_raccolta_ingrosso")
        cmp["quota_possessori"] = r3.quota_possessori
        r3_src = json.loads((RAW / "r3_crypto_ownership.json").read_text())
        r3_info = {
            "fonte": r3_src.get("fonte"),
            "anno": r3_src.get("anno"),
            "paesi_con_dato": int((~r3.imputato).sum()),
            "paesi_imputati": sorted(r3.index[r3.imputato]),
            "correlazione_di_rango_R3_R1": float(cmp.R3_pp.rank().corr(cmp.R1_pp.rank())),
            "correlazione_di_rango_R3_R2": float(cmp.R3_pp.rank().corr(cmp.R2_pp.rank())),
            "primi_cinque_R3": cmp.sort_values("R3_pp", ascending=False).head(5).index.tolist(),
            "variazione_massima_rispetto_a_R1": {"paese": (cmp.R3_pp / cmp.R1_pp).idxmax(), "rapporto": float((cmp.R3_pp / cmp.R1_pp).max())},
            "variazione_minima_rispetto_a_R1": {"paese": (cmp.R3_pp / cmp.R1_pp).idxmin(), "rapporto": float((cmp.R3_pp / cmp.R1_pp).min())},
        }
    cmp.sort_values("R2_pp", ascending=False).round(6).to_csv(PROC / "m4_rule_comparison.csv")

    def rank_corr(x, y):
        return float(x.rank().corr(y.rank()))

    summary = {
        "mese_bilanci": month,
        "cambio_usd_per_eur": fx,
        "data_cambio": inp["data_cambio"],
        "anno_popolazione": inp["anno_popolazione"],
        "tasso_di_sostituzione": SUBSTITUTION,
        "area_euro": {
            "depositi_a_vista_mld": float(b.vista.sum()),
            "depositi_clientela_mld": float(b.clientela.sum()),
            "raccolta_ingrosso_mld": float(b.ingrosso.sum()),
            "totale_passivo_mld": float(b.totale.sum()),
            "popolazione": float(pop.sum()),
        },
        "scenari_area_euro_R1_T1": ea[(ea.regola_paesi == "R1") & (ea.regola_depositi == "T1")]
        .set_index("scenario")
        .drop(columns=["regola_paesi", "regola_depositi"])
        .to_dict("index"),
        "soglie": thr,
        "regola_R3": r3_info,
        "confronto_regole_S2": {
            "correlazione_di_rango_R1_R2_effetto": rank_corr(r1, r2),
            "correlazione_di_rango_R1_R2_aumento_ingrosso": rank_corr(cmp.R1_aumento_ingrosso, cmp.R2_aumento_ingrosso),
            "eccedenza_R2_mld": float(allr[(allr.scenario == "S3_alto_2030_quota_doppia") & (allr.regola_paesi == "R2")].eccedenza_mld.sum()),
            "tipi_di_deposito_area_euro": ea[(ea.scenario == ref) & (ea.regola_paesi == "R1")]
            .set_index("regola_depositi")[["deflusso_mld_eur", "perdita_depositi_a_vista", "perdita_depositi_clientela"]]
            .to_dict("index"),
            "correlazione_di_rango_T1_T2": rank_corr(pick("R1", "T1"), pick("R1", "T2")),
            "correlazione_di_rango_T1_T3": rank_corr(pick("R1", "T1"), pick("R1", "T3")),
        },
        "sensibilita_S2_area_euro": {
            "sostituzione_50_per_cento": euro_area(b, allocate(b, SCENARIOS[ref] / fx * 0.5, "R1", "T1", pop)),
            "cambio_piu_10": euro_area(b, allocate(b, SCENARIOS[ref] / (fx * 1.1), "R1", "T1", pop)),
            "cambio_meno_10": euro_area(b, allocate(b, SCENARIOS[ref] / (fx * 0.9), "R1", "T1", pop)),
        },
    }
    (PROC / "m4_summary.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    plot(cmp, ref)
    print(json.dumps(summary, indent=2, ensure_ascii=False))


def plot(cmp: pd.DataFrame, ref: str) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ink, muted, grid, surface, blue, orange = "#0b0b0b", "#52514e", "#e4e3df", "#fcfcfb", "#2a78d6", "#eb6834"
    d = cmp.sort_values("R1_pp")
    y = np.arange(len(d))
    fig, ax = plt.subplots(figsize=(7.8, 6.8), facecolor=surface)
    ax.set_facecolor(surface)
    ax.hlines(y, d.R1_pp, d.R2_pp, color=grid, lw=2, zorder=1)
    ax.scatter(d.R1_pp, y, color=blue, s=48, zorder=3, edgecolor=surface, linewidth=1.5, label="R1 - pro rata on deposits")
    ax.scatter(d.R2_pp, y, color=orange, s=48, zorder=2, edgecolor=surface, linewidth=1.5, label="R2 - per capita")
    ax.set_yticks(y)
    ax.set_yticklabels([NAMES_EN[k] for k in d.index])
    ax.tick_params(colors=muted, labelsize=9, length=0)
    ax.grid(axis="x", color=grid, lw=0.8)
    ax.set_axisbelow(True)
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color(grid)
    ax.set_xlim(left=0)
    ax.set_xlabel("Funding to replace, in percentage points of liabilities", color=muted, fontsize=9)
    ax.set_title("Scenario S2 (USD 300 billion): effect on funding by country", loc="left", fontsize=12, color=ink)
    ax.legend(frameon=False, fontsize=9, labelcolor=muted, loc="lower right")
    fig.tight_layout()
    FIG.mkdir(parents=True, exist_ok=True)
    fig.savefig(FIG / "05_scenario_s2.png", dpi=160, facecolor=surface)
    plt.close(fig)


if __name__ == "__main__":
    main()
