// Auth hook with JIT pattern - only initializes Web3Auth when needed

'use client';

import { useState, useCallback } from 'react';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { getWeb3Auth, getUserAddress } from '@/lib/web3/web3auth-config';
import { Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { u8aToHex } from '@polkadot/util';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setAddress, setConnected, setUserType, disconnect: storeDisconnect } = useWalletStore();

  /**
   * Connect wallet - JIT pattern
   * Only triggers Web3Auth modal when user needs blockchain action
   */
  const connect = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get or initialize Web3Auth (JIT)
      const web3auth = await getWeb3Auth();
      
      // Show modal and connect
      console.log('Connecting wallet...');
      const web3authProvider = await web3auth.connect();
      
      if (!web3authProvider) {
        throw new Error('Failed to connect to Web3Auth');
      }

      // Get user info
      const user = await web3auth.getUserInfo();
      console.log('Web3Auth user:', user);

      // Wait for crypto libraries
      await cryptoWaitReady();
      
      // Get private key from Web3Auth ONCE
      console.log('Getting private key...');
      const privateKey = await web3authProvider.request({
        method: 'private_key',
      }) as string;
      
      if (!privateKey) {
        throw new Error('Failed to get private key');
      }
      
      // Create keyring and derive address from private key
      const keyring = new Keyring({ ss58Format: 42, type: 'sr25519' });
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
      const keyPair = keyring.addFromUri(`0x${cleanPrivateKey}`);
      const address = keyPair.address;
      
      console.log('Wallet connected:', address);
      
      // Create message to sign with timestamp
      const timestamp = Date.now();
      const message = `Sign in to Bountea Platform: ${timestamp}`;
      
      console.log('Signing message with Polkadot...');
      
      // Sign the message using the keyPair
      const signatureBytes = keyPair.sign(message);
      const signature = u8aToHex(signatureBytes);
      
      console.log('Message signed successfully');
      
      // Send to backend for JWT token
      console.log('Sending to backend for JWT...');
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        wallet: address,
        signature,
        message
      });
      
      console.log('Login successful, saving token...');
      
      // Save token and user data
      localStorage.setItem('auth-token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Update store
      setAddress(address);
      setConnected(true);
      setUserType(response.data.user.userType);
      
      console.log('Auth complete!');
      
      return { 
        address, 
        user: response.data.user 
      };
      
    } catch (error: any) {
      console.error('Connection failed:', error);
      
      // Clear any partial auth state
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      
      // Provide user-friendly error messages
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      } else if (error.message) {
        throw new Error(error.message);
      } else {
        throw new Error('Failed to connect wallet');
      }
    } finally {
      setIsLoading(false);
    }
  }, [setAddress, setConnected, setUserType]);

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
      
      // Clear auth data
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
      
      storeDisconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
      // Still clear local state even if logout fails
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
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
      // Check if we have a token
      const token = localStorage.getItem('auth-token');
      const userData = localStorage.getItem('user');
      
      if (!token || !userData) {
        return false;
      }
      
      // Verify token is still valid
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.user) {
          setAddress(response.data.user.wallet);
          setConnected(true);
          setUserType(response.data.user.userType);
          return true;
        }
      } catch (error) {
        // Token invalid, clear it
        localStorage.removeItem('auth-token');
        localStorage.removeItem('user');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Check connection failed:', error);
      return false;
    }
  }, [setAddress, setConnected, setUserType]);

  return {
    connect,
    disconnect,
    checkConnection,
    isLoading,
  };
};