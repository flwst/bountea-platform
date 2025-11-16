import hre from "hardhat";
import pkg from 'pg';
const { Client } = pkg;

const { ethers } = hre;

async function main() {
    console.log("\n========== Minting Tokens to All Database Users ==========\n");

    // Get amount from command line or use default
    const args = process.argv.slice(2);
    const amountPerUser = args[0] ? parseFloat(args[0]) : 10000; // Default 10,000 USDC per user

    console.log(`Amount per user: ${amountPerUser.toLocaleString()} USDC\n`);

    // Get deployer signer
    const [signer] = await ethers.getSigners();
    console.log("Minting from account:", signer.address);

    const balance = await ethers.provider.getBalance(signer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId, "\n");

    // Get token address from environment
    const tokenAddress = process.env.USDC_BASE_TESTNET;
    if (!tokenAddress) {
        console.error("❌ Error: USDC_BASE_TESTNET not found in .env file\n");
        process.exit(1);
    }

    console.log("Token Contract:", tokenAddress, "\n");

    // Connect to database (using MongoDB connection string from API .env)
    // Note: The API uses MongoDB, not PostgreSQL
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("❌ Error: MONGODB_URI not found in .env file");
        console.error("Please ensure the API's MONGODB_URI is accessible");
        console.error("You may need to temporarily add it to contracts/.env\n");
        process.exit(1);
    }

    console.log("Connecting to MongoDB...");

    // Import MongoDB client
    let MongoClient;
    try {
        const mongodb = await import('mongodb');
        MongoClient = mongodb.MongoClient;
    } catch (error) {
        console.error("❌ Error: mongodb package not installed");
        console.error("Run: cd packages/contracts && npm install mongodb\n");
        process.exit(1);
    }

    const mongoClient = new MongoClient(mongoUri);

    try {
        await mongoClient.connect();
        console.log("✅ Connected to MongoDB\n");

        const db = mongoClient.db();
        const usersCollection = db.collection('users');

        // Fetch all users with wallet addresses
        const users = await usersCollection
            .find({ walletAddress: { $exists: true, $ne: null } })
            .toArray();

        console.log(`Found ${users.length} users with wallet addresses\n`);

        if (users.length === 0) {
            console.log("No users with wallet addresses found. Exiting.\n");
            await mongoClient.close();
            return;
        }

        // Get unique wallet addresses
        const walletAddresses = [...new Set(
            users
                .map(u => u.walletAddress)
                .filter(addr => addr && ethers.isAddress(addr))
        )];

        console.log(`${walletAddresses.length} unique valid wallet addresses found\n`);

        if (walletAddresses.length === 0) {
            console.log("No valid Ethereum addresses found. Exiting.\n");
            await mongoClient.close();
            return;
        }

        // Display all addresses
        console.log("Addresses to receive tokens:");
        walletAddresses.forEach((addr, i) => {
            console.log(`  ${i + 1}. ${addr}`);
        });
        console.log("");

        // Get MockERC20 contract instance
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = MockERC20.attach(tokenAddress);

        // Mint amount with 6 decimals (USDC)
        const mintAmount = ethers.parseUnits(amountPerUser.toString(), 6);

        console.log("Starting minting process...\n");
        console.log("========================================\n");

        let successCount = 0;
        let failCount = 0;

        // Mint to each address
        for (let i = 0; i < walletAddresses.length; i++) {
            const address = walletAddresses[i];
            console.log(`[${i + 1}/${walletAddresses.length}] Minting to ${address}...`);

            try {
                // Check current balance
                const currentBalance = await mockToken.balanceOf(address);
                console.log(`  Current balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);

                // Mint tokens
                const tx = await mockToken.mint(address, mintAmount);
                console.log(`  Transaction: ${tx.hash}`);

                const receipt = await tx.wait(1);
                console.log(`  ✅ Confirmed in block ${receipt.blockNumber}`);
                console.log(`  Gas used: ${receipt.gasUsed.toString()}`);

                // Check new balance
                const newBalance = await mockToken.balanceOf(address);
                console.log(`  New balance: ${ethers.formatUnits(newBalance, 6)} USDC`);
                console.log("");

                successCount++;
            } catch (error) {
                console.log(`  ❌ Failed: ${error.message}`);
                console.log("");
                failCount++;
            }
        }

        console.log("========================================\n");
        console.log("Minting Summary:");
        console.log(`  Total addresses: ${walletAddresses.length}`);
        console.log(`  Successful: ${successCount}`);
        console.log(`  Failed: ${failCount}`);
        console.log(`  Amount per user: ${amountPerUser.toLocaleString()} USDC`);
        console.log(`  Total minted: ${(successCount * amountPerUser).toLocaleString()} USDC\n`);

        // Close MongoDB connection
        await mongoClient.close();
        console.log("✅ Database connection closed\n");

        if (network.chainId === 84532n) {
            console.log("View transactions on BaseScan:");
            console.log(`https://sepolia.basescan.org/token/${tokenAddress}\n`);
        }

    } catch (error) {
        console.error("❌ Error:", error);
        await mongoClient.close();
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("\n❌ Error:", error.message);
        process.exit(1);
    });
