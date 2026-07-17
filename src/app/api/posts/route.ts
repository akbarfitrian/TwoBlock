import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeQuestOnce, refreshPostingStreak } from "@/lib/quests";

export async function POST(req: NextRequest) {
  const { authorWallet, content, repostOf, postType, pollOptions, pollDurationHours, imageUrls } = await req.json();

  if (!authorWallet || !isAddress(authorWallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  const checksummed = getAddress(authorWallet);
  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("verification_tier")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found. Connect your wallet first." }, { status: 404 });
  }

  const { data: pricing, error: pricingError } = await supabase
    .from("verification_pricing")
    .select("daily_post_limit, max_post_chars, can_attach_image")
    .eq("tier", profile.verification_tier)
    .single();

  if (pricingError || !pricing) {
    console.error("[TwoBlock] Failed to fetch verification_pricing:", pricingError);
    return NextResponse.json({ error: "Failed to verify tier limits" }, { status: 500 });
  }

  if (repostOf) {
    if (typeof repostOf !== "string") {
      return NextResponse.json({ error: "Invalid repostOf" }, { status: 400 });
    }

    const { data: existingRepost, error: existingRepostError } = await supabase
      .from("posts")
      .select("id")
      .eq("author_wallet", checksummed)
      .eq("repost_of", repostOf)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingRepostError) {
      console.error("[TwoBlock] Failed to check existing repost:", existingRepostError);
      return NextResponse.json({ error: "Failed to repost" }, { status: 500 });
    }

    if (existingRepost) {
      const { error: deleteError } = await supabase.from("posts").delete().eq("id", existingRepost.id);
      if (deleteError) {
        console.error("[TwoBlock] Failed to remove repost:", deleteError);
        return NextResponse.json({ error: "Failed to remove repost" }, { status: 500 });
      }
      return NextResponse.json({ reposted: false });
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({ author_wallet: checksummed, repost_of: repostOf, post_type: "text" })
      .select("id")
      .single();

    if (error) {
      console.error("[TwoBlock] Failed to repost:", error);
      return NextResponse.json({ error: "Failed to repost" }, { status: 500 });
    }
    return NextResponse.json({ reposted: true, postId: data.id });
  }

  if (postType === "poll") {
    if (profile.verification_tier !== "verified_max") {
      return NextResponse.json({ error: "Creating polls is only available for Verified Max tier" }, { status: 403 });
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Poll question can't be empty" }, { status: 400 });
    }
    const question = content.trim();
    if (question.length > pricing.max_post_chars) {
      return NextResponse.json({ error: `Pertanyaan melebihi batas ${pricing.max_post_chars} karakter` }, { status: 400 });
    }
    const options: unknown[] = Array.isArray(pollOptions) ? pollOptions : [];
    const cleanOptions = options.map((o) => (typeof o === "string" ? o.trim() : "")).filter((o) => o.length > 0);
    if (cleanOptions.length < 2 || cleanOptions.length > 4) {
      return NextResponse.json({ error: "Polls need 2 to 4 options" }, { status: 400 });
    }

    let pollExpiresAt: string | null = null;
    if (pollDurationHours !== null && pollDurationHours !== undefined) {
      const hours = Number(pollDurationHours);
      if (!Number.isFinite(hours) || hours <= 0) {
        return NextResponse.json({ error: "Invalid poll duration" }, { status: 400 });
      }
      pollExpiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    }

    if (pricing.daily_post_limit !== null) {
      const quotaError = await checkDailyQuota(supabase, checksummed, pricing.daily_post_limit);
      if (quotaError) return quotaError;
    }

    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_wallet: checksummed,
        content: question,
        post_type: "poll",
        poll_options: cleanOptions.map((label, index) => ({ index, label })),
        poll_expires_at: pollExpiresAt,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[TwoBlock] Failed to create poll:", error);
      return NextResponse.json({ error: "Failed to create poll" }, { status: 500 });
    }

    await completeQuestOnce(supabase, checksummed, "first_post");
    await refreshPostingStreak(supabase, checksummed);

    return NextResponse.json({ postId: data.id });
  }

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Post content can't be empty" }, { status: 400 });
  }
  const trimmed = content.trim();
  if (trimmed.length > pricing.max_post_chars) {
    return NextResponse.json(
      { error: `Post melebihi batas ${pricing.max_post_chars} karakter untuk tier ${profile.verification_tier}` },
      { status: 400 }
    );
  }

  if (pricing.daily_post_limit !== null) {
    const quotaError = await checkDailyQuota(supabase, checksummed, pricing.daily_post_limit);
    if (quotaError) return quotaError;
  }

  let cleanImageUrls: string[] = [];
  if (imageUrls !== undefined && imageUrls !== null) {
    if (!Array.isArray(imageUrls) || imageUrls.some((u) => typeof u !== "string")) {
      return NextResponse.json({ error: "Invalid imageUrls" }, { status: 400 });
    }
    if (imageUrls.length > 0 && !pricing.can_attach_image) {
      return NextResponse.json(
        { error: "Image attachments are only available for Verified Pro & Verified Max tiers" },
        { status: 403 }
      );
    }
    if (imageUrls.length > 4) {
      return NextResponse.json({ error: "Maximum 4 images per post" }, { status: 400 });
    }
    cleanImageUrls = imageUrls;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ author_wallet: checksummed, content: trimmed, post_type: "text", image_urls: cleanImageUrls })
    .select("id")
    .single();

  if (error) {
    console.error("[TwoBlock] Failed to create post:", error);
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }

  await completeQuestOnce(supabase, checksummed, "first_post");
  await refreshPostingStreak(supabase, checksummed);

  return NextResponse.json({ postId: data.id });
}

async function checkDailyQuota(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  wallet: string,
  dailyLimit: number
) {
  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_wallet", wallet)
    .is("deleted_at", null)
    .is("repost_of", null)
    .gte("created_at", startOfDayUtc.toISOString());

  if (error) {
    console.error("[TwoBlock] Failed to check post quota:", error);
    return NextResponse.json({ error: "Failed to verify post quota" }, { status: 500 });
  }
  if ((count ?? 0) >= dailyLimit) {
    return NextResponse.json({ error: "Your tier's daily post quota is used up" }, { status: 429 });
  }
  return null;
}
