"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, formatUnits, http } from "viem";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { activeArcChain } from "@/shared/chain";

const REFRESH_INTERVAL_MS = 20_000;

export function useWalletBalance() {
  const { walletAddress } = useTwoBlockAuth();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!walletAddress) {
        setBalance(null);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const publicClient = createPublicClient({
          chain: activeArcChain,
          transport: http(activeArcChain.rpcUrls.default.http[0]),
        });
        const wei = await publicClient.getBalance({ address: walletAddress });
        setBalance(formatUnits(wei, activeArcChain.nativeCurrency.decimals));
      } catch (err) {
        console.error("[TwoBlock] Failed to fetch wallet balance:", err);
        setError("Couldn't load balance. Try again.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return {
    balance,
    loading,
    error,
    symbol: activeArcChain.nativeCurrency.symbol,
    refresh: load,
  };
}
