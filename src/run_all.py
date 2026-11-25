"""Comando unico: aggiorna i quattro moduli e rigenera la sintesi.

Ordine: modulo 3 (bilanci bancari), modulo 1 (livello, usa i depositi del modulo 3),
modulo 2 (indice settimanale), livello proprio, modulo 4 (scenari), modulo 5 (credito e
mappa a due canali), test del modulo 2, poi sintesi e cruscotto.
Se un modulo fallisce, per esempio perché una fonte non risponde, gli altri proseguono
con i dati già presenti e la sintesi lo segnala.

Uso: python src/run_all.py            # aggiorna tutto dalle fonti
     python src/run_all.py --offline  # ricalcola dai file già scaricati
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
STEPS = [("modulo3", "module3_ranking.py"), ("modulo1", "module1_level.py"), ("modulo2", "module2_index.py"),
         ("livello_proprio", "level_own.py"), ("modulo4", "module4_scenarios.py"), ("modulo5", "module5_credit.py"),
         ("test_modulo2", "module2_link_test.py")]


def main() -> int:
    offline = "--offline" in sys.argv
    status = {"eseguito_il": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "modalita": "senza rete" if offline else "con scarico dalle fonti", "moduli": {}}
    failed = []
    for name, script in STEPS:
        t0 = time.time()
        print(f"[{name}] avvio di {script}", flush=True)
        r = subprocess.run([sys.executable, str(SRC / script)] + (["--offline"] if offline else []), capture_output=True, text=True)
        ok = r.returncode == 0
        status["moduli"][name] = {"esito": "ok" if ok else "errore", "secondi": round(time.time() - t0, 1)}
        if not ok:
            failed.append(name)
            last = (r.stderr.strip().splitlines() or ["errore senza messaggio"])[-1]
            status["moduli"][name]["messaggio"] = last[:300]
            print(f"[{name}] FALLITO: {last[:300]}", flush=True)
        else:
            print(f"[{name}] fatto in {status['moduli'][name]['secondi']} s", flush=True)
    (PROC / "run_status.json").write_text(json.dumps(status, indent=2, ensure_ascii=False))
    for name, script in (("sintesi", "summary.py"), ("cruscotto", "dashboard.py")):
        r = subprocess.run([sys.executable, str(SRC / script)], capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip().splitlines()[-1], flush=True)
        if r.returncode != 0:
            failed.append(name)
    if failed:
        print("Moduli falliti: " + ", ".join(failed) + ". Gli altri sono aggiornati; quelli falliti mostrano i dati precedenti.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
