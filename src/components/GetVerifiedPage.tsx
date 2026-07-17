"use client";

import { useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useVerificationPricing, type VerificationPricingRow } from "@/hooks/useVerificationPricing";
import { useVerification, type Billing } from "@/hooks/useVerification";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { BackButton } from "@/components/BackButton";
import { getTierLimits } from "@/lib/tierLimits";

const TIER_TITLE: Record<string, string> = {
  verified: "Verified",
  verified_pro: "Verified Pro",
  verified_max: "Verified Max",
};

function daysLeft(expiresAt: string): number {
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000));
}

export function GetVerifiedPage() {
  const { profile, refresh } = useProfile();
  const { pricing, loading } = useVerificationPricing();
  const { purchasing, error, purchase } = useVerification();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [pendingTier, setPendingTier] = useState<string | null>(null);

  const handleBuy = async (row: VerificationPricingRow) => {
    setPendingTier(row.tier);
    const amount = billing === "yearly" ? row.annualPriceUsdc : row.monthlyPriceUsdc;
    try {
      await purchase(row.tier as Exclude<typeof row.tier, "free">, billing, amount);
      await refresh();
    } catch {

    } finally {
      setPendingTier(null);
    }
  };

  const isVerified = !!profile && profile.verification_tier !== "free";

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-surface-border px-4 py-4">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Get Verified</h1>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {isVerified && profile && (
          <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-muted">
              Your status:
              <span className="text-ink">{TIER_TITLE[profile.verification_tier]}</span>
              <VerifiedBadge tier={profile.verification_tier} />
            </p>
            {profile.verification_expires_at && (
              <p className="mt-2 text-[13px] text-ink-muted">
                Expires {new Date(profile.verification_expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {" · "}
                {daysLeft(profile.verification_expires_at)} days left
              </p>
            )}
            <p className="mt-2 text-[12px] text-ink-faint">
              One-time payment — it won't auto-renew. Buy again before it expires to keep your badge.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
          <h2 className="text-[15px] font-semibold text-ink">Free</h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            No badge. Post up to {getTierLimits("free").dailyPostLimit}x per day, up to {getTierLimits("free").maxPostChars} characters per
            post.
          </p>
        </div>

        <div className="flex w-fit gap-1 rounded-full bg-surface-soft p-1">
          <button
            className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              billing === "monthly" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink-muted"
            }`}
            onClick={() => setBilling("monthly")}
          >
            Monthly
          </button>
          <button
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
              billing === "yearly" ? "bg-surface text-ink shadow-sm" : "text-ink-faint hover:text-ink-muted"
            }`}
            onClick={() => setBilling("yearly")}
          >
            Yearly
            <span className="rounded-full bg-emerald/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald">Save 15%</span>
          </button>
        </div>

        {loading && <p className="text-[14px] text-ink-muted">Loading pricing…</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pricing.map((row) => {
            const price = billing === "yearly" ? row.annualPriceUsdc : row.monthlyPriceUsdc;
            const isCurrent = profile?.verification_tier === row.tier;
            const features = [
              `Post up to ${row.dailyPostLimit ?? "unlimited"}x per day`,
              `Posts up to ${row.maxPostChars} characters`,
              ...(row.canAttachImage ? ["Attach images to your posts"] : []),
              ...(row.canEditPost ? ["Edit posts after sending"] : []),
              ...(row.canCreatePoll ? ["Create polls"] : []),
            ];
            return (
              <div
                key={row.tier}
                className={`flex flex-col gap-3 rounded-2xl border p-4 shadow-card ${
                  isCurrent ? "border-brand-blue/50 bg-brand-blue/5" : "border-surface-border bg-surface"
                }`}
              >
                <h2 className="flex items-center gap-1 text-[16px] font-semibold text-ink">
                  {TIER_TITLE[row.tier]} <VerifiedBadge tier={row.tier as any} />
                </h2>
                <p className="text-[22px] font-bold text-ink">
                  ${price} <span className="text-[13px] font-normal text-ink-muted">USDC / {billing === "yearly" ? "year" : "month"}</span>
                </p>
                <ul className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
                  {features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <button
                  className="mt-auto rounded-full bg-brand-gradient px-4 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02] disabled:opacity-50"
                  onClick={() => handleBuy(row)}
                  disabled={purchasing && pendingTier === row.tier}
                >
                  {purchasing && pendingTier === row.tier
                    ? "Processing…"
                    : isCurrent
                    ? billing === "yearly"
                      ? "Switch to yearly"
                      : "Renew"
                    : isVerified
                    ? `Switch to ${TIER_TITLE[row.tier]}`
                    : `Subscribe to ${TIER_TITLE[row.tier]}`}
                </button>
              </div>
            );
          })}
        </div>

        {error && <p className="text-[13px] text-danger">{error}</p>}
      </div>
    </div>
  );
}
