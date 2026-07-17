"use client";

import { useState, useEffect, useRef, type FormEvent } from "react";
import Link from "next/link";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { useConversations, useMessages } from "@/hooks/useMessages";
import { useViewedProfile } from "@/hooks/useViewedProfile";
import { avatarColor, displayName, formatRelativeTime, initials } from "@/lib/utils/format";
import { linkify } from "@/lib/utils/linkify";
import { SendIcon } from "@/components/icons";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BackButton } from "@/components/BackButton";

export function MessagesPage() {
  const { walletAddress: myWallet, ready } = useTwoBlockAuth();
  const { threads, loading } = useConversations();

  if (ready && !myWallet) {
    return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Connect your wallet to view messages.</p>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <h1 className="border-b border-surface-border px-4 py-4 font-display text-[20px] font-bold text-ink">Messages</h1>
      {loading && threads.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading…</p>}
      {!loading && threads.length === 0 && (
        <p className="px-4 py-6 text-center text-[14px] text-ink-muted">No conversations yet.</p>
      )}
      {threads.map((thread) => (
        <Link
          key={thread.otherWallet}
          href={`/messages/${thread.otherWallet}`}
          className="flex items-center gap-3 border-b border-surface-border px-4 py-3 transition-colors hover:bg-surface/40"
        >
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
            style={{ background: avatarColor(thread.otherWallet) }}
          >
            {thread.otherAvatarUrl ? (
              <img src={thread.otherAvatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(thread.otherUsername, thread.otherWallet)
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 truncate font-mono text-[13px] font-semibold text-ink">
              <span className="truncate">{displayName(thread.otherUsername, thread.otherWallet)}</span>
              <VerifiedBadge tier={thread.otherVerificationTier} size={13} />
            </div>
            <div className="truncate text-[13px] text-ink-muted">
              {thread.lastMessageFromMe ? "You: " : ""}
              {thread.lastMessage}
            </div>
          </div>
          <span className="shrink-0 text-[12px] text-ink-faint">{formatRelativeTime(thread.lastMessageAt)}</span>
        </Link>
      ))}
    </div>
  );
}

export function ConversationPage({ walletAddress }: { walletAddress: string }) {
  const { walletAddress: myWallet, ready } = useTwoBlockAuth();

  if (ready && !myWallet) {
    return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Connect your wallet to view messages.</p>;
  }

  if (!myWallet) return null;

  return (
    <div className="flex min-h-screen flex-col">
      <ConversationPanel myWallet={myWallet} otherWallet={walletAddress} />
    </div>
  );
}

function ConversationPanel({ myWallet, otherWallet }: { myWallet: string; otherWallet: string }) {
  const { messages, loading, sending, error, send } = useMessages(otherWallet);
  const { profile: otherProfile } = useViewedProfile(otherWallet);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    const content = draft;
    setDraft("");
    await send(content);
  };

  return (
    <>
      <header className="flex items-center gap-2.5 border-b border-surface-border px-4 py-3.5">
        <BackButton href="/messages" />
        <Link
          href={`/profile/${otherWallet}`}
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
          style={{ background: avatarColor(otherWallet) }}
        >
          {otherProfile?.avatar_url ? (
            <img src={otherProfile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(otherProfile?.username ?? null, otherWallet)
          )}
        </Link>
        <div className="flex items-center gap-1">
          <Link href={`/profile/${otherWallet}`} className="font-semibold text-ink hover:underline">
            {displayName(otherProfile?.username ?? null, otherWallet)}
          </Link>
          {otherProfile && <VerifiedBadge tier={otherProfile.verification_tier} />}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 py-4">
        {loading && messages.length === 0 && <p className="text-center text-[14px] text-ink-muted">Loading conversation…</p>}
        {messages.map((msg) => {
          const isMine = msg.from_wallet.toLowerCase() === myWallet.toLowerCase();
          return (
            <div
              key={msg.id}
              className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-[14px] ${
                isMine ? "self-end bg-brand-gradient text-accent-contrast" : "self-start bg-surface-soft text-ink"
              }`}
            >
              {linkify(msg.content, isMine ? "underline text-accent-contrast hover:opacity-80" : undefined)}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 text-[13px] text-danger">{error}</p>}

      <form className="flex items-center gap-2 border-t border-surface-border p-3" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          maxLength={2000}
          className="flex-1 rounded-full border border-surface-border bg-transparent px-4 py-2.5 text-[14px] text-ink placeholder:text-ink-faint outline-none focus:border-brand-blue/50"
        />
        <button
          type="submit"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-accent-contrast shadow-glow disabled:opacity-50 disabled:shadow-none"
          disabled={sending || !draft.trim()}
        >
          <SendIcon size={18} />
        </button>
      </form>
    </>
  );
}
