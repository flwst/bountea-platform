// Auth hook with JIT pattern - only initializes Web3Auth when needed

'use client';

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { getWeb3Auth, getUserAddress } from '@/lib/web3/web3auth-config';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAddress, setConnected, disconnect: storeDisconnect } = useWalletStore();

  /**
   * Connect wallet - JIT pattern
   * Only triggers Web3Auth modal when user needs blockchain action
   */
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Get or initialize Web3Auth (JIT)
      const web3auth = await getWeb3Auth();
      
      // Show modal and connect
      const web3authProvider = await web3auth.connect();
      
      if (!web3authProvider) {
        throw new Error('Failed to connect to Web3Auth');
      }

      // Get user info
      const user = await web3auth.getUserInfo();
      console.log('Web3Auth user:', user);

      // Get wallet address
      const address = await getUserAddress();
      
      if (address) {
        setAddress(address);
        setConnected(true);
        return { address, user };
      } else {
        throw new Error('Failed to get wallet address');
      }
    } catch (error) {
      console.error('Connection failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [setAddress, setConnected]);

  /**
   * Disconnect wallet
   */
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);
      const web3auth = await getWeb3Auth();
      
      if (web3auth.connected) {
        await web3auth.logout();
      }
      
      storeDisconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
      // Still clear local state even if logout fails
      storeDisconnect();
    } finally {
      setIsLoading(false);
    }
  }, [storeDisconnect]);

  /**
   * Check if user is already connected (from previous session)
   */
  const checkConnection = useCallback(async () => {
    try {
      const web3auth = await getWeb3Auth();
      
      if (web3auth.connected) {
        const address = await getUserAddress();
        if (address) {
          setAddress(address);
          setConnected(true);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Check connection failed:', error);
      return false;
    }
  }, [setAddress, setConnected]);

  return {
    connect,
    disconnect,
    checkConnection,
    isLoading,
  };
};