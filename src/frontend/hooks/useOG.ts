"use client";

import { useCallback, useState } from "react";
import { createWalletClient, custom, getAddress, parseUnits, type Address } from "viem";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { activeArcChain } from "@/shared/chain";
import { twoBlockPaymentsAbi, getTwoBlockPaymentsAddress, OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";

export interface UseOGState {
  purchasing: boolean;
  error: string | null;

  purchase: () => Promise<void>;
}

export function useOG(): UseOGState {
  const { walletAddress, authenticated, login } = useTwoBlockAuth();
  const { refresh: refreshProfile } = useProfile();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purchase = useCallback(async () => {
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
        console.warn("[TwoBlock] Failed to ensure Arc network before purchasing OG:", err);
      });

      const txHash = await walletClient.writeContract({
        account: fromWallet,
        chain: activeArcChain,
        address: contractAddress,
        abi: twoBlockPaymentsAbi,
        functionName: "purchaseOG",
        args: [],
        value: parseUnits(OG_PRICE_USDC.toString(), 18),
      });

      const res = await fetch("/api/og/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress, amountUsdc: OG_PRICE_USDC, txRef: txHash }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to record OG purchase.");
      }

      await refreshProfile();
    } catch (err) {
      console.error("[TwoBlock] OG purchase failed:", err);
      setError(err instanceof Error ? err.message : "OG purchase failed.");
      throw err;
    } finally {
      setPurchasing(false);
    }
  }, [authenticated, walletAddress, login, refreshProfile]);

  return { purchasing, error, purchase };
}
