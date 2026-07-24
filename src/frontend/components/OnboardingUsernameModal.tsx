"use client";

import { useState, type FormEvent } from "react";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { shortenAddress } from "@/frontend/lib/format";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function OnboardingUsernameModal() {
  const { walletAddress, needsUsername, checkingProfile, onboarding, completeOnboarding, connectModalOpen } =
    useTwoBlockAuth();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!walletAddress || checkingProfile || !needsUsername || connectModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = value.trim();
    if (!USERNAME_RE.test(trimmed)) {
      setError("Username must be 3-20 characters, letters/numbers/underscore only.");
      return;
    }
    const result = await completeOnboarding(trimmed);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <h2 className="font-display text-[18px] font-bold text-ink">Complete your profile</h2>
        <p className="mt-1.5 text-[13px] text-ink-muted">
          Wallet <b className="font-semibold text-ink">{shortenAddress(walletAddress)}</b> just connected to TwoBlock for the
          first time. Pick a username to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <input
            className="rounded-xl border border-surface-border bg-transparent px-3 py-2.5 text-[14px] text-ink outline-none focus:border-brand-blue/50"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="username"
            maxLength={20}
            autoFocus
            disabled={onboarding}
          />
          {error && <p className="text-[13px] text-danger">{error}</p>}
          <button
            className="rounded-full bg-brand-gradient px-4 py-2.5 text-[14px] font-bold text-accent-contrast shadow-glow disabled:opacity-50"
            type="submit"
            disabled={onboarding || value.trim().length === 0}
          >
            {onboarding ? "Saving…" : "Save & continue"}
          </button>
        </form>
        <p className="mt-3 text-[12px] text-ink-faint">3-20 characters, letters/numbers/underscore only.</p>
      </div>
    </div>
  );
}