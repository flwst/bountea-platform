// src/routes/creators.ts
import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

// Get all creators (public)
router.get('/', async (_req, res) => {
  console.log('===== GET /api/creators START =====');
  console.log('Request received at:', new Date().toISOString());
  
  try {
    console.log('Attempting Prisma query...');
    console.log('Query params: { where: { userType: "creator" } }');
    
    const creators = await prisma.user.findMany({
      where: { userType: 'creator' },
      select: {
        id: true,
        wallet: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true
      }
    });
    
    console.log('Query completed successfully');
    console.log('Found creators:', creators.length);
    if (creators.length > 0) {
      console.log('First creator:', JSON.stringify(creators[0], null, 2));
    }

    return res.json({ data: creators });
  } catch (error) {
    console.error('===== ERROR in /api/creators =====');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Full error:', error);
    return res.status(500).json({ error: 'Failed to fetch creators', details: String(error) });
  }
});

// IMPORTANT: More specific routes MUST come before generic :address route
// Get creator stats (public)
router.get('/:address/stats', async (req, res) => {
  try {
    const creator = await prisma.user.findUnique({
      where: { wallet: req.params.address }
    });

    if (!creator) {
      // Return empty stats instead of 404 for new users
      return res.json({
        data: {
          totalEarned: 0,
          totalViews: 0,
          videoCount: 0,
          successRate: 0,
          avgAiRating: 0
        }
      });
    }

    // Get video stats
    const videos = await prisma.video.findMany({
      where: {
        creatorId: creator.id,
        approvalStatus: 'approved'
      },
      include: {
        milestoneClaims: true,
        analyses: {
          select: {
            rating: true
          }
        }
      }
    }).catch(() => []);

    // Calculate stats
    const totalEarned = videos.reduce((sum, video) => {
      const earned = video.milestoneClaims.reduce((claimSum, claim) => 
        claimSum + Number(claim.rewardAmount), 0
      );
      return sum + earned;
    }, 0);

    const totalViews = videos.reduce((sum, video) => 
      sum + Number(video.currentViews), 0
    );

    const approvedVideos = videos.filter(v => v.approvalStatus === 'approved').length;
    const totalVideos = videos.length;
    const successRate = totalVideos > 0 ? (approvedVideos / totalVideos) * 100 : 0;

    // Calculate average AI rating
    const ratings = videos.flatMap(v =>
      v.analyses.map(a => a.rating).filter(r => r !== null)
    );
    const avgAiRating = ratings.length > 0 
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length 
      : 0;

    const stats = {
      totalEarned,
      totalViews,
      videoCount: totalVideos,
      successRate: Math.round(successRate),
      avgAiRating: avgAiRating ? Number(avgAiRating.toFixed(1)) : 0
    };

    return res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching creator stats:', error);
    return res.status(500).json({ error: 'Failed to fetch creator stats' });
  }
});

// Get creator videos (public)
router.get('/:address/videos', async (req, res) => {
  try {
    const creator = await prisma.user.findUnique({
      where: { wallet: req.params.address }
    });

    if (!creator) {
      // Return empty array for new users
      return res.json({ data: [] });
    }

    const videos = await prisma.video.findMany({
      where: {
        creatorId: creator.id
        // Show all videos (pending, approved, rejected) for the creator
      },
      include: {
        bounty: {
          select: {
            id: true,
            title: true,
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
    }).catch(() => []);

    // Transform BigInt to number for JSON
    const serializedVideos = videos.map(video => ({
      ...video,
      currentViews: Number(video.currentViews),
      milestoneClaims: video.milestoneClaims.map(claim => ({
        ...claim,
        viewsAtClaim: Number(claim.viewsAtClaim)
      })),
      bounty: {
        ...video.bounty,
        milestones: video.bounty.milestones.map(m => ({
          ...m,
          viewsRequired: Number(m.viewsRequired)
        }))
      }
    }));

    return res.json({ data: serializedVideos });
  } catch (error) {
    console.error('Error fetching creator videos:', error);
    return res.json({ data: [] });
  }
});

// Get creator by wallet address (public) - MUST be last!
router.get('/:address', async (req, res) => {
  try {
    const creator = await prisma.user.findUnique({
      where: { wallet: req.params.address },
      select: {
        id: true,
        wallet: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        createdAt: true
      }
    });

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    return res.json({ data: creator });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch creator' });
  }
});

export default router;