import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const wallet = req.nextUrl.searchParams.get("wallet");
  const withWallet = req.nextUrl.searchParams.get("with");

  if (!wallet || !isAddress(wallet)) {
    return NextResponse.json({ error: "Invalid wallet parameter" }, { status: 400 });
  }
  const me = getAddress(wallet);
  const supabase = createSupabaseServerClient();

  if (withWallet) {
    if (!isAddress(withWallet)) {
      return NextResponse.json({ error: "Invalid with parameter" }, { status: 400 });
    }
    const other = getAddress(withWallet);
    const threadKey = [me, other].sort().join(":");

    const { data, error } = await supabase
      .from("messages")
      .select("id, from_wallet, to_wallet, content, created_at")
      .eq("thread_key", threadKey)
      .eq("deleted_by_sender", false)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[TwoBlock] Failed to fetch thread messages:", error);
      return NextResponse.json({ error: "Failed to load conversation" }, { status: 500 });
    }
    return NextResponse.json({ messages: data ?? [] });
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_key, from_wallet, to_wallet, content, created_at")
    .or(`from_wallet.eq.${me},to_wallet.eq.${me}`)
    .eq("deleted_by_sender", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[TwoBlock] Failed to fetch thread list:", error);
    return NextResponse.json({ error: "Failed to load message list" }, { status: 500 });
  }

  const seen = new Set<string>();
  const rows: { otherWallet: string; lastMessage: string; lastMessageAt: string; lastMessageFromMe: boolean }[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.thread_key)) continue;
    seen.add(row.thread_key);
    const otherWallet = row.from_wallet === me ? row.to_wallet : row.from_wallet;
    rows.push({
      otherWallet,
      lastMessage: row.content,
      lastMessageAt: row.created_at,
      lastMessageFromMe: row.from_wallet === me,
    });
  }

  const otherWallets = rows.map((r) => r.otherWallet);
  const profileByWallet = new Map<
    string,
    { username: string | null; avatar_url: string | null; verification_tier: string }
  >();
  if (otherWallets.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("wallet_address, username, avatar_url, verification_tier")
      .in("wallet_address", otherWallets);
    for (const p of profiles ?? []) {
      profileByWallet.set(p.wallet_address, {
        username: p.username,
        avatar_url: p.avatar_url,
        verification_tier: p.verification_tier,
      });
    }
  }

  const threads = rows.map((r) => ({
    ...r,
    otherUsername: profileByWallet.get(r.otherWallet)?.username ?? null,
    otherAvatarUrl: profileByWallet.get(r.otherWallet)?.avatar_url ?? null,
    otherVerificationTier: profileByWallet.get(r.otherWallet)?.verification_tier ?? "free",
  }));

  return NextResponse.json({ threads });
}

export async function POST(req: NextRequest) {
  const { fromWallet, toWallet, content } = await req.json();

  if (!fromWallet || !isAddress(fromWallet) || !toWallet || !isAddress(toWallet)) {
    return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
  }
  const from = getAddress(fromWallet);
  const to = getAddress(toWallet);
  if (from === to) {
    return NextResponse.json({ error: "Can't send a message to yourself" }, { status: 400 });
  }
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }
  const trimmed = content.trim().slice(0, 2000);

  const supabase = createSupabaseServerClient();

  const { data: recipient } = await supabase
    .from("profiles")
    .select("wallet_address")
    .eq("wallet_address", to)
    .maybeSingle();
  if (!recipient) {
    return NextResponse.json({ error: "Recipient wallet isn't registered on TwoBlock" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({ from_wallet: from, to_wallet: to, content: trimmed })
    .select("id, from_wallet, to_wallet, content, created_at")
    .single();

  if (error) {
    console.error("[TwoBlock] Failed to send message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
