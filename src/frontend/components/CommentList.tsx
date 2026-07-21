"use client";

import Link from "next/link";
import { useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { OGBadge } from "@/frontend/components/OGBadge";
import { TrashIcon } from "@/frontend/components/icons";
import { avatarColor, displayName, formatRelativeTime, initials, profileHref } from "@/frontend/lib/format";
import { linkify } from "@/frontend/lib/linkify";
import type { CommentWithAuthor } from "@/shared/types";

interface CommentListProps {
  comments: CommentWithAuthor[];
  loading: boolean;
  onDelete: (commentId: string) => Promise<void>;
}

export function CommentList({ comments, loading, onDelete }: CommentListProps) {
  if (loading && comments.length === 0) {
    return <p className="px-1 py-6 text-center text-[14px] text-ink-muted">Loading replies…</p>;
  }
  if (comments.length === 0) {
    return <p className="px-1 py-6 text-center text-[14px] text-ink-muted">No replies yet. Be the first to reply.</p>;
  }

  return (
    <div className="flex flex-col divide-y divide-surface-border">
      {comments.map((c) => (
        <CommentRow key={c.id} comment={c} onDelete={onDelete} />
      ))}
    </div>
  );
}

function CommentRow({ comment, onDelete }: { comment: CommentWithAuthor; onDelete: (commentId: string) => Promise<void> }) {
  const { walletAddress } = useTwoBlockAuth();
  const [deleting, setDeleting] = useState(false);
  const isOwner = !!walletAddress && walletAddress === comment.author_wallet;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete(comment.id);
    } catch (err) {
      console.error("[TwoBlock] Failed to delete comment:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article id={`comment-${comment.id}`} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <Link
        href={profileHref(comment.author.username, comment.author.wallet_address)}
        className="h-9 w-9 shrink-0 overflow-hidden rounded-full text-[12px] font-semibold text-white"
        style={{ background: avatarColor(comment.author.wallet_address) }}
      >
        <span className="flex h-full w-full items-center justify-center">
          {comment.author.avatar_url ? (
            <img src={comment.author.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(comment.author.username, comment.author.wallet_address)
          )}
        </span>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Link
              href={profileHref(comment.author.username, comment.author.wallet_address)}
              className="truncate text-[14px] font-bold text-ink hover:underline"
            >
              {displayName(comment.author.username, comment.author.wallet_address)}
            </Link>
            {comment.author.is_og && <OGBadge isOg size={14} />}
            <span className="shrink-0 text-[12.5px] text-ink-faint">{formatRelativeTime(comment.created_at)}</span>
          </div>
          {isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
              aria-label="Delete reply"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap break-words text-[14.5px] leading-snug text-ink">
          {linkify(comment.content)}
        </p>
      </div>
    </article>
  );
}
