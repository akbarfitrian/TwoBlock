import { getAddress, isAddress, type Address } from "viem";

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
    name: "purchaseOG",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "OG_PRICE",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isOG",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
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
      { name: "fee", type: "uint256", indexed: false },
      { name: "postId", type: "string", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "OGPurchased",
    inputs: [
      { name: "wallet", type: "address", indexed: true },
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

/// Fixed lifetime price of OG membership, in USDC — mirrors the contract's
/// OG_PRICE constant. Kept here too so the frontend can show/validate the
/// price without an extra RPC call.
export const OG_PRICE_USDC = 28;

/// Tip platform-fee rates, in basis points (100 bps = 1%) — mirror the
/// contract's FREE_TIP_FEE_BPS / OG_TIP_FEE_BPS constants exactly. Kept here
/// too so the frontend can show the fee before the sender signs, without an
/// extra RPC call. If you ever change the fee, change it in
/// TwoBlockPayments.sol, redeploy, and update these to match.
export const FREE_TIP_FEE_BPS = 500; // 5%
export const OG_TIP_FEE_BPS = 200; // 2%
const BPS_DENOMINATOR = 10_000;

/// Basis points for a tip sent by a wallet with the given OG status.
export function getTipFeeBps(isOg: boolean): number {
  return isOg ? OG_TIP_FEE_BPS : FREE_TIP_FEE_BPS;
}

/// Splits a gross tip amount (what the sender pays) into { fee, net }
/// USDC amounts using the same integer basis-point math as the contract.
/// `amountUsdc` should be the human-readable USDC amount (e.g. 1.5).
export function splitTipAmount(amountUsdc: number, isOg: boolean) {
  const feeBps = getTipFeeBps(isOg);
  const fee = Math.round(amountUsdc * feeBps) / BPS_DENOMINATOR;
  const net = amountUsdc - fee;
  return { feeBps, fee, net };
}

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
