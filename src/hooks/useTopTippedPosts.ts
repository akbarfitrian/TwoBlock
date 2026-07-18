"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { displayName } from "@/lib/utils/format";
import type { VerificationTier } from "@/lib/types";

const REFRESH_INTERVAL_MS = 30_000;

export interface TopTippedPost {
  postId: string;
  content: string | null;
  authorLabel: string;
  authorWallet: string;
  authorTier: VerificationTier;
  authorAvatarUrl: string | null;
  totalTipsUsdc: number;
}

export function useTopTippedPosts(limit = 5) {
  const [posts, setPosts] = useState<TopTippedPost[]>([]);
  const [loading, setLoading] = useState(true);

  // `silent` refetches (background polling) update the data without flipping
  // `loading` back to true, so the panel doesn't flash "Loading…" every cycle.
  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const { data: leaderboardRows } = await supabase
        .from("post_leaderboard_alltime")
        .select("post_id, total_tips_received")
        .limit(limit);

      const postIds = (leaderboardRows ?? []).map((r) => r.post_id);
      if (postIds.length === 0) {
        setPosts([]);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const { data: postRows } = await supabase
        .from("posts")
        .select(
          "id, content, author:profiles!posts_author_wallet_fkey(wallet_address, username, avatar_url, verification_tier)"
        )
        .in("id", postIds);

      const postById = new Map((postRows ?? []).map((p: any) => [p.id, p]));

      const merged = (leaderboardRows ?? [])
        .map((row) => {
          const post = postById.get(row.post_id);
          if (!post) return null;
          return {
            postId: row.post_id,
            content: post.content,
            authorWallet: post.author.wallet_address,
            authorLabel: displayName(post.author.username, post.author.wallet_address),
            authorTier: post.author.verification_tier as VerificationTier,
            authorAvatarUrl: post.author.avatar_url as string | null,
            totalTipsUsdc: Number(row.total_tips_received),
          };
        })
        .filter((p): p is TopTippedPost => p !== null);

      setPosts(merged);
      if (!opts?.silent) setLoading(false);
    },
    [limit]
  );

  useEffect(() => {
    load();

    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { posts, loading, refresh: load };
}
