import { getAddress, isAddress, type Address } from "viem";

/// ABI for contracts/TwoBlockPaymentsERC20.sol — the ERC-20 counterpart to
/// two-block-payments.ts's ABI, used on chains whose native currency isn't
/// USDC (currently: Giwa Sepolia). Event shapes (`Tipped`, `OGPurchased`)
/// intentionally match the native contract so backend decoding logic can
/// share most of its structure between the two.
export const twoBlockPaymentsErc20Abi = [
  {
    type: "constructor",
    inputs: [
      { name: "initialTreasury", type: "address" },
      { name: "usdcTokenAddress", type: "address" },
      { name: "ogPrice", type: "uint256" },
    ],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "tip",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "postId", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "purchaseOG",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "usdcToken",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
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

/// Minimal ABI for contracts/USDC.sol (the self-deployed, Giwa-side USDC
/// ERC-20 — named/symboled "USDC" to match Arc's native USDC) — just what
/// the frontend needs: reading balance/decimals, approving the payments
/// contract, and calling the public faucet.
export const usdcAbi = [
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decimals",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "approve",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "faucet",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "faucetCooldownRemaining",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "FAUCET_AMOUNT",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

/// OG price on Giwa, in USDC base units (6 decimals) — mirrors the
/// value passed to TwoBlockPaymentsERC20's constructor in deploy-giwa.ts.
/// Kept in sync manually; if you change one, change both.
export const OG_PRICE_USDC_GIWA = 28;

export function getGiwaPaymentsAddress(): Address {
  const address = process.env.NEXT_PUBLIC_GIWA_PAYMENTS_CONTRACT_ADDRESS;
  if (!address || !isAddress(address)) {
    throw new Error(
      "NEXT_PUBLIC_GIWA_PAYMENTS_CONTRACT_ADDRESS is missing/invalid in .env.local — deploy " +
        "contracts/TwoBlockPaymentsERC20.sol (see contracts/scripts/deploy-giwa.ts) and set the deployed address."
    );
  }
  return getAddress(address);
}
