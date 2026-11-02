import summaryJson from "@data/summary.json";
import type { Summary } from "./types";

/** Small, build-time data (≈10 KB); large tables are fetched client-side. */
export const summary = summaryJson as unknown as Summary;
