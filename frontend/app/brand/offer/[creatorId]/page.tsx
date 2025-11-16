'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Plus, Trash2, AlertCircle, Star, Eye, DollarSign, TrendingUp } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';
import type { Creator } from '@/types';

interface BonusMilestone {
  views: string;
  reward: string;
}

interface Props {
  params: Promise<{ creatorId: string }>;
}

export default function MakeOfferPage({ params }: Props) {
  // Unwrap params Promise (Next.js 15 requirement)
  const { creatorId } = use(params);
  
  const router = useRouter();
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    requirements: '',
    basePayment: '',
    deadline: '',
    bonusMilestones: [] as BonusMilestone[],
  });

  // Fetch creator info
  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: async () => {
      const [profileResponse, statsResponse] = await Promise.all([
        api.creator.getProfile(creatorId),
        api.creator.getStats(creatorId)
      ]);
      return {
        ...profileResponse.data,
        address: profileResponse.data.wallet,
        stats: statsResponse.data
      };
    },
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addBonusMilestone = () => {
    setFormData(prev => ({
      ...prev,
      bonusMilestones: [...prev.bonusMilestones, { views: '', reward: '' }],
    }));
  };

  const removeBonusMilestone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      bonusMilestones: prev.bonusMilestones.filter((_, i) => i !== index),
    }));
  };

  const updateBonusMilestone = (index: number, field: 'views' | 'reward', value: string) => {
    setFormData(prev => ({
      ...prev,
      bonusMilestones: prev.bonusMilestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const calculateTotalPayment = () => {
    const base = Number(formData.basePayment) || 0;
    const bonuses = formData.bonusMilestones.reduce(
      (sum, m) => sum + (Number(m.reward) || 0),
      0
    );
    return base + bonuses;
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

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }
    if (!formData.basePayment || Number(formData.basePayment) <= 0) {
      setError('Base payment must be greater than 0');
      return;
    }
    if (!formData.deadline) {
      setError('Deadline is required');
      return;
    }
    if (new Date(formData.deadline) <= new Date()) {
      setError('Deadline must be in the future');
      return;
    }

    setIsSubmitting(true);

    try {
      // Send offer via API (mock for now)
      const offerData = {
        creatorAddress: creatorId,
        brandAddress: address,
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        basePayment: Number(formData.basePayment),
        bonusMilestones: formData.bonusMilestones
          .filter(m => m.views && m.reward)
          .map(m => ({
            viewsRequired: Number(m.views),
            rewardAmount: Number(m.reward),
          })),
        deadline: new Date(formData.deadline),
        totalPayment: calculateTotalPayment(),
      };

      // await api.offers.create(offerData);
      console.log('Offer data:', offerData);
      
      // Redirect to brand dashboard
      router.push('/brand/dashboard');
    } catch (err: any) {
      console.error('Send offer failed:', err);
      setError(err.response?.data?.message || 'Failed to send offer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Make Offer</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to make an offer to this creator
          </p>
          <Button onClick={connect} size="lg">
            Connect Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link href="/brand/creators">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Creators
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Make Offer</h1>
        <p className="text-white/60">
          Send a direct offer to this creator
        </p>
      </div>

      {/* Creator Info Card */}
      {isLoading ? (
        <div className="h-40 bg-white/5 rounded-lg animate-pulse mb-8" />
      ) : creator && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex-shrink-0" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold mb-2">{creator.displayName}</h2>
                {creator.category && <Badge variant="secondary">{creator.category}</Badge>}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-white/60 text-xs">Earned</p>
                      <p className="font-semibold">${((creator.stats?.totalEarned || 0) / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-white/60 text-xs">Views</p>
                      <p className="font-semibold">{((creator.stats?.totalViews || 0) / 1000000).toFixed(1)}M</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <div>
                      <p className="text-white/60 text-xs">AI Rating</p>
                      <p className="font-semibold">{(creator.stats?.avgAiRating || 0).toFixed(1)}/10</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-white/60 text-xs">Success</p>
                      <p className="font-semibold">{creator.stats?.successRate || 0}%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Offer Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Offer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="title">Offer Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Product Review Request"
                value={formData.title}
                onChange={(e) => updateField('title', e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what you want the creator to do..."
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={4}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                placeholder="Optional: Specific requirements or guidelines"
                value={formData.requirements}
                onChange={(e) => updateField('requirements', e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="basePayment">Base Payment ($) *</Label>
              <Input
                id="basePayment"
                type="number"
                step="0.01"
                placeholder="500"
                value={formData.basePayment}
                onChange={(e) => updateField('basePayment', e.target.value)}
                className="mt-2"
              />
              <p className="text-xs text-white/40 mt-1">
                Guaranteed payment upon completion
              </p>
            </div>

            <div>
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => updateField('deadline', e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bonus Milestones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bonus Milestones (Optional)</CardTitle>
              <Button onClick={addBonusMilestone} variant="outline" size="sm" type="button">
                <Plus className="w-4 h-4 mr-2" />
                Add Bonus
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.bonusMilestones.length === 0 ? (
              <p className="text-sm text-white/60 text-center py-4">
                No bonus milestones. Click "Add Bonus" to add performance-based bonuses.
              </p>
            ) : (
              formData.bonusMilestones.map((milestone, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4 items-start">
                      <div className="flex-1 space-y-4">
                        <div>
                          <Label htmlFor={`bonus-views-${index}`}>Views Target</Label>
                          <Input
                            id={`bonus-views-${index}`}
                            type="number"
                            placeholder="50000"
                            value={milestone.views}
                            onChange={(e) => updateBonusMilestone(index, 'views', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`bonus-reward-${index}`}>Bonus Amount ($)</Label>
                          <Input
                            id={`bonus-reward-${index}`}
                            type="number"
                            step="0.01"
                            placeholder="100"
                            value={milestone.reward}
                            onChange={(e) => updateBonusMilestone(index, 'reward', e.target.value)}
                            className="mt-2"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeBonusMilestone(index)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        type="button"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            <div className="p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-white/60">Total Payment</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                  ${calculateTotalPayment().toFixed(2)}
                </span>
              </div>
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
          <Link href="/brand/creators" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]"
          >
            {isSubmitting ? 'Sending...' : 'Send Offer'}
          </Button>
        </div>
      </form>
    </div>
  );
}