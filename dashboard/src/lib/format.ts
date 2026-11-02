const intFmt = new Intl.NumberFormat("en-US");

export const fmtInt = (v: number | null | undefined) => (v == null ? "–" : intFmt.format(v));

/** Fixed decimals; null-safe. */
export const fmtFix = (v: number | null | undefined, d = 3) => (v == null ? "–" : v.toFixed(d));

/** Probabilities: 3 significant digits, scientific below 1e-3. */
export const fmtProb = (v: number | null | undefined) => {
  if (v == null) return "–";
  if (v === 0) return "0";
  if (v === 1) return "1";
  return Math.abs(v) < 1e-3 ? v.toExponential(2) : v.toPrecision(3);
};

export const fmtPct = (v: number | null | undefined, d = 1) => (v == null ? "–" : `${(v * 100).toFixed(d)}%`);

const dec1 = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
export const fmtDec1 = (v: number | null | undefined) => (v == null ? "–" : dec1.format(v));

/** Compact axis ticks: 1.2K, 3.4M. */
export const fmtCompact = (v: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
