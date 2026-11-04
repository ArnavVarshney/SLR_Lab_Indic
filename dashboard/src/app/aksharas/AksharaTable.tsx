"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, ErrorNote, Field, Loading, Select, TextInput } from "@/components/ui";
import { useTable } from "@/lib/data";
import { fmtDec1, fmtFix, fmtInt, fmtPct } from "@/lib/format";
import { useSettings, WEIGHTING_LABEL } from "@/lib/settings";
import type { AksharaRow } from "@/lib/types";

const ALL = "__all";

export function AksharaTable() {
  const { data, error } = useTable("aksharas");
  const { weighting } = useSettings();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [structure, setStructure] = useState(ALL);
  const [cluster, setCluster] = useState(ALL);
  const [vowelKind, setVowelKind] = useState(ALL);

  const opts = useMemo(() => {
    const uniq = (k: keyof AksharaRow) => [...new Set((data ?? []).map((r) => String(r[k])))].sort();
    const mk = (vals: string[]) => [{ value: ALL, label: "All" }, ...vals.map((v) => ({ value: v, label: v }))];
    return { structure: mk(uniq("structure")), cluster: mk(uniq("cluster_type")), vowel: mk(uniq("vowel_kind")) };
  }, [data]);

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          (!q || r.akshara.includes(q.trim())) &&
          (structure === ALL || r.structure === structure) &&
          (cluster === ALL || r.cluster_type === cluster) &&
          (vowelKind === ALL || r.vowel_kind === vowelKind),
      ),
    [data, q, structure, cluster, vowelKind],
  );

  const columns = useMemo<Column<AksharaRow>[]>(() => {
    const share = (k: "initial" | "medial" | "final") => (r: AksharaRow) => r[k] / r.token_count;
    const H = weighting === "tok" ? "H_next_tok" : "H_next_typ";
    return [
      { key: "rank", header: "Rank", value: (r) => r.rank, width: 64, numeric: true },
      { key: "akshara", header: "Akshara", value: (r) => r.akshara, width: 84, kannada: true },
      { key: "structure", header: "Structure", value: (r) => r.structure, width: 96 },
      { key: "cluster_type", header: "Cluster", value: (r) => r.cluster_type, width: 120 },
      { key: "vowel_kind", header: "Vowel", value: (r) => r.vowel_kind, width: 96 },
      { key: "token_count", header: "Tokens", value: (r) => r.token_count, render: (r) => fmtInt(r.token_count), width: 88, numeric: true },
      { key: "per_million", header: "Per million", value: (r) => r.per_million, render: (r) => fmtDec1(r.per_million), width: 96, numeric: true },
      { key: "word_types", header: "Word types", value: (r) => r.word_types, render: (r) => fmtInt(r.word_types), width: 96, numeric: true, title: "Number of word types containing the akshara" },
      { key: "initial_share", header: "Initial", value: share("initial"), render: (r) => fmtPct(share("initial")(r)), width: 72, numeric: true, title: "Share of occurrences in word-initial position" },
      { key: "medial_share", header: "Medial", value: share("medial"), render: (r) => fmtPct(share("medial")(r)), width: 72, numeric: true },
      { key: "final_share", header: "Final", value: share("final"), render: (r) => fmtPct(share("final")(r)), width: 72, numeric: true },
      { key: H, header: `H next (${WEIGHTING_LABEL[weighting].toLowerCase()})`, value: (r) => r[H], render: (r) => fmtFix(r[H], 2), width: 128, numeric: true, title: "Conditional entropy of the next akshara (bits), word end counted as an outcome" },
      { key: "P_end_tok", header: "P(end)", value: (r) => r.P_end_tok, render: (r) => fmtFix(r.P_end_tok, 3), width: 72, numeric: true, title: "Probability that the akshara ends a word (token)" },
      { key: "n_successors", header: "Successors", value: (r) => r.n_successors, width: 92, numeric: true, title: "Distinct following aksharas incl. word end" },
      { key: "visual_components", header: "Components", value: (r) => r.visual_components, width: 96, numeric: true, title: "Graphic components: consonants, vowel letter/sign, virama, anusvara/visarga" },
    ];
  }, [weighting]);

  return (
    <Card title="Inventory" caption="Click a row to open its transitions.">
      {error ? (
        <ErrorNote message={error} />
      ) : !data ? (
        <Loading />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(r) => r.akshara}
          initialSort={{ key: "rank", desc: false }}
          exportName="aksharas"
          onRowClick={(r) => router.push(`/transitions?a=${encodeURIComponent(r.akshara)}`)}
          toolbar={
            <>
              <Field label="Contains">
                <TextInput value={q} onChange={setQ} placeholder="e.g. ಕ್" width="w-28" />
              </Field>
              <Field label="Structure">
                <Select value={structure} onChange={setStructure} options={opts.structure} />
              </Field>
              <Field label="Cluster">
                <Select value={cluster} onChange={setCluster} options={opts.cluster} />
              </Field>
              <Field label="Vowel">
                <Select value={vowelKind} onChange={setVowelKind} options={opts.vowel} />
              </Field>
            </>
          }
        />
      )}
    </Card>
  );
}
