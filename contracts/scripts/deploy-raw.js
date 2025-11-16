/**
 * Raw deployment using manual transaction construction
 */

import hre from 'hardhat';
import fs from 'fs';

async function main() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║       Raw Deploy UGC Bounty Escrow                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log(`👤 Deployer: ${deployer.address}`);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`   Balance: ${hre.ethers.formatEther(balance)} WND\n`);

    const PAYMENT_TOKEN = "0xFee95Ee1E03bE4832E6F318d94243ee5cbFDc2B4";

    // Get contract factory and deployment data
    const UGCBountyEscrow = await hre.ethers.getContractFactory('UGCBountyEscrow');
    const deployTx = await UGCBountyEscrow.getDeployTransaction(PAYMENT_TOKEN);

    console.log('📋 Deployment Transaction:');
    console.log(`   Bytecode size: ${deployTx.data.length / 2} bytes\n`);

    // Get current nonce
    const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
    console.log(`   Current nonce: ${nonce}`);

    // Construct raw transaction
    const rawTx = {
        from: deployer.address,
        to: null,  // Contract creation
        data: deployTx.data,
        value: 0,
        nonce: nonce,
        gasLimit: 5000000,
        chainId: 420420421
    };

    console.log('\n⏳ Sending transaction...');

    try {
        const tx = await deployer.sendTransaction(rawTx);
        console.log(`   Transaction hash: ${tx.hash}`);
        console.log('   Waiting for confirmation...\n');

        const receipt = await tx.wait();

        if (receipt.contractAddress) {
            console.log(`✅ Contract deployed at: ${receipt.contractAddress}\n`);

            // Save deployment info
            const deployment = {
                network: hre.network.name,
                contractAddress: receipt.contractAddress,
                paymentToken: PAYMENT_TOKEN,
                master: deployer.address,
                deployedAt: new Date().toISOString(),
                txHash: tx.hash,
                chainId: 420420421,
                gasUsed: receipt.gasUsed.toString()
            };

            const filename = `ugc-bounty-deployment-${hre.network.name}.json`;
            fs.writeFileSync(filename, JSON.stringify(deployment, null, 2));

            console.log('╔════════════════════════════════════════════════════════╗');
            console.log('║              ✅ DEPLOYMENT SUCCESS                     ║');
            console.log('╚════════════════════════════════════════════════════════╝');
            console.log(`\n💾 Deployment saved to: ${filename}`);
        } else {
            console.error('❌ No contract address in receipt');
        }

    } catch (error) {
        console.error('\n❌ Deployment failed:');
        console.error(error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
