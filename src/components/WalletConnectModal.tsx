"use client";

import { useTwoBlockAuth } from "@/hooks/useTwoBlockAuth";
import { XIcon } from "@/components/icons";

export function WalletConnectModal() {
  const { connectModalOpen, closeConnectModal, connecting, connectError, connectMetaMask } = useTwoBlockAuth();

  if (!connectModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !connecting) closeConnectModal();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[18px] font-bold text-ink">Connect a wallet</h2>
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-40"
            onClick={closeConnectModal}
            disabled={connecting}
            title="Close"
          >
            <XIcon size={13} />
          </button>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-muted">Choose a wallet to connect to TwoBlock.</p>

        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl border border-surface-border bg-surface-soft px-4 py-3 text-left transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={connectMetaMask}
            disabled={connecting}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-[18px]">🦊</span>
            <span className="flex flex-1 flex-col">
              <span className="text-[14px] font-semibold text-ink">MetaMask</span>
              <span className="text-[12px] text-ink-faint">Connect using the browser extension</span>
            </span>
            {connecting && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-ink-faint border-t-transparent" aria-hidden />
            )}
          </button>

          {}
        </div>

        {connectError && (
          <div className="mt-3 rounded-xl bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
            {connectError}
            {connectError.startsWith("MetaMask not detected") && (
              <>
                {" "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2"
                >
                  Install MetaMask
                </a>
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-[12px] text-ink-faint">
          Your wallet address becomes your TwoBlock identity — we never ask for your seed phrase.
        </p>
      </div>
    </div>
  );
}
