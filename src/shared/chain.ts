import { defineChain, getAddress, isAddress, type Address, type Chain } from "viem";

const PUBLIC_ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";
const PUBLIC_GIWA_SEPOLIA_RPC = "https://sepolia-rpc.giwa.io";

export const arcTestnetRpcUrls: string[] = [
  process.env.NEXT_PUBLIC_ARC_RPC_URL,
  PUBLIC_ARC_TESTNET_RPC,
].filter((url): url is string => Boolean(url));

export const arcTestnet: Chain = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: arcTestnetRpcUrls },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

export const arcMainnet: Chain = defineChain({
  id: 0,
  name: "Arc",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ["https://rpc.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://arcscan.app" },
  },
  testnet: false,
});

export const TWOBLOCK_NETWORK: "testnet" | "mainnet" =
  (process.env.NEXT_PUBLIC_ARC_NETWORK as "testnet" | "mainnet") ?? "testnet";

/// Kept for backward compatibility with existing single-chain call sites
/// (useOG.ts, send-tip.ts, useWalletBalance.ts, etc.) while those are
/// migrated to the multi-chain registry below (see chain-registry.ts /
/// useActiveChain, added in a later phase). Do not add new call sites
/// against this — use getChainConfig("arc") or the active-chain hook
/// instead once the frontend migration lands.
export const activeArcChain: Chain =
  TWOBLOCK_NETWORK === "mainnet" ? arcMainnet : arcTestnet;

// ---------------------------------------------------------------------------
// Giwa Sepolia
// ---------------------------------------------------------------------------

export const giwaSepoliaRpcUrls: string[] = [
  process.env.NEXT_PUBLIC_GIWA_RPC_URL,
  PUBLIC_GIWA_SEPOLIA_RPC,
].filter((url): url is string => Boolean(url));

export const giwaSepolia: Chain = defineChain({
  id: 91342,
  name: "Giwa Sepolia",
  nativeCurrency: {
    // Giwa's native gas token is ETH, unlike Arc where the native token
    // IS USDC. USDC on Giwa is a separately-deployed ERC-20 (USDC) —
    // see paymentMode/usdcToken below.
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: { http: giwaSepoliaRpcUrls },
  },
  blockExplorers: {
    default: { name: "Giwa Sepolia Explorer", url: "https://sepolia-explorer.giwa.io" },
  },
  testnet: true,
});

// ---------------------------------------------------------------------------
// Multi-chain registry
//
// Arc pays with its native currency directly (USDC IS the gas token).
// Giwa's native currency is ETH, so TwoBlock's USDC there is a normal
// ERC-20 (self-deployed for testnet purposes, named/symboled "USDC" to
// match Arc — see contracts/USDC.sol) moved via approve()/transferFrom()
// through TwoBlockPaymentsERC20.sol instead of TwoBlockPayments.sol's
// payable functions. `paymentMode` is what the rest of the app branches
// on to decide which flow (and which contract/ABI) to use.
// ---------------------------------------------------------------------------

export type TwoBlockChainKey = "arc" | "giwaSepolia";

export type PaymentMode = "native" | "erc20";

export interface TwoBlockChainConfig {
  key: TwoBlockChainKey;
  chain: Chain;
  paymentMode: PaymentMode;
  /// Human-readable USDC decimals used for display + parseUnits/formatUnits
  /// on this chain. Arc treats native USDC as 18 decimals (matching its
  /// native currency); Giwa's USDC is a standard 6-decimal ERC-20,
  /// matching real USDC's convention.
  usdcDecimals: number;
}

export const CHAIN_REGISTRY: Record<TwoBlockChainKey, TwoBlockChainConfig> = {
  arc: {
    key: "arc",
    chain: activeArcChain,
    paymentMode: "native",
    usdcDecimals: 18,
  },
  giwaSepolia: {
    key: "giwaSepolia",
    chain: giwaSepolia,
    paymentMode: "erc20",
    usdcDecimals: 6,
  },
};

export const DEFAULT_CHAIN_KEY: TwoBlockChainKey = "arc";

export function getChainConfig(key: TwoBlockChainKey): TwoBlockChainConfig {
  return CHAIN_REGISTRY[key];
}

export function getChainKeyByChainId(chainId: number): TwoBlockChainKey | undefined {
  return (Object.values(CHAIN_REGISTRY).find((c) => c.chain.id === chainId) as
    | TwoBlockChainConfig
    | undefined)?.key;
}

/// Deployed USDC token address on Giwa Sepolia. Only relevant for
/// chains with paymentMode "erc20" — Arc has no equivalent since USDC is
/// its native currency there.
export function getGiwaUsdcTokenAddress(): Address {
  const address = process.env.NEXT_PUBLIC_GIWA_USDC_TOKEN_ADDRESS;
  if (!address || !isAddress(address)) {
    throw new Error(
      "NEXT_PUBLIC_GIWA_USDC_TOKEN_ADDRESS is missing/invalid in .env.local — deploy contracts/USDC.sol " +
        "(see contracts/scripts/deploy-giwa.ts) and set the deployed address."
    );
  }
  return getAddress(address);
}
