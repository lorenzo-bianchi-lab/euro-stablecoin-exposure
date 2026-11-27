"""Generates the one-page summary (SUMMARY.md) from the results of the modules.

Inputs: only the files in data/processed (m1_level.json, m2_summary.json, m2_link_test.json,
m3_summary.json, m3_ranking_latest.csv, m4_summary.json, m4_euro_area.csv,
m4_scenarios_by_country.csv, m5_credit_euro_area.csv, m5_two_channel_map.csv, m6_summary.json,
level_own.json, run_status.json). It downloads nothing and recomputes nothing.
Output: SUMMARY.md at the repository root, in English. Every sentence is built from the data,
so the page stays true at every update.

Usage: python src/summary.py
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROC = ROOT / "data" / "processed"
OUT = ROOT / "SUMMARY.md"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
# English country names, for display only: the data keep the names stored by the modules
COUNTRY_NAMES = {
    "AT": "Austria",
    "BE": "Belgium",
    "BG": "Bulgaria",
    "CY": "Cyprus",
    "DE": "Germany",
    "EE": "Estonia",
    "ES": "Spain",
    "FI": "Finland",
    "FR": "France",
    "GR": "Greece",
    "HR": "Croatia",
    "IE": "Ireland",
    "IT": "Italy",
    "LT": "Lithuania",
    "LU": "Luxembourg",
    "LV": "Latvia",
    "MT": "Malta",
    "NL": "Netherlands",
    "PT": "Portugal",
    "SI": "Slovenia",
    "SK": "Slovakia",
}
SERIES_LABELS = {"usdt": "USDT", "usdt_senza_coinbase": "USDT without Coinbase", "usdc": "USDC", "usdc_senza_coinbase": "USDC without Coinbase"}
SCENARIO_LABELS = {
    "P_minimo": "Own estimate, minimum",
    "P_centrale": "**Own estimate, centre**",
    "P_massimo": "Own estimate, maximum",
    "M1_oggi_base": "Comparison: ESM assumption today (7.5%)",
    "S1_base_2030": "ESM base 2030",
    "S2_alto_2030": "ESM high 2030",
    "S3_alto_2030_quota_doppia": "ESM high 2030, 15% share",
}
MODULES = {
    "modulo1": "1 - Level",
    "modulo2": "2 - Trend",
    "modulo3": "3 - Vulnerability",
    "modulo4": "4 - Scenarios",
    "modulo5": "5 - Credit and transmission",
    "modulo6": "6 - Individual banks",
}
PAGES = "https://lorenzo-bianchi-lab.github.io/euro-stablecoin-exposure/"
QUADRANTS = {"A": "high deposits, low dollars", "B": "both high", "C": "low deposits, high dollars", "D": "both low"}
# display labels for the codes stored in the data
FLAG_LABELS = {"segnale": "flag", "da verificare": "to be checked", "nessuno": "none", "storico insufficiente": "insufficient history"}
ANSWER_LABELS = {"sì": "yes", "no": "no"}
MODE_LABELS = {"senza rete": "offline", "con scarico dalle fonti": "online"}


def n(x: float, d: int = 1) -> str:
    """Number in English format: comma for thousands, point for decimals."""
    return f"{x:,.{d}f}"


def pct(x: float, d: int = 1) -> str:
    return n(100 * x, d) + "%"


def signed(x: float, d: int = 1) -> str:
    x = round(x, d) + 0.0  # avoids "+0.0" and "-0.0"
    return ("+" if x > 0 else "") + n(x, d)


def day(iso: str) -> str:
    d = datetime.strptime(iso[:10], "%Y-%m-%d")
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def month(ym: str) -> str:
    return f"{MONTHS[int(ym[5:7]) - 1]} {ym[:4]}"


def week(monday: str) -> str:
    a = datetime.strptime(monday, "%Y-%m-%d")
    b = a + timedelta(days=6)
    left = f"{a.day}" if a.month == b.month else f"{a.day} {MONTHS[a.month - 1]}"
    return f"{left}-{b.day} {MONTHS[b.month - 1]} {b.year}"


def load(name: str) -> dict:
    return json.loads((PROC / name).read_text())


def main() -> None:
    m1, m2, m3, m4 = load("m1_level.json"), load("m2_summary.json"), load("m3_summary.json"), load("m4_summary.json")
    status = load("run_status.json") if (PROC / "run_status.json").exists() else {}
    L: list[str] = []
    add = L.append

    add("# Summary - euro area exposure to dollar stablecoins")
    add("")
    add(f"Page generated on {day(datetime.now().strftime('%Y-%m-%d'))} by `src/summary.py`. Do not edit it by hand: it is regenerated with")
    add(f"`.venv/bin/python src/run_all.py`. Interactive version: [application]({PAGES}).")
    add("")
    add("The programme estimates a range for the dollar stablecoins held by euro area residents, not")
    add("a measurement: it starts from an ECB survey and from stated assumptions. It then shows how")
    add("activity in euro moves, which banking systems have the most exposed funding and how much")
    add("each adoption level would weigh on deposits and credit, country by country.")
    add("")

    # 1. Level
    lv, circ = m1["livello"], m1["circolazione_mld_usd"]
    own = load("level_own.json")
    ref = own["livello_di_riferimento"]
    add(f"## 1. Level: EUR {n(ref['centrale_mld_eur'])} billion, range {n(ref['minimo_mld_eur'])} - {n(ref['massimo_mld_eur'])}")
    add("")
    add("Own bottom-up estimate: euro area households × share holding stablecoins × average amount")
    add("held × dollar share, from the ECB consumer survey. The programme estimates a range.")
    add("")
    add("| | EUR billion | What it represents |")
    add("|---|---|---|")
    add(f"| Minimum | {n(ref['minimo_mld_eur'])} | Prudent assumptions on amounts and dollar share |")
    add(f"| **Centre** | **{n(ref['centrale_mld_eur'])}** | Reference level of the programme |")
    add(f"| Maximum | {n(ref['massimo_mld_eur'])} | High assumptions on amounts and dollar share |")
    add(
        (
            f"| Declared upper extreme | {n(ref['estremo_superiore_dichiarato_mld_eur'])} | Individuals variant: counts the same household more "
            "than once |"
        )
    )
    add(
        (
            f"| Comparison: ESM assumption, 7.5% share | {n(lv['base_mld_eur'])} | Share assumed by the ESM × circulation of USDT and USDC on "
            f"{day(m1['data_circolazione'])} (USD {n(circ['usdt_piu_usdc'])} bn) |"
        )
    )
    add(f"| Comparison: ESM assumption, 15% share | {n(lv['alto_mld_eur'])} | As above, double share |")
    add("")
    add("The survey covers 11 countries and is described as experimental by the ECB; the extension to 21 countries is an assumption.")
    add("The two other routes attempted (exchange reserves, national data) do not confirm the estimate: the")
    add("criterion set in report 08 would have published only the minimum. The choice of the range as the")
    add("reference was made on 25 November 2026, after the results, and is recorded in the log of SPEC.md.")
    add("")

    # 2. Trend
    ip = m2["indice_principale"]
    add(f"## 2. Trend: EUR share of stablecoin/fiat volumes, week {week(ip['ultima_settimana'])}")
    add("")
    flags = m2.get("segnalazione", {}).get("ultima_settimana", {})
    add("| Series | Last week | Change (points) | 52-week mean | Share deviation | Volume deviation | Status |")
    add("|---|---|---|---|---|---|---|")
    states = []
    for key, label in SERIES_LABELS.items():
        s, f = ip["serie"][key], flags.get(key, {})
        stato = f.get("stato", "n.d.")
        states.append((label, stato))
        add(
            (
                f"| {label} | {pct(s['valore'])} | {signed(s['variazione_pp'])} | {pct(s['media_52_settimane'])} | "
                f"{signed(f.get('scarto_quota', float('nan')))} | {signed(f.get('scarto_volume', float('nan')))} | {FLAG_LABELS.get(stato, 'n.a.')} "
                "|"
            )
        )
    add("")
    hot = [f"{label} ({FLAG_LABELS[stato]})" for label, stato in states if stato in ("segnale", "da verificare")]
    if hot:
        add(f"To watch: {', '.join(hot)}. A deviation above 2 only in volume or only in share usually indicates")
        add("a movement of the other currencies, not of the euro.")
    else:
        add("No series is flagged: share and volume against the euro are within 2 standard deviations of the previous 52 weeks.")
    if (PROC / "m2_link_test.json").exists():
        lt = load("m2_link_test.json")
        add(f"The index measures trading in euro on {m2['exchange_attivi_min_max'][1]} exchanges, not holdings or residence. Test of the predictive")
        add(
            (
                f"content for households' sight deposits: outcome **{ANSWER_LABELS.get(lt['risposta'], lt['risposta'])}** (p = "
                f"{n(lt['principale']['p_value'], 2)}, {lt['principale']['osservazioni']} months)."
            )
        )
    ex = m2.get("effetto_esclusione", {})
    if ex.get("differenza_pp"):
        d = ex["differenza_pp"]
        add(
            (
                f"{', '.join(ex['esclusi'])} is out of the index for the whole history. Without it, the index changes on average by "
                f"{signed(d['usdt']['media'], 2)} points for USDT"
            )
        )
        add(
            (
                f"and {signed(d['usdc']['media'], 2)} for USDC; in the last common week by {signed(d['usdt']['ultima_settimana'], 2)} and "
                f"{signed(d['usdc']['ultima_settimana'], 2)}."
            )
        )
    add("")

    # 3. Vulnerability
    rank = pd.read_csv(PROC / "m3_ranking_latest.csv", index_col=0).sort_values("rank_indicator")
    add(f"## 3. Vulnerability: ranking of bank funding, {month(m3['ultimo_mese'])}")
    add("")
    add("Countries ordered by structural exposure to deposit substitution.")
    add("")
    add("| Position | Country | Sight deposits over liabilities | Sight deposits (EUR bn) | Share of the area |")
    add("|---|---|---|---|---|")
    big = rank.sort_values("sight_deposits_bn_eur", ascending=False).head(4).index
    shown = list(rank.index[:5]) + [k for k in rank.index[5:-3] if k in big] + list(rank.index[-3:])
    prev = 0
    for k in shown:
        r = rank.loc[k]
        if int(r.rank_indicator) - prev > 1:
            add("| ... | | | | |")
        add(
            (f"| {int(r.rank_indicator)} | {COUNTRY_NAMES[k]} | {pct(r.C1)} | {n(r.sight_deposits_bn_eur, 0)} | {pct(r.area_sight_deposits_share)} |")
        )
        prev = int(r.rank_indicator)
    add("")
    top4 = rank.loc[big]
    top4_names = [COUNTRY_NAMES[k] for k in top4.index]
    add(f"The top five hold {pct(rank.area_sight_deposits_share.iloc[:5].sum())} of the area's sight deposits;")
    add(f"{', '.join(top4_names[:-1])} and {top4_names[-1]} hold {pct(top4.area_sight_deposits_share.sum(), 0)}.")
    add("The ranking orders the funding structure, not the probability that deposits leave.")
    add("")

    # 4. Scenarios
    ea = pd.read_csv(PROC / "m4_euro_area.csv")
    ea = ea[(ea.country_rule == "R1") & (ea.deposit_rule == "T1")].set_index("scenario")
    add(f"## 4. Scenarios: how much each level weighs on funding, balance sheets of {month(m4['mese_bilanci'])}")
    add("")
    cr = None
    if (PROC / "m5_credit_euro_area.csv").exists():
        cr = pd.read_csv(PROC / "m5_credit_euro_area.csv")
        cr = cr[cr.country_rule == "R1"].set_index("scenario")
    add(
        (
            "| Scenario | Stablecoins held (USD bn) | Deposits to replace (EUR bn) | Sight deposits lost | Additional wholesale funding | Credit "
            "reduction (EUR bn) |"
        )
    )
    add("|---|---|---|---|---|---|")
    for key, label in SCENARIO_LABELS.items():
        if key in ea.index:
            r = ea.loc[key]
            credito = (
                "n.a."
                if cr is None or key not in cr.index
                else f"{n(cr.loc[key, 'uniforme_bn'])} (from {n(cr.loc[key, 'basso_bn'])} to {n(cr.loc[key, 'alto_bn'])})"
            )
            add(
                (
                    f"| {label} | {n(r.amount_bn_usd, 0 if r.amount_bn_usd >= 100 else 1)} | {n(r.outflow_bn_eur)} | "
                    f"{pct(r.sight_deposits_lost, 2 if r.sight_deposits_lost < 0.01 else 1)} | "
                    f"{pct(r.wholesale_funding_increase, 2 if r.wholesale_funding_increase < 0.01 else 1)} | {credito} |"
                )
            )
    add("")
    thr = {round(t["perdita_depositi_a_vista_area"], 2): t for t in m4["soglie"]}
    t5 = thr[0.05]
    add(f"For the area to lose 5% of its sight deposits, USD {n(t5['importo_mld_usd'], 0)} billion of stablecoins held by residents would")
    add(f"be needed, {n(t5['importo_mld_usd'] / (ref['centrale_mld_eur'] * m4['cambio_usd_per_eur']), 0)} times the centre of the own estimate.")
    byc = pd.read_csv(PROC / "m4_scenarios_by_country.csv")
    s2 = byc[(byc.scenario == "S2_alto_2030") & (byc.country_rule == "R1") & (byc.deposit_rule == "T1")].sort_values(
        "wholesale_funding_increase", ascending=False
    )
    lead, last = s2.head(3), s2.iloc[-1]
    add("In the ESM high scenario the required increase in wholesale funding is highest in")
    add(
        ", ".join(f"{COUNTRY_NAMES[r.country]} (+{pct(r.wholesale_funding_increase, 0)})" for r in lead.itertuples())
        + f" and lowest in {COUNTRY_NAMES[last.country]} (+{pct(last.wholesale_funding_increase, 1)})."
    )
    add("It is an accounting calculation with full deposit substitution, not a forecast. The credit reduction")
    add("applies coefficients from ECB Working Paper 3199, estimated on individual banks, to national aggregates:")
    add("the first value is the uniform rule (0.5 euro of loans per euro of deposits), in brackets the")
    add("range between the low and the high coefficient. Continuous and threshold variants are in the application.")
    add("")
    if (PROC / "m5_two_channel_map.csv").exists():
        mp = pd.read_csv(PROC / "m5_two_channel_map.csv", index_col=0)
        add("## 5. Two-channel map")
        add("")
        add("| Quadrant | Countries |")
        add("|---|---|")
        for q, label in QUADRANTS.items():
            add(
                (
                    f"| {q} - {label} | "
                    f"{', '.join(COUNTRY_NAMES[k] for k in mp[mp.quadrant == q].sort_values('sight_deposits', ascending=False).index)} |"
                )
            )
        add("")
        add("In quadrant A the risk is the loss of deposits and credit; in C it is the weaker grip of domestic")
        add("monetary policy on banks already funded in dollars.")
        add("")

    if (PROC / "m6_summary.json").exists():
        m6 = load("m6_summary.json")
        k, t, c, a = m6["criterio_di_sufficienza"], m6["soglia_quota_retail"], m6["campione"], m6["confronto_modulo5_paesi_coperti"]
        add("## 6. Individual banks (EBA 2025 transparency exercise)")
        add("")
        add(
            (
                f"{k['banche_con_dati_completi']} euro area banks with all items, out of {k['banche_area_euro_nel_campione']} in the exercise, in "
                f"{k['paesi_coperti']} countries out of 21;"
            )
        )
        add(
            (
                f"data as at {day(m6['data_dei_dati'])}. They cover {pct(c['copertura_area_su_bsi'], 0)} of the assets of resident banks and "
                f"{pct(c['copertura_area_su_consolidato'], 0)} of consolidated assets."
            )
        )
        add(
            (
                f"Retail share threshold among banks: {pct(t['valore'])} ({t['banche_sopra']} banks above); among countries it was "
                f"{pct(t['soglia_tra_paesi_modulo5'])}."
            )
        )
        add("")
        add("| Credit reduction at the central level, covered countries | EUR billion | Per euro of outflow |")
        add("|---|---|---|")
        for label, key in (
            ("**Module 6, bank-by-bank coefficients**", "m6"),
            ("Module 5, uniform rule", "m5_uniforme"),
            ("Module 5, continuous variant", "m5_continua"),
            ("Module 5, threshold variant", "m5_soglia"),
            ("Module 5, low coefficient", "m5_basso"),
            ("Module 5, high coefficient", "m5_alto"),
        ):
            add(f"| {label} | {n(a[key], 1)} | {n(a[key] / a['deflusso_paesi_coperti'], 2)} |")
        add("")
        add("Public bank-level data, not supervisory data: the ordering of banks is not a judgement on their soundness.")
        add("")

    # Caveats and status
    add("## What this page does not say")
    add("")
    add("- It does not measure how many stablecoins euro area residents hold: it estimates a range from a survey and stated assumptions.")
    add("- It does not estimate causal effects: the credit reduction applies published coefficients, as an order of magnitude.")
    add("- It is not an early warning system: the flag marks unusual values, it does not anticipate deposits.")
    add("")
    add("## Data and update")
    add("")
    add("| Module | Data as at | Last run | Details |")
    add("|---|---|---|---|")
    dates = {
        "modulo1": day(m1["data_circolazione"]),
        "modulo2": "week " + week(ip["ultima_settimana"]),
        "modulo3": month(m3["ultimo_mese"]),
        "modulo4": "balance sheets of " + month(m4["mese_bilanci"]),
    }
    reports = {
        "modulo1": "reports/06_module1_level.md",
        "modulo2": "reports/03_module2_weekly_index.md",
        "modulo3": "reports/04_module3_ranking.md",
        "modulo4": "reports/05_module4_scenarios.md",
        "modulo5": "reports/07_module5_credit.md",
        "modulo6": "reports/12_refinements_language_banks.md",
    }
    dates["modulo5"] = "balance sheets of " + month(m4["mese_bilanci"])
    dates["modulo6"] = "30 June 2025"
    for key, label in MODULES.items():
        st = status.get("moduli", {}).get(key, {})
        esito = {"ok": "succeeded", "errore": "**failed: previous data**", "saltato": "not run"}.get(st.get("esito"), "not recorded")
        add(f"| {label} | {dates[key]} | {esito} | [{reports[key].split('/')[-1]}]({reports[key]}) |")
    add("")
    if status.get("eseguito_il"):
        add(f"Last full update: {day(status['eseguito_il'])}, mode: {MODE_LABELS.get(status.get('modalita'), 'n.a.')}.")
    add("Definitions, sources, limits and discarded methods: [SPEC.md](SPEC.md).")
    add("")
    add("---")
    add("")
    add("**What this adds to the final programme**: the results of all modules on a single page, always")
    add("aligned with the data because it is generated by the code and not written by hand.")
    add("")
    OUT.write_text("\n".join(L))
    print(f"wrote {OUT.name}: {len(L)} lines")


if __name__ == "__main__":
    main()
