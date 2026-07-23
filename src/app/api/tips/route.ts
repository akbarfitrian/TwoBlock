import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash, parseEventLogs, getAddress, formatUnits } from "viem";
import { twoBlockPaymentsAbi } from "@/shared/contracts/two-block-payments";
import { twoBlockPaymentsErc20Abi } from "@/shared/contracts/two-block-payments-erc20";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";
import { awardTipSentPoints, awardTipReceivedPoints } from "@/shared/points";
import { resolveChain } from "@/backend/lib/resolve-chain";

export async function POST(req: NextRequest) {
  const { fromWallet, toWallet, postId, amountUsdc, txRef, chainId } = await req.json();

  if (![fromWallet, toWallet].every((addr) => isAddress(addr)) || !isHash(txRef) || amountUsdc <= 0) {
    return NextResponse.json({ error: "Invalid tip payload" }, { status: 400 });
  }

  if (fromWallet.toLowerCase() === toWallet.toLowerCase()) {
    return NextResponse.json({ error: "You can't tip yourself" }, { status: 400 });
  }

  let chainKey, chainConfig, contractAddress;
  try {
    ({ chainKey, config: chainConfig, paymentsContractAddress: contractAddress } = resolveChain(chainId));
  } catch (err) {
    console.error("[TwoBlock] Failed to resolve chain for tip:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown chain" }, { status: 400 });
  }

  const publicClient = createPublicClient({
    chain: chainConfig.chain,
    transport: http(chainConfig.chain.rpcUrls.default.http[0]),
  });

  let receipt;
  try {
    receipt = await publicClient.waitForTransactionReceipt({ hash: txRef, timeout: 15_000 });
  } catch (err) {
    console.error(`[TwoBlock] Could not fetch receipt for tip tx ${txRef}:`, err);
    return NextResponse.json({ error: "Could not find that transaction on-chain yet. Try again shortly." }, { status: 400 });
  }

  if (getAddress(receipt.to ?? "0x0000000000000000000000000000000000000000") !== contractAddress) {
    return NextResponse.json({ error: "Transaction was not sent to the TwoBlockPayments contract" }, { status: 400 });
  }

  // Both TwoBlockPayments.sol (Arc) and TwoBlockPaymentsERC20.sol (Giwa)
  // emit an identically-shaped `Tipped` event, so we still branch on which
  // ABI to decode with — the address check above already pins the log to
  // the right contract, this just picks the right shape to read it as.
  const [tippedEvent] =
    chainConfig.paymentMode === "erc20"
      ? parseEventLogs({ abi: twoBlockPaymentsErc20Abi, eventName: "Tipped", logs: receipt.logs })
      : parseEventLogs({ abi: twoBlockPaymentsAbi, eventName: "Tipped", logs: receipt.logs });

  if (!tippedEvent) {
    return NextResponse.json({ error: "Transaction did not emit a Tipped event" }, { status: 400 });
  }

  const { from: onChainFrom, to: onChainTo, amount: onChainAmountWei, fee: onChainFeeWei } = tippedEvent.args;
  const onChainAmountUsdc = Number(formatUnits(onChainAmountWei, chainConfig.usdcDecimals));
  // amount_usdc keeps meaning "gross amount the sender paid" — unaffected by
  // the fee — so this check against the client-submitted amount is unchanged.
  const onChainFeeUsdc = Number(formatUnits(onChainFeeWei, chainConfig.usdcDecimals));
  const onChainNetUsdc = onChainAmountUsdc - onChainFeeUsdc;

  if (
    getAddress(onChainFrom) !== getAddress(fromWallet) ||
    getAddress(onChainTo) !== getAddress(toWallet) ||
    Math.abs(onChainAmountUsdc - amountUsdc) > 1e-9
  ) {
    return NextResponse.json({ error: "On-chain event doesn't match the submitted tip details" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // ignoreDuplicates: true means a conflicting tx_ref silently no-ops
  // instead of erroring — .select() lets us tell a genuinely new insert
  // (row returned) apart from a deduped retry (no row returned), so a
  // retried /api/tips call (e.g. after a network hiccup) can't
  // double-notify, double-complete-quest, or double-award points.
  const { data: insertedTip, error: insertError } = await supabase
    .from("tips")
    .upsert(
      {
        from_wallet: fromWallet,
        to_wallet: toWallet,
        post_id: postId,
        amount_usdc: amountUsdc,
        fee_usdc: onChainFeeUsdc,
        net_amount_usdc: onChainNetUsdc,
        tx_ref: txRef,
        tx_status: receipt.status === "success" ? "confirmed" : "failed",
        chain_id: chainKey,
      },
      { onConflict: "tx_ref", ignoreDuplicates: true }
    )
    .select("tx_ref")
    .maybeSingle();

  if (insertError) {
    console.error("[TwoBlock] Failed to save tip:", insertError);
    return NextResponse.json({ error: `Failed to save tip: ${insertError.message}` }, { status: 500 });
  }

  const isNewTip = !!insertedTip;

  if (isNewTip) {
    await supabase.from("notifications").insert({
      recipient_wallet: toWallet,
      actor_wallet: fromWallet,
      type: "tip",
      post_id: postId,
    });

    await completeQuestOnce(supabase, fromWallet, "first_tip_sent");
    await awardTipSentPoints(supabase, fromWallet, amountUsdc, txRef);
    await awardTipReceivedPoints(supabase, toWallet, onChainNetUsdc, txRef);
  }

  waitUntil(
    (async () => {
      try {
        await supabase
          .from("tips")
          .update({ tx_status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("tx_ref", txRef);
      } catch (err) {
        console.error(`[TwoBlock] Failed to finalize tx status for tip ${txRef}:`, err);
      }
    })()
  );

  return NextResponse.json({ status: receipt.status === "success" ? "confirmed" : "failed", txRef });
}
