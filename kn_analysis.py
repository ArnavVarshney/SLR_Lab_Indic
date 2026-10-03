"""Akshara-level statistics for the Kannada corpus -> JSON for the dashboard.

Writes compact JSON tables to ``dashboard/public/data/``:

    meta.json       provenance (corpus, thresholds, git commit, timestamp)
    summary.json    corpus totals and all distributions used by the charts
    aksharas.json   akshara inventory: structure, frequency, position, entropy
    bigrams.json    within-word bigrams: forward/backward TP, PMI (token + type)
    trigrams.json   within-word trigrams: P(C|AB) (token + type)
    words.json      word types: frequency, length, complexity, TP, neighbourhood

Tables are ``{"columns": [...], "rows": [[...], ...]}``. Every statistic is
computed here; the dashboard only filters, sorts and matches.

Aksharas are orthographic syllables: a coda consonant is written on the
following akshara (ಅ|ಮ್ಮ), anusvara/visarga attach to the preceding one (ಎಂ|ದು).

Run:  .venv/bin/python kn_analysis.py
"""

from __future__ import annotations

import json
import math
import subprocess
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

CORPUS = Path("final Kannada corpus - cleaned.txt")
TANGLES = Path("kn_sylb_len_wrd_tangle_fixed_AV.csv")
OUT = Path("dashboard/public/data")
BOUNDARY = "#"
MIN_DENOM = 10  # default minimum context/target frequency for a "reliable" TP
SIG = 5  # significant digits kept for floats in JSON

# --- Unicode classes (Kannada block U+0C80-U+0CFF) -------------------------
VIRAMA = "್"
ANUSVARA = "ಂ"
VISARGA = "ಃ"
CANDRABINDU = "ಁ"
INDEP_VOWELS = set(chr(c) for c in range(0x0C85, 0x0C95)) | {"ೠ", "ೡ"}
CONSONANTS = set(chr(c) for c in range(0x0C95, 0x0CBA)) | {"ೞ"}
MATRAS = set(chr(c) for c in range(0x0CBE, 0x0CCD)) | {"ೢ", "ೣ"}
MODIFIERS = {ANUSVARA, VISARGA, CANDRABINDU, "಼", "ೕ", "ೖ"}
SIGNS = MATRAS | MODIFIERS | {VIRAMA}
ZWNJ = "‌"
INHERENT = "ಅ"  # label for the inherent vowel /a/


# --- Normalisation and syllabification --------------------------------------
def normalise(text: str) -> str:
    """NFC, drop ZWJ/ZWSP/BOM, map every non-Kannada character to a space.

    ZWNJ is kept: after a virama it marks a visible dead consonant
    (ಪ್ರೊಟೀನ್‌ಗಳು) and the syllabifier treats it as an akshara break.
    """
    out = []
    for ch in unicodedata.normalize("NFC", text):
        if ch == ZWNJ or ch in INDEP_VOWELS or ch in CONSONANTS or ch in SIGNS:
            out.append(ch)
        elif ch in ("‍", "​", "﻿"):
            continue
        else:
            out.append(" ")
    return "".join(out)


def syllabify(word: str, orphans: Counter | None = None) -> list[str]:
    """Split a normalised word into aksharas.

    A consonant following ``C + virama`` joins the same akshara (conjunct)
    unless a ZWNJ intervenes. Dependent signs with no base are dropped and
    counted in ``orphans``.
    """
    aks: list[str] = []
    break_next = False
    for ch in word:
        if ch == ZWNJ:
            break_next = True
            continue
        if ch in SIGNS:
            if aks:
                aks[-1] += ch
            elif orphans is not None:
                orphans[ch] += 1
            continue
        if ch in CONSONANTS and aks and aks[-1].endswith(VIRAMA) and not break_next:
            aks[-1] += ch
        else:
            aks.append(ch)
        break_next = False
    return aks


