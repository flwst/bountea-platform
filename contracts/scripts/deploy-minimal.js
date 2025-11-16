import hre from 'hardhat';

async function main() {
    console.log('Deploying Minimal contract...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('Deployer:', deployer.address);

    const Minimal = await hre.ethers.getContractFactory('Minimal');
    const contract = await Minimal.deploy();

    await contract.waitForDeployment();
    console.log('✅ Deployed at:', await contract.getAddress());
}

main().catch(console.error);
