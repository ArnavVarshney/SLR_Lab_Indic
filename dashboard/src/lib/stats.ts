/** Quantile with linear interpolation between order statistics (numpy default). */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  let t = 0;
  for (const v of values) t += v;
  return t / values.length;
}

/** Sample standard deviation (n − 1). */
export function sd(values: number[]): number {
  if (values.length < 2) return NaN;
  const m = mean(values);
  let t = 0;
  for (const v of values) t += (v - m) ** 2;
  return Math.sqrt(t / (values.length - 1));
}

/** Standardised mean difference (Cohen's d with pooled SD). */
export function smd(a: number[], b: number[]): number {
  const na = a.length;
  const nb = b.length;
  if (na < 2 || nb < 2) return NaN;
  const pooled = Math.sqrt(((na - 1) * sd(a) ** 2 + (nb - 1) * sd(b) ** 2) / (na + nb - 2));
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}
