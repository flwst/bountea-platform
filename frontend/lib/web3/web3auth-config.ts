// Web3Auth configuration with JIT (Just-In-Time) pattern for Polkadot
// CRITICAL: NO init on app load, only when user clicks login

import { Web3Auth } from "@web3auth/modal";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "";

let web3auth: Web3Auth | null = null;

/**
 * Get or initialize Web3Auth instance
 * JIT Pattern: Only initializes when user needs it (clicks login/connect)
 * This improves initial page load performance and UX
 */
export const getWeb3Auth = async () => {
  if (web3auth) return web3auth;

  // Polkadot Chain Configuration for Web3Auth
  // Using "other" namespace for custom chains like PolkaVM
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.OTHER,
    chainId: 'Westend Asset Hub', // Descriptive ID for "other" namespace
    rpcTarget: 'https://westend-asset-hub-eth-rpc.polkadot.io/',
    displayName: 'Westend Asset Hub (PolkaVM)',
    blockExplorerUrl: 'https://westend-asset-hub.subscan.io/',
    ticker: 'PAS',
    tickerName: 'Westend PAS',
  };

  // CommonPrivateKeyProvider for custom chains
  const privateKeyProvider = new CommonPrivateKeyProvider({
    config: { chainConfig },
  });

  web3auth = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    chainConfig,
    privateKeyProvider,
    uiConfig: {
      appName: "Bountea",
      theme: {
        primary: "#7c3aed",
      },
      mode: "dark",
      logoLight: "/logo.svg",
      logoDark: "/logo.svg",
      defaultLanguage: "en",
      loginMethodsOrder: ['google', 'twitter', 'discord'],
      modalZIndex: '2147483647',
    },
    enableLogging: true,
    sessionTime: 86400 * 30, // 30 days
  });

  await web3auth.initModal();
  return web3auth;
};

/**
 * Cleanup on page unload
 * Prevents memory leaks
 */
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    web3auth = null;
  });
}

/**
 * Check if user is already connected (from previous session)
 */
export const checkExistingConnection = async () => {
  try {
    const instance = await getWeb3Auth();
    return instance.connected;
  } catch (error) {
    console.error("Error checking connection:", error);
    return false;
  }
};

/**
 * Get user's Polkadot wallet address
 * For Polkadot, we derive the address from the private key using Polkadot JS
 */
export const getUserAddress = async (): Promise<string | null> => {
  try {
    const instance = await getWeb3Auth();
    if (!instance.connected || !instance.provider) return null;

    // Wait for crypto libraries to be ready
    await cryptoWaitReady();

    // 1. Request the private key from Web3Auth provider
    const privateKey = await instance.provider.request({
      method: 'private_key',
    }) as string;

    if (!privateKey) {
      console.error("No private key returned from provider");
      return null;
    }

    // 2. Create a Polkadot keypair from the private key
    // Using ss58Format: 42 for generic Substrate (compatible with Westend)
    const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
    
    // Remove '0x' prefix if present
    const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    
    // Add keypair from the private key
    const keyPair = keyring.addFromUri(`0x${cleanPrivateKey}`);

    // 3. Return the Polkadot address
    return keyPair.address;
  } catch (error) {
    console.error("Error getting Polkadot address:", error);
    return null;
  }
};