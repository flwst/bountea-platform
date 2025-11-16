import hre from 'hardhat';

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    const PAYMENT_TOKEN = "0xFee95Ee1E03bE4832E6F318d94243ee5cbFDc2B4";

    console.log('Deploying SimpleBounty...');
    console.log('Deployer:', deployer.address);

    const SimpleBounty = await hre.ethers.getContractFactory('SimpleBounty');
    const contract = await SimpleBounty.deploy(PAYMENT_TOKEN);

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('✅ Deployed at:', address);
    console.log('Owner:', await contract.owner());
    console.log('Payment Token:', await contract.paymentToken());
}

main().catch(console.error);
