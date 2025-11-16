// Web3Auth configuration with JIT (Just-In-Time) pattern
// CRITICAL: NO init on app load, only when user clicks login

import { Web3Auth } from "@web3auth/modal";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "";

let web3auth: Web3Auth | null = null;

/**
 * Get or initialize Web3Auth instance
 * JIT Pattern: Only initializes when user needs it (clicks login/connect)
 * This improves initial page load performance and UX
 */
export const getWeb3Auth = async () => {
  if (web3auth) return web3auth;

  // Chain configuration for Polkadot Asset Hub testnet
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x1908CE24", // 420420420 in hex
    rpcTarget: "https://testnet-passet-hub-eth-rpc.polkadot.io",
    displayName: "Polkadot Asset Hub Testnet",
    blockExplorerUrl: "",
    ticker: "DOT",
    tickerName: "Polkadot",
    logo: "",
  };

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig },
  });

  web3auth = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
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
      loginGridCol: 3,
      primaryButton: "externalLogin",
    },
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
 * Get user's wallet address
 */
export const getUserAddress = async (): Promise<string | null> => {
  try {
    const instance = await getWeb3Auth();
    if (!instance.connected || !instance.provider) return null;

    const accounts = await instance.provider.request({
      method: "eth_accounts",
    }) as string[];

    return accounts && accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error("Error getting user address:", error);
    return null;
  }
};