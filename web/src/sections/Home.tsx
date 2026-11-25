import { ArrowRight, ArrowLeftRight, Building2, LineChart, Map as MapIcon, Ruler, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { EuroMap } from "../components/EuroMap";
import { Card } from "../components/ui";
import { bn, country, day, listing, month, nf, pct, t } from "../i18n";
import type { Scenario } from "../lib/model";
import type { AppData } from "../lib/types";
import { useRoute } from "../lib/util";
import { useResults } from "./shared";

const TOOLS: [string, LucideIcon][] = [["simulator", SlidersHorizontal], ["map", MapIcon], ["banks", Building2], ["monitor", LineChart], ["level", Ruler], ["compare", ArrowLeftRight]];

/** Pagina iniziale. Le tre frasi dei risultati sono modelli riempiti con i dati correnti: non contengono numeri scritti a mano. */
export default function Home({ data }: { data: AppData }) {
  const { sim, overview: o, meta } = data;
  const route = useRoute();
  // scenario alto: il livello "ESM alto 2030", regola R1, depositi a vista, sostituzione piena, regola uniforme per il credito
  const high = sim.predefiniti.find((p) => p.id === "S2") ?? sim.predefiniti[sim.predefiniti.length - 1];
  const scenario: Scenario = { importo: high.eur, sostituzione: 1, regola: "R1", depositi: "T1", credito: "uniforme" };
  const { rows, tot, band } = useResults(sim, scenario);
  const top = <T,>(xs: T[], f: (x: T) => number) => [...xs].sort((a, b) => f(b) - f(a)).slice(0, 3);
  const dep = top(sim.paesi, (c) => c.c1), usd = top(sim.paesi, (c) => c.usd), eff = top(rows, (r) => r.effettoPp);
  const item = (code: string, v: string) => t("home.item", { c: country(code), v });
  const values = sim.paesi.map((c) => ({ code: c.code, value: 100 * c.c1 }));
  const findings = [
    { n: t("home.f1.n"), text: t("home.f1", { x: bn(o.livello.centrale) }), sub: t("home.f1.sub", { a: nf(o.livello.minimo, 1), b: nf(o.livello.massimo, 1), esm: bn(o.livello.esmBase) }), href: route.href("level") },
    { n: t("home.f2.n"), text: t("home.f2", { dep: listing(dep.map((c) => country(c.code))), usd: listing(usd.map((c) => country(c.code))) }),
      sub: t("home.f2.sub", { depv: listing(dep.map((c) => item(c.code, pct(c.c1)))), usdv: listing(usd.map((c) => item(c.code, pct(c.usd)))) }), href: route.href("channels") },
    { n: t("home.f3.n"), text: t("home.f3", { amount: bn(high.eur, 0), sight: pct(tot.persiVista, 1), credit: bn(tot.credito, 0) }),
      sub: t("home.f3.sub", { name: t(`preset.${high.id}`), a: nf(band.credito[0], 0), b: nf(band.credito[1], 0), top: listing(eff.map((r) => country(r.code))) }), href: route.href("simulator", { imp: Number(high.eur.toFixed(2)) }) },
  ];
  return (
    <>
      <p className="lead" style={{ marginTop: 0, marginBottom: "var(--space-5)" }}>{t("home.tagline")}</p>
      <h2 className="sr-only">{t("home.findings")}</h2>
      <div className="grid3" id="findings">
        {findings.map((f, i) => (
          <section className="card finding" key={i}>
            <span className="finding-n">{f.n}</span>
            <p className="finding-text">{f.text}</p>
            <p className="finding-sub">{f.sub}</p>
            <a className="btn small" style={{ alignSelf: "flex-start", marginTop: "auto" }} href={f.href} aria-label={`${t(`nav.${["level", "channels", "simulator"][i]}`)}: ${f.n}`}>{t(`nav.${["level", "channels", "simulator"][i]}`)}<ArrowRight className="icon" aria-hidden="true" /></a>
          </section>))}
      </div>
      <div className="grid2 top">
        <Card title={t("home.map")} actions={<a className="btn small" href={route.href("map", { ind: "c1" })}>{t("home.map.open")}<ArrowRight className="icon" aria-hidden="true" /></a>}>
          <EuroMap title={t("map.ind.c1")} unit={t("home.map.unit")} source={t("src.bsi", { m: month(o.dati_al.bilanci) })} values={values} digits={1} height={380}
            alt={t("home.alt", { top: listing(dep.map((c) => item(c.code, pct(c.c1)))) })} onSelect={(code) => { window.location.hash = route.href(`country/${code}`); }} />
        </Card>
        <section aria-label={t("home.tools")}>
          <div className="tiles">
            {TOOLS.map(([id, Icon]) => (
              <a className="tile" key={id} href={route.href(id)}><Icon className="icon" aria-hidden="true" /><strong>{t(`nav.${id}`)}</strong><span>{t(`home.tool.${id}`)}</span></a>))}
          </div>
          <p className="muted tiny" style={{ marginTop: "var(--space-4)" }}>{t("home.updated", { d: day(meta.aggiornamento.eseguitoIl ?? meta.generato_il), m: month(sim.meseBilanci) })}</p>
        </section>
      </div>
    </>
  );
}
