import { Suspense, lazy, useEffect, useState, type ComponentType } from "react";
import { Loading } from "./components/ui";
import { ThemeContext } from "./components/theme";
import { day, getLang, loadLang, t, type Lang } from "./i18n";
import type { Scenario } from "./lib/model";
import type { AppData, Meta, Overview, SimData } from "./lib/types";
import { fetchJson, readScenario, useRoute, useTheme } from "./lib/util";

// Ogni sezione è un file a parte, scaricato solo quando viene aperta.
type SectionProps = { data: AppData; scenario: Scenario; arg: string | null };
const wrap = <P,>(load: () => Promise<{ default: ComponentType<P> }>, pick: (p: SectionProps) => P) => {
  const C = lazy(load) as unknown as ComponentType<Record<string, unknown>>;
  return (p: SectionProps) => <C {...(pick(p) as Record<string, unknown>)} />;
};
export const SECTIONS: { id: string; view: (p: SectionProps) => JSX.Element }[] = [
  { id: "overview", view: wrap(() => import("./sections/Overview"), ({ data }) => ({ data })) },
  { id: "simulator", view: wrap(() => import("./sections/Simulator"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "map", view: wrap(() => import("./sections/MapEurope"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "country", view: wrap(() => import("./sections/CountrySheet"), ({ data, scenario, arg }) => ({ data, scenario, code: (arg ?? "IT").toUpperCase() })) },
  { id: "banks", view: wrap(() => import("./sections/Banks"), ({ data, scenario, arg }) => ({ data, scenario, lei: arg })) },
  { id: "channels", view: wrap(() => import("./sections/Channels"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "monitor", view: wrap(() => import("./sections/Monitor"), () => ({})) },
  { id: "level", view: wrap(() => import("./sections/Level"), ({ data }) => ({ data })) },
  { id: "compare", view: wrap(() => import("./sections/Compare"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "method", view: wrap(() => import("./sections/Method"), ({ data }) => ({ data })) },
];

/** Stato delle fonti in una riga, nella barra laterale; il dettaglio è in "Metodo e dati". */
function SourceIndicator({ meta, href }: { meta: Meta; href: string }) {
  const stale = meta.fontiNonAggiornate.length, partial = meta.fontiParziali.length;
  const key = stale ? "side.src.stale" : partial ? "side.src.partial" : meta.aggiornamento.modalita === "offline" ? "side.src.offline" : "side.src.ok";
  return <a className={`src-ind ${stale || partial ? "warn" : "ok"}`} id="source-indicator" href={href} title={t("side.src.title")}><span className="dot" aria-hidden="true" />{t(key, { n: stale || partial })}</a>;
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Lang | null>(null);

  useEffect(() => { let alive = true; loadLang(route.lang).then(() => alive && setLoaded(route.lang)); return () => { alive = false; }; }, [route.lang]);
  useEffect(() => {
    Promise.all([fetchJson<SimData>("simulatore.json"), fetchJson<Meta>("meta.json"), fetchJson<Overview>("panoramica.json")])
      .then(([sim, meta, overview]) => setData({ sim, meta, overview }))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.section, route.arg]);

  if (loaded === null || getLang() !== loaded) return null; // finché i testi non sono arrivati non c'è nulla da mostrare
  const section = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const scenario = data ? readScenario(route.params, Number(data.sim.livello.centrale.toFixed(2))) : null;
  const View = section.view;
  const other: Lang = loaded === "en" ? "it" : "en";

  return (
    <ThemeContext.Provider value={theme}>
      <div className="app" key={loaded}>
        <aside className="side">
          <a className="brand" href={route.href("overview")}>{t("app.brand1")}{" "}<br /><span>{t("app.brand2")}</span></a>
          <nav aria-label={t("side.sections")}>
            {SECTIONS.map((s) => (
              <a key={s.id} data-section={s.id} href={route.href(s.id === "country" ? `country/${route.section === "country" && route.arg ? route.arg : "IT"}` : s.id)}
                className={s.id === section.id ? "active" : ""} aria-current={s.id === section.id ? "page" : undefined}>{t(`nav.${s.id}`)}</a>
            ))}
          </nav>
          <div className="side-foot">
            {data && <SourceIndicator meta={data.meta} href={route.href("method")} />}
            <div className="row">
              <a className="btn small" id="lang-switch" href={route.href([section.id, route.arg].filter(Boolean).join("/"), { lang: other === "en" ? null : other })} lang={other} hrefLang={other}>{t("side.lang")}</a>
              <button className="btn small" onClick={toggleTheme}>{t(theme === "dark" ? "side.theme.light" : "side.theme.dark")}</button>
            </div>
            {data && <p className="muted tiny">{t("side.updated", { d: day(data.meta.aggiornamento.eseguitoIl ?? data.meta.generato_il) })}</p>}
          </div>
        </aside>
        <main className="main" id="content">
          <h1>{t(`nav.${section.id}`)}</h1>
          {!data || !scenario ? <Loading error={error} /> : (
            <Suspense fallback={<Loading />}><View data={data} scenario={scenario} arg={route.arg} /></Suspense>
          )}
          <footer className="foot muted tiny">{t("app.footer")}</footer>
        </main>
      </div>
    </ThemeContext.Provider>
  );
}