def akshara_features(a: str) -> dict:
    cons = [c for c in a if c in CONSONANTS]
    indep = [c for c in a if c in INDEP_VOWELS]
    matra = [c for c in a if c in MATRAS]
    dead = a.endswith(VIRAMA)
    n = len(cons)
    if n >= 2:
        geminate_pair = any(cons[i] == cons[i + 1] for i in range(n - 1))
        cluster = ("geminate" if n == 2 else "geminate+other") if geminate_pair else "non_geminate"
    else:
        cluster = "none"
    coda = ("N" if (ANUSVARA in a or CANDRABINDU in a) else "") + ("H" if VISARGA in a else "")
    if indep:
        struct = "V"
    elif dead:
        struct = "C" * n + "(dead)"
    else:
        struct = "C" * n + "V"
    return {
        "akshara": a,
        "structure": struct + coda,
        "n_consonants": n,
        "cluster_type": cluster,
        "vowel_kind": "independent" if indep else "matra" if matra else "dead" if dead else "inherent",
        "vowel": indep[0] if indep else matra[0] if matra else "" if dead else INHERENT,
        "base_consonant": cons[0] if cons else "",
        "coda": coda,
        # graphic components a reader decodes: consonants (base + ottus),
        # vowel letter or sign, explicit virama, anusvara/visarga
        "visual_components": n + len(indep) + len(matra) + int(dead) + len(coda),
    }


# --- Statistics helpers -----------------------------------------------------
def entropy(counts) -> float:
    c = np.asarray(list(counts), dtype=float)
    p = c / c.sum()
    return float(-(p * np.log2(p)).sum())


def tp_table(pairs: Counter) -> pd.DataFrame:
    """Forward/backward TP and PMI (bits) from a bigram Counter."""
    df = pd.DataFrame([(a, b, n) for (a, b), n in pairs.items()], columns=["A", "B", "count"])
    total = df["count"].sum()
    df["ctx"] = df.groupby("A")["count"].transform("sum")
    df["tgt"] = df.groupby("B")["count"].transform("sum")
    df["fwd"] = df["count"] / df["ctx"]
    df["bwd"] = df["count"] / df["tgt"]
    df["pmi"] = np.log2(df["count"] * total / (df["ctx"] * df["tgt"]))
    return df


def tri_table(c: Counter) -> pd.DataFrame:
    df = pd.DataFrame([(a, b, d, n) for (a, b, d), n in c.items()], columns=["A", "B", "C", "count"])
    df["ctx"] = df.groupby(["A", "B"])["count"].transform("sum")
    df["p"] = df["count"] / df["ctx"]
    return df


def cond_entropy(df: pd.DataFrame) -> float:
    w = df.groupby("A")["count"].sum()
    h = df.groupby("A")["count"].apply(entropy)
    return float((w * h).sum() / w.sum())


# --- Pipeline ---------------------------------------------------------------
def load_tokens() -> tuple[list[list[str]], dict]:
    raw = CORPUS.read_text(encoding="utf8")
    tang = pd.read_csv(TANGLES, dtype=str, keep_default_na=False)
    # residual tangles: CSV keys contain '/', the corpus versions do not
    delete_long = {
        w.strip().replace("/", "")
        for w, s in zip(tang.Word, tang.Substitute)
        if s.strip().lower() == "delete" and "/" in w
    }
    orphans: Counter = Counter()
    dropped = 0
    token_aks: list[list[str]] = []
    for w in raw.replace("﻿", "").split():
        if w in delete_long:
            dropped += 1
            continue
        for piece in normalise(w).split():
            aks = syllabify(piece, orphans)
            if aks:
                token_aks.append(aks)
    return token_aks, {"orphan_signs_dropped": dict(orphans), "tangled_tokens_dropped": dropped}


