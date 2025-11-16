'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VideoCard } from '@/components/video/video-card';
import { DollarSign, Eye, Video as VideoIcon, Star, TrendingUp, Mail } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Creator, Video } from '@/types';

interface Props {
  params: Promise<{ address: string }>;
}

export default function CreatorProfilePage({ params }: Props) {
  // Unwrap params Promise (Next.js 15 requirement)
  const { address } = use(params);
  
  const { address: connectedAddress, isConnected } = useWalletStore();
  const isBrand = isConnected && connectedAddress !== address;

  // Fetch creator profile and stats
  const { data: creator, isLoading: creatorLoading } = useQuery({
    queryKey: ['creator-profile', address],
    queryFn: async () => {
      // Fetch both profile and stats in parallel
      const [profileResponse, statsResponse] = await Promise.all([
        api.creator.getProfile(address),
        api.creator.getStats(address)
      ]);
      
      // Merge profile and stats
      return {
        ...profileResponse.data,
        address: profileResponse.data.wallet, // Map wallet to address for frontend
        stats: statsResponse.data
      };
    },
  });

  // Fetch creator videos
  const { data: videos = [], isLoading: videosLoading } = useQuery<Video[]>({
    queryKey: ['creator-videos-public', address],
    queryFn: async () => {
      const response = await api.creator.getVideos(address);
      return Array.isArray(response.data) ? response.data : [];
    },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Creator Header */}
      {creatorLoading ? (
        <div className="h-48 bg-white/5 rounded-lg animate-pulse mb-8" />
      ) : creator ? (
        <Card className="mb-8">
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex-shrink-0" />

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{creator.displayName}</h1>
                    {creator.category && (
                      <Badge variant="secondary" className="mb-2">
                        {creator.category}
                      </Badge>
                    )}
                    <p className="text-sm text-white/60">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  {isBrand && (
                    <div className="flex gap-3">
                      <Link href={`/brand/offer/${address}`}>
                        <Button>
                          <Mail className="w-4 h-4 mr-2" />
                          Make Offer
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-white/60">Earned</span>
                    </div>
                    <p className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                      ${((creator.stats?.totalEarned || 0) / 1000).toFixed(1)}K
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5 text-blue-500" />
                      <span className="text-sm text-white/60">Views</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {((creator.stats?.totalViews || 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <VideoIcon className="w-5 h-5 text-purple-500" />
                      <span className="text-sm text-white/60">Videos</span>
                    </div>
                    <p className="text-2xl font-bold">{creator.stats?.videoCount || 0}</p>
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-white/60">Rating</span>
                    </div>
                    <p className="text-2xl font-bold">
                      {(creator.stats?.avgAiRating || 0).toFixed(1)}/10
                    </p>
                  </div>
                </div>

                {/* Additional Stats */}
                <div className="mt-4 flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-white/60">
                      Success Rate: <span className="font-semibold">{creator.stats?.successRate || 0}%</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-white/60">Creator not found</p>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Portfolio</h2>
        <p className="text-white/60 mb-6">
          {videos.length} video{videos.length !== 1 ? 's' : ''}
        </p>

        {videosLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : videos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <VideoIcon className="w-12 h-12 mx-auto mb-4 text-white/40" />
              <p className="text-white/60">No videos yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* CTA for brands */}
      {isBrand && creator && (
        <Card className="mt-8 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 border-white/10">
          <CardContent className="py-8 text-center">
            <h3 className="text-xl font-semibold mb-2">
              Want to work with {creator.displayName}?
            </h3>
            <p className="text-white/60 mb-6">
              Send them a direct offer with custom terms and rewards
            </p>
            <Link href={`/brand/offer/${address}`}>
              <Button size="lg" className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]">
                <Mail className="w-4 h-4 mr-2" />
                Make an Offer
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}