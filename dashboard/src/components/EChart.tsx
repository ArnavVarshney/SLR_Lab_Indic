"use client";

import { BarChart, HeatmapChart, LineChart, SankeyChart, ScatterChart } from "echarts/charts";
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsCoreOption } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";
import type { ChartTheme } from "@/lib/theme";

echarts.use([
  BarChart, LineChart, HeatmapChart, ScatterChart, SankeyChart,
  GridComponent, TooltipComponent, LegendComponent, VisualMapComponent, MarkLineComponent,
  DataZoomComponent, CanvasRenderer,
]);

export type { EChartsCoreOption };

export interface ClickParams {
  name?: string;
  data?: unknown;
  seriesIndex?: number;
  dataIndex?: number;
}

/** Shared option fragments so every chart reads the same. */
export function base(t: ChartTheme) {
  return {
    backgroundColor: "transparent",
    animation: false,
    textStyle: { color: t.text },
    color: t.series,
    tooltip: {
      backgroundColor: t.tooltipBg,
      borderColor: t.tooltipBorder,
      textStyle: { color: t.text, fontSize: 12 },
      confine: true,
    },
  };
}

export function legend(t: ChartTheme) {
  return { top: 0, left: 0, itemWidth: 10, itemHeight: 10, icon: "roundRect", textStyle: { color: t.text, fontSize: 12 } };
}

export function axis(t: ChartTheme, extra: Record<string, unknown> = {}) {
  return {
    axisLine: { lineStyle: { color: t.axis } },
    axisTick: { show: false },
    axisLabel: { color: t.muted, fontSize: 11 },
    splitLine: { lineStyle: { color: t.grid } },
    nameTextStyle: { color: t.muted, fontSize: 11 },
    ...extra,
  };
}

/** Canvas text cannot inherit CSS fonts: inject the page font stack (incl. Noto Sans Kannada). */
function withFont(o: EChartsCoreOption): EChartsCoreOption {
  const ff = getComputedStyle(document.body).fontFamily;
  const tooltip = o.tooltip as Record<string, unknown> | undefined;
  return {
    ...o,
    textStyle: { ...(o.textStyle as object), fontFamily: ff },
    ...(tooltip && !Array.isArray(tooltip)
      ? { tooltip: { ...tooltip, textStyle: { ...(tooltip.textStyle as object), fontFamily: ff } } }
      : {}),
  };
}

export function EChart({
  option,
  height,
  label,
  onClick,
}: {
  option: EChartsCoreOption;
  height: number;
  label: string;
  onClick?: (p: ClickParams) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const clickRef = useRef(onClick);

  useEffect(() => {
    clickRef.current = onClick;
  }, [onClick]);

  useEffect(() => {
    const node = el.current!;
    const c = echarts.init(node, null, { renderer: "canvas" });
    chart.current = c;
    c.on("click", (p) => clickRef.current?.(p as ClickParams));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(node);
    return () => {
      ro.disconnect();
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    let live = true;
    const apply = () => live && chart.current?.setOption(withFont(option), { notMerge: true });
    apply();
    // re-render once web fonts are ready so Kannada labels use Noto Sans Kannada
    document.fonts?.ready.then(apply);
    return () => {
      live = false;
    };
  }, [option]);

  return <div ref={el} role="img" aria-label={label} style={{ height }} className="w-full" />;
}
