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
          select: {
            id: true,
            title: true,
            totalDeposit: true,
            deadline: true
          }
        },
        milestoneClaims: true
      },
      orderBy: { registeredAt: 'desc' },
      take: 50
    }).catch(() => []);

    // Transform BigInt to string for JSON
    const serializedVideos = videos.map(video => ({
      ...video,
      currentViews: Number(video.currentViews),
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

    // Validate YouTube URL
    if (!platformAPI.isValidYouTubeUrl(videoUrl)) {
      throw new AppError(400, 'Invalid YouTube URL');
    }

    const videoId = platformAPI.extractYouTubeVideoId(videoUrl);
    if (!videoId) {
      throw new AppError(400, 'Could not extract video ID');
    }

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

    // Get video stats from YouTube
    const stats = await platformAPI.getYouTubeVideoStats(videoId);

    // Create video registration
    const video = await prisma.video.create({
      data: {
        bountyId: Number(bountyId),
        creatorId: req.user!.id,
        platform: 'youtube',
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

    res.status(201).json({ video });
  } catch (error) {
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
        milestoneClaims: true
      },
      orderBy: { registeredAt: 'desc' }
    });

    res.json({ videos });
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

export default router;