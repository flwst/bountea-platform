import hre from 'hardhat';

async function main() {
    console.log('Testing connection to Polkadot Asset Hub...\n');

    const [signer] = await hre.ethers.getSigners();
    console.log('Address:', signer.address);

    const balance = await hre.ethers.provider.getBalance(signer.address);
    console.log('Balance:', hre.ethers.formatEther(balance), 'WND');

    const network = await hre.ethers.provider.getNetwork();
    console.log('Network:', network.name);
    console.log('Chain ID:', network.chainId.toString());

    const block = await hre.ethers.provider.getBlockNumber();
    console.log('Latest Block:', block);

    const nonce = await hre.ethers.provider.getTransactionCount(signer.address);
    console.log('Nonce:', nonce);

    const gasPrice = await hre.ethers.provider.getFeeData();
    console.log('Gas Price:', gasPrice.gasPrice?.toString(), 'wei');
}

main().catch(console.error);
