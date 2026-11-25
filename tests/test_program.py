"""Test automatici del programma.

Coprono quattro proprietà: quadratura dei bilanci, linearità degli scenari, somma delle
ripartizioni e riproducibilità senza rete; più lo strato dati dell'applicazione e la
coincidenza tra i calcoli dell'applicazione e quelli degli script.

Uso: .venv/bin/python -m unittest discover -s tests -v
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


class Applicazione(unittest.TestCase):
    """L'applicazione legge solo i file JSON esportati e rifà i calcoli nel browser con le stesse formule."""

    DATA = ROOT / "web" / "public" / "data"
    SECTIONS = ["panoramica.json", "simulatore.json", "canali.json", "monitor.json", "livello.json", "metodo.json", "meta.json"]

    def test_ogni_file_e_versionato_e_documentato(self):
        files = [self.DATA / f for f in self.SECTIONS] + sorted((self.DATA / "paesi").glob("*.json"))
        self.assertEqual(len(files), len(self.SECTIONS) + 21)
        for f in files:
            doc = json.loads(f.read_text(encoding="utf-8"))
            for key in ("schema", "file", "generato_il", "dati_al", "descrizione", "campi"):
                self.assertIn(key, doc, f"{f.name}: manca {key}")
            self.assertRegex(doc["schema"], r"^\d+\.\d+\.\d+$")
        self.assertTrue((self.DATA / "README.md").exists())

    def test_ogni_fonte_ha_data_e_stato(self):
        meta = json.loads((self.DATA / "meta.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(len(meta["fonti"]), 8)
        allowed = ("aggiornata", "ultimo dato valido", "non aggiornata in questa esecuzione", "statica")
        for s in meta["fonti"]:
            self.assertTrue(s["dati_al"], f"{s['id']}: manca la data dei dati")
            self.assertTrue(s["stato"].startswith(allowed), f"{s['id']}: stato non previsto ({s['stato']})")

    def test_i_dati_del_simulatore_coincidono_con_i_bilanci(self):
        sim = json.loads((self.DATA / "simulatore.json").read_text(encoding="utf-8"))
        b, pop, fx = balance_sheets()
        self.assertEqual(len(sim["paesi"]), 21)
        ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
        self.assertAlmostEqual(sim["livello"]["centrale"], ref["centrale_mld_eur"], places=4)
        self.assertAlmostEqual(sim["cambioUsdPerEur"], fx, places=6)

    @unittest.skipUnless(shutil.which("npm") and (ROOT / "web" / "node_modules").exists(), "dipendenze dell'applicazione non installate (npm ci in web/)")
    def test_l_applicazione_riproduce_gli_script(self):
        """Tre scenari per ciascuna regola: i valori attesi escono dai moduli 4 e 5, il modello TypeScript deve coincidere."""
        r = subprocess.run([sys.executable, str(ROOT / "tests" / "make_app_fixtures.py")], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr[-800:])
        fixtures = json.loads((ROOT / "web" / "tests" / "fixtures.json").read_text())
        per_rule = {rule: sum(c["scenario"]["regola"] == rule for c in fixtures["casi"]) for rule in ("R1", "R2", "R3")}
        self.assertTrue(all(n >= 3 for n in per_rule.values()), per_rule)
        r = subprocess.run(["npm", "test", "--silent"], cwd=ROOT / "web", capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, (r.stdout + r.stderr)[-1500:])


def decimals(text: pd.Series) -> int:
    """Numero massimo di cifre decimali scritte in una colonna."""
    frac = text.dropna().str.extract(r"\.(\d+)$")[0].dropna()
    return int(frac.str.len().max()) if len(frac) else 0


class Riproducibilita(unittest.TestCase):
    """Rieseguire tutto senza rete, in una copia, deve dare gli stessi risultati.

    Il confronto è numerico e tollera una unità sull'ultima cifra decimale scritta in ogni colonna:
    versioni diverse delle librerie o del processore possono arrotondare diversamente l'ultima cifra.
    """

    FILES = ["m1_monthly_series.csv", "m2_weekly_index.csv", "m2_flags.csv", "m3_ranking_latest.csv", "m3_composition.csv",
             "m4_scenarios_by_country.csv", "m5_credit_by_country.csv", "m5_two_channel_map.csv"]

    def assert_same(self, name: str, before: Path, after: Path) -> None:
        a_txt, b_txt = pd.read_csv(before, dtype=str), pd.read_csv(after, dtype=str)
        self.assertEqual(list(a_txt.columns), list(b_txt.columns), name)
        self.assertEqual(len(a_txt), len(b_txt), name)
        a, b = pd.read_csv(before), pd.read_csv(after)
        for col in a.columns:
            if pd.api.types.is_float_dtype(a[col]):
                tol = 1.5 * 10.0 ** -decimals(a_txt[col])
                x, y = a[col].to_numpy(float), b[col].to_numpy(float)
                self.assertTrue(np.array_equal(np.isnan(x), np.isnan(y)), f"{name}.{col}: valori mancanti diversi")
                diff = float(np.nanmax(np.abs(x - y))) if len(x) and not np.isnan(x).all() else 0.0
                self.assertLessEqual(diff, tol, f"{name}.{col}: differenza {diff} oltre l'ultima cifra decimale")
            else:
                self.assertTrue(a_txt[col].fillna("").equals(b_txt[col].fillna("")), f"{name}.{col}: valori diversi")

    def test_esecuzione_offline_coincidente(self):
        with tempfile.TemporaryDirectory() as tmp:
            work = Path(tmp) / "repo"
            for d in ("src", "data"):
                shutil.copytree(ROOT / d, work / d, ignore=shutil.ignore_patterns("__pycache__", "labels"))
            shutil.copy(ROOT / "SPEC.md", work / "SPEC.md")
            (work / "reports" / "figures").mkdir(parents=True)
            r = subprocess.run([sys.executable, str(work / "src" / "run_all.py"), "--offline"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout[-800:] + r.stderr[-800:])
            for f in self.FILES:
                self.assert_same(f, PROC / f, work / "data" / "processed" / f)
            # anche i dati dell'applicazione: stessi paesi e stessi numeri del simulatore
            old = json.loads((ROOT / "web" / "public" / "data" / "simulatore.json").read_text(encoding="utf-8"))
            new = json.loads((work / "web" / "public" / "data" / "simulatore.json").read_text(encoding="utf-8"))
            self.assertEqual([c["code"] for c in old["paesi"]], [c["code"] for c in new["paesi"]])
            for c_old, c_new in zip(old["paesi"], new["paesi"]):
                for k, v in c_old.items():
                    if isinstance(v, float):
                        self.assertAlmostEqual(v, c_new[k], delta=1.5e-6, msg=f"simulatore.json {c_old['code']}.{k}")

    def test_il_confronto_tollera_solo_l_ultima_cifra(self):
        with tempfile.TemporaryDirectory() as tmp:
            a, b, c = (Path(tmp) / n for n in ("a.csv", "b.csv", "c.csv"))
            a.write_text("paese,valore\nIT,1.2345\nFR,2.0000\n")
            b.write_text("paese,valore\nIT,1.2346\nFR,2.0000\n")
            c.write_text("paese,valore\nIT,1.2360\nFR,2.0000\n")
            self.assert_same("prova", a, b)
            with self.assertRaises(AssertionError):
                self.assert_same("prova", a, c)


if __name__ == "__main__":
    unittest.main(verbosity=2)
