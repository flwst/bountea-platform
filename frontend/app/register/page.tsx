'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();

  const [selectedBountyId, setSelectedBountyId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [platform, setPlatform] = useState<'youtube' | 'tiktok'>('youtube');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch available bounties
  const { data: bounties = [], isLoading: bountiesLoading } = useQuery<Bounty[]>({
    queryKey: ['bounties-active'],
    queryFn: async () => {
      const response = await api.bounties.getAll();
      const allBounties = Array.isArray(response.data) ? response.data : [];
      // Filter only active bounties
      return allBounties.filter((b: Bounty) => b.status === 'active');
    },
  });

  const selectedBounty = bounties.find((b) => b.id.toString() === selectedBountyId);

  // Extract video ID from URL
  const extractVideoId = (url: string, platform: 'youtube' | 'tiktok'): string | null => {
    try {
      if (platform === 'youtube') {
        // Handle various YouTube URL formats
        const patterns = [
          /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
          /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
        ];
        for (const pattern of patterns) {
          const match = url.match(pattern);
          if (match) return match[1];
        }
      } else {
        // TikTok video ID
        const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
        if (match) return match[1];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isConnected) {
      try {
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

    const videoId = extractVideoId(videoUrl, platform);
    if (!videoId) {
      setError(`Invalid ${platform} URL format`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Register video via API
      await api.videos.register({
        bountyId: parseInt(selectedBountyId),
        videoId,
        url: videoUrl,
        platform,
      });

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.message || 'Failed to register video. Please try again.');
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
                    {bounties.map((bounty) => (
                      <SelectItem key={bounty.id} value={bounty.id.toString()}>
                        {bounty.title} - ${bounty.totalReward}
                      </SelectItem>
                    ))}
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
                  <Badge variant="secondary">
                    {selectedBounty.platform}
                  </Badge>
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
              <Select value={platform} onValueChange={(v) => setPlatform(v as 'youtube' | 'tiktok')}>
                <SelectTrigger id="platform" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="youtube">YouTube</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
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
                    ? 'https://youtube.com/watch?v=...'
                    : 'https://tiktok.com/@username/video/...'
                }
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-white/40 mt-1">
                Paste the full URL of your video
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