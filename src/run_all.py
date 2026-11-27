"""Single command: updates the six modules in the right order and regenerates the summary and the application data.

Inputs: the module scripts in src/, run in this order: module 3 (bank balance sheets), module 1
(level, uses the deposits of module 3), module 2 (weekly index), own level estimate, module 4
(scenarios), module 5 (credit and two-channel map), module 6 (individual banks, EBA data), the
module 2 test; then the summary (src/summary.py) and the export of the application data
(src/export_app_data.py).
Outputs: data/processed/run_status.json (outcome and duration of each step), plus everything the
scripts write: data/processed/, web/public/data/, SUMMARY.md and reports/figures/.
If a module fails, for example because a source does not respond, the others continue with
the data already present and the summary flags it; the command then exits with an error code.

Usage: python src/run_all.py            # update everything from the sources
       python src/run_all.py --offline  # recompute from the files already downloaded
"""

from __future__ import annotations

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

SRC = Path(__file__).resolve().parent
PROC = SRC.parent / "data" / "processed"
STEPS = [
    ("modulo3", "module3_ranking.py"),
    ("modulo1", "module1_level.py"),
    ("modulo2", "module2_index.py"),
    ("livello_proprio", "level_own.py"),
    ("modulo4", "module4_scenarios.py"),
    ("modulo5", "module5_credit.py"),
    ("modulo6", "module6_banks.py"),
    ("test_modulo2", "module2_link_test.py"),
]


def main() -> int:
    offline = "--offline" in sys.argv
    # "senza rete" (offline) is a code read by export_app_data.py: the values stay as they are
    status = {
        "eseguito_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "modalita": "senza rete" if offline else "con scarico dalle fonti",
        "moduli": {},
    }
    failed = []
    for name, script in STEPS:
        t0 = time.time()
        print(f"[{name}] starting {script}", flush=True)
        r = subprocess.run([sys.executable, str(SRC / script)] + (["--offline"] if offline else []), capture_output=True, text=True)
        ok = r.returncode == 0
        status["moduli"][name] = {"esito": "ok" if ok else "errore", "secondi": round(time.time() - t0, 1)}
        if not ok:
            failed.append(name)
            last = (r.stderr.strip().splitlines() or ["error with no message"])[-1]
            status["moduli"][name]["messaggio"] = last[:300]
            print(f"[{name}] FAILED: {last[:300]}", flush=True)
        else:
            print(f"[{name}] done in {status['moduli'][name]['secondi']} s", flush=True)
    (PROC / "run_status.json").write_text(json.dumps(status, indent=2, ensure_ascii=False))
    for name, script in (("sintesi", "summary.py"), ("dati_applicazione", "export_app_data.py")):
        extra = ["--offline"] if offline and script == "export_app_data.py" else []
        r = subprocess.run([sys.executable, str(SRC / script)] + extra, capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip().splitlines()[-1], flush=True)
        if r.returncode != 0:
            failed.append(name)
    if failed:
        print("Failed modules: " + ", ".join(failed) + ". The others are updated; the failed ones show the previous data.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
