"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Button, Card, Checkbox, Field, NumberInput, Select } from "@/components/ui";
import { downloadCsv } from "@/lib/csv";
import { fmtFix, fmtInt, fmtProb } from "@/lib/format";
import { matchExtremes, type MatchItem } from "@/lib/matching";
import { useSettings, WEIGHTING_LABEL } from "@/lib/settings";
import { mean, smd } from "@/lib/stats";
import type { Weighting, WordRow } from "@/lib/types";

type VarKey = "mean_tp" | "min_tp" | "log2p_tok" | "neighbours" | "visual_components" | "n_conjunct";

const VARS: { value: VarKey; label: string; get: (r: WordRow, w: Weighting) => number | null; fmt: (v: number) => string }[] = [
  { value: "mean_tp", label: "Mean TP", get: (r, w) => r[`mean_tp_${w}`], fmt: fmtProb },
  { value: "min_tp", label: "Min TP", get: (r, w) => r[`min_tp_${w}`], fmt: fmtProb },
  { value: "log2p_tok", label: "log₂ P (token)", get: (r) => r.log2p_tok, fmt: (v) => fmtFix(v, 2) },
  { value: "neighbours", label: "Neighbours N", get: (r) => r.neighbours, fmt: (v) => fmtFix(v, 1) },
  { value: "visual_components", label: "Components", get: (r) => r.visual_components, fmt: (v) => fmtFix(v, 1) },
  { value: "n_conjunct", label: "Conjuncts", get: (r) => r.n_conjunct, fmt: (v) => fmtFix(v, 2) },
];

type Item = MatchItem & { row: WordRow };

