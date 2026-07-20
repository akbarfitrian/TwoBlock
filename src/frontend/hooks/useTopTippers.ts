"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { displayName } from "@/frontend/lib/format";

const REFRESH_INTERVAL_MS = 30_000;
// Look at a bounded recent window of tips to aggregate senders from —
// keeps this a client-side aggregation instead of requiring a DB view.
const RECENT_TIPS_LIMIT = 500;

export interface TopTipper {
  wallet: string;
  username: string | null;
  label: string;
  isOg: boolean;
  avatarUrl: string | null;
  totalTippedUsdc: number;
}

export function useTopTippers(limit = 10) {
  const [tippers, setTippers] = useState<TopTipper[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const { data: tipRows, error } = await supabase
        .from("tips")
        .select("from_wallet, amount_usdc")
        .order("created_at", { ascending: false })
        .limit(RECENT_TIPS_LIMIT);

      if (error || !tipRows || tipRows.length === 0) {
        setTippers([]);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const totals = new Map<string, number>();
      for (const row of tipRows) {
        totals.set(row.from_wallet, (totals.get(row.from_wallet) ?? 0) + Number(row.amount_usdc));
      }

      const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const wallets = ranked.map(([wallet]) => wallet);

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("wallet_address, username, avatar_url, is_og")
        .in("wallet_address", wallets);

      const profileByWallet = new Map((profileRows ?? []).map((p) => [p.wallet_address, p]));

      const merged: TopTipper[] = ranked.map(([wallet, total]) => {
        const p = profileByWallet.get(wallet);
        return {
          wallet,
          username: p?.username ?? null,
          label: displayName(p?.username ?? null, wallet),
          isOg: p?.is_og ?? false,
          avatarUrl: p?.avatar_url ?? null,
          totalTippedUsdc: total,
        };
      });

      setTippers(merged);
      if (!opts?.silent) setLoading(false);
    },
    [limit]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { tippers, loading, refresh: load };
}
