// src/routes/videos.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';
import { PlatformAPIService } from '../services/platform-api';
import { ApprovalQueueService } from '../services/approval-queue';
import { VerificationService } from '../services/verification';

const router = Router();
const platformAPI = new PlatformAPIService();
const approvalService = new ApprovalQueueService();
const verificationService = new VerificationService();

// Get all approved videos (public)
router.get('/', async (_req, res) => {
  try {
    // Return empty array if database not connected
    const videos = await prisma.video.findMany({
      where: { approvalStatus: 'approved' },
      include: {
        creator: {
          select: {
            wallet: true,
            displayName: true
          }
        },
        bounty: {
          include: {
            milestones: {
              orderBy: { milestoneOrder: 'asc' }
            }
          }
        },
        milestoneClaims: true
      },
      orderBy: { registeredAt: 'desc' },
      take: 50
    }).catch((err) => {
      console.error('Video query error:', err);
      return [];
    });

    // Transform BigInt to string for JSON + map approvalStatus to status
    const serializedVideos = videos.map(video => ({
      ...video,
      currentViews: Number(video.currentViews),
      status: video.approvalStatus, // Add status field for frontend
      bounty: {
        ...video.bounty,
        milestones: video.bounty.milestones.map(m => ({
          ...m,
          viewsRequired: Number(m.viewsRequired)
        }))
      },
      milestoneClaims: video.milestoneClaims.map((claim: any) => ({
        ...claim,
        viewsAtClaim: Number(claim.viewsAtClaim)
      }))
    }));

    res.json({ data: serializedVideos });
  } catch (error) {
    // Return empty data instead of error
    res.json({ data: [] });
  }
});

// Register video (creator only)
router.post('/register', authenticate, requireRole('creator'), async (req: AuthRequest, res, next) => {
  try {
    const { bountyId, videoUrl } = req.body;

    console.log('=== VIDEO REGISTRATION START ===');
    console.log('BountyID:', bountyId);
    console.log('VideoURL:', videoUrl);
    console.log('User:', req.user?.wallet);

    // Validate video URL for any platform
    if (!platformAPI.isValidVideoUrl(videoUrl)) {
      throw new AppError(400, 'Invalid video URL. Supported platforms: YouTube, TikTok, Twitter, Instagram');
    }

    // Detect platform and extract ID
    const platform = platformAPI.detectPlatform(videoUrl);
    if (!platform) {
      throw new AppError(400, 'Could not detect video platform');
    }

    let videoId: string | null = null;
    switch (platform) {
      case 'youtube':
        videoId = platformAPI.extractYouTubeVideoId(videoUrl);
        break;
      case 'tiktok':
        videoId = platformAPI.extractTikTokVideoId(videoUrl);
        break;
      case 'twitter':
        videoId = platformAPI.extractTwitterTweetId(videoUrl);
        break;
      case 'instagram':
        videoId = platformAPI.extractInstagramPostId(videoUrl);
        break;
    }

    if (!videoId) {
      throw new AppError(400, `Could not extract video ID from ${platform} URL`);
    }

    console.log('Platform:', platform);
    console.log('VideoID:', videoId);

    // Check if video already registered
    const existing = await prisma.video.findFirst({
      where: {
        bountyId: Number(bountyId),
        videoId
      }
    });

    if (existing) {
      throw new AppError(400, 'Video already registered for this bounty');
    }

    // Get video stats
    console.log('Fetching video stats...');
    const stats = await platformAPI.getVideoStats(videoId, platform);
    console.log('Stats retrieved:', {
      views: stats.viewCount,
      title: stats.title.substring(0, 50)
    });

    // Create video registration
    const video = await prisma.video.create({
      data: {
        bountyId: Number(bountyId),
        creatorId: req.user!.id,
        platform,
        videoId,
        videoUrl,
        title: stats.title,
        description: stats.description,
        thumbnailUrl: stats.thumbnailUrl,
        publishedAt: stats.publishedAt,
        currentViews: BigInt(stats.viewCount),
        approvalStatus: 'pending'
      }
    });

    console.log('Video registered successfully:', video.id);

    // Get milestone to process
    const bounty = await prisma.bounty.findUnique({
      where: { id: Number(bountyId) },
      include: { milestones: { orderBy: { milestoneOrder: 'asc' } } }
    });

    if (bounty && bounty.milestones.length > 0) {
      // Start AI analysis for first milestone
      approvalService.processVideoForMilestone(video.id, bounty.milestones[0].id)
        .catch(err => console.error('AI processing error:', err));
    }

    console.log('=== VIDEO REGISTRATION COMPLETE ===');

    // Serialize BigInt for JSON
    const serializedVideo = {
      ...video,
      currentViews: Number(video.currentViews),
      bountyId: Number(video.bountyId),
      creatorId: video.creatorId
    };

    res.status(201).json({ video: serializedVideo });
  } catch (error: any) {
    console.error('=== VIDEO REGISTRATION ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    next(error);
  }
});

// Get creator's videos
router.get('/my-videos', authenticate, requireRole('creator'), async (req: AuthRequest, res, next) => {
  try {
    const videos = await prisma.video.findMany({
      where: { creatorId: req.user!.id },
      include: {
        bounty: {
          include: {
            milestones: true
          }
        },
        milestoneClaims: true,
        analyses: {
          select: {
            rating: true
          }
        }
      },
      orderBy: { registeredAt: 'desc' }
    });

    // Serialize BigInt for JSON
    const serializedVideos = videos.map(video => ({
      ...video,
      currentViews: Number(video.currentViews),
      bounty: {
        ...video.bounty,
        milestones: video.bounty.milestones.map(m => ({
          ...m,
          viewsRequired: Number(m.viewsRequired)
        }))
      },
      milestoneClaims: video.milestoneClaims.map(claim => ({
        ...claim,
        viewsAtClaim: Number(claim.viewsAtClaim)
      }))
    }));

    res.json({ videos: serializedVideos });
  } catch (error) {
    next(error);
  }
});

// Request claim signature (creator only)
router.post('/:videoId/claim-signature', authenticate, requireRole('creator'), async (req: AuthRequest, res, next) => {
  try {
    const { milestoneIndex } = req.body;
    const videoId = Number(req.params.videoId);

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        bounty: {
          include: {
            milestones: { orderBy: { milestoneOrder: 'asc' } }
          }
        }
      }
    });

    if (!video) {
      throw new AppError(404, 'Video not found');
    }

    if (video.creatorId !== req.user!.id) {
      throw new AppError(403, 'Not your video');
    }

    if (video.approvalStatus !== 'approved') {
      throw new AppError(400, 'Video not approved');
    }

    const milestone = video.bounty.milestones[milestoneIndex];
    if (!milestone) {
      throw new AppError(404, 'Milestone not found');
    }

    // Check if views reached
    if (video.currentViews < milestone.viewsRequired) {
      throw new AppError(400, 'Views requirement not met');
    }

    // Check if already claimed
    const claimed = await prisma.milestoneClaim.findUnique({
      where: {
        videoId_milestoneId: {
          videoId,
          milestoneId: milestone.id
        }
      }
    });

    if (claimed) {
      throw new AppError(400, 'Milestone already claimed');
    }

    // Generate signature
    const signature = await verificationService.generateClaimSignature(
      video.videoId,
      req.user!.wallet,
      milestoneIndex,
      Number(video.currentViews),
      video.bounty.contractAddress
    );

    res.json({ signature });
  } catch (error) {
    next(error);
  }
});

