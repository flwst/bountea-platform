const hre = require("hardhat");

/**
 * Script to add liquidity to Uniswap V2 on PolkaVM
 *
 * This script helps you add liquidity for your DEGU token paired with PAS (native token)
 *
 * Usage:
 * 1. Set environment variables in .env:
 *    - DEGU_TOKEN_ADDRESS=<your deployed token address>
 *    - LIQUIDITY_MANAGER_ADDRESS=<your liquidity manager address>
 * 2. Run: npx hardhat run scripts/add-liquidity-polkavm.js --network polkadotAssetHubTestnet
 */

async function main() {
  console.log("💧 Adding liquidity to Uniswap V2 on PolkaVM...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("Account:", deployer.address);

  // Get contract addresses from environment
  const DEGU_TOKEN_ADDRESS = process.env.DEGU_TOKEN_ADDRESS;
  const LIQUIDITY_MANAGER_ADDRESS = process.env.LIQUIDITY_MANAGER_ADDRESS;

  if (!DEGU_TOKEN_ADDRESS || !LIQUIDITY_MANAGER_ADDRESS) {
    console.error("❌ Error: Set DEGU_TOKEN_ADDRESS and LIQUIDITY_MANAGER_ADDRESS in .env");
    process.exit(1);
  }

  // Configuration - adjust these values
  const DEGU_AMOUNT = hre.ethers.parseEther("10000"); // 10,000 DEGU
  const PAS_AMOUNT = hre.ethers.parseEther("1"); // 1 PAS
  const SLIPPAGE_PERCENT = 5; // 5% slippage tolerance

  // Calculate minimum amounts (with slippage)
  const DEGU_MIN = (DEGU_AMOUNT * BigInt(100 - SLIPPAGE_PERCENT)) / BigInt(100);
  const PAS_MIN = (PAS_AMOUNT * BigInt(100 - SLIPPAGE_PERCENT)) / BigInt(100);

  // Deadline: 20 minutes from now
  const DEADLINE = Math.floor(Date.now() / 1000) + 20 * 60;

  console.log("Configuration:");
  console.log("  DEGU Amount:", hre.ethers.formatEther(DEGU_AMOUNT), "DEGU");
  console.log("  PAS Amount:", hre.ethers.formatEther(PAS_AMOUNT), "PAS");
  console.log("  Slippage:", SLIPPAGE_PERCENT + "%");
  console.log("");

  // Get contracts
  const deguToken = await hre.ethers.getContractAt("DeguTokenPolkaVM", DEGU_TOKEN_ADDRESS);
  const liquidityManager = await hre.ethers.getContractAt("LiquidityManager", LIQUIDITY_MANAGER_ADDRESS);

  // Check balances
  const deguBalance = await deguToken.balanceOf(deployer.address);
  const pasBalance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Balances:");
  console.log("  DEGU:", hre.ethers.formatEther(deguBalance));
  console.log("  PAS:", hre.ethers.formatEther(pasBalance));
  console.log("");

  // Verify sufficient balance
  if (deguBalance < DEGU_AMOUNT) {
    console.error("❌ Insufficient DEGU balance!");
    console.error("   Required:", hre.ethers.formatEther(DEGU_AMOUNT));
    console.error("   Available:", hre.ethers.formatEther(deguBalance));
    process.exit(1);
  }

  if (pasBalance < PAS_AMOUNT) {
    console.error("❌ Insufficient PAS balance!");
    console.error("   Required:", hre.ethers.formatEther(PAS_AMOUNT));
    console.error("   Available:", hre.ethers.formatEther(pasBalance));
    process.exit(1);
  }

  // Check if pair exists
  const pairAddress = await liquidityManager.getPair(DEGU_TOKEN_ADDRESS, await liquidityManager.router().then(r => hre.ethers.getContractAt("IUniswapV2Router02", r)).then(r => r.WETH()));

  if (pairAddress === hre.ethers.ZeroAddress) {
    console.log("ℹ️  Trading pair doesn't exist yet - it will be created when adding liquidity");
  } else {
    console.log("✅ Trading pair exists:", pairAddress);
  }
  console.log("");

  // Step 1: Approve LiquidityManager to spend DEGU tokens
  console.log("📝 Step 1: Approving LiquidityManager to spend DEGU...");
  const approveTx = await deguToken.approve(LIQUIDITY_MANAGER_ADDRESS, DEGU_AMOUNT);
  await approveTx.wait();
  console.log("✅ Approval confirmed");
  console.log("");

  // Step 2: Add liquidity
  console.log("📝 Step 2: Adding liquidity...");
  console.log("   This will create a DEGU/PAS trading pair");

  try {
    const addLiquidityTx = await liquidityManager.addLiquidityPAS(
      DEGU_TOKEN_ADDRESS,
      DEGU_AMOUNT,
      DEGU_MIN,
      PAS_MIN,
      DEADLINE,
      { value: PAS_AMOUNT }
    );

    console.log("   Transaction sent:", addLiquidityTx.hash);
    console.log("   Waiting for confirmation...");

    const receipt = await addLiquidityTx.wait();
    console.log("✅ Liquidity added successfully!");
    console.log("   Block:", receipt.blockNumber);
    console.log("");

    // Get final pair address
    const finalPairAddress = await liquidityManager.getPair(
      DEGU_TOKEN_ADDRESS,
      await liquidityManager.router().then(r => hre.ethers.getContractAt("IUniswapV2Router02", r)).then(r => r.WETH())
    );

    console.log("🎉 Trading is now live!");
    console.log("   Pair Address:", finalPairAddress);
    console.log("");

    // Get pair info
    const pair = await hre.ethers.getContractAt("IUniswapV2Pair", finalPairAddress);
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    console.log("📊 Pair Reserves:");
    if (token0.toLowerCase() === DEGU_TOKEN_ADDRESS.toLowerCase()) {
      console.log("   DEGU:", hre.ethers.formatEther(reserves[0]));
      console.log("   PAS:", hre.ethers.formatEther(reserves[1]));
    } else {
      console.log("   PAS:", hre.ethers.formatEther(reserves[0]));
      console.log("   DEGU:", hre.ethers.formatEther(reserves[1]));
    }
    console.log("");

    console.log("💡 Your token can now be traded on Uniswap V2!");
    console.log("   Share this pair address with traders:", finalPairAddress);

  } catch (error) {
    console.error("❌ Failed to add liquidity:", error.message);
    process.exit(1);
  }

  console.log("✨ Done!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
