"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Weighting } from "./types";

interface Settings {
  weighting: Weighting;
  setWeighting: (w: Weighting) => void;
  minCount: number; // reliability threshold for context/target frequencies
  setMinCount: (n: number) => void;
}

const Ctx = createContext<Settings | null>(null);

export function SettingsProvider({ children, defaultMinCount }: { children: ReactNode; defaultMinCount: number }) {
  const [weighting, setWeighting] = useState<Weighting>("tok");
  const [minCount, setMinCount] = useState(defaultMinCount);
  const value = useMemo(() => ({ weighting, setWeighting, minCount, setMinCount }), [weighting, minCount]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const s = useContext(Ctx);
  if (!s) throw new Error("useSettings outside SettingsProvider");
  return s;
}

export const WEIGHTING_LABEL: Record<Weighting, string> = { tok: "Token", typ: "Type" };
