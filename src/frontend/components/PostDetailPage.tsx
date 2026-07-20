"use client";

import { usePosts } from "@/frontend/hooks/usePosts";
import { PostCard } from "@/frontend/components/PostCard";
import { BackButton } from "@/frontend/components/BackButton";

export function PostDetailPage({ postId }: { postId: string }) {
  const { posts, loading, repost, toggleReaction, vote, deletePost } = usePosts({ postId });
  const post = posts[0] ?? null;

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-surface-border px-4 py-4">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Post</h1>
      </div>

      <div className="p-4">
        {loading && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading post…</p>}
        {!loading && !post && (
          <p className="px-4 py-6 text-center text-[14px] text-ink-muted">
            This post doesn&rsquo;t exist or has been deleted.
          </p>
        )}
        {post && (
          <PostCard
            post={post}
            onReact={toggleReaction}
            onRepost={repost}
            onVote={vote}
            onDelete={deletePost}
            clickable={false}
          />
        )}
      </div>
    </div>
  );
}
