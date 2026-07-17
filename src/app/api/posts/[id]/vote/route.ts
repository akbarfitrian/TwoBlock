import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const postId = params.id;
  const { walletAddress, optionIndex } = await req.json();

  if (!UUID_RE.test(postId) || !walletAddress || !isAddress(walletAddress) || typeof optionIndex !== "number") {
    return NextResponse.json({ error: "Invalid vote payload" }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("poll_votes")
    .insert({ post_id: postId, wallet_address: checksummed, option_index: optionIndex });

  if (error) {

    if (error.code === "23505") {
      return NextResponse.json({ error: "You already voted in this poll" }, { status: 409 });
    }
    console.error("[TwoBlock] Failed to save vote:", error);
    return NextResponse.json({ error: error.message ?? "Failed to save vote" }, { status: 400 });
  }

  return NextResponse.json({ status: "ok" });
}
