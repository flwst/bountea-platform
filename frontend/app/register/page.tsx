'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Video, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Bounty } from '@/types';

export default function RegisterVideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();

  const [selectedBountyId, setSelectedBountyId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [platform, setPlatform] = useState<'youtube' | 'tiktok' | 'twitter' | 'instagram'>('youtube');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch available bounties
  const { data: bounties = [], isLoading: bountiesLoading } = useQuery<Bounty[]>({
    queryKey: ['bounties-active'],
    queryFn: async () => {
      const response = await api.bounties.getAll();
      // Backend returns {data: [...]}, Axios wraps it in response.data
      const allBounties = Array.isArray(response.data.data) ? response.data.data : [];
      // Filter only active bounties
      return allBounties.filter((b: Bounty) => b.status === 'active');
    },
  });

  // Pre-select bounty from URL parameter
  useEffect(() => {
    const bountyIdParam = searchParams.get('bountyId');
    if (bountyIdParam && !selectedBountyId && bounties.length > 0) {
      setSelectedBountyId(bountyIdParam);
    }
  }, [searchParams, bounties, selectedBountyId]);

  const selectedBounty = bounties.find((b) => b.id.toString() === selectedBountyId);

  // Validate video URL
  const isValidVideoUrl = (url: string): boolean => {
    try {
      if (platform === 'youtube') {
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        ];
        return patterns.some(pattern => pattern.test(url));
      } else if (platform === 'tiktok') {
        return /tiktok\.com\/@[\w.-]+\/video\/(\d+)/.test(url);
      } else if (platform === 'twitter') {
        return /(twitter\.com|x\.com)\/\w+\/status\/(\d+)/.test(url);
      } else if (platform === 'instagram') {
        return /instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/.test(url);
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check if we have a valid auth token
    const token = localStorage.getItem('auth-token');
    
    if (!isConnected || !token) {
      try {
        // Force re-authentication to get JWT token
        await connect();
      } catch (err) {
        setError('Please connect your wallet to continue');
        return;
      }
    }

    if (!selectedBountyId) {
      setError('Please select a bounty');
      return;
    }

    if (!videoUrl.trim()) {
      setError('Please enter a video URL');
      return;
    }

    if (!isValidVideoUrl(videoUrl)) {
      setError(`Invalid ${platform} URL format. Please check the URL and try again.`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Register video via API - backend handles URL parsing
      await api.videos.register({
        bountyId: parseInt(selectedBountyId),
        videoUrl: videoUrl
      });

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration failed:', err);
      
      // Extract the error message from the response
      const errorMessage = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to register video. Please try again.';
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Video className="w-16 h-16 mx-auto mb-4 text-white/40" />
          <h1 className="text-3xl font-bold mb-4">Register Video</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to register your video to a bounty
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-3xl font-bold mb-4">Video Registered!</h1>
          <p className="text-white/60 mb-8">
            Your video has been submitted for AI analysis. You'll be redirected to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Link href="/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Register Video</h1>
        <p className="text-white/60">
          Submit your video to a bounty and start earning rewards
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Select Bounty */}
        <Card>
          <CardHeader>
            <CardTitle>Select Bounty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bounty">Choose a bounty to participate in</Label>
              {bountiesLoading ? (
                <div className="h-10 bg-white/5 rounded animate-pulse mt-2" />
              ) : bounties.length === 0 ? (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No active bounties available. Check back later!
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedBountyId} onValueChange={setSelectedBountyId}>
                  <SelectTrigger id="bounty" className="mt-2">
                    <SelectValue placeholder="Select a bounty" />
                  </SelectTrigger>
                  <SelectContent>
                    {bounties.map((bounty) => {
                      const totalReward = bounty.milestones?.reduce(
                        (sum, m) => sum + parseFloat(m.rewardAmount),
                        0
                      ) || 0;
                      return (
                        <SelectItem key={bounty.id} value={bounty.id.toString()}>
                          {bounty.title} - ${totalReward.toLocaleString()}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedBounty && (
              <div className="p-4 bg-white/5 rounded-lg space-y-3">
                <div>
                  <p className="text-sm text-white/60">Description</p>
                  <p className="text-sm">{selectedBounty.description}</p>
                </div>
                <div>
                  <p className="text-sm text-white/60">Requirements</p>
                  <p className="text-sm">{selectedBounty.requirements}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    {selectedBounty.videoCount}/{selectedBounty.maxVideos} slots
                  </Badge>
                  {selectedBounty.platforms?.[0] && (
                    <Badge variant="secondary">
                      {selectedBounty.platforms[0].platform}
                    </Badge>
                  )}
                  <Badge variant="secondary">
                    Ends: {new Date(selectedBounty.deadline).toLocaleDateString()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-white/60 mb-2">Milestones</p>
                  <div className="space-y-1">
                    {selectedBounty.milestones.map((milestone, idx) => (
                      <div key={idx} className="text-sm flex justify-between">
                        <span>{milestone.viewsRequired.toLocaleString()} views</span>
                        <span className="font-semibold text-green-500">
                          ${milestone.rewardAmount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Details */}
        <Card>
          <CardHeader>
            <CardTitle>Video Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Select
                value={platform}
                onValueChange={(v) => setPlatform(v as 'youtube' | 'tiktok' | 'twitter' | 'instagram')}
              >
                <SelectTrigger id="platform" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">🎥 YouTube</SelectItem>
                  <SelectItem value="tiktok">📱 TikTok</SelectItem>
                  <SelectItem value="twitter">🐦 Twitter/X</SelectItem>
                  <SelectItem value="instagram">📷 Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="videoUrl">Video URL</Label>
              <Input
                id="videoUrl"
                type="url"
                placeholder={
                  platform === 'youtube'
                    ? 'https://youtube.com/watch?v=dQw4w9WgXcQ'
                    : platform === 'tiktok'
                    ? 'https://tiktok.com/@user/video/1234567890'
                    : platform === 'twitter'
                    ? 'https://twitter.com/user/status/1234567890'
                    : 'https://instagram.com/p/ABC123xyz/'
                }
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-white/40 mt-1">
                {platform === 'youtube' && 'Paste the full YouTube URL (youtube.com or youtu.be)'}
                {platform === 'tiktok' && 'Paste the full TikTok video URL'}
                {platform === 'twitter' && 'Paste the full Twitter/X post URL with video'}
                {platform === 'instagram' && 'Paste the full Instagram post or reel URL'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <div className="flex gap-4">
          <Link href="/dashboard" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting || !selectedBountyId || !videoUrl || bountiesLoading}
            className="flex-1"
          >
            {isSubmitting ? 'Registering...' : 'Register Video'}
          </Button>
        </div>
      </form>
    </div>
  );
}