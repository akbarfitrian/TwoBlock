import type { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { awardPoints } from "@/shared/points";

export interface QuestDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  points: number;
}

export const QUEST_CATALOG: QuestDefinition[] = [
  { key: "first_post", title: "First Post", description: "Create your first post on TwoBlock.", icon: "post", target: 1, points: 10 },
  { key: "first_tip_sent", title: "First Tip", description: "Send your first tip to another user.", icon: "tip", target: 1, points: 10 },
  { key: "get_og", title: "Get OG", description: "Purchase OG lifetime membership.", icon: "og", target: 1, points: 50 },
  { key: "streak_7d", title: "7-Day Streak", description: "Post every day, 7 days in a row.", icon: "streak", target: 7, points: 30 },
  { key: "og_gate_first_post", title: "Gatekeeper", description: "OG-exclusive: publish your first gated (followers-only) post.", icon: "og", target: 1, points: 15 },
  { key: "first_follow", title: "First Follow", description: "Follow someone for the first time.", icon: "follow", target: 1, points: 5 },
  { key: "profile_complete", title: "Complete Your Profile", description: "Add an avatar and a bio to your profile.", icon: "profile", target: 1, points: 5 },
  { key: "streak_30d", title: "30-Day Streak", description: "Post every day, 30 days in a row.", icon: "streak", target: 30, points: 100 },
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

  // award_points dedupes one-time quest completions on (wallet, event_type,
  // ref_id) — see idx_point_events_onetime — so it's safe to call this
  // every time progress reaches target, even on repeated/retried calls
  // (e.g. refreshPostingStreak recomputing the streak on every post).
  if (capped >= def.target) {
    await awardPoints(supabase, wallet, "quest_completed", def.points, questKey);
  }
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
  await setQuestProgress(supabase, wallet, "streak_30d", streak);
}
