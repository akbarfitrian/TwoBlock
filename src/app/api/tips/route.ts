import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createPublicClient, http, isAddress, isHash } from "viem";
import { activeArcChain } from "@/lib/arc/chain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { completeQuestOnce } from "@/lib/quests";

const publicClient = createPublicClient({
  chain: activeArcChain,
  transport: http(activeArcChain.rpcUrls.default.http[0]),
});

export async function POST(req: NextRequest) {
  const { fromWallet, toWallet, postId, amountUsdc, txRef } = await req.json();

  if (![fromWallet, toWallet].every((addr) => isAddress(addr)) || !isHash(txRef) || amountUsdc <= 0) {
    return NextResponse.json({ error: "Invalid tip payload" }, { status: 400 });
  }

  if (fromWallet.toLowerCase() === toWallet.toLowerCase()) {
    return NextResponse.json({ error: "You can't tip yourself" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();

  const { error: insertError } = await supabase
    .from("tips")
    .upsert(
      { from_wallet: fromWallet, to_wallet: toWallet, post_id: postId, amount_usdc: amountUsdc, tx_ref: txRef },
      { onConflict: "tx_ref", ignoreDuplicates: true }
    );

  if (insertError) {
    console.error("[TwoBlock] Failed to save tip:", insertError);
    return NextResponse.json({ error: `Failed to save tip: ${insertError.message}` }, { status: 500 });
  }

  await supabase.from("notifications").insert({
    recipient_wallet: toWallet,
    actor_wallet: fromWallet,
    type: "tip",
    post_id: postId,
  });

  await completeQuestOnce(supabase, fromWallet, "first_tip_sent");

  waitUntil(
    (async () => {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: txRef,
          timeout: 15_000,
        });
        await supabase
          .from("tips")
          .update({ tx_status: receipt.status === "success" ? "confirmed" : "failed" })
          .eq("tx_ref", txRef);
      } catch (err) {
        console.error(`[TwoBlock] Verifikasi tx ${txRef} gagal:`, err);
        await supabase.from("tips").update({ tx_status: "failed" }).eq("tx_ref", txRef);
      }
    })()
  );

  return NextResponse.json({ status: "pending", txRef });
}
