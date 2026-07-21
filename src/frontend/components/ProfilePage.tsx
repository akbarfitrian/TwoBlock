"use client";

import { useState } from "react";
import Link from "next/link";
import { useViewedProfile } from "@/frontend/hooks/useViewedProfile";
import { usePosts } from "@/frontend/hooks/usePosts";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { FollowButton } from "@/frontend/components/FollowButton";
import { OGBadge } from "@/frontend/components/OGBadge";
import { PostCard } from "@/frontend/components/PostCard";
import { EditProfileModal } from "@/frontend/components/EditProfileModal";
import { BackButton } from "@/frontend/components/BackButton";
import { CameraIcon, MessageIcon } from "@/frontend/components/icons";
import { avatarColor, displayName, initials, shortenAddress } from "@/frontend/lib/format";

export function ProfilePage({ walletAddress: identifier }: { walletAddress: string }) {
  const { walletAddress: myWallet } = useTwoBlockAuth();
  const { profile, followerCount, followingCount, postCount, loading, notFound, refresh } = useViewedProfile(identifier);
  // Downstream actions (posts, follow, messaging) always key off the actual
  // wallet address, even though the page was reached via a username link.
  const walletAddress = profile?.wallet_address ?? identifier;
  const { posts, loadingMore, hasMore, loadMore, repost, toggleReaction, vote, deletePost } = usePosts({ authorWallet: walletAddress });
  const [editing, setEditing] = useState(false);

  if (loading) return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading profile…</p>;
  if (notFound || !profile) {
    return (
      <p className="px-4 py-6 text-center text-[14px] text-ink-muted">
        No profile found for {identifier}.
      </p>
    );
  }

  const isOwnProfile = myWallet === walletAddress;

  return (
    <div className="flex flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-surface-border px-4">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Profile</h1>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-4 rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
          <div className="relative shrink-0">
            <div
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-xl font-semibold text-white"
              style={{ background: avatarColor(profile.wallet_address) }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initials(profile.username, profile.wallet_address)
              )}
            </div>
            {isOwnProfile && (
              <button
                type="button"
                className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-ink text-surface"
                onClick={() => setEditing(true)}
                aria-label="Edit avatar"
              >
                <CameraIcon size={12} />
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="flex items-center gap-1 font-display text-[18px] font-bold text-ink">
              {displayName(profile.username, profile.wallet_address)}
              <OGBadge isOg={profile.is_og} />
            </h2>
            <span className="font-mono text-[13px] text-ink-muted">{shortenAddress(profile.wallet_address)}</span>
            {profile.is_og && profile.og_member_since_block != null && (
              <p className="mt-0.5 text-[12px] text-ink-faint">Member since block {profile.og_member_since_block}</p>
            )}
            {profile.bio && <p className="mt-1 text-[14px] text-ink">{profile.bio}</p>}
            <div className="mt-2 flex gap-4 text-[13px] text-ink-muted">
              <span>
                <b className="text-ink">{postCount}</b> posts
              </span>
              <span>
                <b className="text-ink">{followerCount}</b> followers
              </span>
              <span>
                <b className="text-ink">{followingCount}</b> following
              </span>
            </div>
          </div>
          {isOwnProfile ? (
            <button
              type="button"
              className="shrink-0 rounded-full border border-surface-border px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-hover"
              onClick={() => setEditing(true)}
            >
              Edit profile
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-2">
              {myWallet && (
                <Link
                  href={`/messages/${walletAddress}`}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-surface-border text-ink transition-colors hover:bg-surface-hover"
                  aria-label="Message"
                  title="Message"
                >
                  <MessageIcon size={17} />
                </Link>
              )}
              <FollowButton targetWallet={walletAddress} />
            </div>
          )}
        </div>
      </div>

      {editing && (
        <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSaved={refresh} />
      )}

      <div className="flex flex-col border-t border-surface-border">
        {posts.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">No posts yet.</p>}
        <div className="flex flex-col gap-3 p-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onReact={toggleReaction} onRepost={repost} onVote={vote} onDelete={deletePost} />
          ))}
        </div>
        {hasMore && (
          <button
            className="mx-4 my-4 rounded-full border border-surface-border py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
