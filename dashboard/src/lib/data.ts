"use client";

import { useEffect, useState } from "react";
import type { AksharaRow, BigramRow, ColumnarTable, TrigramRow, WordRow } from "./types";

export function fromColumnar<T>(t: ColumnarTable): T[] {
  const { columns, rows } = t;
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    for (let i = 0; i < columns.length; i++) o[columns[i]] = r[i];
    return o as T;
  });
}

interface TableMap {
  aksharas: AksharaRow;
  bigrams: BigramRow;
  trigrams: TrigramRow;
  words: WordRow;
}
type TableName = keyof TableMap;

const transforms: { [K in TableName]?: (rows: TableMap[K][]) => TableMap[K][] } = {
  words: (rows) => {
    for (const r of rows) r.word = r.aksharas.split("|").join("");
    return rows;
  },
};

// one request per table per page load, shared by all components
const cache = new Map<TableName, Promise<unknown[]>>();

export function loadTable<K extends TableName>(name: K): Promise<TableMap[K][]> {
  let p = cache.get(name);
  if (!p) {
    p = fetch(`/data/${name}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`);
        return r.json() as Promise<ColumnarTable>;
      })
      .then((t) => {
        const rows = fromColumnar<TableMap[K]>(t);
        const f = transforms[name] as ((rows: TableMap[K][]) => TableMap[K][]) | undefined;
        return f ? f(rows) : rows;
      });
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p as Promise<TableMap[K][]>;
}

export function useTable<K extends TableName>(name: K) {
  const [state, setState] = useState<{ data: TableMap[K][] | null; error: string | null }>({
    data: null,
    error: null,
  });
  useEffect(() => {
    let live = true;
    loadTable(name).then(
      (data) => live && setState({ data, error: null }),
      (e: unknown) => live && setState({ data: null, error: String(e) }),
    );
    return () => {
      live = false;
    };
  }, [name]);
  return state;
}
