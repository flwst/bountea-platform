// src/types/index.ts

export interface User {
  id: string;
  email: string;
  wallet: string;
  userType: 'creator' | 'brand' | 'admin';
  displayName?: string;
  avatarUrl?: string;
}

export interface Bounty {
  id: number;
  contractAddress: string;
  brandId: string;
  title: string;
  description?: string;
  status: string;
  deadline: Date;
  totalDeposit: string;
  remainingFunds: string;
  milestones: Milestone[];
}

export interface Milestone {
  id: number;
  bountyId: number;
  viewsRequired: bigint;
  rewardAmount: string;
  milestoneOrder: number;
}

export interface Video {
  id: number;
  bountyId: number;
  creatorId: string;
  platform: string;
  videoId: string;
  videoUrl: string;
  currentViews: bigint;
  approvalStatus: string;
}

export interface VideoAnalysis {
  id: number;
  videoId: number;
  milestoneId: number;
  transcription?: string;
  contentMatches?: boolean;
  rating?: number;
  ratingReasoning?: string;
  isBot?: boolean;
  status: string;
}

export interface ApprovalQueueItem {
  id: number;
  videoId: number;
  milestoneId: number;
  status: string;
  priority: number;
  video: Video;
  milestone: Milestone;
  analysis?: VideoAnalysis;
}

export interface TranscriptResult {
  transcript: string;
  confidence: number;
  language: string;
}

export interface AIAnalysisResult {
  contentMatches: boolean;
  matchConfidence: number;
  topics: string[];
  isBot: boolean;
  botConfidence: number;
  botSignals: string[];
  rating: number;
  ratingReasoning: string;
  overallConfidence: number;
}

export interface ClaimSignature {
  videoId: string;
  creatorAddress: string;
  milestoneIndex: number;
  views: number;
  timestamp: number;
  signature: string;
}