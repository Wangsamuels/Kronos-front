import type { Metadata } from "next";
import { ReviewScreen } from "./ReviewScreen";

export const metadata: Metadata = { title: "Review" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReviewScreen id={id} />;
}
