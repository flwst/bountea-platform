const hre = require("hardhat");

/**
 * Deployment script for DeguTokenomics on PolkaVM
 *
 * This deploys the complete tokenomics system:
 * 1. DeguTokenomics - Token with distribution & vesting
 * 2. SimpleBettingWithTokenomics - Game contract with fees
 *
 * Usage:
 * npx hardhat run scripts/deploy-tokenomics-polkavm.js --network polkadotAssetHubTestnet
 */

async function main() {
  console.log("🚀 Deploying DeguTokenomics System to PolkaVM...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "PAS\n");

  // ===== Configuration =====
  console.log("⚙️  Configuration:");

  // Wallet addresses for token distribution
  const LIQUIDITY_WALLET = process.env.LIQUIDITY_WALLET || deployer.address;
  const TEAM_WALLET = process.env.TEAM_WALLET || deployer.address;
  const REWARDS_WALLET = process.env.REWARDS_WALLET || deployer.address;
  const TREASURY_WALLET = process.env.TREASURY_WALLET || deployer.address;

  console.log("  Liquidity Wallet:", LIQUIDITY_WALLET);
  console.log("  Team Wallet:", TEAM_WALLET);
  console.log("  Rewards Wallet:", REWARDS_WALLET);
  console.log("  Treasury Wallet:", TREASURY_WALLET);
  console.log("");

  // ===== Deploy DeguTokenomics =====
  console.log("📄 Deploying DeguTokenomics...");
  const DeguTokenomics = await hre.ethers.getContractFactory("DeguTokenomics");
  const deguToken = await DeguTokenomics.deploy(
    LIQUIDITY_WALLET,
    TEAM_WALLET,
    REWARDS_WALLET,
    TREASURY_WALLET,
    deployer.address
  );
  await deguToken.waitForDeployment();
  const deguTokenAddress = await deguToken.getAddress();

  console.log("✅ DeguTokenomics deployed to:", deguTokenAddress);
  console.log("");

  // Get token info
  const name = await deguToken.name();
  const symbol = await deguToken.symbol();
  const totalSupply = await deguToken.totalSupply();

  console.log("📊 Token Information:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Total Supply:", hre.ethers.formatEther(totalSupply), symbol);
  console.log("");

  // Get allocation status
  const allocation = await deguToken.getAllocationStatus();
  console.log("📦 Token Distribution:");
  console.log("  Liquidity Pool:", hre.ethers.formatEther(allocation.liquidityBalance), symbol);
  console.log("  Team Vested:", hre.ethers.formatEther(allocation.teamVested), symbol, "(vesting over 2 years, 6 month cliff)");
  console.log("  Rewards Vested:", hre.ethers.formatEther(allocation.rewardsVested), symbol, "(vesting over 2 years)");
  console.log("  Airdrop/Marketing:", hre.ethers.formatEther(await deguToken.balanceOf(deployer.address)), symbol);
  console.log("  Total Circulating:", hre.ethers.formatEther(allocation.totalCirculating), symbol);
  console.log("");

  // ===== Deploy SimpleBettingWithTokenomics =====
  console.log("📄 Deploying SimpleBettingWithTokenomics...");
  const SimpleBetting = await hre.ethers.getContractFactory("SimpleBettingWithTokenomics");
  const simpleBetting = await SimpleBetting.deploy(deguTokenAddress);
  await simpleBetting.waitForDeployment();
  const simpleBettingAddress = await simpleBetting.getAddress();

  console.log("✅ SimpleBettingWithTokenomics deployed to:", simpleBettingAddress);
  console.log("");

  // ===== Authorize Game Contract =====
  console.log("🔐 Authorizing game contract to collect fees...");
  const authTx = await deguToken.setGameAuthorization(simpleBettingAddress, true);
  await authTx.wait();
  console.log("✅ SimpleBetting authorized");
  console.log("");

  // ===== Summary =====
  console.log("📊 Deployment Summary:");
  console.log("=".repeat(60));
  console.log("Network:", hre.network.name);
  console.log("Deployer:", deployer.address);
  console.log("");
  console.log("DeguTokenomics:", deguTokenAddress);
  console.log("SimpleBettingWithTokenomics:", simpleBettingAddress);
  console.log("");
  console.log("Wallets:");
  console.log("  Liquidity:", LIQUIDITY_WALLET);
  console.log("  Team:", TEAM_WALLET);
  console.log("  Rewards:", REWARDS_WALLET);
  console.log("  Treasury:", TREASURY_WALLET);
  console.log("=".repeat(60));
  console.log("");

  // ===== Next Steps =====
  console.log("📝 Next Steps:");
  console.log("");
  console.log("1. 💧 ADD LIQUIDITY (40% allocated):");
  console.log(`   - ${hre.ethers.formatEther(allocation.liquidityBalance)} DEGU ready for liquidity`);
  console.log(`   - Pair with PAS on Uniswap V2`);
  console.log(`   - This sets the initial token price`);
  console.log("");
  console.log("2. 🎮 TEST THE SYSTEM:");
  console.log(`   - Create a game: simpleBetting.createGame(betAmount, minPlayers, maxPlayers)`);
  console.log(`   - Join game: simpleBetting.joinGame(gameId)`);
  console.log(`   - Select winners: simpleBetting.selectWinners(gameId, [winners])`);
  console.log(`   - Claim prize: simpleBetting.claimPrize(gameId)`);
  console.log("");
  console.log("3. ⏰ VESTING SCHEDULE:");
  console.log(`   - Team tokens: 6 month cliff, then linear over 2 years`);
  console.log(`   - Rewards tokens: Linear over 2 years, no cliff`);
  console.log(`   - Team can claim: deguToken.claimTeamTokens()`);
  console.log(`   - Rewards claim: deguToken.claimRewards(address, amount)`);
  console.log("");
  console.log("4. 🔥 DEFLATIONARY MECHANICS:");
  console.log(`   - Every game automatically: Burns 2%, Liquidity 2%, Treasury 1%`);
  console.log(`   - Supply decreases over time → Price pressure up`);
  console.log("");
  console.log("5. 🎁 AIRDROP/MARKETING:");
  console.log(`   - ${hre.ethers.formatEther(await deguToken.balanceOf(deployer.address))} DEGU available`);
  console.log(`   - Use for community rewards, airdrops, marketing`);
  console.log("");

  console.log("💡 To add liquidity, use:");
  console.log(`   - Edit add-liquidity-polkavm.js with token address`);
  console.log(`   - Run: npx hardhat run scripts/add-liquidity-polkavm.js --network ${hre.network.name}`);
  console.log("");

  console.log("✨ Deployment complete!");
  console.log("");
  console.log("🎯 Your tokenomics are live! Players must BUY to play. 🚀");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
