"use client";

import { useCallback, useEffect, useState } from "react";
import { createPublicClient, createWalletClient, custom, formatUnits, getAddress, http, type Address } from "viem";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { usdcAbi } from "@/shared/contracts/two-block-payments-erc20";
import { getGiwaUsdcTokenAddress } from "@/shared/chain";

const COOLDOWN_POLL_MS = 30_000;

export interface UseFaucetState {
  /// Only meaningful on chains with paymentMode "erc20" (currently Giwa) —
  /// Arc has no faucet since USDC is its native currency there.
  available: boolean;
  claiming: boolean;
  error: string | null;
  /// Seconds until the wallet can claim again. 0 means claimable now.
  cooldownRemaining: number;
  /// Human-readable claim amount (e.g. "1000"), read from the contract's
  /// FAUCET_AMOUNT so this never drifts from what's actually deployed.
  faucetAmount: string | null;
  claim: () => Promise<void>;
  addTokenToWallet: () => Promise<void>;
}

export function useFaucet(): UseFaucetState {
  const { walletAddress, authenticated, login, ensureActiveNetwork } = useTwoBlockAuth();
  const { activeChain } = useActiveChain();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [faucetAmount, setFaucetAmount] = useState<string | null>(null);

  const available = activeChain.paymentMode === "erc20";

  const refreshCooldown = useCallback(async () => {
    if (!available || !walletAddress) {
      setCooldownRemaining(0);
      return;
    }
    try {
      const chain = activeChain.chain;
      const tokenAddress = getGiwaUsdcTokenAddress();
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const [remaining, amount] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress,
          abi: usdcAbi,
          functionName: "faucetCooldownRemaining",
          args: [walletAddress],
        }),
        publicClient.readContract({
          address: tokenAddress,
          abi: usdcAbi,
          functionName: "FAUCET_AMOUNT",
        }),
      ]);

      setCooldownRemaining(Number(remaining));
      setFaucetAmount(formatUnits(amount, activeChain.usdcDecimals));
    } catch (err) {
      console.error("[TwoBlock] Failed to check faucet cooldown:", err);
    }
  }, [available, walletAddress, activeChain]);

  useEffect(() => {
    refreshCooldown();
    const interval = setInterval(refreshCooldown, COOLDOWN_POLL_MS);
    return () => clearInterval(interval);
  }, [refreshCooldown]);

  const claim = useCallback(async () => {
    setError(null);
    if (!authenticated || !walletAddress) {
      await login();
      return;
    }
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No wallet detected. Install MetaMask (or another browser wallet) first.");
      return;
    }
    if (!available) {
      setError("Faucet is only available on Giwa Sepolia — switch networks first.");
      return;
    }

    setClaiming(true);
    try {
      const chain = activeChain.chain;
      const tokenAddress = getGiwaUsdcTokenAddress();

      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as Address[];
      const fromWallet = accounts[0] ? getAddress(accounts[0]) : undefined;
      if (!fromWallet) throw new Error("No wallet connected");

      await ensureActiveNetwork();

      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
      });
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const txHash = await walletClient.writeContract({
        account: fromWallet,
        chain,
        address: tokenAddress,
        abi: usdcAbi,
        functionName: "faucet",
        args: [],
      });

      await publicClient.waitForTransactionReceipt({ hash: txHash });
      await refreshCooldown();
    } catch (err) {
      console.error("[TwoBlock] Faucet claim failed:", err);
      const anyErr = err as { shortMessage?: string; message?: string } | undefined;
      const text = anyErr?.shortMessage ?? anyErr?.message ?? "";
      if (text.toLowerCase().includes("faucetcooldownactive")) {
        setError("You've already claimed recently — check back after the cooldown.");
        await refreshCooldown();
      } else {
        setError("Faucet claim failed. Try again.");
      }
    } finally {
      setClaiming(false);
    }
  }, [authenticated, walletAddress, login, available, activeChain, ensureActiveNetwork, refreshCooldown]);

  const addTokenToWallet = useCallback(async () => {
    setError(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setError("No wallet detected. Install MetaMask (or another browser wallet) first.");
      return;
    }
    if (!available) return;

    try {
      const tokenAddress = getGiwaUsdcTokenAddress();
      await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: tokenAddress,
            symbol: "USDC",
            decimals: activeChain.usdcDecimals,
          },
        } as unknown as unknown[],
      });
    } catch (err) {
      console.warn("[TwoBlock] Failed to add USDC to wallet:", err);
    }
  }, [available, activeChain]);

  return { available, claiming, error, cooldownRemaining, faucetAmount, claim, addTokenToWallet };
}
