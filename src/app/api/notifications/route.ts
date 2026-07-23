import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const me = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, is_read, created_at, post_id, tip_id, comment_id, actor:actor_wallet(wallet_address, username, avatar_url, is_og, total_points)"
    )
    .eq("recipient_wallet", me)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[TwoBlock] Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { wallet, id } = await req.json();
  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const me = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  let query = supabase.from("notifications").update({ is_read: true }).eq("recipient_wallet", me);
  if (id) query = query.eq("id", id);

  const { error } = await query;
  if (error) {
    console.error("[TwoBlock] Failed to mark notification read:", error);
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 });
  }

  return NextResponse.json({ status: "ok" });
}
