"use client";

import { useMemo, useState } from "react";
import { axis, base, EChart, legend } from "@/components/EChart";
import { Card, Segmented } from "@/components/ui";
import { fmtInt, fmtPct } from "@/lib/format";
import { useChartTheme } from "@/lib/theme";
import type { Distribution, Summary } from "@/lib/types";

type DistKey = "structure" | "cluster" | "vowel_kind";

const DIST_LABEL: Record<DistKey, string> = { structure: "Structure", cluster: "Cluster", vowel_kind: "Vowel" };

const POSITION_CATEGORIES = [
  ["independent_vowel", "Vowel letter"],
  ["anusvara_visarga", "Anus./vis."],
  ["geminate", "Geminate"],
  ["non_geminate", "Non-gem."],
  ["dead_consonant", "Dead C"],
] as const;

export function AksharaCharts({
  structure,
  cluster,
  vowelKind,
  position,
}: {
  structure: Distribution;
  cluster: Distribution;
  vowelKind: Distribution;
  position: Summary["position"];
}) {
  const theme = useChartTheme();
  const [dist, setDist] = useState<DistKey>("structure");

  const distOpt = useMemo(() => {
    const d = { structure, cluster, vowel_kind: vowelKind }[dist];
    // keep categories with ≥0.05% of tokens or ≥1% of types; reverse so largest is on top
    const rows = d.rows.filter((r) => r[4] >= 0.0005 || r[3] >= 0.01).reverse();
    return {
      ...base(theme),
      legend: legend(theme),
      grid: { left: 96, right: 16, top: 30, bottom: 28 },
      tooltip: {
        ...base(theme).tooltip,
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (ps: { dataIndex: number }[]) => {
          const r = rows[ps[0].dataIndex];
          return `<b>${r[0]}</b><br/>Tokens: ${fmtPct(r[4])} (${fmtInt(r[2])})<br/>Types: ${fmtPct(r[3])} (${fmtInt(r[1])})`;
        },
      },
      xAxis: { type: "value", max: 1, ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }) },
      yAxis: { type: "category", data: rows.map((r) => r[0]), ...axis(theme) },
      series: [
        { name: "Tokens", type: "bar", data: rows.map((r) => r[4]), barMaxWidth: 10, itemStyle: { borderRadius: [0, 3, 3, 0] } },
        { name: "Types", type: "bar", data: rows.map((r) => r[3]), barMaxWidth: 10, itemStyle: { borderRadius: [0, 3, 3, 0] } },
      ],
    };
  }, [theme, dist, structure, cluster, vowelKind]);

  const positionOpt = useMemo(() => {
    const pos = position.filter((p) => p.position !== "mono");
    return {
      ...base(theme),
      legend: legend(theme),
      grid: { left: 40, right: 8, top: 30, bottom: 28 },
      tooltip: { ...base(theme).tooltip, trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => fmtPct(v) },
      xAxis: { type: "category", data: POSITION_CATEGORIES.map((c) => c[1]), ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, interval: 0 } }) },
      yAxis: { type: "value", ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }) },
      series: pos.map((p) => ({
        name: p.position[0].toUpperCase() + p.position.slice(1),
        type: "bar",
        barMaxWidth: 12,
        itemStyle: { borderRadius: [3, 3, 0, 0] },
        data: POSITION_CATEGORIES.map(([k]) => p[k]),
      })),
    };
  }, [theme, position]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Distribution"
          caption="Share of akshara tokens and akshara types per category."
          actions={
            <Segmented<DistKey>
              label="Distribution"
              value={dist}
              onChange={setDist}
              options={(Object.keys(DIST_LABEL) as DistKey[]).map((k) => ({ value: k, label: DIST_LABEL[k] }))}
            />
          }
        >
          <EChart option={distOpt} height={300} label={`${DIST_LABEL[dist]} distribution`} />
        </Card>
        <Card title="Complexity by position" caption="Share of akshara tokens at each word position (words of ≥2 aksharas). Vowel letter = independent vowel; Non-gem. = non-geminate cluster; Dead C = virama-final.">
          <EChart option={positionOpt} height={300} label="Akshara complexity by word position" />
        </Card>
    </div>
  );
}
