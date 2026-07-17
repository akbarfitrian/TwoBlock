"use client";

import { useCallback, useEffect, useState } from "react";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";

export interface QuestProgress {
  key: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
}

export function useQuests() {
  const { walletAddress } = useTwoBlockAuth();
  const [quests, setQuests] = useState<QuestProgress[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress) {
      setQuests([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/quests?wallet=${walletAddress}`);
      const data = await res.json();
      setQuests(res.ok ? data.quests ?? [] : []);
    } catch (err) {
      console.error("[TwoBlock] Failed to load quests:", err);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  const completedCount = quests.filter((q) => q.completed).length;

  return { quests, loading, completedCount, refresh: load };
}
