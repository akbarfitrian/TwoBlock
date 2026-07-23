"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import {
  CHAIN_REGISTRY,
  DEFAULT_CHAIN_KEY,
  type TwoBlockChainConfig,
  type TwoBlockChainKey,
} from "@/shared/chain";

const STORAGE_KEY = "twoblock-active-chain";

interface ActiveChainContextValue {
  /// Which network the user has picked in the selector — "arc" | "giwaSepolia".
  activeChainKey: TwoBlockChainKey;
  /// Full registry entry (viem chain, paymentMode, usdcDecimals) for the
  /// currently selected network. Everything that needs to branch on
  /// native-vs-erc20 payment flow reads `activeChain.paymentMode` from here.
  activeChain: TwoBlockChainConfig;
  setActiveChainKey: (key: TwoBlockChainKey) => void;
  /// False until the stored preference has been read from localStorage on
  /// mount. Useful for callers that want to avoid acting on the default
  /// ("arc") before knowing whether the user actually had Giwa selected.
  ready: boolean;
}

const ActiveChainContext = createContext<ActiveChainContextValue | null>(null);

function isValidChainKey(value: string | null): value is TwoBlockChainKey {
  return value !== null && value in CHAIN_REGISTRY;
}

export function ActiveChainProvider({ children }: { children: ReactNode }) {
  const [activeChainKey, setActiveChainKeyState] = useState<TwoBlockChainKey>(DEFAULT_CHAIN_KEY);
  const [ready, setReady] = useState(false);

  // Read the stored preference once on mount. Deliberately not read
  // synchronously during render (server has no localStorage) — the
  // default ("arc") is what both server and first client render show,
  // then this effect swaps it in right after hydration, same pattern as
  // useTheme.tsx.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isValidChainKey(stored)) {
        setActiveChainKeyState(stored);
      }
    } catch (err) {
      console.warn("[TwoBlock] Failed to read stored network preference:", err);
    } finally {
      setReady(true);
    }
  }, []);

  const setActiveChainKey = useCallback((key: TwoBlockChainKey) => {
    setActiveChainKeyState(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch (err) {
      console.warn("[TwoBlock] Failed to persist network preference:", err);
    }
  }, []);

  const value: ActiveChainContextValue = {
    activeChainKey,
    activeChain: CHAIN_REGISTRY[activeChainKey],
    setActiveChainKey,
    ready,
  };

  return <ActiveChainContext.Provider value={value}>{children}</ActiveChainContext.Provider>;
}

export function useActiveChain(): ActiveChainContextValue {
  const ctx = useContext(ActiveChainContext);
  if (!ctx) {
    throw new Error("useActiveChain must be called within an <ActiveChainProvider>");
  }
  return ctx;
}
