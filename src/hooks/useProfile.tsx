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

  // `silent` refetches (background polling) update the data without flipping
  // `loading` back to true, so pages that gate their render on `loading`
  // (e.g. ProfilePage) don't flash a spinner every refresh cycle.
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
    profile != null ? Math.max(0, getTierLimits(profile.verification_tier).dailyPostLimit - postsToday) : null;

  return { profile, loading, postsToday, remainingQuota, refresh: load };
}

const ProfileContext = createContext<UseProfileState | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useProfileState();
  const value = useMemo(() => state, [state]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

/**
 * Shared "my profile" store. Every component that calls this reads the same
 * cached state (one Supabase fetch, one source of truth) instead of each
 * mounting its own independent copy. That's what makes actions like buying
 * verification show up everywhere (sidebar, composer, get-verified page)
 * the moment `refresh()` is called, instead of only in whichever component
 * happened to call it.
 */
export function useProfile(): UseProfileState {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error("useProfile harus dipanggil di dalam <ProfileProvider>");
  }
  return ctx;
}
