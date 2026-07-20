import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  const username = body?.username;

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (typeof username !== "string" || !USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-20 characters, letters/numbers/underscore only." },
      { status: 400 }
    );
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("username")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (fetchError) {
    console.error("[TwoBlock] Failed to check profile before onboarding:", fetchError);
    return NextResponse.json({ error: "Failed to check profile" }, { status: 500 });
  }

  if (existing?.username) {
    return NextResponse.json({ error: "This wallet already has a username." }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { wallet_address: checksummed, username, username_changed_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "wallet_address" }
    )
    .select("wallet_address, username, avatar_url, is_og")
    .single();

  if (error) {

    if (error.code === "23505") {
      return NextResponse.json({ error: "Username is taken, try another one." }, { status: 409 });
    }
    console.error("[TwoBlock] Failed to save onboarding username:", error);
    return NextResponse.json({ error: "Failed to save username." }, { status: 500 });
  }

  return NextResponse.json({ profile: data });
}
