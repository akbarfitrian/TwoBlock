"use client";

import Link from "next/link";
import { useUserSearch } from "@/frontend/hooks/useUserSearch";
import { useTopTippedPosts } from "@/frontend/hooks/useTopTippedPosts";
import { useSuggestedAccounts } from "@/frontend/hooks/useSuggestedAccounts";
import { OGBadge } from "@/frontend/components/OGBadge";
import { BackButton } from "@/frontend/components/BackButton";
import { FollowButton } from "@/frontend/components/FollowButton";
import { SearchIcon, FlameIcon, UserPlusIcon } from "@/frontend/components/icons";
import { avatarColor, displayName, initials, postHref, profileHref, shortenAddress } from "@/frontend/lib/format";

function TrendingPosts() {
  const { posts, loading } = useTopTippedPosts(5);

  if (loading) return <p className="text-[14px] text-ink-muted">Loading trending posts…</p>;
  if (posts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
        <span className="text-brand-blue">
          <FlameIcon size={16} />
        </span>
        Trending Posts
      </h2>
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface">
        {posts.map((post) => (
          <li key={post.postId} className="border-b border-surface-border last:border-b-0">
            <Link
              href={postHref(post.postId)}
              className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-surface-hover"
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
                <span className="flex items-center gap-1 text-[13px] font-semibold text-ink">
                  <span className="truncate">{post.authorLabel}</span>
                  <OGBadge isOg={post.authorIsOg} size={13} />
                </span>
                {post.content && (
                  <span className="mt-0.5 block truncate text-[13px] text-ink-muted">{post.content}</span>
                )}
              </span>
              <span className="shrink-0 text-[13px] font-semibold text-ink-muted">
                ${post.totalTipsUsdc.toFixed(2)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SuggestedAccounts() {
  const { accounts, loading } = useSuggestedAccounts(5);

  if (loading) return <p className="text-[14px] text-ink-muted">Loading suggested accounts…</p>;
  if (accounts.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
        <span className="text-brand-blue">
          <UserPlusIcon size={16} />
        </span>
        Who to Follow
      </h2>
      <ul className="flex flex-col overflow-hidden rounded-2xl border border-surface-border bg-surface">
        {accounts.map((account) => (
          <li key={account.wallet} className="border-b border-surface-border last:border-b-0">
            <div className="flex items-center gap-3 px-3 py-3">
              <Link href={profileHref(account.username, account.wallet)} className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
                  style={{ background: avatarColor(account.wallet) }}
                >
                  {account.avatarUrl ? (
                    <img src={account.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    account.label.replace("@", "").slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="flex min-w-0 items-center gap-1 text-[13px] font-semibold text-ink">
                  <span className="truncate">{account.label}</span>
                  <OGBadge isOg={account.isOg} size={13} />
                </span>
              </Link>
              <FollowButton targetWallet={account.wallet} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function SearchPage() {
  const { query, setQuery, results, loading, error } = useUserSearch();
  const isSearching = query.trim().length >= 2;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Discover</h1>
      </div>
      <div className="flex items-center gap-2.5 rounded-full border border-surface-border bg-surface px-4 py-2.5 focus-within:border-brand-blue/60">
        <span className="text-ink-faint">
          <SearchIcon size={16} />
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username or wallet address…"
          autoFocus
          className="w-full bg-transparent text-[14px] text-ink placeholder:text-ink-faint outline-none"
        />
      </div>

      {isSearching ? (
        <>
          {loading && <p className="text-[14px] text-ink-muted">Searching…</p>}
          {error && <p className="text-[14px] text-danger">{error}</p>}
          {!loading && !error && results.length === 0 && (
            <p className="text-[14px] text-ink-muted">No users match &ldquo;{query.trim()}&rdquo;.</p>
          )}

          <ul className="flex flex-col">
            {results.map((profile) => (
              <li key={profile.wallet_address}>
                <Link
                  href={profileHref(profile.username, profile.wallet_address)}
                  className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-hover"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-semibold text-white"
                    style={{ background: avatarColor(profile.wallet_address) }}
                  >
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials(profile.username, profile.wallet_address)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-[14px] font-semibold text-ink">
                        {displayName(profile.username, profile.wallet_address)}
                      </span>
                      <OGBadge isOg={profile.is_og} />
                    </span>
                    <span className="block truncate font-mono text-[12px] text-ink-muted">{shortenAddress(profile.wallet_address)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <TrendingPosts />
          <SuggestedAccounts />
        </>
      )}
    </div>
  );
}
