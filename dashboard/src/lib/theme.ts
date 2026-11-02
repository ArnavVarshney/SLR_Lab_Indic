"use client";

import { useSyncExternalStore } from "react";

export interface ChartTheme {
  dark: boolean;
  text: string;
  muted: string;
  grid: string;
  axis: string;
  tooltipBg: string;
  tooltipBorder: string;
  series: [string, string, string, string];
  ramp: string[]; // sequential, low -> high
  empty: string;
}

const LIGHT: ChartTheme = {
  dark: false,
  text: "#3f3f46",
  muted: "#71717a",
  grid: "#e4e4e7",
  axis: "#a1a1aa",
  tooltipBg: "#ffffff",
  tooltipBorder: "#e4e4e7",
  series: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"],
  ramp: ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"],
  empty: "#f4f4f5",
};

const DARK: ChartTheme = {
  dark: true,
  text: "#d4d4d8",
  muted: "#a1a1aa",
  grid: "#27272a",
  axis: "#52525b",
  tooltipBg: "#18181b",
  tooltipBorder: "#3f3f46",
  series: ["#3987e5", "#d95926", "#199e70", "#c98500"],
  ramp: ["#0d366b", "#104281", "#184f95", "#1c5cab", "#2a78d6", "#5598e7", "#9ec5f4"],
  empty: "#27272a",
};

const query = "(prefers-color-scheme: dark)";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia(query);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

export function useChartTheme(): ChartTheme {
  const dark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
  return dark ? DARK : LIGHT;
}
