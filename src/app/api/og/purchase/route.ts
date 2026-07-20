import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash, getAddress, parseEventLogs } from "viem";
import { activeArcChain } from "@/shared/chain";
import {
  twoBlockPaymentsAbi,
  getTwoBlockPaymentsAddress,
  OG_PRICE_USDC,
} from "@/shared/contracts/two-block-payments";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";

const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(activeArcChain.rpcUrls.default.http[0]),
});

export async function POST(req: NextRequest) {
  const { wallet, amountUsdc, txRef } = await req.json();

  if (
    !wallet || !isAddress(wallet) ||
    typeof amountUsdc !== "number" || Math.abs(amountUsdc - OG_PRICE_USDC) > 1e-9 ||
    !isHash(txRef)
  ) {
    return NextResponse.json({ error: "Invalid OG purchase payload" }, { status: 400 });
  }

  const checksummed = getAddress(wallet);

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
    console.error(`[TwoBlock] Could not fetch receipt for OG purchase tx ${txRef}:`, err);
    return NextResponse.json({ error: "Could not find that transaction on-chain yet. Try again shortly." }, { status: 400 });
  }

  if (getAddress(receipt.to ?? "0x0000000000000000000000000000000000000000") !== contractAddress) {
    return NextResponse.json({ error: "Transaction was not sent to the TwoBlockPayments contract" }, { status: 400 });
  }

  const [purchaseEvent] = parseEventLogs({
    abi: twoBlockPaymentsAbi,
    eventName: "OGPurchased",
    logs: receipt.logs,
  });

  if (!purchaseEvent) {
    return NextResponse.json({ error: "Transaction did not emit an OGPurchased event" }, { status: 400 });
  }

  const { wallet: onChainWallet, amount: onChainAmountWei } = purchaseEvent.args;
  const onChainAmountUsdc = Number(onChainAmountWei) / 1e18;

  if (
    getAddress(onChainWallet) !== checksummed ||
    Math.abs(onChainAmountUsdc - amountUsdc) > 1e-9
  ) {
    return NextResponse.json({ error: "On-chain event doesn't match the submitted purchase details" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  // og_member_since_block comes straight from the confirmed receipt, so it
  // can't be backdated by a client-submitted value.
  const { data: purchase, error: rpcError } = await supabase.rpc("purchase_og", {
    p_wallet_address: checksummed,
    p_amount_usdc: amountUsdc,
    p_tx_ref: txRef,
    p_block_number: Number(receipt.blockNumber),
  });

  if (rpcError) {
    console.error("[TwoBlock] Failed purchase_og:", rpcError);
    return NextResponse.json({ error: rpcError.message ?? "Failed to process OG purchase" }, { status: 400 });
  }

  await completeQuestOnce(supabase, checksummed, "get_og");

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
