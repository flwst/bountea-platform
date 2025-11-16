// src/routes/bounties.ts
import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

// Get all active bounties (public)
router.get('/', async (req, res, next) => {
  try {
    const { platform, status = 'active', limit = 20, offset = 0 } = req.query;

    const where: any = {
      status: status as string,
      deadline: { gt: new Date() }
    };

    if (platform) {
      where.platforms = {
        some: {
          platform: platform as string
        }
      };
    }

    const bounties = await prisma.bounty.findMany({
      where,
      include: {
        brand: {
          select: { id: true, displayName: true, avatarUrl: true }
        },
        milestones: {
          orderBy: { milestoneOrder: 'asc' }
        },
        platforms: true,
        _count: {
          select: { videos: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset)
    }).catch(() => []);

    // Transform BigInt to Number for JSON serialization
    const serializedBounties = bounties.map(bounty => ({
      ...bounty,
      milestones: bounty.milestones.map(m => ({
        ...m,
        viewsRequired: Number(m.viewsRequired)
      }))
    }));

    res.json({ data: serializedBounties });
  } catch (error) {
    next(error);
  }
});

// Get bounty by ID (public)
router.get('/:id', async (req, res, next) => {
  try {
    const bounty = await prisma.bounty.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        brand: {
          select: { id: true, displayName: true, avatarUrl: true }
        },
        milestones: {
          orderBy: { milestoneOrder: 'asc' }
        },
        platforms: true,
        videos: {
          where: { approvalStatus: 'approved' },
          include: {
            creator: {
              select: { id: true, displayName: true, avatarUrl: true }
            }
          },
          take: 10
        }
      }
    });

    if (!bounty) {
      throw new AppError(404, 'Bounty not found');
    }

    // Transform BigInt to Number for JSON serialization
    const serializedBounty = {
      ...bounty,
      milestones: bounty.milestones.map(m => ({
        ...m,
        viewsRequired: Number(m.viewsRequired)
      })),
      videos: bounty.videos.map(v => ({
        ...v,
        currentViews: Number(v.currentViews)
      }))
    };

    res.json({ bounty: serializedBounty });
  } catch (error) {
    next(error);
  }
});

// Create bounty (brand only)
router.post('/', authenticate, requireRole('brand'), async (req: AuthRequest, res, next) => {
  try {
    const {
      title,
      description,
      requirements,
      contentGuidelines,
      deadline,
      maxVideos,
      platforms,
      milestones,
      contractAddress,
      assetId,
      assetPrecompileAddress,
      totalDeposit
    } = req.body;

    const bounty = await prisma.bounty.create({
      data: {
        contractAddress,
        assetId,
        assetPrecompileAddress,
        brandId: req.user!.id,
        title,
        description,
        requirements,
        contentGuidelines,
        deadline: new Date(deadline),
        maxVideos,
        totalDeposit,
        remainingFunds: totalDeposit,
        status: 'active',
        milestones: {
          create: milestones.map((m: any, index: number) => ({
            viewsRequired: BigInt(m.viewsRequired),
            rewardAmount: m.rewardAmount,
            milestoneOrder: index
          }))
        },
        platforms: {
          create: platforms.map((p: string) => ({
            platform: p
          }))
        }
      },
      include: {
        milestones: true,
        platforms: true
      }
    });

    // Transform BigInt to Number for JSON serialization
    const serializedBounty = {
      ...bounty,
      milestones: bounty.milestones.map(m => ({
        ...m,
        viewsRequired: Number(m.viewsRequired)
      }))
    };

    res.status(201).json({ bounty: serializedBounty });
  } catch (error) {
    next(error);
  }
});

// Get brand's bounties
router.get('/brand/my-bounties', authenticate, requireRole('brand'), async (req: AuthRequest, res, next) => {
  try {
    const bounties = await prisma.bounty.findMany({
      where: { brandId: req.user!.id },
      include: {
        milestones: true,
        platforms: true,
        _count: {
          select: { videos: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Transform BigInt to Number for JSON serialization
    const serializedBounties = bounties.map(bounty => ({
      ...bounty,
      milestones: bounty.milestones.map(m => ({
        ...m,
        viewsRequired: Number(m.viewsRequired)
      }))
    }));

    res.json({ bounties: serializedBounties });
  } catch (error) {
    next(error);
  }
});

export default router;