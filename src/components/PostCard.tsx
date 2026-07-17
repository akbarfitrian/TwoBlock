"use client";

import Link from "next/link";
import { useState } from "react";
import { TipButton } from "@/components/TipButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { RepostIcon, ThumbsUpIcon, ThumbsDownIcon } from "@/components/icons";
import { avatarColor, displayName, formatRelativeTime, initials } from "@/lib/utils/format";
import { linkify } from "@/lib/utils/linkify";
import type { PostWithAuthor } from "@/lib/types";

interface PostCardProps {
  post: PostWithAuthor;
  onReact: (postId: string, reaction: "agree" | "disagree") => Promise<void>;
  onRepost: (postId: string) => Promise<void>;
  onVote: (postId: string, optionIndex: number) => Promise<void>;
}

export function PostCard({ post, onReact, onRepost, onVote }: PostCardProps) {
  const [reposting, setReposting] = useState(false);
  const target = post.reposted_post ?? post;

  const handleRepost = async () => {
    setReposting(true);
    try {
      await onRepost(target.id);
    } catch (err) {
      console.error("[TwoBlock] Repost failed:", err);
    } finally {
      setReposting(false);
    }
  };

  return (
    <article id={`post-${target.id}`} className="border-b border-surface-border px-4 pt-3 transition-colors hover:bg-surface/40">
      {post.reposted_post && (
        <div className="mb-1.5 flex items-center gap-2 pl-8 text-[13px] font-medium text-ink-muted">
          <RepostIcon size={13} />
          {displayName(post.author.username, post.author.wallet_address)} reposted
        </div>
      )}

      <div className="flex gap-3 pb-3">
        <Link
          href={`/profile/${target.author.wallet_address}`}
          className="h-11 w-11 shrink-0 overflow-hidden rounded-full text-sm font-semibold text-white transition-transform duration-150 hover:scale-105"
          style={{ background: avatarColor(target.author.wallet_address) }}
        >
          <span className="flex h-full w-full items-center justify-center">
            {target.author.avatar_url ? (
              <img src={target.author.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(target.author.username, target.author.wallet_address)
            )}
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link href={`/profile/${target.author.wallet_address}`} className="truncate text-[14px] font-semibold text-ink hover:underline">
              {displayName(target.author.username, target.author.wallet_address)}
            </Link>
            <VerifiedBadge tier={target.author.verification_tier} />
            <span className="text-ink-faint">·</span>
            <span className="shrink-0 text-[13px] text-ink-muted">{formatRelativeTime(target.created_at)}</span>
          </div>

          <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] text-ink">{linkify(target.content ?? "")}</p>

          {target.image_urls.length > 0 && (
            <div
              className={`mt-2 grid gap-1 overflow-hidden rounded-2xl ${
                target.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
              }`}
            >
              {target.image_urls.map((url, i) => (
                <img key={url + i} src={url} alt="" loading="lazy" className="h-full max-h-96 w-full object-cover" />
              ))}
            </div>
          )}

          {target.post_type === "poll" && target.poll_options && <PollView post={target} onVote={onVote} />}

          <div className="-ml-2 mt-2 flex max-w-md items-center justify-between pb-1.5 text-ink-muted">
            <button
              className={`group flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-medium transition-colors hover:bg-emerald/10 hover:text-emerald ${
                target.my_reaction === "agree" ? "text-emerald" : ""
              }`}
              onClick={() => onReact(target.id, "agree")}
            >
              <ThumbsUpIcon size={16} filled={target.my_reaction === "agree"} />
              <span>{target.agree_count}</span>
            </button>
            <button
              className={`group flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-medium transition-colors hover:bg-danger/10 hover:text-danger ${
                target.my_reaction === "disagree" ? "text-danger" : ""
              }`}
              onClick={() => onReact(target.id, "disagree")}
            >
              <ThumbsDownIcon size={16} filled={target.my_reaction === "disagree"} />
              <span>{target.disagree_count}</span>
            </button>
            <button
              className="flex items-center gap-1.5 rounded-full py-1.5 pl-2 pr-3 text-[13px] font-medium transition-colors hover:bg-brand-blue/10 hover:text-brand-blue disabled:opacity-50"
              onClick={handleRepost}
              disabled={reposting}
            >
              <RepostIcon size={16} />
              {reposting && <span>…</span>}
            </button>
            <TipButton postId={target.id} toWallet={target.author.wallet_address as `0x${string}`} currentTotal={target.tip_total_usdc} />
            <CopyLinkButton authorWallet={target.author.wallet_address} postId={target.id} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PollView({
  post,
  onVote,
}: {
  post: PostWithAuthor;
  onVote: (postId: string, optionIndex: number) => Promise<void>;
}) {
  const [voting, setVoting] = useState(false);
  const options = post.poll_options ?? [];
  const totalVotes = post.poll_vote_counts.reduce((sum, c) => sum + c, 0);
  const expired = post.poll_expires_at ? new Date(post.poll_expires_at) < new Date() : false;
  const showResults = post.my_poll_vote !== null || expired;

  const handleVote = async (optionIndex: number) => {
    if (showResults || voting) return;
    setVoting(true);
    try {
      await onVote(post.id, optionIndex);
    } catch (err) {
      console.error("[TwoBlock] Vote failed:", err);
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="mt-2 flex flex-col gap-2">
      {options.map((opt) => {
        const count = post.poll_vote_counts[opt.index] ?? 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const isMine = post.my_poll_vote === opt.index;

        if (showResults) {
          return (
            <div
              key={opt.index}
              className={`relative overflow-hidden rounded-xl border px-3 py-2 text-[14px] ${
                isMine ? "border-brand-blue/60" : "border-surface-border"
              }`}
            >
              <div className="absolute inset-y-0 left-0 bg-brand-blue/10" style={{ width: `${pct}%` }} />
              <div className="relative flex items-center justify-between">
                <span className="font-medium text-ink">{opt.label}</span>
                <span className="text-ink-muted">{pct}%</span>
              </div>
            </div>
          );
        }
        return (
          <button
            key={opt.index}
            className="rounded-xl border border-surface-border px-3 py-2 text-left text-[14px] font-medium text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
            onClick={() => handleVote(opt.index)}
            disabled={voting}
          >
            {opt.label}
          </button>
        );
      })}
      <div className="text-[12px] text-ink-faint">
        {totalVotes} vote{totalVotes === 1 ? "" : "s"}
        {post.poll_expires_at && !expired && <> · ends {new Date(post.poll_expires_at).toLocaleDateString("en-US")}</>}
        {expired && <> · poll ended</>}
      </div>
    </div>
  );
}
