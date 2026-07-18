import { ethers, network } from "hardhat";

async function main() {
  const treasury = process.env.NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET;
  if (!treasury) {
    throw new Error(
      "Set NEXT_PUBLIC_VERIFICATION_TREASURY_WALLET in .env.local before deploying — " +
        "it's passed to the contract constructor as the initial treasury."
    );
  }

  console.log(`Deploying TwoBlockPayments to ${network.name} with treasury ${treasury} ...`);

  const factory = await ethers.getContractFactory("TwoBlockPayments");
  const contract = await factory.deploy(treasury);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`TwoBlockPayments deployed at: ${address}`);
  console.log("\nNext steps:");
  console.log(`  1. Set NEXT_PUBLIC_PAYMENTS_CONTRACT_ADDRESS=${address} in .env.local`);
  console.log("  2. Verify the contract on ArcScan (if a verifier plugin is configured)");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
