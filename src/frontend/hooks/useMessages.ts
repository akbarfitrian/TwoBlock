"use client";

import { useCallback, useEffect, useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
export interface MessageThread {
  otherWallet: string;
  otherUsername: string | null;
  otherAvatarUrl: string | null;
  otherIsOg: boolean;
  otherTotalPoints: number;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageFromMe: boolean;
  unread: boolean;
}

export interface ChatMessage {
  id: string;
  from_wallet: string;
  to_wallet: string;
  content: string;
  created_at: string;
}

export function useConversations() {
  const { walletAddress } = useTwoBlockAuth();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setThreads([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?wallet=${walletAddress}`);
      const data = await res.json();
      setThreads(res.ok ? data.threads ?? [] : []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load message list:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();

    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const unreadCount = threads.filter((t) => t.unread).length;

  return { threads, loading, unreadCount, refresh: load };
}

export function useMessages(otherWallet: string | null) {
  const { walletAddress } = useTwoBlockAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress || !otherWallet) {
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/messages?wallet=${walletAddress}&with=${otherWallet}`);
      const data = await res.json();
      setMessages(res.ok ? data.messages ?? [] : []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress, otherWallet]);

  useEffect(() => {
    load();

    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const send = useCallback(
    async (content: string) => {
      if (!walletAddress || !otherWallet || !content.trim()) return;
      setSending(true);
      setError(null);
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fromWallet: walletAddress, toWallet: otherWallet, content }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to send message");
        setMessages((prev) => [...prev, data.message]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setSending(false);
      }
    },
    [walletAddress, otherWallet]
  );

  return { messages, loading, sending, error, send, refresh: load };
}
