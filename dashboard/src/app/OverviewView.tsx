"use client";

import { useMemo } from "react";
import { axis, base, EChart, legend } from "@/components/EChart";
import { Card, Stat } from "@/components/ui";
import { fmtCompact, fmtFix, fmtInt, fmtPct } from "@/lib/format";
import { useSettings, WEIGHTING_LABEL } from "@/lib/settings";
import { useChartTheme } from "@/lib/theme";
import type { Summary } from "@/lib/types";

export function OverviewView({
  totals: t,
  wordLength,
  coverage,
  zipf,
}: {
  totals: Summary["totals"];
  wordLength: Summary["word_length"];
  coverage: Summary["coverage"];
  zipf: Summary["zipf_words"];
}) {
  const theme = useChartTheme();
  const { weighting } = useSettings();

  const lengthOpt = useMemo(() => {
    const tokTot = wordLength.reduce((s, r) => s + r[1], 0);
    const typTot = wordLength.reduce((s, r) => s + r[2], 0);
    return {
      ...base(theme),
      legend: legend(theme),
      grid: { left: 44, right: 8, top: 30, bottom: 36 },
      tooltip: { ...base(theme).tooltip, trigger: "axis", valueFormatter: (v: number) => fmtPct(v) },
      xAxis: { type: "category", data: wordLength.map((r) => r[0]), name: "Length (aksharas)", nameLocation: "middle", nameGap: 24, ...axis(theme) },
      yAxis: { type: "value", ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }) },
      series: [
        { name: "Tokens", type: "bar", data: wordLength.map((r) => r[1] / tokTot), barMaxWidth: 14, itemStyle: { borderRadius: [3, 3, 0, 0] } },
        { name: "Types", type: "bar", data: wordLength.map((r) => r[2] / typTot), barMaxWidth: 14, itemStyle: { borderRadius: [3, 3, 0, 0] } },
      ],
    };
  }, [theme, wordLength]);

  const coverageOpt = useMemo(
    () => ({
      ...base(theme),
      grid: { left: 44, right: 12, top: 12, bottom: 36 },
      tooltip: {
        ...base(theme).tooltip,
        trigger: "axis",
        formatter: (ps: { value: [number, number] }[]) => `Top ${fmtInt(ps[0].value[0])} aksharas: ${fmtPct(ps[0].value[1])}`,
      },
      xAxis: { type: "log", name: "Akshara rank", nameLocation: "middle", nameGap: 24, min: 1, max: t.akshara_types, ...axis(theme) },
      yAxis: { type: "value", max: 1, ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: (v: number) => fmtPct(v, 0) } }) },
      series: [
        {
          type: "line", data: coverage.curve, showSymbol: false, lineStyle: { width: 2 }, areaStyle: { opacity: 0.08 },
          markLine: {
            silent: true, symbol: "none", lineStyle: { color: theme.axis, type: "solid" },
            label: { show: false },
            data: ["0.5", "0.8", "0.9"].map((k) => ({ xAxis: coverage.thresholds[k] })),
          },
        },
      ],
    }),
    [theme, coverage, t.akshara_types],
  );

  const zipfOpt = useMemo(
    () => ({
      ...base(theme),
      grid: { left: 48, right: 12, top: 12, bottom: 36 },
      tooltip: {
        ...base(theme).tooltip,
        trigger: "axis",
        formatter: (ps: { value: [number, number] }[]) => `Rank ${fmtInt(ps[0].value[0])}: frequency ${fmtInt(ps[0].value[1])}`,
      },
      xAxis: { type: "log", name: "Word rank", nameLocation: "middle", nameGap: 24, min: 1, ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: fmtCompact } }) },
      yAxis: { type: "log", name: "Frequency", min: 1, ...axis(theme, { axisLabel: { color: theme.muted, fontSize: 11, formatter: fmtCompact } }) },
      series: [{ type: "line", data: zipf, showSymbol: false, lineStyle: { width: 2 } }],
    }),
    [theme, zipf],
  );

  const H = weighting === "tok" ? t.H_next_tok : t.H_next_typ;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Word tokens" value={fmtInt(t.word_tokens)} sub={`${fmtInt(t.word_types)} types · TTR ${fmtFix(t.type_token_ratio, 3)}`} />
        <Stat label="Hapax word types" value={fmtInt(t.hapax_word_types)} sub={fmtPct(t.hapax_word_types / t.word_types) + " of types"} />
        <Stat label="Akshara tokens" value={fmtInt(t.akshara_tokens)} sub={`${fmtInt(t.akshara_types)} types · ${fmtInt(t.hapax_akshara_types)} hapax`} />
        <Stat label="Mean word length" value={`${fmtFix(t.mean_word_length_tokens, 2)}`} sub={`aksharas (tokens) · ${fmtFix(t.mean_word_length_types, 2)} (types)`} />
        <Stat label="H(akshara)" value={`${fmtFix(t.H_unigram, 2)} bits`} sub="unigram entropy, tokens" />
        <Stat label="H(next | akshara)" value={`${fmtFix(H, 2)} bits`} sub={`within word, incl. word end · ${WEIGHTING_LABEL[weighting].toLowerCase()}`} />
        <Stat label="Conjunct aksharas" value={fmtPct(t.conjunct_token_share)} sub={`of tokens · ${fmtPct(t.words_with_conjunct_token_share)} of words contain one`} />
        <Stat label="n-gram types" value={fmtInt(t.bigram_types)} sub={`bigrams · ${fmtInt(t.trigram_types)} trigrams (incl. #)`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Word length" caption="Share of word tokens and word types by length in aksharas.">
          <EChart option={lengthOpt} height={260} label="Word length distribution" />
        </Card>
        <Card
          title="Akshara coverage"
          caption={`Cumulative share of akshara tokens covered by the N most frequent types. 50% / 80% / 90% reached at N = ${coverage.thresholds["0.5"]} / ${coverage.thresholds["0.8"]} / ${coverage.thresholds["0.9"]}.`}
        >
          <EChart option={coverageOpt} height={260} label="Akshara coverage curve" />
        </Card>
      </div>
      <Card title="Word rank–frequency" caption="Word types ranked by token frequency (log–log).">
        <EChart option={zipfOpt} height={260} label="Word rank-frequency distribution" />
      </Card>
    </div>
  );
}
