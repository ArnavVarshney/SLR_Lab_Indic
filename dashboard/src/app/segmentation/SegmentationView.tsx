"use client";

import { useMemo } from "react";
import { axis, base, EChart, legend } from "@/components/EChart";
import { Card, Stat } from "@/components/ui";
import { fmtFix, fmtInt, fmtPct, fmtProb } from "@/lib/format";
import { useChartTheme, type ChartTheme } from "@/lib/theme";
import type { BoundaryMeasure, Summary } from "@/lib/types";

function histOption(theme: ChartTheme, bins: number[], m: BoundaryMeasure) {
  // bin centres (geometric) on a log axis; last edge is 1 + ε
  const centres = bins.slice(0, -1).map((lo, i) => Math.sqrt(lo * Math.min(bins[i + 1], 1)));
  const keep = centres.map((_, i) => m.hist_within[i] + m.hist_across[i] > 0);
  const pts = (h: number[]) => centres.map((c, i) => [c, h[i]]).filter((_, i) => keep[i]);
  return {
    ...base(theme),
    legend: legend(theme),
    grid: { left: 44, right: 16, top: 30, bottom: 40 },
    tooltip: {
      ...base(theme).tooltip,
      trigger: "axis",
      formatter: (ps: { seriesName: string; value: [number, number] }[]) =>
        `TP ≈ ${fmtProb(ps[0].value[0])}<br/>` + ps.map((p) => `${p.seriesName}: ${fmtPct(p.value[1])}`).join("<br/>"),
    },
    xAxis: { type: "log", name: "Transition probability", nameLocation: "middle", nameGap: 26, min: 1e-5, max: 1, ...axis(theme) },
    yAxis: { type: "value", ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }) },
    series: [
      {
        name: "Within word", type: "line", data: pts(m.hist_within), showSymbol: false, lineStyle: { width: 2 },
        markLine: { silent: true, symbol: "none", lineStyle: { color: theme.series[0], type: "solid", opacity: 0.6 }, label: { show: false }, data: [{ xAxis: m.within_median }] },
      },
      {
        name: "Across boundary", type: "line", data: pts(m.hist_across), showSymbol: false, lineStyle: { width: 2 },
        markLine: { silent: true, symbol: "none", lineStyle: { color: theme.series[1], type: "solid", opacity: 0.6 }, label: { show: false }, data: [{ xAxis: m.across_median }] },
      },
    ],
  };
}

export function SegmentationView({ boundary: b }: { boundary: Summary["boundary"] }) {
  const theme = useChartTheme();
  const fwdOpt = useMemo(() => histOption(theme, b.bins, b.measures.forward), [theme, b]);
  const bwdOpt = useMemo(() => histOption(theme, b.bins, b.measures.backward), [theme, b]);
  const s = b.segmentation;
  const rows = [
    ["Forward P(B|A)", b.measures.forward],
    ["Backward P(A|B)", b.measures.backward],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="AUC, forward TP" value={fmtFix(b.measures.forward.auc, 3)} sub="P(TP within > TP across)" />
        <Stat label="AUC, backward TP" value={fmtFix(b.measures.backward.auc, 3)} sub="P(TP within > TP across)" />
        <Stat label="Local-minimum segmentation" value={`F1 ${fmtFix(s.f1, 3)}`} sub={`precision ${fmtFix(s.precision, 3)} · recall ${fmtFix(s.recall, 3)}`} />
        <Stat label="Chance precision" value={fmtFix(s.chance_precision, 3)} sub="share of transitions at a boundary" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Forward TP" caption="Share of transitions per log-spaced TP bin. Vertical lines: medians.">
          <EChart option={fwdOpt} height={280} label="Forward TP distributions within words and across boundaries" />
        </Card>
        <Card title="Backward TP" caption="Share of transitions per log-spaced TP bin. Vertical lines: medians.">
          <EChart option={bwdOpt} height={280} label="Backward TP distributions within words and across boundaries" />
        </Card>
      </div>
      <Card title="Summary" caption="AUC is reported as the effect size; transitions are not independent observations, so no p-values are given.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm tabular-nums">
            <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2 pr-4 font-medium">Measure</th>
                <th className="py-2 pr-4 text-right font-medium">n within</th>
                <th className="py-2 pr-4 text-right font-medium">n across</th>
                <th className="py-2 pr-4 text-right font-medium">Median within</th>
                <th className="py-2 pr-4 text-right font-medium">Median across</th>
                <th className="py-2 pr-4 text-right font-medium">Mean within</th>
                <th className="py-2 pr-4 text-right font-medium">Mean across</th>
                <th className="py-2 text-right font-medium">AUC</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, m]) => (
                <tr key={label} className="border-b border-zinc-100 dark:border-zinc-800/60">
                  <td className="py-2 pr-4">{label}</td>
                  <td className="py-2 pr-4 text-right">{fmtInt(m.within_n)}</td>
                  <td className="py-2 pr-4 text-right">{fmtInt(m.across_n)}</td>
                  <td className="py-2 pr-4 text-right">{fmtProb(m.within_median)}</td>
                  <td className="py-2 pr-4 text-right">{fmtProb(m.across_median)}</td>
                  <td className="py-2 pr-4 text-right">{fmtProb(m.within_mean)}</td>
                  <td className="py-2 pr-4 text-right">{fmtProb(m.across_mean)}</td>
                  <td className="py-2 text-right">{fmtFix(m.auc, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Segmentation: {s.method}.</p>
      </Card>
    </div>
  );
}
