"use client";

import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useQuests } from "@/frontend/hooks/useQuests";
import { useDailyQuests } from "@/frontend/hooks/useDailyQuests";
import { useProfile } from "@/frontend/hooks/useProfile";
import { BackButton } from "@/frontend/components/BackButton";
import { useState } from "react";
import {
  FeatherIcon,
  CoinIcon,
  OGCheckIcon,
  FlameIcon,
  CheckIcon,
  UserPlusIcon,
  UserIcon,
  WalletIcon,
  CommentIcon,
  HeartIcon,
  LinkIcon,
} from "@/frontend/components/icons";
import { getBadgeTier, nextBadgeTier, progressToNextTier, referralSlotCapacity } from "@/shared/badge-tiers";

const QUEST_ICONS: Record<string, React.ReactNode> = {
  post: <FeatherIcon size={22} />,
  tip: <CoinIcon size={20} />,
  og: <OGCheckIcon size={18} />,
  streak: <FlameIcon size={20} />,
  follow: <UserPlusIcon size={18} />,
  profile: <UserIcon size={20} />,
};

const DAILY_QUEST_ICONS: Record<string, React.ReactNode> = {
  login: <WalletIcon size={20} />,
  post: <FeatherIcon size={22} />,
  comment: <CommentIcon size={20} />,
  react: <HeartIcon size={20} />,
};

// Shared bubble size so daily and one-time quest rows read as one family.
const QUEST_BUBBLE_CLASS =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-muted";

