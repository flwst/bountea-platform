import hre from 'hardhat';

async function main() {
    console.log('Verifying private key...\n');

    const [deployer] = await hre.ethers.getSigners();
    console.log('Address from signer:', deployer.address);

    // Verify by signing a message
    const message = 'Test message';
    const signature = await deployer.signMessage(message);

    console.log('Message:', message);
    console.log('Signature:', signature);

    // Recover address from signature
    const recoveredAddress = hre.ethers.verifyMessage(message, signature);
    console.log('Recovered address:', recoveredAddress);

    if (recoveredAddress.toLowerCase() === deployer.address.toLowerCase()) {
        console.log('\n✅ Private key is valid and controls', deployer.address);
    } else {
        console.log('\n❌ Private key does NOT match the address!');
    }
}

main().catch(console.error);
