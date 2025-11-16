'use client';

import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Video, Eye, Plus, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { DashboardStats, Video as VideoType } from '@/types';

export default function CreatorDashboardPage() {
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();

  // Fetch creator stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['creator-stats', address],
    queryFn: async () => {
      if (!address) return {} as DashboardStats;
      const response = await api.creator.getStats(address);
      return response.data;
    },
    enabled: !!address,
  });

  // Fetch creator videos
  const { data: videos = [], isLoading: videosLoading } = useQuery<VideoType[]>({
    queryKey: ['creator-videos', address],
    queryFn: async () => {
      if (!address) return [];
      const response = await api.creator.getVideos(address);
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: !!address,
  });

  // Handle claim milestone
  const handleClaim = async (videoId: number, milestoneId: number) => {
    try {
      await api.videos.claim(videoId, milestoneId);
      // Refresh data after claim
      // queryClient.invalidateQueries(['creator-videos', address]);
      alert('Claim successful! Transaction submitted.');
    } catch (error) {
      console.error('Claim failed:', error);
      alert('Claim failed. Please try again.');
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Creator Dashboard</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to access your creator dashboard
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
        <h1 className="text-3xl font-bold mb-2">Creator Dashboard</h1>
        <p className="text-white/60">
          Track your earnings, videos, and performance
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                ${(stats?.totalEarned || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Videos</CardTitle>
            <Video className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                {stats?.activeVideos || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-white/60" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 bg-white/5 rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">
                {(stats?.totalViews || 0).toLocaleString()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Videos */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Active Videos</h2>
          <Link href="/register">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Register New Video
            </Button>
          </Link>
        </div>

        {videosLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Video className="w-12 h-12 mx-auto mb-4 text-white/40" />
              <p className="text-white/60 mb-4">No active videos yet</p>
              <Link href="/register">
                <Button variant="outline">
                  Register Your First Video
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const nextMilestone = video.bounty.milestones.find(
                (m) => m.viewsRequired > video.currentViews && !m.claimed
              );
              const progress = nextMilestone
                ? (video.currentViews / nextMilestone.viewsRequired) * 100
                : 100;
              const canClaim = video.status === 'approved' && nextMilestone && progress >= 100;

              return (
                <Card key={video.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4">
                      {/* Thumbnail */}
                      <div className="w-full md:w-48 h-28 bg-white/5 rounded-lg overflow-hidden flex-shrink-0">
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold mb-1">{video.title}</h3>
                            <p className="text-sm text-white/60">
                              {video.bounty.title}
                            </p>
                          </div>
                          <Badge
                            variant={
                              video.status === 'approved'
                                ? 'default'
                                : video.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {video.status === 'approved' && '✓ '}
                            {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
                          </Badge>
                        </div>

                        {/* Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60">
                              {video.currentViews.toLocaleString()} views
                              {nextMilestone && ` / ${nextMilestone.viewsRequired.toLocaleString()}`}
                            </span>
                            {nextMilestone && (
                              <span className="font-medium bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                                Next: ${nextMilestone.rewardAmount}
                              </span>
                            )}
                          </div>
                          <Progress value={progress} />
                        </div>

                        {/* AI Status */}
                        {video.aiAnalysis && (
                          <div className="mt-3 text-sm text-white/60">
                            AI Rating: {video.aiAnalysis.rating}/10
                          </div>
                        )}

                        {/* Actions */}
                        {canClaim && nextMilestone && (
                          <div className="mt-4">
                            <Button
                              onClick={() => handleClaim(video.id, nextMilestone.id)}
                              className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]"
                            >
                              <TrendingUp className="w-4 h-4 mr-2" />
                              Claim ${nextMilestone.rewardAmount}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
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