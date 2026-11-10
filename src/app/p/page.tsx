import type { Metadata } from "next";
import { ProtocolList } from "./ProtocolList";

export const metadata: Metadata = { title: "Protocols" };

export default function Page() {
  return <ProtocolList />;
}
