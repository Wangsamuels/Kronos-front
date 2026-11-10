import { CHAIN_KEYS } from "./env";

export interface ChainInfo {
  key: string;
  id: number;
  name: string;
  explorer: string;
}

export const KNOWN_CHAINS: ChainInfo[] = [
  { key: "aurora-testnet", id: 1313161555, name: "Aurora testnet", explorer: "https://explorer.testnet.aurora.dev" },
  { key: "base-sepolia", id: 84532, name: "Base Sepolia", explorer: "https://sepolia.basescan.org" },
];

export const ENABLED_CHAINS = KNOWN_CHAINS.filter((c) => CHAIN_KEYS.includes(c.key));

export function chainById(id: number | null | undefined): ChainInfo | undefined {
  return KNOWN_CHAINS.find((c) => c.id === id);
}

export function chainName(id: number | null | undefined) {
  return chainById(id)?.name ?? (id ? `chain ${id}` : "unknown chain");
}

export function txUrl(chainId: number, hash: string) {
  const c = chainById(chainId);
  return c ? `${c.explorer}/tx/${hash}` : undefined;
}

export function addressUrl(chainId: number, addr: string) {
  const c = chainById(chainId);
  return c ? `${c.explorer}/address/${addr}` : undefined;
}
