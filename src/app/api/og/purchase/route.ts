import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash, getAddress, parseEventLogs, formatUnits } from "viem";
import { twoBlockPaymentsAbi, OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";
import { twoBlockPaymentsErc20Abi, OG_PRICE_USDC_GIWA } from "@/shared/contracts/two-block-payments-erc20";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";
import { awardPoints } from "@/shared/points";
import { resolveChain } from "@/backend/lib/resolve-chain";

export async function POST(req: NextRequest) {
  const { wallet, amountUsdc, txRef, chainId } = await req.json();

  let chainKey, chainConfig, contractAddress;
  try {
    ({ chainKey, config: chainConfig, paymentsContractAddress: contractAddress } = resolveChain(chainId));
  } catch (err) {
    console.error("[TwoBlock] Failed to resolve chain for OG purchase:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown chain" }, { status: 400 });
  }

  // Prices happen to be equal (28 USDC) on both chains today, but each
  // chain validates against its own constant so they can drift
  // independently without touching this route.
  const expectedPrice = chainConfig.paymentMode === "erc20" ? OG_PRICE_USDC_GIWA : OG_PRICE_USDC;

  if (
    !wallet || !isAddress(wallet) ||
    typeof amountUsdc !== "number" || Math.abs(amountUsdc - expectedPrice) > 1e-9 ||
    !isHash(txRef)
  ) {
    return NextResponse.json({ error: "Invalid OG purchase payload" }, { status: 400 });
  }

  const checksummed = getAddress(wallet);

  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.chain.rpcUrls.default.http[0]),
  });

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: txRef, timeout: 15_000 });
  } catch (err) {
    console.error(`[TwoBlock] Could not fetch receipt for OG purchase tx ${txRef}:`, err);
    return NextResponse.json({ error: "Could not find that transaction on-chain yet. Try again shortly." }, { status: 400 });
  }

  if (getAddress(receipt.to ?? "0x0000000000000000000000000000000000000000") !== contractAddress) {
    return NextResponse.json({ error: "Transaction was not sent to the TwoBlockPayments contract" }, { status: 400 });
  }

  // Both TwoBlockPayments.sol (Arc) and TwoBlockPaymentsERC20.sol (Giwa)
  // emit an identically-shaped `OGPurchased` event — the address check
  // above already pins the log to the right contract, this just picks the
  // right ABI shape to decode it with.
  const [purchaseEvent] =
    chainConfig.paymentMode === "erc20"
      ? parseEventLogs({ abi: twoBlockPaymentsErc20Abi, eventName: "OGPurchased", logs: receipt.logs })
      : parseEventLogs({ abi: twoBlockPaymentsAbi, eventName: "OGPurchased", logs: receipt.logs });

  if (!purchaseEvent) {
    return NextResponse.json({ error: "Transaction did not emit an OGPurchased event" }, { status: 400 });
  }

  const { wallet: onChainWallet, amount: onChainAmountWei } = purchaseEvent.args;
  const onChainAmountUsdc = Number(formatUnits(onChainAmountWei, chainConfig.usdcDecimals));

  if (
    getAddress(onChainWallet) !== checksummed ||
    Math.abs(onChainAmountUsdc - amountUsdc) > 1e-9
  ) {
    return NextResponse.json({ error: "On-chain event doesn't match the submitted purchase details" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // og_member_since_block comes straight from the confirmed receipt, so it
  // can't be backdated by a client-submitted value. is_og itself is set
  // globally by purchase_og() regardless of p_chain_id — see
  // 0019_multichain_support.sql — chain_id here is provenance only.
  const { data: purchase, error: rpcError } = await supabase.rpc("purchase_og", {
    p_wallet_address: checksummed,
    p_amount_usdc: amountUsdc,
    p_tx_ref: txRef,
    p_block_number: Number(receipt.blockNumber),
    p_chain_id: chainKey,
  });

  if (rpcError) {
    console.error("[TwoBlock] Failed purchase_og:", rpcError);
    return NextResponse.json({ error: rpcError.message ?? "Failed to process OG purchase" }, { status: 400 });
  }

  await completeQuestOnce(supabase, checksummed, "get_og");
  // Deduped by (wallet, event_type, ref_id) via idx_point_events_onetime,
  // so a retried purchase confirmation can't double-award this bonus.
  await awardPoints(supabase, checksummed, "og_purchase_bonus", 50, txRef);

  waitUntil(
    (async () => {
      try {
        await supabase
          .from("og_purchases")
          .update({ tx_status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("tx_ref", txRef);
      } catch (err) {
        console.error(`[TwoBlock] Failed to finalize tx status for OG purchase ${txRef}:`, err);
      }
    })()
  );

  return NextResponse.json({ status: receipt.status === "success" ? "confirmed" : "failed", purchase });
}
