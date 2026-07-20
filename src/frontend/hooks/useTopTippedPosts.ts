"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { displayName } from "@/frontend/lib/format";

const REFRESH_INTERVAL_MS = 30_000;
const TRENDING_WINDOW_HOURS = 24;
// Look at a bounded recent window of tips to aggregate from —
// keeps this a client-side aggregation instead of requiring a DB view.
const RECENT_TIPS_LIMIT = 500;

export interface TopTippedPost {
  postId: string;
  content: string | null;
  authorLabel: string;
  authorUsername: string | null;
  authorWallet: string;
  authorIsOg: boolean;
  authorAvatarUrl: string | null;
  totalTipsUsdc: number;
}

export function useTopTippedPosts(limit = 5) {
  const [posts, setPosts] = useState<TopTippedPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const sinceIso = new Date(Date.now() - TRENDING_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

      const { data: tipRows } = await supabase
        .from("tips")
        .select("post_id, amount_usdc")
        .not("post_id", "is", null)
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(RECENT_TIPS_LIMIT);

      const totals = new Map<string, number>();
      for (const row of tipRows ?? []) {
        const postId = row.post_id as string;
        totals.set(postId, (totals.get(postId) ?? 0) + Number(row.amount_usdc));
      }

      const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
      const postIds = ranked.map(([postId]) => postId);

      if (postIds.length === 0) {
        setPosts([]);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const { data: postRows } = await supabase
        .from("posts")
        .select(
          "id, content, author:profiles!posts_author_wallet_fkey(wallet_address, username, avatar_url, is_og)"
        )
        .in("id", postIds);

      const postById = new Map((postRows ?? []).map((p: any) => [p.id, p]));

      const merged = ranked
        .map(([postId, total]) => {
          const post = postById.get(postId);
          if (!post) return null;
          return {
            postId,
            content: post.content,
            authorWallet: post.author.wallet_address,
            authorUsername: post.author.username,
            authorLabel: displayName(post.author.username, post.author.wallet_address),
            authorIsOg: post.author.is_og as boolean,
            authorAvatarUrl: post.author.avatar_url as string | null,
            totalTipsUsdc: total,
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
