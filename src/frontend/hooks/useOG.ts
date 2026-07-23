"use client";

import { useCallback, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  getAddress,
  http,
  maxUint256,
  parseUnits,
  type Address,
} from "viem";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { twoBlockPaymentsAbi, getTwoBlockPaymentsAddress, OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";
import {
  twoBlockPaymentsErc20Abi,
  usdcAbi,
  getGiwaPaymentsAddress,
  OG_PRICE_USDC_GIWA,
} from "@/shared/contracts/two-block-payments-erc20";
import { getGiwaUsdcTokenAddress } from "@/shared/chain";

/// "approving" only ever shows up on erc20 chains (Giwa) — Arc's native
/// flow goes straight from "idle" to "purchasing" in one wallet prompt.
export type OGPurchaseStep = "idle" | "approving" | "purchasing";

export interface UseOGState {
  purchasing: boolean;
  step: OGPurchaseStep;
  error: string | null;

  purchase: () => Promise<void>;
}

export function useOG(): UseOGState {
  const { walletAddress, authenticated, login } = useTwoBlockAuth();
  const { refresh: refreshProfile } = useProfile();
  const { activeChain, activeChainKey } = useActiveChain();
  const [purchasing, setPurchasing] = useState(false);
  const [step, setStep] = useState<OGPurchaseStep>("idle");
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
    setStep("purchasing");
    try {
      const chain = activeChain.chain;
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as Address[];
      const fromWallet = accounts[0] ? getAddress(accounts[0]) : undefined;
      if (!fromWallet) throw new Error("No wallet connected");

      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum),
      });

      await walletClient.switchChain({ id: chain.id }).catch((err) => {
        console.warn(`[TwoBlock] Failed to ensure ${chain.name} network before purchasing OG:`, err);
      });

      let txHash: `0x${string}`;
      let amountUsdc: number;

      if (activeChain.paymentMode === "erc20") {
        // Giwa: TwoBlockPaymentsERC20 pulls funds via transferFrom, so the
        // wallet needs to have approved this contract first. We only
        // prompt for approve() if the current allowance is insufficient —
        // approving `maxUint256` means this is a one-time step per wallet
        // rather than a signature on every single tip/purchase.
        amountUsdc = OG_PRICE_USDC_GIWA;
        const tokenAddress = getGiwaUsdcTokenAddress();
        const paymentsAddress = getGiwaPaymentsAddress();
        const requiredAmount = parseUnits(amountUsdc.toString(), activeChain.usdcDecimals);

        const publicClient = createPublicClient({
          chain,
          transport: http(chain.rpcUrls.default.http[0]),
        });

        const currentAllowance = await publicClient.readContract({
          address: tokenAddress,
          abi: usdcAbi,
          functionName: "allowance",
          args: [fromWallet, paymentsAddress],
        });

        if (currentAllowance < requiredAmount) {
          setStep("approving");
          const approveHash = await walletClient.writeContract({
            account: fromWallet,
            chain,
            address: tokenAddress,
            abi: usdcAbi,
            functionName: "approve",
            args: [paymentsAddress, maxUint256],
          });
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          setStep("purchasing");
        }

        txHash = await walletClient.writeContract({
          account: fromWallet,
          chain,
          address: paymentsAddress,
          abi: twoBlockPaymentsErc20Abi,
          functionName: "purchaseOG",
          args: [],
        });
      } else {
        amountUsdc = OG_PRICE_USDC;
        const contractAddress = getTwoBlockPaymentsAddress();

        txHash = await walletClient.writeContract({
          account: fromWallet,
          chain,
          address: contractAddress,
          abi: twoBlockPaymentsAbi,
          functionName: "purchaseOG",
          args: [],
          value: parseUnits(amountUsdc.toString(), activeChain.usdcDecimals),
        });
      }

      const res = await fetch("/api/og/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: walletAddress,
          amountUsdc,
          txRef: txHash,
          chainId: activeChainKey,
        }),
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
      setStep("idle");
    }
  }, [authenticated, walletAddress, login, refreshProfile, activeChain, activeChainKey]);

  return { purchasing, step, error, purchase };
}
