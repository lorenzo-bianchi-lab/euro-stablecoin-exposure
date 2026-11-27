"""Automatic tests of the programme.

They cover four properties: balance sheets adding up, linearity of the scenarios, sum of the
allocations and reproducibility without network; plus the data layer of the application and
the match between the calculations of the application and those of the scripts.

Inputs: the files in data/processed, data/raw and web/public/data; the application tests in
web/ (npm test), when its dependencies are installed.
Outputs: none in the repository (the reproducibility test works in a temporary copy;
tests/make_app_fixtures.py rewrites web/tests/fixtures.json).

Usage: .venv/bin/python -m unittest discover -s tests -v
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW, PROC = ROOT / "data" / "raw", ROOT / "data" / "processed"
sys.path.insert(0, str(ROOT / "src"))

import module4_scenarios as m4  # noqa: E402
import module5_credit as m5  # noqa: E402


def balance_sheets():
    b, month = m4.load_balance_sheets()
    inp = json.loads((RAW / "m4_inputs.json").read_text())
    return b, pd.Series(inp["popolazione"], dtype=float), inp["usd_per_eur"]


def rules() -> list[str]:
    return ["R1", "R2"] + (["R3"] if (PROC / "m4_r3_weights.csv").exists() else [])


class BalanceSheets(unittest.TestCase):
    def test_liability_items_sum_to_total(self):
        comp = pd.read_csv(PROC / "m3_composition.csv")
        self.assertGreater(len(comp), 5000)
        self.assertLessEqual(comp.scarto.abs().max(), 0.005, "gap beyond the declared tolerance of 0.5%")
        parts = comp.drop(columns=["paese", "mese", "totale_passivo_mln"]).sum(axis=1)
        self.assertAlmostEqual(float((parts - 1).abs().max()), 0.0, places=5)

    def test_all_countries_in_the_last_month(self):
        comp = pd.read_csv(PROC / "m3_composition.csv")
        self.assertEqual(comp[comp.mese == comp.mese.max()].paese.nunique(), 21)


class Scenarios(unittest.TestCase):
    def test_linearity_in_the_amount(self):
        b, pop, fx = balance_sheets()
        for rule in rules():
            a1, a2 = m4.allocate(b, 50.0, rule, "T1", pop), m4.allocate(b, 100.0, rule, "T1", pop)
            for col in ("deflusso_mld", "effetto_sulla_raccolta_pp", "aumento_raccolta_ingrosso"):
                self.assertTrue(((a2[col] - 2 * a1[col]).abs() < 1e-9).all(), f"{rule} {col} is not linear")

    def test_allocation_sums_to_the_amount(self):
        b, pop, fx = balance_sheets()
        for rule in rules():
            for dep in ("T1", "T2", "T3"):
                a = m4.allocate(b, 264.2, rule, dep, pop)
                self.assertAlmostEqual(float(a.deflusso_mld.sum() + a.eccedenza_mld.sum()), 264.2, places=8)
                self.assertTrue((a.deflusso_mld >= 0).all())

    def test_scenario_files_sum_to_the_amount(self):
        ea = pd.read_csv(PROC / "m4_euro_area.csv")
        byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
        tot = byc.groupby(["scenario", "regola_paesi", "regola_depositi"]).deflusso_mld.sum()
        for r in ea.itertuples():
            got = tot.loc[(r.scenario, r.regola_paesi, r.regola_depositi)]
            self.assertAlmostEqual(got + r.eccedenza_mld, r.importo_mld_eur, places=4)

    def test_r1_makes_every_country_lose_the_same_share(self):
        b, pop, fx = balance_sheets()
        a = m4.allocate(b, 100.0, "R1", "T1", pop)
        self.assertLess(a.perdita_depositi_a_vista.max() - a.perdita_depositi_a_vista.min(), 1e-12)

    def test_credit_is_linear_and_ordered(self):
        credit = pd.read_csv(PROC / "m5_credit_by_country.csv")
        self.assertTrue((credit.basso_mld <= credit.alto_mld + 1e-12).all())
        self.assertTrue(((credit.uniforme_mld - 0.5 * credit.deflusso_mld).abs() < 1e-5).all())
        s1 = credit[(credit.scenario == "S2_alto_2030") & (credit.regola_paesi == "R1")].set_index("paese")
        s2 = credit[(credit.scenario == "S3_alto_2030_quota_doppia") & (credit.regola_paesi == "R1")].set_index("paese")
        self.assertTrue(((s2.soglia_mld - 2 * s1.soglia_mld).abs() < 1e-4).all())


class Application(unittest.TestCase):
    """The application reads only the exported JSON files and redoes the calculations in the browser with the same formulas."""

    DATA = ROOT / "web" / "public" / "data"
    SECTIONS = ["overview.json", "simulator.json", "channels.json", "monitor.json", "level.json", "method.json", "meta.json", "banks.json"]

    def test_every_file_is_versioned_and_documented(self):
        files = [self.DATA / f for f in self.SECTIONS] + sorted((self.DATA / "countries").glob("*.json"))
        self.assertEqual(len(files), len(self.SECTIONS) + 21)
        for f in files:
            doc = json.loads(f.read_text(encoding="utf-8"))
            for key in ("schema", "file", "generato_il", "dati_al", "descrizione", "campi"):
                self.assertIn(key, doc, f"{f.name}: {key} missing")
            self.assertRegex(doc["schema"], r"^\d+\.\d+\.\d+$")
        self.assertTrue((self.DATA / "README.md").exists())

    def test_every_source_has_a_date_and_a_status(self):
        meta = json.loads((self.DATA / "meta.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(meta["fonti"]), 8)
        allowed = ("aggiornata", "parziale", "ultimo_valido", "non_aggiornata", "statica")
        for s in meta["fonti"]:
            self.assertTrue(s["datiAl"], f"{s['id']}: data date missing")
            self.assertIn(s["tipoData"], ("giorno", "settimana", "mese", "trimestre", "anno", "testo"), s["id"])
            self.assertIn(s["stato"], allowed, f"{s['id']}: unexpected status ({s['stato']})")

    def test_single_exchange_rate_across_the_programme(self):
        """Module 1, module 4 and the application use the same exchange rate: the ESM assumption has a single value."""
        m1 = json.loads((PROC / "m1_level.json").read_text())
        m4s = json.loads((PROC / "m4_summary.json").read_text())
        sim = json.loads((self.DATA / "simulator.json").read_text(encoding="utf-8"))
        ov = json.loads((self.DATA / "overview.json").read_text(encoding="utf-8"))
        lv = json.loads((self.DATA / "level.json").read_text(encoding="utf-8"))
        self.assertEqual(m1["cambio"]["usd_per_eur"], m4s["cambio_usd_per_eur"])
        self.assertAlmostEqual(sim["cambioUsdPerEur"], m1["cambio"]["usd_per_eur"], places=6)
        esm = {p["id"]: p["eur"] for p in sim["predefiniti"]}["ESM_oggi"]
        for other in (ov["livello"]["esmBase"], lv["esm"]["baseEur"], lv["esm"]["serie"]["base"][-1]):
            self.assertAlmostEqual(esm, other, delta=1e-3)

    def test_spec_texts_all_have_a_translation(self):
        """No untranslated string among the texts that the application takes from SPEC.md."""
        import export_app_data as exp

        it = exp.spec_it()
        missing = [x for x in exp.spec_strings() if x not in it or not it[x].strip()]
        self.assertEqual(missing, [], "SPEC.md texts without an Italian version in src/i18n/spec_it.json")
        metodo = json.loads((self.DATA / "method.json").read_text(encoding="utf-8"))
        self.assertEqual(len(metodo["limiti"]["it"]), len(metodo["limiti"]["en"]))
        self.assertEqual(len(metodo["fonti"]["it"]["righe"]), len(metodo["fonti"]["en"]["righe"]))

    def test_simulator_data_match_the_balance_sheets(self):
        sim = json.loads((self.DATA / "simulator.json").read_text(encoding="utf-8"))
        b, pop, fx = balance_sheets()
        self.assertEqual(len(sim["paesi"]), 21)
        ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
        self.assertAlmostEqual(sim["livello"]["centrale"], ref["centrale_mld_eur"], places=4)
        self.assertAlmostEqual(sim["cambioUsdPerEur"], fx, places=6)

    def test_pairs_without_response_are_recognised(self):
        import export_app_data as exp

        store = pd.DataFrame(
            {
                "exchange": ["A"] * 3 + ["B"] * 3,
                "symbol": ["USDTEUR"] * 3 + ["USDTUSD"] * 3,
                "date": ["2026-01-01", "2026-01-02", "2026-01-03"] * 2,
                "volume_stable": [1.0, 1.0, 1.0, 9.0, 9.0, 9.0],
            }
        )
        log = pd.DataFrame({"exchange": ["A", "B", "C"], "symbol": ["USDTEUR", "USDTUSD", "XYZUSDT"], "status": ["errore", "ok", "errore"]})
        m = exp.missing_pairs(log, store)
        self.assertEqual(m["coppie"], ["A USDTEUR"])  # it had data: really missing
        self.assertEqual(m["maiDisponibili"], ["C XYZUSDT"])  # never had data: carries no weight
        self.assertAlmostEqual(m["quotaVolume"], 0.1, places=9)
        self.assertEqual(m["datiFinoAl"], "2026-01-03")
        self.assertIsNone(exp.missing_pairs(log[log.status == "ok"], store))

    @unittest.skipUnless(shutil.which("npm") and (ROOT / "web" / "node_modules").exists(), "application dependencies not installed (npm ci in web/)")
    def test_application_reproduces_the_scripts(self):
        """Three scenarios for each rule: the expected values come from modules 4 and 5, the TypeScript model must match."""
        r = subprocess.run([sys.executable, str(ROOT / "tests" / "make_app_fixtures.py")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        fixtures = json.loads((ROOT / "web" / "tests" / "fixtures.json").read_text())
        per_rule = {rule: sum(c["scenario"]["regola"] == rule for c in fixtures["casi"]) for rule in ("R1", "R2", "R3")}
        self.assertTrue(all(n >= 3 for n in per_rule.values()), per_rule)
        r = subprocess.run(["npm", "test", "--silent"], cwd=ROOT / "web", capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, (r.stdout + r.stderr)[-1500:])


class WeeklyIndex(unittest.TestCase):
    """Bybit is out of the index for the whole history: local and automatic runs coincide."""

    def test_bybit_is_not_in_the_index(self):
        part = pd.read_csv(PROC / "m2_exchange_participation.csv")
        self.assertNotIn("Bybit", set(part.exchange))
        m2 = json.loads((PROC / "m2_summary.json").read_text())
        self.assertEqual(m2["pannello"]["esclusi"], ["Bybit"])
        self.assertEqual(m2["pannello"]["exchange"], part[part.week >= "2024-12-09"].exchange.nunique())
        self.assertGreater(m2["effetto_esclusione"]["settimane_confrontate"], 50)
        import exchange_fetch

        self.assertNotIn("Bybit", [e[0] for e in exchange_fetch.PANEL])


class Banks(unittest.TestCase):
    """Module 6: bank-level data of the EBA transparency exercise."""

    @classmethod
    def setUpClass(cls):
        cls.b = pd.read_csv(PROC / "m6_banks.csv", index_col=0)
        cls.c = pd.read_csv(PROC / "m6_by_country.csv", index_col=0)
        cls.s = json.loads((PROC / "m6_summary.json").read_text())

    def test_sufficiency_criterion(self):
        k = self.s["criterio_di_sufficienza"]
        self.assertTrue(k["soddisfatto"])
        self.assertGreaterEqual(len(self.b), k["banche_minime"])
        self.assertGreaterEqual(self.b.paese.nunique(), k["paesi_minimi"])
        self.assertTrue(set(self.b.paese) <= set(m5.NAMES))

    def test_retail_share_and_threshold(self):
        b = self.b
        self.assertTrue(np.allclose(b.quota_retail, b.dep_famiglie / (b.dep_famiglie + b.dep_altre_fin), atol=1e-5))
        thr = self.s["soglia_quota_retail"]["valore"]
        self.assertAlmostEqual(thr, float(np.percentile(b.quota_retail, 75)), places=5)
        self.assertTrue(((b.quota_retail > thr) == b.quota_retail_alta).all())
        self.assertAlmostEqual(b.quota_retail_alta.mean(), 0.25, delta=0.02)

    def test_balance_sheet_items_are_consistent(self):
        b = self.b
        self.assertTrue((b.vista_famiglie <= b.dep_famiglie + 1e-6).all() and (b.vista_imprese <= b.dep_imprese + 1e-6).all())
        raccolta = b.dep_famiglie + b.dep_imprese + b.dep_altre_fin + b.dep_banche + b.titoli_emessi
        self.assertTrue((raccolta <= b.totale_attivo * 1.0001).all(), "deposits and securities exceed total assets")
        self.assertTrue((b.prestiti <= b.totale_attivo).all())

    def test_bank_credit_follows_the_definition(self):
        b = self.b
        coef = np.where(b.quota_retail_alta, 3.089, 0.441)
        expected = coef * (100 * b.deflusso / b.totale_attivo / 0.8) / 100 * b.prestiti
        self.assertTrue(np.allclose(b.credito, expected, rtol=1e-4, atol=1e-6))
        # re-aggregated, the credit per euro lies between the low and the high coefficient of module 5 on the same countries
        a = self.s["confronto_modulo5_paesi_coperti"]
        self.assertTrue(a["m5_basso"] < a["m6"] < a["m5_alto"])

    def test_coverage_is_reported_for_every_country(self):
        self.assertEqual(len(self.c), 21)
        covered = self.c[self.c.banche > 0]
        self.assertTrue(covered.copertura_su_bsi.notna().all())
        self.assertEqual(int(self.c.banche.sum()), len(self.b))


def decimals(text: pd.Series) -> int:
    """Maximum number of decimal digits written in a column."""
    frac = text.dropna().str.extract(r"\.(\d+)$")[0].dropna()
    return int(frac.str.len().max()) if len(frac) else 0


class Reproducibility(unittest.TestCase):
    """Running everything again without network, in a copy, must give the same results.

    The comparison is numerical and tolerates one unit on the last decimal digit written in each column:
    different versions of the libraries or of the processor can round the last digit differently.
    """

    FILES = [
        "m1_monthly_series.csv",
        "m2_weekly_index.csv",
        "m2_flags.csv",
        "m3_ranking_latest.csv",
        "m3_composition.csv",
        "m4_scenarios_by_country.csv",
        "m5_credit_by_country.csv",
        "m5_two_channel_map.csv",
        "m6_banks.csv",
    ]

    def assert_same(self, name: str, before: Path, after: Path) -> None:
        a_txt, b_txt = pd.read_csv(before, dtype=str), pd.read_csv(after, dtype=str)
        self.assertEqual(list(a_txt.columns), list(b_txt.columns), name)
        self.assertEqual(len(a_txt), len(b_txt), name)
        a, b = pd.read_csv(before), pd.read_csv(after)
        for col in a.columns:
            if pd.api.types.is_float_dtype(a[col]):
                tol = 1.5 * 10.0 ** -decimals(a_txt[col])
                x, y = a[col].to_numpy(float), b[col].to_numpy(float)
                self.assertTrue(np.array_equal(np.isnan(x), np.isnan(y)), f"{name}.{col}: different missing values")
                diff = float(np.nanmax(np.abs(x - y))) if len(x) and not np.isnan(x).all() else 0.0
                self.assertLessEqual(diff, tol, f"{name}.{col}: difference {diff} beyond the last decimal digit")
            else:
                self.assertTrue(a_txt[col].fillna("").equals(b_txt[col].fillna("")), f"{name}.{col}: different values")

    def test_offline_run_gives_the_same_results(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "repo"
            for d in ("src", "data"):
                shutil.copytree(ROOT / d, work / d, ignore=shutil.ignore_patterns("__pycache__", "labels", "eba_te2025"))
            shutil.copy(ROOT / "SPEC.md", work / "SPEC.md")
            (work / "reports" / "figures").mkdir(parents=True)
            r = subprocess.run([sys.executable, str(work / "src" / "run_all.py"), "--offline"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout[-800:] + r.stderr[-800:])
            for f in self.FILES:
                self.assert_same(f, PROC / f, work / "data" / "processed" / f)
            # the application data too: same countries and same simulator numbers
            old = json.loads((ROOT / "web" / "public" / "data" / "simulator.json").read_text(encoding="utf-8"))
            new = json.loads((work / "web" / "public" / "data" / "simulator.json").read_text(encoding="utf-8"))
            self.assertEqual([c["code"] for c in old["paesi"]], [c["code"] for c in new["paesi"]])
            for c_old, c_new in zip(old["paesi"], new["paesi"], strict=True):
                for k, v in c_old.items():
                    if isinstance(v, float):
                        self.assertAlmostEqual(v, c_new[k], delta=1.5e-6, msg=f"simulator.json {c_old['code']}.{k}")

    def test_comparison_tolerates_only_the_last_digit(self):
        with tempfile.TemporaryDirectory() as tmp:
            a, b, c = (Path(tmp) / n for n in ("a.csv", "b.csv", "c.csv"))
            a.write_text("paese,valore\nIT,1.2345\nFR,2.0000\n")
            b.write_text("paese,valore\nIT,1.2346\nFR,2.0000\n")
            c.write_text("paese,valore\nIT,1.2360\nFR,2.0000\n")
            self.assert_same("sample", a, b)
            with self.assertRaises(AssertionError):
                self.assert_same("sample", a, c)


if __name__ == "__main__":
    unittest.main(verbosity=2)
