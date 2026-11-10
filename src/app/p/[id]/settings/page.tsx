import type { Metadata } from "next";
import { SettingsScreen } from "./SettingsScreen";

export const metadata: Metadata = { title: "Settings" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SettingsScreen id={id} />;
}
