"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import { useTwoBlockAuth } from "@/frontend/hooks/useTwoBlockAuth";
import { displayName } from "@/frontend/lib/format";

const REFRESH_INTERVAL_MS = 30_000;
const HISTORY_LIMIT = 40;

export interface TipHistoryItem {
  id: string;
  direction: "sent" | "received";
  amountUsdc: number;
  netAmountUsdc: number;
  feeUsdc: number;
  counterpartyWallet: string;
  counterpartyLabel: string;
  counterpartyAvatarUrl: string | null;
  createdAt: string;
  txRef: string;
}

export function useTipHistory() {
  const { walletAddress } = useTwoBlockAuth();
  const [items, setItems] = useState<TipHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!walletAddress) {
        setItems([]);
        return;
      }
      if (!opts?.silent) setLoading(true);
      const supabase = createSupabaseBrowserClient();

      const { data: rows, error } = await supabase
        .from("tips")
        .select("id, from_wallet, to_wallet, amount_usdc, fee_usdc, net_amount_usdc, tx_ref, created_at")
        .or(`from_wallet.eq.${walletAddress},to_wallet.eq.${walletAddress}`)
        .order("created_at", { ascending: false })
        .limit(HISTORY_LIMIT);

      if (error || !rows) {
        console.error("[TwoBlock] Failed to load tip history:", error);
        setItems([]);
        if (!opts?.silent) setLoading(false);
        return;
      }

      const counterpartyWallets = [
        ...new Set(
          rows.map((r) => (r.from_wallet === walletAddress ? r.to_wallet : r.from_wallet))
        ),
      ];

      const { data: profileRows } = await supabase
        .from("profiles")
        .select("wallet_address, username, avatar_url")
        .in("wallet_address", counterpartyWallets.length > 0 ? counterpartyWallets : [""]);

      const profileByWallet = new Map((profileRows ?? []).map((p) => [p.wallet_address, p]));

      const merged: TipHistoryItem[] = rows.map((row) => {
        const sent = row.from_wallet === walletAddress;
        const counterpartyWallet = sent ? row.to_wallet : row.from_wallet;
        const p = profileByWallet.get(counterpartyWallet);
        return {
          id: row.id,
          direction: sent ? "sent" : "received",
          amountUsdc: Number(row.amount_usdc),
          netAmountUsdc: Number(row.net_amount_usdc),
          feeUsdc: Number(row.fee_usdc),
          counterpartyWallet,
          counterpartyLabel: displayName(p?.username ?? null, counterpartyWallet),
          counterpartyAvatarUrl: p?.avatar_url ?? null,
          createdAt: row.created_at,
          txRef: row.tx_ref,
        };
      });

      setItems(merged);
      if (!opts?.silent) setLoading(false);
    },
    [walletAddress]
  );

  useEffect(() => {
    load();
    const interval = setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  return { items, loading, refresh: load };
}
