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
    SECTIONS = ["overview.json", "simulator.json", "channels.json", "monitor.json", "level.json", "method.json", "meta.json", "banks.json"]

    def test_ogni_file_e_versionato_e_documentato(self):
        files = [self.DATA / f for f in self.SECTIONS] + sorted((self.DATA / "countries").glob("*.json"))
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
        allowed = ("aggiornata", "parziale", "ultimo_valido", "non_aggiornata", "statica")
        for s in meta["fonti"]:
            self.assertTrue(s["datiAl"], f"{s['id']}: manca la data dei dati")
            self.assertIn(s["tipoData"], ("giorno", "settimana", "mese", "trimestre", "anno", "testo"), s["id"])
            self.assertIn(s["stato"], allowed, f"{s['id']}: stato non previsto ({s['stato']})")

    def test_un_solo_cambio_in_tutto_il_programma(self):
        """Modulo 1, modulo 4 e applicazione usano lo stesso cambio: l'ipotesi ESM ha un solo valore."""
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

    def test_i_testi_di_spec_hanno_tutti_una_traduzione(self):
        """Nessuna stringa non tradotta tra i testi che l'applicazione prende da SPEC.md."""
        import export_app_data as exp
        it = exp.spec_it()
        missing = [x for x in exp.spec_strings() if x not in it or not it[x].strip()]
        self.assertEqual(missing, [], "SPEC.md texts without an Italian version in src/i18n/spec_it.json")
        metodo = json.loads((self.DATA / "method.json").read_text(encoding="utf-8"))
        self.assertEqual(len(metodo["limiti"]["it"]), len(metodo["limiti"]["en"]))
        self.assertEqual(len(metodo["fonti"]["it"]["righe"]), len(metodo["fonti"]["en"]["righe"]))

    def test_i_dati_del_simulatore_coincidono_con_i_bilanci(self):
        sim = json.loads((self.DATA / "simulator.json").read_text(encoding="utf-8"))
        b, pop, fx = balance_sheets()
        self.assertEqual(len(sim["paesi"]), 21)
        ref = json.loads((PROC / "level_own.json").read_text())["livello_di_riferimento"]
        self.assertAlmostEqual(sim["livello"]["centrale"], ref["centrale_mld_eur"], places=4)
        self.assertAlmostEqual(sim["cambioUsdPerEur"], fx, places=6)

    def test_le_coppie_senza_risposta_sono_riconosciute(self):
        import export_app_data as exp
        store = pd.DataFrame({"exchange": ["A"] * 3 + ["B"] * 3, "symbol": ["USDTEUR"] * 3 + ["USDTUSD"] * 3,
                              "date": ["2026-01-01", "2026-01-02", "2026-01-03"] * 2, "volume_stable": [1.0, 1.0, 1.0, 9.0, 9.0, 9.0]})
        log = pd.DataFrame({"exchange": ["A", "B", "C"], "symbol": ["USDTEUR", "USDTUSD", "XYZUSDT"], "status": ["errore", "ok", "errore"]})
        m = exp.missing_pairs(log, store)
        self.assertEqual(m["coppie"], ["A USDTEUR"])           # aveva dati: manca davvero
        self.assertEqual(m["maiDisponibili"], ["C XYZUSDT"])    # mai avuti dati: non pesa
        self.assertAlmostEqual(m["quotaVolume"], 0.1, places=9)
        self.assertEqual(m["datiFinoAl"], "2026-01-03")
        self.assertIsNone(exp.missing_pairs(log[log.status == "ok"], store))

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


class Indice(unittest.TestCase):
    """Bybit è fuori dall'indice per tutto lo storico: esecuzione locale e automatica coincidono."""

    def test_bybit_non_entra_nell_indice(self):
        part = pd.read_csv(PROC / "m2_exchange_participation.csv")
        self.assertNotIn("Bybit", set(part.exchange))
        m2 = json.loads((PROC / "m2_summary.json").read_text())
        self.assertEqual(m2["pannello"]["esclusi"], ["Bybit"])
        self.assertEqual(m2["pannello"]["exchange"], part[part.week >= "2024-12-09"].exchange.nunique())
        self.assertGreater(m2["effetto_esclusione"]["settimane_confrontate"], 50)
        import exchange_fetch
        self.assertNotIn("Bybit", [e[0] for e in exchange_fetch.PANEL])


