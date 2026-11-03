"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { downloadCsv } from "@/lib/csv";
import { fmtInt } from "@/lib/format";
import { Button } from "./ui";

export interface Column<T> {
  key: string;
  header: string;
  value: (r: T) => number | string | null;
  /** display; defaults to String(value) */
  render?: (r: T) => ReactNode;
  width: number; // px
  numeric?: boolean;
  kannada?: boolean;
  title?: string; // header tooltip (definition)
}

const ROW_H = 30;

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  initialSort,
  height = 480,
  exportName,
  onRowClick,
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (r: T) => string;
  initialSort?: { key: string; desc: boolean };
  height?: number;
  exportName?: string;
  onRowClick?: (r: T) => void;
  toolbar?: ReactNode;
}) {
  const [sort, setSort] = useState(initialSort ?? null);
  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.key === sort.key);
    if (!col || !sort) return rows;
    const dir = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      const x = col.value(a);
      const y = col.value(b);
      if (x == null) return y == null ? 0 : 1; // nulls last
      if (y == null) return -1;
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }, [rows, columns, sort]);

  const scroller = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- virtualizer is not memoised by the compiler; fine here
  const v = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => ROW_H,
    overscan: 15,
  });

  const template = columns.map((c) => `${c.width}px`).join(" ");
  const minWidth = columns.reduce((t, c) => t + c.width, 0);

  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-wrap items-end gap-3">{toolbar}</div>
        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{fmtInt(sorted.length)} rows</span>
          {exportName && (
            <Button
              onClick={() =>
                downloadCsv(`${exportName}.csv`, sorted, columns.map((c) => ({ header: c.key, value: c.value })))
              }
              disabled={sorted.length === 0}
            >
              Export CSV
            </Button>
          )}
        </div>
      </div>
      <div
        ref={scroller}
        style={{ height }}
        className="overflow-auto rounded-md border border-zinc-200 text-sm dark:border-zinc-800"
      >
        <div style={{ minWidth }}>
          <div
            role="row"
            style={{ gridTemplateColumns: template }}
            className="sticky top-0 z-10 grid border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
          >
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  title={c.title}
                  onClick={() => setSort({ key: c.key, desc: active ? !sort!.desc : !!c.numeric })}
                  className={`truncate px-2 py-2 hover:text-zinc-900 dark:hover:text-white ${c.numeric ? "text-right" : "text-left"}`}
                >
                  {c.header}
                  {active ? (sort!.desc ? " ↓" : " ↑") : ""}
                </button>
              );
            })}
          </div>
          <div style={{ height: v.getTotalSize(), position: "relative" }}>
            {v.getVirtualItems().map((vi) => {
              const r = sorted[vi.index];
              return (
                <div
                  key={rowKey(r)}
                  role="row"
                  onClick={onRowClick ? () => onRowClick(r) : undefined}
                  style={{ gridTemplateColumns: template, height: ROW_H, transform: `translateY(${vi.start}px)` }}
                  className={`absolute left-0 top-0 grid w-full items-center border-b border-zinc-100 dark:border-zinc-800/60 ${
                    onRowClick ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50" : ""
                  }`}
                >
                  {columns.map((c) => (
                    <div
                      key={c.key}
                      lang={c.kannada ? "kn" : undefined}
                      className={`truncate px-2 ${c.numeric ? "text-right tabular-nums" : ""} ${c.kannada ? "text-[15px]" : ""}`}
                    >
                      {c.render ? c.render(r) : (c.value(r) ?? "–")}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {sorted.length === 0 && <p className="p-4 text-sm text-zinc-500">No rows match the filters.</p>}
        </div>
      </div>
    </div>
  );
}
