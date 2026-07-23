import { ethers, network } from "hardhat";

/// Deploys the Giwa Sepolia payment stack:
///   1. USDC — a self-minted ERC-20 stand-in for USDC (Giwa's native
///      currency is ETH, and real USDC isn't officially integrated there
///      yet). Named/symboled "USDC" to match Arc's native USDC — see
///      contracts/USDC.sol.
///   2. TwoBlockPaymentsERC20 — the ERC-20 counterpart to
///      contracts/TwoBlockPayments.sol, pointed at the USDC address
///      above.
///
/// Run with: npm run contracts:deploy:giwa
async function main() {
  const treasury = process.env.NEXT_PUBLIC_OG_TREASURY_WALLET;
  if (!treasury) {
    throw new Error(
      "Set NEXT_PUBLIC_OG_TREASURY_WALLET in .env.local before deploying — " +
        "it's the same treasury address used on Arc, passed to the ERC20 " +
        "contract's constructor."
    );
  }

  if (network.name !== "giwaSepolia") {
    console.warn(
      `[warn] Running on network "${network.name}", not "giwaSepolia". ` +
        "Did you forget --network giwaSepolia?"
    );
  }

  // 6 decimals, matching real USDC's convention (see USDC.decimals()).
  const OG_PRICE = ethers.parseUnits("28", 6);

  console.log(`Deploying USDC to ${network.name} ...`);
  const usdcFactory = await ethers.getContractFactory("USDC");
  const usdc = await usdcFactory.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log(`USDC deployed at: ${usdcAddress}`);

  console.log(`Deploying TwoBlockPaymentsERC20 to ${network.name} with treasury ${treasury} ...`);
  const paymentsFactory = await ethers.getContractFactory("TwoBlockPaymentsERC20");
  const payments = await paymentsFactory.deploy(treasury, usdcAddress, OG_PRICE);
  await payments.waitForDeployment();
  const paymentsAddress = await payments.getAddress();
  console.log(`TwoBlockPaymentsERC20 deployed at: ${paymentsAddress}`);

  console.log("\nNext steps:");
  console.log(`  1. Set NEXT_PUBLIC_GIWA_USDC_TOKEN_ADDRESS=${usdcAddress} in .env.local`);
  console.log(`  2. Set NEXT_PUBLIC_GIWA_PAYMENTS_CONTRACT_ADDRESS=${paymentsAddress} in .env.local`);
  console.log("  3. Verify both contracts on the Giwa Sepolia explorer (if a verifier plugin is configured)");
  console.log("  4. Optionally call usdc.ownerMint(treasury, amount) to pre-fund the treasury for testing");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
