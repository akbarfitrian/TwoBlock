"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { useConversations } from "@/frontend/hooks/useMessages";
import { useProfile } from "@/frontend/hooks/useProfile";
import { OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";
import {
  LogoMark,
  HomeIcon,
  CompassIcon,
  MessageIcon,
  TrophyIcon,
  WalletIcon,
  OGNavIcon,
} from "@/frontend/components/icons";

function OGUpgradeCard() {
  return (
    <Link
      href="/wallet"
      className="mt-4 hidden w-full flex-col gap-2.5 rounded-2xl border border-brand-blue/40 bg-brand-blue/10 p-4 transition-colors hover:bg-brand-blue/15 lg:flex"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-accent-contrast shadow-glow">
        <OGNavIcon size={18} filled />
      </span>
      <span className="text-[15px] font-bold leading-tight text-ink">Upgrade to OG</span>
      <span className="text-[13px] leading-snug text-ink-muted">
        Post more, unlock analytics, and get lower tip fees — for a one-time payment.
      </span>
      <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-gradient px-3.5 py-2 text-[13px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02]">
        Upgrade now — ${OG_PRICE_USDC}
      </span>
    </Link>
  );
}

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
  const { profile } = useProfile();
  const pathname = usePathname();
  const isOg = !!profile?.is_og;

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

      {walletAddress && !isOg && <OGUpgradeCard />}
    </aside>
  );
}