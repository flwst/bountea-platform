'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertCircle, Eye, Star } from 'lucide-react';
import { api } from '@/lib/api/client';
import type { ApprovalQueueEntry } from '@/types';

export default function AdminQueuePage() {
  const { isConnected } = useWalletStore();
  const { connect } = useAuth();
  const queryClient = useQueryClient();
  
  const [sortBy, setSortBy] = useState('priority');
  const [selectedVideo, setSelectedVideo] = useState<ApprovalQueueEntry | null>(null);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  // Fetch approval queue
  const { data: queue = [], isLoading } = useQuery<ApprovalQueueEntry[]>({
    queryKey: ['admin-queue'],
    queryFn: async () => {
      const response = await api.admin.getQueue();
      return Array.isArray(response.data) ? response.data : [];
    },
    enabled: isConnected,
  });

  // Sort queue
  const sortedQueue = Array.isArray(queue) ? [...queue].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { high: 0, med: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    } else if (sortBy === 'rating') {
      return a.aiAnalysis.rating - b.aiAnalysis.rating;
    } else { // oldest
      return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
    }
  }) : [];

  const handleApprove = async (videoId: number) => {
    setIsProcessing(true);
    setError('');
    
    try {
      await api.admin.approve(videoId, reason || undefined);
      // Refresh queue
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      setSelectedVideo(null);
      setReason('');
    } catch (err: any) {
      console.error('Approve failed:', err);
      setError(err.response?.data?.message || 'Failed to approve video');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (videoId: number) => {
    if (!reason.trim()) {
      setError('Rejection reason is required');
      return;
    }
    
    setIsProcessing(true);
    setError('');
    
    try {
      await api.admin.reject(videoId, reason);
      // Refresh queue
      queryClient.invalidateQueries({ queryKey: ['admin-queue'] });
      setSelectedVideo(null);
      setReason('');
    } catch (err: any) {
      console.error('Reject failed:', err);
      setError(err.response?.data?.message || 'Failed to reject video');
    } finally {
      setIsProcessing(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Admin Queue</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to access the approval queue
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
        <h1 className="text-3xl font-bold mb-2">Approval Queue</h1>
        <p className="text-white/60">
          Review videos that need manual approval (AI rating &lt; 7)
        </p>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-white/60">
          {isLoading ? 'Loading...' : `${queue.length} videos pending review`}
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="rating">AI Rating</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-500" />
            <p className="text-white/60">All caught up!</p>
            <p className="text-white/40 text-sm mt-2">
              No videos pending review
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Queue List */}
          <div className="space-y-4">
            {sortedQueue.map((entry) => (
              <Card
                key={entry.id}
                className={`cursor-pointer transition-colors ${
                  selectedVideo?.id === entry.id
                    ? 'border-white/30'
                    : 'hover:border-white/20'
                }`}
                onClick={() => setSelectedVideo(entry)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{entry.title}</h3>
                      <p className="text-sm text-white/60 truncate">
                        by {entry.creator.name}
                      </p>
                    </div>
                    <Badge
                      variant={
                        entry.priority === 'high'
                          ? 'destructive'
                          : entry.priority === 'med'
                          ? 'default'
                          : 'secondary'
                      }
                    >
                      {entry.priority.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{entry.aiAnalysis.rating.toFixed(1)}/10</span>
                    </div>
                    {entry.aiAnalysis.botSignals.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {entry.aiAnalysis.botSignals.length} bot signals
                      </Badge>
                    )}
                    <span className="text-white/40 ml-auto">
                      {new Date(entry.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Review Panel */}
          <div className="lg:sticky lg:top-8 self-start">
            {selectedVideo ? (
              <Card>
                <CardHeader>
                  <CardTitle>Review Video</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Video Info */}
                  <div>
                    <h3 className="font-semibold mb-2">{selectedVideo.title}</h3>
                    <p className="text-sm text-white/60">
                      Creator: {selectedVideo.creator.name}
                    </p>
                    <p className="text-sm text-white/60">
                      Submitted: {new Date(selectedVideo.submittedAt).toLocaleString()}
                    </p>
                  </div>

                  {/* Video Player Placeholder */}
                  <div className="aspect-video bg-white/5 rounded-lg flex items-center justify-center">
                    <Eye className="w-12 h-12 text-white/40" />
                    <p className="text-white/40 ml-2">Video: {selectedVideo.videoId}</p>
                  </div>

                  {/* AI Analysis */}
                  <div>
                    <h4 className="font-semibold mb-2">AI Analysis</h4>
                    <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Rating:</span>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-semibold">
                            {selectedVideo.aiAnalysis.rating.toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-white/60 mb-1">Reasoning:</p>
                        <p className="text-sm">{selectedVideo.aiAnalysis.reasoning}</p>
                      </div>
                      {selectedVideo.aiAnalysis.botSignals.length > 0 && (
                        <div>
                          <p className="text-sm text-white/60 mb-1">Bot Signals:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedVideo.aiAnalysis.botSignals.map((signal, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">
                                {signal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-white/60">Content Match:</span>
                        <Badge
                          variant={
                            selectedVideo.aiAnalysis.contentMatches ? 'default' : 'destructive'
                          }
                        >
                          {selectedVideo.aiAnalysis.contentMatches ? 'Yes' : 'No'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Transcript */}
                  {selectedVideo.aiAnalysis.transcript && (
                    <div>
                      <h4 className="font-semibold mb-2">Transcript</h4>
                      <div className="max-h-32 overflow-y-auto p-3 bg-white/5 rounded text-sm">
                        {selectedVideo.aiAnalysis.transcript}
                      </div>
                    </div>
                  )}

                  {/* Requirements */}
                  <div>
                    <h4 className="font-semibold mb-2">Bounty Requirements</h4>
                    <div className="text-sm text-white/80 whitespace-pre-wrap p-3 bg-white/5 rounded">
                      {selectedVideo.bountyRequirements}
                    </div>
                  </div>

                  {/* Reason Input */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Reason (optional for approve, required for reject)
                    </label>
                    <Textarea
                      placeholder="Enter your decision reason..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleReject(selectedVideo.id)}
                      disabled={isProcessing}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedVideo.id)}
                      disabled={isProcessing}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="w-12 h-12 mx-auto mb-4 text-white/40" />
                  <p className="text-white/60">Select a video to review</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}