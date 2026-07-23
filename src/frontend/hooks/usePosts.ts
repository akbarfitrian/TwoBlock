"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import type { Post, PostWithAuthor } from "@/shared/types";

const PAGE_SIZE = 20;

function fillZeros(counts: number[], length: number): number[] {
  return Array.from({ length }, (_, i) => counts[i] ?? 0);
}

async function fetchFollowingSet(
  supabase: ReturnType<typeof createSupabaseBrowserClient>,
  walletAddress: string
): Promise<Set<string>> {
  const { data } = await supabase.from("follows").select("following_wallet").eq("follower_wallet", walletAddress);
  return new Set((data ?? []).map((r) => r.following_wallet as string));
}

function canSeeGatedPost(post: Post, walletAddress: string | null, followingSet: Set<string>): boolean {
  if (!post.is_gated) return true;
  if (!walletAddress) return false;
  if (post.author_wallet === walletAddress) return true;
  return followingSet.has(post.author_wallet);
}

export interface UsePostsOptions {

  authorWallet?: string;

  // When set, fetches (and re-polls) just this one post instead of a feed
  // page — used by the post detail/permalink page.
  postId?: string;
}

export interface UsePostsState {
  posts: PostWithAuthor[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;

  createPost: (content: string, imageUrls?: string[], isGated?: boolean, videoUrl?: string) => Promise<void>;

  createPoll: (question: string, options: string[], durationHours: number | null) => Promise<void>;

  vote: (postId: string, optionIndex: number) => Promise<void>;

  repost: (postId: string) => Promise<void>;

  toggleReaction: (postId: string, reaction: "love") => Promise<void>;

  deletePost: (postId: string) => Promise<void>;
}

export function usePosts(options: UsePostsOptions = {}): UsePostsState {
  const { authorWallet, postId: singlePostId } = options;
  const { walletAddress } = useTwoBlockAuth();

  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (before: string | null): Promise<PostWithAuthor[]> => {
      const supabase = createSupabaseBrowserClient();

      let query = supabase
        .from("posts")
        .select(
          "*, author:profiles!posts_author_wallet_fkey(wallet_address, username, avatar_url, is_og, total_points)"
        )
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (singlePostId) query = query.eq("id", singlePostId);
      if (authorWallet) query = query.eq("author_wallet", authorWallet);
      if (before) query = query.lt("created_at", before);

      const [{ data: rows, error: queryError }, followingSet] = await Promise.all([
        query,
        walletAddress ? fetchFollowingSet(supabase, walletAddress) : Promise.resolve(new Set<string>()),
      ]);
      if (queryError) throw queryError;
      const allPosts = (rows ?? []) as unknown as (Post & { author: PostWithAuthor["author"] })[];
      // Gated (followers-only) posts are filtered out here rather than via
      // RLS, since this app authenticates by wallet address, not Supabase
      // Auth — the anon key can read every row, so visibility for gated
      // posts is enforced client-side against the current wallet's follows.
      const basePosts = allPosts.filter((p) => canSeeGatedPost(p, walletAddress, followingSet));

      const postIds = basePosts.map((p) => p.id);
      const repostSourceIds = basePosts.map((p) => p.repost_of).filter((id): id is string => !!id);
      const pollIds = basePosts.filter((p) => p.post_type === "poll").map((p) => p.id);

      const [tipRows, reactionRows, commentRows, repostedRows, pollVoteRows] = await Promise.all([
        postIds.length
          ? supabase.from("tips").select("post_id, amount_usdc").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: string; amount_usdc: number }[] }),
        postIds.length
          ? supabase.from("post_reactions").select("post_id, wallet_address, reaction_type").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: string; wallet_address: string; reaction_type: string }[] }),
        postIds.length
          ? supabase.from("comments").select("post_id").in("post_id", postIds)
          : Promise.resolve({ data: [] as { post_id: string }[] }),
        repostSourceIds.length
          ? supabase
              .from("posts")
              .select(
                "*, author:profiles!posts_author_wallet_fkey(wallet_address, username, avatar_url, is_og, total_points)"
              )
              .in("id", repostSourceIds)
          : Promise.resolve({ data: [] as (Post & { author: PostWithAuthor["author"] })[] }),
        pollIds.length
          ? supabase.from("poll_votes").select("post_id, wallet_address, option_index").in("post_id", pollIds)
          : Promise.resolve({ data: [] as { post_id: string; wallet_address: string; option_index: number }[] }),
      ]);

      const tipTotals = new Map<string, number>();
      for (const t of tipRows.data ?? []) {
        tipTotals.set(t.post_id, (tipTotals.get(t.post_id) ?? 0) + Number(t.amount_usdc));
      }

      const reactionCounts = new Map<string, number>();
      const myReactions = new Set<string>();
      for (const r of reactionRows.data ?? []) {
        reactionCounts.set(r.post_id, (reactionCounts.get(r.post_id) ?? 0) + 1);
        if (walletAddress && r.wallet_address === walletAddress) {
          myReactions.add(r.post_id);
        }
      }

      const commentCounts = new Map<string, number>();
      for (const c of commentRows.data ?? []) {
        commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1);
      }

      const repostedById = new Map<string, Post & { author: PostWithAuthor["author"] }>();
      for (const rp of (repostedRows.data ?? []) as (Post & { author: PostWithAuthor["author"] })[]) {
        if (canSeeGatedPost(rp, walletAddress, followingSet)) {
          repostedById.set(rp.id, rp);
        }
      }

      const pollCounts = new Map<string, number[]>();
      const myPollVote = new Map<string, number>();
      for (const v of pollVoteRows.data ?? []) {
        const bucket = pollCounts.get(v.post_id) ?? [];
        bucket[v.option_index] = (bucket[v.option_index] ?? 0) + 1;
        pollCounts.set(v.post_id, bucket);
        if (walletAddress && v.wallet_address === walletAddress) {
          myPollVote.set(v.post_id, v.option_index);
        }
      }

      const toEnriched = (
        p: Post & { author: PostWithAuthor["author"] }
      ): PostWithAuthor => ({
        ...p,
        tip_total_usdc: tipTotals.get(p.id) ?? 0,
        love_count: reactionCounts.get(p.id) ?? 0,
        my_reaction: myReactions.has(p.id) ? "love" : null,
        comment_count: commentCounts.get(p.id) ?? 0,
        reposted_post: p.repost_of && repostedById.has(p.repost_of) ? toEnriched(repostedById.get(p.repost_of)!) : null,
        poll_vote_counts: fillZeros(pollCounts.get(p.id) ?? [], p.poll_options?.length ?? 0),
        my_poll_vote: myPollVote.get(p.id) ?? null,
      });

      return basePosts.map(toEnriched);
    },
    [authorWallet, singlePostId, walletAddress]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await fetchPage(null);
      setPosts(page);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      console.error("[TwoBlock] Failed to load feed:", err);
      setError("Failed to load feed. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [fetchPage]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const page = await fetchPage(null);
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const freshOnly = page.filter((p) => !existingIds.has(p.id));
          if (freshOnly.length === 0) return prev;
          return [...freshOnly, ...prev];
        });
      } catch (err) {
        console.error("[TwoBlock] Failed to poll for new posts:", err);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || posts.length === 0) return;
    setLoadingMore(true);
    try {
      const oldest = posts[posts.length - 1].created_at;
      const page = await fetchPage(oldest);
      setPosts((prev) => [...prev, ...page]);
      setHasMore(page.length === PAGE_SIZE);
    } catch (err) {
      console.error("[TwoBlock] Failed to load older posts:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, posts]);

  const createPost = useCallback(
    async (content: string, imageUrls?: string[], isGated?: boolean, videoUrl?: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first to post.");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorWallet: walletAddress, content, imageUrls, isGated, videoUrl }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create post.");
      }
      await refresh();
    },
    [walletAddress, refresh]
  );

  const createPoll = useCallback(
    async (question: string, options: string[], durationHours: number | null) => {
      if (!walletAddress) throw new Error("Connect your wallet first to create a poll.");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorWallet: walletAddress, postType: "poll", content: question, pollOptions: options, pollDurationHours: durationHours }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create poll.");
      }
      await refresh();
    },
    [walletAddress, refresh]
  );

  const vote = useCallback(
    async (postId: string, optionIndex: number) => {
      if (!walletAddress) throw new Error("Connect your wallet first to vote.");

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId || p.my_poll_vote !== null) return p;
          const counts = [...p.poll_vote_counts];
          counts[optionIndex] = (counts[optionIndex] ?? 0) + 1;
          return { ...p, poll_vote_counts: counts, my_poll_vote: optionIndex };
        })
      );

      try {
        const res = await fetch(`/api/posts/${postId}/vote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, optionIndex }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to submit vote.");
        }
      } catch (err) {
        console.error("[TwoBlock] Vote failed:", err);
        await refresh();
        throw err;
      }
    },
    [walletAddress, refresh]
  );

  const repost = useCallback(
    async (postId: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first to repost.");
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorWallet: walletAddress, repostOf: postId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to repost.");
      }
      await refresh();
    },
    [walletAddress, refresh]
  );

  const toggleReaction = useCallback(
    async (postId: string, reaction: "love") => {
      if (!walletAddress) throw new Error("Connect your wallet first to react.");
      const current = posts.find((p) => p.id === postId)?.my_reaction ?? null;
      const clearing = current === reaction;

      setPosts((prev) =>
        prev.map((p) => {
          if (p.id !== postId) return p;
          const love = p.love_count + (clearing ? -1 : 1);
          return { ...p, love_count: love, my_reaction: clearing ? null : reaction };
        })
      );

      try {
        const res = await fetch("/api/reactions", {
          method: clearing ? "DELETE" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, postId, reaction }),
        });
        if (!res.ok) throw new Error(await res.text());
      } catch (err) {
        console.error("[TwoBlock] Failed to save reaction:", err);
        await refresh();
      }
    },
    [walletAddress, posts, refresh]
  );

  const deletePost = useCallback(
    async (postId: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first to delete a post.");

      const previous = posts;
      setPosts((prev) => prev.filter((p) => p.id !== postId && p.repost_of !== postId));

      try {
        const res = await fetch(`/api/posts/${postId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to delete post.");
        }
      } catch (err) {
        console.error("[TwoBlock] Failed to delete post:", err);
        setPosts(previous);
        throw err;
      }
    },
    [walletAddress, posts]
  );

  return { posts, loading, loadingMore, hasMore, error, loadMore, refresh, createPost, createPoll, vote, repost, toggleReaction, deletePost };
}
