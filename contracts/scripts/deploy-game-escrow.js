import hre from "hardhat";
import fs from "fs";
import path from "path";

const { ethers } = hre;

async function main() {
    console.log("Starting GameEscrow deployment...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH\n");

    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId, "\n");

    // Deploy GameEscrow
    console.log("Deploying GameEscrow contract...");
    const GameEscrow = await ethers.getContractFactory("GameEscrow");

    // Constructor parameters: admin, oracle, maxTVLLimit
    const tvlLimit = ethers.parseEther("1000000"); // 1 million tokens
    const gameEscrow = await GameEscrow.deploy(
        deployer.address, // admin
        deployer.address, // oracle (same as admin for now)
        tvlLimit          // max TVL limit
    );
    await gameEscrow.waitForDeployment();

    const gameEscrowAddress = await gameEscrow.getAddress();
    console.log("✅ GameEscrow deployed to:", gameEscrowAddress);
    console.log("✅ All roles granted to deployer:", deployer.address);
    console.log("✅ TVL limit set to:", ethers.formatEther(tvlLimit), "tokens\n");

    // Check if we should deploy a mock ERC20 for testing
    if (network.chainId === 1337n || network.chainId === 31337n) {
        console.log("Detected local network, deploying MockERC20 for testing...");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockToken = await MockERC20.deploy("Test Token", "TEST", 18);
        await mockToken.waitForDeployment();

        const mockTokenAddress = await mockToken.getAddress();
        console.log("✅ MockERC20 deployed to:", mockTokenAddress);

        // Add mock token as allowed (with max limit)
        const tokenLimit = ethers.parseEther("1000000"); // 1 million tokens max
        const addTokenTx = await gameEscrow.addAllowedToken(mockTokenAddress, tokenLimit);
        await addTokenTx.wait();
        console.log("✅ MockERC20 added as allowed token");

        // Mint some tokens to deployer for testing
        const mintAmount = ethers.parseEther("10000");
        const mintTx = await mockToken.mint(deployer.address, mintAmount);
        await mintTx.wait();
        console.log("✅ Minted", ethers.formatEther(mintAmount), "TEST tokens to deployer\n");
    }

    // Get contract state
    const maxTVL = await gameEscrow.maxTVLLimit();
    const totalTVL = await gameEscrow.totalValueLocked();
    const isPaused = await gameEscrow.paused();

    // Summary
    console.log("========== Deployment Summary ==========");
    console.log("Network:", network.name);
    console.log("Chain ID:", network.chainId);
    console.log("\nGameEscrow Contract:", gameEscrowAddress);
    console.log("\nContract State:");
    console.log("  - Max TVL Limit:", ethers.formatEther(maxTVL), "tokens");
    console.log("  - Current TVL:", ethers.formatEther(totalTVL), "tokens");
    console.log("  - Paused:", isPaused);
    console.log("\nRoles:");
    console.log("  - Admin:", deployer.address);
    console.log("  - Oracle:", deployer.address);
    console.log("  - Emergency:", deployer.address);

    console.log("\n========== Next Steps ==========");
    console.log("1. Add allowed ERC20 tokens:");
    console.log("   await gameEscrow.addAllowedToken('<token_address>', ethers.parseEther('<max_limit>'))");

    console.log("\n2. Grant roles to other addresses if needed:");
    console.log("   await gameEscrow.grantRole(ORACLE_ROLE, '<oracle_address>')");
    console.log("   await gameEscrow.grantRole(EMERGENCY_ROLE, '<emergency_address>')");

    console.log("\n3. Adjust TVL limit if needed:");
    console.log("   await gameEscrow.updateMaxTVLLimit(ethers.parseEther('<amount>'))");

    if (network.chainId !== 1337n && network.chainId !== 31337n) {
        console.log("\n4. Verify contract on block explorer:");
        console.log("   npx hardhat verify --network", network.name, gameEscrowAddress);
    }

    console.log("\n5. Update your frontend with the contract address:");
    console.log("   GameEscrow:", gameEscrowAddress);
    console.log("========================================\n");

    // Save deployment info to file
    const deploymentInfo = {
        network: network.name,
        chainId: network.chainId.toString(),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            GameEscrow: gameEscrowAddress,
        },
        config: {
            maxTVLLimit: ethers.formatEther(maxTVL),
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

    const filename = `game-escrow-${network.chainId}-${Date.now()}.json`;
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
