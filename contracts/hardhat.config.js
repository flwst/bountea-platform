import "@nomicfoundation/hardhat-toolbox";
import "@parity/hardhat-polkadot";
import "dotenv/config";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
    solidity: {
        compilers: [
            {
                version: "0.8.19",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: false,
                },
            },
            {
                version: "0.8.20",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: true,
                },
            },
            {
                version: "0.8.22",
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                    viaIR: true,
                },
            },
        ],
    },
    networks: {
        hardhat: {
            chainId: 1337,
        },
        sepolia: {
            url:
                process.env.SEPOLIA_RPC_URL ||
                "https://sepolia.infura.io/v3/YOUR-PROJECT-ID",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111,
        },
        mainnet: {
            url:
                process.env.MAINNET_RPC_URL ||
                "https://mainnet.infura.io/v3/YOUR-PROJECT-ID",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 1,
        },
        // Base Networks
        baseSepolia: {
            url: process.env.BASE_TESTNET_RPC || "https://sepolia.base.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 84532,
            gasPrice: "auto",
        },
        base: {
            url: process.env.BASE_RPC || "https://mainnet.base.org",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 8453,
            gasPrice: "auto",
        },
        // PolkaVM Networks
        polkadotAssetHubTestnet: {
            url: "https://westend-asset-hub-eth-rpc.polkadot.io",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 420420421, // Westend Asset Hub chain ID
        },
        polkadotAssetHub: {
            url:
                process.env.POLKADOT_ASSET_HUB_RPC ||
                "https://asset-hub-polkadot-rpc.polkadot.io",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 1000, // Polkadot Asset Hub chain ID
            gasPrice: "auto",
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    mocha: {
        timeout: 40000,
        require: [],
    },
};
