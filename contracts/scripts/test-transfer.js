import hre from 'hardhat';

async function main() {
    console.log('Testing simple WND transfer...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('From:', deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log('Balance:', hre.ethers.formatEther(balance), 'WND');

    const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
    console.log('Nonce:', nonce, '\n');

    // Send a small amount to self
    const to = deployer.address;
    const amount = hre.ethers.parseEther('0.001');

    console.log(`Sending ${hre.ethers.formatEther(amount)} WND to ${to}...`);

    try {
        const tx = await deployer.sendTransaction({
            to: to,
            value: amount,
            gasLimit: 21000
        });

        console.log('Transaction sent:', tx.hash);
        console.log('Waiting for confirmation...');

        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
        console.log('Gas used:', receipt.gasUsed.toString());

    } catch (error) {
        console.error('❌ Transaction failed:');
        console.error(error.message);
    }
}

main().catch(console.error);
