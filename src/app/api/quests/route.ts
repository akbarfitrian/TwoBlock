import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { QUEST_CATALOG } from "@/lib/quests";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const me = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("quests")
    .select("quest_key, progress, target, completed_at")
    .eq("wallet_address", me);

  if (error) {
    console.error("[TwoBlock] Failed to fetch quests:", error);
    return NextResponse.json({ error: "Failed to load quests" }, { status: 500 });
  }

  const byKey = new Map((data ?? []).map((row) => [row.quest_key, row]));
  const quests = QUEST_CATALOG.map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      title: def.title,
      description: def.description,
      icon: def.icon,
      target: def.target,
      progress: row?.progress ?? 0,
      completed: !!row?.completed_at,
      completedAt: row?.completed_at ?? null,
    };
  });

  return NextResponse.json({ quests });
}
