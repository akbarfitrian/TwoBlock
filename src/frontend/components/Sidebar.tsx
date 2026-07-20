"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { useConversations } from "@/frontend/hooks/useMessages";
import { useTheme } from "@/frontend/hooks/useTheme";
import {
  LogoMark,
  HomeIcon,
  CompassIcon,
  MessageIcon,
  TrophyIcon,
  WalletIcon,
  SettingsIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  HelpIcon,
  DocsIcon,
  SunIcon,
  MoonIcon,
  RefreshIcon,
} from "@/frontend/components/icons";

function NavLink({
  href,
  active,
  icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`group flex w-auto items-center gap-3 rounded-xl px-3 py-3 text-[16px] font-bold transition-colors lg:w-full ${
        active
          ? "bg-brand-gradient text-accent-contrast shadow-glow"
          : "text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`ml-auto flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
            active ? "bg-white/25 text-accent-contrast" : "bg-notify text-white"
          }`}
        >
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const { walletAddress } = useTwoBlockAuth();
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useConversations();
  const { theme, toggleTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <aside className="sticky top-0 hidden h-screen flex-col items-start gap-1 border-r border-surface-border px-3 py-4 md:flex">
      <Link href="/" className="mb-3 flex w-auto items-center gap-2.5 rounded-full px-1 lg:w-full">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center">
          <LogoMark size={40} />
        </span>
        <span className="hidden font-display text-[19px] font-bold text-ink lg:inline">TwoBlock</span>
      </Link>

      <nav className="flex w-full flex-1 flex-col gap-1">
        <NavLink href="/" active={pathname === "/"} icon={<HomeIcon size={22} filled={pathname === "/"} />} label="Feed" />
        <NavLink
          href="/search"
          active={pathname === "/search"}
          icon={<CompassIcon size={22} filled={pathname === "/search"} />}
          label="Discover"
        />
        {walletAddress && (
          <>
            <NavLink
              href="/messages"
              active={pathname.startsWith("/messages")}
              icon={<MessageIcon size={22} filled={pathname.startsWith("/messages")} />}
              label="Messages"
              badge={unreadMessages}
            />
            <NavLink
              href="/wallet"
              active={pathname === "/wallet"}
              icon={<WalletIcon size={22} />}
              label="Wallet"
            />
            <NavLink
              href="/quests"
              active={pathname === "/quests"}
              icon={<TrophyIcon size={22} filled={pathname === "/quests"} />}
              label="Quests"
            />
          </>
        )}
      </nav>

      <div className="mt-auto flex w-full flex-col gap-1">
        <button
          type="button"
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex w-auto items-center gap-3 rounded-xl px-3 py-3 text-[16px] font-bold text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:w-full"
          aria-expanded={settingsOpen}
        >
          <SettingsIcon size={22} filled={settingsOpen} />
          <span className="hidden lg:inline">Settings</span>
          <span className="ml-auto hidden text-ink-faint lg:inline">
            {settingsOpen ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
          </span>
        </button>

        {settingsOpen && (
          <div className="hidden w-full flex-col gap-0.5 rounded-2xl border border-surface-border bg-surface p-2 lg:flex">
            <Link
              href="/settings"
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <HelpIcon size={16} />
              Help
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <DocsIcon size={16} />
              Docs
            </a>

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
    </aside>
  );
}