"use client";

import { useCallback, useEffect, useState } from "react";
import type { Address } from "viem";
import { activeArcChain } from "@/lib/arc/chain";

export interface TwoBlockAuthState {
  ready: boolean;
  authenticated: boolean;
  walletAddress: Address | null;
  login: () => Promise<void>;
  logout: () => void;
  /** Panggil setelah login sukses agar wallet aktif berada di jaringan Arc yang benar. */
  ensureArcNetwork: () => Promise<void>;
}

/**
 * Hook utama autentikasi TwoBlock, pakai wallet browser (MetaMask atau wallet
 * lain yang inject window.ethereum) langsung lewat EIP-1193 — tanpa Privy,
 * tanpa embedded wallet. Wallet address = identitas user (sesuai bagian 1
 * dokumen konsep).
 */
export function useTwoBlockAuth(): TwoBlockAuthState {
  const [ready, setReady] = useState(false);
  const [walletAddress, setWalletAddress] = useState<Address | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Cek koneksi yang sudah ada (tanpa munculin popup) begitu halaman dibuka,
  // dan dengarkan perubahan akun/jaringan dari wallet extension.
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
        if (list[0]) setWalletAddress(list[0] as Address);
      })
      .catch((err) => console.warn("[TwoBlock] Gagal cek akun wallet:", err))
      .finally(() => setReady(true));

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      setWalletAddress((accounts[0] as Address) ?? null);
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
      // 4902 = chain belum dikenal wallet -> minta ditambahkan dulu.
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
          console.warn("[TwoBlock] Gagal menambahkan jaringan Arc:", addErr);
        }
      } else {
        // User menolak switch chain, atau wallet tidak mendukungnya — biarkan
        // UI menampilkan prompt "Ganti jaringan ke Arc" secara manual.
        console.warn("[TwoBlock] Gagal auto-switch ke jaringan Arc:", err);
      }
    }
  }, []);

  const login = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      // Tidak ada wallet extension terdeteksi -> arahkan user buat install.
      window.open("https://metamask.io/download/", "_blank", "noopener,noreferrer");
      return;
    }

    const accounts = (await window.ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    setWalletAddress((accounts[0] as Address) ?? null);

    await ensureArcNetwork();
  }, [ensureArcNetwork]);

  const logout = useCallback(() => {
    // Wallet browser (MetaMask dkk) tidak punya API "disconnect" programatis
    // — koneksi dicabut dari sisi extension oleh user. Di sini kita cukup
    // lupakan state lokal supaya UI kembali ke tombol "Hubungkan wallet".
    setWalletAddress(null);
  }, []);

  // Setelah wallet siap, sinkronkan wallet_address ke tabel `profiles`
  // (upsert idempoten — lihat app/api/profiles/sync/route.ts).
  useEffect(() => {
    if (!walletAddress || syncing) return;
    setSyncing(true);
    fetch("/api/profiles/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    })
      .catch((err) => console.error("[TwoBlock] Gagal sinkronisasi profil:", err))
      .finally(() => setSyncing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  return {
    ready,
    authenticated: !!walletAddress,
    walletAddress,
    login,
    logout,
    ensureArcNetwork,
  };
}
