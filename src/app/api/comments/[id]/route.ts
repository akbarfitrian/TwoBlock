import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { walletAddress } = await req.json();

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  const checksummed = getAddress(walletAddress);

  const supabase = createSupabaseServerClient();

  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .select("id, author_wallet")
    .eq("id", id)
    .maybeSingle();

  if (commentError || !comment) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  if (comment.author_wallet !== checksummed) {
    return NextResponse.json({ error: "You can only delete your own comments" }, { status: 403 });
  }

  const { error: deleteError } = await supabase.from("comments").delete().eq("id", id);

  if (deleteError) {
    console.error("[TwoBlock] Failed to delete comment:", deleteError);
    return NextResponse.json({ error: "Failed to delete comment" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
