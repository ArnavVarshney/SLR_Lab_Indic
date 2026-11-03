import { PageHeader } from "@/components/ui";
import { summary } from "@/lib/summary";
import { OverviewView } from "./OverviewView";

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Corpus totals and distributions. Akshara = orthographic syllable; word = whitespace-delimited token."
      />
      <OverviewView
        totals={summary.totals}
        wordLength={summary.word_length}
        coverage={summary.coverage}
        zipf={summary.zipf_words}
      />
    </>
  );
}
