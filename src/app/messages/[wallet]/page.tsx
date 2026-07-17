import { isAddress, getAddress } from "viem";
import { ConversationPage } from "@/components/MessagesPage";

export default function ConversationRoute({ params }: { params: { wallet: string } }) {
  const normalized = isAddress(params.wallet) ? getAddress(params.wallet) : params.wallet;
  return <ConversationPage walletAddress={normalized} />;
}