export function MatchedSets({ rows }: { rows: WordRow[] }) {
  const { weighting: w } = useSettings();
  const [varKey, setVarKey] = useState<VarKey>("mean_tp");
  const [q, setQ] = useState("0.2");
  const [tol, setTol] = useState<number | null>(0.1);
  const [exactLength, setExactLength] = useState(true);
  const [maxPairs, setMaxPairs] = useState<number | null>(20);
  const v = VARS.find((x) => x.value === varKey)!;

  const live = useMemo(() => ({ rows, varKey, q, tol, exactLength, maxPairs, w }), [rows, varKey, q, tol, exactLength, maxPairs, w]);
  const params = useDeferredValue(live);
  const result = useMemo(() => {
    const spec = VARS.find((x) => x.value === params.varKey)!;
    const items: Item[] = [];
    for (const r of params.rows) {
      const value = spec.get(r, params.w);
      if (value != null) items.push({ id: r.aksharas, value, freq: r.freq, length: r.n_aksharas, row: r });
    }
    return matchExtremes(items, {
      q: Number(params.q),
      logFreqTolerance: Math.max(0, params.tol ?? 0),
      exactLength: params.exactLength,
      maxPairs: Math.max(1, Math.min(1000, params.maxPairs ?? 1)),
    });
  }, [params]);

  const groups = useMemo(() => {
    const hi = result.pairs.map((p) => p.high);
    const lo = result.pairs.map((p) => p.low);
    const metrics: { label: string; get: (i: Item) => number; f: (n: number) => string }[] = [
      { label: v.label, get: (i) => i.value, f: v.fmt },
      { label: "Zipf", get: (i) => i.row.zipf, f: (n) => fmtFix(n, 2) },
      { label: "Length", get: (i) => i.row.n_aksharas, f: (n) => fmtFix(n, 2) },
      { label: "Neighbours N", get: (i) => i.row.neighbours, f: (n) => fmtFix(n, 1) },
      { label: "Components", get: (i) => i.row.visual_components, f: (n) => fmtFix(n, 1) },
    ];
    return metrics.map((m) => ({
      label: m.label,
      high: m.f(mean(hi.map(m.get))),
      low: m.f(mean(lo.map(m.get))),
      smd: smd(hi.map(m.get), lo.map(m.get)),
    }));
  }, [result, v]);

  const exportPairs = () =>
    downloadCsv(`matched_${varKey}_${w}.csv`, result.pairs.map((p, i) => ({ ...p, i: i + 1 })), [
      { header: "pair", value: (p) => p.i },
      { header: "high_word", value: (p) => p.high.row.word },
      { header: "high_aksharas", value: (p) => p.high.row.aksharas },
      { header: `high_${v.value}`, value: (p) => p.high.value },
      { header: "high_freq", value: (p) => p.high.freq },
      { header: "low_word", value: (p) => p.low.row.word },
      { header: "low_aksharas", value: (p) => p.low.row.aksharas },
      { header: `low_${v.value}`, value: (p) => p.low.value },
      { header: "low_freq", value: (p) => p.low.freq },
      { header: "length_high", value: (p) => p.high.length },
      { header: "length_low", value: (p) => p.low.length },
    ]);

  const usesTp = varKey === "mean_tp" || varKey === "min_tp";

  return (
    <Card
      title="Matched sets"
      caption={
        <>
          Top vs bottom quantile of the variable within the filtered words, paired by greedy nearest-neighbour matching on log₁₀ frequency
          {exactLength ? " and exact length" : ""}, without replacement.
          {usesTp && w === "tok" && " Token-weighted TP partly reflects each word's own frequency; type weighting avoids this."}
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Variable">
          <Select value={varKey} onChange={setVarKey} options={VARS.map((x) => ({ value: x.value, label: x.value === "mean_tp" || x.value === "min_tp" ? `${x.label} (${WEIGHTING_LABEL[w].toLowerCase()})` : x.label }))} />
        </Field>
        <Field label="Quantile">
          <Select
            value={q}
            onChange={setQ}
            options={["0.1", "0.2", "0.25", "0.33", "0.5"].map((x) => ({ value: x, label: `${Math.round(Number(x) * 100)}%` }))}
          />
        </Field>
        <Field label="Freq. tolerance (log₁₀)">
          <NumberInput value={tol} onChange={setTol} min={0} step={0.05} />
        </Field>
        <Field label="Max pairs">
          <NumberInput value={maxPairs} onChange={setMaxPairs} min={1} max={1000} />
        </Field>
        <Checkbox checked={exactLength} onChange={setExactLength} label="Same length" />
        <div className="ml-auto">
          <Button onClick={exportPairs} disabled={!result.pairs.length}>
            Export CSV
          </Button>
        </div>
      </div>

      <p className="mt-3 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
        {fmtInt(result.pairs.length)} pairs · pools: high {fmtInt(result.pool.high)} (≥ {v.fmt(result.thresholds.high)}), low{" "}
        {fmtInt(result.pool.low)} (≤ {v.fmt(result.thresholds.low)})
      </p>

      {result.pairs.length > 0 && (
        <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="text-left text-xs text-zinc-500 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">Mean</th>
                  <th className="py-2 pr-3 text-right font-medium">High</th>
                  <th className="py-2 pr-3 text-right font-medium">Low</th>
                  <th className="py-2 text-right font-medium" title="Standardised mean difference (pooled SD)">SMD</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.label} className="border-b border-zinc-100 dark:border-zinc-800/60">
                    <td className="py-1.5 pr-3">{g.label}</td>
                    <td className="py-1.5 pr-3 text-right">{g.high}</td>
                    <td className="py-1.5 pr-3 text-right">{g.low}</td>
                    <td className="py-1.5 text-right">{Number.isFinite(g.smd) ? fmtFix(g.smd, 2) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm tabular-nums">
              <thead className="sticky top-0 bg-white text-left text-xs text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 pr-3 font-medium">High</th>
                  <th className="py-2 pr-3 text-right font-medium">{v.label}</th>
                  <th className="py-2 pr-3 text-right font-medium">Freq</th>
                  <th className="py-2 pr-3 font-medium">Low</th>
                  <th className="py-2 pr-3 text-right font-medium">{v.label}</th>
                  <th className="py-2 text-right font-medium">Freq</th>
                </tr>
              </thead>
              <tbody>
                {result.pairs.map((p, i) => (
                  <tr key={p.low.id} className="border-b border-zinc-100 dark:border-zinc-800/60">
                    <td className="py-1.5 pr-3 text-zinc-500">{i + 1}</td>
                    <td className="py-1.5 pr-3 text-[15px]">{p.high.row.word}</td>
                    <td className="py-1.5 pr-3 text-right">{v.fmt(p.high.value)}</td>
                    <td className="py-1.5 pr-3 text-right">{fmtInt(p.high.freq)}</td>
                    <td className="py-1.5 pr-3 text-[15px]">{p.low.row.word}</td>
                    <td className="py-1.5 pr-3 text-right">{v.fmt(p.low.value)}</td>
                    <td className="py-1.5 text-right">{fmtInt(p.low.freq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
