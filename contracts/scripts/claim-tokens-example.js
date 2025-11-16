const hre = require("hardhat");

/**
 * Example script showing how to claim free tokens from the faucet
 *
 * Usage:
 * 1. Deploy token first: npx hardhat run scripts/deploy-simple.js --network localhost
 * 2. Update TOKEN_ADDRESS below with your deployed address
 * 3. Run: npx hardhat run scripts/claim-tokens-example.js --network localhost
 */

async function main() {
  // ⚠️ UPDATE THIS with your deployed token address
  const TOKEN_ADDRESS = "0x..."; // Change this!

  if (TOKEN_ADDRESS === "0x...") {
    console.error("❌ Please update TOKEN_ADDRESS in this script first!");
    process.exit(1);
  }

  console.log("🚰 Claiming Free Tokens Example\n");

  const [user] = await hre.ethers.getSigners();
  console.log("👤 User:", user.address);

  // Get token contract
  const deguToken = await hre.ethers.getContractAt("DeguToken", TOKEN_ADDRESS);

  // Check current balance
  const balanceBefore = await deguToken.balanceOf(user.address);
  console.log("💰 Balance Before:", hre.ethers.formatEther(balanceBefore), "DEGU\n");

  // Check if can claim
  const [canClaim, timeUntilNext] = await deguToken.canClaimTokens(user.address);
  console.log("🔍 Claim Status:");
  console.log("  Can Claim:", canClaim);
  console.log("  Time Until Next:", Number(timeUntilNext), "seconds");
  console.log("");

  if (!canClaim) {
    console.log("⏰ You must wait", Number(timeUntilNext), "seconds before claiming again");
    return;
  }

  // Claim tokens!
  console.log("🎁 Claiming tokens...");
  const tx = await deguToken.claimFreeTokens();
  console.log("⏳ Transaction sent:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Transaction confirmed!");
  console.log("");

  // Check new balance
  const balanceAfter = await deguToken.balanceOf(user.address);
  const claimed = balanceAfter - balanceBefore;

  console.log("📊 Results:");
  console.log("  Balance After:", hre.ethers.formatEther(balanceAfter), "DEGU");
  console.log("  Claimed:", hre.ethers.formatEther(claimed), "DEGU");
  console.log("");

  console.log("✨ Success! You now have free DEGU tokens to play games! 🎮");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
