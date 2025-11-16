import hre from 'hardhat';

async function main() {
    console.log('Testing simple contract deployment...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('Deployer:', deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log('Balance:', hre.ethers.formatEther(balance), 'WND');

    const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
    console.log('Nonce:', nonce, '\n');

    console.log('Deploying SimpleTest...');

    const SimpleTest = await hre.ethers.getContractFactory('SimpleTest');
    const contract = await SimpleTest.deploy(42, {
        gasLimit: 1000000
    });

    await contract.waitForDeployment();
    const address = await contract.getAddress();

    console.log('✅ SimpleTest deployed at:', address);
    console.log('Value:', await contract.value());
}

main().catch(console.error);
