import { isAddress, getAddress } from "viem";
import { ProfilePage } from "@/frontend/components/ProfilePage";

export default function Profile({ params }: { params: { wallet: string } }) {

  const normalized = isAddress(params.wallet) ? getAddress(params.wallet) : params.wallet;
  return <ProfilePage walletAddress={normalized} />;
}
