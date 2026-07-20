"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TipButton } from "@/frontend/components/TipButton";
import { OGBadge } from "@/frontend/components/OGBadge";
import { RepostIcon, ThumbsUpIcon, ThumbsDownIcon, MoreIcon, LinkIcon, CheckIcon, TrashIcon } from "@/frontend/components/icons";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { avatarColor, displayName, formatRelativeTime, initials, postHref, profileHref } from "@/frontend/lib/format";
import { linkify } from "@/frontend/lib/linkify";
import type { PostWithAuthor } from "@/shared/types";

interface PostCardProps {
  post: PostWithAuthor;
  onReact: (postId: string, reaction: "agree" | "disagree") => Promise<void>;
  onRepost: (postId: string) => Promise<void>;
  onVote: (postId: string, optionIndex: number) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  // Set to false on the post's own detail page, where clicking the card
  // to navigate to itself would be pointless.
  clickable?: boolean;
}

function PostMenu({
  authorWallet,
  postId,
  onDelete,
}: {
  authorWallet: string;
  postId: string;
  onDelete?: (postId: string) => Promise<void>;
}) {
  const { walletAddress } = useTwoBlockAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isOwner = !!walletAddress && walletAddress === authorWallet;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleCopy = async () => {
    const url = `${window.location.origin}${postHref(postId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch (err) {
      console.error("[TwoBlock] Failed to copy link:", err);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || deleting) return;
    setDeleting(true);
    try {
      await onDelete(postId);
      setOpen(false);
      setConfirming(false);
    } catch (err) {
      console.error("[TwoBlock] Failed to delete post:", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-label="Post options"
      >
        <MoreIcon size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-48 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-hover"
            onClick={handleCopy}
          >
            {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
            {copied ? "Link copied" : "Copy link"}
          </button>
          {isOwner && onDelete && (
            confirming ? (
              <div className="flex items-center gap-1.5 border-t border-surface-border px-3 py-2">
                <button
                  className="flex-1 rounded-xl px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover"
                  onClick={() => setConfirming(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 rounded-xl bg-danger px-2.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            ) : (
              <button
                className="flex w-full items-center gap-2.5 border-t border-surface-border px-4 py-2.5 text-left text-[13.5px] font-medium text-danger transition-colors hover:bg-danger/10"
                onClick={() => setConfirming(true)}
              >
                <TrashIcon size={15} />
                Delete post
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, onReact, onRepost, onVote, onDelete, clickable = true }: PostCardProps) {
  const router = useRouter();
  const [reposting, setReposting] = useState(false);
  const target = post.reposted_post ?? post;

  const MAX_LINES = 10;
  const contentLines = (target.content ?? "").split("\n");
  const isTruncated = clickable && contentLines.length > MAX_LINES;
  const displayedContent = isTruncated ? contentLines.slice(0, MAX_LINES).join("\n") : target.content ?? "";

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

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!clickable) return;
    // Ignore clicks that originated from a link, button, or other
    // interactive control inside the card (avatar, name, reactions, tip,
    // poll options, the "..." menu) — those handle their own navigation.
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(postHref(target.id));
  };

  return (
    <article
      id={`post-${target.id}`}
      onClick={handleCardClick}
      className={`rounded-2xl border border-surface-border bg-surface p-4 shadow-card transition-colors hover:border-surface-borderStrong ${
        clickable ? "cursor-pointer" : ""
      }`}
    >
      {post.reposted_post && (
        <div className="mb-2 flex items-center gap-2 text-[13px] font-medium text-ink-muted">
          <RepostIcon size={13} />
          {displayName(post.author.username, post.author.wallet_address)} reposted
        </div>
      )}

      <div className="flex items-start gap-3">
        <Link
          href={profileHref(target.author.username, target.author.wallet_address)}
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
          <div className="flex items-center gap-2">
            <Link href={profileHref(target.author.username, target.author.wallet_address)} className="truncate text-[15px] font-bold text-ink hover:underline">
              {displayName(target.author.username, target.author.wallet_address)}
            </Link>
            {target.author.is_og && (
              <span className="flex items-center gap-1 rounded-full border border-surface-border bg-surface-soft px-1.5 py-0.5">
                <OGBadge isOg size={16} />
              </span>
            )}
            <span className="shrink-0 text-[13px] text-ink-faint">{formatRelativeTime(target.created_at)}</span>
          </div>
        </div>

        <PostMenu
          authorWallet={target.author.wallet_address}
          postId={target.id}
          onDelete={onDelete}
        />
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words text-[16px] leading-snug text-ink">{linkify(displayedContent)}</p>
      {isTruncated && (
        <Link
          href={postHref(target.id)}
          className="mt-1 inline-block text-[13px] font-semibold text-brand-blue hover:underline"
        >
          More
        </Link>
      )}

      {target.image_urls.length > 0 && (
        <div
          className={`mt-3 grid gap-1 overflow-hidden rounded-2xl bg-surface-soft ${
            target.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {target.image_urls.map((url, i) =>
            target.image_urls.length === 1 ? (
              <img
                key={url + i}
                src={url}
                alt=""
                loading="lazy"
                className="max-h-96 w-full object-contain"
              />
            ) : (
              <img key={url + i} src={url} alt="" loading="lazy" className="h-full max-h-96 w-full object-cover" />
            )
          )}
        </div>
      )}

      {target.video_url && (
        <div className="mt-3 overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
          <video src={target.video_url} controls preload="metadata" className="max-h-96 w-full bg-black" />
        </div>
      )}

      {target.post_type === "poll" && target.poll_options && <PollView post={target} onVote={onVote} />}

      <div className="mt-3.5 flex items-center justify-between border-t border-surface-border pt-3">
        <div className="-ml-2 flex items-center gap-1 text-ink-muted">
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
        </div>

        <TipButton postId={target.id} toWallet={target.author.wallet_address as `0x${string}`} currentTotal={target.tip_total_usdc} />
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
    <div className="mt-3 flex flex-col gap-2">
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
