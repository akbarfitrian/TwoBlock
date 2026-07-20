"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { OGBadge } from "@/frontend/components/OGBadge";
import {
  SearchIcon,
  CommandIcon,
  FeatherIcon,
  BellIcon,
  ChevronDownIcon,
  WalletIcon,
  UserIcon,
  LogoutIcon,
} from "@/frontend/components/icons";
import { avatarColor, displayName, formatRelativeTime, initials, profileHref, shortenAddress } from "@/frontend/lib/format";

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

function NotificationsMenu() {
  const { notifications, unreadCount, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const LABEL: Record<string, string> = {
    follow: "followed you",
    repost: "reposted your post",
    tip: "tipped you",
    reaction: "reacted to your post",
    poll_result: "poll you voted in ended",
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
      >
        <BellIcon size={22} filled={open} />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-notify px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-80 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
            <span className="font-display text-[15px] font-bold text-ink">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-[12px] font-semibold text-brand-blue hover:underline"
                onClick={() => markAllAsRead()}
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-ink-muted">No notifications yet.</p>
            )}
            {notifications.slice(0, 8).map((n) => (
              <div
                key={n.id}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-surface-hover ${
                  n.is_read ? "" : "bg-brand-blue/5"
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
                  style={{ background: n.actor ? avatarColor(n.actor.wallet_address) : "#888" }}
                >
                  {n.actor?.avatar_url ? (
                    <img src={n.actor.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : n.actor ? (
                    initials(n.actor.username, n.actor.wallet_address)
                  ) : (
                    "?"
                  )}
                </span>
                <span className="min-w-0 flex-1 text-ink-muted">
                  <span className="font-semibold text-ink">
                    {n.actor ? displayName(n.actor.username, n.actor.wallet_address) : "Someone"}
                  </span>{" "}
                  {LABEL[n.type] ?? "sent a notification"}
                </span>
                <span className="shrink-0 text-[11px] text-ink-faint">{formatRelativeTime(n.created_at)}</span>
              </div>
            ))}
          </div>
          <Link
            href="/notifications"
            className="block border-t border-surface-border px-4 py-2.5 text-center text-[13px] font-semibold text-brand-blue hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </div>
      )}
    </div>
  );
}

function AccountMenu() {
  const { walletAddress, logout } = useTwoBlockAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  if (!walletAddress) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-surface-border bg-surface py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-surface-hover"
        onClick={() => setOpen((v) => !v)}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
          style={{ background: avatarColor(walletAddress) }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(profile?.username ?? null, walletAddress)
          )}
        </span>
        <span className="hidden items-center gap-1 text-[14px] font-semibold text-ink sm:flex">
          {displayName(profile?.username ?? null, walletAddress)}
          {profile && <OGBadge isOg={profile.is_og} size={13} />}
        </span>
        <ChevronDownIcon size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          <div className="border-b border-surface-border px-4 py-3">
            <p className="text-[13px] font-bold text-ink">{displayName(profile?.username ?? null, walletAddress)}</p>
            <p className="font-mono text-[11.5px] text-ink-faint">{shortenAddress(walletAddress)}</p>
          </div>
          <Link
            href={profileHref(profile?.username ?? null, walletAddress)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            <UserIcon size={16} />
            Profile
          </Link>
          <Link
            href="/wallet"
            className="flex items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
            onClick={() => setOpen(false)}
          >
            <WalletIcon size={16} />
            Wallet
          </Link>
          <button
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[14px] font-semibold text-danger transition-colors hover:bg-surface-hover"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogoutIcon size={16} />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

export function TopBar() {
  const router = useRouter();
  const { ready, authenticated, login } = useTwoBlockAuth();

  const handleStartPosting = () => {
    router.push("/");
    // Give the feed a tick to mount, then focus the composer textarea.
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>("[data-composer-textarea]");
      el?.focus();
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-surface-border bg-base/90 px-4 py-3 backdrop-blur">
      <Link
        href="/search"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-full border border-surface-border bg-surface px-4 py-2.5 text-ink-faint transition-colors hover:border-surface-borderStrong"
      >
        <SearchIcon size={16} />
        <span className="min-w-0 flex-1 truncate text-[14px]">Search TwoBlock…</span>
        <span className="hidden shrink-0 items-center gap-0.5 rounded-md border border-surface-border px-1.5 py-0.5 text-[11px] font-semibold text-ink-faint sm:flex">
          <CommandIcon size={11} />K
        </span>
      </Link>

      <button
        type="button"
        onClick={handleStartPosting}
        className="flex shrink-0 items-center gap-2 rounded-full bg-brand-gradient px-4 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02] active:scale-95"
      >
        <FeatherIcon size={16} />
        <span className="hidden sm:inline">Start Posting</span>
      </button>

      {ready && authenticated ? (
        <>
          <NotificationsMenu />
          <AccountMenu />
        </>
      ) : (
        ready && (
          <button
            type="button"
            onClick={login}
            className="shrink-0 rounded-full border border-surface-border bg-surface px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-surface-hover"
          >
            Connect Wallet
          </button>
        )
      )}
    </header>
  );
}
