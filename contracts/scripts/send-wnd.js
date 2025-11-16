import hre from 'hardhat';

async function main() {
    const [sender] = await hre.ethers.getSigners();

    const to = '0x28B2C4ee83866EF3B5Caa0c54D9385701DB87966';
    const amount = hre.ethers.parseEther('0.5');

    console.log(`Sending ${hre.ethers.formatEther(amount)} WND`);
    console.log(`From: ${sender.address}`);
    console.log(`To: ${to}\n`);

    const tx = await sender.sendTransaction({
        to: to,
        value: amount
    });

    console.log('Transaction hash:', tx.hash);
    console.log('Waiting for confirmation...');

    await tx.wait();
    console.log('✅ Transfer complete!');
}

main().catch(console.error);
