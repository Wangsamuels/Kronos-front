"use client";
import { createConfig, http, type Config } from "wagmi";
import { connect, getConnection, signMessage, switchChain, writeContract, waitForTransactionReceipt } from "wagmi/actions";
import { injected } from "wagmi/connectors/injected";
import { walletConnect } from "wagmi/connectors/walletConnect";
import { auroraTestnet, baseSepolia } from "viem/chains";
import { createSiweMessage } from "viem/siwe";
import type { Address } from "viem";
import { WALLETCONNECT_ID } from "@/lib/env";

let config: Config | null = null;
export function wagmiConfig(): Config {
  config ??= createConfig({
    chains: [baseSepolia, auroraTestnet],
    connectors: [injected(), ...(WALLETCONNECT_ID ? [walletConnect({ projectId: WALLETCONNECT_ID, showQrModal: true })] : [])],
    transports: { [baseSepolia.id]: http(), [auroraTestnet.id]: http() },
    ssr: true,
  });
  return config;
}

export function availableConnectors() {
  return wagmiConfig().connectors.map((c) => ({ id: c.id, name: c.name }));
}

async function ensureConnected(connectorId?: string, chainId?: number): Promise<Address> {
  const cfg = wagmiConfig();
  const cur = getConnection(cfg);
  if (cur.status === "connected" && cur.address) return cur.address;
  const connector = cfg.connectors.find((c) => c.id === connectorId) ?? cfg.connectors[0];
  if (!connector) throw new Error("No EVM wallet found. Install a browser wallet or set NEXT_PUBLIC_WALLETCONNECT_ID.");
  const res = await connect(cfg, { connector, chainId: chainId as (typeof cfg.chains)[number]["id"] | undefined });
  const a = res.accounts[0];
  if (!a) throw new Error("Wallet returned no account");
  return a;
}

export interface SiweParams {
  domain: string;
  uri: string;
  statement: string;
  chainIds: number[];
}

/**
 * Sign-In With Ethereum (EIP-4361). domain, uri and statement come from GET /v1/auth/providers: the
 * backend rejects a message built for any other domain.
 */
export async function signSiwe(nonce: string, siwe: SiweParams, preferredChainId?: number, connectorId?: string) {
  const chainId = preferredChainId && siwe.chainIds.includes(preferredChainId) ? preferredChainId : siwe.chainIds[0] ?? baseSepolia.id;
  const address = await ensureConnected(connectorId, chainId);
  const message = createSiweMessage({
    address,
    chainId,
    domain: siwe.domain,
    uri: siwe.uri,
    nonce,
    version: "1",
    statement: siwe.statement,
    issuedAt: new Date(),
  });
  const signature = await signMessage(wagmiConfig(), { message });
  return { type: "siwe" as const, message, signature };
}

const TIMELOCK_CANCEL = [{ type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] }] as const;
const GUARD_RELEASE = [{ type: "function", name: "releaseOutflow", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }], outputs: [] }] as const;

/** Guardian cancel: GuardTimelock.cancel(actionId). Needs the guardian wallet. */
export async function cancelTimelockAction(timelock: Address, actionId: bigint, chainId: number) {
  const cfg = wagmiConfig();
  await ensureConnected(undefined, chainId);
  await switchChain(cfg, { chainId: chainId as (typeof cfg.chains)[number]["id"] }).catch(() => {});
  const hash = await writeContract(cfg, { address: timelock, abi: TIMELOCK_CANCEL, functionName: "cancel", args: [actionId], chainId: chainId as (typeof cfg.chains)[number]["id"] });
  await waitForTransactionReceipt(cfg, { hash });
  return hash;
}

/** Guardian release of a queued outflow claim: KronosGuard.releaseOutflow(claimId). */
export async function releaseOutflow(guard: Address, claimId: bigint, chainId: number) {
  const cfg = wagmiConfig();
  await ensureConnected(undefined, chainId);
  await switchChain(cfg, { chainId: chainId as (typeof cfg.chains)[number]["id"] }).catch(() => {});
  const hash = await writeContract(cfg, { address: guard, abi: GUARD_RELEASE, functionName: "releaseOutflow", args: [claimId], chainId: chainId as (typeof cfg.chains)[number]["id"] });
  await waitForTransactionReceipt(cfg, { hash });
  return hash;
}