export function QuestsPage() {
  const { walletAddress, ready } = useTwoBlockAuth();
  const { profile, refresh } = useProfile();
  const { quests, loading, completedCount } = useQuests();
  const { quests: dailyQuests, loading: dailyLoading, completedCount: dailyCompletedCount } = useDailyQuests();

  if (ready && !walletAddress) {
    return <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Connect your wallet to view quests.</p>;
  }

  const points = profile?.total_points ?? 0;
  const tier = getBadgeTier(points);
  const next = nextBadgeTier(points);
  const pct = Math.round(progressToNextTier(points) * 100);
  const capacity = referralSlotCapacity(points);
  const slotsUsed = profile?.referral_slots_used ?? 0;
  const slotsFull = slotsUsed >= capacity;

  // Completed quests drop out of the visible list — the header counters
  // above still track totals, so progress isn't lost, it's just not
  // cluttering the active list anymore.
  const activeDailyQuests = dailyQuests.filter((q) => !q.completed);
  const activeQuests = quests.filter((q) => !q.completed);

  return (
    <div className="flex flex-col">
      <div className="flex h-16 items-center justify-between border-b border-surface-border px-4">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[20px] font-bold text-ink">Quests</h1>
        </div>
        {(quests.length > 0 || dailyQuests.length > 0) && (
          <span className="text-[13px] font-semibold text-ink-muted">
            {completedCount + dailyCompletedCount}/{quests.length + dailyQuests.length} completed
          </span>
        )}
      </div>

      {profile && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-[15px] font-semibold text-ink">{points.toLocaleString()} points</span>
              <span className="text-[13px] font-semibold text-ink-muted">{tier.label}</span>
            </div>
            {next ? (
              <>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-[12px] text-ink-faint">
                  {(next.minPoints - points).toLocaleString()} pts to {next.label}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[12px] text-ink-faint">Top tier reached.</p>
            )}

            <div className="mt-3 flex items-center justify-between border-t border-surface-border pt-3 text-[13px]">
              <span className="text-ink-muted">Referral slots</span>
              <span className="font-semibold text-ink">
                {slotsUsed}/{capacity} used
              </span>
            </div>
            {slotsFull && next && (
              <p className="mt-1 text-[12px] text-ink-faint">Reach {next.label} to unlock 1 more slot.</p>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3">
            {profile.referral_code && <ReferralCodeShare code={profile.referral_code} />}
            {!profile.referred_by && <ReferralCodeEntry walletAddress={profile.wallet_address} onApplied={refresh} />}
          </div>
        </div>
      )}

      {(dailyQuests.length > 0 || dailyLoading) && (
        <div className="px-4 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink-muted">Daily Quests</h2>
            {dailyQuests.length > 0 && (
              <span className="text-[12px] font-semibold text-ink-faint">
                {dailyCompletedCount}/{dailyQuests.length} today
              </span>
            )}
          </div>
          {activeDailyQuests.length > 0 ? (
            <div className="flex flex-col gap-2">
              {activeDailyQuests.map((q) => (
                <div
                  key={q.key}
                  className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface p-3 shadow-card"
                >
                  <div className={QUEST_BUBBLE_CLASS}>{DAILY_QUEST_ICONS[q.icon] ?? <FeatherIcon size={20} />}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[14px] font-semibold text-ink">{q.title}</h3>
                    <p className="text-[12px] text-ink-muted">{q.description}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-ink-faint">+{q.points}</span>
                </div>
              ))}
            </div>
          ) : (
            !dailyLoading && (
              <div className="flex items-center gap-2 rounded-2xl border border-dashed border-surface-border p-4 text-[13px] text-ink-muted">
                <CheckIcon size={14} />
                All daily quests done — new ones drop at 00:00 UTC.
              </div>
            )
          )}
        </div>
      )}

      {loading && quests.length === 0 && <p className="px-4 py-6 text-center text-[14px] text-ink-muted">Loading…</p>}

      {quests.length > 0 && (
        <div className="px-4 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-ink-muted">One-Time Quests</h2>
            <span className="text-[12px] font-semibold text-ink-faint">
              {completedCount}/{quests.length} completed
            </span>
          </div>
        </div>
      )}

      {activeQuests.length > 0 ? (
        <div className="flex flex-col gap-3 p-4 pt-0">
          {activeQuests.map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            return (
              <div
                key={q.key}
                className="flex gap-3 rounded-2xl border border-surface-border bg-surface p-4 shadow-card"
              >
                <div className={QUEST_BUBBLE_CLASS}>{QUEST_ICONS[q.icon] ?? <FeatherIcon size={20} />}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
                    {q.title}
                    <span className="ml-auto text-[12px] font-semibold text-ink-faint">+{q.points}</span>
                  </h2>
                  <p className="mt-0.5 text-[13px] text-ink-muted">{q.description}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-soft">
                    <div className="h-full rounded-full bg-brand-blue" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="mt-1 block text-[12px] text-ink-faint">
                    {q.progress}/{q.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !loading &&
        quests.length > 0 && (
          <div className="mx-4 mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-surface-border p-4 text-[13px] text-ink-muted">
            <CheckIcon size={14} />
            All one-time quests completed. Nice work!
          </div>
        )
      )}
    </div>
  );
}

function ReferralCodeShare({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[TwoBlock] Failed to copy referral code:", err);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
      <div>
        <p className="text-[13px] text-ink-muted">Your referral code</p>
        <p className="font-mono text-[16px] font-semibold tracking-wider text-ink">{code}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full border border-surface-border px-3 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-hover"
      >
        {copied ? <CheckIcon size={14} /> : <LinkIcon size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function ReferralCodeEntry({ walletAddress, onApplied }: { walletAddress: string; onApplied: () => void }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const REASON_MESSAGES: Record<string, string> = {
    ok: "Referral applied!",
    invalid_code: "That code doesn't exist.",
    self_referral: "You can't refer yourself.",
    already_has_referrer: "You already have a referrer.",
    slots_full: "That referrer's slots are full right now — try again later.",
  };

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setMessage({ ok: false, text: "Referral codes are 8 characters." });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/profiles/referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, referralCode: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      const ok = !!data.success;
      setMessage({ ok, text: REASON_MESSAGES[data.reason] ?? "Something went wrong. Try again." });
      if (ok) {
        setCode("");
        onApplied();
      }
    } catch (err) {
      console.error("[TwoBlock] Failed to submit referral code:", err);
      setMessage({ ok: false, text: "Failed to reach the server, try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
      <p className="text-[13px] font-semibold text-ink">Have a referral code?</p>
      <p className="mt-0.5 text-[12px] text-ink-faint">Enter it any time — it can be applied later if slots were full.</p>
      <div className="mt-2 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={8}
          placeholder="ABCD1234"
          className="min-w-0 flex-1 rounded-full border border-surface-border bg-transparent px-3 py-2 text-[13px] font-mono uppercase tracking-wider text-ink outline-none focus:border-brand-blue"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || code.trim().length === 0}
          className="shrink-0 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Apply"}
        </button>
      </div>
      {message && (
        <p className={`mt-2 text-[12px] ${message.ok ? "text-brand-blue" : "text-ink-faint"}`}>{message.text}</p>
      )}
    </div>
  );
}