import type { Metadata } from "next";
import type { ReactNode } from "react";
import metaJson from "@data/meta.json";
import { Card, PageHeader } from "@/components/ui";
import { fmtInt } from "@/lib/format";
import { summary } from "@/lib/summary";
import type { Meta } from "@/lib/types";

export const metadata: Metadata = { title: "Methods" };

const meta = metaJson as Meta;

function Defs({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[180px_minmax(0,1fr)]">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-medium text-zinc-700 dark:text-zinc-300">{k}</dt>
          <dd className="text-zinc-600 dark:text-zinc-400">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

const FILES = ["summary", "aksharas", "bigrams", "trigrams", "words", "meta"];

export default function MethodsPage() {
  const c = summary.cleaning;
  return (
    <>
      <PageHeader title="Methods" description="Definitions, preprocessing and data provenance." />
      <div className="space-y-4">
        <Card title="Units">
          <Defs
            items={[
              ["Word", "Whitespace-delimited token after normalisation."],
              ["Akshara", "Orthographic syllable: (C+virama)* C | V, plus vowel sign and anusvara/visarga. Coda consonants are written on the following akshara (ಅ|ಮ್ಮ); anusvara attaches to the preceding one (ಎಂ|ದು)."],
              ["Structure", "C = consonant, V = vowel (inherent, sign or letter), N = anusvara, H = visarga, (dead) = virama-final."],
              ["Cluster", "geminate = two identical consonants (ಮ್ಮ); non-geminate = other clusters (ಕ್ರ); geminate+other = three or more consonants containing a geminate pair."],
              ["Components", "Graphic components per akshara: consonants (base and subscript forms), vowel letter or sign, explicit virama, anusvara/visarga."],
            ]}
          />
        </Card>
        <Card title="Preprocessing">
          <Defs
            items={[
              ["Normalisation", "Unicode NFC; ZWJ, ZWSP and BOM removed; all non-Kannada characters (punctuation, digits, Latin) treated as separators."],
              ["ZWNJ", "After a virama, ZWNJ marks a visible dead consonant (ಪ್ರೊಟೀನ್‌ಗಳು → ನ್ | ಗ) and is treated as an akshara break."],
              ["Cleaning", <>Tokens removed via the tangled-word list: {fmtInt(c.tangled_tokens_dropped)}. Orphan vowel signs dropped: {fmtInt(Object.values(c.orphan_signs_dropped).reduce((a, b) => a + b, 0))}.</>],
            ]}
          />
        </Card>
        <Card title="Measures">
          <Defs
            items={[
              ["Weighting", "Token: each word occurrence counts (exposure). Type: each distinct word counts once (lexicon). Selected globally in the sidebar."],
              ["Boundary #", "Words are padded with # at both ends, so P(# | A) is the probability that A ends a word and P(B | #) the word-initial distribution. Transitions never cross words except on the Segmentation page."],
              ["Forward TP", "P(B | A) = count(A,B) / count(A as context)."],
              ["Backward TP", "P(A | B) = count(A,B) / count(B as target)."],
              ["Second order", "P(C | A,B) = count(A,B,C) / count(A,B)."],
              ["PMI", "log₂ [ count(A,B) · N / (count(A) · count(B)) ], N = number of bigram tokens."],
              ["Entropy", "H(next | A) = −Σ P(B|A) log₂ P(B|A), word end included as an outcome. Corpus-level value is the frequency-weighted mean over A."],
              ["Reliability", <>A bigram is unreliable when count(A) or count(B) is below the minimum count (default {meta.min_denom}); a trigram when count(A,B) is. Word-level TP summaries use all bigrams.</>],
              ["Word TP", "Mean and minimum forward TP over a word's internal transitions (one-akshara words: none). log₂ P = sum of log₂ forward TP including both boundaries (token weighting)."],
              ["Neighbours N", "Number of word types of equal length differing by exactly one akshara."],
              ["Zipf", "log₁₀ (frequency per million words) + 3."],
              ["Segmentation", "Running text with spaces removed; TP computed over the continuous akshara stream. AUC = P(within-word TP > across-boundary TP). Local-minimum segmentation places a boundary wherever TP is lower than at both neighbours."],
              ["Matched sets", "Greedy nearest-neighbour pairing without replacement on log₁₀ frequency (optionally exact length) between the top and bottom quantiles of the chosen variable."],
            ]}
          />
        </Card>
        <Card title="Data">
          <Defs
            items={[
              ["Corpus", <span key="c" lang="kn">{meta.corpus}</span>],
              ["Generated", <>{meta.generated_at} · commit {meta.git_commit ?? "unknown"}</>],
              ["Pipeline", <code key="p" className="text-xs">python kn_analysis.py</code>],
              ["Precision", `Floats stored to ${meta.significant_digits} significant digits.`],
              [
                "Files",
                <span key="f" className="flex flex-wrap gap-x-3">
                  {FILES.map((f) => (
                    <a key={f} href={`/data/${f}.json`} className="underline underline-offset-2">
                      {f}.json
                    </a>
                  ))}
                </span>,
              ],
              ["Limitations", "Grade levels of the source textbooks are not recorded; statistics pool all texts."],
            ]}
          />
        </Card>
      </div>
    </>
  );
}
