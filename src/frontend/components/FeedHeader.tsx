"use client";

export type FeedTab = "posts" | "announcements";

interface FeedHeaderProps {
  tab: FeedTab;
  onTabChange: (tab: FeedTab) => void;
}

export function FeedHeader({ tab, onTabChange }: FeedHeaderProps) {
  return (
    <div className="flex h-16 items-center gap-5 border-b border-surface-border px-4">
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
  );
}
