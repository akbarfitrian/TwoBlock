"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { useConversations } from "@/frontend/hooks/useMessages";
import { ConnectWalletButton } from "@/frontend/components/ConnectWalletButton";
import { LogoMark, HomeIcon, SearchIcon, UserIcon, VerifiedNavIcon, MessageIcon, BellIcon, TrophyIcon, SettingsIcon, FeatherIcon } from "@/frontend/components/icons";

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
      className={`group flex w-auto items-center gap-3 rounded-full px-3 py-3 text-[17px] font-bold transition-colors lg:w-full ${
        active ? "text-ink" : "text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {icon}
      <span className="hidden lg:inline">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-notify px-1.5 text-[11px] font-bold text-white">
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
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col items-start gap-1 border-r border-surface-border px-3 py-4 md:flex">
      <Link href="/" className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-surface">
        <LogoMark size={26} />
      </Link>

      <nav className="flex w-full flex-1 flex-col gap-1">
        <NavLink href="/" active={pathname === "/"} icon={<HomeIcon size={22} filled={pathname === "/"} />} label="Home" />
        <NavLink href="/search" active={pathname === "/search"} icon={<SearchIcon size={22} />} label="Search" />
        {walletAddress && (
          <NavLink
            href={`/profile/${walletAddress}`}
            active={pathname === `/profile/${walletAddress}`}
            icon={<UserIcon size={22} filled={pathname === `/profile/${walletAddress}`} />}
            label="Profile"
          />
        )}
        <NavLink
          href="/verified"
          active={pathname === "/verified"}
          icon={<VerifiedNavIcon size={22} filled={pathname === "/verified"} />}
          label="Get Verified"
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
              href="/notifications"
              active={pathname === "/notifications"}
              icon={<BellIcon size={22} filled={pathname === "/notifications"} />}
              label="Notifications"
              badge={unreadCount}
            />
            <NavLink
              href="/quests"
              active={pathname === "/quests"}
              icon={<TrophyIcon size={22} filled={pathname === "/quests"} />}
              label="Quests"
            />
            <NavLink
              href="/settings"
              active={pathname === "/settings"}
              icon={<SettingsIcon size={22} filled={pathname === "/settings"} />}
              label="Settings"
            />
          </>
        )}
      </nav>

      <div className="mt-auto flex w-full flex-col gap-2">
        {walletAddress && (
          <Link
            href="/"
            className="flex h-11 w-full items-center justify-center rounded-full bg-brand-gradient text-[15px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02] active:scale-95"
          >
            <span className="hidden lg:inline">Post</span>
            <span className="lg:hidden">
              <FeatherIcon size={18} />
            </span>
          </Link>
        )}
        <ConnectWalletButton />
      </div>
    </aside>
  );
}
