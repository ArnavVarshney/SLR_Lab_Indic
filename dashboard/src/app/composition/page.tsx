import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { summary } from "@/lib/summary";
import { CompositionView } from "./CompositionView";

export const metadata: Metadata = { title: "Composition" };

export default function CompositionPage() {
  return (
    <>
      <PageHeader
        title="Composition"
        description="Consonantal aksharas decomposed into consonant skeleton × vowel sign (matra). ಅ = inherent vowel; ◌್ = dead consonant. Vowel letters are not included."
      />
      <CompositionView malformed={summary.composition.malformed} />
    </>
  );
}
