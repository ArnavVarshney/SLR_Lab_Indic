import type { AksharaRow, BaseClass, Weighting } from "./types";

export const INHERENT = "ಅ";
export const VIRAMA = "್";
const CODA_CHAR = { N: "ಂ", H: "ಃ" } as const;

/** Anusvara/visarga filter: all variants, plain only, or only those carrying ಂ / ಃ. */
export type CodaFilter = "all" | "none" | "N" | "H";

export const BASE_CLASS_LABEL: Record<BaseClass, string> = {
  single: "Single consonant",
  geminate: "Geminate",
  conjunct: "Other conjunct",
};

export const unitLabel = (w: Weighting) => (w === "tok" ? "tokens" : "word types");

/** Vowel column of a consonantal akshara: ಅ (inherent), its vowel sign, or ್ (dead consonant). */
export const vowelOf = (r: AksharaRow) => (r.vowel_kind === "dead" ? VIRAMA : r.vowel);

export const baseClass = (r: AksharaRow): BaseClass =>
  r.cluster_type === "none" ? "single" : r.cluster_type === "geminate" ? "geminate" : "conjunct";

export const codaMatches = (coda: string, f: CodaFilter) =>
  f === "all" || (f === "none" ? coda === "" : coda.includes(f));

/** Display form of a vowel column: ಅ, ◌ಾ … ◌್. */
export const vowelLabel = (v: string) => (v === INHERENT ? v : `◌${v}`);

/** Akshara for a skeleton × vowel cell (plain form unless a single coda is selected). */
export function cellAkshara(skeleton: string, vowel: string, coda: CodaFilter) {
  return skeleton + (vowel === INHERENT ? "" : vowel) + (coda === "N" || coda === "H" ? CODA_CHAR[coda] : "");
}

const vowelRank = (v: string) => (v === INHERENT ? -1 : v === VIRAMA ? Infinity : v.codePointAt(0)!);

/** Kagunita order: inherent ಅ, vowel signs by code point (ಾ … ೌ), virama last. */
export const vowelOrder = (vs: Iterable<string>) => [...new Set(vs)].sort((a, b) => vowelRank(a) - vowelRank(b));

export interface SkeletonRow {
  skeleton: string;
  cls: BaseClass;
  total: number;
  values: number[]; // weight per vowel column, aligned with Composition.vowels
  variants: number; // akshara types
  attested: number; // vowel columns attested, excluding ್
}

export interface Composition {
  vowels: string[];
  skeletons: SkeletonRow[]; // by total, descending
}

/**
 * Pivot well-formed consonantal aksharas into skeleton × vowel.
 * Token weighting sums akshara tokens; type weighting sums word types containing each akshara.
 */
export function compose(rows: AksharaRow[], weighting: Weighting, coda: CodaFilter): Composition {
  const consonantal = rows.filter((r) => r.skeleton !== "");
  const vowels = vowelOrder(consonantal.map(vowelOf)); // fixed columns, independent of the coda filter
  const col = new Map(vowels.map((v, i) => [v, i]));
  const by = new Map<string, SkeletonRow>();
  for (const r of consonantal) {
    if (!codaMatches(r.coda, coda)) continue;
    let s = by.get(r.skeleton);
    if (!s) {
      s = { skeleton: r.skeleton, cls: baseClass(r), total: 0, values: vowels.map(() => 0), variants: 0, attested: 0 };
      by.set(r.skeleton, s);
    }
    const w = weighting === "tok" ? r.token_count : r.word_types;
    s.values[col.get(vowelOf(r))!] += w;
    s.total += w;
    s.variants += 1;
  }
  const skeletons = [...by.values()];
  for (const s of skeletons) s.attested = s.values.filter((v, i) => v > 0 && vowels[i] !== VIRAMA).length;
  skeletons.sort((a, b) => b.total - a.total || a.skeleton.localeCompare(b.skeleton));
  return { vowels, skeletons };
}

/** Token counts per vowel column at each word position (words of ≥ 2 aksharas). */
export function vowelByPosition(rows: AksharaRow[], vowels: string[], coda: CodaFilter) {
  const col = new Map(vowels.map((v, i) => [v, i]));
  const out = { initial: vowels.map(() => 0), medial: vowels.map(() => 0), final: vowels.map(() => 0) };
  for (const r of rows) {
    if (r.skeleton === "" || !codaMatches(r.coda, coda)) continue;
    const i = col.get(vowelOf(r))!;
    out.initial[i] += r.initial;
    out.medial[i] += r.medial;
    out.final[i] += r.final;
  }
  return out;
}
