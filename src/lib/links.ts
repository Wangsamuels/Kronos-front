/** Public links. Set NEXT_PUBLIC_GITHUB_URL / NEXT_PUBLIC_X_URL when the public repo and account exist. */
export const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/Wangsamuels/Kronos-backend";
export const FRONTEND_GITHUB_URL = "https://github.com/Wangsamuels/Kronos-front";
export const X_URL = process.env.NEXT_PUBLIC_X_URL || "/docs#contact";
export const ATTACK_TESTS_URL = `${GITHUB_URL}/tree/main/contracts/test`;

// ---------- NEAR (testnet). Everything here is public chain data, linked as proof on the Why NEAR page.
export const NEAR_EXPLORER = "https://testnet.nearblocks.io";
export const nearTxUrl = (hash: string) => `${NEAR_EXPLORER}/txns/${hash}`;
export const nearAccountUrl = (account: string) => `${NEAR_EXPLORER}/address/${account}`;
/** The Kronos registry contract on NEAR testnet (the dashboard reads the live value from /monitor). */
export const NEAR_REGISTRY = process.env.NEXT_PUBLIC_NEAR_REGISTRY || "kronos-registry-wang.testnet";
export const NEAR_MPC_SIGNER = "v1.signer-prod.testnet";
/** A real outflow tighten on Aurora testnet, sent by the protocol's Chain Signatures address. */
export const SAMPLE_TIGHTEN_EVM_TX = process.env.NEXT_PUBLIC_SAMPLE_TIGHTEN_EVM_TX || "0x575b873a88b8cf369e33ec2246fb01092ab93f8bdc11cfa54d16851387359094";
export const SAMPLE_TIGHTEN_EVM_URL = `https://explorer.testnet.aurora.dev/tx/${SAMPLE_TIGHTEN_EVM_TX}`;
/** Optional: the NEAR transaction that asked the MPC network to sign it. */
export const SAMPLE_TIGHTEN_NEAR_TX = process.env.NEXT_PUBLIC_SAMPLE_TIGHTEN_NEAR_TX || "";
