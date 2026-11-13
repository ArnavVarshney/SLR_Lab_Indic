import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Card, PageHeader } from "@/components/ui";
import { fmtFix, fmtInt, fmtPct } from "@/lib/format";
import { summary } from "@/lib/summary";

export const metadata: Metadata = { title: "About" };

interface Item {
  name: string;
  value: ReactNode;
  significance: ReactNode;
  implication: ReactNode;
}

function Measures({ items }: { items: Item[] }) {
  return (
    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
      {items.map((it) => (
        <div key={it.name} className="grid gap-1 py-3 first:pt-0 last:pb-0 md:grid-cols-[200px_minmax(0,1fr)] md:gap-6">
          <h3 className="text-sm font-medium">{it.name}</h3>
          <ul className="list-disc space-y-0.5 pl-4 text-sm text-zinc-600 marker:text-zinc-400 dark:text-zinc-400">
            <li>
              <span className="text-zinc-900 dark:text-zinc-100">Value:</span> {it.value}
            </li>
            <li>
              <span className="text-zinc-900 dark:text-zinc-100">Significance:</span> {it.significance}
            </li>
            <li>
              <span className="text-zinc-900 dark:text-zinc-100">Implication:</span> {it.implication}
            </li>
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function AboutPage() {
  const t = summary.totals;
  const cov = summary.coverage.thresholds;
  const share = (d: typeof summary.structure, key: string) => d.rows.find((r) => r[0] === key);
  const cv = share(summary.structure, "CV")!;
  const ccv = share(summary.structure, "CCV")!;
  const pos = Object.fromEntries(summary.position.map((p) => [p.position, p]));
  const b = summary.boundary;
  const seg = b.segmentation;
  const hReduction = 1 - t.H_next_tok / t.H_unigram;
  const comp = summary.composition;
  const vs = (cls: keyof typeof comp.vowel_share, v: string) => fmtPct(comp.vowel_share[cls][v] ?? 0, 0);
  const uI = (cls: keyof typeof comp.vowel_share) => fmtPct((comp.vowel_share[cls]["ು"] ?? 0) + (comp.vowel_share[cls]["ಿ"] ?? 0), 0);

  const corpus: Item[] = [
    {
      name: "Corpus size",
      value: `${fmtInt(t.word_tokens)} word tokens, ${fmtInt(t.word_types)} types (TTR ${fmtFix(t.type_token_ratio, 2)}); ${fmtPct(t.hapax_word_types / t.word_types)} of types occur once.`,
      significance: "Approximates the written exposure provided by the textbooks.",
      implication: "Statistics for frequent units are stable; most word types are too rare for word-specific estimates.",
    },
    {
      name: "Akshara coverage",
      value: `${fmtInt(t.akshara_types)} akshara types; ${cov["0.5"]} / ${cov["0.8"]} / ${cov["0.9"]} types cover 50 / 80 / 90% of tokens.`,
      significance: "A small core inventory accounts for most of what children read.",
      implication: "Supports sequencing instruction and assessment by coverage; the long tail needs explicit teaching.",
    },
    {
      name: "Word length",
      value: `Mean ${fmtFix(t.mean_word_length_tokens, 2)} aksharas per token, ${fmtFix(t.mean_word_length_types, 2)} per type.`,
      significance: "Frequent words are short, while most of the vocabulary is longer.",
      implication: "Length must be controlled in stimulus sets, since it covaries with frequency.",
    },
  ];

  const complexity: Item[] = [
    {
      name: "Akshara structure",
      value: `CV: ${fmtPct(cv[4])} of tokens, ${fmtPct(cv[3])} of types. CCV: ${fmtPct(ccv[4])} of tokens, ${fmtPct(ccv[3])} of types.`,
      significance: "The inventory is dominated by conjuncts, but exposure is dominated by simple aksharas.",
      implication: "Type-based counts overstate the complexity children actually encounter, so report token-based exposure.",
    },
    {
      name: "Conjunct load",
      value: `${fmtPct(t.conjunct_token_share)} of akshara tokens are conjuncts; ${fmtPct(t.words_with_conjunct_token_share)} of word tokens contain at least one.`,
      significance: "Conjunct (ottu) aksharas are a known source of reading difficulty in Kannada (Nag & Snowling, 2012).",
      implication: "Conjuncts are unavoidable in connected text, so tasks that exclude them under-sample real reading demands.",
    },
    {
      name: "Position × complexity",
      value: `Geminates: ${fmtPct(pos.initial.geminate)} initial, ${fmtPct(pos.medial.geminate)} medial, ${fmtPct(pos.final.geminate)} final. Independent vowels: ${fmtPct(pos.initial.independent_vowel)} of initial aksharas.`,
      significance: "Complexity concentrates at word ends, in inflectional suffixes (ನ್ನು, ಲ್ಲಿ, ತ್ತು).",
      implication: "Errors at word ends may reflect orthographic complexity rather than morphology alone, so analyse errors by position.",
    },
    {
      name: "Vowel-sign composition",
      value: `${comp.skeletons.single} single, ${comp.skeletons.geminate} geminate and ${comp.skeletons.conjunct} other conjunct skeletons; ${fmtPct(comp.cells.attested / comp.cells.possible, 0)} of skeleton × vowel cells attested. Inherent ಅ: ${vs("single", "ಅ")} / ${vs("geminate", "ಅ")} / ${vs("conjunct", "ಅ")} of tokens; ◌ು: ${vs("single", "ು")} / ${vs("geminate", "ು")} / ${vs("conjunct", "ು")} (single / geminate / other conjunct).`,
      significance: `Geminates carry ◌ು or ◌ಿ in ${uI("geminate")} of tokens vs ${uI("single")} for single consonants, driven by suffixes (ನ್ನು, ಲ್ಲಿ, ತ್ತು); other conjuncts mostly take ಅ or ◌ಾ (ಪ್ರ, ಕ್ಷ, ಪ್ರಾ).`,
      implication: "Exposure to a skeleton is concentrated in a few vowel signs, so select and report stimuli at the akshara level, not the skeleton level; unattested cells test generalisation beyond exposure.",
    },
  ];

  const statistics: Item[] = [
    {
      name: "Forward TP, P(B | A)",
      value: "Per bigram (Transitions page); token and type weighted.",
      significance: "Predictability of the next akshara, the core cue in statistical-learning accounts (Saffran et al., 1996).",
      implication: "Use it to build high- vs low-TP stimuli for statistical-learning and reading tasks.",
    },
    {
      name: "Backward TP, P(A | B)",
      value: "Per bigram.",
      significance: "Predictability of the preceding akshara; learners can use backward statistics too.",
      implication: "Report both directions; they dissociate (forward and backward AUC differ below).",
    },
    {
      name: "Second-order TP, P(C | A,B)",
      value: `${fmtInt(t.trigram_types)} trigram types.`,
      significance: "Captures dependencies spanning more than one akshara, e.g. suffix chains.",
      implication: "Estimates are sparse, so apply the minimum-count filter.",
    },
    {
      name: "PMI",
      value: "Per bigram, in bits.",
      significance: "Association beyond chance, independent of akshara frequency.",
      implication: "High-PMI pairs mark cohesive chunks (stems, suffixes) that may be read as units.",
    },
    {
      name: "Conditional entropy",
      value: `H(next | akshara) = ${fmtFix(t.H_next_tok, 2)} bits vs H(akshara) = ${fmtFix(t.H_unigram, 2)} bits, a ${fmtPct(hReduction, 0)} reduction.`,
      significance: "Uncertainty is near zero after suffix aksharas and highest after word-initial aksharas.",
      implication: "Predictability rises within words, so sensitivity to it should matter most mid-word and late in the word.",
    },
    {
      name: "Boundary AUC",
      value: `Forward ${fmtFix(b.measures.forward.auc, 2)}, backward ${fmtFix(b.measures.backward.auc, 2)} (0.5 = no information).`,
      significance: "TP is substantially lower across word boundaries than within words.",
      implication: "TP is a usable segmentation cue in Kannada text, which supports the premise of Saffran-style tasks.",
    },
    {
      name: "TP-based segmentation",
      value: `F1 ${fmtFix(seg.f1, 2)}; precision ${fmtFix(seg.precision, 2)} vs chance ${fmtFix(seg.chance_precision, 2)}.`,
      significance: "A learner using TP dips alone recovers most boundaries, but with many false alarms.",
      implication: "TP is informative but not sufficient on its own; group differences (e.g. SEN vs typical) in using it are testable.",
    },
  ];

  const words: Item[] = [
    {
      name: "Word TP / log₂ P",
      value: "Mean and minimum internal TP, and bigram-model log probability, per word.",
      significance: "Indexes how typical a word's akshara sequence is (orthographic familiarity).",
      implication: "Control or manipulate it in word-reading and lexical-decision designs.",
    },
    {
      name: "Neighbourhood N",
      value: "Word types differing by one akshara (Coltheart et al., 1977, at akshara level).",
      significance: "Lexical similarity affects recognition speed and errors.",
      implication: "High- and low-TP words differ in N, so match or covary it.",
    },
    {
      name: "Components",
      value: "Graphic components per word: consonants, vowel signs, virama, anusvara/visarga.",
      significance: "A proxy for visual complexity.",
      implication: "Separates visual load from frequency and TP effects.",
    },
    {
      name: "Matched sets",
      value: "Frequency- and length-matched pairs; SMD reported for each variable.",
      significance: "Isolates the manipulated variable from the main confounds.",
      implication: "Aim for |SMD| < 0.1 on controls; check SMD on the other covariates before use.",
    },
  ];

  const caveats = [
    "Token weighting reflects exposure; type weighting reflects the lexicon. For TP-based stimulus selection, type weighting avoids circularity with word frequency.",
    "Below the minimum count, TPs are unstable; a TP of 1.0 can come from a handful of observations.",
    "Aksharas are orthographic, not phonological, syllables: coda consonants are written on the next akshara.",
    "Transitions in running text are not independent, so effect sizes (AUC, SMD) are reported instead of p-values.",
    "The corpus is textbook prose pooled across grades, and grade levels are not recorded; exposure for a specific age may differ.",
  ];

  return (
    <>
      <PageHeader title="About" description="What each measure captures, its value in this corpus, and its implications for reading research." />
      <div className="space-y-4">
        <Card title="Corpus">
          <Measures items={corpus} />
        </Card>
        <Card title="Orthographic complexity">
          <Measures items={complexity} />
        </Card>
        <Card title="Transition statistics">
          <Measures items={statistics} />
        </Card>
        <Card title="Word-level measures">
          <Measures items={words} />
        </Card>
        <Card title="Caveats">
          <ul className="list-disc space-y-1 pl-4 text-sm text-zinc-600 marker:text-zinc-400 dark:text-zinc-400">
            {caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
