"use client";

import { useCallback, useEffect, useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import type { CommentWithAuthor } from "@/shared/types";

export interface UseCommentsState {
  comments: CommentWithAuthor[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addComment: (content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export function useComments(postId: string | null): UseCommentsState {
  const { walletAddress } = useTwoBlockAuth();
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/comments?postId=${postId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load comments.");
      setComments(data.comments ?? []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load comments:", err);
      setError("Failed to load comments. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addComment = useCallback(
    async (content: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first to comment.");
      if (!postId) throw new Error("Missing post.");

      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, postId, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to post comment.");
      setComments((prev) => [...prev, data.comment as CommentWithAuthor]);
    },
    [walletAddress, postId]
  );

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first.");

      const previous = comments;
      setComments((prev) => prev.filter((c) => c.id !== commentId));

      try {
        const res = await fetch(`/api/comments/${commentId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to delete comment.");
        }
      } catch (err) {
        console.error("[TwoBlock] Failed to delete comment:", err);
        setComments(previous);
        throw err;
      }
    },
    [walletAddress, comments]
  );

  return { comments, loading, error, refresh, addComment, deleteComment };
}
