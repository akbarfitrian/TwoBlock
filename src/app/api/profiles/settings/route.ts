import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";
import { completeQuestOnce } from "@/shared/quests";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_BIO_CHARS = 160;
const USERNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const walletAddress = body?.walletAddress;

  if (!walletAddress || !isAddress(walletAddress)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {};

  if (body.username !== undefined) {
    if (typeof body.username !== "string" || !USERNAME_RE.test(body.username)) {
      return NextResponse.json(
        { error: "Username must be 3-20 characters, letters/numbers/underscore only." },
        { status: 400 }
      );
    }

    const checksummedForCheck = getAddress(walletAddress);
    const supabaseForCheck = createSupabaseServerClient();
    const { data: current, error: currentError } = await supabaseForCheck
      .from("profiles")
      .select("username, username_changed_at")
      .eq("wallet_address", checksummedForCheck)
      .maybeSingle();

    if (currentError) {
      console.error("[TwoBlock] Failed to check current username before update:", currentError);
      return NextResponse.json({ error: "Failed to verify username change eligibility." }, { status: 500 });
    }

    const isActualChange = current?.username !== body.username;

    if (isActualChange && current?.username_changed_at) {
      const elapsedMs = Date.now() - new Date(current.username_changed_at).getTime();
      if (elapsedMs < USERNAME_COOLDOWN_MS) {
        const daysLeft = Math.ceil((USERNAME_COOLDOWN_MS - elapsedMs) / (24 * 60 * 60 * 1000));
        return NextResponse.json(
          { error: `You can change your username again in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.` },
          { status: 429 }
        );
      }
    }

    updates.username = body.username;
    if (isActualChange) {
      updates.username_changed_at = new Date().toISOString();
    }
  }

  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > MAX_BIO_CHARS) {
      return NextResponse.json({ error: `Bio maksimal ${MAX_BIO_CHARS} karakter` }, { status: 400 });
    }
    updates.bio = body.bio.trim().length > 0 ? body.bio.trim() : null;
  }

  if (body.avatarUrl !== undefined) {
    if (body.avatarUrl !== null && typeof body.avatarUrl !== "string") {
      return NextResponse.json({ error: "Invalid avatarUrl" }, { status: 400 });
    }
    updates.avatar_url = body.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No changes to save" }, { status: 400 });
  }

  const checksummed = getAddress(walletAddress);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("wallet_address", checksummed)
    .select("wallet_address, username, bio, avatar_url, is_og, username_changed_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Username is taken, try another one." }, { status: 409 });
    }
    console.error("[TwoBlock] Failed to update profile (settings):", error);
    return NextResponse.json({ error: "Failed to save profile changes." }, { status: 500 });
  }

  if (data.avatar_url && data.bio) {
    await completeQuestOnce(supabase, checksummed, "profile_complete");
  }

  return NextResponse.json({ profile: data });
}
