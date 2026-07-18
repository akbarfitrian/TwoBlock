"use client";

import { useFollow } from "@/frontend/hooks/useFollow";

export function FollowButton({ targetWallet }: { targetWallet: string }) {
  const { isFollowing, pending, canFollow, toggle } = useFollow(targetWallet);

  if (!canFollow) return null;

  return (
    <button
      className={
        isFollowing
          ? "rounded-full border border-surface-border px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:border-danger/50 hover:bg-danger/10 hover:text-danger"
          : "rounded-full bg-ink px-4 py-2 text-[14px] font-semibold text-base transition-colors hover:opacity-90"
      }
      onClick={toggle}
      disabled={pending}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
}
