"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useSettings } from "@/lib/settings";
import type { Weighting } from "@/lib/types";
import { Segmented } from "./ui";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/aksharas", label: "Aksharas" },
  { href: "/transitions", label: "Transitions" },
  { href: "/segmentation", label: "Segmentation" },
  { href: "/words", label: "Words" },
  { href: "/methods", label: "Methods" },
  { href: "/about", label: "About" },
];

export function Sidebar() {
  const path = usePathname();
  const { weighting, setWeighting, minCount, setMinCount } = useSettings();
  return (
    <aside className="border-b border-zinc-200 bg-zinc-50 px-4 py-4 md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r dark:border-zinc-800 dark:bg-zinc-950">
      <Link href="/" className="block text-sm font-semibold tracking-tight">
        Kannada Akshara Corpus
      </Link>
      <nav className="no-scrollbar mt-3 flex gap-1 overflow-x-auto md:mt-6 md:flex-col">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm ${
                active
                  ? "bg-zinc-200 font-medium text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 flex flex-wrap items-end gap-4 md:mt-8 md:flex-col md:items-start">
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400">Weighting</div>
          <Segmented<Weighting>
            label="Weighting"
            value={weighting}
            onChange={setWeighting}
            options={[
              { value: "tok", label: "Token" },
              { value: "typ", label: "Type" },
            ]}
          />
          <p className="mt-1 hidden text-[11px] leading-snug text-zinc-500 md:block dark:text-zinc-400">
            Token = exposure in running text.
            <br />
            Type = each word counted once.
          </p>
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500 dark:text-zinc-400" title="Minimum context and target frequency for a transition probability to be shown as reliable">
            Min. count (TP)
          </div>
          <MinCountInput value={minCount} onCommit={setMinCount} />
        </div>
      </div>
    </aside>
  );
}

/** Free-text editing; commits only valid integers ≥ 1, reverts on blur otherwise. */
function MinCountInput({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const id = useId();
  const [draft, setDraft] = useState<{ for: number; text: string }>({ for: value, text: String(value) });
  const text = draft.for === value ? draft.text : String(value);
  return (
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={1}
      step={1}
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        const n = Number(t);
        if (t !== "" && Number.isInteger(n) && n >= 1) {
          onCommit(n);
          setDraft({ for: n, text: t });
        } else {
          setDraft({ for: value, text: t });
        }
      }}
      onBlur={() => setDraft({ for: value, text: String(value) })}
      className="h-8 w-20 rounded-md border border-zinc-200 bg-white px-2 text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-500"
    />
  );
}
