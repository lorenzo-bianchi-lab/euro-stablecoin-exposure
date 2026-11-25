import { useEffect, useState } from "react";
import { ThemeContext } from "./components/Chart";
import { Loading } from "./components/ui";
import type { AppData, Meta, Overview, SimData } from "./lib/types";
import { fetchJson, giorno, readScenario, useRoute, useTheme } from "./lib/util";
import { Panoramica } from "./sections/Panoramica";
import { Simulatore } from "./sections/Simulatore";
import { MappaEuropa } from "./sections/MappaEuropa";
import { SchedaPaese } from "./sections/SchedaPaese";
import { DueCanali } from "./sections/DueCanali";
import { MonitorSettimanale } from "./sections/MonitorSettimanale";
import { StimaLivello } from "./sections/StimaLivello";
import { Confronto } from "./sections/Confronto";
import { Metodo } from "./sections/Metodo";

export const SECTIONS: { id: string; titolo: string }[] = [
  { id: "panoramica", titolo: "Panoramica" }, { id: "simulatore", titolo: "Simulatore" }, { id: "mappa", titolo: "Mappa d'Europa" },
  { id: "paese", titolo: "Scheda paese" }, { id: "canali", titolo: "Mappa a due canali" }, { id: "monitor", titolo: "Monitor settimanale" },
  { id: "livello", titolo: "Stima del livello" }, { id: "confronto", titolo: "Confronto ed esportazione" }, { id: "metodo", titolo: "Metodo e dati" },
];

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const route = useRoute();
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchJson<SimData>("simulatore.json"), fetchJson<Meta>("meta.json"), fetchJson<Overview>("panoramica.json")])
      .then(([sim, meta, overview]) => setData({ sim, meta, overview }))
      .catch((e) => setError(String(e.message ?? e)));
  }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [route.section, route.arg]);

  const section = SECTIONS.find((s) => s.id === route.section) ?? SECTIONS[0];
  const scenario = data ? readScenario(route.params, Number(data.sim.livello.centrale.toFixed(2))) : null;

  return (
    <ThemeContext.Provider value={theme}>
      <div className="app">
        <aside className="side">
          <a className="brand" href={route.href("panoramica")}>Stablecoin in dollari{" "}<br /><span>e banche dell'area euro</span></a>
          <nav aria-label="Sezioni">
            {SECTIONS.map((s) => (
              <a key={s.id} href={route.href(s.id === "paese" ? `paese/${route.section === "paese" && route.arg ? route.arg : "IT"}` : s.id)}
                className={s.id === section.id ? "active" : ""} aria-current={s.id === section.id ? "page" : undefined}>{s.titolo}</a>
            ))}
          </nav>
          <div className="side-foot">
            <button className="btn small" onClick={toggleTheme} aria-label="Cambia tema">{theme === "dark" ? "Tema chiaro" : "Tema scuro"}</button>
            {data && <p className="muted tiny">Dati aggiornati il {giorno(data.meta.aggiornamento.eseguitoIl ?? data.meta.generato_il)}</p>}
          </div>
        </aside>
        <main className="main" id="contenuto">
          <h1>{section.titolo}</h1>
          {data?.meta.avviso && <p className="banner" role="status">{data.meta.avviso}</p>}
          {!data || !scenario ? <Loading error={error} /> : (
            <>
              {section.id === "panoramica" && <Panoramica data={data} />}
              {section.id === "simulatore" && <Simulatore data={data} scenario={scenario} />}
              {section.id === "mappa" && <MappaEuropa data={data} scenario={scenario} />}
              {section.id === "paese" && <SchedaPaese data={data} scenario={scenario} code={(route.arg ?? "IT").toUpperCase()} />}
              {section.id === "canali" && <DueCanali data={data} scenario={scenario} />}
              {section.id === "monitor" && <MonitorSettimanale />}
              {section.id === "livello" && <StimaLivello data={data} />}
              {section.id === "confronto" && <Confronto data={data} scenario={scenario} />}
              {section.id === "metodo" && <Metodo data={data} />}
            </>
          )}
          <footer className="foot muted tiny">
            Strumento di analisi su ipotesi dichiarate: non è una previsione né una misura delle detenzioni dei residenti. Confini: Eurostat GISCO, © EuroGeographics.
          </footer>
        </main>
      </div>
    </ThemeContext.Provider>
  );
}
