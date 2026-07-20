"use client";

import { useState } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { useProfile } from "@/frontend/hooks/useProfile";
import { useOG } from "@/frontend/hooks/useOG";
import { useWalletBalance } from "@/frontend/hooks/useWalletBalance";
import { useTipHistory, type TipHistoryItem } from "@/frontend/hooks/useTipHistory";
import { OGBadge } from "@/frontend/components/OGBadge";
import { BackButton } from "@/frontend/components/BackButton";
import { WalletIcon, RefreshIcon, LinkIcon, CheckIcon, CoinIcon } from "@/frontend/components/icons";
import { getTierLimits } from "@/shared/tier-limits";
import { OG_PRICE_USDC } from "@/shared/contracts/two-block-payments";
import { activeArcChain } from "@/shared/chain";
import { avatarColor, formatRelativeTime, shortenAddress } from "@/frontend/lib/format";

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (err) {
      console.error("[TwoBlock] Failed to copy address:", err);
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-full border border-surface-border px-2.5 py-1 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
    >
      {copied ? <CheckIcon size={13} /> : <LinkIcon size={13} />}
      {copied ? "Copied" : shortenAddress(address)}
    </button>
  );
}

function BalanceCard() {
  const { walletAddress } = useTwoBlockAuth();
  const { balance, loading, error, symbol, refresh } = useWalletBalance();

  if (!walletAddress) return null;

  return (
    <div className="rounded-2xl border border-surface-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-ink-muted">
          <WalletIcon size={16} />
          Wallet balance
        </span>
        <CopyAddressButton address={walletAddress} />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-[32px] font-bold leading-none text-ink">
          {loading && balance === null ? (
            <span className="text-ink-faint">…</span>
          ) : (
            <>
              {balance ? Number(balance).toFixed(4) : "0.0000"}{" "}
              <span className="text-[16px] font-semibold text-ink-muted">{symbol}</span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
          title="Refresh balance"
        >
          <RefreshIcon size={16} />
        </button>
      </div>
      {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      <p className="mt-1 text-[12px] text-ink-faint">On {activeArcChain.name}</p>
    </div>
  );
}

function OGCard() {
  const { profile, refresh } = useProfile();
  const { purchasing, error, purchase } = useOG();

  const isOg = !!profile?.is_og;
  const ogLimits = getTierLimits(true);
  const freeLimits = getTierLimits(false);

  const handleBuy = async () => {
    try {
      await purchase();
      await refresh();
    } catch {
      // error is surfaced via `error` state below
    }
  };

  const features = [
    `Post up to ${ogLimits.dailyPostLimit}x per day`,
    `Posts up to ${ogLimits.maxPostChars.toLocaleString()} characters`,
    "Edit posts for 5 minutes after sending",
    "Gate posts to followers only",
    "OG badge on your profile & posts",
    "Access to member analytics (tips & follower growth)",
  ];

  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border p-5 shadow-card ${
        isOg ? "border-brand-blue/50 bg-brand-blue/5" : "border-surface-border bg-surface"
      }`}
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-ink">
          OG Membership <OGBadge isOg={isOg} />
        </h2>
        {isOg && (
          <span className="rounded-full border border-brand-blue/40 bg-brand-blue/10 px-2.5 py-1 text-[12px] font-semibold text-brand-blue">
            Active
          </span>
        )}
      </div>

      {isOg ? (
        <>
          <p className="text-[13px] text-ink-muted">
            You're an OG member — enjoy higher limits and lower tip fees.
            {profile?.og_member_since_block != null && ` Member since block ${profile.og_member_since_block}.`}
          </p>
          <p className="text-[12px] text-ink-faint">OG is a one-time lifetime purchase — no renewal, no expiry.</p>
        </>
      ) : (
        <>
          <p className="text-[22px] font-bold text-ink">
            ${OG_PRICE_USDC} <span className="text-[13px] font-normal text-ink-muted">USDC · lifetime, one-time</span>
          </p>
          <p className="text-[12px] text-ink-faint">
            Free tier: up to {freeLimits.dailyPostLimit} posts/day, {freeLimits.maxPostChars} characters, images & polls included.
          </p>
          <ul className="flex flex-col gap-1.5 text-[13px] text-ink-muted">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-1.5">
                <span className="mt-0.5 shrink-0 text-brand-blue">
                  <CheckIcon size={14} />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <button
            className="mt-1 rounded-full bg-brand-gradient px-4 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02] disabled:opacity-50"
            onClick={handleBuy}
            disabled={purchasing}
          >
            {purchasing ? "Processing…" : `Buy OG — $${OG_PRICE_USDC}`}
          </button>
        </>
      )}

      {error && <p className="text-[13px] text-danger">{error}</p>}
    </div>
  );
}

function TipRow({ item }: { item: TipHistoryItem }) {
  const explorerUrl = activeArcChain.blockExplorers?.default.url;
  const sent = item.direction === "sent";

  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold text-white"
        style={{ background: avatarColor(item.counterpartyWallet) }}
      >
        {item.counterpartyAvatarUrl ? (
          <img src={item.counterpartyAvatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          item.counterpartyLabel.replace("@", "").slice(0, 1).toUpperCase()
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">
          {sent ? "Tipped " : "Received from "}
          {item.counterpartyLabel}
        </p>
        <p className="text-[12px] text-ink-faint">{formatRelativeTime(item.createdAt)}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className={`text-[13.5px] font-bold ${sent ? "text-ink" : "text-emerald"}`}>
          {sent ? "-" : "+"}${(sent ? item.amountUsdc : item.netAmountUsdc).toFixed(2)}
        </p>
        {explorerUrl && (
          <a
            href={`${explorerUrl}/tx/${item.txRef}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ink-faint hover:text-brand-blue hover:underline"
          >
            View tx
          </a>
        )}
      </div>
    </div>
  );
}

export function WalletPage() {
  const { authenticated, login } = useTwoBlockAuth();
  const { items, loading: tipsLoading } = useTipHistory();
  const [filter, setFilter] = useState<"all" | "sent" | "received">("all");

  if (!authenticated) {
    return (
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="font-display text-[22px] font-bold text-ink">Wallet</h1>
        </div>
        <p className="text-[14px] text-ink-muted">Connect your wallet to view your balance, OG membership, and tip history.</p>
        <button
          className="w-fit rounded-full bg-brand-gradient px-5 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow"
          onClick={login}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const filtered = filter === "all" ? items : items.filter((i) => i.direction === filter);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-surface-border px-4 py-4">
        <BackButton />
        <h1 className="font-display text-[20px] font-bold text-ink">Wallet</h1>
      </div>

      <div className="flex flex-col gap-4 p-4">
        <BalanceCard />
        <OGCard />

        <div className="rounded-2xl border border-surface-border bg-surface p-4 shadow-card">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
              <CoinIcon size={17} />
              Tip history
            </h2>
            <div className="flex items-center gap-1 rounded-full border border-surface-border p-0.5">
              {(["all", "sent", "received"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-semibold capitalize transition-colors ${
                    filter === f ? "bg-brand-gradient text-accent-contrast" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {tipsLoading && items.length === 0 && <p className="py-4 text-center text-[13px] text-ink-muted">Loading…</p>}
          {!tipsLoading && filtered.length === 0 && (
            <p className="py-4 text-center text-[13px] text-ink-muted">
              {filter === "all" ? "No tips yet." : `No tips ${filter} yet.`}
            </p>
          )}

          <div className="flex flex-col divide-y divide-surface-border">
            {filtered.map((item) => (
              <TipRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
