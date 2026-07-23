import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

const REFERRAL_CODE_RE = /^[A-Za-z0-9]{8}$/;

// Submitting a referral code is not limited to onboarding — a wallet
// without a referrer yet can call this at any time, e.g. if the
// referrer's slots were full initially and open up later, or to retry a
// different code entirely.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  const referralCode = body?.referralCode;

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (typeof referralCode !== "string" || !REFERRAL_CODE_RE.test(referralCode)) {
    return NextResponse.json({ success: false, reason: "invalid_code" }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.rpc("apply_referral", {
    p_wallet_address: checksummed,
    p_referral_code: referralCode,
  });

  if (error) {
    console.error("[TwoBlock] Failed to apply referral:", error);
    return NextResponse.json({ error: "Failed to submit referral code" }, { status: 500 });
  }

  const result = data?.[0] ?? { success: false, reason: "invalid_code" };
  return NextResponse.json(result);
}
