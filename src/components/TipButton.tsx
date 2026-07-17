"use client";

import { useState, type FormEvent } from "react";
import { useSendTip } from "@/lib/actions/sendTip";
import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { CoinIcon, XIcon } from "@/components/icons";

interface TipButtonProps {
  postId: string;
  toWallet: `0x${string}`;
  currentTotal: number;
}

const QUICK_AMOUNTS = [1, 5, 10, 25];

export function TipButton({ postId, toWallet, currentTotal }: TipButtonProps) {
  const { authenticated, walletAddress, login } = useTwoBlockAuth();
  const { sendTip } = useSendTip();
  const [total, setTotal] = useState(currentTotal);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("1.00");

  const isOwnPost = !!walletAddress && walletAddress.toLowerCase() === toWallet.toLowerCase();

  const openModal = () => {
    if (!authenticated) {
      login();
      return;
    }
    setError(null);
    setAmountInput("1.00");
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(amountInput);
    if (isNaN(amount) || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setPending(true);
    setError(null);
    try {
      await sendTip({ toWallet, amountUsdc: amount, postId });

      setTotal((t) => t + amount);
      setModalOpen(false);
    } catch (err) {
      console.error("[TwoBlock] Sending tip failed:", err);
      setError(err instanceof Error ? err.message : "Failed to send tip. Try again.");
    } finally {
      setPending(false);
    }
  };

  if (isOwnPost) {
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium text-ink-faint">
        <CoinIcon size={16} />
        <span>${total.toFixed(2)}</span>
      </span>
    );
  }

  return (
    <>
      <button
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-gold/10 hover:text-gold disabled:opacity-50"
        onClick={openModal}
        disabled={pending}
      >
        <CoinIcon size={16} />
        <span>{pending ? "…" : `$${total.toFixed(2)}`}</span>
      </button>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => !pending && setModalOpen(false)}
        >
          <form
            className="w-full max-w-[360px] rounded-2xl border border-surface-border bg-surface p-5 shadow-card"
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 font-display text-[17px] font-bold text-ink">
                <CoinIcon size={18} />
                Send a tip
              </h2>
              <button
                type="button"
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink"
                onClick={() => setModalOpen(false)}
                aria-label="Close"
              >
                <XIcon size={14} />
              </button>
            </div>

            <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
              Amount (USDC)
            </label>
            <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-surface-border bg-surface-soft px-3 py-2.5 focus-within:border-brand-blue/50">
              <span className="text-[15px] font-semibold text-ink-faint">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                autoFocus
                className="w-full bg-transparent text-[15px] font-semibold text-ink outline-none"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-[13px] font-semibold transition-colors ${
                    amountInput === amt.toFixed(2)
                      ? "border-brand-blue/50 bg-brand-blue/10 text-brand-blue"
                      : "border-surface-border text-ink-muted hover:bg-surface-hover"
                  }`}
                  onClick={() => setAmountInput(amt.toFixed(2))}
                >
                  ${amt}
                </button>
              ))}
            </div>

            {error && <p className="mt-3 text-[13px] text-danger">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-full border border-surface-border px-4 py-2 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
                onClick={() => setModalOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-brand-gradient px-5 py-2 text-[14px] font-bold text-accent-contrast shadow-glow transition-transform duration-150 hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                disabled={pending}
              >
                {pending ? "Sending…" : "Send tip"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
