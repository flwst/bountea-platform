/**
 * Deploy UGCBountyEscrow Contract
 * Simplified bounty system for UGC creators
 */

import hre from 'hardhat';
import fs from 'fs';

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║       Deploy UGC Bounty Escrow - Asset Hub            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Get deployer (this becomes the Master/Owner)
    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 Deploying with Master account: ${deployer.address}`);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${hre.ethers.formatEther(balance)} WND\n`);

    // Use USDC contract already deployed
    const PAYMENT_TOKEN = process.env.POLKADOT_USDC_ADDRESS || "0xFee95Ee1E03bE4832E6F318d94243ee5cbFDc2B4";

    console.log('📋 Configuration:');
    console.log(`   Payment Token (USDC): ${PAYMENT_TOKEN}`);
    console.log(`   Master (Owner): ${deployer.address}\n`);

    // Deploy UGCBountyEscrow
    console.log('⏳ Deploying UGCBountyEscrow...');

    const UGCBountyEscrow = await hre.ethers.getContractFactory('UGCBountyEscrow');

    // Deploy - let ethers handle gas automatically but ensure enough priority
    console.log('   Deploying...\n');

    const bountyEscrow = await UGCBountyEscrow.deploy(PAYMENT_TOKEN, {
        gasLimit: 5000000
    });

    await bountyEscrow.waitForDeployment();
    const contractAddress = await bountyEscrow.getAddress();

    console.log(`✅ UGCBountyEscrow deployed at: ${contractAddress}\n`);

    // Verify deployment
    const tokenAddress = await bountyEscrow.paymentToken();
    const owner = await bountyEscrow.owner();

    console.log('📊 Deployment Verification:');
    console.log(`   Contract: ${contractAddress}`);
    console.log(`   Payment Token: ${tokenAddress}`);
    console.log(`   Owner (Master): ${owner}`);
    console.log(`   Verified: ${tokenAddress === PAYMENT_TOKEN && owner === deployer.address ? '✅' : '❌'}\n`);

    // Save deployment info
    const deployment = {
        network: hre.network.name,
        contractAddress: contractAddress,
        paymentToken: PAYMENT_TOKEN,
        master: deployer.address,
        deployedAt: new Date().toISOString(),
        txHash: bountyEscrow.deploymentTransaction()?.hash,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString()
    };

    const filename = `ugc-bounty-deployment-${hre.network.name}.json`;
    fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ DEPLOYMENT COMPLETADO                  ║');
    console.log('╚════════════════════════════════════════════════════════╝');
    console.log(`\n💾 Deployment info saved to: ${filename}`);
    console.log(`\n📝 Next Steps:`);
    console.log(`   1. Update frontend with contract address: ${contractAddress}`);
    console.log(`   2. Replace PAYMENT_TOKEN with real Asset Hub precompile`);
    console.log(`   3. Test creating a bounty`);
    console.log(`\n🎯 Contract Functions:`);
    console.log(`   - createBounty(): Empresa crea bounty con presupuesto`);
    console.log(`   - submitVideo(): Creador submitea su video`);
    console.log(`   - approvePayment(): Master aprueba pago (SOLO OWNER)`);
    console.log(`   - claimPayment(): Creador reclama su pago`);
    console.log(`   - closeBounty(): Cerrar bounty y recuperar fondos`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
