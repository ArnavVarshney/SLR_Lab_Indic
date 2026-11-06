"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, Checkbox, ErrorNote, Field, Loading, NumberInput, TextInput } from "@/components/ui";
import { useTable } from "@/lib/data";
import { fmtFix, fmtInt, fmtProb } from "@/lib/format";
import { useSettings, WEIGHTING_LABEL } from "@/lib/settings";
import type { WordRow } from "@/lib/types";
import { MatchedSets } from "./MatchedSets";

interface Filters {
  contains: string;
  lenMin: number | null;
  lenMax: number | null;
  freqMin: number | null;
  freqMax: number | null;
  maxConjunct: number | null;
  maxCoda: number | null;
  noDead: boolean;
}

const INITIAL: Filters = {
  contains: "",
  lenMin: null,
  lenMax: null,
  freqMin: null,
  freqMax: null,
  maxConjunct: null,
  maxCoda: null,
  noDead: false,
};

function applyFilters(rows: WordRow[], f: Filters): WordRow[] {
  const c = f.contains.trim();
  return rows.filter(
    (r) =>
      (!c || r.word.includes(c)) &&
      (f.lenMin == null || r.n_aksharas >= f.lenMin) &&
      (f.lenMax == null || r.n_aksharas <= f.lenMax) &&
      (f.freqMin == null || r.freq >= f.freqMin) &&
      (f.freqMax == null || r.freq <= f.freqMax) &&
      (f.maxConjunct == null || r.n_conjunct <= f.maxConjunct) &&
      (f.maxCoda == null || r.n_coda <= f.maxCoda) &&
      (!f.noDead || !r.structure.includes("(dead)")),
  );
}

export function WordsView() {
  const { data, error } = useTable("words");
  const { weighting: w } = useSettings();
  const [f, setF] = useState<Filters>(INITIAL);
  const deferred = useDeferredValue(f);
  const set = <K extends keyof Filters>(k: K) => (v: Filters[K]) => setF((s) => ({ ...s, [k]: v }));

  const rows = useMemo(() => (data ? applyFilters(data, deferred) : []), [data, deferred]);

  const columns = useMemo<Column<WordRow>[]>(() => {
    const mean = `mean_tp_${w}` as const;
    const min = `min_tp_${w}` as const;
    const wl = WEIGHTING_LABEL[w].toLowerCase();
    return [
      { key: "word", header: "Word", value: (r) => r.word, width: 150, kannada: true },
      { key: "aksharas", header: "Aksharas", value: (r) => r.aksharas, render: (r) => r.aksharas.split("|").join(" · "), width: 180, kannada: true },
      { key: "freq", header: "Freq", value: (r) => r.freq, render: (r) => fmtInt(r.freq), width: 72, numeric: true },
      { key: "zipf", header: "Zipf", value: (r) => r.zipf, render: (r) => fmtFix(r.zipf, 2), width: 64, numeric: true, title: "log10(frequency per billion words)" },
      { key: "n_aksharas", header: "Length", value: (r) => r.n_aksharas, width: 68, numeric: true, title: "Length in aksharas" },
      { key: "structure", header: "Structure", value: (r) => r.structure, width: 170 },
      { key: "n_conjunct", header: "Conj.", value: (r) => r.n_conjunct, width: 60, numeric: true, title: "Conjunct aksharas (≥2 consonants)" },
      { key: "n_geminate", header: "Gem.", value: (r) => r.n_geminate, width: 60, numeric: true, title: "Geminate clusters" },
      { key: "n_non_geminate", header: "Non-gem.", value: (r) => r.n_non_geminate, width: 80, numeric: true, title: "Non-geminate clusters" },
      { key: "n_coda", header: "Anus./vis.", value: (r) => r.n_coda, width: 84, numeric: true, title: "Aksharas with anusvara or visarga" },
      { key: "visual_components", header: "Comp.", value: (r) => r.visual_components, width: 64, numeric: true, title: "Graphic components summed over aksharas" },
      { key: mean, header: `Mean TP (${wl})`, value: (r) => r[mean], render: (r) => fmtProb(r[mean]), width: 112, numeric: true, title: "Mean within-word forward TP (internal transitions)" },
      { key: min, header: `Min TP (${wl})`, value: (r) => r[min], render: (r) => fmtProb(r[min]), width: 104, numeric: true, title: "Minimum within-word forward TP (internal transitions)" },
      { key: "log2p_tok", header: "log₂ P", value: (r) => r.log2p_tok, render: (r) => fmtFix(r.log2p_tok, 2), width: 72, numeric: true, title: "Bigram-model log probability incl. boundaries (token)" },
      { key: "neighbours", header: "N", value: (r) => r.neighbours, width: 56, numeric: true, title: "Akshara-level orthographic neighbours (one substitution)" },
    ];
  }, [w]);

  if (error) return <ErrorNote message={error} />;
  if (!data) return <Loading height={400} />;

  return (
    <div className="space-y-4">
      <Card title="Filters">
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Contains">
            <TextInput value={f.contains} onChange={set("contains")} placeholder="ಕ್ಕ" width="w-28" />
          </Field>
          <Field label="Length min">
            <NumberInput value={f.lenMin} onChange={set("lenMin")} min={1} />
          </Field>
          <Field label="Length max">
            <NumberInput value={f.lenMax} onChange={set("lenMax")} min={1} />
          </Field>
          <Field label="Freq min">
            <NumberInput value={f.freqMin} onChange={set("freqMin")} min={1} />
          </Field>
          <Field label="Freq max">
            <NumberInput value={f.freqMax} onChange={set("freqMax")} min={1} />
          </Field>
          <Field label="Max conjuncts">
            <NumberInput value={f.maxConjunct} onChange={set("maxConjunct")} min={0} />
          </Field>
          <Field label="Max anus./vis.">
            <NumberInput value={f.maxCoda} onChange={set("maxCoda")} min={0} />
          </Field>
          <Checkbox checked={f.noDead} onChange={set("noDead")} label="Exclude dead consonants" />
          <button
            type="button"
            onClick={() => setF(INITIAL)}
            className="h-8 text-xs text-zinc-500 underline-offset-2 hover:underline dark:text-zinc-400"
          >
            Reset
          </button>
        </div>
      </Card>
      <Card title="Word types">
        <DataTable rows={rows} columns={columns} rowKey={(r) => r.aksharas} initialSort={{ key: "freq", desc: true }} exportName="words" height={520} />
      </Card>
      <MatchedSets rows={rows} />
    </div>
  );
}
