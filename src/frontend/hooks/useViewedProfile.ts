"use client";

import { useCallback, useEffect, useState } from "react";
import { isAddress } from "viem";
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

// `identifier` can be either a wallet address or a username — the [wallet]
// and [username] URL segments both resolve here so permalinks work either
// way (usernames are the preferred, shareable form; wallet addresses always
// keep working as a stable fallback since usernames can change).
export function useViewedProfile(identifier: string | null): UseViewedProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!identifier) return;
      if (!opts?.silent) {
        setLoading(true);
        setNotFound(false);
      }
      const supabase = createSupabaseBrowserClient();

      const lookupColumn = isAddress(identifier) ? "wallet_address" : "username";
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("*")
        .eq(lookupColumn, identifier)
        .maybeSingle();

      if (!profileRow) {
        setNotFound(true);
        setProfile(null);
        setFollowerCount(0);
        setFollowingCount(0);
        setPostCount(0);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const wallet = (profileRow as Profile).wallet_address;

      const [followers, following, posts] = await Promise.all([
        supabase.from("follows").select("follower_wallet", { count: "exact", head: true }).eq("following_wallet", wallet),
        supabase.from("follows").select("following_wallet", { count: "exact", head: true }).eq("follower_wallet", wallet),
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("author_wallet", wallet)
          .is("deleted_at", null),
      ]);

      setProfile(profileRow as Profile);
      setFollowerCount(followers.count ?? 0);
      setFollowingCount(following.count ?? 0);
      setPostCount(posts.count ?? 0);
      if (!opts?.silent) setLoading(false);
    },
    [identifier]
  );

  useEffect(() => {
    load();

    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { profile, followerCount, followingCount, postCount, loading, notFound, refresh: load };
}
