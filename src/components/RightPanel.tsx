"use client";

import Link from "next/link";
import { useTopTippedPosts } from "@/hooks/useTopTippedPosts";
import { FlameIcon } from "@/components/icons";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { avatarColor } from "@/lib/utils/format";

export function RightPanel() {
  const { posts, loading } = useTopTippedPosts();

  return (
    <aside className="sticky top-0 hidden h-screen flex-col gap-4 overflow-y-auto px-4 py-4 lg:flex">
      <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
        <h2 className="m-0 mb-3 flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
          <span className="text-gold">
            <FlameIcon size={16} />
          </span>
          Top Tipped
        </h2>

        {loading && <p className="py-2 text-[13px] text-ink-muted">Loading…</p>}
        {!loading && posts.length === 0 && <p className="py-2 text-[13px] text-ink-muted">No tips yet.</p>}

        <ul className="flex flex-col gap-3">
          {posts.map((post, i) => (
            <li key={post.postId} className="flex items-center gap-2.5">
              <span className="w-5 shrink-0 text-center text-[13px] font-semibold text-ink-muted">{i + 1}.</span>
              <Link
                href={`/profile/${post.authorWallet}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl -m-1 p-1 transition-colors hover:bg-surface-hover"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
                  style={{ background: avatarColor(post.authorWallet) }}
                >
                  {post.authorAvatarUrl ? (
                    <img src={post.authorAvatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    post.authorLabel.replace("@", "").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate font-mono text-[13px] font-semibold text-ink">
                    <span className="truncate">{post.authorLabel}</span>
                    <VerifiedBadge tier={post.authorTier} size={13} />
                  </span>
                  <span className="line-clamp-1 block text-[13px] text-ink-muted">{post.content?.slice(0, 60)}</span>
                </span>
              </Link>
              <span className="shrink-0 rounded-full bg-brand-blue/15 px-2 py-0.5 text-[12px] font-semibold text-brand-blue">
                ${post.totalTipsUsdc.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="px-1 text-[12px] text-ink-faint">TwoBlock</p>
    </aside>
  );
}
