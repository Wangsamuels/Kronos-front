import { Suspense } from "react";
import type { Metadata } from "next";
import { ConnectScreen } from "./ConnectScreen";

export const metadata: Metadata = { title: "Link a protocol" };

export default function Page() {
  return (
    <Suspense>
      <ConnectScreen />
    </Suspense>
  );
}
