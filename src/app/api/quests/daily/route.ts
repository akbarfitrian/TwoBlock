import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { DAILY_QUEST_CATALOG, completeDailyQuestOnce } from "@/shared/points";

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const me = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("daily_quests")
    .select("quest_key")
    .eq("wallet_address", me)
    .eq("quest_date", todayUtcDateString());

  if (error) {
    console.error("[TwoBlock] Failed to fetch daily quests:", error);
    return NextResponse.json({ error: "Failed to load daily quests" }, { status: 500 });
  }

  const completedKeys = new Set((data ?? []).map((row) => row.quest_key));
  const quests = DAILY_QUEST_CATALOG.map((def) => ({
    key: def.key,
    title: def.title,
    description: def.description,
    icon: def.icon,
    points: def.points,
    completed: completedKeys.has(def.key),
  }));

  return NextResponse.json({ quests });
}

// Only quests the client can trigger directly (right now: daily_login,
// "open the app today") go through this endpoint. Action-based daily
// quests (daily_post, daily_comment, daily_react) are instead completed
// server-side from their own routes (api/posts, api/comments,
// api/reactions) so they can't be faked by calling this endpoint with an
// arbitrary key.
const CLIENT_TRIGGERABLE_KEYS = new Set(["daily_login"]);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  const questKey = body?.questKey;

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  if (typeof questKey !== "string" || !CLIENT_TRIGGERABLE_KEYS.has(questKey)) {
    return NextResponse.json({ error: "Invalid or non-triggerable quest key" }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found. Connect your wallet first." }, { status: 404 });
  }

  await completeDailyQuestOnce(supabase, checksummed, questKey);

  return NextResponse.json({ status: "ok" });
}
