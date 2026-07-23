import type { createSupabaseServerClient } from "@/backend/lib/supabase-server";

type ServerClient = ReturnType<typeof createSupabaseServerClient>;

export interface DailyQuestDefinition {
  key: string;
  title: string;
  description: string;
  icon: string;
  points: number;
}

// Resets every UTC day. No separate "daily tip" quest — tipping already
// earns points via the amount-based formula in awardTipPoints, and
// stacking a daily quest on top of it would double-incentivize the same
// action.
export const DAILY_QUEST_CATALOG: DailyQuestDefinition[] = [
  { key: "daily_login", title: "Daily Check-in", description: "Open the app / connect your wallet today.", icon: "login", points: 1 },
  { key: "daily_post", title: "Daily Post", description: "Create at least one post today.", icon: "post", points: 3 },
  { key: "daily_comment", title: "Daily Comment", description: "Leave at least one comment today.", icon: "comment", points: 2 },
  { key: "daily_react", title: "Daily Reaction", description: "React to a post today.", icon: "react", points: 1 },
];

/**
 * The single entry point for granting points — thin wrapper around the
 * `award_points` DB function, which handles the optional daily cap and
 * referral commission payout server-side (see 0020_points_referral_system.sql).
 */
export async function awardPoints(
  supabase: ServerClient,
  wallet: string,
  eventType: string,
  points: number,
  refId?: string | null,
  dailyCap?: number | null
) {
  if (!Number.isFinite(points) || points <= 0) return;
  const { error } = await supabase.rpc("award_points", {
    p_wallet_address: wallet,
    p_event_type: eventType,
    p_points: points,
    p_ref_id: refId ?? null,
    p_daily_cap: dailyCap ?? null,
  });
  if (error) {
    console.error(`[TwoBlock] Failed to award points (${eventType}) to ${wallet}:`, error);
  }
}

function todayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Marks a daily quest complete for today (idempotent via the
 * `daily_quests` primary key) and awards its points exactly once per
 * wallet per quest per UTC day.
 */
export async function completeDailyQuestOnce(supabase: ServerClient, wallet: string, questKey: string) {
  const def = DAILY_QUEST_CATALOG.find((q) => q.key === questKey);
  if (!def) return;

  const questDate = todayUtcDateString();
  const { error } = await supabase
    .from("daily_quests")
    .insert({ wallet_address: wallet, quest_key: questKey, quest_date: questDate });

  if (error) {
    if (error.code === "23505") return; // already completed today — no-op
    console.error(`[TwoBlock] Failed to record daily quest ${questKey} for ${wallet}:`, error);
    return;
  }

  await awardPoints(supabase, wallet, questKey, def.points, questDate);
}

const TIP_DAILY_CAP = 10;

/** Amount-based tip points, per POINTS_REFERRAL_SYSTEM.md §4.3. */
export async function awardTipSentPoints(supabase: ServerClient, wallet: string, amountUsdc: number, txRef: string) {
  await awardPoints(supabase, wallet, "tip_sent", amountUsdc * 0.1, txRef, TIP_DAILY_CAP);
}

export async function awardTipReceivedPoints(supabase: ServerClient, wallet: string, netAmountUsdc: number, txRef: string) {
  await awardPoints(supabase, wallet, "tip_received", netAmountUsdc * 0.1, txRef, TIP_DAILY_CAP);
}
