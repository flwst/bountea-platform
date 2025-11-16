import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

  // Deploy DEGU Token
  console.log("Deploying DEGU Token...");
  const initialSupply = 10_000_000; // 10 million DEGU
  const DeguToken = await ethers.getContractFactory("DeguToken");
  const deguToken = await DeguToken.deploy(initialSupply);
  await deguToken.waitForDeployment();

  const deguAddress = await deguToken.getAddress();
  console.log("✅ DEGU Token deployed to:", deguAddress);
  console.log("   Initial supply:", initialSupply, "DEGU");
  console.log("   Total supply:", ethers.formatEther(await deguToken.totalSupply()), "DEGU\n");

  // Deploy SimpleBetting
  console.log("Deploying SimpleBetting contract...");
  const SimpleBetting = await ethers.getContractFactory("SimpleBetting");
  const betting = await SimpleBetting.deploy();
  await betting.waitForDeployment();

  const bettingAddress = await betting.getAddress();
  console.log("✅ SimpleBetting deployed to:", bettingAddress);
  console.log("   Fee collector:", await betting.feeCollector());
  console.log("   Platform fee:", (await betting.platformFee()), "basis points (", (await betting.platformFee()) / 100, "%)\n");

  // Summary
  console.log("========== Deployment Summary ==========");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);
  console.log("\nDEGU Token:", deguAddress);
  console.log("SimpleBetting:", bettingAddress);
  console.log("\n========== Next Steps ==========");
  console.log("1. Update TOKEN_CONTRACTS in auth-manager.js with DEGU address:");
  console.log("   DEGU: '" + deguAddress + "'");
  console.log("\n2. Verify contracts on Etherscan (if on testnet/mainnet):");
  console.log("   npx hardhat verify --network <network> " + deguAddress + " " + initialSupply);
  console.log("   npx hardhat verify --network <network> " + bettingAddress);
  console.log("\n3. For Uniswap listing, see README.md");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
