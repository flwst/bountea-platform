import hre from 'hardhat';

async function main() {
    const address = '0x83c55956F1dbcbEE94E6FE20C606cdeDa5B10E3a';

    console.log(`Checking transaction history for ${address}\n`);

    const nonce = await hre.ethers.provider.getTransactionCount(address);
    console.log(`Current nonce: ${nonce}`);
    console.log(`This means ${nonce} transactions have been sent from this address\n`);

    // Get latest block
    const latestBlock = await hre.ethers.provider.getBlockNumber();
    console.log(`Latest block: ${latestBlock}`);

    // Try to get recent transactions by checking recent blocks
    console.log('\nChecking last 10 blocks for transactions from this address...');

    for (let i = 0; i < 10; i++) {
        const blockNum = latestBlock - i;
        try {
            const block = await hre.ethers.provider.getBlock(blockNum, true);
            if (block && block.transactions) {
                for (const tx of block.transactions) {
                    if (typeof tx === 'object' && tx.from === address) {
                        console.log(`\nFound transaction in block ${blockNum}:`);
                        console.log(`  Hash: ${tx.hash}`);
                        console.log(`  To: ${tx.to || 'Contract Creation'}`);
                        console.log(`  Nonce: ${tx.nonce}`);
                        console.log(`  Gas Limit: ${tx.gasLimit}`);
                        console.log(`  Gas Price: ${tx.gasPrice}`);
                    }
                }
            }
        } catch (e) {
            console.log(`Error fetching block ${blockNum}:`, e.message);
        }
    }
}

main().catch(console.error);