// Record claim (after blockchain tx)
router.post('/:videoId/record-claim', authenticate, requireRole('creator'), async (req: AuthRequest, res, next) => {
  try {
    const { milestoneIndex, txHash } = req.body;
    const videoId = Number(req.params.videoId);

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        bounty: {
          include: {
            milestones: true
          }
        }
      }
    });

    if (!video || video.creatorId !== req.user!.id) {
      throw new AppError(403, 'Not authorized');
    }

    const milestone = video.bounty.milestones[milestoneIndex];
    
    const platformFee = (Number(milestone.rewardAmount) * 5) / 100;
    const creatorAmount = Number(milestone.rewardAmount) - platformFee;

    await prisma.milestoneClaim.create({
      data: {
        videoId,
        bountyId: video.bountyId,
        creatorId: req.user!.id,
        milestoneId: milestone.id,
        viewsAtClaim: video.currentViews,
        rewardAmount: creatorAmount.toString(),
        platformFee: platformFee.toString(),
        txHash
      }
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Update video views manually (creator only)
router.post('/:videoId/update-views', authenticate, requireRole('creator'), async (req: AuthRequest, res, next) => {
  try {
    const videoId = Number(req.params.videoId);

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: {
        bounty: {
          include: {
            milestones: { orderBy: { milestoneOrder: 'asc' } }
          }
        },
        milestoneClaims: true
      }
    });

    if (!video) {
      throw new AppError(404, 'Video not found');
    }

    if (video.creatorId !== req.user!.id) {
      throw new AppError(403, 'Not your video');
    }

    // Get current stats from YouTube
    const stats = await platformAPI.getYouTubeVideoStats(video.videoId);

    // Update views in database
    await prisma.video.update({
      where: { id: videoId },
      data: {
        currentViews: BigInt(stats.viewCount),
        lastChecked: new Date()
      }
    });

    // Find claimable milestones (views reached, not yet claimed, video approved)
    const claimable = video.bounty.milestones.filter(milestone => {
      const alreadyClaimed = video.milestoneClaims.some(
        claim => claim.milestoneId === milestone.id
      );
      return (
        stats.viewCount >= milestone.viewsRequired &&
        !alreadyClaimed &&
        video.approvalStatus === 'approved'
      );
    });

    res.json({
      success: true,
      currentViews: stats.viewCount,
      lastChecked: new Date(),
      claimableMilestones: claimable.map(m => ({
        id: m.id,
        viewsRequired: m.viewsRequired,
        rewardAmount: m.rewardAmount,
        milestoneOrder: m.milestoneOrder
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;