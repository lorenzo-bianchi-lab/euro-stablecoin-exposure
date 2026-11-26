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
const MERGE = { replaceMerge: ["series", "legend", "grid", "xAxis", "yAxis", "visualMap", "tooltip"] };

/**
 * Punti dei dati e punti effettivamente disegnati nella loro posizione finale. Serve al test nel browser:
 * un grafico è completo quando i due numeri coincidono (barre alla loro lunghezza, punti alla loro
 * posizione, linee non tagliate dall'animazione d'ingresso, regioni della mappa presenti).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function chartState(c: echarts.ECharts): { expected: number; drawn: number } {
  let expected = 0, drawn = 0;
  const near = (a: number, b: number) => Math.abs(a - b) < 0.75;
  (c as any).getModel().getSeries().forEach((s: any) => {
    const data = s.getData(), view = (c as any).getViewOfSeriesModel(s);
    if (s.subType === "line") {
      const pts: ArrayLike<number> = data.getLayout("points") ?? [], line = view?._polyline;
      const finite = (a: ArrayLike<number>) => { let n = 0; for (let i = 0; i < a.length; i += 2) if (Number.isFinite(a[i]) && Number.isFinite(a[i + 1])) n++; return n; };
      const want = finite(pts);
      let got = line ? finite(line.shape.points ?? []) : 0;
      const clip = view?._lineGroup?.getClipPath?.(), area = s.coordinateSystem?.getArea?.();
      if (clip?.shape?.width !== undefined && area?.width && clip.shape.width < area.width - 1) got = Math.floor((got * Math.max(0, clip.shape.width)) / area.width);
      expected += want; drawn += Math.min(got, want);
      return;
    }
    for (let i = 0; i < data.count(); i++) {
      const el = data.getItemGraphicEl(i), layout = data.getItemLayout(i);
      if (s.subType === "map") { if (!Number.isFinite(data.get(data.mapDimension("value"), i))) continue; expected++; if (el) drawn++; continue; }
      if (!layout) continue;
      if (s.subType === "bar") { expected++; if (el && near(el.shape.width, layout.width) && near(el.shape.height, layout.height)) drawn++; continue; }
      if (!Number.isFinite(layout[0]) || !Number.isFinite(layout[1])) continue;
      expected++;
      if (el && near(el.x, layout[0]) && near(el.y, layout[1]) && el.scaleX !== 0) drawn++;
    }
  });
  return { expected, drawn };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
  const last = useRef<Record<string, unknown> | null>(null);
  const drawn = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current, c = echarts.init(el);
    chart.current = c;
    c.on("click", (params) => click.current?.(params as never));
    setNarrow(el.clientWidth < 560);
    (el as unknown as { __state: () => { expected: number; drawn: number } }).__state = () => chartState(c);
    const ro = new ResizeObserver(() => { c.resize({ animation: { duration: 0 } }); c.getZr().flush(); setNarrow(el.clientWidth < 560); });
    ro.observe(el);
    const onFonts = () => setFonts(true);
    if (!fontsReady) fontWaiters.add(onFonts);
    // Se la scheda va in secondo piano o si stampa mentre una transizione è in corso, il grafico viene
    // portato subito allo stato finale: non resta mai disegnato a metà.
    const settle = () => { if (last.current) { c.setOption({ ...last.current, animation: false }, MERGE); c.getZr().flush(); } };
    document.addEventListener("visibilitychange", settle);
    window.addEventListener("beforeprint", settle);
    return () => { document.removeEventListener("visibilitychange", settle); window.removeEventListener("beforeprint", settle); fontWaiters.delete(onFonts); ro.disconnect(); c.dispose(); chart.current = null; };
  }, []);

  useEffect(() => {
    const p: Palette = { ...readTokens(theme), narrow };
    const c = chart.current;
    if (!c) return;
    // Il primo disegno è sempre completo e immediato: nessuna animazione d'ingresso, e il canvas viene dipinto
    // subito senza aspettare il fotogramma successivo, che una scheda in secondo piano, una stampa o una cattura
    // possono non ricevere mai. Le transizioni valgono solo per gli aggiornamenti successivi, a scheda visibile.
    const move = drawn.current && !reducedMotion() && document.visibilityState === "visible";
    const opt: Record<string, unknown> = { animationDuration: 0, animationDurationUpdate: 260, animationEasingUpdate: "cubicOut", textStyle: { color: p.ink2, fontFamily: p.font }, color: p.series, ...option(p) };
    last.current = opt;
    c.setOption({ ...opt, animation: move }, MERGE);
    if (!move) c.getZr().flush();
    drawn.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, narrow, fonts, getLang(), ...deps]);

  const label = [title, unit, alt].filter(Boolean).join(". ");
  return (
    <figure className={bare ? "chart bare" : "chart"}>
      <figcaption><strong>{title}</strong>{unit && <span className="unit">{unit}</span>}</figcaption>
      <div ref={ref} style={{ height }} role="img" aria-label={label} data-motion={reducedMotion() ? "off" : "on"} />
      {alt && <p className="sr-only">{alt}</p>}
      {source && <p className="source">{t("chart.source")}: {source}{note ? ` · ${note}` : ""}</p>}
    </figure>
  );
}
