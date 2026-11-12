import type { RunLlm } from "@/api/types";

export interface LlmSummary {
  /** The analysis ran on NEAR AI Cloud and the enclave attestation was fetched. */
  enclave: boolean;
  /** At least one step fell back to the deterministic drafters instead of a model. */
  fallback: boolean;
  /** Every step fell back: no model wrote anything in this run. */
  allFallback: boolean;
  mapper?: string;
  drafterA?: string;
  drafterB?: string;
  /** A and B are different models. */
  independent: boolean;
}

const isHeuristic = (m?: string) => !m || /^heuristic/i.test(m);
/** "z-ai/glm-5.3" -> "glm-5.3", "Qwen/Qwen3.6-35B-A3B-FP8" -> "Qwen3.6-35B-A3B-FP8" */
export const modelName = (m?: string) => (!m ? "unknown" : isHeuristic(m) ? "deterministic rules" : (m.split("/").pop() ?? m));

/** What can truthfully be said about who drafted a run. Nothing is claimed that the run does not carry. */
export function summarizeLlm(llm: unknown): LlmSummary | null {
  const l = (llm ?? null) as RunLlm | null;
  if (!l || !Array.isArray(l.models)) return null;
  const [mapper, a, b] = l.models;
  const used = [mapper, a, b].filter((m): m is string => !!m);
  return {
    enclave: l.provider === "near-ai" && !!l.tee?.tee,
    fallback: used.some(isHeuristic),
    allFallback: used.length > 0 && used.every(isHeuristic),
    mapper,
    drafterA: a,
    drafterB: b,
    independent: !!a && !!b && a !== b && !isHeuristic(a) && !isHeuristic(b),
  };
}

/** "drafter-a" / "A" -> the model that was drafter A in this run. */
export function drafterModel(s: LlmSummary | null, drafter: string) {
  if (!s) return undefined;
  return /b$/i.test(drafter) ? s.drafterB : /a$/i.test(drafter) ? s.drafterA : undefined;
}
