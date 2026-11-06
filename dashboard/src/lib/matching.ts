import { quantile } from "./stats";

export interface MatchItem {
  id: string;
  value: number; // variable that defines the high / low groups
  freq: number; // matched on log10 frequency
  length: number; // optionally matched exactly
}

export interface MatchOptions {
  q: number; // high = top q, low = bottom q (0 < q <= 0.5)
  logFreqTolerance: number; // max |log10 f_high − log10 f_low|
  exactLength: boolean;
  maxPairs: number;
}

export interface MatchResult<T extends MatchItem> {
  pairs: { high: T; low: T; logFreqDiff: number }[];
  thresholds: { low: number; high: number };
  pool: { high: number; low: number };
}

/** First index in `a` (sorted ascending by lf) with lf >= x. */
function lowerBound(a: { lf: number }[], x: number): number {
  let lo = 0;
  let hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid].lf < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Frequency- (and optionally length-) matched pairs from the extreme quantiles
 * of `value`. Greedy nearest-neighbour without replacement: low-group items are
 * processed in descending frequency; each takes the unused high-group item with
 * the smallest log-frequency distance within tolerance (ties → higher value,
 * then id). Deterministic for a given input.
 */
export function matchExtremes<T extends MatchItem>(items: T[], opt: MatchOptions): MatchResult<T> {
  if (!(opt.q > 0 && opt.q <= 0.5)) throw new Error("q must be in (0, 0.5]");
  const valid = items.filter((d) => Number.isFinite(d.value) && d.freq > 0);
  const vals = valid.map((d) => d.value);
  const loT = quantile(vals, opt.q);
  const hiT = quantile(vals, 1 - opt.q);
  // strict split so no item can be in both groups when the quantiles coincide
  const high = valid.filter((d) => d.value >= hiT && d.value > loT);
  const low = valid
    .filter((d) => d.value <= loT && d.value < hiT)
    .sort((a, b) => b.freq - a.freq || a.id.localeCompare(b.id));

  // high group bucketed by length (or one bucket), sorted by log frequency
  const buckets = new Map<number, { item: T; lf: number; used: boolean }[]>();
  for (const h of high) {
    const k = opt.exactLength ? h.length : 0;
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = []));
    b.push({ item: h, lf: Math.log10(h.freq), used: false });
  }
  for (const b of buckets.values()) b.sort((x, y) => x.lf - y.lf);

  const pairs: MatchResult<T>["pairs"] = [];
  for (const l of low) {
    if (pairs.length >= opt.maxPairs) break;
    const bucket = buckets.get(opt.exactLength ? l.length : 0);
    if (!bucket) continue;
    const lf = Math.log10(l.freq);
    let best: (typeof bucket)[number] | null = null;
    let bestD = Infinity;
    for (let i = lowerBound(bucket, lf - opt.logFreqTolerance); i < bucket.length; i++) {
      const h = bucket[i];
      if (h.lf > lf + opt.logFreqTolerance) break;
      if (h.used) continue;
      const d = Math.abs(h.lf - lf);
      if (
        best === null ||
        d < bestD ||
        (d === bestD && (h.item.value > best.item.value || (h.item.value === best.item.value && h.item.id < best.item.id)))
      ) {
        best = h;
        bestD = d;
      }
    }
    if (best) {
      best.used = true;
      pairs.push({ high: best.item, low: l, logFreqDiff: best.lf - lf });
    }
  }
  return { pairs, thresholds: { low: loT, high: hiT }, pool: { high: high.length, low: low.length } };
}
