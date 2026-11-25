import { useContext, useEffect, useRef, useState } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { LabelLayout } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";
import { getLang, locale, t } from "../i18n";
import { reducedMotion, type Theme } from "../lib/util";
import { ThemeContext } from "./theme";

// Solo i tipi di grafico usati: barre, linee, punti. La mappa registra i propri in EuroMap.tsx.
echarts.use([BarChart, LineChart, ScatterChart, GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent, LabelLayout, CanvasRenderer]);

export { echarts, ThemeContext };

/** Tema dei grafici: tutti i valori vengono da styles/tokens.css. */
export interface Palette {
  surface: string; panel: string; ink: string; ink2: string; grid: string; axis: string; band: string; soft: string;
  primary: string; accent: string; series: string[]; ramp: string[]; none: string; border: string; selected: string;
  tooltipBg: string; tooltipInk: string; font: string;
  /** vero se il grafico è largo meno di 560 pixel: le etichette dirette lasciano il posto alla legenda */
  narrow: boolean;
}
const cache: Partial<Record<Theme, Omit<Palette, "narrow">>> = {};
function readTokens(theme: Theme): Omit<Palette, "narrow"> {
  if (cache[theme]) return cache[theme]!;
  const css = getComputedStyle(document.documentElement), v = (name: string) => css.getPropertyValue(name).trim();
  const out = {
    surface: v("--bg"), panel: v("--surface"), ink: v("--ink"), ink2: v("--ink-2"), grid: v("--chart-grid"), axis: v("--chart-axis"), band: v("--chart-band"), soft: v("--chart-band"),
    primary: v("--primary"), accent: v("--accent"), series: [1, 2, 3, 4, 5, 6].map((i) => v(`--chart-${i}`)), ramp: [1, 2, 3, 4, 5].map((i) => v(`--map-${i}`)),
    none: v("--map-none"), border: v("--map-border"), selected: v("--map-selected"), tooltipBg: v("--chart-tooltip-bg"), tooltipInk: v("--chart-tooltip-ink"), font: v("--font-text"),
  };
  if (out.ink) cache[theme] = out;
  return out;
}
export const usePalette = (): Palette => ({ ...readTokens(useContext(ThemeContext)), narrow: false });

// ---------- elementi comuni: griglie leggere, assi discreti, valori al passaggio del mouse
export const grid = (extra: object = {}) => ({ left: 4, right: 16, top: 16, bottom: 4, containLabel: true, ...extra });
const axisNumber = (v: unknown) => (typeof v === "number" ? v.toLocaleString(locale(), { maximumFractionDigits: 4 }) : String(v));
export const axisStyle = (p: Palette) => ({
  axisLine: { lineStyle: { color: p.grid } }, axisTick: { show: false }, axisLabel: { color: p.axis, fontSize: 11, formatter: axisNumber, hideOverlap: true },
  splitLine: { lineStyle: { color: p.grid, width: 1 } }, nameTextStyle: { color: p.axis, fontSize: 11 },
});
export const tooltipStyle = (p: Palette) => ({
  backgroundColor: p.tooltipBg, borderWidth: 0, padding: [6, 10], textStyle: { color: p.tooltipInk, fontSize: 12, fontFamily: p.font }, confine: true, extraCssText: "border-radius:6px;box-shadow:0 4px 16px rgba(0,0,0,.25)",
});
export const legendStyle = (p: Palette) => ({ textStyle: { color: p.ink2, fontSize: 12 }, itemWidth: 22, itemHeight: 10, itemGap: 14 });
/** Etichette di un asse in percentuale, con i decimali della lingua. */
export const pctLabel = (p: Palette) => ({ color: p.axis, fontSize: 11, formatter: (v: number) => axisNumber(v) + "%", hideOverlap: true });

// ---------- serie: ogni serie ha colore, tratto e forma propri, così non si distinguono solo per il colore
export const DASHES: (string | number[])[] = ["solid", [7, 4], [2, 3], [10, 3, 2, 3], [14, 4], [4, 2, 1, 2]];
export const SYMBOLS = ["circle", "rect", "triangle", "diamond", "roundRect", "pin"];
export const seriesColor = (p: Palette, i: number) => p.series[i % p.series.length];

