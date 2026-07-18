import { defineChain, type Chain } from "viem";

const PUBLIC_ARC_TESTNET_RPC = "https://rpc.testnet.arc.network";

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

export const activeArcChain: Chain =
  TWOBLOCK_NETWORK === "mainnet" ? arcMainnet : arcTestnet;
