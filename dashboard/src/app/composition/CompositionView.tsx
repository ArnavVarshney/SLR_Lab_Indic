"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { axis, base, EChart, legend, type ClickParams } from "@/components/EChart";
import { Card, ErrorNote, Loading, Segmented, Select } from "@/components/ui";
import {
  BASE_CLASS_LABEL,
  cellAkshara,
  compose,
  vowelByPosition,
  vowelLabel,
  unitLabel,
  type CodaFilter,
  type Composition,
} from "@/lib/composition";
import { useTable } from "@/lib/data";
import { fmtInt, fmtPct } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import { useChartTheme, type ChartTheme } from "@/lib/theme";
import type { AksharaRow, BaseClass } from "@/lib/types";
import { SkeletonTable } from "./SkeletonTable";

const CODA_OPTIONS: { value: CodaFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "none", label: "None" },
  { value: "N", label: "ಂ" },
  { value: "H", label: "ಃ" },
];

const CLASSES = Object.keys(BASE_CLASS_LABEL) as BaseClass[];
const ROW_LIMITS = ["20", "40", "60"] as const;
type Scale = "share" | "count";

export function CompositionView({ malformed }: { malformed: { types: number; tokens: number } }) {
  const { data, error } = useTable("aksharas");
  const { weighting } = useSettings();
  const [coda, setCoda] = useState<CodaFilter>("all");
  const comp = useMemo(() => (data ? compose(data, weighting, coda) : null), [data, weighting, coda]);

  if (error) return <ErrorNote message={error} />;
  if (!data || !comp) return <Loading height={400} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs text-zinc-500 dark:text-zinc-400">Anusvara / visarga</span>
        <Segmented<CodaFilter> label="Anusvara / visarga" value={coda} onChange={setCoda} options={CODA_OPTIONS} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          All = ಕಾ and ಕಾಂ pooled in one cell; None = plain forms only. Applies to the whole page.
        </span>
      </div>
      <VowelCharts comp={comp} rows={data} coda={coda} />
      <CompositionGrid comp={comp} coda={coda} aksharas={data.map((r) => r.akshara)} />
      <SkeletonTable comp={comp} />
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Excluded as malformed (typing errors such as doubled signs): {fmtInt(malformed.types)} akshara types,{" "}
        {fmtInt(malformed.tokens)} tokens. Type weighting sums, over the aksharas in a cell, the word types containing each.
      </p>
    </div>
  );
}

function shareChart(
  theme: ChartTheme,
  vowels: string[],
  series: { name: string; counts: number[] }[],
  unit: string,
) {
  const shares = series.map((s) => {
    const tot = s.counts.reduce((a, b) => a + b, 0) || 1;
    return s.counts.map((c) => c / tot);
  });
  return {
    ...base(theme),
    legend: legend(theme),
    grid: { left: 40, right: 8, top: 30, bottom: 28 },
    tooltip: {
      ...base(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (ps: { dataIndex: number; seriesIndex: number; marker: string }[]) => {
        const j = ps[0].dataIndex;
        const lines = ps.map(
          (p) => `${p.marker}${series[p.seriesIndex].name}: ${fmtPct(shares[p.seriesIndex][j])} (${fmtInt(series[p.seriesIndex].counts[j])} ${unit})`,
        );
        return `<span style="font-size:15px">${vowelLabel(vowels[j])}</span><br/>${lines.join("<br/>")}`;
      },
    },
    xAxis: {
      type: "category",
      data: vowels.map(vowelLabel),
      ...axis(theme, { axisLabel: { color: theme.text, fontSize: 13, interval: 0 } }),
    },
    yAxis: {
      type: "value",
      ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }),
    },
    series: series.map((s, i) => ({
      name: s.name,
      type: "bar",
      barMaxWidth: 10,
      itemStyle: { borderRadius: [3, 3, 0, 0] },
      data: shares[i],
    })),
  };
}

