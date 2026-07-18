"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/frontend/lib/supabase-client";
import type { VerificationTier } from "@/shared/types";
import { getTierLimits } from "@/shared/tier-limits";

export interface VerificationPricingRow {
  tier: VerificationTier;
  monthlyPriceUsdc: number;
  annualPriceUsdc: number;
  dailyPostLimit: number | null;
  maxPostChars: number;
  canAttachImage: boolean;
  canEditPost: boolean;

  canCreatePoll: boolean;
}

export function useVerificationPricing() {
  const [rows, setRows] = useState<VerificationPricingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createSupabaseBrowserClient();
      const { data } = await supabase
        .from("verification_pricing")
        .select("tier, monthly_price_usdc, annual_discount, daily_post_limit, max_post_chars, can_attach_image, can_edit_post")
        .neq("tier", "free")
        .order("monthly_price_usdc", { ascending: true });

      if (cancelled) return;
      setRows(
        (data ?? []).map((r) => ({
          tier: r.tier,
          monthlyPriceUsdc: Number(r.monthly_price_usdc),
          annualPriceUsdc: Math.round(Number(r.monthly_price_usdc) * 12 * (1 - Number(r.annual_discount)) * 1e6) / 1e6,
          dailyPostLimit: r.daily_post_limit,
          maxPostChars: r.max_post_chars,
          canAttachImage: r.can_attach_image,
          canEditPost: r.can_edit_post,
          canCreatePoll: getTierLimits(r.tier as VerificationTier).canCreatePoll,
        }))
      );
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pricing: rows, loading };
}
