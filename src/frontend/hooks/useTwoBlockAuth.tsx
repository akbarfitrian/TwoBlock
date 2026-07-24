"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAddress, type Address, type Chain } from "viem";
import {
  activeArcChain,
  CHAIN_REGISTRY,
  getChainKeyByChainId,
  type TwoBlockChainKey,
} from "@/shared/chain";
import { useActiveChain } from "@/frontend/hooks/useActiveChain";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

function normalizeAddress(raw: string): Address | null {
  try {
    return getAddress(raw);
  } catch {
    return null;
  }
}

export type OnboardResult = { ok: true } | { ok: false; error: string };

export interface TwoBlockAuthState {
  ready: boolean;
  authenticated: boolean;
  walletAddress: Address | null;
  login: () => Promise<void>;
  logout: () => void;

  ensureArcNetwork: () => Promise<void>;
  /// Same as ensureArcNetwork but targets whichever network is currently
  /// selected in the network selector (see useActiveChain), not always
  /// Arc. Prefer this for anything triggered from user action after the
  /// multi-chain selector landed — ensureArcNetwork is kept only for
  /// call sites that specifically need Arc regardless of selection.
  ensureActiveNetwork: () => Promise<void>;

  /// Same idea as ensureActiveNetwork, but takes the target chain key as an
  /// explicit argument instead of reading it from useActiveChain's context.
  /// Needed for call sites (like NetworkSelector) that call this in the
  /// same handler as setActiveChainKey(key) — the context value there is
  /// still the *previous* selection until the next render, so relying on
  /// ensureActiveNetwork()'s closure would switch/add the wallet to the
  /// chain the user is navigating away from, not the one they just picked.
  ensureNetworkForKey: (key: TwoBlockChainKey) => Promise<void>;

  connectModalOpen: boolean;
  closeConnectModal: () => void;

  connecting: boolean;
  connectError: string | null;

  connectMetaMask: () => Promise<void>;

  needsUsername: boolean;

  checkingProfile: boolean;
  onboarding: boolean;

  completeOnboarding: (username: string) => Promise<OnboardResult>;
}