export interface LineItem { name: string; data: (number | null)[]; index?: number; width?: number; extra?: object }
/**
 * Linee con l'etichetta scritta alla fine di ogni serie, al posto della legenda. Sui grafici stretti
 * non c'è spazio a destra e torna la legenda in alto. Restituisce legend, grid e series da unire all'opzione.
 */
export function lines(p: Palette, items: LineItem[], gridExtra: object = {}) {
  const longest = Math.max(...items.map((s) => s.name.length), 4);
  return {
    legend: p.narrow && items.length > 1 ? { ...legendStyle(p), top: 0, left: 0, type: "scroll" } : { show: false },
    grid: grid({ top: p.narrow && items.length > 1 ? 34 : 16, right: p.narrow ? 16 : Math.min(220, 18 + longest * 6.4), ...gridExtra }),
    series: items.map((s, k) => {
      const i = s.index ?? k, color = seriesColor(p, i);
      return { name: s.name, type: "line", symbol: "none", connectNulls: false, lineStyle: { width: s.width ?? 2, type: DASHES[i % DASHES.length], color }, itemStyle: { color },
        endLabel: { show: !p.narrow, formatter: "{a}", color, fontSize: 11, distance: 6 }, labelLayout: { moveOverlap: "shiftY" }, emphasis: { focus: "series" }, data: s.data, ...s.extra };
    }),
  };
}
/** Barre orizzontali o verticali con il valore scritto accanto: l'asse dei valori non serve più. */
export const barLabel = (p: Palette, format: (v: number) => string, position: "right" | "top" = "right") => ({
  show: true, position, color: p.ink2, fontSize: 11, formatter: (x: { value: number | number[] }) => format(Array.isArray(x.value) ? x.value[0] : x.value),
});

interface Props {
  title: string; unit?: string; source?: string; height?: number; note?: string; bare?: boolean;
  /** Testo alternativo: cosa mostra il grafico e il dato principale, per chi non lo vede. */
  alt?: string;
  option: (p: Palette) => Record<string, unknown>;
  onClick?: (params: { name?: string; data?: unknown; seriesName?: string }) => void;
  deps?: unknown[];
}
let fontsReady = false;
const fontWaiters = new Set<() => void>();
if (typeof document !== "undefined" && document.fonts) document.fonts.ready.then(() => { fontsReady = true; fontWaiters.forEach((f) => f()); fontWaiters.clear(); });

/** Grafico con titolo, unità e fonte sempre visibili, tema unico e testo alternativo. `bare` per i riquadri piccoli. */
export function Chart({ title, unit = "", source, height = 320, note, bare = false, alt, option, onClick, deps = [] }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const theme = useContext(ThemeContext);
  const [narrow, setNarrow] = useState(false);
  const [fonts, setFonts] = useState(fontsReady);
  const click = useRef(onClick);
  click.current = onClick;

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current, c = echarts.init(el);
    chart.current = c;
    c.on("click", (params) => click.current?.(params as never));
    setNarrow(el.clientWidth < 560);
    const ro = new ResizeObserver(() => { c.resize(); setNarrow(el.clientWidth < 560); });
    ro.observe(el);
    const onFonts = () => setFonts(true);
    if (!fontsReady) fontWaiters.add(onFonts);
    return () => { fontWaiters.delete(onFonts); ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    const p: Palette = { ...readTokens(theme), narrow };
    const move = !reducedMotion();
    chart.current?.setOption({ animation: move, animationDuration: 320, animationDurationUpdate: 260, animationEasing: "cubicOut", animationEasingUpdate: "cubicOut",
      textStyle: { color: p.ink2, fontFamily: p.font }, color: p.series, ...option(p) }, { replaceMerge: ["series", "legend", "grid", "xAxis", "yAxis", "visualMap", "tooltip"] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, narrow, fonts, getLang(), ...deps]);

  const label = [title, unit, alt].filter(Boolean).join(". ");
  return (
    <figure className={bare ? "chart bare" : "chart"}>
      <figcaption><strong>{title}</strong>{unit && <span className="unit">{unit}</span>}</figcaption>
      <div ref={ref} style={{ height }} role="img" aria-label={label} />
      {alt && <p className="sr-only">{alt}</p>}
      {source && <p className="source">{t("chart.source")}: {source}{note ? ` · ${note}` : ""}</p>}
    </figure>
  );
}
