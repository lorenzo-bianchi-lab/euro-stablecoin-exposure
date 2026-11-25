import { createContext, useContext, useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, MapChart, ScatterChart } from "echarts/charts";
import { DataZoomComponent, GeoComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { Theme } from "../lib/util";

echarts.use([BarChart, LineChart, MapChart, ScatterChart, DataZoomComponent, GeoComponent, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, VisualMapComponent, CanvasRenderer]);

export { echarts };
export const ThemeContext = createContext<Theme>("light");

export interface Palette {
  surface: string; panel: string; ink: string; ink2: string; grid: string;
  series: string[]; ramp: string[]; soft: string;
}
// Categorie: ordine fisso, verificato per leggibilità anche con daltonismo in entrambi i temi.
const PALETTES: Record<Theme, Palette> = {
  light: { surface: "#fcfcfb", panel: "#ffffff", ink: "#0b0b0b", ink2: "#52514e", grid: "#e4e3df", soft: "#cde2fb",
           series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"],
           ramp: ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#0d366b"] },
  dark: { surface: "#1a1a19", panel: "#232322", ink: "#f0efec", ink2: "#c3c2b7", grid: "#3a3a37", soft: "#184f95",
          series: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#0ca30c", "#9085e9", "#e66767"],
          ramp: ["#104281", "#256abf", "#5598e7", "#9ec5f4", "#cde2fb"] },
};
export const usePalette = () => PALETTES[useContext(ThemeContext)];

// Elementi comuni: assi e griglie poco invadenti, valori al passaggio del mouse.
export const grid = (extra: object = {}) => ({ left: 8, right: 16, top: 16, bottom: 8, containLabel: true, ...extra });
export const axisStyle = (p: Palette) => ({
  axisLine: { lineStyle: { color: p.grid } }, axisTick: { show: false }, axisLabel: { color: p.ink2, fontSize: 11, formatter: (v: unknown) => (typeof v === "number" ? v.toLocaleString("it-IT", { maximumFractionDigits: 4 }) : String(v)) },
  splitLine: { lineStyle: { color: p.grid } }, nameTextStyle: { color: p.ink2, fontSize: 11 },
});
export const tooltipStyle = (p: Palette) => ({
  backgroundColor: p.ink, borderWidth: 0, textStyle: { color: p.surface, fontSize: 12 }, confine: true,
});
export const legendStyle = (p: Palette) => ({ textStyle: { color: p.ink2, fontSize: 12 }, icon: "roundRect", itemWidth: 12, itemHeight: 12 });

interface Props {
  title: string; unit: string; source: string; height?: number; note?: string;
  option: (p: Palette) => Record<string, unknown>;
  onClick?: (params: { name?: string; data?: unknown; seriesName?: string }) => void;
  deps?: unknown[];
}

/** Grafico con titolo, unità e fonte sempre visibili; i valori compaiono al passaggio del mouse. */
export function Chart({ title, unit, source, height = 320, note, option, onClick, deps = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const theme = useContext(ThemeContext);
  const palette = PALETTES[theme];
  const click = useRef(onClick);
  click.current = onClick;

  useEffect(() => {
    if (!ref.current) return;
    const c = echarts.init(ref.current);
    chart.current = c;
    c.on("click", (params) => click.current?.(params as never));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(ref.current);
    return () => { ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    chart.current?.setOption({ animation: false, textStyle: { color: palette.ink2, fontFamily: "inherit" }, color: palette.series, ...option(palette) }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, ...deps]);

  return (
    <figure className="chart">
      <figcaption><strong>{title}</strong><span className="unit">{unit}</span></figcaption>
      <div ref={ref} style={{ height }} role="img" aria-label={`${title}. ${unit}`} />
      <p className="source">Fonte: {source}{note ? ` · ${note}` : ""}</p>
    </figure>
  );
}

/** Etichette di un asse in percentuale, con i decimali all'italiana. */
export const pctLabel = (p: Palette) => ({ color: p.ink2, fontSize: 11, formatter: (v: number) => v.toLocaleString("it-IT", { maximumFractionDigits: 4 }) + "%" });