def build() -> dict:
    token_aks, cleaning = load_tokens()
    n_tokens = len(token_aks)
    # a word type is its akshara sequence (keeps ZWNJ-separated forms distinct)
    word_freq: Counter = Counter(tuple(a) for a in token_aks)

    # ---- akshara inventory ----
    ak_tok: Counter = Counter()
    pos_tok: dict[str, Counter] = defaultdict(Counter)
    for aks in token_aks:
        L = len(aks)
        for i, a in enumerate(aks):
            ak_tok[a] += 1
            pos = "mono" if L == 1 else "initial" if i == 0 else "final" if i == L - 1 else "medial"
            pos_tok[a][pos] += 1
    ak_type: Counter = Counter()
    for w in word_freq:
        for a in set(w):
            ak_type[a] += 1
    n_ak_tokens = sum(ak_tok.values())

    # ---- within-word n-grams (with # boundaries) ----
    bi_tok, bi_typ, tri_tok, tri_typ = Counter(), Counter(), Counter(), Counter()
    for w, f in word_freq.items():
        seq = (BOUNDARY, *w, BOUNDARY)
        for i in range(len(seq) - 1):
            bi_tok[seq[i:i + 2]] += f
            bi_typ[seq[i:i + 2]] += 1
        for i in range(len(seq) - 2):
            tri_tok[seq[i:i + 3]] += f
            tri_typ[seq[i:i + 3]] += 1
    bt, by = tp_table(bi_tok), tp_table(bi_typ)
    bigrams = bt.merge(by, on=["A", "B"], suffixes=("_tok", "_typ"), validate="one_to_one")
    assert len(bigrams) == len(bt) == len(by)
    tt_, ty_ = tri_table(tri_tok), tri_table(tri_typ)
    trigrams = tt_.merge(ty_, on=["A", "B", "C"], suffixes=("_tok", "_typ"), validate="one_to_one")

    # ---- next-akshara entropy per context ----
    ent = {}
    for (a, g), (a2, gy) in zip(bt.groupby("A"), by.groupby("A"), strict=True):
        assert a == a2
        g = g.sort_values("count", ascending=False)
        ent[a] = {
            "H_next_tok": entropy(g["count"]),
            "H_next_typ": entropy(gy["count"]),
            "P_end_tok": float(g.loc[g.B == BOUNDARY, "fwd"].sum()),
            "n_successors": int(len(g)),
        }

    feats = {a: akshara_features(a) for a in ak_tok}
    inv = pd.DataFrame([feats[a] for a in ak_tok])
    inv["token_count"] = inv.akshara.map(ak_tok)
    inv["per_million"] = inv.token_count / n_ak_tokens * 1e6
    inv["word_types"] = inv.akshara.map(ak_type)
    for p in ("initial", "medial", "final", "mono"):
        inv[p] = inv.akshara.map(lambda a, p=p: pos_tok[a][p])
    for k in ("H_next_tok", "H_next_typ", "P_end_tok", "n_successors"):
        inv[k] = inv.akshara.map(lambda a, k=k: ent[a][k])
    inv = inv.sort_values("token_count", ascending=False).reset_index(drop=True)
    inv["rank"] = np.arange(1, len(inv) + 1)
    inv["cum_share"] = inv.token_count.cumsum() / n_ak_tokens

    # ---- running-text boundary analysis (spaces removed) ----
    stream, is_boundary = [], []
    for aks in token_aks:
        for i, a in enumerate(aks):
            if stream:
                is_boundary.append(i == 0)
            stream.append(a)
    pairs = list(zip(stream[:-1], stream[1:]))
    s_bi = Counter(pairs)
    s_ctx, s_tgt = Counter(stream[:-1]), Counter(stream[1:])
    fwd = np.array([s_bi[p] / s_ctx[p[0]] for p in pairs])
    bwd = np.array([s_bi[p] / s_tgt[p[1]] for p in pairs])
    isb = np.array(is_boundary)
    bins = np.logspace(-5, 0, 26)
    bins[-1] = 1.0 + 1e-9
    boundary = {"bins": bins.tolist(), "measures": {}}
    for name, arr in (("forward", fwd), ("backward", bwd)):
        within, across = arr[~isb], arr[isb]
        u = stats.mannwhitneyu(within, across, alternative="greater")
        boundary["measures"][name] = {
            "within_n": int(len(within)), "across_n": int(len(across)),
            "within_mean": within.mean(), "across_mean": across.mean(),
            "within_median": float(np.median(within)), "across_median": float(np.median(across)),
            "auc": u.statistic / (len(within) * len(across)),
            "hist_within": (np.histogram(within, bins)[0] / len(within)).tolist(),
            "hist_across": (np.histogram(across, bins)[0] / len(across)).tolist(),
        }
    loc_min = np.zeros_like(fwd, dtype=bool)
    loc_min[1:-1] = (fwd[1:-1] < fwd[:-2]) & (fwd[1:-1] < fwd[2:])
    hits = int((loc_min & isb).sum())
    prec, rec = hits / loc_min.sum(), hits / isb.sum()
    boundary["segmentation"] = {
        "method": "boundary at each local minimum of forward TP",
        "precision": prec, "recall": rec, "f1": 2 * prec * rec / (prec + rec),
        "chance_precision": float(isb.mean()),
    }

    # ---- word types ----
    fwd_tok = dict(zip(zip(bt.A, bt.B), bt.fwd))
    fwd_typ = dict(zip(zip(by.A, by.B), by.fwd))
    wildcard: Counter = Counter()
    for w in word_freq:
        for i in range(len(w)):
            wildcard[(len(w), i, w[:i], w[i + 1:])] += 1
    rows = []
    for w, f in word_freq.items():
        seq = (BOUNDARY, *w, BOUNDARY)
        edges = [(seq[i], seq[i + 1]) for i in range(len(seq) - 1)]
        t_all = [fwd_tok[e] for e in edges]
        t_int, y_int = t_all[1:-1], [fwd_typ[e] for e in edges[1:-1]]
        fs = [feats[a] for a in w]
        rows.append({
            "aksharas": "|".join(w),
            "freq": f,
            "zipf": math.log10(f / n_tokens * 1e6) + 3,
            "n_aksharas": len(w),
            "structure": "-".join(x["structure"] for x in fs),
            "n_conjunct": sum(x["n_consonants"] >= 2 for x in fs),
            "n_geminate": sum(x["cluster_type"].startswith("geminate") for x in fs),
            "n_non_geminate": sum(x["cluster_type"] == "non_geminate" for x in fs),
            "n_matra": sum(x["vowel_kind"] == "matra" for x in fs),
            "n_coda": sum(bool(x["coda"]) for x in fs),
            "visual_components": sum(x["visual_components"] for x in fs),
            "mean_tp_tok": float(np.mean(t_int)) if t_int else None,
            "min_tp_tok": float(np.min(t_int)) if t_int else None,
            "mean_tp_typ": float(np.mean(y_int)) if y_int else None,
            "min_tp_typ": float(np.min(y_int)) if y_int else None,
            "log2p_tok": float(np.sum(np.log2(t_all))),
            "neighbours": sum(wildcard[(len(w), i, w[:i], w[i + 1:])] - 1 for i in range(len(w))),
            "mean_akshara_pm": float(np.mean([ak_tok[a] for a in w])) / n_ak_tokens * 1e6,
        })
    words = pd.DataFrame(rows).sort_values("freq", ascending=False).reset_index(drop=True)

    # ---- distributions ----
    def dist(col):
        g = inv.groupby(col).agg(types=("akshara", "size"), tokens=("token_count", "sum"))
        g["type_share"] = g.types / g.types.sum()
        g["token_share"] = g.tokens / g.tokens.sum()
        g = g.sort_values("tokens", ascending=False).reset_index()
        return {"columns": list(g.columns), "rows": g.values.tolist()}

    position = []
    for p in ("initial", "medial", "final", "mono"):
        col = inv[p]
        tot = col.sum()
        position.append({
            "position": p, "tokens": int(tot),
            "independent_vowel": col[inv.vowel_kind.eq("independent")].sum() / tot,
            "anusvara_visarga": col[inv.coda.ne("")].sum() / tot,
            "geminate": col[inv.cluster_type.str.startswith("geminate")].sum() / tot,
            "non_geminate": col[inv.cluster_type.eq("non_geminate")].sum() / tot,
            "dead_consonant": col[inv.vowel_kind.eq("dead")].sum() / tot,
        })

    simple = inv[(inv.n_consonants == 1) & inv.vowel_kind.isin(["inherent", "matra"])]
    grid = simple.pivot_table(index="base_consonant", columns="vowel", values="token_count",
                              aggfunc="sum", fill_value=0)
    vcols = [INHERENT] + sorted(c for c in grid.columns if c != INHERENT)
    grid = grid[vcols].loc[lambda g: g.sum(axis=1).sort_values(ascending=False).index]

    ranks = np.unique(np.round(np.logspace(0, np.log10(len(inv)), 80)).astype(int))
    wf = np.sort(np.array(list(word_freq.values())))[::-1]
    wranks = np.unique(np.round(np.logspace(0, np.log10(len(wf)), 80)).astype(int))
    wl_tok = Counter(len(a) for a in token_aks)
    wl_typ = Counter(len(w) for w in word_freq)

    summary = {
        "totals": {
            "word_tokens": n_tokens,
            "word_types": len(word_freq),
            "type_token_ratio": len(word_freq) / n_tokens,
            "hapax_word_types": sum(v == 1 for v in word_freq.values()),
            "akshara_tokens": n_ak_tokens,
            "akshara_types": len(ak_tok),
            "hapax_akshara_types": sum(v == 1 for v in ak_tok.values()),
            "mean_word_length_tokens": float(np.mean([len(a) for a in token_aks])),
            "mean_word_length_types": float(words.n_aksharas.mean()),
            "bigram_types": len(bigrams),
            "trigram_types": len(trigrams),
            "H_unigram": entropy(ak_tok.values()),
            "H_next_tok": cond_entropy(bt),
            "H_next_typ": cond_entropy(by),
            "conjunct_token_share": float(inv.loc[inv.n_consonants >= 2, "token_count"].sum() / n_ak_tokens),
            "words_with_conjunct_token_share": float(
                ((words.n_conjunct > 0) * words.freq).sum() / n_tokens),
        },
        "cleaning": cleaning,
        "coverage": {
            "thresholds": {str(q): int((inv.cum_share < q).sum() + 1) for q in (0.5, 0.8, 0.9, 0.95, 0.99)},
            "curve": [[int(r), float(inv.cum_share.iloc[r - 1])] for r in ranks],
        },
        "zipf_words": [[int(r), int(wf[r - 1])] for r in wranks],
        "word_length": [[L, wl_tok[L], wl_typ[L]] for L in sorted(wl_typ)],
        "structure": dist("structure"),
        "cluster": dist("cluster_type"),
        "vowel_kind": dist("vowel_kind"),
        "position": position,
        "barakhadi": {"consonants": list(grid.index), "vowels": vcols,
                      "counts": grid.values.astype(int).tolist()},
        "boundary": boundary,
    }

    tables = {
        "aksharas": inv[["akshara", "structure", "n_consonants", "cluster_type", "vowel_kind", "vowel",
                         "base_consonant", "coda", "visual_components", "token_count", "per_million",
                         "word_types", "initial", "medial", "final", "mono", "rank", "cum_share",
                         "H_next_tok", "H_next_typ", "P_end_tok", "n_successors"]],
        "bigrams": bigrams.sort_values("count_tok", ascending=False)[
            ["A", "B", "count_tok", "ctx_tok", "tgt_tok", "fwd_tok", "bwd_tok", "pmi_tok",
             "count_typ", "ctx_typ", "tgt_typ", "fwd_typ", "bwd_typ", "pmi_typ"]],
        "trigrams": trigrams.sort_values("count_tok", ascending=False)[
            ["A", "B", "C", "count_tok", "ctx_tok", "p_tok", "count_typ", "ctx_typ", "p_typ"]],
        "words": words,
    }
    return {"summary": summary, "tables": tables}


