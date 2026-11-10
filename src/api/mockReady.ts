import { USE_MOCKS } from "@/lib/env";

let resolveReady: () => void = () => {};
/** Resolves once the MSW service worker is intercepting (immediately when running against a live API). */
export const mockReady: Promise<void> = USE_MOCKS
  ? new Promise<void>((r) => {
      resolveReady = r;
    })
  : Promise.resolve();

let started = false;
export async function startMocks() {
  if (!USE_MOCKS || started || typeof window === "undefined") return mockReady;
  started = true;
  const { worker } = await import("@/mocks/browser");
  await worker.start({ onUnhandledFrame: "bypass", quiet: true, serviceWorker: { url: "/mockServiceWorker.js" } });
  resolveReady();
  return mockReady;
}
