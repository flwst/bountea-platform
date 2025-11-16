// Core types for the video bounty platform

export type UserType = 'creator' | 'brand' | 'admin' | null;

export interface User {
  address: string;
  name?: string;
  email?: string;
  avatar?: string;
  userType: UserType;
}

export interface Creator {
  address: string;
  displayName: string;
  avatarUrl?: string;
  category?: string;
  stats: {
    totalEarned: number;
    totalViews: number;
    videoCount: number;
    successRate: number;
    avgAiRating: number;
  };
}

export interface Bounty {
  id: number;
  contractAddress: string;
  assetId: number;
  brandId: string;
  title: string;
  description: string;
  requirements: string;
  contentGuidelines?: string | null;
  deadline: string | Date;
  maxVideos: number;
  minDurationSeconds?: number | null;
  maxDurationSeconds?: number | null;
  status: 'active' | 'completed' | 'expired';
  totalDeposit: string;
  remainingFunds: string;
  totalPaid: string;
  videoCount: number;
  createdAt: string | Date;
  updatedAt: string | Date;
  activatedAt?: string | Date | null;
  completedAt?: string | Date | null;
  deletedAt?: string | Date | null;
  brand: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  milestones: Milestone[];
  platforms: BountyPlatform[];
  _count?: {
    videos: number;
  };
}

export interface BountyPlatform {
  id: number;
  bountyId: number;
  platform: string;
  createdAt: string | Date;
}

export interface Milestone {
  id: number;
  bountyId: number;
  viewsRequired: number;
  rewardAmount: string;
  milestoneOrder: number;
  createdAt: string | Date;
  claimed?: boolean;
}

export interface Video {
  id: number;
  videoId: string;
  url: string;
  title: string;
  thumbnailUrl: string;
  platform: 'youtube' | 'tiktok';
  currentViews: number;
  creator: {
    address: string;
    displayName: string;
    avatarUrl?: string;
  };
  bounty: {
    id: number;
    title: string;
    milestones: Milestone[];
  };
  aiAnalysis?: {
    rating: number;
    reasoning: string;
    botSignals: string[];
    transcript: string;
    contentMatches: boolean;
  };
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: Date;
}

export interface ApprovalQueueEntry {
  id: number;
  videoId: string;
  title: string;
  creator: {
    name: string;
    address: string;
  };
  aiAnalysis: {
    rating: number;
    reasoning: string;
    botSignals: string[];
    transcript: string;
    contentMatches: boolean;
  };
  bountyRequirements: string;
  priority: 'high' | 'med' | 'low';
  submittedAt: Date;
}

export interface DashboardStats {
  totalEarned?: number;
  activeVideos?: number;
  totalViews?: number;
  activeBounties?: number;
  totalVideos?: number;
  totalSpent?: number;
}