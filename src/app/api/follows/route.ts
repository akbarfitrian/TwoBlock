import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";

function parseWallets(body: { followerWallet?: string; followingWallet?: string }) {
  const { followerWallet, followingWallet } = body;
  if (!followerWallet || !isAddress(followerWallet) || !followingWallet || !isAddress(followingWallet)) {
    return null;
  }
  const follower = getAddress(followerWallet);
  const following = getAddress(followingWallet);
  if (follower === following) return null;
  return { follower, following };
}

export async function POST(req: NextRequest) {
  const wallets = parseWallets(await req.json());
  if (!wallets) return NextResponse.json({ error: "Invalid follow payload" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("follows")
    .upsert(
      { follower_wallet: wallets.follower, following_wallet: wallets.following },
      { onConflict: "follower_wallet,following_wallet", ignoreDuplicates: true }
    );

  if (error) {
    console.error("[TwoBlock] Failed to follow:", error);
    return NextResponse.json({ error: "Failed to follow user" }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    recipient_wallet: wallets.following,
    actor_wallet: wallets.follower,
    type: "follow",
  });

  await completeQuestOnce(supabase, wallets.follower, "first_follow");

  return NextResponse.json({ status: "ok" });
}

export async function DELETE(req: NextRequest) {
  const wallets = parseWallets(await req.json());
  if (!wallets) return NextResponse.json({ error: "Invalid unfollow payload" }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_wallet", wallets.follower)
    .eq("following_wallet", wallets.following);

  if (error) {
    console.error("[TwoBlock] Failed to unfollow:", error);
    return NextResponse.json({ error: "Failed to unfollow user" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
