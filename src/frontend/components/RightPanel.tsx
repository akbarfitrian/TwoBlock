"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useTipLeaderboard,
  type LeaderboardDirection,
  type LeaderboardPeriod,
} from "@/frontend/hooks/useTipLeaderboard";
import { TrophyIcon, XLogoIcon, DiscordLogoIcon, GithubLogoIcon } from "@/frontend/components/icons";
import { OGBadge } from "@/frontend/components/OGBadge";
import { avatarColor, profileHref } from "@/frontend/lib/format";

const LEADERBOARD_SIZE = 10;

const PERIOD_TABS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "weekly", label: "This Week" },
  { value: "all", label: "All-Time" },
];

const DIRECTION_TABS: { value: LeaderboardDirection; label: string }[] = [
  { value: "tippers", label: "Top Tippers" },
  { value: "tipped", label: "Top Tipped" },
];

export function RightPanel() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [direction, setDirection] = useState<LeaderboardDirection>("tippers");

  const { entries, loading } = useTipLeaderboard(direction, period, LEADERBOARD_SIZE);

  const emptyLabel =
    direction === "tippers"
      ? period === "weekly"
        ? "No tips sent this week yet."
        : "No tips sent yet."
      : period === "weekly"
        ? "No tips received this week yet."
        : "No tips received yet.";

  return (
    <aside className="hidden flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 lg:flex">
      <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="m-0 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <span className="text-brand-blue">
              <TrophyIcon size={18} />
            </span>
            Leaderboard
          </h2>

          <div className="flex shrink-0 rounded-full bg-surface-soft p-0.5">
            {PERIOD_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setPeriod(tab.value)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-semibold transition-colors ${
                  period === tab.value
                    ? "bg-surface-hover text-ink shadow-sm"
                    : "text-ink-faint hover:text-ink-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex gap-1 border-b border-surface-border">
          {DIRECTION_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setDirection(tab.value)}
              className={`-mb-px border-b-2 px-2 pb-2 text-[13px] font-semibold transition-colors ${
                direction === tab.value
                  ? "border-brand-blue text-ink"
                  : "border-transparent text-ink-faint hover:text-ink-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading && entries.length === 0 && <p className="py-2 text-[13px] text-ink-muted">Loading…</p>}
        {!loading && entries.length === 0 && (
          <p className="py-2 text-[13px] text-ink-muted">{emptyLabel}</p>
        )}

        <ul className="flex flex-col gap-3">
          {entries.map((entry, i) => (
            <li key={entry.wallet} className="flex items-center gap-2.5">
              <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-ink-muted">
                {i + 1}.
              </span>
              <Link
                href={profileHref(entry.username, entry.wallet)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl -m-1 p-1 transition-colors hover:bg-surface-hover"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
                  style={{ background: avatarColor(entry.wallet) }}
                >
                  {entry.avatarUrl ? (
                    <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    entry.label.replace("@", "").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
                    <span className="truncate">{entry.label}</span>
                    <OGBadge isOg={entry.isOg} size={13} />
                  </span>
                </span>
              </Link>
              <span className="shrink-0 rounded-full bg-brand-blue/15 px-2 py-0.5 text-[12px] font-semibold text-brand-blue">
                ${entry.totalUsdc.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>

        {period === "weekly" && (
          <p className="mt-3 border-t border-surface-border pt-2.5 text-[11px] text-ink-faint">
            Based on tips from the last 7 days
          </p>
        )}
      </div>

      <p className="flex items-center gap-3 px-1 text-[12px] text-ink-faint">
        <span>TwoBlock © 2026</span>
        <span aria-hidden="true">·</span>
        <a
          href="https://x.com/twoblockxyz"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TwoBlock on X"
          className="transition-colors hover:text-ink"
        >
          <XLogoIcon size={16} />
        </a>
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TwoBlock on Discord"
          className="transition-colors hover:text-ink"
        >
          <DiscordLogoIcon size={16} />
        </a>
        <a
          href=""
          target="_blank"
          rel="noopener noreferrer"
          aria-label="TwoBlock on GitHub"
          className="transition-colors hover:text-ink"
        >
          <GithubLogoIcon size={16} />
        </a>
      </p>
    </aside>
  );
}
