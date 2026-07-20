"use client";

import { useState } from "react";
import Link from "next/link";
import { useTopTippers } from "@/frontend/hooks/useTopTippers";
import { TrophyIcon, XLogoIcon, DiscordLogoIcon, GithubLogoIcon } from "@/frontend/components/icons";
import { OGBadge } from "@/frontend/components/OGBadge";
import { avatarColor, profileHref } from "@/frontend/lib/format";

const COLLAPSED_COUNT = 3;

export function RightPanel() {
  const { tippers, loading } = useTopTippers(10);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? tippers : tippers.slice(0, COLLAPSED_COUNT);

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-4 overflow-y-auto px-4 py-4 lg:flex">
      <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="m-0 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <span className="text-brand-blue">
              <TrophyIcon size={18} />
            </span>
            Top Tippers
          </h2>
          {tippers.length > COLLAPSED_COUNT && (
            <button
              type="button"
              className="text-[13px] font-semibold text-brand-blue hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Show less" : "View all"}
            </button>
          )}
        </div>

        {loading && <p className="py-2 text-[13px] text-ink-muted">Loading…</p>}
        {!loading && tippers.length === 0 && <p className="py-2 text-[13px] text-ink-muted">No tips yet.</p>}

        <ul className="flex flex-col gap-3">
          {visible.map((tipper, i) => (
            <li key={tipper.wallet} className="flex items-center gap-2.5">
              <span className="w-4 shrink-0 text-center text-[13px] font-semibold text-ink-muted">{i + 1}</span>
              <Link
                href={profileHref(tipper.username, tipper.wallet)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl -m-1 p-1 transition-colors hover:bg-surface-hover"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
                  style={{ background: avatarColor(tipper.wallet) }}
                >
                  {tipper.avatarUrl ? (
                    <img src={tipper.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    tipper.label.replace("@", "").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-[13px] font-semibold text-ink">
                    <span className="truncate">{tipper.label}</span>
                    <OGBadge isOg={tipper.isOg} size={13} />
                  </span>
                </span>
              </Link>
              <span className="shrink-0 text-[13px] font-semibold text-ink-muted">
                ${tipper.totalTippedUsdc.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flex items-center gap-3 px-1 text-[12px] text-ink-faint">
        <span>TwoBlock</span>
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