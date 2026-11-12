"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@radix-ui/react-tooltip";
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { startMocks } from "@/api/mockReady";
import { ToastProvider } from "@/components/ui/Toast";
import { USE_MOCKS } from "@/lib/env";
import { ApiError } from "@/api/errors";
import { AuthModal } from "@/components/auth/AuthModal";

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000,
            refetchOnWindowFocus: false,
            retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2,
          },
        },
      }),
  );
  useEffect(() => {
    // Requests wait on mockReady, so nothing blocks rendering while the worker registers.
    if (USE_MOCKS) void startMocks();
  }, []);
  return (
    <QueryClientProvider client={qc}>
      {/* reducedMotion="user": every animation becomes an instant state change under prefers-reduced-motion */}
      <MotionConfig reducedMotion="user" transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
        <TooltipProvider>
          <ToastProvider>
            {children}
            <AuthModal />
          </ToastProvider>
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
