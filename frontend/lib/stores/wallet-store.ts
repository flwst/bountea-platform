// Wallet store with Zustand + persist middleware
// Manages wallet connection state across app

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserType } from '@/types';

interface WalletState {
  address: string | null;
  isConnected: boolean;
  userType: UserType;
  setAddress: (address: string | null) => void;
  setConnected: (connected: boolean) => void;
  setUserType: (type: UserType) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      address: null,
      isConnected: false,
      userType: null,
      
      setAddress: (address) => set({ address }),
      
      setConnected: (connected) => set({ isConnected: connected }),
      
      setUserType: (type) => set({ userType: type }),
      
      disconnect: () =>
        set({
          address: null,
          isConnected: false,
          userType: null,
        }),
    }),
    {
      name: 'wallet-storage', // localStorage key
      // Only persist these fields
      partialize: (state) => ({
        address: state.address,
        isConnected: state.isConnected,
        userType: state.userType,
      }),
    }
  )
);