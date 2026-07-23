"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { displayName } from "@/frontend/lib/format";

const REFRESH_INTERVAL_MS = 30_000;
// Look at a bounded recent window of tips to aggregate from — keeps this a
// client-side aggregation instead of requiring a DB view. Weekly boards
// filter on created_at first so this window comfortably covers a week's
// worth of activity too.
const RECENT_TIPS_LIMIT = 2000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type LeaderboardDirection = "tippers" | "tipped";
export type LeaderboardPeriod = "all" | "weekly";

export interface LeaderboardEntry {
  wallet: string;
  username: string | null;
  label: string;
  isOg: boolean;
  totalPoints: number;
  avatarUrl: string | null;
  totalUsdc: number;
  tipCount: number;
}

export function useTipLeaderboard(direction: LeaderboardDirection, period: LeaderboardPeriod, limit = 10) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const supabase = createSupabaseBrowserClient();

      // "tippers" ranks by who sent the most, "tipped" ranks by who received the most.
      const walletCol = direction === "tippers" ? "from_wallet" : "to_wallet";

      let query = supabase
        .from("tips")
        .select(`${walletCol}, amount_usdc, created_at`)
        .order("created_at", { ascending: false })
        .limit(RECENT_TIPS_LIMIT);

      if (period === "weekly") {
        const sinceIso = new Date(Date.now() - WEEK_MS).toISOString();
        query = query.gte("created_at", sinceIso);
      }

      const { data: tipRows, error } = await query;

      if (error || !tipRows || tipRows.length === 0) {
        setEntries([]);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const totals = new Map<string, number>();
      const counts = new Map<string, number>();
      for (const row of tipRows as unknown as Record<string, unknown>[]) {
        const wallet = row[walletCol] as string;
        totals.set(wallet, (totals.get(wallet) ?? 0) + Number(row.amount_usdc));
        counts.set(wallet, (counts.get(wallet) ?? 0) + 1);
      }

      const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const wallets = ranked.map(([wallet]) => wallet);

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("wallet_address, username, avatar_url, is_og, total_points")
        .in("wallet_address", wallets.length > 0 ? wallets : [""]);

      const profileByWallet = new Map((profileRows ?? []).map((p) => [p.wallet_address, p]));

      const merged: LeaderboardEntry[] = ranked.map(([wallet, total]) => {
        const p = profileByWallet.get(wallet);
        return {
          wallet,
          username: p?.username ?? null,
          label: displayName(p?.username ?? null, wallet),
          isOg: p?.is_og ?? false,
          totalPoints: p?.total_points ?? 0,
          avatarUrl: p?.avatar_url ?? null,
          totalUsdc: total,
          tipCount: counts.get(wallet) ?? 0,
        };
      });

      setEntries(merged);
      if (!opts?.silent) setLoading(false);
    },
    [direction, period, limit]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { entries, loading, refresh: load };
}
