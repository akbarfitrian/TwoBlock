"use client";

import { createWalletClient, custom, getAddress, parseUnits, type Address } from "viem";
import { activeArcChain } from "@/lib/arc/chain";
import { twoBlockPaymentsAbi, getTwoBlockPaymentsAddress } from "@/lib/contracts/twoBlockPayments";

export interface SendTipParams {
  toWallet: Address;
  amountUsdc: number;
  postId?: string;
}

export interface SendTipResult {
  txHash: `0x${string}`;
}

function isRpcRateLimitError(err: unknown): boolean {
  const anyErr = err as { code?: number; message?: string; details?: string; shortMessage?: string } | undefined;
  const text = `${anyErr?.message ?? ""} ${anyErr?.details ?? ""} ${anyErr?.shortMessage ?? ""}`.toLowerCase();
  return anyErr?.code === -32011 || text.includes("request limit reached") || text.includes("rate limit");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSendTip() {
  const sendTip = async ({ toWallet, amountUsdc, postId }: SendTipParams): Promise<SendTipResult> => {
    if (amountUsdc <= 0) throw new Error("Tip amount must be greater than 0");
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet detected. Install MetaMask (or another browser wallet) first.");
    }

    const contractAddress = getTwoBlockPaymentsAddress();

    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as Address[];

    const fromWallet = accounts[0] ? getAddress(accounts[0]) : undefined;
    if (!fromWallet) throw new Error("No wallet connected");

    const walletClient = createWalletClient({
      chain: activeArcChain,
      transport: custom(window.ethereum),
    });

    await walletClient.switchChain({ id: activeArcChain.id }).catch((err) => {
      console.warn("[TwoBlock] Failed to ensure Arc network before sending tip:", err);
    });

    const valueWei = parseUnits(amountUsdc.toString(), 18);

    const MAX_ATTEMPTS = 3;
    let hash: `0x${string}` | undefined;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        // Tips now route through the TwoBlockPayments contract instead of a
        // raw P2P transfer, so every tip emits a canonical `Tipped` event
        // the backend can verify against instead of trusting client input.
        hash = await walletClient.writeContract({
          account: fromWallet,
          chain: activeArcChain,
          address: contractAddress,
          abi: twoBlockPaymentsAbi,
          functionName: "tip",
          args: [toWallet, postId ?? ""],
          value: valueWei,
        });
        break;
      } catch (err) {
        const isLastAttempt = attempt === MAX_ATTEMPTS;
        if (!isRpcRateLimitError(err) || isLastAttempt) {
          if (isRpcRateLimitError(err)) {
            throw new Error(
              "Arc's testnet RPC is rate-limited right now (too many people testing at once). Please wait a few seconds and try again."
            );
          }
          throw err;
        }
        console.warn(`[TwoBlock] RPC rate-limited, retrying (${attempt}/${MAX_ATTEMPTS})…`, err);
        await sleep(attempt * 1500);
      }
    }
    if (!hash) throw new Error("Failed to send transaction after retries.");

    const saveRes = await fetch("/api/tips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromWallet,
        toWallet,
        postId: postId ?? null,
        amountUsdc,
        txRef: hash,
      }),
    });

    if (!saveRes.ok) {

      const body = await saveRes.json().catch(() => ({}));
      throw new Error(body.error ?? "Tip sent on-chain, but failed to save. Please contact support with this tx hash: " + hash);
    }

    return { txHash: hash };
  };

  return { sendTip };
}
