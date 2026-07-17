"use client";

import { useCallback, useState } from "react";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { useProfile } from "@/hooks/useProfile";
import { useSendTip } from "@/lib/actions/sendTip";
import { getVerificationTreasuryWallet } from "@/lib/verificationTreasury";
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
  const { sendTip } = useSendTip();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = useCallback(
    async (tier: Exclude<VerificationTier, "free">, billing: Billing, amountUsdc: number) => {
      setError(null);
      if (!authenticated || !walletAddress) {
        await login();
        return;
      }

      setPurchasing(true);
      try {
        const treasury = getVerificationTreasuryWallet();

        const { txHash } = await sendTip({ toWallet: treasury, amountUsdc });

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
    [authenticated, walletAddress, login, sendTip, refreshProfile]
  );

  return { purchasing, error, purchase };
}
