"use client";
import { NEAR_NETWORK } from "@/lib/env";

/**
 * NEAR Wallet Selector, NEP-413 signMessage. The backend's /v1/auth/nonce is hex; it is used as the
 * 32-byte NEP-413 nonce (zero padded), the same way the backend rebuilds the payload.
 */
export async function signNear(walletId: "meteor-wallet" | "my-near-wallet", nonceHex: string, near: { message: string; recipient: string; network?: string }) {
  const [{ setupWalletSelector }, { setupMeteorWallet }, { setupMyNearWallet }] = await Promise.all([
    import("@near-wallet-selector/core"),
    import("@near-wallet-selector/meteor-wallet"),
    import("@near-wallet-selector/my-near-wallet"),
  ]);
  const selector = await setupWalletSelector({ network: (near.network === "mainnet" || near.network === "testnet" ? near.network : NEAR_NETWORK), modules: [setupMeteorWallet(), setupMyNearWallet()] });
  const wallet = await selector.wallet(walletId);
  const nonce = new Uint8Array(32);
  const hex = nonceHex.match(/.{1,2}/g) ?? [];
  hex.slice(0, 32).forEach((b, i) => (nonce[i] = parseInt(b, 16)));
  // message and recipient come from GET /v1/auth/providers; the backend rebuilds the same NEP-413 payload.
  const { message, recipient } = near;
  const callbackUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`;
  sessionStorage.setItem("kronos.near.pending", JSON.stringify({ nonce: nonceHex, message, recipient, callbackUrl }));
  const signed = await wallet.signMessage({ message, recipient, nonce: nonce as unknown as Buffer, callbackUrl });
  if (!signed) return null; // redirect wallet: result arrives on callbackUrl#accountId=…&signature=…
  return { type: "near" as const, accountId: signed.accountId, publicKey: signed.publicKey, signature: signed.signature, message, nonce: nonceHex, recipient, callbackUrl };
}

/** Redirect wallets (MyNearWallet) come back with the signature in the URL hash. */
export function takeNearRedirect() {
  if (typeof window === "undefined") return null;
  const h = new URLSearchParams(window.location.hash.slice(1));
  const signature = h.get("signature");
  const accountId = h.get("accountId");
  const publicKey = h.get("publicKey");
  const raw = sessionStorage.getItem("kronos.near.pending");
  if (!signature || !accountId || !publicKey || !raw) return null;
  sessionStorage.removeItem("kronos.near.pending");
  history.replaceState(null, "", window.location.pathname + window.location.search);
  const p = JSON.parse(raw) as { nonce: string; message: string; recipient: string; callbackUrl: string };
  return { type: "near" as const, accountId, publicKey, signature, ...p };
}
