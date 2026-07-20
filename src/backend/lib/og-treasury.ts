import type { Address } from "viem";
import { isAddress } from "viem";

export function getOGTreasuryWallet(): Address {
  const wallet = process.env.NEXT_PUBLIC_OG_TREASURY_WALLET;
  if (!wallet || !isAddress(wallet)) {
    throw new Error(
      "NEXT_PUBLIC_OG_TREASURY_WALLET is missing/invalid in .env.local — see .env.example."
    );
  }
  return wallet as Address;
}
