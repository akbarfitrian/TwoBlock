"use client";

import { useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { useUserSearch } from "@/frontend/hooks/useUserSearch";
import { MAX_COMMENT_CHARS } from "@/shared/comment-limits";
import { avatarColor, initials } from "@/frontend/lib/format";
import { OGBadge } from "@/frontend/components/OGBadge";

interface CommentComposerProps {
  onSubmit: (content: string) => Promise<void>;
}

// Finds the @token (if any) that the caret is currently sitting inside of,
// so we know what to search for and what range of text to replace when a
// suggestion is picked. Mirrors the @mention shape linkify.tsx renders.
function findActiveMention(value: string, caret: number): { start: number; query: string } | null {
  const uptoCaret = value.slice(0, caret);
  const match = uptoCaret.match(/(?:^|\s)@([a-zA-Z0-9_]{0,20})$/);
  if (!match) return null;
  const query = match[1];
  const start = caret - query.length - 1;
  return { start, query };
}

export function CommentComposer({ onSubmit }: CommentComposerProps) {
  const { authenticated, login, walletAddress } = useTwoBlockAuth();
  const { profile } = useProfile();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { query, setQuery, results } = useUserSearch();
  const [activeMention, setActiveMention] = useState<{ start: number; query: string } | null>(null);

  const overLimit = content.length > MAX_COMMENT_CHARS;
  const canSubmit = authenticated && !submitting && content.trim().length > 0 && !overLimit;

  const suggestions = useMemo(
    () => (activeMention ? results.filter((p) => p.username).slice(0, 6) : []),
    [activeMention, results]
  );

  const syncMentionState = (value: string, caret: number) => {
    const mention = findActiveMention(value, caret);
    setActiveMention(mention);
    setMentionIndex(0);
    setQuery(mention ? mention.query : "");
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setContent(value);
    syncMentionState(value, e.target.selectionStart ?? value.length);
  };

  const insertMention = (username: string) => {
    if (!activeMention || !textareaRef.current) return;
    const before = content.slice(0, activeMention.start);
    const after = content.slice(activeMention.start + 1 + activeMention.query.length);
    const next = `${before}@${username} ${after}`;
    setContent(next);
    setActiveMention(null);
    setQuery("");

    const caret = before.length + username.length + 2;
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(caret, caret);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (activeMention && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const picked = suggestions[mentionIndex];
        if (picked?.username) insertMention(picked.username);
        return;
      }
      if (e.key === "Escape") {
        setActiveMention(null);
        return;
      }
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(content.trim());
      setContent("");
      setActiveMention(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authenticated) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface p-3">
        <p className="text-[13px] text-ink-muted">Connect your wallet to join the conversation.</p>
        <button
          className="shrink-0 rounded-full bg-brand-blue px-4 py-1.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          onClick={login}
        >
          Connect
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-surface-border bg-surface p-3">
      <div
        className="h-8 w-8 shrink-0 overflow-hidden rounded-full text-[11px] font-semibold text-white"
        style={{ background: avatarColor(walletAddress ?? "0x0") }}
      >
        <span className="flex h-full w-full items-center justify-center">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : walletAddress ? (
            initials(profile?.username ?? null, walletAddress)
          ) : null}
        </span>
      </div>

      <div className="relative min-w-0 flex-1">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setActiveMention(null), 120)}
          placeholder="Write a reply…"
          rows={1}
          className="w-full resize-none bg-transparent text-[14px] leading-snug text-ink placeholder:text-ink-faint focus:outline-none"
        />

        {activeMention && suggestions.length > 0 && (
          <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-64 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
            {suggestions.map((p, i) => (
              <button
                key={p.wallet_address}
                type="button"
                // onMouseDown (not onClick) so this fires before the
                // textarea's onBlur closes the dropdown.
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (p.username) insertMention(p.username);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  i === mentionIndex ? "bg-surface-hover" : "hover:bg-surface-hover"
                }`}
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-semibold text-white"
                  style={{ background: avatarColor(p.wallet_address) }}
                >
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(p.username, p.wallet_address)
                  )}
                </div>
                <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">@{p.username}</span>
                {p.is_og && <OGBadge isOg size={14} />}
              </button>
            ))}
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-3">
          <div className="min-h-[16px] text-[11.5px]">
            {error && <span className="text-danger">{error}</span>}
            {!error && overLimit && (
              <span className="text-danger">
                {content.length}/{MAX_COMMENT_CHARS}
              </span>
            )}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-full bg-brand-blue px-3.5 py-1 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {submitting ? "Posting…" : "Reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
