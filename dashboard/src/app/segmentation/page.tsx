import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { summary } from "@/lib/summary";
import { SegmentationView } from "./SegmentationView";

export const metadata: Metadata = { title: "Segmentation" };

export default function SegmentationPage() {
  return (
    <>
      <PageHeader
        title="Segmentation"
        description="Transition probabilities in running text with spaces removed: transitions within words vs across word boundaries. Token stream; weighting does not apply."
      />
      <SegmentationView boundary={summary.boundary} />
    </>
  );
}
