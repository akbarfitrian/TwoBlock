import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export async function POST(req: NextRequest) {
  const { walletAddress, postId, reaction } = await req.json();

  if (!walletAddress || !isAddress(walletAddress) || !isUUID(postId) || !["agree", "disagree"].includes(reaction)) {
    return NextResponse.json({ error: "Invalid reaction payload" }, { status: 400 });
  }
  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data: post } = await supabase.from("posts").select("author_wallet").eq("id", postId).maybeSingle();

  const { error } = await supabase
    .from("post_reactions")
    .upsert(
      { post_id: postId, wallet_address: checksummed, reaction_type: reaction },
      { onConflict: "post_id,wallet_address" }
    );

  if (error) {
    console.error("[TwoBlock] Failed to save reaction:", error);
    return NextResponse.json({ error: "Failed to save reaction" }, { status: 500 });
  }

  if (post && post.author_wallet !== checksummed) {
    await supabase.from("notifications").insert({
      recipient_wallet: post.author_wallet,
      actor_wallet: checksummed,
      type: "reaction",
      post_id: postId,
    });
  }

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(req: NextRequest) {
  const { walletAddress, postId } = await req.json();

  if (!walletAddress || !isAddress(walletAddress) || !isUUID(postId)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("post_reactions")
    .delete()
    .eq("post_id", postId)
    .eq("wallet_address", checksummed);

  if (error) {
    console.error("[TwoBlock] Failed to remove reaction:", error);
    return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
