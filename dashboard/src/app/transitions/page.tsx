import type { Metadata } from "next";
import { Suspense } from "react";
import { Loading, PageHeader } from "@/components/ui";
import { TransitionsView } from "./TransitionsView";

export const metadata: Metadata = { title: "Transitions" };

export default function TransitionsPage() {
  return (
    <>
      <PageHeader
        title="Transitions"
        description="Within-word akshara transitions. # = word boundary. Forward TP = P(B | A); backward TP = P(A | B)."
      />
      <Suspense fallback={<Loading height={400} />}>
        <TransitionsView />
      </Suspense>
    </>
  );
}
