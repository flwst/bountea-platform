const hre = require("hardhat");

/**
 * Simple deployment script for DeguToken with free faucet
 *
 * Usage:
 * npx hardhat run scripts/deploy-simple.js --network localhost
 * npx hardhat run scripts/deploy-simple.js --network sepolia
 * npx hardhat run scripts/deploy-simple.js --network polkadotAssetHubTestnet
 */

async function main() {
  console.log("🚀 Deploying DeguToken with Free Faucet...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy DeguToken with initial supply
  console.log("📄 Deploying DeguToken...");
  const DeguToken = await hre.ethers.getContractFactory("DeguToken");

  // Initial supply: 10 million DEGU (owner can distribute or keep for rewards)
  const initialSupply = 10_000_000;
  const deguToken = await DeguToken.deploy(initialSupply);
  await deguToken.waitForDeployment();

  const tokenAddress = await deguToken.getAddress();
  console.log("✅ DeguToken deployed to:", tokenAddress);
  console.log("");

  // Get token info
  const name = await deguToken.name();
  const symbol = await deguToken.symbol();
  const totalSupply = await deguToken.totalSupply();
  const maxSupply = await deguToken.MAX_SUPPLY();
  const faucetAmount = await deguToken.FAUCET_AMOUNT();
  const faucetCooldown = await deguToken.FAUCET_COOLDOWN();

  console.log("📊 Token Information:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
  console.log("  Max Supply:", hre.ethers.formatEther(maxSupply), symbol);
  console.log("");

  console.log("🚰 Faucet Settings:");
  console.log("  Claim Amount:", hre.ethers.formatEther(faucetAmount), symbol);
  console.log("  Cooldown:", Number(faucetCooldown) / 3600, "hours");
  console.log("");

  // Check if can claim
  const [canClaim, timeUntilNext] = await deguToken.canClaimTokens(deployer.address);
  console.log("🔍 Deployer Claim Status:");
  console.log("  Can Claim:", canClaim);
  console.log("  Time Until Next:", Number(timeUntilNext), "seconds");
  console.log("");

  console.log("📊 Deployment Summary:");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("Token Address:", tokenAddress);
  console.log("=".repeat(60));
  console.log("");

  console.log("📝 How to Use:");
  console.log("");
  console.log("1. 🚰 CLAIM FREE TOKENS (anyone can call):");
  console.log("   - From frontend: deguToken.claimFreeTokens()");
  console.log("   - Gets 1000 DEGU per claim");
  console.log("   - Can claim once per hour");
  console.log("");
  console.log("2. ✅ CHECK IF CAN CLAIM:");
  console.log("   - const [canClaim, timeLeft] = await deguToken.canClaimTokens(userAddress)");
  console.log("");
  console.log("3. 🎮 USE IN GAME:");
  console.log("   - Players claim free tokens");
  console.log("   - Use tokens to join games (SimpleBetting contract)");
  console.log("   - Winners get losers' tokens");
  console.log("");
  console.log("4. 💸 TRANSFER/TRADE:");
  console.log("   - Standard ERC20: transfer(), approve(), transferFrom()");
  console.log("");

  console.log("✨ Deployment complete!");
  console.log("");
  console.log("🎯 Players can now get free DEGU tokens and start playing! 🚀");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
