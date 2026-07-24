"use client";

import { useState } from "react";
import { BackButton } from "@/frontend/components/BackButton";
import {
  DocsIcon,
  CompassIcon,
  WalletIcon,
  NetworkIcon,
  FeatherIcon,
  PollIcon,
  LockIcon,
  PencilIcon,
  HeartIcon,
  CommentIcon,
  UserPlusIcon,
  CoinIcon,
  OGCheckIcon,
  TrophyIcon,
  FlameIcon,
  BellIcon,
  MessageIcon,
  SearchIcon,
  DropletIcon,
  SettingsIcon,
  LinkIcon,
} from "@/frontend/components/icons";

// Everything on this page mirrors the real, currently-deployed feature set
// (src/shared/*, src/frontend/hooks/*, src/app/api/*) — it is meant to be
// updated whenever those modules change, the same way HelpPage.tsx tracks
// the live points/tier/quest numbers.

import { getTierLimits } from "@/shared/tier-limits";
import { MAX_COMMENT_CHARS } from "@/shared/comment-limits";
import { BADGE_TIERS } from "@/shared/badge-tiers";
import { QUEST_CATALOG } from "@/shared/quests";
import { DAILY_QUEST_CATALOG } from "@/shared/points";
import { OG_PRICE_USDC, FREE_TIP_FEE_BPS, OG_TIP_FEE_BPS } from "@/shared/contracts/two-block-payments";
import { CHAIN_REGISTRY } from "@/shared/chain";

const freeLimits = getTierLimits(false);
const ogLimits = getTierLimits(true);

function bpsToPct(bps: number) {
  return Number.isInteger(bps / 100) ? `${bps / 100}%` : `${(bps / 100).toFixed(1)}%`;
}

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "identity", label: "Wallet Identity" },
  { id: "chains", label: "Chains & Payments" },
  { id: "posts", label: "Feed & Posts" },
  { id: "reactions", label: "Reactions & Comments" },
  { id: "social", label: "Follow & Profiles" },
  { id: "tipping", label: "Tipping & Fees" },
  { id: "og", label: "OG Membership" },
  { id: "points", label: "Points, Badges & Referrals" },
  { id: "quests", label: "Quests" },
  { id: "notifs", label: "Notifications & DMs" },
  { id: "leaderboard", label: "Search & Leaderboard" },
  { id: "faucet", label: "Testnet Faucet" },
  { id: "settings", label: "Settings" },
  { id: "contracts", label: "Smart Contracts" },
];

function SectionHeader({ id, icon, title }: { id: string; icon: React.ReactNode; title: string }) {
  return (
    <div id={id} className="mb-2 mt-8 flex scroll-mt-20 items-center gap-2 px-1 first:mt-0">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-soft text-ink-muted">
        {icon}
      </span>
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-surface-border bg-surface p-4 text-[13px] leading-relaxed text-ink-muted shadow-card">
      {children}
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-2 rounded-xl bg-surface-soft px-3 py-2 text-[12px] text-ink-faint">{children}</p>
  );
}

