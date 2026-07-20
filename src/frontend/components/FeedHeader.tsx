"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, CheckIcon } from "@/frontend/components/icons";

export type FeedTab = "posts" | "announcements";
export type FeedSort = "latest" | "top_tipped";

const SORT_LABEL: Record<FeedSort, string> = {
  latest: "Latest",
  top_tipped: "Most tipped",
};

interface FeedHeaderProps {
  tab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
  sort: FeedSort;
  onSortChange: (sort: FeedSort) => void;
}

export function FeedHeader({ tab, onTabChange, sort, onSortChange }: FeedHeaderProps) {
  const [sortOpen, setSortOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sortOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [sortOpen]);

  return (
    <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => onTabChange("posts")}
          className={`relative pb-3 pt-1 text-[16px] font-bold transition-colors ${
            tab === "posts" ? "text-brand-blue" : "text-ink-muted hover:text-ink"
          }`}
        >
          Posts
          {tab === "posts" && <span className="absolute inset-x-0 -bottom-3 h-[3px] rounded-full bg-brand-blue" />}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("announcements")}
          className={`relative pb-3 pt-1 text-[16px] font-bold transition-colors ${
            tab === "announcements" ? "text-brand-blue" : "text-ink-muted hover:text-ink"
          }`}
        >
          Announcements
          {tab === "announcements" && <span className="absolute inset-x-0 -bottom-3 h-[3px] rounded-full bg-brand-blue" />}
        </button>
      </div>

      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setSortOpen((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-hover"
        >
          {SORT_LABEL[sort]}
          <ChevronDownIcon size={14} />
        </button>
        {sortOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-40 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
            {(Object.keys(SORT_LABEL) as FeedSort[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSortChange(key);
                  setSortOpen(false);
                }}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left text-[13px] font-medium text-ink transition-colors hover:bg-surface-hover"
              >
                {SORT_LABEL[key]}
                {sort === key && <CheckIcon size={14} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
