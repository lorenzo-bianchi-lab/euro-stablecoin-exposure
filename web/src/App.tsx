import { Suspense, lazy, useEffect, useState, type ComponentType } from "react";
import { ArrowLeftRight, BookOpen, Building2, Flag, Home as HomeIcon, Info, Languages, LayoutDashboard, LineChart, Map as MapIcon, Menu, Moon, Ruler, ScatterChart, SlidersHorizontal, Sun, X, type LucideIcon } from "lucide-react";
import { Loading } from "./components/ui";
import { ThemeContext } from "./components/theme";
import { Tour } from "./components/Tour";
import { day, getLang, loadLang, t, type Lang } from "./i18n";
import type { Scenario } from "./lib/model";
import type { AppData, Meta, Overview, SimData } from "./lib/types";
import { fetchJson, readScenario, useRoute, useTheme } from "./lib/util";

// Ogni pagina è un file a parte, scaricato solo quando viene aperta.
type SectionProps = { data: AppData; scenario: Scenario; arg: string | null };
const wrap = <P,>(load: () => Promise<{ default: ComponentType<P> }>, pick: (p: SectionProps) => P) => {
  const C = lazy(load) as unknown as ComponentType<Record<string, unknown>>;
  return (p: SectionProps) => <C {...(pick(p) as Record<string, unknown>)} />;
};
type Section = { id: string; group: string | null; icon: LucideIcon; view: (p: SectionProps) => JSX.Element };
export const SECTIONS: Section[] = [
  { id: "home", group: null, icon: HomeIcon, view: wrap(() => import("./sections/Home"), ({ data }) => ({ data })) },
  { id: "overview", group: "analysis", icon: LayoutDashboard, view: wrap(() => import("./sections/Overview"), ({ data }) => ({ data })) },
  { id: "simulator", group: "analysis", icon: SlidersHorizontal, view: wrap(() => import("./sections/Simulator"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "map", group: "analysis", icon: MapIcon, view: wrap(() => import("./sections/MapEurope"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "country", group: "analysis", icon: Flag, view: wrap(() => import("./sections/CountrySheet"), ({ data, scenario, arg }) => ({ data, scenario, code: (arg ?? "IT").toUpperCase() })) },
  { id: "banks", group: "analysis", icon: Building2, view: wrap(() => import("./sections/Banks"), ({ data, scenario, arg }) => ({ data, scenario, lei: arg })) },
  { id: "channels", group: "analysis", icon: ScatterChart, view: wrap(() => import("./sections/Channels"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "monitor", group: "monitoring", icon: LineChart, view: wrap(() => import("./sections/Monitor"), () => ({})) },
  { id: "level", group: "monitoring", icon: Ruler, view: wrap(() => import("./sections/Level"), ({ data }) => ({ data })) },
  { id: "compare", group: "output", icon: ArrowLeftRight, view: wrap(() => import("./sections/Compare"), ({ data, scenario }) => ({ data, scenario })) },
  { id: "method", group: "reference", icon: BookOpen, view: wrap(() => import("./sections/Method"), ({ data }) => ({ data })) },
  { id: "about", group: "reference", icon: Info, view: wrap(() => import("./sections/About"), ({ data }) => ({ data })) },
];
const TABS = ["home", "simulator", "map", "banks"]; // voci della barra in basso sugli schermi stretti

/** Segno del programma: tre barre crescenti dentro un cerchio aperto. Disegno originale, nessun marchio di istituzioni. */
export const Mark = () => (
  <svg className="brand-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <path d="M27.5 16A11.5 11.5 0 1 1 16 4.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <rect x="10" y="17" width="3" height="6" rx="1" fill="currentColor" /><rect x="15" y="13" width="3" height="10" rx="1" fill="currentColor" />
    <rect x="20" y="8" width="3" height="15" rx="1" fill="var(--accent)" />
  </svg>
);

/** Stato delle fonti in una riga; il dettaglio è in "Metodo e dati". */
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
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { let alive = true; loadLang(route.lang).then(() => alive && setLoaded(route.lang)); return () => { alive = false; }; }, [route.lang]);
  useEffect(() => {
    Promise.all([fetchJson<SimData>("simulatore.json"), fetchJson<Meta>("meta.json"), fetchJson<Overview>("panoramica.json")])
      .then(([sim, meta, overview]) => setData({ sim, meta, overview }))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); setDrawer(false); }, [route.section, route.arg]);
  useEffect(() => {
    if (!drawer) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setDrawer(false); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [drawer]);

  if (loaded === null || getLang() !== loaded) return null; // finché i testi non sono arrivati non c'è nulla da mostrare
  const section = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const scenario = data ? readScenario(route.params, Number(data.sim.livello.centrale.toFixed(2))) : null;
  const View = section.view;
  const other: Lang = loaded === "en" ? "it" : "en";
  // i collegamenti della navigazione chiudono la visita guidata; quelli dentro le pagine la conservano
  const to = (id: string) => route.href(id === "country" ? `country/${route.section === "country" && route.arg ? route.arg : "IT"}` : id, { tour: null });
  const brand = <a className="brand" href={route.href("home")}><Mark /><span className="brand-name"><span>{t("app.brand1")}</span><span>{t("app.brand2")}</span></span></a>;
  const links = (attr: boolean) => SECTIONS.map((s, i) => (
    <span key={s.id} style={{ display: "contents" }}>
      {s.group && s.group !== SECTIONS[i - 1]?.group && <span className="nav-group">{t(`nav.group.${s.group}`)}</span>}
      <a {...(attr ? { "data-section": s.id } : {})} href={to(s.id)} className={s.id === section.id ? "active" : ""} aria-current={s.id === section.id ? "page" : undefined}><s.icon className="icon" aria-hidden="true" />{t(`nav.${s.id}`)}</a>
    </span>));
  const tools = (
    <div className="side-foot">
      {data && <SourceIndicator meta={data.meta} href={route.href("method")} />}
      <div className="row">
        <a className="btn small" id="lang-switch" href={route.href([section.id, route.arg].filter(Boolean).join("/"), { lang: other === "en" ? null : other })} lang={other} hrefLang={other}><Languages className="icon" aria-hidden="true" />{t("side.lang")}</a>
        <button className="btn small" onClick={toggleTheme}>{theme === "dark" ? <Sun className="icon" aria-hidden="true" /> : <Moon className="icon" aria-hidden="true" />}{t(theme === "dark" ? "side.theme.light" : "side.theme.dark")}</button>
      </div>
      {data && <p className="muted tiny" style={{ margin: 0 }}>{t("side.updated", { d: day(data.meta.aggiornamento.eseguitoIl ?? data.meta.generato_il) })}</p>}
    </div>);

  return (
    <ThemeContext.Provider value={theme}>
      <a className="skip" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById("content")?.focus(); }}>{t("app.skip")}</a>
      <div className="app" key={loaded}>
        {drawer ? (
          <div className="drawer" role="dialog" aria-modal="true" aria-label={t("side.menu")}>
            <div className="drawer-head">{brand}<button className="btn icon-only" onClick={() => setDrawer(false)} aria-label={t("side.close")} autoFocus><X className="icon" aria-hidden="true" /></button></div>
            <nav aria-label={t("side.sections")} onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setDrawer(false); }}>{links(true)}</nav>
            {tools}
          </div>
        ) : (
          <aside className="side">{brand}<nav aria-label={t("side.sections")}>{links(true)}</nav>{tools}</aside>
        )}
        <header className="topbar">{brand}<button className="btn icon-only" onClick={() => setDrawer(true)} aria-label={t("side.menu")} aria-expanded={drawer}><Menu className="icon" aria-hidden="true" /></button></header>
        <main className="main" id="content" tabIndex={-1}>
          <header className="page-head" key={section.id}>
            {section.group && <div className="eyebrow">{t(`nav.group.${section.group}`)}</div>}
            <h1>{t(section.id === "home" ? "app.title" : `nav.${section.id}`)}</h1>
            {section.id !== "home" && <p className="lead">{t(`lead.${section.id}`)}</p>}
          </header>
          {!data || !scenario ? <Loading error={error} /> : (
            <Suspense fallback={<Loading />}><View data={data} scenario={scenario} arg={route.arg} /></Suspense>
          )}
          <footer className="foot"><strong>{t("app.disclaimer")}</strong><span>{t("app.footer")}</span></footer>
        </main>
        <Tour step={Number(route.params.get("tour")) || 0} section={section.id} href={route.href} />
        <nav className="tabbar" aria-label={t("side.sections")}>
          {TABS.map((id) => { const s = SECTIONS.find((x) => x.id === id)!; return <a key={id} data-tab={id} href={to(id)} className={id === section.id ? "active" : ""} aria-current={id === section.id ? "page" : undefined}><s.icon className="icon" aria-hidden="true" />{t(`nav.${id}`)}</a>; })}
          <button onClick={() => setDrawer(true)} aria-label={t("side.menu")}><Menu className="icon" aria-hidden="true" />{t("side.more")}</button>
        </nav>
      </div>
    </ThemeContext.Provider>
  );
}