export function DocsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | string>("overview");

  return (
    <div className="flex flex-col pb-10">
      <div className="flex h-16 items-center gap-3 border-b border-surface-border px-4">
        <BackButton />
        <h1 className="flex items-center gap-2 font-display text-[20px] font-bold text-ink">
          <DocsIcon size={18} />
          Docs
        </h1>
      </div>

      <div className="px-4 pt-4">
        <p className="text-[13px] text-ink-muted">
          A full walkthrough of what TwoBlock is and how every feature works under the hood — wallet
          identity, on-chain payments, posting, points, and everything else.
        </p>

        {/* Quick nav */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveTab(s.id)}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                activeTab === s.id
                  ? "border-transparent bg-brand-gradient text-accent-contrast"
                  : "border-surface-border bg-surface text-ink-muted hover:text-ink"
              }`}
            >
              {s.label}
            </a>
          ))}
        </div>

        {/* ---------------- Overview ---------------- */}
        <SectionHeader id="overview" icon={<CompassIcon size={16} />} title="What is TwoBlock" />
        <Card>
          <p>
            TwoBlock is a decentralized, wallet-native social platform. There are no usernames and
            passwords — your crypto wallet <span className="font-semibold text-ink">is</span> your
            account. Every post, reaction, tip, and payment is tied directly to your wallet address, and
            the two payment flows that actually move money — tipping and OG membership — settle on-chain
            through a dedicated smart contract instead of an off-chain payment processor.
          </p>
          <p>
            On top of the wallet-native core, TwoBlock layers a fairly conventional social feature set:
            a feed with text/image/video posts and reposts, polls, following, direct messages,
            notifications, comments, and a points/badge/quest system that rewards regular activity.
          </p>
        </Card>

        {/* ---------------- Identity ---------------- */}
        <SectionHeader id="identity" icon={<WalletIcon size={16} />} title="Wallet-Native Identity" />
        <Card>
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            <li>
              Sign in by connecting a browser wallet (MetaMask or any other EIP-1193 provider) via{" "}
              <code className="rounded bg-surface-soft px-1 py-0.5 text-[12px]">window.ethereum</code> —
              no email, password, or OAuth step.
            </li>
            <li>Your profile is created automatically the first time you connect a new wallet.</li>
            <li>
              You can optionally set a username, avatar, and bio — but the wallet address underneath
              never changes and is always the source of truth for who you are.
            </li>
            <li>Username changes are rate-limited by a cooldown to discourage identity churn.</li>
            <li>The app switches or adds the correct network automatically when you connect.</li>
          </ul>
        </Card>

        {/* ---------------- Chains ---------------- */}
        <SectionHeader id="chains" icon={<NetworkIcon size={16} />} title="Chains & Payments" />
        <Card>
          <p>
            TwoBlock is multi-chain — you can switch networks from the selector in the top bar. The two
            chains work differently under the hood because of how each treats USDC:
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-surface-border">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="bg-surface-soft text-left text-ink-faint">
                  <th className="px-3 py-2 font-semibold">Chain</th>
                  <th className="px-3 py-2 font-semibold">USDC is...</th>
                  <th className="px-3 py-2 font-semibold">Payment flow</th>
                  <th className="px-3 py-2 font-semibold">Decimals</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-surface-border text-ink">
                  <td className="px-3 py-2 font-semibold">Arc {CHAIN_REGISTRY.arc.chain.testnet ? "(testnet)" : ""}</td>
                  <td className="px-3 py-2">The native gas currency itself</td>
                  <td className="px-3 py-2">Plain native transfer — no approve() step</td>
                  <td className="px-3 py-2">{CHAIN_REGISTRY.arc.usdcDecimals}</td>
                </tr>
                <tr className="border-t border-surface-border text-ink">
                  <td className="px-3 py-2 font-semibold">Giwa Sepolia</td>
                  <td className="px-3 py-2">A standard ERC-20 token (gas is paid in ETH)</td>
                  <td className="px-3 py-2">approve() + transferFrom() via the ERC-20 contract</td>
                  <td className="px-3 py-2">{CHAIN_REGISTRY.giwaSepolia.usdcDecimals}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            Everything above the payment layer — tipping, OG purchase, fee math — behaves identically on
            both chains. Only the contract and transfer mechanism underneath changes, selected
            automatically based on which network is active.
          </p>
        </Card>

        {/* ---------------- Posts ---------------- */}
        <SectionHeader id="posts" icon={<FeatherIcon size={16} />} title="Feed & Posts" />
        <Card>
          <p>Posts support text, a single video attachment, or up to several images, plus reposts.</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-surface-border">
            <div className="grid grid-cols-3 bg-surface-soft px-3 py-2 text-[12px] font-semibold text-ink-faint">
              <span>Limit</span>
              <span className="text-center">Free</span>
              <span className="text-center">OG</span>
            </div>
            {[
              ["Posts per day", freeLimits.dailyPostLimit, ogLimits.dailyPostLimit],
              ["Max characters", freeLimits.maxPostChars, ogLimits.maxPostChars.toLocaleString()],
              ["Image attachments", freeLimits.canAttachImage ? "Yes" : "No", ogLimits.canAttachImage ? "Yes" : "No"],
              ["Video attachments", freeLimits.canAttachVideo ? "Yes" : "No", ogLimits.canAttachVideo ? "Yes" : "No"],
              ["Polls", freeLimits.canCreatePoll ? "Yes" : "No", ogLimits.canCreatePoll ? "Yes" : "No"],
              ["Edit after posting", freeLimits.canEditPost ? "Yes" : "No", ogLimits.canEditPost ? "Yes (5 min window)" : "No"],
              ["Gated (followers-only) posts", freeLimits.canGatePost ? "Yes" : "No", ogLimits.canGatePost ? "Yes" : "No"],
            ].map(([label, free, og]) => (
              <div key={label as string} className="grid grid-cols-3 border-t border-surface-border px-3 py-2 text-[12px] text-ink">
                <span className="text-ink-muted">{label}</span>
                <span className="text-center">{free}</span>
                <span className="text-center font-semibold">{og}</span>
              </div>
            ))}
          </div>
          <Note>
            Both tiers can attach media and create polls — OG mainly buys you higher throughput (more
            posts, far more characters), a short post-publish edit window, and the ability to gate a post
            to followers only.
          </Note>
        </Card>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <PollIcon size={16} /> Polls
            </div>
            <p>
              Any post can include a poll with multiple options and a chosen voting duration. Voting is
              open to every user regardless of tier, and only tallies once per wallet per post.
            </p>
          </Card>
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <LockIcon size={14} /> Gated posts
            </div>
            <p>
              OG members can restrict a post to followers-only. Publishing your first gated post also
              completes the &ldquo;Gatekeeper&rdquo; quest below.
            </p>
          </Card>
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <PencilIcon size={14} /> Editing
            </div>
            <p>
              OG members can edit a post within 5 minutes of publishing it. Outside that window (or on
              the Free tier), a post is permanent — delete and repost instead.
            </p>
          </Card>
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <span className="rotate-0">↻</span> Reposts
            </div>
            <p>
              Reposting shares another wallet&apos;s post to your own feed and profile without copying or
              editing its content.
            </p>
          </Card>
        </div>

        {/* ---------------- Reactions & Comments ---------------- */}
        <SectionHeader id="reactions" icon={<HeartIcon size={16} />} title="Reactions & Comments" />
        <Card>
          <p>
            Post reactions are a single <span className="font-semibold text-ink">Love</span> reaction —
            there is no separate like/dislike or upvote/downvote pair. You either love a post or you
            don&apos;t; reacting feeds into the recipient&apos;s notifications and your own daily quest
            progress.
          </p>
        </Card>
        <div className="mt-3">
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <CommentIcon size={16} /> Comments
            </div>
            <p>
              Comments are flat-rate for every tier: up to{" "}
              <span className="font-semibold text-ink">{MAX_COMMENT_CHARS} characters</span>, with an
              emoji picker and GIF picker available in the composer regardless of OG status.
            </p>
          </Card>
        </div>

        {/* ---------------- Social ---------------- */}
        <SectionHeader id="social" icon={<UserPlusIcon size={16} />} title="Follow & Profiles" />
        <Card>
          <ul className="flex list-disc flex-col gap-1.5 pl-4">
            <li>Every wallet has a public profile page at its own address, listing posts, reposts, and stats.</li>
            <li>Follow/unfollow is one click and immediately affects that wallet&apos;s gated-post visibility to you.</li>
            <li>Profiles are editable: avatar (with a built-in crop tool), bio, and username.</li>
          </ul>
        </Card>

        {/* ---------------- Tipping ---------------- */}
        <SectionHeader id="tipping" icon={<CoinIcon size={16} />} title="Tipping & Fees" />
        <Card>
          <p>
            Tips are sent wallet-to-wallet in USDC, on-chain, through the payments contract&apos;s{" "}
            <code className="rounded bg-surface-soft px-1 py-0.5 text-[12px]">tip()</code> function, and
            verified by the backend against the actual transaction receipt before being recorded — the
            UI never just trusts a client-reported amount.
          </p>
          <p className="mt-2">A platform fee is skimmed off the top before the recipient gets the rest:</p>
          <div className="mt-2 overflow-hidden rounded-xl border border-surface-border">
            <div className="grid grid-cols-2 bg-surface-soft px-3 py-2 text-[12px] font-semibold text-ink-faint">
              <span>Sender tier</span>
              <span className="text-right">Platform fee</span>
            </div>
            <div className="grid grid-cols-2 border-t border-surface-border px-3 py-2 text-[12px] text-ink">
              <span className="text-ink-muted">Free</span>
              <span className="text-right font-semibold">{bpsToPct(FREE_TIP_FEE_BPS)}</span>
            </div>
            <div className="grid grid-cols-2 border-t border-surface-border px-3 py-2 text-[12px] text-ink">
              <span className="text-ink-muted">OG</span>
              <span className="text-right font-semibold">{bpsToPct(OG_TIP_FEE_BPS)}</span>
            </div>
          </div>
          <Note>
            The fee is computed on-chain from the sender&apos;s OG status at the moment of transfer, and
            the emitted Tipped event carries the fee breakdown — so the split is independently verifiable
            on the block explorer, not just a number the app displays.
          </Note>
        </Card>

        {/* ---------------- OG ---------------- */}
        <SectionHeader id="og" icon={<OGCheckIcon size={14} />} title="OG Membership" />
        <Card>
          <p>
            OG is a single, one-time, lifetime purchase —{" "}
            <span className="font-semibold text-ink">${OG_PRICE_USDC} USDC</span> paid on-chain via{" "}
            <code className="rounded bg-surface-soft px-1 py-0.5 text-[12px]">purchaseOG()</code>, which
            forwards the payment straight to the treasury wallet. There&apos;s no subscription, renewal,
            or expiration — you buy it once.
          </p>
          <p className="mt-2">
            Besides the higher post quotas, lower tip fee, editing window, and post gating covered above,
            purchasing OG also grants a one-time{" "}
            <span className="font-semibold text-ink">+50 point</span> bonus and completes the &ldquo;Get
            OG&rdquo; quest.
          </p>
        </Card>

        {/* ---------------- Points ---------------- */}
        <SectionHeader id="points" icon={<TrophyIcon size={22} />} title="Points, Badges & Referrals" />
        <Card>
          <p className="mb-2 font-semibold text-ink">How points are earned</p>
          <ul className="flex list-disc flex-col gap-1 pl-4">
            <li>Daily quests — small repeatable actions that reset every day at 00:00 UTC.</li>
            <li>One-time quests — milestones completed once (see below).</li>
            <li>Tipping — 0.1 point per USDC sent or received, capped at 10 points/day per direction.</li>
            <li>Referral commission — a 5% cut of the points your referrals earn, automatically.</li>
          </ul>
        </Card>
        <div className="mt-3">
          <Card>
            <p className="mb-2 font-semibold text-ink">Badge tiers</p>
            <p className="mb-2">
              Your badge is based purely on all-time points — it never decreases, and it sets how many
              people you&apos;re allowed to refer at once.
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
          </Card>
        </div>
        <div className="mt-3">
          <Card>
            <p className="mb-2 font-semibold text-ink">Referral program</p>
            <ul className="flex list-disc flex-col gap-1 pl-4">
              <li>Share your referral code from the Quests page.</li>
              <li>Each wallet can only ever set one referrer, permanently.</li>
              <li>Open referral slots are capped by your badge tier — rank up to invite more people.</li>
              <li>Every point your referral earns pays you a 5% commission automatically, as its own event.</li>
              <li>Commission points don&apos;t themselves generate further commission (no infinite chains).</li>
            </ul>
          </Card>
        </div>

        {/* ---------------- Quests ---------------- */}
        <SectionHeader id="quests" icon={<FlameIcon size={16} />} title="Quests" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <p className="mb-2 font-semibold text-ink">Daily (resets 00:00 UTC)</p>
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
          </Card>
          <Card>
            <p className="mb-2 font-semibold text-ink">One-time</p>
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
          </Card>
        </div>

        {/* ---------------- Notifications & DMs ---------------- */}
        <SectionHeader id="notifs" icon={<BellIcon size={16} />} title="Notifications & Direct Messages" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <BellIcon size={16} /> Notifications
            </div>
            <p>Fires on new follows, reposts of your posts, tips received, reactions, and poll results.</p>
          </Card>
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <MessageIcon size={16} /> Messaging
            </div>
            <p>Direct, wallet-to-wallet messaging, organized as one thread per counterpart wallet.</p>
          </Card>
        </div>

        {/* ---------------- Search / Leaderboard ---------------- */}
        <SectionHeader id="leaderboard" icon={<SearchIcon size={16} />} title="Search & Leaderboard" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <SearchIcon size={16} /> Search
            </div>
            <p>Find users by username or wallet address.</p>
          </Card>
          <Card>
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-ink">
              <TrophyIcon size={16} /> Leaderboard
            </div>
            <p>
              Ranks wallets by USDC tipped or received, all-time or weekly, plus a feed of the most-tipped
              posts in the last 24 hours.
            </p>
          </Card>
        </div>

        {/* ---------------- Faucet ---------------- */}
        <SectionHeader id="faucet" icon={<DropletIcon size={18} />} title="Testnet Faucet (Giwa Sepolia)" />
        <Card>
          <p>
            Because USDC on Giwa Sepolia is a normal ERC-20 rather than the gas token, the Wallet page
            offers a faucet to claim free test USDC directly from the token contract, on a per-wallet
            cooldown. Not available on Arc, since Arc&apos;s native currency already is USDC.
          </p>
        </Card>

        {/* ---------------- Settings ---------------- */}
        <SectionHeader id="settings" icon={<SettingsIcon size={22} />} title="Settings" />
        <Card>
          <p>The Settings page currently controls appearance — light/dark mode, with a system-theme reset option available from the top bar menu.</p>
        </Card>

        {/* ---------------- Contracts ---------------- */}
        <SectionHeader id="contracts" icon={<LinkIcon size={16} />} title="Smart Contracts" />
        <Card>
          <p>
            Every payment — tips and OG purchases alike — is routed through a single deployed contract
            per chain rather than raw peer-to-peer transfers, so fund flow stays transparent and
            auditable via emitted events.
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            <div className="rounded-xl bg-surface-soft px-3 py-2">
              <p className="text-[13px] font-semibold text-ink">TwoBlockPayments.sol — Arc</p>
              <p className="text-[12px] text-ink-faint">
                Native-value payments: tip(address to, string postId), purchaseOG(), withdraw(), and
                setTreasury(address) for the contract owner.
              </p>
            </div>
            <div className="rounded-xl bg-surface-soft px-3 py-2">
              <p className="text-[13px] font-semibold text-ink">TwoBlockPaymentsERC20.sol + USDC.sol — Giwa Sepolia</p>
              <p className="text-[12px] text-ink-faint">
                Same tip/purchaseOG flow, adapted for ERC-20 transfers (approve + transferFrom) against a
                self-deployed 6-decimal USDC stand-in with a public faucet() function.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
