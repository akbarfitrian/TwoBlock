import type { Address } from "viem";
import { CHAIN_REGISTRY, DEFAULT_CHAIN_KEY, type TwoBlockChainConfig, type TwoBlockChainKey } from "@/shared/chain";
import { getTwoBlockPaymentsAddress } from "@/shared/contracts/two-block-payments";
import { getGiwaPaymentsAddress } from "@/shared/contracts/two-block-payments-erc20";

export interface ResolvedChain {
  chainKey: TwoBlockChainKey;
  config: TwoBlockChainConfig;
  paymentsContractAddress: Address;
}

/// Validates a client-submitted `chainId` against the chain registry and
/// resolves which payments contract a tip/OG-purchase tx should be verified
/// against. Missing/empty chainId defaults to Arc — mirrors the
/// `DEFAULT 'arc'` fallback added for existing rows in
/// 0019_multichain_support.sql, so older clients (predating the network
/// selector) keep working unchanged.
///
/// An unrecognized non-empty value throws rather than silently falling back
/// to Arc, since that's more likely a bug or a tampered request than a
/// legitimately old client.
export function resolveChain(rawChainId: unknown): ResolvedChain {
  let chainKey: TwoBlockChainKey;

  if (rawChainId === undefined || rawChainId === null || rawChainId === "") {
    chainKey = DEFAULT_CHAIN_KEY;
  } else if (typeof rawChainId === "string" && rawChainId in CHAIN_REGISTRY) {
    chainKey = rawChainId as TwoBlockChainKey;
  } else {
    throw new Error(`Unknown chainId: ${String(rawChainId)}`);
  }

  const config = CHAIN_REGISTRY[chainKey];
  const paymentsContractAddress =
    config.paymentMode === "erc20" ? getGiwaPaymentsAddress() : getTwoBlockPaymentsAddress();

  return { chainKey, config, paymentsContractAddress };
}
