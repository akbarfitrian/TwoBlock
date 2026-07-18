import { getAddress, isAddress, type Address } from "viem";
import type { VerificationTier } from "@/shared/types";
import type { Billing } from "@/frontend/hooks/useVerification";

export const twoBlockPaymentsAbi = [
  {
    type: "constructor",
    inputs: [{ name: "initialTreasury", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tip",
    inputs: [
      { name: "to", type: "address" },
      { name: "postId", type: "string" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "purchaseVerification",
    inputs: [
      { name: "tier", type: "uint8" },
      { name: "billing", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "withdraw",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "treasury",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pendingWithdrawals",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "Tipped",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "postId", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "VerificationPurchased",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
      { name: "tier", type: "uint8", indexed: false },
      { name: "billing", type: "uint8", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "TreasuryUpdated",
    inputs: [
      { name: "previousTreasury", type: "address", indexed: true },
      { name: "newTreasury", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "account", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export function getTwoBlockPaymentsAddress(): Address {
  const address = process.env.NEXT_PUBLIC_PAYMENTS_CONTRACT_ADDRESS;
  if (!address || !isAddress(address)) {
    throw new Error(
      "NEXT_PUBLIC_PAYMENTS_CONTRACT_ADDRESS is missing/invalid in .env.local — deploy contracts/TwoBlockPayments.sol " +
        "(see contracts/scripts/deploy.ts) and set the deployed address."
    );
  }
  return getAddress(address);
}

const TIER_TO_INDEX: Record<Exclude<VerificationTier, "free">, number> = {
  verified: 0,
  verified_pro: 1,
  verified_max: 2,
};

const INDEX_TO_TIER: Exclude<VerificationTier, "free">[] = ["verified", "verified_pro", "verified_max"];

const BILLING_TO_INDEX: Record<Billing, number> = {
  monthly: 0,
  yearly: 1,
};

const INDEX_TO_BILLING: Billing[] = ["monthly", "yearly"];

export function tierToIndex(tier: Exclude<VerificationTier, "free">): number {
  return TIER_TO_INDEX[tier];
}

export function indexToTier(index: number): Exclude<VerificationTier, "free"> {
  const tier = INDEX_TO_TIER[index];
  if (!tier) throw new Error(`Unknown on-chain tier index: ${index}`);
  return tier;
}

export function billingToIndex(billing: Billing): number {
  return BILLING_TO_INDEX[billing];
}

export function indexToBilling(index: number): Billing {
  const billing = INDEX_TO_BILLING[index];
  if (!billing) throw new Error(`Unknown on-chain billing index: ${index}`);
  return billing;
}
