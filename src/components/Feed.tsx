"use client";

import { usePosts } from "@/hooks/usePosts";
import { PostComposer } from "@/components/PostComposer";
import { PostCard } from "@/components/PostCard";

export function Feed() {
  const { posts, loading, loadingMore, hasMore, error, loadMore, createPost, createPoll, vote, repost, toggleReaction } = usePosts();

  return (
    <div className="flex flex-col">
      <h1 className="border-b border-surface-border px-4 py-4 font-display text-[20px] font-bold text-ink">Home</h1>

      <PostComposer onPost={createPost} onCreatePoll={createPoll} />

      {loading && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading feed…</p>}
      {error && <p className="px-4 py-6 text-center text-[14px] text-danger">{error}</p>}
      {!loading && posts.length === 0 && !error && (
        <p className="px-4 py-6 text-center text-[14px] text-ink-muted">No posts yet. Be the first to post!</p>
      )}

      {posts.map((post) => (
        <PostCard key={post.id} post={post} onReact={toggleReaction} onRepost={repost} onVote={vote} />
      ))}

      {hasMore && (
        <button
          className="mx-4 my-4 rounded-full border border-surface-border py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
