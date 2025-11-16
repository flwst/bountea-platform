import hre from 'hardhat';

async function main() {
    console.log('Estimating gas for UGCBountyEscrow deployment...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('Deployer:', deployer.address);

    const PAYMENT_TOKEN = "0xFee95Ee1E03bE4832E6F318d94243ee5cbFDc2B4";

    const UGCBountyEscrow = await hre.ethers.getContractFactory('UGCBountyEscrow');

    try {
        // Get deployment transaction
        const deployTx = await UGCBountyEscrow.getDeployTransaction(PAYMENT_TOKEN);

        console.log('Deployment transaction data:');
        console.log('  To:', deployTx.to);
        console.log('  Data length:', deployTx.data.length, 'bytes');
        console.log('  Value:', deployTx.value?.toString() || '0');

        // Try to estimate gas
        const gasEstimate = await hre.ethers.provider.estimateGas({
            from: deployer.address,
            data: deployTx.data,
            value: deployTx.value || 0
        });

        console.log('\nGas estimate:', gasEstimate.toString());

    } catch (error) {
        console.error('\nError estimating gas:');
        console.error(error.message);
        if (error.data) {
            console.error('Error data:', error.data);
        }
    }
}

main().catch(console.error);
