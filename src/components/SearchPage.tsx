"use client";

import Link from "next/link";
import { useUserSearch } from "@/hooks/useUserSearch";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BackButton } from "@/components/BackButton";
import { SearchIcon } from "@/components/icons";
import { avatarColor, displayName, initials, shortenAddress } from "@/lib/utils/format";

export function SearchPage() {
  const { query, setQuery, results, loading, error } = useUserSearch();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Search Users</h1>
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

      {loading && <p className="text-[14px] text-ink-muted">Searching…</p>}
      {error && <p className="text-[14px] text-danger">{error}</p>}
      {!loading && !error && query.trim().length >= 2 && results.length === 0 && (
        <p className="text-[14px] text-ink-muted">No users match &ldquo;{query.trim()}&rdquo;.</p>
      )}
      {!loading && query.trim().length < 2 && <p className="text-[14px] text-ink-muted">Type at least 2 characters to search.</p>}

      <ul className="flex flex-col">
        {results.map((profile) => (
          <li key={profile.wallet_address}>
            <Link
              href={`/profile/${profile.wallet_address}`}
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
                  <VerifiedBadge tier={profile.verification_tier} />
                </span>
                <span className="block truncate font-mono text-[12px] text-ink-muted">{shortenAddress(profile.wallet_address)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
