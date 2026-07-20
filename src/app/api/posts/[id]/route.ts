import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { getTierLimits } from "@/shared/tier-limits";

const EDIT_WINDOW_MS = 5 * 60 * 1000;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { walletAddress, content } = await req.json();

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Post content can't be empty" }, { status: 400 });
  }
  const checksummed = getAddress(walletAddress);
  const trimmed = content.trim();

  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_og")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found. Connect your wallet first." }, { status: 404 });
  }

  const limits = getTierLimits(profile.is_og);
  if (!limits.canEditPost) {
    return NextResponse.json({ error: "Editing posts is only available for OG members" }, { status: 403 });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_wallet, post_type, repost_of, created_at, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (postError || !post || post.deleted_at) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.author_wallet !== checksummed) {
    return NextResponse.json({ error: "You can only edit your own posts" }, { status: 403 });
  }
  if (post.repost_of) {
    return NextResponse.json({ error: "Reposts can't be edited" }, { status: 400 });
  }
  if (post.post_type !== "text") {
    return NextResponse.json({ error: "Only text posts can be edited" }, { status: 400 });
  }
  if (Date.now() - new Date(post.created_at).getTime() > EDIT_WINDOW_MS) {
    return NextResponse.json({ error: "The 5-minute edit window has passed" }, { status: 403 });
  }
  if (trimmed.length > limits.maxPostChars) {
    return NextResponse.json({ error: `Post exceeds the ${limits.maxPostChars} character limit` }, { status: 400 });
  }

  const { error: updateError } = await supabase.from("posts").update({ content: trimmed }).eq("id", id);

  if (updateError) {
    console.error("[TwoBlock] Failed to edit post:", updateError);
    return NextResponse.json({ error: "Failed to edit post" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { walletAddress } = await req.json();

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  const checksummed = getAddress(walletAddress);

  const supabase = createSupabaseServerClient();

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id, author_wallet, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.author_wallet !== checksummed) {
    return NextResponse.json({ error: "You can only delete your own posts" }, { status: 403 });
  }

  // Hard delete: the DB foreign keys cascade this to the post's reactions,
  // poll votes, tips, and any reposts of it (see migration 0013).
  const { error: deleteError } = await supabase.from("posts").delete().eq("id", id);

  if (deleteError) {
    console.error("[TwoBlock] Failed to delete post:", deleteError);
    return NextResponse.json({ error: "Failed to delete post" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
