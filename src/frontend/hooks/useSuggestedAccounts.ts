"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { displayName } from "@/frontend/lib/format";

export interface SuggestedAccount {
  wallet: string;
  username: string | null;
  label: string;
  isOg: boolean;
  avatarUrl: string | null;
}

export function useSuggestedAccounts(limit = 5) {
  const { walletAddress } = useTwoBlockAuth();
  const [accounts, setAccounts] = useState<SuggestedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    let followingWallets: string[] = [];
    if (walletAddress) {
      const { data: followRows } = await supabase
        .from("follows")
        .select("following_wallet")
        .eq("follower_wallet", walletAddress);
      followingWallets = (followRows ?? []).map((r) => r.following_wallet as string);
    }

    const excluded = new Set([...(walletAddress ? [walletAddress] : []), ...followingWallets]);

    const { data: profileRows } = await supabase
      .from("profiles")
      .select("wallet_address, username, avatar_url, is_og, created_at")
      .order("is_og", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit + excluded.size);

    const filtered = (profileRows ?? [])
      .filter((p) => !excluded.has(p.wallet_address))
      .slice(0, limit)
      .map((p) => ({
        wallet: p.wallet_address as string,
        username: p.username as string | null,
        label: displayName(p.username, p.wallet_address),
        isOg: p.is_og as boolean,
        avatarUrl: p.avatar_url as string | null,
      }));

    setAccounts(filtered);
    setLoading(false);
  }, [walletAddress, limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { accounts, loading, refresh: load };
}
