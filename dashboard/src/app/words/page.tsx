import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { WordsView } from "./WordsView";

export const metadata: Metadata = { title: "Words" };

export default function WordsPage() {
  return (
    <>
      <PageHeader
        title="Words"
        description="Word types with frequency, length, orthographic complexity, within-word TP and akshara-level neighbourhood size. Filters apply to the table and to matched sets."
      />
      <WordsView />
    </>
  );
}
