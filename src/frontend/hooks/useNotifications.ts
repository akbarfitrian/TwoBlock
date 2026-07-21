"use client";

import { useCallback, useEffect, useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
export type NotificationType = "follow" | "repost" | "tip" | "reaction" | "poll_result" | "comment" | "mention";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  is_read: boolean;
  created_at: string;
  post_id: string | null;
  tip_id: string | null;
  comment_id: string | null;
  actor: {
    wallet_address: string;
    username: string | null;
    avatar_url: string | null;
    is_og: boolean;
  } | null;
}

export function useNotifications() {
  const { walletAddress } = useTwoBlockAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/notifications?wallet=${walletAddress}`);
      const data = await res.json();
      setNotifications(res.ok ? data.notifications ?? [] : []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();

    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!walletAddress) return;
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      try {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: walletAddress, id }),
        });
      } catch (err) {
        console.error("[TwoBlock] Failed to mark notification read:", err);
      }
    },
    [walletAddress]
  );

  const markAllAsRead = useCallback(async () => {
    if (!walletAddress) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: walletAddress }),
      });
    } catch (err) {
      console.error("[TwoBlock] Failed to mark all notifications read:", err);
    }
  }, [walletAddress]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, refresh: load, markAsRead, markAllAsRead };
}
