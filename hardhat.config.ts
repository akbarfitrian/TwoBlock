import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY ?? "";
const ARC_TESTNET_RPC = process.env.NEXT_PUBLIC_ARC_RPC_URL || "https://rpc.testnet.arc.network";
const ARC_MAINNET_RPC = process.env.ARC_MAINNET_RPC_URL || "https://rpc.arc.network";
const GIWA_SEPOLIA_RPC = process.env.NEXT_PUBLIC_GIWA_RPC_URL || "https://sepolia-rpc.giwa.io";

const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts/test",
    cache: "./contracts/cache",
    artifacts: "./contracts/artifacts",
  },
  networks: {
    arcTestnet: {
      url: ARC_TESTNET_RPC,
      chainId: 5042002,
      accounts,
    },
    arcMainnet: {
      url: ARC_MAINNET_RPC,
      chainId: 0, // TODO: fill in once Arc mainnet's chain ID is public
      accounts,
    },
    giwaSepolia: {
      url: GIWA_SEPOLIA_RPC,
      chainId: 91342,
      accounts,
    },
  },
};

export default config;
