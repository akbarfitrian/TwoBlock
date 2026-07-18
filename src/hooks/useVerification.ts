"use client";

import { useCallback, useState } from "react";
import { createWalletClient, custom, getAddress, parseUnits, type Address } from "viem";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { useProfile } from "@/hooks/useProfile";
import { activeArcChain } from "@/lib/arc/chain";
import {
  twoBlockPaymentsAbi,
  getTwoBlockPaymentsAddress,
  tierToIndex,
  billingToIndex,
} from "@/lib/contracts/twoBlockPayments";
import type { VerificationTier } from "@/lib/types";

export type Billing = "monthly" | "yearly";

export interface UseVerificationState {
  purchasing: boolean;
  error: string | null;

  purchase: (tier: Exclude<VerificationTier, "free">, billing: Billing, amountUsdc: number) => Promise<void>;
}

export function useVerification(): UseVerificationState {
  const { walletAddress, authenticated, login } = useTwoBlockAuth();
  const { refresh: refreshProfile } = useProfile();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = useCallback(
    async (tier: Exclude<VerificationTier, "free">, billing: Billing, amountUsdc: number) => {
      setError(null);
      if (!authenticated || !walletAddress) {
        await login();
        return;
      }
      if (typeof window === "undefined" || !window.ethereum) {
        setError("No wallet detected. Install MetaMask (or another browser wallet) first.");
        return;
      }

      setPurchasing(true);
      try {
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
          console.warn("[TwoBlock] Failed to ensure Arc network before purchasing verification:", err);
        });

        // Verification purchases now go through the TwoBlockPayments
        // contract's `purchaseVerification` function instead of a raw P2P
        // transfer to the treasury wallet. The contract forwards the funds
        // to its configured `treasury` and emits a `VerificationPurchased`
        // event the backend verifies against.
        const txHash = await walletClient.writeContract({
          account: fromWallet,
          chain: activeArcChain,
          address: contractAddress,
          abi: twoBlockPaymentsAbi,
          functionName: "purchaseVerification",
          args: [tierToIndex(tier), billingToIndex(billing)],
          value: parseUnits(amountUsdc.toString(), 18),
        });

        const res = await fetch("/api/verification/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress, tier, billing, amountUsdc, txRef: txHash }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to record verification purchase.");
        }

        await refreshProfile();
      } catch (err) {
        console.error("[TwoBlock] Verification purchase failed:", err);
        setError(err instanceof Error ? err.message : "Verification purchase failed.");
        throw err;
      } finally {
        setPurchasing(false);
      }
    },
    [authenticated, walletAddress, login, refreshProfile]
  );

  return { purchasing, error, purchase };
}
