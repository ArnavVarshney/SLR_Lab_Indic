import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { summary } from "@/lib/summary";
import { AksharaCharts } from "./AksharaCharts";
import { AksharaTable } from "./AksharaTable";

export const metadata: Metadata = { title: "Aksharas" };

export default function AksharasPage() {
  return (
    <>
      <PageHeader title="Aksharas" description="Structure, positional distribution and frequency of akshara types." />
      <div className="space-y-4">
        <AksharaCharts
          structure={summary.structure}
          cluster={summary.cluster}
          vowelKind={summary.vowel_kind}
          position={summary.position}
          barakhadi={summary.barakhadi}
        />
        <AksharaTable />
      </div>
    </>
  );
}
