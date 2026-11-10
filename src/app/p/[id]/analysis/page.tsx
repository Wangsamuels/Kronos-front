import type { Metadata } from "next";
import { AnalysisScreen } from "./AnalysisScreen";

export const metadata: Metadata = { title: "Analysis" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AnalysisScreen id={id} />;
}
