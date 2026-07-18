"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import type { Profile } from "@/shared/types";

const REFRESH_INTERVAL_MS = 30_000;

export interface UseViewedProfileState {
  profile: Profile | null;
  followerCount: number;
  followingCount: number;
  postCount: number;
  loading: boolean;
  notFound: boolean;
  refresh: () => Promise<void>;
}

export function useViewedProfile(walletAddress: string | null): UseViewedProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!walletAddress) return;
      if (!opts?.silent) {
        setLoading(true);
        setNotFound(false);
      }
      const supabase = createSupabaseBrowserClient();

      const [{ data: profileRow }, followers, following, posts] = await Promise.all([
        supabase.from("profiles").select("*").eq("wallet_address", walletAddress).maybeSingle(),
        supabase.from("follows").select("follower_wallet", { count: "exact", head: true }).eq("following_wallet", walletAddress),
        supabase.from("follows").select("following_wallet", { count: "exact", head: true }).eq("follower_wallet", walletAddress),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_wallet", walletAddress)
          .is("deleted_at", null),
      ]);

      if (!profileRow) {
        setNotFound(true);
        setProfile(null);
      } else {
        setProfile(profileRow as Profile);
      }
      setFollowerCount(followers.count ?? 0);
      setFollowingCount(following.count ?? 0);
      setPostCount(posts.count ?? 0);
      if (!opts?.silent) setLoading(false);
    },
    [walletAddress]
  );

  useEffect(() => {
    load();

    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { profile, followerCount, followingCount, postCount, loading, notFound, refresh: load };
}