# --- JSON export ------------------------------------------------------------
def clean(v):
    """Python-native, NaN-free, SIG significant digits."""
    if isinstance(v, dict):
        return {str(k): clean(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [clean(x) for x in v]
    if isinstance(v, (bool, np.bool_)):
        return bool(v)
    if isinstance(v, (int, np.integer)):
        return int(v)
    if isinstance(v, (float, np.floating)):
        v = float(v)
        if math.isnan(v) or math.isinf(v):
            return None
        return float(f"{v:.{SIG}g}")
    if v is None or isinstance(v, str):
        return v
    raise TypeError(f"unexpected {type(v)}: {v!r}")


def table_json(df: pd.DataFrame) -> dict:
    return {"columns": list(df.columns), "rows": clean(df.astype(object).values.tolist())}


def write(name: str, obj) -> None:
    text = json.dumps(clean(obj), ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    (OUT / f"{name}.json").write_text(text, encoding="utf8")


def git_commit() -> str | None:
    try:
        sha = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
        # generated data is excluded so regenerating does not mark the tree dirty
        dirty = subprocess.run(["git", "diff", "--quiet", "HEAD", "--", ".", ":!dashboard/public/data"]).returncode != 0
        return sha + ("-dirty" if dirty else "")
    except (OSError, subprocess.CalledProcessError):
        return None


def verify() -> None:
    """Reload the written JSON and check internal consistency."""
    load = lambda n: json.loads((OUT / f"{n}.json").read_text(encoding="utf8"))
    s = load("summary")["totals"]
    df = lambda n: (lambda t: pd.DataFrame(t["rows"], columns=t["columns"]))(load(n))
    bi, tri, ak, wd = df("bigrams"), df("trigrams"), df("aksharas"), df("words")
    for w in ("tok", "typ"):
        sums = bi.groupby("A")[f"fwd_{w}"].sum()
        assert np.allclose(sums, 1, atol=1e-3), sums[~np.isclose(sums, 1, atol=1e-3)]
        sums = bi.groupby("B")[f"bwd_{w}"].sum()
        assert np.allclose(sums, 1, atol=1e-3)
        sums = tri.groupby(["A", "B"])[f"p_{w}"].sum()
        assert np.allclose(sums, 1, atol=1e-3)
    assert bi.loc[bi.A == BOUNDARY, "count_tok"].sum() == s["word_tokens"]
    assert bi.loc[bi.A == BOUNDARY, "count_typ"].sum() == s["word_types"]
    assert ak.token_count.sum() == s["akshara_tokens"] and len(ak) == s["akshara_types"]
    assert wd.freq.sum() == s["word_tokens"] and len(wd) == s["word_types"]
    assert (wd.aksharas.str.split("|").str.len() == wd.n_aksharas).all()
    assert len(bi) == s["bigram_types"] and len(tri) == s["trigram_types"]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    res = build()
    write("summary", res["summary"])
    for name, df in res["tables"].items():
        write(name, table_json(df))
    write("meta", {
        "corpus": CORPUS.name,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "git_commit": git_commit(),
        "min_denom": MIN_DENOM,
        "boundary_symbol": BOUNDARY,
        "significant_digits": SIG,
    })
    verify()
    for f in sorted(OUT.glob("*.json")):
        print(f"{f.name:<16}{f.stat().st_size / 1e6:6.2f} MB")
    print(json.dumps(clean(res["summary"]["totals"]), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
