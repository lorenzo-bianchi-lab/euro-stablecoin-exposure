"""Test automatici del programma.

Coprono quattro proprietà: quadratura dei bilanci, linearità degli scenari, somma delle
ripartizioni e riproducibilità senza rete; più la coerenza tra il cruscotto e gli script.

Uso: .venv/bin/python -m unittest discover -s tests -v
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

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


class Quadratura(unittest.TestCase):
    def test_le_voci_del_passivo_sommano_al_totale(self):
        comp = pd.read_csv(PROC / "m3_composition.csv")
        self.assertGreater(len(comp), 5000)
        self.assertLessEqual(comp.scarto.abs().max(), 0.005, "scarto oltre la tolleranza dichiarata dello 0,5%")
        parts = comp.drop(columns=["paese", "mese", "totale_passivo_mln"]).sum(axis=1)
        self.assertAlmostEqual(float((parts - 1).abs().max()), 0.0, places=5)

    def test_tutti_i_paesi_nell_ultimo_mese(self):
        comp = pd.read_csv(PROC / "m3_composition.csv")
        self.assertEqual(comp[comp.mese == comp.mese.max()].paese.nunique(), 21)


class Scenari(unittest.TestCase):
    def test_linearita_nell_importo(self):
        b, pop, fx = balance_sheets()
        for rule in rules():
            a1, a2 = m4.allocate(b, 50.0, rule, "T1", pop), m4.allocate(b, 100.0, rule, "T1", pop)
            for col in ("deflusso_mld", "effetto_sulla_raccolta_pp", "aumento_raccolta_ingrosso"):
                self.assertTrue(((a2[col] - 2 * a1[col]).abs() < 1e-9).all(), f"{rule} {col} non è lineare")

    def test_la_ripartizione_somma_all_importo(self):
        b, pop, fx = balance_sheets()
        for rule in rules():
            for dep in ("T1", "T2", "T3"):
                a = m4.allocate(b, 264.2, rule, dep, pop)
                self.assertAlmostEqual(float(a.deflusso_mld.sum() + a.eccedenza_mld.sum()), 264.2, places=8)
                self.assertTrue((a.deflusso_mld >= 0).all())

    def test_i_file_degli_scenari_sommano_all_importo(self):
        ea = pd.read_csv(PROC / "m4_euro_area.csv")
        byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
        tot = byc.groupby(["scenario", "regola_paesi", "regola_depositi"]).deflusso_mld.sum()
        for r in ea.itertuples():
            got = tot.loc[(r.scenario, r.regola_paesi, r.regola_depositi)]
            self.assertAlmostEqual(got + r.eccedenza_mld, r.importo_mld_eur, places=4)

    def test_r1_fa_perdere_a_tutti_la_stessa_quota(self):
        b, pop, fx = balance_sheets()
        a = m4.allocate(b, 100.0, "R1", "T1", pop)
        self.assertLess(a.perdita_depositi_a_vista.max() - a.perdita_depositi_a_vista.min(), 1e-12)

    def test_il_credito_e_lineare_e_ordinato(self):
        credit = pd.read_csv(PROC / "m5_credit_by_country.csv")
        self.assertTrue((credit.basso_mld <= credit.alto_mld + 1e-12).all())
        self.assertTrue(((credit.uniforme_mld - 0.5 * credit.deflusso_mld).abs() < 1e-5).all())
        s1 = credit[(credit.scenario == "S2_alto_2030") & (credit.regola_paesi == "R1")].set_index("paese")
        s2 = credit[(credit.scenario == "S3_alto_2030_quota_doppia") & (credit.regola_paesi == "R1")].set_index("paese")
        self.assertTrue(((s2.soglia_mld - 2 * s1.soglia_mld).abs() < 1e-4).all())


class Cruscotto(unittest.TestCase):
    """Il cruscotto rifà i calcoli nel browser: devono coincidere con quelli degli script."""

    @unittest.skipUnless(shutil.which("node"), "node non installato")
    def test_il_cruscotto_riproduce_gli_script(self):
        html = (ROOT / "docs" / "index.html").read_text(encoding="utf-8")
        data = re.search(r'<script id="data" type="application/json">(.*?)</script>', html, re.S).group(1)
        model = re.search(r'<script id="model">(.*?)</script>', html, re.S).group(1)
        cases = [{"usd": 300, "rule": r, "sigma": 1, "variant": "soglia"} for r in rules()]
        js = model + f"\nconst D = {data};\nconst cases = {json.dumps(cases)};\n" \
             "console.log(JSON.stringify(cases.map(c => compute(D, c.usd, c.rule, c.sigma, c.variant))));"
        out = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
        byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
        credit = pd.read_csv(PROC / "m5_credit_by_country.csv")
        for case, rows in zip(cases, out):
            ref = byc[(byc.scenario == "S2_alto_2030") & (byc.regola_paesi == case["rule"]) & (byc.regola_depositi == "T1")].set_index("paese")
            cref = credit[(credit.scenario == "S2_alto_2030") & (credit.regola_paesi == case["rule"])].set_index("paese")
            self.assertEqual(len(rows), 21)
            for r in rows:
                self.assertAlmostEqual(r["deflusso"], ref.loc[r["code"], "deflusso_mld"], places=4)
                self.assertAlmostEqual(r["aumentoIngrosso"], ref.loc[r["code"], "aumento_raccolta_ingrosso"], places=5)
                self.assertAlmostEqual(r["credito"], cref.loc[r["code"], "soglia_mld"], places=4)


class Riproducibilita(unittest.TestCase):
    """Rieseguire tutto senza rete, in una copia, deve dare gli stessi file di risultato."""

    FILES = ["m1_monthly_series.csv", "m2_weekly_index.csv", "m2_flags.csv", "m3_ranking_latest.csv", "m3_composition.csv",
             "m4_scenarios_by_country.csv", "m5_credit_by_country.csv", "m5_two_channel_map.csv"]

    def test_esecuzione_offline_identica(self):
        digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
        before = {f: digest(PROC / f) for f in self.FILES}
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "repo"
            for d in ("src", "data"):
                shutil.copytree(ROOT / d, work / d, ignore=shutil.ignore_patterns("__pycache__", "labels"))
            (work / "reports" / "figures").mkdir(parents=True)
            r = subprocess.run([sys.executable, str(work / "src" / "run_all.py"), "--offline"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout[-800:] + r.stderr[-800:])
            after = {f: digest(work / "data" / "processed" / f) for f in self.FILES}
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main(verbosity=2)
