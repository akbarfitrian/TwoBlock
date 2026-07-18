import type { createSupabaseServerClient } from "@/backend/lib/supabase-server";

export interface QuestDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
}

export const QUEST_CATALOG: QuestDefinition[] = [
  { key: "first_post", title: "First Post", description: "Create your first post on TwoBlock.", icon: "post", target: 1 },
  { key: "first_tip_sent", title: "First Tip", description: "Send your first tip to another user.", icon: "tip", target: 1 },
  { key: "get_verified", title: "Get Verified", description: "Purchase a verification tier (Verified / Pro / Max).", icon: "verified", target: 1 },
  { key: "streak_7d", title: "7-Day Streak", description: "Post every day, 7 days in a row.", icon: "streak", target: 7 },
];

type ServerClient = ReturnType<typeof createSupabaseServerClient>;

export async function setQuestProgress(
  supabase: ServerClient,
  wallet: string,
  questKey: string,
  progress: number
) {
  const def = QUEST_CATALOG.find((q) => q.key === questKey);
  if (!def) return;
  const capped = Math.max(0, Math.min(progress, def.target));

  const { data: existing } = await supabase
    .from("quests")
    .select("completed_at")
    .eq("wallet_address", wallet)
    .eq("quest_key", questKey)
    .maybeSingle();

  const completedAt = existing?.completed_at ?? (capped >= def.target ? new Date().toISOString() : null);

  const { error } = await supabase.from("quests").upsert(
    { wallet_address: wallet, quest_key: questKey, progress: capped, target: def.target, completed_at: completedAt },
    { onConflict: "wallet_address,quest_key" }
  );
  if (error) console.error(`[TwoBlock] Failed to update quest progress ${questKey}:`, error);
}

export async function completeQuestOnce(supabase: ServerClient, wallet: string, questKey: string) {
  const def = QUEST_CATALOG.find((q) => q.key === questKey);
  if (!def) return;
  await setQuestProgress(supabase, wallet, questKey, def.target);
}

export async function refreshPostingStreak(supabase: ServerClient, wallet: string) {
  const { data, error } = await supabase
    .from("posts")
    .select("created_at")
    .eq("author_wallet", wallet)
    .is("deleted_at", null)
    .is("repost_of", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) {
    console.error("[TwoBlock] Failed to compute posting streak:", error);
    return;
  }

  const postedDays = new Set((data ?? []).map((row) => row.created_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  while (postedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  await setQuestProgress(supabase, wallet, "streak_7d", streak);
}
