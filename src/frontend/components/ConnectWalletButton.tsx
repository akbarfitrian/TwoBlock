"use client";

import { useEffect, useRef, useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { OGBadge } from "@/frontend/components/OGBadge";
import { MoreIcon, LogoutIcon, WalletIcon } from "@/frontend/components/icons";
import { avatarColor, displayName, initials, shortenAddress } from "@/frontend/lib/format";

export function ConnectWalletButton() {
  const { ready, authenticated, walletAddress, login, logout } = useTwoBlockAuth();
  const { profile } = useProfile();
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (!ready) {
    return <div className="h-11 w-11 animate-pulse rounded-full bg-surface-soft lg:w-full" aria-hidden />;
  }

  if (!authenticated || !walletAddress) {
    return (

      <button
        type="button"
        className="flex w-auto items-center justify-center gap-2 rounded-full bg-brand-gradient px-3 py-3 text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.03] active:scale-95 lg:w-full lg:px-4"
        onClick={login}
        title="Connect Wallet"
      >
        <WalletIcon size={20} className="lg:hidden" />
        <span className="hidden font-display text-[15px] font-bold lg:inline">Connect Wallet</span>
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative w-auto lg:w-full">
      {menuOpen && (
        <div className="absolute bottom-[calc(100%+8px)] left-0 w-40 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card lg:w-full">
          <button
            className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[14px] font-semibold text-danger transition-colors hover:bg-surface-hover"
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
          >
            <LogoutIcon size={16} />
            Disconnect
          </button>
        </div>
      )}

      {}
      <button
        type="button"
        className="flex w-auto items-center gap-2 rounded-full p-1.5 transition-colors hover:opacity-90 lg:w-full lg:border lg:border-surface-border lg:bg-surface lg:pl-1.5 lg:pr-1.5 lg:hover:opacity-100"
        onClick={() => setMenuOpen((v) => !v)}
        title={displayName(profile?.username ?? null, walletAddress)}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
          style={{ background: avatarColor(walletAddress) }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(profile?.username ?? null, walletAddress)
          )}
        </span>

        <span className="hidden min-w-0 flex-1 flex-col justify-center text-left leading-tight lg:flex">
          <span className="flex min-w-0 items-center">
            <span className="truncate text-[13.5px] font-bold text-ink">{displayName(profile?.username ?? null, walletAddress)}</span>
            {profile && <OGBadge isOg={profile.is_og} size={13} />}
          </span>
          {profile?.username && (
            <span className="truncate font-mono text-[11.5px] text-ink-faint">{shortenAddress(walletAddress)}</span>
          )}
        </span>

        <span className="ml-auto hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink lg:flex">
          <MoreIcon size={17} />
        </span>
      </button>
    </div>
  );
}
