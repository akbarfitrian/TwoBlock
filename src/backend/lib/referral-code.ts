import { randomInt } from "crypto";
import type { createSupabaseServerClient } from "@/backend/lib/supabase-server";

type ServerClient = ReturnType<typeof createSupabaseServerClient>;

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;
const MAX_ATTEMPTS = 5;

function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  }
  return code;
}

/**
 * Generates a fresh 8-character alphanumeric referral code, retrying on
 * the (rare) `UNIQUE` collision. Returns null if it somehow can't find a
 * free code after a handful of attempts — caller should treat that as
 * non-fatal (the wallet just won't have a referral code yet, and can be
 * retried later).
 */
export async function assignReferralCode(supabase: ServerClient, wallet: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateReferralCode();
    const { error } = await supabase
      .from("profiles")
      .update({ referral_code: code })
      .eq("wallet_address", wallet)
      .is("referral_code", null);

    if (!error) return code;
    if (error.code === "23505") continue; // collision, retry with a new code
    console.error(`[TwoBlock] Failed to assign referral code to ${wallet}:`, error);
    return null;
  }
  console.error(`[TwoBlock] Exhausted ${MAX_ATTEMPTS} attempts generating a referral code for ${wallet}`);
  return null;
}

/** Assigns a referral code only if the profile doesn't already have one. */
export async function ensureReferralCode(supabase: ServerClient, wallet: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("wallet_address", wallet)
    .maybeSingle();

  if (error) {
    console.error(`[TwoBlock] Failed to check referral code for ${wallet}:`, error);
    return;
  }
  if (data?.referral_code) return;

  await assignReferralCode(supabase, wallet);
}
