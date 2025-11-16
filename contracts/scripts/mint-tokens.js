import hre from "hardhat";

const { ethers } = hre;

async function main() {
    // Get command line arguments or environment variables
    const args = process.argv.slice(2);

    let recipientAddress = process.env.MINT_ADDRESS || args[0];
    let amountInUSDC = process.env.MINT_AMOUNT ? parseFloat(process.env.MINT_AMOUNT) : (args[1] ? parseFloat(args[1]) : 10000);

    if (!recipientAddress) {
        console.error("\n❌ Error: Missing required arguments\n");
        console.log("Usage: npx hardhat run scripts/mint-tokens.js -- <recipient-address> [amount-in-usdc]\n");
        console.log("Example:");
        console.log("  npx hardhat run scripts/mint-tokens.js -- 0x1234...5678 1000");
        console.log("  (Mints 1000 USDC to address 0x1234...5678)\n");
        console.log("Or set environment variables:");
        console.log("  MINT_ADDRESS=0x1234...5678 MINT_AMOUNT=1000 npx hardhat run scripts/mint-tokens.js\n");
        console.log("If amount is not specified, defaults to 10,000 USDC\n");
        process.exit(1);
    }

    // Validate Ethereum address
    if (!ethers.isAddress(recipientAddress)) {
        console.error(`\n❌ Error: Invalid Ethereum address: ${recipientAddress}\n`);
        process.exit(1);
    }

    // Get token address from environment
    const tokenAddress = process.env.USDC_BASE_TESTNET;
    if (!tokenAddress) {
        console.error("\n❌ Error: USDC_BASE_TESTNET not found in .env file\n");
        console.log("Please ensure your .env file contains:");
        console.log("USDC_BASE_TESTNET=0xE02E0dEa9F850D88E1329550D9FC8D98aF541f55\n");
        process.exit(1);
    }

    console.log("\n========== Minting Test USDC Tokens ==========");

    const [signer] = await ethers.getSigners();
    console.log("Minting from account:", signer.address);

    const balance = await ethers.provider.getBalance(signer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId);
    console.log("\nToken Contract:", tokenAddress);
    console.log("Recipient:", recipientAddress);
    console.log("Amount:", amountInUSDC.toLocaleString(), "USDC\n");

    // Get MockERC20 contract instance
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = MockERC20.attach(tokenAddress);

    // Check current balance of recipient
    const currentBalance = await mockToken.balanceOf(recipientAddress);
    console.log("Current balance of recipient:", ethers.formatUnits(currentBalance, 6), "USDC");

    // Convert amount to proper decimals (6 for USDC)
    const mintAmount = ethers.parseUnits(amountInUSDC.toString(), 6);

    // Mint tokens
    console.log("\nMinting tokens...");
    const tx = await mockToken.mint(recipientAddress, mintAmount);
    console.log("Transaction hash:", tx.hash);

    const receipt = await tx.wait(1);
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Check new balance
    const newBalance = await mockToken.balanceOf(recipientAddress);
    console.log("\n✅ New balance of recipient:", ethers.formatUnits(newBalance, 6), "USDC");
    console.log("✅ Successfully minted", amountInUSDC.toLocaleString(), "USDC to", recipientAddress);

    console.log("\n========================================\n");

    // Show block explorer link if on Base Sepolia
    if (network.chainId === 84532n) {
        console.log("View transaction on BaseScan:");
        console.log(`https://sepolia.basescan.org/tx/${tx.hash}\n`);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
