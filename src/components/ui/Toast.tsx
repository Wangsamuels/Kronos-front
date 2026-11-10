"use client";
import * as T from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "pass" | "block" | "queue" | "neutral";
interface Item {
  id: number;
  title: string;
  body?: string;
  tone: Tone;
}
const Ctx = createContext<(t: Omit<Item, "id">) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((t: Omit<Item, "id">) => setItems((xs) => [...xs, { ...t, id: Date.now() + Math.random() }]), []);
  return (
    <Ctx.Provider value={push}>
      <T.Provider swipeDirection="right" duration={5000}>
        {children}
        {items.map((t) => (
          <T.Root
            key={t.id}
            onOpenChange={(o) => !o && setItems((xs) => xs.filter((x) => x.id !== t.id))}
            className="k-panel grid gap-1 border-l-2 p-4 data-[state=closed]:opacity-0"
            style={{ borderLeftColor: t.tone === "neutral" ? undefined : `rgb(var(--${t.tone}))` }}
          >
            <T.Title className={cn("font-mono text-13", { neutral: "text-text", pass: "text-pass", block: "text-block", queue: "text-queue" }[t.tone])}>{t.title}</T.Title>
            {t.body ? <T.Description className="text-13 text-text-2">{t.body}</T.Description> : null}
          </T.Root>
        ))}
        <T.Viewport className="fixed bottom-4 right-4 z-50 flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </T.Provider>
    </Ctx.Provider>
  );
}
