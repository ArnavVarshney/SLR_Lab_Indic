"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, Field, Segmented, Select, TextInput } from "@/components/ui";
import { BASE_CLASS_LABEL, unitLabel, VIRAMA, vowelLabel, type Composition, type SkeletonRow } from "@/lib/composition";
import { fmtInt, fmtPct } from "@/lib/format";
import { useSettings } from "@/lib/settings";
import type { BaseClass } from "@/lib/types";

const ALL = "__all";
type Values = "share" | "count";

export function SkeletonTable({ comp }: { comp: Composition }) {
  const { weighting } = useSettings();
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<BaseClass | typeof ALL>(ALL);
  const [values, setValues] = useState<Values>("share");

  const rows = useMemo(
    () => comp.skeletons.filter((s) => (!q.trim() || s.skeleton.includes(q.trim())) && (cls === ALL || s.cls === cls)),
    [comp, q, cls],
  );

  const columns = useMemo<Column<SkeletonRow>[]>(() => {
    const nVowels = comp.vowels.filter((v) => v !== VIRAMA).length;
    const unit = unitLabel(weighting);
    return [
      { key: "skeleton", header: "Skeleton", value: (s) => s.skeleton, width: 84, kannada: true },
      { key: "class", header: "Class", value: (s) => BASE_CLASS_LABEL[s.cls], width: 140 },
      { key: "total", header: unit[0].toUpperCase() + unit.slice(1), value: (s) => s.total, render: (s) => fmtInt(s.total), width: 96, numeric: true },
      { key: "variants", header: "Variants", value: (s) => s.variants, width: 80, numeric: true, title: "Akshara types with this skeleton" },
      {
        key: "attested",
        header: "Vowels",
        value: (s) => s.attested,
        render: (s) => `${s.attested} / ${nVowels}`,
        width: 76,
        numeric: true,
        title: "Vowel columns attested (ಅ and vowel signs; ◌್ excluded)",
      },
      ...comp.vowels.map<Column<SkeletonRow>>((v, j) => ({
        key: vowelLabel(v),
        header: vowelLabel(v),
        value: (s) => (values === "share" ? (s.total ? s.values[j] / s.total : 0) : s.values[j]),
        render: (s) =>
          s.values[j] === 0 ? <span className="text-zinc-300 dark:text-zinc-600">–</span> : values === "share" ? fmtPct(s.values[j] / s.total) : fmtInt(s.values[j]),
        width: 64,
        numeric: true,
      })),
    ];
  }, [comp, weighting, values]);

  return (
    <Card
      title="Skeletons"
      caption={`All ${fmtInt(comp.skeletons.length)} consonant skeletons with ${values === "share" ? "row shares" : `${unitLabel(weighting)}`} per vowel sign. – = unattested.`}
    >
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(s) => s.skeleton}
        initialSort={{ key: "total", desc: true }}
        exportName={`composition_${values}_${weighting}`}
        height={420}
        toolbar={
          <>
            <Field label="Contains">
              <TextInput value={q} onChange={setQ} placeholder="e.g. ರ" width="w-28" />
            </Field>
            <Field label="Class">
              <Select<BaseClass | typeof ALL>
                value={cls}
                onChange={setCls}
                options={[{ value: ALL, label: "All" }, ...(Object.keys(BASE_CLASS_LABEL) as BaseClass[]).map((c) => ({ value: c, label: BASE_CLASS_LABEL[c] }))]}
              />
            </Field>
            <div className="flex flex-col gap-1 text-xs text-zinc-500 dark:text-zinc-400">
              Values
              <Segmented<Values>
                label="Values"
                value={values}
                onChange={setValues}
                options={[
                  { value: "share", label: "Row share" },
                  { value: "count", label: "Count" },
                ]}
              />
            </div>
          </>
        }
      />
    </Card>
  );
}