class Banche(unittest.TestCase):
    """Modulo 6: dati per banca dell'esercizio di trasparenza EBA."""

    @classmethod
    def setUpClass(cls):
        cls.b = pd.read_csv(PROC / "m6_banks.csv", index_col=0)
        cls.c = pd.read_csv(PROC / "m6_by_country.csv", index_col=0)
        cls.s = json.loads((PROC / "m6_summary.json").read_text())

    def test_criterio_di_sufficienza(self):
        k = self.s["criterio_di_sufficienza"]
        self.assertTrue(k["soddisfatto"])
        self.assertGreaterEqual(len(self.b), k["banche_minime"])
        self.assertGreaterEqual(self.b.paese.nunique(), k["paesi_minimi"])
        self.assertTrue(set(self.b.paese) <= set(m5.NAMES))

    def test_quota_retail_e_soglia(self):
        b = self.b
        self.assertTrue(np.allclose(b.quota_retail, b.dep_famiglie / (b.dep_famiglie + b.dep_altre_fin), atol=1e-5))
        thr = self.s["soglia_quota_retail"]["valore"]
        self.assertAlmostEqual(thr, float(np.percentile(b.quota_retail, 75)), places=5)
        self.assertTrue(((b.quota_retail > thr) == b.quota_retail_alta).all())
        self.assertAlmostEqual(b.quota_retail_alta.mean(), 0.25, delta=0.02)

    def test_le_voci_di_bilancio_sono_coerenti(self):
        b = self.b
        self.assertTrue((b.vista_famiglie <= b.dep_famiglie + 1e-6).all() and (b.vista_imprese <= b.dep_imprese + 1e-6).all())
        raccolta = b.dep_famiglie + b.dep_imprese + b.dep_altre_fin + b.dep_banche + b.titoli_emessi
        self.assertTrue((raccolta <= b.totale_attivo * 1.0001).all(), "depositi e titoli superano il totale attivo")
        self.assertTrue((b.prestiti <= b.totale_attivo).all())

    def test_il_credito_per_banca_segue_la_definizione(self):
        b = self.b
        coef = np.where(b.quota_retail_alta, 3.089, 0.441)
        expected = coef * (100 * b.deflusso / b.totale_attivo / 0.8) / 100 * b.prestiti
        self.assertTrue(np.allclose(b.credito, expected, rtol=1e-4, atol=1e-6))
        # riaggregato, il credito per euro sta tra il coefficiente basso e quello alto del modulo 5 sugli stessi paesi
        a = self.s["confronto_modulo5_paesi_coperti"]
        self.assertTrue(a["m5_basso"] < a["m6"] < a["m5_alto"])

    def test_la_copertura_e_riportata_per_ogni_paese(self):
        self.assertEqual(len(self.c), 21)
        covered = self.c[self.c.banche > 0]
        self.assertTrue(covered.copertura_su_bsi.notna().all())
        self.assertEqual(int(self.c.banche.sum()), len(self.b))


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
             "m4_scenarios_by_country.csv", "m5_credit_by_country.csv", "m5_two_channel_map.csv", "m6_banks.csv"]

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
                shutil.copytree(ROOT / d, work / d, ignore=shutil.ignore_patterns("__pycache__", "labels", "eba_te2025"))
            shutil.copy(ROOT / "SPEC.md", work / "SPEC.md")
            (work / "reports" / "figures").mkdir(parents=True)
            r = subprocess.run([sys.executable, str(work / "src" / "run_all.py"), "--offline"], capture_output=True, text=True)
            self.assertEqual(r.returncode, 0, r.stdout[-800:] + r.stderr[-800:])
            for f in self.FILES:
                self.assert_same(f, PROC / f, work / "data" / "processed" / f)
            # anche i dati dell'applicazione: stessi paesi e stessi numeri del simulatore
            old = json.loads((ROOT / "web" / "public" / "data" / "simulator.json").read_text(encoding="utf-8"))
            new = json.loads((work / "web" / "public" / "data" / "simulator.json").read_text(encoding="utf-8"))
            self.assertEqual([c["code"] for c in old["paesi"]], [c["code"] for c in new["paesi"]])
            for c_old, c_new in zip(old["paesi"], new["paesi"]):
                for k, v in c_old.items():
                    if isinstance(v, float):
                        self.assertAlmostEqual(v, c_new[k], delta=1.5e-6, msg=f"simulator.json {c_old['code']}.{k}")

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
