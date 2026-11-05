"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { axis, base, EChart, type ClickParams } from "@/components/EChart";
import { Card, Checkbox, ErrorNote, Field, Loading, Segmented, Stat, TextInput } from "@/components/ui";
import { useTable } from "@/lib/data";
import { fmtFix, fmtInt, fmtProb } from "@/lib/format";
import { useSettings, WEIGHTING_LABEL } from "@/lib/settings";
import { useChartTheme, type ChartTheme } from "@/lib/theme";
import type { AksharaRow, BigramRow, TrigramRow, Weighting } from "@/lib/types";

const BOUNDARY = "#";
const TOP_N = 15;
type Tab = "bigrams" | "trigrams" | "entropy";

export function TransitionsView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { weighting: w, minCount } = useSettings();
  const theme = useChartTheme();
  const bigrams = useTable("bigrams");
  const aksharas = useTable("aksharas");
  const [tab, setTab] = useState<Tab>("bigrams");

  const selected = params.get("a") || "ದ";
  // draft text belongs to the current selection; resets when the URL changes (back/forward, clicks)
  const [draftState, setDraftState] = useState({ for: selected, text: selected });
  const draft = draftState.for === selected ? draftState.text : selected;
  const setDraft = (text: string) => setDraftState({ for: selected, text });

  const akMap = useMemo(() => new Map((aksharas.data ?? []).map((r) => [r.akshara, r])), [aksharas.data]);
  const valid = useCallback((a: string) => a === BOUNDARY || akMap.has(a), [akMap]);

  const select = useCallback(
    (a: string) => {
      setDraftState({ for: a, text: a });
      router.replace(`${pathname}?a=${encodeURIComponent(a)}`, { scroll: false });
    },
    [router, pathname],
  );

  if (bigrams.error || aksharas.error) return <ErrorNote message={(bigrams.error || aksharas.error)!} />;
  if (!bigrams.data || !aksharas.data) return <Loading height={400} />;

  const row = akMap.get(selected);
  const known = valid(selected);
  const draftInvalid = draft.trim() !== "" && !valid(draft.trim());
  const quick = [BOUNDARY, ...aksharas.data.slice(0, 15).map((r) => r.akshara)];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Akshara">
            <TextInput
              value={draft}
              list="akshara-list"
              width="w-28"
              onChange={(v) => {
                setDraft(v);
                const t = v.trim();
                if (t && t !== selected && valid(t)) select(t);
              }}
            />
          </Field>
          <datalist id="akshara-list">
            <option value={BOUNDARY}>word boundary</option>
            {aksharas.data.map((r) => (
              <option key={r.akshara} value={r.akshara} />
            ))}
          </datalist>
          <div className="flex flex-wrap items-center gap-1 pb-0.5" aria-label="Frequent aksharas">
            {quick.map((a) => (
              <button
                key={a}
                type="button"
                lang="kn"
                onClick={() => select(a)}
                title={a === BOUNDARY ? "Word boundary (word-initial distribution)" : undefined}
                className={`h-8 min-w-8 rounded-md border px-2 text-[15px] ${
                  a === selected
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
        {(draftInvalid || !known) && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            “{draftInvalid ? draft.trim() : selected}” is not an akshara in the corpus.
          </p>
        )}
        {row && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Tokens" value={fmtInt(row.token_count)} sub={`rank ${row.rank}`} />
            <Stat label="Word types" value={fmtInt(row.word_types)} />
            <Stat label="Structure" value={row.structure} sub={row.cluster_type === "none" ? row.vowel_kind : row.cluster_type} />
            <Stat label="H(next)" value={`${fmtFix(w === "tok" ? row.H_next_tok : row.H_next_typ, 2)} bits`} sub={WEIGHTING_LABEL[w].toLowerCase()} />
            <Stat label="P(word end)" value={fmtFix(row.P_end_tok, 3)} sub="token" />
            <Stat label="Successors" value={fmtInt(row.n_successors)} sub="distinct, incl. #" />
          </div>
        )}
      </Card>

      {known && <NeighbourCharts bigrams={bigrams.data} a={selected} w={w} minCount={minCount} theme={theme} onSelect={select} valid={valid} />}

      <Card
        actions={
          <Segmented<Tab>
            label="Table"
            value={tab}
            onChange={setTab}
            options={[
              { value: "bigrams", label: "Bigrams" },
              { value: "trigrams", label: "Trigrams" },
              { value: "entropy", label: "Entropy" },
            ]}
          />
        }
        title={tab === "bigrams" ? "Bigrams" : tab === "trigrams" ? "Trigrams" : "Next-akshara entropy"}
        caption={
          tab === "bigrams"
            ? "PMI = log₂ P(A,B) / P(A)P(B). Unreliable: count(A) or count(B) below the minimum count."
            : tab === "trigrams"
              ? "Second-order TP P(C | A,B). Unreliable: count(A,B) below the minimum count."
              : "H(next | A) against frequency of A. Click a point to select it."
        }
      >
        {tab === "bigrams" && <BigramTable rows={bigrams.data} w={w} minCount={minCount} />}
        {tab === "trigrams" && <TrigramTable w={w} minCount={minCount} />}
        {tab === "entropy" && <EntropyScatter aksharas={aksharas.data} w={w} theme={theme} onSelect={select} />}
      </Card>
    </div>
  );
}

function barOption(theme: ChartTheme, labels: string[], values: number[], counts: number[], color: string, tpLabel: string) {
  // reversed so the highest bar is on top
  return {
    ...base(theme),
    grid: { left: 56, right: 48, top: 4, bottom: 24 },
    tooltip: {
      ...base(theme).tooltip,
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (ps: { dataIndex: number }[]) => {
        const i = ps[0].dataIndex;
        return `<span style="font-size:15px">${labels[i]}</span><br/>${tpLabel} = ${fmtProb(values[i])}<br/>count = ${fmtInt(counts[i])}`;
      },
    },
    xAxis: { type: "value", max: (v: { max: number }) => Math.min(1, Math.ceil(v.max * 10) / 10), ...axis(theme) },
    yAxis: { type: "category", data: labels, ...axis(theme, { axisLabel: { color: theme.text, fontSize: 14 } }) },
    series: [
      {
        type: "bar",
        data: values,
        barMaxWidth: 12,
        itemStyle: { color, borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: "right", color: theme.muted, fontSize: 11, formatter: (p: { value: number }) => fmtProb(p.value) },
      },
    ],
  };
}

function NeighbourCharts({
  bigrams,
  a,
  w,
  minCount,
  theme,
  onSelect,
  valid,
}: {
  bigrams: BigramRow[];
  a: string;
  w: Weighting;
  minCount: number;
  theme: ChartTheme;
  onSelect: (a: string) => void;
  valid: (a: string) => boolean;
}) {
  const { succ, pred, ctx, tgt } = useMemo(() => {
    const fwd = `fwd_${w}` as const;
    const bwd = `bwd_${w}` as const;
    const succ = bigrams.filter((r) => r.A === a).sort((x, y) => y[fwd] - x[fwd]).slice(0, TOP_N).reverse();
    const pred = bigrams.filter((r) => r.B === a).sort((x, y) => y[bwd] - x[bwd]).slice(0, TOP_N).reverse();
    const ctx = succ.length ? succ[0][`ctx_${w}`] : 0;
    const tgt = pred.length ? pred[0][`tgt_${w}`] : 0;
    return { succ, pred, ctx, tgt };
  }, [bigrams, a, w]);

  const succOpt = useMemo(
    () => barOption(theme, succ.map((r) => r.B), succ.map((r) => r[`fwd_${w}`]), succ.map((r) => r[`count_${w}`]), theme.series[0], "P(B|A)"),
    [theme, succ, w],
  );
  const predOpt = useMemo(
    () => barOption(theme, pred.map((r) => r.A), pred.map((r) => r[`bwd_${w}`]), pred.map((r) => r[`count_${w}`]), theme.series[1], "P(A|B)"),
    [theme, pred, w],
  );

  const click = (labels: string[]) => (p: ClickParams) => {
    const v = p.dataIndex != null ? labels[p.dataIndex] : p.name;
    if (v && v !== BOUNDARY && valid(v)) onSelect(v);
  };
  const warn = (n: number) =>
    n < minCount ? <span className="text-amber-700 dark:text-amber-400"> · below minimum count ({fmtInt(n)})</span> : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card
        title={`Successors of ${a}`}
        caption={<>Top {TOP_N} by forward TP P(B | {a}), {WEIGHTING_LABEL[w].toLowerCase()}. Context count {fmtInt(ctx)}{warn(ctx)}. Click a bar to select it.</>}
      >
        {succ.length ? (
          <EChart option={succOpt} height={Math.max(120, succ.length * 22 + 30)} label={`Successors of ${a}`} onClick={click(succ.map((r) => r.B))} />
        ) : (
          <p className="text-sm text-zinc-500">None.</p>
        )}
      </Card>
      <Card
        title={`Predecessors of ${a}`}
        caption={<>Top {TOP_N} by backward TP P(A | {a}), {WEIGHTING_LABEL[w].toLowerCase()}. Target count {fmtInt(tgt)}{warn(tgt)}. Click a bar to select it.</>}
      >
        {pred.length ? (
          <EChart option={predOpt} height={Math.max(120, pred.length * 22 + 30)} label={`Predecessors of ${a}`} onClick={click(pred.map((r) => r.A))} />
        ) : (
          <p className="text-sm text-zinc-500">None.</p>
        )}
      </Card>
    </div>
  );
}

function BigramTable({ rows, w, minCount }: { rows: BigramRow[]; w: Weighting; minCount: number }) {
  const [A, setA] = useState("");
  const [B, setB] = useState("");
  const [hide, setHide] = useState(true);
  const filtered = useMemo(() => {
    const a = A.trim();
    const b = B.trim();
    return rows.filter(
      (r) =>
        (!a || r.A === a) &&
        (!b || r.B === b) &&
        (!hide || (r[`ctx_${w}`] >= minCount && r[`tgt_${w}`] >= minCount)),
    );
  }, [rows, A, B, hide, w, minCount]);
  const columns = useMemo<Column<BigramRow>[]>(
    () => [
      { key: "A", header: "A", value: (r) => r.A, width: 72, kannada: true },
      { key: "B", header: "B", value: (r) => r.B, width: 72, kannada: true },
      { key: `count_${w}`, header: "Count", value: (r) => r[`count_${w}`], render: (r) => fmtInt(r[`count_${w}`]), width: 88, numeric: true },
      { key: `fwd_${w}`, header: "P(B|A)", value: (r) => r[`fwd_${w}`], render: (r) => fmtProb(r[`fwd_${w}`]), width: 88, numeric: true, title: "Forward transition probability" },
      { key: `bwd_${w}`, header: "P(A|B)", value: (r) => r[`bwd_${w}`], render: (r) => fmtProb(r[`bwd_${w}`]), width: 88, numeric: true, title: "Backward transition probability" },
      { key: `pmi_${w}`, header: "PMI", value: (r) => r[`pmi_${w}`], render: (r) => fmtFix(r[`pmi_${w}`], 2), width: 72, numeric: true, title: "Pointwise mutual information (bits)" },
      { key: `ctx_${w}`, header: "Count A", value: (r) => r[`ctx_${w}`], render: (r) => fmtInt(r[`ctx_${w}`]), width: 96, numeric: true, title: "Frequency of A as context" },
      { key: `tgt_${w}`, header: "Count B", value: (r) => r[`tgt_${w}`], render: (r) => fmtInt(r[`tgt_${w}`]), width: 96, numeric: true, title: "Frequency of B as target" },
    ],
    [w],
  );
  return (
    <DataTable
      rows={filtered}
      columns={columns}
      rowKey={(r) => `${r.A}\u0000${r.B}`}
      initialSort={{ key: `count_${w}`, desc: true }}
      exportName={`bigrams_${w}`}
      toolbar={
        <>
          <Field label="A">
            <TextInput value={A} onChange={setA} placeholder="any" width="w-20" />
          </Field>
          <Field label="B">
            <TextInput value={B} onChange={setB} placeholder="any" width="w-20" />
          </Field>
          <Checkbox checked={hide} onChange={setHide} label="Hide unreliable" />
        </>
      }
    />
  );
}

function TrigramTable({ w, minCount }: { w: Weighting; minCount: number }) {
  const { data, error } = useTable("trigrams");
  const [A, setA] = useState("");
  const [B, setB] = useState("");
  const [C, setC] = useState("");
  const [hide, setHide] = useState(true);
  const filtered = useMemo(() => {
    const [a, b, c] = [A.trim(), B.trim(), C.trim()];
    return (data ?? []).filter(
      (r) => (!a || r.A === a) && (!b || r.B === b) && (!c || r.C === c) && (!hide || r[`ctx_${w}`] >= minCount),
    );
  }, [data, A, B, C, hide, w, minCount]);
  const columns = useMemo<Column<TrigramRow>[]>(
    () => [
      { key: "A", header: "A", value: (r) => r.A, width: 72, kannada: true },
      { key: "B", header: "B", value: (r) => r.B, width: 72, kannada: true },
      { key: "C", header: "C", value: (r) => r.C, width: 72, kannada: true },
      { key: `count_${w}`, header: "Count", value: (r) => r[`count_${w}`], render: (r) => fmtInt(r[`count_${w}`]), width: 88, numeric: true },
      { key: `p_${w}`, header: "P(C|A,B)", value: (r) => r[`p_${w}`], render: (r) => fmtProb(r[`p_${w}`]), width: 96, numeric: true },
      { key: `ctx_${w}`, header: "Count A,B", value: (r) => r[`ctx_${w}`], render: (r) => fmtInt(r[`ctx_${w}`]), width: 100, numeric: true },
    ],
    [w],
  );
  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading />;
  return (
    <DataTable
      rows={filtered}
      columns={columns}
      rowKey={(r) => `${r.A}\u0000${r.B}\u0000${r.C}`}
      initialSort={{ key: `count_${w}`, desc: true }}
      exportName={`trigrams_${w}`}
      toolbar={
        <>
          <Field label="A">
            <TextInput value={A} onChange={setA} placeholder="any" width="w-20" />
          </Field>
          <Field label="B">
            <TextInput value={B} onChange={setB} placeholder="any" width="w-20" />
          </Field>
          <Field label="C">
            <TextInput value={C} onChange={setC} placeholder="any" width="w-20" />
          </Field>
          <Checkbox checked={hide} onChange={setHide} label="Hide unreliable" />
        </>
      }
    />
  );
}

function EntropyScatter({
  aksharas,
  w,
  theme,
  onSelect,
}: {
  aksharas: AksharaRow[];
  w: Weighting;
  theme: ChartTheme;
  onSelect: (a: string) => void;
}) {
  const H = w === "tok" ? "H_next_tok" : "H_next_typ";
  const option = useMemo(
    () => ({
      ...base(theme),
      grid: { left: 48, right: 16, top: 12, bottom: 40 },
      tooltip: {
        ...base(theme).tooltip,
        formatter: (p: { data: [number, number, string] }) =>
          `<span style="font-size:15px">${p.data[2]}</span><br/>tokens = ${fmtInt(p.data[0])}<br/>H = ${fmtFix(p.data[1], 2)} bits`,
      },
      xAxis: { type: "log", name: "Akshara token count", nameLocation: "middle", nameGap: 26, min: 1, ...axis(theme) },
      yAxis: { type: "value", name: "bits", ...axis(theme) },
      series: [
        {
          type: "scatter",
          symbolSize: 6,
          itemStyle: { color: theme.series[0], opacity: 0.6 },
          data: aksharas.map((r) => [r.token_count, r[H], r.akshara]),
        },
      ],
    }),
    [theme, aksharas, H],
  );
  return (
    <EChart
      option={option}
      height={380}
      label="Next-akshara entropy against frequency"
      onClick={(p) => {
        const d = p.data as [number, number, string] | undefined;
        if (d) onSelect(d[2]);
      }}
    />
  );
}
