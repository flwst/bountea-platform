import hre from 'hardhat';

async function main() {
    const address = '0x83c55956F1dbcbEE94E6FE20C606cdeDa5B10E3a';

    console.log('Checking for pending transactions...\n');

    try {
        // Try different RPC methods to check for pending txs
        const provider = hre.ethers.provider;

        // Check pending transaction count
        const pendingNonce = await provider.getTransactionCount(address, 'pending');
        const confirmedNonce = await provider.getTransactionCount(address, 'latest');

        console.log('Confirmed nonce:', confirmedNonce);
        console.log('Pending nonce:', pendingNonce);
        console.log(`Pending transactions: ${pendingNonce - confirmedNonce}\n`);

        if (pendingNonce > confirmedNonce) {
            console.log(`⚠️  There are ${pendingNonce - confirmedNonce} pending transaction(s)`);
            console.log('This could be blocking new transactions');
        } else {
            console.log('✅ No pending transactions');
        }

        // Try to get mempool content
        console.log('\nAttempting to query mempool...');
        try {
            const mempool = await provider.send('txpool_content', []);
            console.log('Mempool:', JSON.stringify(mempool, null, 2));
        } catch (e) {
            console.log('Mempool query not supported:', e.message);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

main().catch(console.error);
