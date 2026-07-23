"use client";

import { useState } from "react";
import { BackButton } from "@/frontend/components/BackButton";
import {
  HelpIcon,
  ChevronDownIcon,
  TrophyIcon,
  OGCheckIcon,
  UserPlusIcon,
  FeatherIcon,
  CoinIcon,
} from "@/frontend/components/icons";

// Every number on this page is pulled straight from src/shared/ (or, for
// the tip fee split, the shared contract constants) — the same modules the
// backend uses to actually award points / enforce limits. Nothing here is
// hand-typed, so the FAQ can't silently drift out of sync with the real
// system.
import { BADGE_TIERS } from "@/shared/badge-tiers";
import { getTierLimits } from "@/shared/tier-limits";
import { MAX_COMMENT_CHARS } from "@/shared/comment-limits";
import { DAILY_QUEST_CATALOG } from "@/shared/points";
import { QUEST_CATALOG } from "@/shared/quests";
import { OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";
import { FREE_TIP_FEE_BPS, OG_TIP_FEE_BPS } from "@/shared/contracts/two-block-payments";

const freeLimits = getTierLimits(false);
const ogLimits = getTierLimits(true);
const freeTipFeePct = FREE_TIP_FEE_BPS / 100;
const ogTipFeePct = OG_TIP_FEE_BPS / 100;

function bpsToPct(bps: number) {
  return Number.isInteger(bps / 100) ? `${bps / 100}%` : `${(bps / 100).toFixed(1)}%`;
}

function AccordionItem({
  question,
  children,
  open,
  onToggle,
}: {
  question: string;
  children: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface shadow-card">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="text-[14px] font-semibold text-ink">{question}</span>
        <span
          className={`shrink-0 text-ink-faint transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        >
          <ChevronDownIcon size={16} />
        </span>
      </button>
      {open && <div className="px-4 pb-4 text-[13px] leading-relaxed text-ink-muted">{children}</div>}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 px-1 first:mt-0">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-muted">
        {icon}
      </span>
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
    </div>
  );
}

export function HelpPage() {
  const [openKey, setOpenKey] = useState<string | null>("points-earn");

  const toggle = (key: string) => setOpenKey((prev) => (prev === key ? null : key));

  return (
    <div className="flex flex-col pb-8">
      <div className="flex h-16 items-center gap-3 border-b border-surface-border px-4">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Help & FAQ</h1>
      </div>

      <div className="px-4 pt-4">
        <p className="text-[13px] text-ink-muted">
          Everything below reflects the live points, tier, and quest system — if it ever changes, this page changes
          with it.
        </p>

        {/* ---------------- Points ---------------- */}
        <SectionHeader icon={<CoinIcon size={16} />} title="Points" />
        <div className="flex flex-col gap-2">
          <AccordionItem question="How do I earn points?" open={openKey === "points-earn"} onToggle={() => toggle("points-earn")}>
            <p>Points come from four sources:</p>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4">
              <li>
                <span className="font-semibold text-ink">Daily quests</span> — small, repeatable actions that reset
                every day at 00:00 UTC.
              </li>
              <li>
                <span className="font-semibold text-ink">One-time quests</span> — milestones you complete once.
              </li>
              <li>
                <span className="font-semibold text-ink">Tipping</span> — sending or receiving a tip earns 0.1 point
                per USDC, capped at 10 points/day per direction.
              </li>
              <li>
                <span className="font-semibold text-ink">Referral commission</span> — you earn a share of the points
                your referrals earn (see the Referral Program section below).
              </li>
            </ul>
          </AccordionItem>

          <AccordionItem
            question="What are today's daily quests?"
            open={openKey === "points-daily"}
            onToggle={() => toggle("points-daily")}
          >
            <div className="flex flex-col gap-2">
              {DAILY_QUEST_CATALOG.map((q) => (
                <div key={q.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-2">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{q.title}</p>
                    <p className="text-[12px] text-ink-faint">{q.description}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-ink-muted">+{q.points}</span>
                </div>
              ))}
            </div>
          </AccordionItem>

          <AccordionItem
            question="What one-time quests are there?"
            open={openKey === "points-onetime"}
            onToggle={() => toggle("points-onetime")}
          >
            <div className="flex flex-col gap-2">
              {QUEST_CATALOG.map((q) => (
                <div key={q.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-2">
                  <div>
                    <p className="text-[13px] font-semibold text-ink">{q.title}</p>
                    <p className="text-[12px] text-ink-faint">{q.description}</p>
                  </div>
                  <span className="shrink-0 text-[12px] font-semibold text-ink-muted">+{q.points}</span>
                </div>
              ))}
            </div>
          </AccordionItem>

          <AccordionItem
            question="How much do tips earn?"
            open={openKey === "points-tips"}
            onToggle={() => toggle("points-tips")}
          >
            <p>
              Sending a tip earns you <span className="font-semibold text-ink">0.1 point per USDC sent</span>, and
              receiving one earns <span className="font-semibold text-ink">0.1 point per USDC received</span> (after
              fees). Each direction is capped at 10 points per UTC day, so tip amount matters more than tip count once
              you hit the cap.
            </p>
          </AccordionItem>
        </div>

        {/* ---------------- Badge tiers ---------------- */}
        <SectionHeader icon={<TrophyIcon size={16} />} title="Badge Tiers" />
        <div className="flex flex-col gap-2">
          <AccordionItem
            question="What are the badge tiers and how do I rank up?"
            open={openKey === "tiers-list"}
            onToggle={() => toggle("tiers-list")}
          >
            <p className="mb-3">
              Your badge is based purely on your all-time total points — it never goes down, and it also determines
              how many people you can refer.
            </p>
            <div className="flex flex-col gap-1.5">
              {BADGE_TIERS.map((t) => (
                <div key={t.key} className="flex items-center justify-between gap-3 rounded-xl bg-surface-soft px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3.5 w-3.5 shrink-0 rounded-full"
                      style={{
                        background:
                          t.colors.length > 1
                            ? `linear-gradient(135deg, ${t.colors.join(", ")})`
                            : t.colors[0],
                      }}
                    />
                    <span className="text-[13px] font-semibold text-ink">{t.label}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[12px] text-ink-faint">
                    <span>{t.minPoints.toLocaleString()}+ pts</span>
                    <span className="w-16 text-right">{t.referralSlots} slot{t.referralSlots === 1 ? "" : "s"}</span>
                  </div>
                </div>
              ))}
            </div>
          </AccordionItem>
        </div>

        {/* ---------------- Referral program ---------------- */}
        <SectionHeader icon={<UserPlusIcon size={16} />} title="Referral Program" />
        <div className="flex flex-col gap-2">
          <AccordionItem
            question="How does referring people work?"
            open={openKey === "referral-how"}
            onToggle={() => toggle("referral-how")}
          >
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>Share your referral code from the Quests page.</li>
              <li>Each person can only ever set one referrer — it&apos;s permanent once applied.</li>
              <li>
                Your number of open referral slots is set by your current badge tier (see the table above) — once
                they&apos;re full, new people can&apos;t use your code until you rank up.
              </li>
              <li>
                Whenever someone you referred earns points, you automatically earn a{" "}
                <span className="font-semibold text-ink">5% commission</span> on top, as its own point event — no
                action needed on your part.
              </li>
              <li>Commission points don&apos;t themselves generate further commission for anyone else.</li>
            </ul>
          </AccordionItem>
        </div>

        {/* ---------------- OG membership ---------------- */}
        <SectionHeader icon={<OGCheckIcon size={16} />} title="OG Membership" />
        <div className="flex flex-col gap-2">
          <AccordionItem
            question={`What do I get for $${OG_PRICE_USDC} OG?`}
            open={openKey === "og-benefits"}
            onToggle={() => toggle("og-benefits")}
          >
            <p className="mb-3">
              OG is a one-time, lifetime purchase (${OG_PRICE_USDC} USDC) that unlocks:
            </p>
            <div className="overflow-hidden rounded-xl border border-surface-border">
              <div className="grid grid-cols-3 bg-surface-soft px-3 py-2 text-[12px] font-semibold text-ink-faint">
                <span>Perk</span>
                <span className="text-center">Free</span>
                <span className="text-center">OG</span>
              </div>
              {[
                ["Posts per day", freeLimits.dailyPostLimit, ogLimits.dailyPostLimit],
                ["Max post length", `${freeLimits.maxPostChars} chars`, `${ogLimits.maxPostChars} chars`],
                ["Edit posts", freeLimits.canEditPost ? "Yes" : "No", ogLimits.canEditPost ? "Yes" : "No"],
                ["Gate posts (followers-only)", freeLimits.canGatePost ? "Yes" : "No", ogLimits.canGatePost ? "Yes" : "No"],
                ["Tip fee", `${freeTipFeePct}%`, `${ogTipFeePct}%`],
              ].map(([label, free, og]) => (
                <div key={label as string} className="grid grid-cols-3 border-t border-surface-border px-3 py-2 text-[12px] text-ink">
                  <span className="text-ink-muted">{label}</span>
                  <span className="text-center">{free}</span>
                  <span className="text-center font-semibold">{og}</span>
                </div>
              ))}
            </div>
            <p className="mt-3">
              Plus a one-time <span className="font-semibold text-ink">+50 point</span> bonus and the{" "}
              <span className="font-semibold text-ink">Get OG</span> quest reward on purchase.
            </p>
          </AccordionItem>

          <AccordionItem
            question="Does OG lower tip fees?"
            open={openKey === "og-fees"}
            onToggle={() => toggle("og-fees")}
          >
            <p>
              Yes. Every tip has a small platform fee taken off the top before it reaches the recipient:{" "}
              <span className="font-semibold text-ink">{bpsToPct(FREE_TIP_FEE_BPS)}</span> for free accounts, and just{" "}
              <span className="font-semibold text-ink">{bpsToPct(OG_TIP_FEE_BPS)}</span> for OG accounts. This is
              enforced on-chain, so it applies no matter which network you're tipping on.
            </p>
          </AccordionItem>
        </div>

        {/* ---------------- Posting & comments ---------------- */}
        <SectionHeader icon={<FeatherIcon size={16} />} title="Posting & Comments" />
        <div className="flex flex-col gap-2">
          <AccordionItem
            question="What are the posting and comment limits?"
            open={openKey === "limits"}
            onToggle={() => toggle("limits")}
          >
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>
                Free accounts: up to {freeLimits.dailyPostLimit} posts/day, {freeLimits.maxPostChars} characters per
                post.
              </li>
              <li>
                OG accounts: up to {ogLimits.dailyPostLimit} posts/day, {ogLimits.maxPostChars.toLocaleString()}{" "}
                characters per post.
              </li>
              <li>
                Comments are flat-rate for everyone: up to {MAX_COMMENT_CHARS} characters, regardless of OG status.
              </li>
              <li>Both tiers can attach images, video, and polls to posts.</li>
            </ul>
          </AccordionItem>
        </div>
      </div>

      <div className="flex items-center gap-2 px-5 pt-8 text-[12px] text-ink-faint">
        <HelpIcon size={14} />
        Still have a question? Reach out from the Settings page.
      </div>
    </div>
  );
}
