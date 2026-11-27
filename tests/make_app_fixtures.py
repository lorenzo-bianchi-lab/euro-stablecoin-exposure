"""Generates the expected values for the application test, using the Python scripts.

For each allocation rule it computes three scenarios with modules 4 and 5 and saves them in
web/tests/fixtures.json. The test web/tests/model.test.ts checks that the model of the
application (web/src/lib/model.ts) gives the same numbers.

Inputs: data/raw/m3_bsi.csv, m4_inputs.json, level_own_population.json and the EBA extract;
data/processed/m5_retail_share.csv and level_own.json.
Output: web/tests/fixtures.json.

Usage: python tests/make_app_fixtures.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
import level_own  # noqa: E402
import module4_scenarios as m4  # noqa: E402
import module5_credit as m5  # noqa: E402
import module6_banks as m6  # noqa: E402

RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
VARIANTS = ["uniforme", "basso", "alto", "soglia", "continua"]


def main() -> None:
    b, _ = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    pop, fx = pd.Series(inp["popolazione"], dtype=float), inp["usd_per_eur"]
    bal = pd.read_csv(PROC / "m5_retail_share.csv", index_col=0)
    high = set(bal.index[bal.quota_retail_alta])
    ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
    # three scenarios per rule: different amounts, substitution rates and deposit types
    setups = [(ref["centrale_mld_eur"], 1.0, "T1"), (143 / fx, 0.75, "T2"), (600 / fx, 0.5, "T3")]
    cases = []
    for rule in ("R1", "R2", "R3"):
        for amount, sigma, dep in setups:
            a = m4.allocate(b, amount * sigma, rule, dep, pop)
            flows = pd.DataFrame(
                {
                    "scenario": "x",
                    "regola_paesi": rule,
                    "paese": a.index,
                    "nome": [m5.NAMES[k] for k in a.index],
                    "importo_mld_usd": amount * fx,
                    "deflusso_mld": a.deflusso_mld.to_numpy(),
                }
            )
            cr = m5.credit_effects(flows, bal, high).set_index("paese")
            cases.append(
                {
                    "scenario": {"importo": amount, "sostituzione": sigma, "regola": rule, "depositi": dep},
                    "paesi": {
                        k: {
                            "deflusso": float(a.deflusso_mld[k]),
                            "persiVista": float(a.perdita_depositi_a_vista[k]),
                            "persiClientela": float(a.perdita_depositi_clientela[k]),
                            "effettoPp": float(a.effetto_sulla_raccolta_pp[k]),
                            "aumentoIngrosso": float(a.raccolta_ingrosso_necessaria_mld[k] / b.ingrosso[k]),
                            **{f"credito_{v}": float(cr.loc[k, f"{v}_mld"]) for v in VARIANTS},
                        }
                        for k in a.index
                    },
                    "totale": {"deflusso": float(a.deflusso_mld.sum()), **{f"credito_{v}": float(cr[f"{v}_mld"].sum()) for v in VARIANTS}},
                }
            )
    # module 6: effect by bank in three scenarios, one per rule and per deposit type
    banks, _ = m6.indicators(m6.load_banks())
    banks = banks[banks.dati_completi]
    bank_cases = []
    for rule, (amount, sigma, dep) in zip(("R1", "R2", "R3"), setups, strict=True):
        a = m4.allocate(b, amount * sigma, rule, dep, pop)
        e = m6.bank_effects(banks, a.perdita_categoria_colpita, {"T1": "vista", "T2": "vista_famiglie", "T3": "clientela"}[dep])
        bank_cases.append(
            {
                "scenario": {"importo": amount, "sostituzione": sigma, "regola": rule, "depositi": dep},
                "banche": {
                    k: {
                        "deflusso": float(r.deflusso),
                        "credito": float(r.credito),
                        "creditoBasso": float(r.credito_basso),
                        "creditoAlto": float(r.credito_alto),
                    }
                    for k, r in e.iterrows()
                },
            }
        )
    b1 = level_own.b1(json.loads((RAW / "level_own_population.json").read_text()))
    out = {
        "generato_da": "tests/make_app_fixtures.py",
        "casi": cases,
        "banche": bank_cases,
        "livello": {u: {k: b1[u][f"{k}_mld_eur"] for k in ("minimo", "centrale", "massimo")} for u in ("famiglie", "individui")},
    }
    path = ROOT / "web" / "tests" / "fixtures.json"
    path.write_text(json.dumps(out, indent=1))
    print(f"wrote {path.relative_to(ROOT)}: {len(cases)} scenarios")


if __name__ == "__main__":
    main()
