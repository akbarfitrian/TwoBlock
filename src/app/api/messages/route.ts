import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { createSupabaseServerClient } from "@/backend/lib/supabase-server";

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

    const { error: readError } = await supabase
      .from("message_reads")
      .upsert(
        { wallet_address: me, thread_key: threadKey, last_read_at: new Date().toISOString() },
        { onConflict: "wallet_address,thread_key" }
      );
    if (readError) {
      console.error("[TwoBlock] Failed to mark thread as read:", readError);
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
  const rows: {
    threadKey: string;
    otherWallet: string;
    lastMessage: string;
    lastMessageAt: string;
    lastMessageFromMe: boolean;
  }[] = [];
  for (const row of data ?? []) {
    if (seen.has(row.thread_key)) continue;
    seen.add(row.thread_key);
    const otherWallet = row.from_wallet === me ? row.to_wallet : row.from_wallet;
    rows.push({
      threadKey: row.thread_key,
      otherWallet,
      lastMessage: row.content,
      lastMessageAt: row.created_at,
      lastMessageFromMe: row.from_wallet === me,
    });
  }

  const { data: reads } = await supabase
    .from("message_reads")
    .select("thread_key, last_read_at")
    .eq("wallet_address", me);
  const lastReadByThread = new Map<string, string>();
  for (const r of reads ?? []) {
    lastReadByThread.set(r.thread_key, r.last_read_at);
  }

  const otherWallets = rows.map((r) => r.otherWallet);
  const profileByWallet = new Map<
    string,
    { username: string | null; avatar_url: string | null; is_og: boolean; total_points: number }
  >();
  if (otherWallets.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("wallet_address, username, avatar_url, is_og, total_points")
      .in("wallet_address", otherWallets);
    for (const p of profiles ?? []) {
      profileByWallet.set(p.wallet_address, {
        username: p.username,
        avatar_url: p.avatar_url,
        is_og: p.is_og,
        total_points: p.total_points,
      });
    }
  }

  const threads = rows.map((r) => {
    const lastReadAt = lastReadByThread.get(r.threadKey);
    const unread = !r.lastMessageFromMe && (!lastReadAt || new Date(r.lastMessageAt) > new Date(lastReadAt));
    return {
      otherWallet: r.otherWallet,
      lastMessage: r.lastMessage,
      lastMessageAt: r.lastMessageAt,
      lastMessageFromMe: r.lastMessageFromMe,
      unread,
      otherUsername: profileByWallet.get(r.otherWallet)?.username ?? null,
      otherAvatarUrl: profileByWallet.get(r.otherWallet)?.avatar_url ?? null,
      otherIsOg: profileByWallet.get(r.otherWallet)?.is_og ?? false,
      otherTotalPoints: profileByWallet.get(r.otherWallet)?.total_points ?? 0,
    };
  });

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
