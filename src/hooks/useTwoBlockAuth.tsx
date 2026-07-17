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
import { getAddress, type Address } from "viem";
import { activeArcChain } from "@/lib/arc/chain";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

  const ensureArcNetwork = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return;
    const chainIdHex = `0x${activeArcChain.id.toString(16)}`;

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
                chainName: activeArcChain.name,
                nativeCurrency: activeArcChain.nativeCurrency,
                rpcUrls: activeArcChain.rpcUrls.default.http,
                blockExplorerUrls: activeArcChain.blockExplorers
                  ? [activeArcChain.blockExplorers.default.url]
                  : [],
              },
            ],
          });
        } catch (addErr) {
          console.warn("[TwoBlock] Failed to add Arc network:", addErr);
        }
      } else {

        console.warn("[TwoBlock] Failed to auto-switch to Arc network:", err);
      }
    }
  }, []);

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
      await ensureArcNetwork();
      setConnectModalOpen(false);
    } catch (err) {

      console.warn("[TwoBlock] Failed to connect wallet:", err);
      setConnectError("Connection request was rejected or failed. Try again.");
    } finally {
      setConnecting(false);
    }
  }, [ensureArcNetwork]);

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
    throw new Error("useTwoBlockAuth harus dipanggil di dalam <TwoBlockAuthProvider>");
  }
  return ctx;
}