function useTwoBlockAuthState(): TwoBlockAuthState {
  const [ready, setReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [needsUsername, setNeedsUsername] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) {
      setReady(true);
      return;
    }

    const ethereum = window.ethereum;

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as string[];
        if (list[0]) setWalletAddress(normalizeAddress(list[0]));
      })
      .catch((err) => console.warn("[TwoBlock] Failed to check wallet account:", err))
      .finally(() => setReady(true));

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setWalletAddress(accounts[0] ? normalizeAddress(accounts[0]) : null);
    };

    ethereum.on?.("accountsChanged", handleAccountsChanged);
    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
    };
  }, []);

  const { activeChain, activeChainKey, setActiveChainKey } = useActiveChain();

  const ensureNetwork = useCallback(async (chain: Chain) => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const chainIdHex = `0x${chain.id.toString(16)}`;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (err) {

      const code = (err as { code?: number })?.code;
      if (code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: chainIdHex,
                chainName: chain.name,
                nativeCurrency: chain.nativeCurrency,
                rpcUrls: chain.rpcUrls.default.http,
                blockExplorerUrls: chain.blockExplorers
                  ? [chain.blockExplorers.default.url]
                  : [],
              },
            ],
          });
        } catch (addErr) {
          console.warn(`[TwoBlock] Failed to add ${chain.name} network:`, addErr);
        }
      } else {

        console.warn(`[TwoBlock] Failed to auto-switch to ${chain.name} network:`, err);
      }
    }
  }, []);

  const ensureArcNetwork = useCallback(async () => {
    await ensureNetwork(activeArcChain);
  }, [ensureNetwork]);

  const ensureActiveNetwork = useCallback(async () => {
    await ensureNetwork(activeChain.chain);
  }, [ensureNetwork, activeChain]);

  // Reads straight from CHAIN_REGISTRY by key instead of the activeChain
  // context value, so it always targets exactly the chain the caller passed
  // in — not whatever the context still says a render behind.
  const ensureNetworkForKey = useCallback(
    async (key: TwoBlockChainKey) => {
      await ensureNetwork(CHAIN_REGISTRY[key].chain);
    },
    [ensureNetwork]
  );

  // If the user switches network from inside their wallet extension
  // directly (instead of TwoBlock's selector), keep the selector's state
  // in sync so the rest of the app (payment flow branching, explorer
  // links, etc.) reflects what the wallet is actually connected to.
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const ethereum = window.ethereum;

    const handleChainChanged = (...args: unknown[]) => {
      const chainIdHex = args[0] as string;
      const chainId = parseInt(chainIdHex, 16);
      const matchedKey = getChainKeyByChainId(chainId);
      if (matchedKey && matchedKey !== activeChainKey) {
        setActiveChainKey(matchedKey);
      }
    };

    ethereum.on?.("chainChanged", handleChainChanged);
    return () => {
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [activeChainKey, setActiveChainKey]);

  const closeConnectModal = useCallback(() => {
    setConnectModalOpen(false);
    setConnectError(null);
  }, []);

  const connectMetaMask = useCallback(async () => {
    setConnectError(null);

    if (typeof window === "undefined" || !window.ethereum) {
      setConnectError("MetaMask not detected. Install the extension to continue.");
      return;
    }

    setConnecting(true);
    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      setWalletAddress(accounts[0] ? normalizeAddress(accounts[0]) : null);
      await ensureActiveNetwork();
      setConnectModalOpen(false);
    } catch (err) {

      console.warn("[TwoBlock] Failed to connect wallet:", err);
      setConnectError("Connection request was rejected or failed. Try again.");
    } finally {
      setConnecting(false);
    }
  }, [ensureActiveNetwork]);

  const login = useCallback(async () => {
    setConnectError(null);
    setConnectModalOpen(true);
  }, []);

  const logout = useCallback(() => {

    setWalletAddress(null);
    setNeedsUsername(false);
    setConnectModalOpen(false);
    setConnectError(null);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setNeedsUsername(false);
      return;
    }
    let cancelled = false;

    // Fire-and-forget: keeps server-side profile bookkeeping (e.g.
    // assigning a referral_code) in sync every time a wallet connects,
    // including for wallets that onboarded before this bookkeeping
    // existed. Deliberately not awaited — it shouldn't block or fail the
    // username check below.
    fetch("/api/profiles/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    }).catch((err) => console.error("[TwoBlock] Failed to sync profile:", err));

    (async () => {
      setCheckingProfile(true);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("username")
          .eq("wallet_address", walletAddress)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("[TwoBlock] Failed to check profile onboarding status:", error);
          return;
        }
        setNeedsUsername(!data || !data.username);
      } finally {
        if (!cancelled) setCheckingProfile(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const completeOnboarding = useCallback(
    async (rawUsername: string): Promise<OnboardResult> => {
      if (!walletAddress) return { ok: false, error: "Wallet not connected." };
      const username = rawUsername.trim();
      if (!USERNAME_RE.test(username)) {
        return { ok: false, error: "Username must be 3-20 characters, letters/numbers/underscore only." };
      }
      setOnboarding(true);
      try {
        const res = await fetch("/api/profiles/onboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, username }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Failed to save username." };
        }
        setNeedsUsername(false);
        return { ok: true };
      } catch (err) {
        console.error("[TwoBlock] Failed to submit onboarding:", err);
        return { ok: false, error: "Failed to reach the server, try again." };
      } finally {
        setOnboarding(false);
      }
    },
    [walletAddress]
  );

  return {
    ready,
    authenticated: !!walletAddress,
    walletAddress,
    login,
    logout,
    ensureArcNetwork,
    ensureActiveNetwork,
    ensureNetworkForKey,
    connectModalOpen,
    closeConnectModal,
    connecting,
    connectError,
    connectMetaMask,
    needsUsername,
    checkingProfile,
    onboarding,
    completeOnboarding,
  };
}

const TwoBlockAuthContext = createContext<TwoBlockAuthState | null>(null);

export function TwoBlockAuthProvider({ children }: { children: ReactNode }) {
  const state = useTwoBlockAuthState();
  const value = useMemo(() => state, [state]);
  return <TwoBlockAuthContext.Provider value={value}>{children}</TwoBlockAuthContext.Provider>;
}

export function useTwoBlockAuth(): TwoBlockAuthState {
  const ctx = useContext(TwoBlockAuthContext);
  if (!ctx) {
    throw new Error("useTwoBlockAuth must be called within a <TwoBlockAuthProvider>");
  }
  return ctx;
}