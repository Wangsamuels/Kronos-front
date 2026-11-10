import type { Metadata } from "next";
import { VerifyScreen } from "./VerifyScreen";

export const metadata: Metadata = { title: "Verify" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <VerifyScreen id={id} />;
}
