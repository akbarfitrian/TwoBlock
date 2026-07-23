"use client";

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
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { twoBlockPaymentsAbi, getTwoBlockPaymentsAddress } from "@/shared/contracts/two-block-payments";
import {
  twoBlockPaymentsErc20Abi,
  usdcAbi,
  getGiwaPaymentsAddress,
} from "@/shared/contracts/two-block-payments-erc20";
import { getGiwaUsdcTokenAddress } from "@/shared/chain";

export interface SendTipParams {
  toWallet: Address;
  amountUsdc: number;
  postId?: string;
  /// Called right before each wallet prompt so the UI can show
  /// "Approving…" vs "Sending…" — Arc only ever fires "sending" (it's a
  /// single native tx); Giwa fires "approving" first if the current
  /// allowance isn't enough, then "sending".
  onStep?: (step: "approving" | "sending") => void;
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
  const { activeChain, activeChainKey } = useActiveChain();

  const sendTip = async ({ toWallet, amountUsdc, postId, onStep }: SendTipParams): Promise<SendTipResult> => {
    if (amountUsdc <= 0) throw new Error("Tip amount must be greater than 0");
    if (typeof window === "undefined" || !window.ethereum) {
      throw new Error("No wallet detected. Install MetaMask (or another browser wallet) first.");
    }

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
      console.warn(`[TwoBlock] Failed to ensure ${chain.name} network before sending tip:`, err);
    });

    const amountBaseUnits = parseUnits(amountUsdc.toString(), activeChain.usdcDecimals);

    const MAX_ATTEMPTS = 3;
    let hash: `0x${string}` | undefined;

    if (activeChain.paymentMode === "erc20") {
      // Giwa: two-step tx — approve() first (only if the current allowance
      // is insufficient), then tip() pulls the tokens via transferFrom.
      const tokenAddress = getGiwaUsdcTokenAddress();
      const paymentsAddress = getGiwaPaymentsAddress();

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

      if (currentAllowance < amountBaseUnits) {
        onStep?.("approving");
        const approveHash = await walletClient.writeContract({
          account: fromWallet,
          chain,
          address: tokenAddress,
          abi: usdcAbi,
          functionName: "approve",
          args: [paymentsAddress, maxUint256],
        });
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
      }

      onStep?.("sending");
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          hash = await walletClient.writeContract({
            account: fromWallet,
            chain,
            address: paymentsAddress,
            abi: twoBlockPaymentsErc20Abi,
            functionName: "tip",
            args: [toWallet, amountBaseUnits, postId ?? ""],
          });
          break;
        } catch (err) {
          const isLastAttempt = attempt === MAX_ATTEMPTS;
          if (!isRpcRateLimitError(err) || isLastAttempt) {
            if (isRpcRateLimitError(err)) {
              throw new Error(
                "Giwa's testnet RPC is rate-limited right now (too many people testing at once). Please wait a few seconds and try again."
              );
            }
            throw err;
          }
          console.warn(`[TwoBlock] RPC rate-limited, retrying (${attempt}/${MAX_ATTEMPTS})…`, err);
          await sleep(attempt * 1500);
        }
      }
    } else {
      const contractAddress = getTwoBlockPaymentsAddress();

      onStep?.("sending");
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          hash = await walletClient.writeContract({
            account: fromWallet,
            chain,
            address: contractAddress,
            abi: twoBlockPaymentsAbi,
            functionName: "tip",
            args: [toWallet, postId ?? ""],
            value: amountBaseUnits,
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
        chainId: activeChainKey,
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
