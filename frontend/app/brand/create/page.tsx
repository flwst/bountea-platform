'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWalletStore } from '@/lib/stores/wallet-store';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api/client';
import Link from 'next/link';

interface MilestoneForm {
  views: string;
  reward: string;
}

interface BountyForm {
  title: string;
  description: string;
  requirements: string;
  milestones: MilestoneForm[];
  deadline: string;
  maxVideos: string;
  platform: 'youtube' | 'tiktok' | 'both';
  assetId: string;
}

export default function CreateBountyPage() {
  const router = useRouter();
  const { address, isConnected } = useWalletStore();
  const { connect } = useAuth();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState<BountyForm>({
    title: '',
    description: '',
    requirements: '',
    milestones: [
      { views: '', reward: '' },
    ],
    deadline: '',
    maxVideos: '',
    platform: 'youtube',
    assetId: '1000', // Default BRT token
  });

  const updateField = (field: keyof BountyForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addMilestone = () => {
    setFormData(prev => ({
      ...prev,
      milestones: [...prev.milestones, { views: '', reward: '' }],
    }));
  };

  const removeMilestone = (index: number) => {
    if (formData.milestones.length > 1) {
      setFormData(prev => ({
        ...prev,
        milestones: prev.milestones.filter((_, i) => i !== index),
      }));
    }
  };

  const updateMilestone = (index: number, field: 'views' | 'reward', value: string) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.map((m, i) =>
        i === index ? { ...m, [field]: value } : m
      ),
    }));
  };

  const validateStep = () => {
    setError('');
    
    switch (step) {
      case 1:
        if (!formData.title.trim()) {
          setError('Title is required');
          return false;
        }
        if (!formData.description.trim()) {
          setError('Description is required');
          return false;
        }
        if (!formData.requirements.trim()) {
          setError('Requirements are required');
          return false;
        }
        break;
        
      case 2:
        if (formData.milestones.length === 0) {
          setError('At least one milestone is required');
          return false;
        }
        for (const milestone of formData.milestones) {
          if (!milestone.views || !milestone.reward) {
            setError('All milestone fields must be filled');
            return false;
          }
          if (isNaN(Number(milestone.views)) || Number(milestone.views) <= 0) {
            setError('Views must be a positive number');
            return false;
          }
          if (isNaN(Number(milestone.reward)) || Number(milestone.reward) <= 0) {
            setError('Reward must be a positive number');
            return false;
          }
        }
        // Check milestones are in ascending order
        for (let i = 1; i < formData.milestones.length; i++) {
          if (Number(formData.milestones[i].views) <= Number(formData.milestones[i - 1].views)) {
            setError('Milestones must be in ascending order by views');
            return false;
          }
        }
        break;
        
      case 3:
        if (!formData.deadline) {
          setError('Deadline is required');
          return false;
        }
        const deadlineDate = new Date(formData.deadline);
        if (deadlineDate <= new Date()) {
          setError('Deadline must be in the future');
          return false;
        }
        if (!formData.maxVideos || isNaN(Number(formData.maxVideos)) || Number(formData.maxVideos) <= 0) {
          setError('Max videos must be a positive number');
          return false;
        }
        break;
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setError('');
    setStep(prev => Math.max(prev - 1, 1));
  };

  const calculateTotalReward = () => {
    return formData.milestones.reduce((sum, m) => sum + (Number(m.reward) || 0), 0);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const totalReward = calculateTotalReward();
      
      // Create bounty via API
      await api.bounties.create({
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        totalReward,
        maxVideos: Number(formData.maxVideos),
        deadline: new Date(formData.deadline),
        platform: formData.platform,
        milestones: formData.milestones.map(m => ({
          viewsRequired: Number(m.views),
          rewardAmount: m.reward,
        })),
        assetId: Number(formData.assetId),
        brandAddress: address,
      });

      // Redirect to brand dashboard
      router.push('/brand/dashboard');
    } catch (err: any) {
      console.error('Create bounty failed:', err);
      setError(err.response?.data?.message || 'Failed to create bounty. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Create Bounty</h1>
          <p className="text-white/60 mb-8">
            Connect your wallet to create a bounty
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
      <Link href="/brand/dashboard">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Bounty</h1>
        <p className="text-white/60">
          Step {step} of 4 - {
            step === 1 ? 'Basic Information' :
            step === 2 ? 'Milestones' :
            step === 3 ? 'Settings' :
            'Review & Deploy'
          }
        </p>
        
        {/* Progress Bar */}
        <div className="mt-4 flex gap-2">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="title">Bounty Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Tech Review Contest"
                  value={formData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what you want creators to do..."
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="requirements">Requirements *</Label>
                <Textarea
                  id="requirements"
                  placeholder="- Minimum 3 minutes duration&#10;- Show product features&#10;- Include call to action"
                  value={formData.requirements}
                  onChange={(e) => updateField('requirements', e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-white/40 mt-1">
                  List requirements one per line
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Milestones */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Label>Reward Milestones *</Label>
                  <Button onClick={addMilestone} variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Milestone
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {formData.milestones.map((milestone, index) => (
                    <Card key={index}>
                      <CardContent className="pt-6">
                        <div className="flex gap-4 items-start">
                          <div className="flex-1 space-y-4">
                            <div>
                              <Label htmlFor={`views-${index}`}>Views Required</Label>
                              <Input
                                id={`views-${index}`}
                                type="number"
                                placeholder="10000"
                                value={milestone.views}
                                onChange={(e) => updateMilestone(index, 'views', e.target.value)}
                                className="mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor={`reward-${index}`}>Reward Amount ($)</Label>
                              <Input
                                id={`reward-${index}`}
                                type="number"
                                step="0.01"
                                placeholder="100"
                                value={milestone.reward}
                                onChange={(e) => updateMilestone(index, 'reward', e.target.value)}
                                className="mt-2"
                              />
                            </div>
                          </div>
                          {formData.milestones.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMilestone(index)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-white/5 rounded-lg">
                  <p className="text-sm text-white/60">Total Reward</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                    ${calculateTotalReward().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Settings */}
          {step === 3 && (
            <div className="space-y-6">
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

              <div>
                <Label htmlFor="maxVideos">Maximum Videos *</Label>
                <Input
                  id="maxVideos"
                  type="number"
                  placeholder="10"
                  value={formData.maxVideos}
                  onChange={(e) => updateField('maxVideos', e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-white/40 mt-1">
                  Maximum number of videos that can participate
                </p>
              </div>

              <div>
                <Label htmlFor="platform">Platform *</Label>
                <Select value={formData.platform} onValueChange={(v) => updateField('platform', v)}>
                  <SelectTrigger id="platform" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="assetId">Asset ID</Label>
                <Input
                  id="assetId"
                  type="number"
                  value={formData.assetId}
                  onChange={(e) => updateField('assetId', e.target.value)}
                  className="mt-2"
                />
                <p className="text-xs text-white/40 mt-1">
                  Token asset ID (default: 1000 for BRT)
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Bounty Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Title:</span>
                      <span>{formData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Platform:</span>
                      <Badge variant="secondary">{formData.platform}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Max Videos:</span>
                      <span>{formData.maxVideos}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Deadline:</span>
                      <span>{new Date(formData.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Milestones</h3>
                  <div className="space-y-2">
                    {formData.milestones.map((m, i) => (
                      <div key={i} className="flex justify-between text-sm p-3 bg-white/5 rounded">
                        <span>{Number(m.views).toLocaleString()} views</span>
                        <span className="font-semibold text-green-500">${m.reward}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-[#3b82f6]/10 to-[#8b5cf6]/10 rounded-lg border border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-white/60">Total Reward</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6] bg-clip-text text-transparent">
                      ${calculateTotalReward().toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-2">
                    You will approve {calculateTotalReward().toFixed(2)} BRT tokens
                  </p>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Click "Deploy Bounty" to create your bounty on the blockchain
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <Button onClick={prevStep} variant="outline" className="flex-1">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {step < 4 ? (
              <Button onClick={nextStep} className="flex-1">
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-[#3b82f6] to-[#8b5cf6]"
              >
                {isSubmitting ? 'Deploying...' : 'Deploy Bounty'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}