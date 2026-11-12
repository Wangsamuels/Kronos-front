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
            className="grid animate-k-row-in grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-panel border border-line-2 bg-surface p-4 shadow-[0_16px_48px_-16px_rgb(0_0_0/0.7)] data-[state=closed]:opacity-0"
          >
            <span aria-hidden className={cn("mt-1.5 block size-2 rounded-full", { neutral: "bg-text-3", pass: "bg-pass", block: "bg-block", queue: "bg-queue" }[t.tone])} />
            <T.Title className="text-15 font-medium text-text first-letter:uppercase">{t.title}</T.Title>
            {t.body ? <T.Description className="col-start-2 break-words text-13 text-text-2">{t.body}</T.Description> : null}
          </T.Root>
        ))}
        <T.Viewport className="fixed right-4 top-20 z-[60] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </T.Provider>
    </Ctx.Provider>
  );
}
