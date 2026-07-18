import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash, getAddress, parseEventLogs } from "viem";
import { activeArcChain } from "@/shared/chain";
import {
  twoBlockPaymentsAbi,
  getTwoBlockPaymentsAddress,
  indexToTier,
  indexToBilling,
} from "@/shared/contracts/two-block-payments";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";

const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(activeArcChain.rpcUrls.default.http[0]),
});

const VALID_TIERS = ["verified", "verified_pro", "verified_max"];
const VALID_BILLING = ["monthly", "yearly"];

export async function POST(req: NextRequest) {
  const { wallet, tier, billing, amountUsdc, txRef } = await req.json();

  if (
    !wallet || !isAddress(wallet) ||
    !VALID_TIERS.includes(tier) ||
    !VALID_BILLING.includes(billing) ||
    typeof amountUsdc !== "number" || amountUsdc <= 0 ||
    !isHash(txRef)
  ) {
    return NextResponse.json({ error: "Invalid verification purchase payload" }, { status: 400 });
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
    console.error(`[TwoBlock] Could not fetch receipt for verification purchase tx ${txRef}:`, err);
    return NextResponse.json({ error: "Could not find that transaction on-chain yet. Try again shortly." }, { status: 400 });
  }

  if (getAddress(receipt.to ?? "0x0000000000000000000000000000000000000000") !== contractAddress) {
    return NextResponse.json({ error: "Transaction was not sent to the TwoBlockPayments contract" }, { status: 400 });
  }

  const [purchaseEvent] = parseEventLogs({
    abi: twoBlockPaymentsAbi,
    eventName: "VerificationPurchased",
    logs: receipt.logs,
  });

  if (!purchaseEvent) {
    return NextResponse.json({ error: "Transaction did not emit a VerificationPurchased event" }, { status: 400 });
  }

  const { wallet: onChainWallet, tier: onChainTierIndex, billing: onChainBillingIndex, amount: onChainAmountWei } =
    purchaseEvent.args;
  const onChainAmountUsdc = Number(onChainAmountWei) / 1e18;
  const onChainTier = indexToTier(onChainTierIndex);
  const onChainBilling = indexToBilling(onChainBillingIndex);

  if (
    getAddress(onChainWallet) !== checksummed ||
    onChainTier !== tier ||
    onChainBilling !== billing ||
    Math.abs(onChainAmountUsdc - amountUsdc) > 1e-9
  ) {
    return NextResponse.json({ error: "On-chain event doesn't match the submitted purchase details" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { data: pricing, error: pricingError } = await supabase
    .from("verification_pricing")
    .select("monthly_price_usdc, annual_discount")
    .eq("tier", tier)
    .single();

  if (pricingError || !pricing) {
    return NextResponse.json({ error: "Tier not found in verification_pricing" }, { status: 400 });
  }

  const expectedPrice =
    billing === "yearly"
      ? Math.round(pricing.monthly_price_usdc * 12 * (1 - pricing.annual_discount) * 1e6) / 1e6
      : Number(pricing.monthly_price_usdc);

  if (Math.abs(amountUsdc - expectedPrice) > 1e-6) {
    return NextResponse.json(
      { error: `Jumlah pembayaran tidak sesuai harga ${billing} untuk tier ${tier} (seharusnya ${expectedPrice} USDC)` },
      { status: 400 }
    );
  }

  const { data: purchase, error: rpcError } = await supabase.rpc("purchase_verification", {
    p_wallet_address: checksummed,
    p_tier: tier,
    p_billing: billing,
    p_amount_usdc: amountUsdc,
    p_tx_ref: txRef,
  });

  if (rpcError) {
    console.error("[TwoBlock] Failed purchase_verification:", rpcError);
    return NextResponse.json({ error: rpcError.message ?? "Failed to process verification purchase" }, { status: 400 });
  }

  await completeQuestOnce(supabase, checksummed, "get_verified");

  waitUntil(
    (async () => {
      try {
        await supabase
          .from("verification_purchases")
          .update({ tx_status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("tx_ref", txRef);
      } catch (err) {
        console.error(`[TwoBlock] Failed to finalize tx status for purchase ${txRef}:`, err);
      }
    })()
  );

  return NextResponse.json({ status: receipt.status === "success" ? "confirmed" : "failed", purchase });
}
