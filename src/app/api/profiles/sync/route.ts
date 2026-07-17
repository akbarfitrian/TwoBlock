import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { walletAddress } = await req.json();

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { wallet_address: checksummed, updated_at: new Date().toISOString() },
      { onConflict: "wallet_address", ignoreDuplicates: false }
    )
    .select("wallet_address, username, avatar_url, verification_tier")
    .single();

  if (error) {
    console.error("[TwoBlock] Failed to sync profile:", error);
    return NextResponse.json({ error: "Failed to sync profile" }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
