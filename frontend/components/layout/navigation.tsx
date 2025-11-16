'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Home, Compass, LayoutDashboard, Wallet, LogOut } from 'lucide-react';
import { useState } from 'react';

export function Navigation() {
  const { address, isConnected, userType } = useWalletStore();
  const { connect, disconnect, isLoading } = useAuth();
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnectError(null);
      await connect();
    } catch (error) {
      console.error('Failed to connect:', error);
      setConnectError('Failed to connect wallet');
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link 
          href="/" 
          className="font-bold text-xl hover:opacity-80 transition-opacity"
        >
          Bountea
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Link>
          
          <Link 
            href="/explore" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Compass className="w-4 h-4" />
            <span>Explore</span>
          </Link>

          {isConnected && (
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
          )}
        </div>

        {/* Wallet Connection */}
        <div className="flex items-center gap-2">
          {connectError && (
            <span className="text-xs text-destructive mr-2">{connectError}</span>
          )}
          
          {isConnected ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="hidden sm:flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                <span className="font-mono text-sm">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDisconnect}
                disabled={isLoading}
                title="Disconnect wallet"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button 
              onClick={handleConnect}
              disabled={isLoading}
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              {isLoading ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Nav */}
      <div className="md:hidden border-t border-border">
        <div className="container mx-auto px-4 py-2 flex justify-around">
          <Link 
            href="/" 
            className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>
          
          <Link 
            href="/explore" 
            className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Compass className="w-5 h-5" />
            <span>Explore</span>
          </Link>

          {isConnected && (
            <Link 
              href="/dashboard" 
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}