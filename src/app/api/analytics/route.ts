import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

const DAILY_BUCKETS = 30;

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const checksummed = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_og")
    .eq("wallet_address", checksummed)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!profile.is_og) {
    return NextResponse.json({ error: "Analytics is only available for OG members" }, { status: 403 });
  }

  const since = new Date(Date.now() - DAILY_BUCKETS * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: tipRows, error: tipError }, { data: followRows, error: followError }] = await Promise.all([
    supabase
      .from("tips")
      .select("amount_usdc, created_at")
      .eq("to_wallet", checksummed)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
    supabase
      .from("follows")
      .select("created_at")
      .eq("following_wallet", checksummed)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  if (tipError || followError) {
    console.error("[TwoBlock] Failed to load analytics:", tipError ?? followError);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }

  const totalTipsReceived = (tipRows ?? []).reduce((sum, r) => sum + Number(r.amount_usdc), 0);
  const tipsByDay = bucketByDay(tipRows ?? [], (r) => Number(r.amount_usdc));
  const followersByDay = bucketByDay(followRows ?? [], () => 1);

  return NextResponse.json({
    totalTipsReceived,
    tipCount: (tipRows ?? []).length,
    newFollowers: (followRows ?? []).length,
    tipsByDay,
    followersByDay,
  });
}

function bucketByDay<T extends { created_at: string }>(rows: T[], value: (row: T) => number) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + value(row));
  }
  return Array.from(byDay.entries())
    .map(([day, total]) => ({ day, total }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
