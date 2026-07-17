"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";

export interface UseFollowState {
  isFollowing: boolean;
  loading: boolean;
  pending: boolean;

  canFollow: boolean;
  toggle: () => Promise<void>;
}

export function useFollow(targetWallet: string | null): UseFollowState {
  const { walletAddress, login } = useTwoBlockAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    if (!walletAddress || !targetWallet || walletAddress === targetWallet) {
      setIsFollowing(false);
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("follows")
      .select("follower_wallet")
      .eq("follower_wallet", walletAddress)
      .eq("following_wallet", targetWallet)
      .maybeSingle();
    setIsFollowing(!!data);
    setLoading(false);
  }, [walletAddress, targetWallet]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (!targetWallet) return;
    if (!walletAddress) {
      await login();
      return;
    }
    if (walletAddress === targetWallet) return;

    setPending(true);
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    try {
      const res = await fetch("/api/follows", {
        method: nextState ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followerWallet: walletAddress, followingWallet: targetWallet }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error("[TwoBlock] Failed to toggle follow:", err);
      setIsFollowing(!nextState);
    } finally {
      setPending(false);
    }
  }, [walletAddress, targetWallet, isFollowing, login]);

  return {
    isFollowing,
    loading,
    pending,
    canFollow: !!walletAddress && !!targetWallet && walletAddress !== targetWallet,
    toggle,
  };
}
