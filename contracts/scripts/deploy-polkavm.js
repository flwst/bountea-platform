const hre = require("hardhat");

/**
 * Deployment script for PolkaVM (Polkadot Asset Hub)
 *
 * This script deploys:
 * 1. DeguTokenPolkaVM - ERC20 token
 * 2. LiquidityManager - Helper contract for managing Uniswap V2 liquidity
 *
 * Usage:
 * npx hardhat run scripts/deploy-polkavm.js --network polkadotAssetHubTestnet
 */

async function main() {
  console.log("🚀 Starting PolkaVM deployment...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);

  // Get balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "PAS\n");

  // ===== Deploy DeguTokenPolkaVM =====
  console.log("📄 Deploying DeguTokenPolkaVM...");
  const DeguTokenPolkaVM = await hre.ethers.getContractFactory("DeguTokenPolkaVM");
  const deguToken = await DeguTokenPolkaVM.deploy(deployer.address);
  await deguToken.waitForDeployment();
  const deguTokenAddress = await deguToken.getAddress();

  console.log("✅ DeguTokenPolkaVM deployed to:", deguTokenAddress);

  // Get token info
  const name = await deguToken.name();
  const symbol = await deguToken.symbol();
  const decimals = await deguToken.decimals();
  const maxSupply = await deguToken.MAX_SUPPLY();

  console.log("   Name:", name);
  console.log("   Symbol:", symbol);
  console.log("   Decimals:", decimals.toString());
  console.log("   Max Supply:", hre.ethers.formatEther(maxSupply), symbol);
  console.log("");

  // ===== Deploy LiquidityManager =====
  // Uniswap V2 Router address on PolkaVM testnet (replace with actual address)
  // NOTE: You need to deploy Uniswap V2 first or use an existing deployment
  const UNISWAP_V2_ROUTER = process.env.UNISWAP_V2_ROUTER_POLKAVM || "0x0000000000000000000000000000000000000000";

  if (UNISWAP_V2_ROUTER === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Warning: UNISWAP_V2_ROUTER_POLKAVM not set in .env");
    console.log("⚠️  Skipping LiquidityManager deployment");
    console.log("⚠️  Deploy Uniswap V2 first, then set UNISWAP_V2_ROUTER_POLKAVM and redeploy\n");
  } else {
    console.log("📄 Deploying LiquidityManager...");
    const LiquidityManager = await hre.ethers.getContractFactory("LiquidityManager");
    const liquidityManager = await LiquidityManager.deploy(UNISWAP_V2_ROUTER, deployer.address);
    await liquidityManager.waitForDeployment();
    const liquidityManagerAddress = await liquidityManager.getAddress();

    console.log("✅ LiquidityManager deployed to:", liquidityManagerAddress);
    console.log("   Router:", UNISWAP_V2_ROUTER);
    console.log("");
  }

  // ===== Summary =====
  console.log("📊 Deployment Summary:");
  console.log("=".repeat(50));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("DeguTokenPolkaVM:", deguTokenAddress);

  if (UNISWAP_V2_ROUTER !== "0x0000000000000000000000000000000000000000") {
    const liquidityManagerAddress = await (await hre.ethers.getContractFactory("LiquidityManager")).attach(UNISWAP_V2_ROUTER).getAddress();
    console.log("LiquidityManager:", liquidityManagerAddress);
  }

  console.log("=".repeat(50));
  console.log("");

  // ===== Next Steps =====
  console.log("📝 Next Steps:");
  console.log("1. Save these contract addresses");
  console.log("2. Verify contracts on block explorer (if supported)");
  console.log("3. Mint initial token supply: deguToken.mint(address, amount)");
  console.log("4. Deploy or connect to Uniswap V2 Router");
  console.log("5. Add liquidity to create trading pair");
  console.log("");

  console.log("💡 To add liquidity:");
  console.log(`   - Approve LiquidityManager to spend your tokens`);
  console.log(`   - Call liquidityManager.addLiquidityPAS() with tokens and PAS`);
  console.log("");

  console.log("✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
