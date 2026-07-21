"use client";

import { usePosts } from "@/frontend/hooks/usePosts";
import { useComments } from "@/frontend/hooks/useComments";
import { PostCard } from "@/frontend/components/PostCard";
import { BackButton } from "@/frontend/components/BackButton";
import { CommentComposer } from "@/frontend/components/CommentComposer";
import { CommentList } from "@/frontend/components/CommentList";

export function PostDetailPage({ postId }: { postId: string }) {
  const { posts, loading, repost, toggleReaction, vote, deletePost } = usePosts({ postId });
  const post = posts[0] ?? null;
  const { comments, loading: commentsLoading, addComment, deleteComment } = useComments(post ? postId : null);

  return (
    <div className="flex flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-surface-border px-4">
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
          <>
            <PostCard
              post={post}
              onReact={toggleReaction}
              onRepost={repost}
              onVote={vote}
              onDelete={deletePost}
              clickable={false}
            />

            <div className="mt-3">
              <CommentComposer onSubmit={addComment} />
            </div>

            <div className="mt-2">
              <h2 className="px-1 py-2 text-[14px] font-bold text-ink">
                Replies{comments.length > 0 ? ` (${comments.length})` : ""}
              </h2>
              <CommentList comments={comments} loading={commentsLoading} onDelete={deleteComment} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
