"use client";

import { useEffect, useRef, useState } from "react";
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { CHAIN_REGISTRY, type TwoBlockChainKey } from "@/shared/chain";
import { ChevronDownIcon, NetworkIcon } from "@/frontend/components/icons";

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

const CHAIN_ORDER: TwoBlockChainKey[] = ["arc", "giwaSepolia"];

/// Short label shown in the collapsed button — full chain name is shown in
/// the open menu instead, this just needs to fit next to the other TopBar
/// icons without crowding the layout.
const SHORT_LABEL: Record<TwoBlockChainKey, string> = {
  arc: "Arc",
  giwaSepolia: "Giwa",
};

export function NetworkSelector() {
  const { activeChainKey, setActiveChainKey } = useActiveChain();
  const { authenticated, ensureActiveNetwork } = useTwoBlockAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  const handleSelect = async (key: TwoBlockChainKey) => {
    if (key === activeChainKey) {
      setOpen(false);
      return;
    }
    setActiveChainKey(key);
    setOpen(false);

    // If a wallet is already connected, follow through by asking it to
    // actually switch/add the new network too — otherwise the selector
    // and the wallet's real connected chain would silently drift apart.
    if (authenticated) {
      setSwitching(true);
      try {
        await ensureActiveNetwork();
      } finally {
        setSwitching(false);
      }
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-surface-border bg-surface px-3 text-[13px] font-semibold text-ink-muted transition-colors hover:bg-surface-hover hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        aria-label="Select network"
        aria-expanded={open}
        title="Select network"
      >
        <NetworkIcon size={15} />
        <span className="hidden sm:inline">{SHORT_LABEL[activeChainKey]}</span>
        <ChevronDownIcon size={13} />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-card">
          <div className="border-b border-surface-border px-4 py-2.5">
            <span className="text-[12px] font-bold uppercase tracking-wide text-ink-faint">Network</span>
          </div>
          <div className="p-1.5">
            {CHAIN_ORDER.map((key) => {
              const config = CHAIN_REGISTRY[key];
              const selected = key === activeChainKey;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleSelect(key)}
                  disabled={switching}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-semibold transition-colors disabled:opacity-60 ${
                    selected ? "bg-brand-blue/10 text-brand-blue" : "text-ink hover:bg-surface-hover"
                  }`}
                >
                  <span className="flex flex-col">
                    <span>{config.chain.name}</span>
                    <span className="text-[11.5px] font-normal text-ink-faint">
                      {config.paymentMode === "native" ? "Native USDC" : "USDC (ERC-20)"}
                    </span>
                  </span>
                  {selected && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-blue" />}
                </button>
              );
            })}
          </div>
          <div className="border-t border-surface-border px-4 py-2.5">
            <p className="text-[11.5px] leading-snug text-ink-faint">
              Testnet only. Switching updates your connected wallet's network too.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
