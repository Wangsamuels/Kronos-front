import type { paths } from "./schema";

type Json<P extends keyof paths, M extends keyof paths[P], C extends number = 200> = paths[P][M] extends {
  responses: infer R;
}
  ? R extends Record<C, { content: { "application/json": infer B } }>
    ? B
    : never
  : never;

export type Protocol = Json<"/v1/protocols/{id}", "get">;
export type ProtocolStatus = Protocol["status"];
export type CreateProtocolBody = NonNullable<paths["/v1/protocols"]["post"]["requestBody"]>["content"]["application/json"];
export type CreateProtocolResult = Json<"/v1/protocols", "post", 201>;
export type Run = Json<"/v1/analyses/{id}", "get">;
export type RunStatus = Run["status"];
export type Results = Json<"/v1/analyses/{id}/results", "get">;
export type Entrypoint = Results["entrypoints"][number];
export type IntentSchema = Results["intentSchemas"][number];
export type Invariant = Results["invariants"][number];
export type Tier = Results["tiers"][number];
export type TestReport = Results["testReport"];
export type Package = Json<"/v1/packages/{id}", "get">;
export type Deployment = Json<"/v1/protocols/{id}/deployments", "post", 201>;
export type Overview = Json<"/v1/protocols/{id}/overview", "get">;
export type EventsPage = Json<"/v1/protocols/{id}/events", "get">;
export type ProtocolEvent = EventsPage["items"][number];
export type AdminAction = Json<"/v1/protocols/{id}/admin-queue", "get">[number];
export type Settings = Json<"/v1/protocols/{id}/settings", "get">;
export type Me = Json<"/v1/me", "get">;
export type Meta = Json<"/v1/meta", "get">;
export type Session = Json<"/v1/auth/refresh", "post">;
export type Monitor = Json<"/v1/protocols/{id}/monitor", "get">;
export type Providers = Json<"/v1/auth/providers", "get">;
export type Attestation = Overview["attestations"][number];
export type ChainDeployment = Overview["deployments"][number];
export type WalletAuthBody = NonNullable<paths["/v1/auth/wallet"]["post"]["requestBody"]>["content"]["application/json"];

/** Shapes the OpenAPI file leaves as `unknown`; mirrored from the backend's worker output. */
export interface RunEvent {
  id: number;
  runId: string;
  type: "stage" | "log" | "entrypoint" | "invariant" | "done" | "error";
  stage: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  payload?: unknown;
  ts: string;
}

export interface VerifyCheck {
  name: string;
  ok: boolean;
  detail?: string | null;
}

export interface PackageManifest {
  version?: string;
  configHash?: string;
  files?: { path: string; sha256: string; bytes: number }[];
  guardedFunctions?: { name: string; kind?: string; signature?: string }[];
  privileged?: { signature: string; tier: number }[];
  prTitle?: string;
  prBody?: string;
  diffPreview?: {
    added?: string[];
    summary?: string;
    generated?: { path: string; content: string }[];
  };
  warnings?: string[];
}

export interface GasReport {
  [entry: string]: unknown;
}

export interface InvariantEvidence {
  rationale?: string;
  stops?: string;
  disagreement?: string | null;
  round?: number;
  blockedBy?: string[];
}

/** `llm` on a run (left as unknown in the OpenAPI file): who drafted the rules and where it ran. */
export interface RunLlm {
  provider?: string;
  /** [mapper, drafter A, drafter B] */
  models?: string[];
  chatIds?: string[];
  tee?: { tee?: boolean; provider?: string; attestation?: { signingAddress?: string; modelAttestations?: number } | null } | null;
}
