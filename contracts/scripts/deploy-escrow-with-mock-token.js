import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
    console.log("Starting deployment with Mock USDC token for testing...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId, "\n");

    // Deploy MockERC20 (USDC for testing)
    console.log("Deploying MockERC20 (Test USDC)...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test USDC", "USDC", 6); // 6 decimals like real USDC
    await mockToken.waitForDeployment();

    const mockTokenAddress = await mockToken.getAddress();
    console.log("✅ MockERC20 (Test USDC) deployed to:", mockTokenAddress);

    // Mint tokens to deployer for testing
    const mintAmount = ethers.parseUnits("100000", 6); // 100,000 USDC
    const mintTx = await mockToken.mint(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted 100,000 Test USDC to deployer\n");

    // Deploy GameEscrow
    console.log("Deploying GameEscrow contract...");
    const GameEscrow = await ethers.getContractFactory("GameEscrow");

    // Constructor parameters: admin, oracle, maxTVLLimit
    const tvlLimit = ethers.parseUnits("1000000", 6); // 1 million USDC (with 6 decimals)
    const gameEscrow = await GameEscrow.deploy(
        deployer.address, // admin
        deployer.address, // oracle (same as admin for now)
        tvlLimit          // max TVL limit
    );
    await gameEscrow.waitForDeployment();

    const gameEscrowAddress = await gameEscrow.getAddress();
    console.log("✅ GameEscrow deployed to:", gameEscrowAddress);
    console.log("✅ All roles granted to deployer:", deployer.address);
    console.log("✅ TVL limit set to: 1,000,000 USDC\n");

    // Add mock USDC as allowed token
    console.log("Adding Test USDC as allowed token...");
    const tokenLimit = ethers.parseUnits("1000000", 6); // 1 million USDC max
    const addTokenTx = await gameEscrow.addAllowedToken(mockTokenAddress, tokenLimit);
    await addTokenTx.wait();
    console.log("✅ Test USDC added as allowed token with limit: 1,000,000 USDC\n");

    // Get contract state
    const maxTVL = await gameEscrow.maxTVLLimit();
    const totalTVL = await gameEscrow.totalValueLocked();
    const isPaused = await gameEscrow.paused();
    const isTokenAllowed = await gameEscrow.allowedTokens(mockTokenAddress);

    // Summary
    console.log("========== Deployment Summary ==========");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId);
    console.log("\nTest USDC (MockERC20):", mockTokenAddress);
    console.log("  - Decimals: 6");
    console.log("  - Deployer Balance: 100,000 USDC");
    console.log("\nGameEscrow Contract:", gameEscrowAddress);
    console.log("\nContract State:");
    console.log("  - Max TVL Limit: 1,000,000 USDC");
    console.log("  - Current TVL:", ethers.formatUnits(totalTVL, 6), "USDC");
    console.log("  - Paused:", isPaused);
    console.log("  - Test USDC Allowed:", isTokenAllowed);
    console.log("\nRoles:");
    console.log("  - Admin:", deployer.address);
    console.log("  - Oracle:", deployer.address);
    console.log("  - Emergency:", deployer.address);

    console.log("\n========== Update .env Files ==========");
    console.log("Add these to your .env files:\n");
    console.log("# Smart Contract Addresses (Base Sepolia)");
    console.log(`GAME_ESCROW_ADDRESS=${gameEscrowAddress}`);
    console.log(`USDC_BASE_TESTNET=${mockTokenAddress}`);
    console.log(`ORACLE_PRIVATE_KEY=${process.env.PRIVATE_KEY}`);
    console.log("\n# Frontend (.env.local)");
    console.log(`NEXT_PUBLIC_GAME_ESCROW_ADDRESS=${gameEscrowAddress}`);
    console.log(`NEXT_PUBLIC_USDC_ADDRESS=${mockTokenAddress}`);
    console.log(`NEXT_PUBLIC_CHAIN_ID=84532`);
    console.log("\n========================================\n");

    // Save deployment info to file
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            MockERC20: mockTokenAddress,
            GameEscrow: gameEscrowAddress,
        },
        config: {
            mockTokenSymbol: "USDC",
            mockTokenDecimals: 6,
            deployerBalance: "100000",
            maxTVLLimit: "1000000",
            tokenLimit: "1000000",
            roles: {
                admin: deployer.address,
                oracle: deployer.address,
                emergency: deployer.address,
            },
        },
    };

    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const filename = `deployment-${network.chainId}-${Date.now()}.json`;
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", filepath, "\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
