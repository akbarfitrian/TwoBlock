"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, formatUnits, http } from "viem";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { usdcAbi } from "@/shared/contracts/two-block-payments-erc20";
import { getGiwaUsdcTokenAddress } from "@/shared/chain";

const REFRESH_INTERVAL_MS = 20_000;

/// This always reflects the *spendable USDC balance on the active chain* —
/// on Arc that's the native currency itself (USDC IS the gas token there),
/// on Giwa it's the USDC ERC-20 balance (Giwa's native ETH is gas only,
/// not what tips/OG purchases are denominated in).
export function useWalletBalance() {
  const { walletAddress } = useTwoBlockAuth();
  const { activeChain, activeChainKey } = useActiveChain();
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
        const chain = activeChain.chain;
        const publicClient = createPublicClient({
          chain,
          transport: http(chain.rpcUrls.default.http[0]),
        });

        if (activeChain.paymentMode === "erc20") {
          const tokenAddress = getGiwaUsdcTokenAddress();
          const rawBalance = await publicClient.readContract({
            address: tokenAddress,
            abi: usdcAbi,
            functionName: "balanceOf",
            args: [walletAddress],
          });
          setBalance(formatUnits(rawBalance, activeChain.usdcDecimals));
        } else {
          const wei = await publicClient.getBalance({ address: walletAddress });
          setBalance(formatUnits(wei, chain.nativeCurrency.decimals));
        }
      } catch (err) {
        console.error("[TwoBlock] Failed to fetch wallet balance:", err);
        setError("Couldn't load balance. Try again.");
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [walletAddress, activeChain]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  // Giwa's native currency is ETH, but tips/OG purchases are denominated
  // in USDC there (a self-deployed ERC-20, named/symboled to match Arc) —
  // so the symbol shown alongside this balance should always be the
  // *USDC-equivalent* symbol for the active chain, not necessarily its
  // native gas currency's symbol.
  const symbol = activeChain.paymentMode === "erc20" ? "USDC" : activeChain.chain.nativeCurrency.symbol;

  return {
    balance,
    loading,
    error,
    symbol,
    chainName: activeChain.chain.name,
    chainKey: activeChainKey,
    refresh: load,
  };
}
