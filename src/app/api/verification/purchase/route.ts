import { NextRequest, NextResponse, after } from "next/server";
import { createPublicClient, http, isAddress, isHash, getAddress } from "viem";
import { activeArcChain } from "@/lib/arc/chain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeQuestOnce } from "@/lib/quests";

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

  try {
    after(async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txRef, timeout: 15_000 });
        await supabase
          .from("verification_purchases")
          .update({ tx_status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("tx_ref", txRef);
      } catch (err) {
        console.error(`[TwoBlock] Verifikasi tx pembelian ${txRef} gagal:`, err);
        await supabase.from("verification_purchases").update({ tx_status: "failed" }).eq("tx_ref", txRef);
      }
    });
  } catch (err) {
    console.error("[TwoBlock] after() unavailable, skipping background tx verification:", err);
  }

  return NextResponse.json({ status: "pending", purchase });
}
