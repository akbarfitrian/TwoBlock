import type { Address } from "viem";
import { isAddress } from "viem";

/**
 * @deprecated The frontend no longer sends payments directly to this wallet.
 * Verification purchases now go through `purchaseVerification()` on the
 * TwoBlockPayments contract (see src/lib/contracts/twoBlockPayments.ts),
 * which forwards funds to whichever treasury address the contract's
 * `treasury()` view currently points at — that's the source of truth.
 *
 * NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET is now only used at contract
 * *deploy time* (contracts/scripts/deploy.ts), as the constructor argument
 * for the contract's initial treasury. It's kept here in case any
 * server-side/admin code still wants to read it directly.
 */
export function getVerificationTreasuryWallet(): Address {
  const wallet = process.env.NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET;
  if (!wallet || !isAddress(wallet)) {
    throw new Error(
      "NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET is missing/invalid in .env.local — see .env.example."
    );
  }
  return wallet as Address;
}
