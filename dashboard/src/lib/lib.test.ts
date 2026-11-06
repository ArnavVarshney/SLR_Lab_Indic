import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";
import { fromColumnar } from "./data";
import { matchExtremes, type MatchItem } from "./matching";
import { mean, quantile, sd, smd } from "./stats";

describe("stats", () => {
  it("quantile matches numpy linear interpolation", () => {
    const v = [1, 2, 3, 4, 10];
    expect(quantile(v, 0)).toBe(1);
    expect(quantile(v, 1)).toBe(10);
    expect(quantile(v, 0.5)).toBe(3);
    expect(quantile(v, 0.2)).toBeCloseTo(1.8); // np.quantile([1,2,3,4,10], .2)
    expect(quantile(v, 0.9)).toBeCloseTo(7.6);
    expect(quantile([5, 1, 3], 0.5)).toBe(3); // unsorted input
  });
  it("mean, sd, smd", () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(sd([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(smd([1, 2, 3], [1, 2, 3])).toBe(0);
    expect(smd([2, 3, 4], [1, 2, 3])).toBeCloseTo(1);
  });
});

describe("csv", () => {
  it("adds BOM, quotes and escapes", () => {
    const out = toCsv([{ a: 'x,"y"', b: 1 }, { a: "ಅಮ್ಮ", b: null }], [
      { header: "a", value: (r) => r.a },
      { header: "b", value: (r) => r.b },
    ]);
    expect(out).toBe('﻿a,b\r\n"x,""y""",1\r\nಅಮ್ಮ,\r\n');
  });
});

describe("fromColumnar", () => {
  it("maps rows to objects", () => {
    expect(fromColumnar<{ a: number; b: string }>({ columns: ["a", "b"], rows: [[1, "x"]] })).toEqual([
      { a: 1, b: "x" },
    ]);
  });
});

describe("matchExtremes", () => {
  const item = (id: string, value: number, freq: number, length = 3): MatchItem => ({
    id, value, freq, length,
  });

  it("pairs top/bottom quantiles within tolerance, without reuse", () => {
    const items = [
      item("h1", 0.9, 100), item("h2", 0.8, 10), item("h3", 0.85, 12),
      item("m1", 0.5, 50), item("m2", 0.5, 50), item("m3", 0.4, 50), item("m4", 0.6, 50),
      item("l1", 0.1, 11), item("l2", 0.05, 90), item("l3", 0.02, 1000),
    ];
    const r = matchExtremes(items, { q: 0.3, logFreqTolerance: 0.1, exactLength: true, maxPairs: 10 });
    const ids = r.pairs.map((p) => [p.low.id, p.high.id]);
    // low processed by descending freq: l3 (1000: no high within 0.1), l2 (90 -> h1 100), l1 (11 -> h3 12, closer than h2 10)
    expect(ids).toEqual([["l2", "h1"], ["l1", "h3"]]);
    for (const p of r.pairs) {
      expect(Math.abs(p.logFreqDiff)).toBeLessThanOrEqual(0.1);
      expect(p.high.value).toBeGreaterThan(p.low.value);
    }
    expect(new Set(r.pairs.map((p) => p.high.id)).size).toBe(r.pairs.length);
  });

  it("respects exact length and maxPairs", () => {
    const items = [
      item("h1", 1, 10, 3), item("h2", 1, 10, 4), item("l1", 0, 10, 4), item("l2", 0, 10, 4),
    ];
    const r = matchExtremes(items, { q: 0.5, logFreqTolerance: 1, exactLength: true, maxPairs: 5 });
    expect(r.pairs.map((p) => [p.low.id, p.high.id])).toEqual([["l1", "h2"]]);
    const r2 = matchExtremes(items, { q: 0.5, logFreqTolerance: 1, exactLength: false, maxPairs: 1 });
    expect(r2.pairs).toHaveLength(1);
  });

  it("never puts an item in both groups when quantiles coincide", () => {
    const items = [item("a", 1, 10), item("b", 1, 10), item("c", 1, 10)];
    const r = matchExtremes(items, { q: 0.5, logFreqTolerance: 1, exactLength: false, maxPairs: 5 });
    expect(r.pairs).toHaveLength(0);
  });

  it("ignores non-finite values and rejects bad q", () => {
    const items = [item("a", NaN, 10), item("b", 1, 10), item("c", 0, 10)];
    const r = matchExtremes(items, { q: 0.5, logFreqTolerance: 1, exactLength: false, maxPairs: 5 });
    expect(r.pairs.map((p) => [p.low.id, p.high.id])).toEqual([["c", "b"]]);
    expect(() => matchExtremes(items, { q: 0.7, logFreqTolerance: 1, exactLength: false, maxPairs: 5 })).toThrow();
  });
});
