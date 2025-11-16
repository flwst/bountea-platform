'use client';

import { useQuery } from '@tanstack/react-query';
import { VideoCard } from '@/components/video/video-card';
import { Button } from '@/components/ui/button';
import { PlayCircle, TrendingUp, Users } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Video } from '@/types';

export default function HomePage() {
  // Fetch videos with real-time updates
  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ['videos-feed'],
    queryFn: async () => {
      const response = await api.videos.getAll();
      // Backend returns {data: [...]}, Axios wraps it in response.data
      // So we need response.data.data to get the array
      return Array.isArray(response.data.data) ? response.data.data : [];
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live view counts
  });

  // Filter only approved videos
  const approvedVideos = Array.isArray(videos) ? videos.filter(v => v.status === 'approved') : [];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
            Create. Share. Earn.
          </h1>
          <p className="text-xl text-white/80 mb-8">
            The video bounty platform where creators earn rewards for viral content
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Link href="/explore">
              <Button size="lg" className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]">
                <PlayCircle className="w-5 h-5 mr-2" />
                Explore Bounties
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Register Your Video
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div>
              <div className="text-3xl font-bold mb-1">
                {approvedVideos.length}+
              </div>
              <div className="text-sm text-white/60">Active Videos</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">
                {approvedVideos.reduce((sum, v) => sum + v.currentViews, 0).toLocaleString()}+
              </div>
              <div className="text-sm text-white/60">Total Views</div>
            </div>
            <div>
              <div className="text-3xl font-bold mb-1">$10K+</div>
              <div className="text-sm text-white/60">Rewards Paid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Videos */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Featured Videos</h2>
          <Link href="/explore">
            <Button variant="ghost">
              View All
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-80 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : approvedVideos.length === 0 ? (
          <div className="text-center py-16 bg-white/5 rounded-lg">
            <PlayCircle className="w-16 h-16 mx-auto mb-4 text-white/40" />
            <p className="text-white/60 text-lg mb-2">No videos yet</p>
            <p className="text-white/40 text-sm mb-6">
              Be the first to register a video and start earning!
            </p>
            <Link href="/register">
              <Button>Register Your Video</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {approvedVideos.slice(0, 6).map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <Users className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">1. Browse Bounties</h3>
            <p className="text-white/60">
              Find bounties that match your content style and audience
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <PlayCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">2. Create & Register</h3>
            <p className="text-white/60">
              Create your video and register it to start tracking views
            </p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <TrendingUp className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-semibold mb-2">3. Earn Rewards</h3>
            <p className="text-white/60">
              Hit view milestones and claim your rewards automatically
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-2xl p-8 md:p-12 text-center border border-white/10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Start Earning?
          </h2>
          <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Join thousands of creators earning rewards for their viral content
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]">
                Get Started Now
              </Button>
            </Link>
            <Link href="/explore">
              <Button size="lg" variant="outline">
                View All Bounties
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
