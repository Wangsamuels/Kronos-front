import type { Metadata } from "next";
import { IntegrateScreen } from "./IntegrateScreen";

export const metadata: Metadata = { title: "Integrate" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IntegrateScreen id={id} />;
}
