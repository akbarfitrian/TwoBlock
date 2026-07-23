"use client";

import { useCallback, useEffect, useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";

export interface DailyQuestStatus {
  key: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  completed: boolean;
}

export function useDailyQuests() {
  const { walletAddress } = useTwoBlockAuth();
  const [quests, setQuests] = useState<DailyQuestStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setQuests([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/quests/daily?wallet=${walletAddress}`);
      const data = await res.json();
      setQuests(res.ok ? data.quests ?? [] : []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load daily quests:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  // Daily quests reset server-side at 00:00 UTC (they're keyed by UTC
  // date). If the app is left open across the boundary, refetch so the
  // reset list shows up without the user having to reload manually.
  useEffect(() => {
    const msUntilNextUtcMidnight = () => {
      const now = new Date();
      const nextMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      );
      return nextMidnight.getTime() - now.getTime();
    };

    let intervalId: ReturnType<typeof setInterval>;
    const timeoutId = setTimeout(() => {
      load();
      intervalId = setInterval(load, 24 * 60 * 60 * 1000);
    }, msUntilNextUtcMidnight());

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [load]);

  // "Open the app today" is the one daily quest the client can trigger
  // directly rather than earning it as a side-effect of another action
  // (posting, commenting, reacting) — fire it once per mount, it's
  // idempotent server-side via the daily_quests primary key.
  useEffect(() => {
    if (!walletAddress) return;
    fetch("/api/quests/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress, questKey: "daily_login" }),
    })
      .then(() => load())
      .catch((err) => console.error("[TwoBlock] Failed to mark daily_login:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const completedCount = quests.filter((q) => q.completed).length;

  return { quests, loading, completedCount, refresh: load };
}