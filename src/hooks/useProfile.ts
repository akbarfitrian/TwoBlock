"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { getTierLimits } from "@/lib/tierLimits";
import type { Profile } from "@/lib/types";

export interface UseProfileState {
  profile: Profile | null;
  loading: boolean;

  postsToday: number;

  remainingQuota: number | null;
  refresh: () => Promise<void>;
}

export function useProfile(): UseProfileState {
  const { walletAddress } = useTwoBlockAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [postsToday, setPostsToday] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setProfile(null);
      setPostsToday(0);
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const [{ data: profileRow }, { count }] = await Promise.all([
      supabase.from("profiles").select("*").eq("wallet_address", walletAddress).maybeSingle(),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_wallet", walletAddress)
        .is("deleted_at", null)
        .is("repost_of", null)
        .gte("created_at", startOfTodayUtc()),
    ]);

    setProfile((profileRow as Profile) ?? null);
    setPostsToday(count ?? 0);
    setLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  const remainingQuota =
    profile != null ? Math.max(0, getTierLimits(profile.verification_tier).dailyPostLimit - postsToday) : null;

  return { profile, loading, postsToday, remainingQuota, refresh: load };
}

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}
