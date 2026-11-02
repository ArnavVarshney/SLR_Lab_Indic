export type Weighting = "tok" | "typ";

export interface ColumnarTable {
  columns: string[];
  rows: unknown[][];
}

export interface Meta {
  corpus: string;
  generated_at: string;
  git_commit: string | null;
  min_denom: number;
  boundary_symbol: string;
  significant_digits: number;
}

export interface Distribution {
  columns: string[]; // [key, types, tokens, type_share, token_share]
  rows: [string, number, number, number, number][];
}

export interface BoundaryMeasure {
  within_n: number;
  across_n: number;
  within_mean: number;
  across_mean: number;
  within_median: number;
  across_median: number;
  auc: number;
  hist_within: number[];
  hist_across: number[];
}

export interface Summary {
  totals: {
    word_tokens: number;
    word_types: number;
    type_token_ratio: number;
    hapax_word_types: number;
    akshara_tokens: number;
    akshara_types: number;
    hapax_akshara_types: number;
    mean_word_length_tokens: number;
    mean_word_length_types: number;
    bigram_types: number;
    trigram_types: number;
    H_unigram: number;
    H_next_tok: number;
    H_next_typ: number;
    conjunct_token_share: number;
    words_with_conjunct_token_share: number;
  };
  cleaning: { orphan_signs_dropped: Record<string, number>; tangled_tokens_dropped: number };
  coverage: { thresholds: Record<string, number>; curve: [number, number][] };
  zipf_words: [number, number][];
  word_length: [number, number, number][]; // [length, tokens, types]
  structure: Distribution;
  cluster: Distribution;
  vowel_kind: Distribution;
  position: {
    position: "initial" | "medial" | "final" | "mono";
    tokens: number;
    independent_vowel: number;
    anusvara_visarga: number;
    geminate: number;
    non_geminate: number;
    dead_consonant: number;
  }[];
  barakhadi: { consonants: string[]; vowels: string[]; counts: number[][] };
  boundary: {
    bins: number[];
    measures: { forward: BoundaryMeasure; backward: BoundaryMeasure };
    segmentation: {
      method: string;
      precision: number;
      recall: number;
      f1: number;
      chance_precision: number;
    };
  };
}

export interface AksharaRow {
  akshara: string;
  structure: string;
  n_consonants: number;
  cluster_type: string;
  vowel_kind: string;
  vowel: string;
  base_consonant: string;
  coda: string;
  visual_components: number;
  token_count: number;
  per_million: number;
  word_types: number;
  initial: number;
  medial: number;
  final: number;
  mono: number;
  rank: number;
  cum_share: number;
  H_next_tok: number;
  H_next_typ: number;
  P_end_tok: number;
  n_successors: number;
}

export interface BigramRow {
  A: string;
  B: string;
  count_tok: number;
  ctx_tok: number;
  tgt_tok: number;
  fwd_tok: number;
  bwd_tok: number;
  pmi_tok: number;
  count_typ: number;
  ctx_typ: number;
  tgt_typ: number;
  fwd_typ: number;
  bwd_typ: number;
  pmi_typ: number;
}

export interface TrigramRow {
  A: string;
  B: string;
  C: string;
  count_tok: number;
  ctx_tok: number;
  p_tok: number;
  count_typ: number;
  ctx_typ: number;
  p_typ: number;
}

export interface WordRow {
  word: string; // derived: aksharas joined
  aksharas: string; // "ಅ|ಮ್ಮ"
  freq: number;
  zipf: number;
  n_aksharas: number;
  structure: string;
  n_conjunct: number;
  n_geminate: number;
  n_non_geminate: number;
  n_matra: number;
  n_coda: number;
  visual_components: number;
  mean_tp_tok: number | null;
  min_tp_tok: number | null;
  mean_tp_typ: number | null;
  min_tp_typ: number | null;
  log2p_tok: number;
  neighbours: number;
  mean_akshara_pm: number;
}
