import { useEffect, useMemo, useState } from "react";
import { MapChart } from "echarts/charts";
import { GeoComponent, VisualMapComponent } from "echarts/components";
import { country, nf, t } from "../i18n";
import { fetchJson } from "../lib/util";
import { Chart, echarts, tooltipStyle, type Palette } from "./Chart";

echarts.use([MapChart, GeoComponent, VisualMapComponent]);

// ---------- proiezione: azimutale equivalente di Lambert centrata sull'Europa (52° N, 10° E), la stessa
// famiglia della proiezione ETRS89-LAEA usata per le statistiche europee. Conserva le aree, quindi i paesi
// del nord non appaiono gonfiati come nella proiezione cilindrica usata prima.
const RAD = Math.PI / 180, LAT0 = 52 * RAD, LON0 = 10 * RAD;
export function project([lon, lat]: number[]): [number, number] {
  const l = lon * RAD - LON0, p = lat * RAD;
  const k = Math.sqrt(2 / (1 + Math.sin(LAT0) * Math.sin(p) + Math.cos(LAT0) * Math.cos(p) * Math.cos(l)));
  return [+(100 * k * Math.cos(p) * Math.sin(l)).toFixed(3), +(100 * k * (Math.cos(LAT0) * Math.sin(p) - Math.sin(LAT0) * Math.cos(p) * Math.cos(l))).toFixed(3)];
}
type Ring = number[][];
interface Feature { properties: { code: string; area_euro?: boolean }; geometry: { type: string; coordinates: Ring[][] } }
interface Geo { type: string; features: Feature[] }
type Box = [[number, number], [number, number]];
/** Riquadri ingranditi per i paesi troppo piccoli per leggersi sulla mappa. */
export const INSET_CODES = ["LU", "MT", "CY"];
let ready: Promise<{ frame: Box; boxes: Record<string, Box> }> | null = null;

function bounds(features: Feature[], pad: number): Box {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const f of features) for (const poly of f.geometry.coordinates) for (const [x, y] of poly[0]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const dx = (x1 - x0) * pad, dy = (y1 - y0) * pad;
  return [[x0 - dx, y1 + dy], [x1 + dx, y0 - dy]];
}
/** Scarica i confini una volta, li proietta e li registra: la mappa principale e una copia per ogni riquadro. */
export function loadMap() {
  ready ??= fetchJson<Geo>("geo/europe.geo.json").then((g) => {
    const features = g.features.map((f) => ({ ...f, geometry: { type: "MultiPolygon", coordinates: f.geometry.coordinates.map((poly) => poly.map((ring) => ring.map(project))) } }));
    const projected = { type: "FeatureCollection", features };
    echarts.registerMap("europa", projected as never);
    // ECharts dà a ogni nome di mappa un proprio sistema di coordinate: serve una copia per riquadro
    for (const code of INSET_CODES) echarts.registerMap(`europa-${code}`, projected as never);
    const euro = features.filter((f) => f.properties.area_euro);
    return { frame: bounds(euro, 0.03), boxes: Object.fromEntries(INSET_CODES.map((c) => [c, bounds(features.filter((f) => f.properties.code === c), 0.45)])) };
  });
  return ready;
}

export interface MapValue { code: string; value: number }
export interface MapClass { min: number; max: number; color: string }
/** Cinque classi di uguale ampiezza tra il minimo e il massimo: la legenda si legge come una tabella. */
export function classes(values: MapValue[], ramp: string[]): MapClass[] {
  const v = values.map((x) => x.value).filter(Number.isFinite);
  const min = Math.min(...v), max = Math.max(...v);
  if (!(max > min)) return [{ min, max, color: ramp[ramp.length - 1] }];
  const step = (max - min) / ramp.length;
  return ramp.map((color, i) => ({ min: min + i * step, max: i === ramp.length - 1 ? max : min + (i + 1) * step, color }));
}

interface Props {
  title: string; unit: string; source?: string; values: MapValue[]; digits: number; height?: number; alt?: string;
  selected?: string | null; onSelect?: (code: string) => void;
  /** codice di un riquadro: mostra solo quel paese ingrandito, senza titolo esteso né legenda */
  inset?: string;
}
/** Mappa dell'area euro a classi di colore, con legenda leggibile e paese selezionato in evidenza. */
export function EuroMap({ title, unit, source, values, digits, height = 480, alt, selected, onSelect, inset }: Props) {
  const [geo, setGeo] = useState<{ frame: Box; boxes: Record<string, Box> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; loadMap().then((g) => alive && setGeo(g)).catch((e) => alive && setError(String(e.message ?? e))); return () => { alive = false; }; }, []);
  const by = useMemo(() => Object.fromEntries(values.map((v) => [v.code, v.value])), [values]);
  if (error) return <p className="alert">{t("map.noBorders", { e: error })}</p>;
  if (!geo) return <div className="skeleton" data-loading="" role="status" aria-label={t("map.loading")}><span style={{ height }} /></div>;
  const option = (p: Palette) => {
    const cls = classes(values, p.ramp), last = cls.length - 1;
    return {
      tooltip: { ...tooltipStyle(p), trigger: "item", formatter: (x: { name: string }) => (x.name in by ? `<b>${country(x.name)}</b><br>${nf(by[x.name], digits)}` : t("map.outside")) },
      visualMap: { show: false, type: "piecewise", // la prima classe è aperta in basso e l'ultima in alto: minimo e massimo non possono cadere fuori per un arrotondamento
        pieces: cls.map((c, i) => ({ ...(i === 0 ? {} : { gte: c.min }), ...(i === last ? {} : { lt: c.max }), ...(cls.length === 1 ? { gte: -Infinity } : {}), color: c.color })), outOfRange: { color: p.none } },
      series: [{ type: "map", map: inset ? `europa-${inset}` : "europa", nameProperty: "code", roam: false, aspectScale: 1, boundingCoords: inset ? geo.boxes[inset] : geo.frame,
        left: inset ? 4 : 0, right: inset ? 4 : 0, top: inset ? 4 : 0, bottom: inset ? 4 : 0,
        itemStyle: { areaColor: p.none, borderColor: p.border, borderWidth: 0.7 }, emphasis: { label: { show: false }, itemStyle: { areaColor: null, borderColor: p.selected, borderWidth: 1.6 } }, select: { disabled: true }, label: { show: false },
        data: values.map((v) => ({ name: v.code, value: v.value, ...(v.code === selected ? { itemStyle: { borderColor: p.selected, borderWidth: 2.4 } } : {}) })) }],
    };
  };
  const chart = <Chart bare={!!inset} title={title} unit={unit} source={source} height={height} alt={alt} deps={[values, selected, geo]} option={option} onClick={(p) => { if (p.name && p.name in by) onSelect?.(p.name); }} />;
  return inset ? chart : <>{chart}<MapLegend values={values} digits={digits} /></>;
}

/** Legenda della mappa: una riga di classi con gli estremi scritti, più la voce per i paesi fuori dall'area euro. */
export function MapLegend({ values, digits }: { values: MapValue[]; digits: number }) {
  return (
    <ul className="legend" data-legend="map">
      {classes(values, [1, 2, 3, 4, 5].map((i) => `var(--map-${i})`)).map((c, i) => <li key={i}><span className="swatch" style={{ background: c.color }} />{t("legend.range", { a: nf(c.min, digits), b: nf(c.max, digits) })}</li>)}
      <li><span className="swatch" style={{ background: "var(--map-none)" }} />{t("legend.none")}</li>
    </ul>
  );
}
