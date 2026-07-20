"use client";

import { useMemo, useState } from "react";
import { usePosts } from "@/frontend/hooks/usePosts";
import { PostComposer } from "@/frontend/components/PostComposer";
import { PostCard } from "@/frontend/components/PostCard";
import { FeedHeader, type FeedSort, type FeedTab } from "@/frontend/components/FeedHeader";
import { FlameIcon } from "@/frontend/components/icons";

export function Feed() {
  const { posts, loading, loadingMore, hasMore, error, loadMore, createPost, createPoll, vote, repost, toggleReaction, deletePost } = usePosts();
  const [tab, setTab] = useState<FeedTab>("posts");
  const [sort, setSort] = useState<FeedSort>("latest");

  const sortedPosts = useMemo(() => {
    if (sort === "latest") return posts;
    return [...posts].sort((a, b) => b.tip_total_usdc - a.tip_total_usdc);
  }, [posts, sort]);

  return (
    <div className="flex flex-col">
      <FeedHeader tab={tab} onTabChange={setTab} sort={sort} onSortChange={setSort} />

      {tab === "announcements" ? (
        <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
          <FlameIcon size={24} />
          <p className="text-[14px] font-semibold text-ink">No announcements yet</p>
          <p className="max-w-xs text-[13px] text-ink-muted">Official TwoBlock updates and announcements will show up here.</p>
        </div>
      ) : (
        <>
          <PostComposer onPost={createPost} onCreatePoll={createPoll} />

          {loading && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading feed…</p>}
          {error && <p className="px-4 py-6 text-center text-[14px] text-danger">{error}</p>}
          {!loading && sortedPosts.length === 0 && !error && (
            <p className="px-4 py-6 text-center text-[14px] text-ink-muted">No posts yet. Be the first to post!</p>
          )}

          <div className="flex flex-col gap-3 p-4">
            {sortedPosts.map((post) => (
              <PostCard key={post.id} post={post} onReact={toggleReaction} onRepost={repost} onVote={vote} onDelete={deletePost} />
            ))}
          </div>

          {hasMore && (
            <button
              className="mx-4 my-4 rounded-full border border-surface-border py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
