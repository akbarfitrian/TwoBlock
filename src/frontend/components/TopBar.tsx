"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { useTheme } from "@/frontend/hooks/useTheme";
import { OGBadge } from "@/frontend/components/OGBadge";
import { NetworkSelector } from "@/frontend/components/NetworkSelector";
import {
  BellIcon,
  ChevronDownIcon,
  WalletIcon,
  UserIcon,
  LogoutIcon,
  SettingsIcon,
  HelpIcon,
  DocsIcon,
  SunIcon,
  MoonIcon,
  RefreshIcon,
  FeatherIcon,
} from "@/frontend/components/icons";
import { avatarColor, displayName, formatRelativeTime, initials, profileHref, shortenAddress } from "@/frontend/lib/format";

// Fired to tell the feed's PostComposer to open its modal. When we're
// already on "/" this reaches the mounted composer directly; when we're
// not, OPEN_COMPOSER_STORAGE_KEY carries the intent across the navigation
// so the composer can pick it up once it mounts (see PostComposer.tsx).
export const OPEN_COMPOSER_EVENT = "twoblock:open-composer";
export const OPEN_COMPOSER_STORAGE_KEY = "twoblock-open-composer";


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

function SettingsMenu() {
  const { theme, toggleTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-label="Settings"
        aria-expanded={open}
      >
        <SettingsIcon size={22} filled={open} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 overflow-hidden rounded-2xl border border-surface-border bg-surface p-2 shadow-card">
          <Link
            href="/help"
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            onClick={() => setOpen(false)}
          >
            <HelpIcon size={16} />
            Help
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            onClick={() => setOpen(false)}
          >
            <DocsIcon size={16} />
            Docs
          </Link>

          <div className="mt-1 flex items-center justify-between gap-2 border-t border-surface-border px-2.5 pt-2">
            <span className="text-[14px] font-semibold text-ink-muted">Theme</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                role="switch"
                aria-checked={theme === "dark"}
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-brand-blue/50 bg-brand-blue/10 text-brand-blue transition-colors hover:bg-brand-blue/20"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <MoonIcon size={15} /> : <SunIcon size={15} />}
              </button>
              <button
                type="button"
                onClick={() => setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
                title="Reset to system theme"
              >
                <RefreshIcon size={14} />
              </button>
            </div>
          </div>
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
        className="flex h-11 shrink-0 items-center gap-2 rounded-full pl-1 pr-3 transition-colors hover:bg-surface"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
      >
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
          style={{ background: avatarColor(walletAddress) }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(profile?.username ?? null, walletAddress)
          )}
        </span>
        <span className="hidden max-w-[140px] items-center gap-1 truncate text-[14px] font-semibold text-ink sm:flex">
          <span className="truncate">{displayName(profile?.username ?? null, walletAddress)}</span>
          <OGBadge isOg={profile?.is_og ?? false} points={profile?.total_points ?? 0} size={13} />
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

function ComposeButton() {
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    if (pathname === "/") {
      window.dispatchEvent(new Event(OPEN_COMPOSER_EVENT));
    } else {
      sessionStorage.setItem(OPEN_COMPOSER_STORAGE_KEY, "1");
      router.push("/");
    }
  };

  return (
    <button
      type="button"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface hover:text-ink"
      onClick={handleClick}
      aria-label="New post"
      title="New post"
    >
      <FeatherIcon size={20} />
    </button>
  );
}

export function TopBar() {
  const { ready, authenticated, login } = useTwoBlockAuth();

  return (
    <header className="sticky top-0 z-40 flex h-16 min-w-0 flex-wrap items-center gap-2 border-b border-surface-border bg-base/90 pl-8 pr-4 backdrop-blur">
      <div className="flex shrink-0 items-center gap-1">
        {ready && authenticated ? (
          <>
            <NetworkSelector />
            <ComposeButton />
            <NotificationsMenu />
            <SettingsMenu />
            <AccountMenu />
          </>
        ) : (
          ready && (
            <>
              <NetworkSelector />
              <SettingsMenu />
              <button
                type="button"
                onClick={login}
                className="shrink-0 rounded-full border border-surface-border bg-surface px-4 py-2.5 text-[14px] font-bold text-ink transition-colors hover:bg-surface-hover"
              >
                Connect Wallet
              </button>
            </>
          )
        )}
      </div>
    </header>
  );
}