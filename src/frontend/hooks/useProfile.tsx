"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { getTierLimits } from "@/shared/tier-limits";
import type { Profile } from "@/shared/types";

export interface UseProfileState {
  profile: Profile | null;
  loading: boolean;

  postsToday: number;

  remainingQuota: number | null;
  refresh: () => Promise<void>;
}

const REFRESH_INTERVAL_MS = 30_000;

function startOfTodayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function useProfileState(): UseProfileState {
  const { walletAddress } = useTwoBlockAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [postsToday, setPostsToday] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!walletAddress) {
        setProfile(null);
        setPostsToday(0);
        return;
      }
      if (!opts?.silent) setLoading(true);
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
      if (!opts?.silent) setLoading(false);
    },
    [walletAddress]
  );

  useEffect(() => {
    load();

    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  const remainingQuota =
    profile != null ? Math.max(0, getTierLimits(profile.is_og).dailyPostLimit - postsToday) : null;

  return { profile, loading, postsToday, remainingQuota, refresh: load };
}

const ProfileContext = createContext<UseProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useProfileState();
  const value = useMemo(() => state, [state]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): UseProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile must be called within a <ProfileProvider>");
  }
  return ctx;
}
