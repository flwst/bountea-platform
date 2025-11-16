'use client';

import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Target, Video, Plus, Users } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Bounty, DashboardStats } from '@/types';

export default function BrandDashboardPage() {
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();

  // Fetch brand stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['brand-stats', address],
    queryFn: async () => {
      // Mock data for now - replace with actual API call
      return {
        activeBounties: 3,
        totalVideos: 15,
        totalSpent: 2500,
      } as DashboardStats;
    },
    enabled: !!address,
  });

  // Fetch brand bounties
  const { data: bounties = [], isLoading: bountiesLoading } = useQuery<Bounty[]>({
    queryKey: ['brand-bounties', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await api.bounties.getAll();
      // Backend returns {data: [...]}, Axios wraps it in response.data
      const allBounties = Array.isArray(response.data.data) ? response.data.data : [];
      // Filter by brand ID
      return allBounties.filter((b: Bounty) => b.brandId === address);
    },
    enabled: !!address,
  });

  // Calculate days left for a bounty
  const getDaysLeft = (deadline: Date) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h1 className="text-3xl font-bold mb-4">Brand Dashboard</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to access your brand dashboard
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Brand Dashboard</h1>
        <p className="text-white/60">
          Manage your bounties and track campaign performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bounties</CardTitle>
            <Target className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.activeBounties || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Videos</CardTitle>
            <Video className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.totalVideos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                ${(stats?.totalSpent || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-8">
        <Link href="/brand/create">
          <Button size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Create New Bounty
          </Button>
        </Link>
        <Link href="/brand/creators">
          <Button size="lg" variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Browse Creators
          </Button>
        </Link>
      </div>

      {/* Active Bounties */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Active Bounties</h2>

        {bountiesLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : bounties.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-white/40" />
              <p className="text-white/60 mb-4">No bounties created yet</p>
              <Link href="/brand/create">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Bounty
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bounties.map((bounty) => {
              const daysLeft = getDaysLeft(new Date(bounty.deadline));
              const progress = bounty.maxVideos > 0
                ? (bounty.videoCount / bounty.maxVideos) * 100
                : 0;
              const totalReward = bounty.milestones?.reduce(
                (sum, m) => sum + parseFloat(m.rewardAmount),
                0
              ) || 0;
              const platform = bounty.platforms?.[0]?.platform || 'youtube';

              return (
                <Card key={bounty.id} className="hover:border-white/20 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{bounty.title}</CardTitle>
                      <Badge
                        variant={
                          bounty.status === 'active'
                            ? 'default'
                            : bounty.status === 'completed'
                            ? 'secondary'
                            : 'destructive'
                        }
                      >
                        {bounty.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-white/60 line-clamp-2">
                      {bounty.description}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-white/60">Total Reward</p>
                        <p className="font-semibold text-green-500">
                          ${totalReward.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60">Videos</p>
                        <p className="font-semibold">
                          {bounty.videoCount}/{bounty.maxVideos}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60">Platform</p>
                        <p className="font-semibold capitalize">{platform}</p>
                      </div>
                      <div>
                        <p className="text-white/60">Time Left</p>
                        <p className="font-semibold">
                          {daysLeft} days
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-white/60">
                        <span>Slots Filled</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Button variant="outline" className="w-full" size="sm">
                      View Details
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}