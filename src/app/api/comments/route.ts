import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { MAX_COMMENT_CHARS } from "@/shared/comment-limits";
import { completeDailyQuestOnce } from "@/shared/points";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

// Matches the same @username pattern the client renders as a link (see
// src/frontend/lib/linkify.tsx) so "mentioned" here means "will actually
// show up as a tappable mention" for the recipient.
const MENTION_RE = /(?:^|\s)@([a-zA-Z0-9_]{3,20})/g;

function extractMentionedUsernames(content: string): string[] {
  const usernames = new Set<string>();
  for (const match of content.matchAll(MENTION_RE)) {
    usernames.add(match[1]);
  }
  return [...usernames];
}

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get("postId");
  if (!isUUID(postId)) {
    return NextResponse.json({ error: "Invalid postId parameter" }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_wallet_fkey(wallet_address, username, avatar_url, is_og, total_points)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[TwoBlock] Failed to fetch comments:", error);
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { walletAddress, postId, content } = await req.json();

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (!isUUID(postId)) {
    return NextResponse.json({ error: "Invalid postId" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Comment can't be empty" }, { status: 400 });
  }
  const trimmed = content.trim();
  if (trimmed.length > MAX_COMMENT_CHARS) {
    return NextResponse.json({ error: `Comment exceeds the ${MAX_COMMENT_CHARS} character limit` }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found. Connect your wallet first." }, { status: 404 });
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("author_wallet")
    .eq("id", postId)
    .is("deleted_at", null)
    .maybeSingle();

  if (postError || !post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const { data: comment, error: insertError } = await supabase
    .from("comments")
    .insert({ post_id: postId, author_wallet: checksummed, content: trimmed })
    .select("*, author:profiles!comments_author_wallet_fkey(wallet_address, username, avatar_url, is_og, total_points)")
    .single();

  if (insertError) {
    console.error("[TwoBlock] Failed to create comment:", insertError);
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 });
  }

  await completeDailyQuestOnce(supabase, checksummed, "daily_comment");

  const notifiedWallets = new Set<string>([checksummed]);

  if (!notifiedWallets.has(post.author_wallet)) {
    notifiedWallets.add(post.author_wallet);
    await supabase.from("notifications").insert({
      recipient_wallet: post.author_wallet,
      actor_wallet: checksummed,
      type: "comment",
      post_id: postId,
      comment_id: comment.id,
    });
  }

  const mentionedUsernames = extractMentionedUsernames(trimmed);
  if (mentionedUsernames.length > 0) {
    const { data: mentionedProfiles } = await supabase
      .from("profiles")
      .select("wallet_address, username")
      .in("username", mentionedUsernames);

    for (const mentioned of mentionedProfiles ?? []) {
      if (notifiedWallets.has(mentioned.wallet_address)) continue;
      notifiedWallets.add(mentioned.wallet_address);
      await supabase.from("notifications").insert({
        recipient_wallet: mentioned.wallet_address,
        actor_wallet: checksummed,
        type: "mention",
        post_id: postId,
        comment_id: comment.id,
      });
    }
  }

  return NextResponse.json({ comment });
}