function VowelCharts({ comp, rows, coda }: { comp: Composition; rows: AksharaRow[]; coda: CodaFilter }) {
  const theme = useChartTheme();
  const { weighting } = useSettings();

  const classOpt = useMemo(() => {
    const series = CLASSES.map((cls) => {
      const counts = comp.vowels.map(() => 0);
      for (const s of comp.skeletons) if (s.cls === cls) s.values.forEach((v, j) => (counts[j] += v));
      return { name: BASE_CLASS_LABEL[cls], counts };
    });
    return shareChart(theme, comp.vowels, series, unitLabel(weighting));
  }, [theme, comp, weighting]);

  const positionOpt = useMemo(() => {
    const p = vowelByPosition(rows, comp.vowels, coda);
    return shareChart(
      theme,
      comp.vowels,
      [
        { name: "Initial", counts: p.initial },
        { name: "Medial", counts: p.medial },
        { name: "Final", counts: p.final },
      ],
      "tokens",
    );
  }, [theme, rows, comp.vowels, coda]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Vowel sign by base" caption="Share of each base class's aksharas carrying each vowel sign. Each series sums to 100%.">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 440 }}>
            <EChart option={classOpt} height={280} label="Vowel sign distribution by base class" />
          </div>
        </div>
      </Card>
      <Card title="Vowel sign by position" caption="Share of consonantal akshara tokens at each word position (words of ≥2 aksharas). Token counts; weighting does not apply.">
        <div className="overflow-x-auto">
          <div style={{ minWidth: 440 }}>
            <EChart option={positionOpt} height={280} label="Vowel sign distribution by word position" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function CompositionGrid({ comp, coda, aksharas }: { comp: Composition; coda: CodaFilter; aksharas: string[] }) {
  const theme = useChartTheme();
  const router = useRouter();
  const { weighting } = useSettings();
  const [cls, setCls] = useState<BaseClass>("single");
  const [limit, setLimit] = useState<(typeof ROW_LIMITS)[number]>("40");
  const [scale, setScale] = useState<Scale>("share");
  const known = useMemo(() => new Set(aksharas), [aksharas]);

  const all = useMemo(() => comp.skeletons.filter((s) => s.cls === cls), [comp, cls]);
  const rows = useMemo(() => all.slice(0, Number(limit)), [all, limit]);

  const option = useMemo(() => {
    const { vowels } = comp;
    const unit = unitLabel(weighting);
    // [col, row, colour value or "-", count, share]
    const data: [number, number, number | string, number, number][] = [];
    let max = 0;
    rows.forEach((s, i) =>
      s.values.forEach((c, j) => {
        const share = s.total ? c / s.total : 0;
        const v = scale === "share" ? share : Math.log10(c + 1);
        if (c > 0) max = Math.max(max, v);
        data.push([j, i, c > 0 ? v : "-", c, share]);
      }),
    );
    const maxCount = Math.max(1, ...rows.flatMap((s) => s.values));
    return {
      ...base(theme),
      grid: { left: 64, right: 16, top: 28, bottom: 56 },
      tooltip: {
        ...base(theme).tooltip,
        formatter: (p: { data: [number, number, number, number, number] }) => {
          const [j, i, , c, share] = p.data;
          const s = rows[i];
          return `<span style="font-size:15px">${cellAkshara(s.skeleton, vowels[j], coda)}</span><br/>${fmtInt(c)} ${unit} · ${fmtPct(share)} of ${s.skeleton}`;
        },
      },
      xAxis: {
        type: "category",
        position: "top",
        data: vowels.map(vowelLabel),
        ...axis(theme, { axisLabel: { color: theme.text, fontSize: 14, interval: 0 }, splitLine: { show: false } }),
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((s) => s.skeleton),
        ...axis(theme, { axisLabel: { color: theme.text, fontSize: 14, interval: 0 }, splitLine: { show: false } }),
      },
      visualMap: {
        type: "continuous",
        min: 0,
        max: max || 1,
        calculable: false,
        orient: "horizontal",
        left: "center",
        bottom: 4,
        itemWidth: 10,
        itemHeight: 160,
        inRange: { color: theme.ramp },
        text: scale === "share" ? [fmtPct(max, 0), "0%"] : [fmtInt(maxCount), "1"],
        textStyle: { color: theme.muted, fontSize: 11 },
        dimension: 2,
      },
      series: [
        {
          type: "heatmap",
          data,
          itemStyle: { borderColor: theme.dark ? "#18181b" : "#ffffff", borderWidth: 2, borderRadius: 3 },
        },
      ],
    };
  }, [theme, comp, rows, scale, coda, weighting]);

  const onClick = (p: ClickParams) => {
    const d = p.data as [number, number, unknown, number] | undefined;
    if (!d || d[3] === 0) return;
    const ak = cellAkshara(rows[d[1]].skeleton, comp.vowels[d[0]], coda);
    if (known.has(ak)) router.push(`/transitions?a=${encodeURIComponent(ak)}`);
  };

  return (
    <Card
      title="Skeleton × vowel sign"
      caption={
        <>
          {scale === "share" ? "Row share: P(vowel sign | skeleton)" : "Count (log colour scale)"}, {unitLabel(weighting)}. Rows by
          frequency; showing {rows.length} of {all.length} skeletons. Blank = unattested. Click a cell to open its transitions.
        </>
      }
      actions={
        <>
          <Segmented<BaseClass>
            label="Base class"
            value={cls}
            onChange={setCls}
            options={CLASSES.map((c) => ({ value: c, label: BASE_CLASS_LABEL[c] }))}
          />
          <Select value={limit} onChange={setLimit} options={ROW_LIMITS.map((n) => ({ value: n, label: `Top ${n}` }))} />
          <Segmented<Scale>
            label="Scale"
            value={scale}
            onChange={setScale}
            options={[
              { value: "share", label: "Row share" },
              { value: "count", label: "Count" },
            ]}
          />
        </>
      }
    >
      <div className="overflow-x-auto">
        <div style={{ minWidth: 520, maxWidth: 720 }}>
          <EChart option={option} height={rows.length * 24 + 90} label="Skeleton by vowel sign heatmap" onClick={onClick} />
        </div>
      </div>
    </Card>
  );
}
