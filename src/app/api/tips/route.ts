import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash, parseEventLogs, getAddress } from "viem";
import { activeArcChain } from "@/lib/arc/chain";
import { twoBlockPaymentsAbi, getTwoBlockPaymentsAddress } from "@/lib/contracts/twoBlockPayments";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeQuestOnce } from "@/lib/quests";

const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(activeArcChain.rpcUrls.default.http[0]),
});

export async function POST(req: NextRequest) {
  const { fromWallet, toWallet, postId, amountUsdc, txRef } = await req.json();

  if (![fromWallet, toWallet].every((addr) => isAddress(addr)) || !isHash(txRef) || amountUsdc <= 0) {
    return NextResponse.json({ error: "Invalid tip payload" }, { status: 400 });
  }

  if (fromWallet.toLowerCase() === toWallet.toLowerCase()) {
    return NextResponse.json({ error: "You can't tip yourself" }, { status: 400 });
  }

  // The tip now goes through the TwoBlockPayments contract instead of a raw
  // P2P transfer, so we don't have to trust the client's fromWallet/toWallet/
  // amountUsdc at all — pull them straight from the on-chain `Tipped` event
  // and reject if they don't match what was submitted.
  let contractAddress;
  try {
    contractAddress = getTwoBlockPaymentsAddress();
  } catch (err) {
    console.error("[TwoBlock] Payments contract address not configured:", err);
    return NextResponse.json({ error: "Payments contract is not configured on the server" }, { status: 500 });
  }

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

  const [tippedEvent] = parseEventLogs({
    abi: twoBlockPaymentsAbi,
    eventName: "Tipped",
    logs: receipt.logs,
  });

  if (!tippedEvent) {
    return NextResponse.json({ error: "Transaction did not emit a Tipped event" }, { status: 400 });
  }

  const { from: onChainFrom, to: onChainTo, amount: onChainAmountWei } = tippedEvent.args;
  const onChainAmountUsdc = Number(onChainAmountWei) / 1e18;

  if (
    getAddress(onChainFrom) !== getAddress(fromWallet) ||
    getAddress(onChainTo) !== getAddress(toWallet) ||
    Math.abs(onChainAmountUsdc - amountUsdc) > 1e-9
  ) {
    return NextResponse.json({ error: "On-chain event doesn't match the submitted tip details" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { error: insertError } = await supabase
    .from("tips")
    .upsert(
      {
        from_wallet: fromWallet,
        to_wallet: toWallet,
        post_id: postId,
        amount_usdc: amountUsdc,
        tx_ref: txRef,
        tx_status: receipt.status === "success" ? "confirmed" : "failed",
      },
      { onConflict: "tx_ref", ignoreDuplicates: true }
    );

  if (insertError) {
    console.error("[TwoBlock] Failed to save tip:", insertError);
    return NextResponse.json({ error: `Failed to save tip: ${insertError.message}` }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    recipient_wallet: toWallet,
    actor_wallet: fromWallet,
    type: "tip",
    post_id: postId,
  });

  await completeQuestOnce(supabase, fromWallet, "first_tip_sent");

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
